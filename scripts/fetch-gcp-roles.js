#!/usr/bin/env node
/**
 * Busca TODAS as predefined roles do GCP direto da API oficial do IAM, com as
 * permissões reais de cada uma, e regenera src/data/gcp.ts.
 *
 * Fonte: https://iam.googleapis.com/v1/roles?view=FULL
 *   - `view=FULL` é o que traz `includedPermissions`; sem isso a resposta vem
 *     só com name/title/description e é exatamente esse o motivo de o dataset
 *     atual ter 232 roles mas permissões em apenas 15.
 *   - A API EXIGE credencial, mesmo para roles predefinidas (responde 403 sem).
 *     O script aceita duas formas, nesta ordem:
 *       1. token do gcloud   — usa `gcloud auth print-access-token` se o gcloud
 *                              estiver no PATH e autenticado;
 *       2. API key           — variável de ambiente GCP_API_KEY, ou --key=...
 *
 * Contrato da resposta (roles.list):
 *   { roles: [ { name, title, description, includedPermissions[], stage } ],
 *     nextPageToken }
 *
 * Uso:
 *   gcloud auth login                          # uma vez, se for pela opção 1
 *   node scripts/fetch-gcp-roles.js --dry-run  # só relatório, não escreve
 *   node scripts/fetch-gcp-roles.js            # regenera src/data/gcp.ts
 *
 *   # ou com API key (crie em console.cloud.google.com → APIs e Serviços →
 *   # Credenciais; a IAM API precisa estar habilitada no projeto)
 *   set GCP_API_KEY=AIza...   &&  node scripts/fetch-gcp-roles.js
 *
 * POR QUE NÃO USAMOS docs.cloud.google.com/iam/docs/roles-permissions
 *   Essa página (e as por serviço, ex.: /roles-permissions/storage) mostra
 *   exatamente os dados que queremos, mas monta as tabelas por JavaScript no
 *   navegador. Verificado em 29/07/2026: o HTML servido tem ~97 KB e contém
 *   apenas a navegação lateral — zero ocorrências de `roles/storage.admin`,
 *   `storage.buckets.get` ou `includedPermissions`. Um fetch de servidor
 *   (Node, curl) recebe a casca vazia, então não dá para escrever um parser
 *   estável em cima dela.
 *
 *   A própria página é um render de roles.list — inclusive linka o método em
 *   /iam/docs/reference/rest/v1/roles/list. Ou seja: a API abaixo é a MESMA
 *   fonte oficial, só que em formato consumível. Nada de oficialidade se perde
 *   ao usar a API em vez da doc renderizada.
 *
 * Sem dependências externas — usa fetch nativo do Node 18+.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const OUT = path.join(__dirname, '..', 'src', 'data', 'gcp.ts')
const DRY = process.argv.includes('--dry-run')
const API = 'https://iam.googleapis.com/v1/roles'

/**
 * Resolve a credencial. A API do IAM responde 403 sem autenticação, inclusive
 * para roles predefinidas — por isso isto não é opcional.
 */
function resolveAuth() {
  const keyArg = process.argv.find((a) => a.startsWith('--key='))
  const apiKey = keyArg ? keyArg.slice('--key='.length) : process.env.GCP_API_KEY
  if (apiKey) return { kind: 'apiKey', apiKey }

  // gcloud costuma já estar instalado e autenticado em máquina de quem mexe com cloud
  try {
    const token = execFileSync(
      process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud',
      ['auth', 'print-access-token'],
      { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', timeout: 20000 },
    ).trim()
    if (token) return { kind: 'gcloud', token }
  } catch { /* gcloud ausente ou não autenticado */ }

  return null
}

const AUTH_HELP = `
Nenhuma credencial encontrada. A IAM API do Google exige autenticação mesmo
para listar roles predefinidas.

  >> Se você só quer os dados, NÃO precisa de credencial nenhuma:
     node scripts/fetch-gcp-roles-from-docs.js --dry-run

     Esse script lê as docs públicas (docs.cloud.google.com/iam/docs/
     roles-permissions), que trazem as mesmas roles, permissões e descrições
     oficiais. Use ESTE script (o da API) só quando precisar de algo que a
     doc não publica, como etag, ou para conferir uma contra a outra.

Se ainda assim quiser ir pela API, escolha UMA das opções:

  Opção 1 — gcloud (recomendada se você já usa GCP)
    gcloud auth login
    node scripts/fetch-gcp-roles.js --dry-run

  Opção 2 — API key
    1. console.cloud.google.com -> APIs e Serviços -> Biblioteca
       habilite "Identity and Access Management (IAM) API"
    2. APIs e Serviços -> Credenciais -> Criar credenciais -> Chave de API
    3. Windows:  set GCP_API_KEY=AIza...
       ou passe direto:  node scripts/fetch-gcp-roles.js --key=AIza...
`

// ── Classificação de tier ────────────────────────────────────────────────────
// ATENÇÃO: isto é classificação editorial do IAM Scope, NÃO vem do Google.
// O Google não publica nível de risco por role. É derivado de sinais objetivos
// da própria role (roleId e permissões) para ser reprodutível, e a UI precisa
// rotular como classificação nossa.
//
// Mora em scripts/lib/gcp-classify.js porque fetch-gcp-roles-from-docs.js usa
// exatamente a mesma classificação — se as duas rotas divergissem, o dataset
// mudaria de tier só por causa de qual script foi rodado.
const {
  classifyTier, classifyCategory, isPrivileged, slugify, esc,
} = require('./lib/gcp-classify')

async function fetchAll(auth) {
  const roles = []
  let pageToken = ''
  let page = 0
  do {
    let url = `${API}?view=FULL&pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
    const headers = { accept: 'application/json' }
    if (auth.kind === 'apiKey') url += `&key=${encodeURIComponent(auth.apiKey)}`
    else headers.Authorization = `Bearer ${auth.token}`

    const res = await fetch(url, { headers })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      let hint = ''
      if (res.status === 403) {
        hint = auth.kind === 'apiKey'
          ? '\n  A chave existe mas foi recusada. Confirme que a "Identity and Access Management (IAM) API"\n  está habilitada no projeto da chave e que a chave não tem restrição de API/IP bloqueando.'
          : '\n  O token do gcloud foi recusado. Rode `gcloud auth login` novamente,\n  ou use uma API key com --key=...'
      }
      if (res.status === 401) hint = '\n  Credencial inválida ou expirada. Rode `gcloud auth login` de novo.'
      throw new Error(`HTTP ${res.status} em ${API}${hint}\n  Resposta: ${body.slice(0, 300)}`)
    }
    const data = await res.json()
    for (const r of data.roles ?? []) roles.push(r)
    pageToken = data.nextPageToken ?? ''
    page++
    process.stdout.write(`\r  página ${page} · ${roles.length} roles`)
  } while (pageToken)
  process.stdout.write('\n')
  return roles
}

;(async () => {
  const auth = resolveAuth()
  if (!auth) { console.error(AUTH_HELP); process.exitCode = 1; return }
  console.log(`Autenticando via ${auth.kind === 'gcloud' ? 'token do gcloud' : 'API key'}.`)
  console.log('Buscando predefined roles na API oficial do GCP IAM...')
  const raw = await fetchAll(auth)

  // Só predefined (roles/*). Roles customizadas de projeto não aparecem aqui,
  // mas o filtro deixa a intenção explícita.
  const roles = raw
    .filter((r) => typeof r.name === 'string' && r.name.startsWith('roles/'))
    .filter((r) => r.stage !== 'DEPRECATED' && r.stage !== 'DISABLED')
    .sort((a, b) => a.name.localeCompare(b.name))

  const withPerms = roles.filter((r) => (r.includedPermissions ?? []).length > 0)
  const allPerms = new Set()
  for (const r of roles) for (const p of r.includedPermissions ?? []) allPerms.add(p)

  console.log(`\nRoles retornadas       : ${raw.length}`)
  console.log(`Predefined (ativas)    : ${roles.length}`)
  console.log(`Com permissões         : ${withPerms.length} (${(withPerms.length / roles.length * 100).toFixed(1)}%)`)
  console.log(`Permissões distintas   : ${allPerms.size}`)
  const deprecated = raw.filter((r) => r.stage === 'DEPRECATED').length
  if (deprecated) console.log(`Ignoradas (DEPRECATED) : ${deprecated}`)

  // Diff contra o que está no site hoje
  try {
    const cur = fs.readFileSync(OUT, 'utf8')
    const curIds = new Set([...cur.matchAll(/roleId: '([^']*)'/g)].map((m) => m[1]))
    const newIds = new Set(roles.map((r) => r.name))
    const added = [...newIds].filter((x) => !curIds.has(x))
    const removed = [...curIds].filter((x) => !newIds.has(x))
    console.log(`\nDiff vs dataset atual  : +${added.length} novas · -${removed.length} removidas`)
    if (added.length) console.log('  novas   :', added.slice(0, 8).join(', ') + (added.length > 8 ? ` … +${added.length - 8}` : ''))
    if (removed.length) console.log('  removidas:', removed.slice(0, 8).join(', ') + (removed.length > 8 ? ` … +${removed.length - 8}` : ''))
  } catch { /* primeira execução */ }

  if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

  const header = `// ── GCP IAM — Predefined Roles ───────────────────────────────────────────────
// AUTO-GERADO por scripts/fetch-gcp-roles.js — não editar à mão.
// Fonte: https://iam.googleapis.com/v1/roles?view=FULL (API pública, sem auth)
// Gerado em: ${new Date().toISOString()}
// Roles: ${roles.length} · permissões distintas: ${allPerms.size}
//
// name/title/description/includedPermissions vêm literais da API do Google.
// tier/category/isPrivileged são classificação editorial do IAM Scope,
// derivada de sinais objetivos da role — NÃO são publicados pelo Google.
`

  const types = `
export type GcpTier = 'ProjectOwner' | 'Admin' | 'Editor' | 'Operator' | 'Developer' | 'Viewer' | 'Specialized'
export type GcpCategory = 'IAM' | 'Compute' | 'Storage' | 'BigQuery' | 'Kubernetes' | 'Database' | 'Networking' | 'Security' | 'DevOps' | 'Serverless' | 'AI' | 'Analytics' | 'Observability' | 'Billing' | 'Management'

export interface GcpRole {
  slug: string
  name: string
  roleId: string
  description: string
  tier: GcpTier
  category: GcpCategory
  isPrivileged: boolean
  /** Vem de includedPermissions da API oficial. */
  permissions: string[]
  /** Estágio de lançamento publicado pelo Google (GA, BETA, ALPHA). */
  stage?: string
}
`

  const seen = new Set()
  const body = roles.map((r) => {
    const perms = (r.includedPermissions ?? []).slice().sort()
    let slug = slugify(r.name)
    while (seen.has(slug)) slug += '-2'
    seen.add(slug)
    const tier = classifyTier(r.name, perms)
    const cat = classifyCategory(r.name)
    const priv = isPrivileged(r.name, perms)
    const permsLiteral = perms.length
      ? `[${perms.map((p) => `'${esc(p)}'`).join(', ')}]`
      : '[]'
    return `  { slug: '${slug}', name: '${esc(r.title ?? r.name)}', roleId: '${esc(r.name)}', description: '${esc(r.description)}', tier: '${tier}', category: '${cat}', isPrivileged: ${priv}, permissions: ${permsLiteral}${r.stage ? `, stage: '${esc(r.stage)}'` : ''} },`
  }).join('\n')

  // Preserva GCP_TIER_META do arquivo atual (é metadado de UI, não de dado).
  let tierMeta = ''
  try {
    const cur = fs.readFileSync(OUT, 'utf8')
    const m = cur.match(/export const GCP_TIER_META[\s\S]*?\n\}\n/)
    if (m) tierMeta = '\n' + m[0]
  } catch { /* ignore */ }
  if (!tierMeta) {
    console.warn('AVISO: GCP_TIER_META não encontrado no arquivo atual — revise a saída.')
  }

  fs.writeFileSync(OUT, `${header}${types}${tierMeta}
export const GCP_ROLES: GcpRole[] = [
${body}
]
`)
  console.log(`\nEscrito: src/data/gcp.ts (${roles.length} roles, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
  console.log('Depois rode:  node scripts/build-azure-perms-index.js  (se aplicável)')
})().catch((e) => {
  // process.exit() com escrita pendente derruba o libuv no Windows
  // ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)").
  // exitCode deixa o Node encerrar sozinho depois de drenar o stdout.
  console.error('\nFALHOU:', e.message)
  process.exitCode = 1
})
