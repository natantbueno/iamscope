#!/usr/bin/env node
/**
 * Verifica o índice de navegação das páginas de Reference.
 *
 * POR QUE EXISTE
 *   O `/info` listava 6 das 8 ferramentas do site porque duas foram criadas e
 *   ninguém lembrou de voltar lá. O índice das Reference tem exatamente o mesmo
 *   risco — e agora aparece em seis páginas em vez de uma, então erra seis
 *   vezes.
 *
 * O QUE CONFERE
 *   1. Toda rota listada no índice EXISTE em src/app.
 *   2. Toda rota de listagem da cloud está no índice (nada esquecido).
 *   3. Toda ferramenta da sidebar está em SITE_TOOLS.
 *   4. As contagens vêm de counts.ts, não são literais — exceto onde é
 *      declaradamente impossível, e essas são conferidas contra o valor real.
 *   5. As seis Reference realmente renderizam o componente.
 *
 * Uso: node scripts/check-site-index.js
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const APP = path.join(ROOT, 'src', 'app')

const { SITE_INDEX, SITE_TOOLS } = loadTs('src/data/siteIndex.ts')
const counts = Object.fromEntries(
  [...fs.readFileSync(path.join(ROOT, 'src', 'data', 'counts.ts'), 'utf8')
    .matchAll(/export const (\w+) = (\d+)/g)].map((m) => [m[1], Number(m[2])]),
)

const problemas = []

// ── 1. Rotas do projeto ─────────────────────────────────────────────────────
const rotasReais = new Set()
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === 'page.tsx') {
      let r = path.relative(APP, dir).replace(/\\/g, '/').replace(/\([^)]+\)\/?/g, '')
      rotasReais.add('/' + r.replace(/\/$/, ''))
    }
  }
})(APP)

const todasEntradas = [...Object.values(SITE_INDEX).flat(), ...SITE_TOOLS]
for (const e of todasEntradas) {
  if (!rotasReais.has(e.href)) problemas.push(`rota inexistente no índice: ${e.href} (${e.label})`)
  if (e.href.endsWith('/')) problemas.push(`href não deve terminar em barra: ${e.href}`)
}

// ── 2. Rota de listagem da cloud que ficou de fora ──────────────────────────
const PREFIXO = {
  entraId: '/entraid', azureRbac: '/azure-rbac', aws: '/aws',
  gcp: '/gcp', googleWorkspace: '/google-workspace', ibmCloud: '/ibm-cloud',
}
/**
 * Fora do índice de propósito:
 *   - [slug]      → página de detalhe, não de listagem
 *   - /reference  → é ela que renderiza o índice; listar a si mesma é ruído
 *   - stubs de redirect → só existem para não quebrar link antigo
 */
const REDIRECTS = ['/ibm-cloud/actions']
const IGNORAR = (r) => r.includes('[') || r.endsWith('/reference') || REDIRECTS.includes(r)

for (const [cloud, prefixo] of Object.entries(PREFIXO)) {
  const listadas = new Set((SITE_INDEX[cloud] ?? []).map((e) => e.href))
  for (const r of rotasReais) {
    if (!r.startsWith(prefixo + '/') && r !== prefixo) continue
    if (IGNORAR(r)) continue
    if (!listadas.has(r)) problemas.push(`${cloud}: rota ${r} existe mas não está no índice`)
  }
}

// ── 3. Ferramenta da sidebar ausente de SITE_TOOLS ──────────────────────────
{
  const sidebar = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Sidebar.tsx'), 'utf8')
  const naSidebar = new Set(
    [...sidebar.matchAll(/router\.push\('(\/(?:advisor|compare|evaluate|sod|assessment|permission-scope|tier-comparison|stats|search))'\)/g)]
      .map((m) => m[1]),
  )
  const nasTools = new Set(SITE_TOOLS.map((e) => e.href))
  for (const r of naSidebar) {
    if (!nasTools.has(r)) problemas.push(`ferramenta ${r} está na sidebar mas não em SITE_TOOLS`)
  }
}

// ── 4. Contagem literal que não bate com o real ─────────────────────────────
//
// siteIndex.ts importa de counts.ts, então a maioria é automática. Sobram dois
// literais — Azure actions (vive no índice em public/) e o total da busca —, e
// esses precisam ser conferidos justamente por serem escritos à mão.
{
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'siteIndex.ts'), 'utf8')
  const literais = [...src.matchAll(/count: (\d{2,})/g)].map((m) => Number(m[1]))

  let azureActions = null
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'azure-perms-index.json'), 'utf8'))
    azureActions = Object.keys(idx.index).length
  } catch { /* opcional */ }

  const totalRoles = counts.ENTRA_ROLES_COUNT + counts.AZURE_ROLES_COUNT + counts.AWS_POLICIES_COUNT
    + counts.GCP_ROLES_COUNT + counts.GWS_ROLES_COUNT + counts.IBM_ROLES_COUNT

  const permitidos = new Set([azureActions, totalRoles, counts.SOD_RULES_COUNT].filter(Boolean))
  for (const n of literais) {
    if (!permitidos.has(n)) {
      problemas.push(
        `count: ${n} é literal e não bate com nenhum valor real `
        + `(actions Azure=${azureActions}, roles totais=${totalRoles}, regras SoD=${counts.SOD_RULES_COUNT})`,
      )
    }
  }
}

// ── 5. As seis Reference renderizam o índice ────────────────────────────────
const REFS = [
  'src/app/entraid/(content)/reference/EntraReferenceClient.tsx',
  'src/app/azure-rbac/reference/AzureRbacReferenceClient.tsx',
  'src/app/aws/reference/AwsReferenceClient.tsx',
  'src/app/gcp/reference/GcpReferenceClient.tsx',
  'src/app/google-workspace/reference/GwsReferenceClient.tsx',
  'src/app/ibm-cloud/reference/IbmReferenceClient.tsx',
]
for (const r of REFS) {
  const src = fs.readFileSync(path.join(ROOT, r), 'utf8')
  if (!/<ReferenceIndex\s+cloud=/.test(src)) problemas.push(`${r} não renderiza <ReferenceIndex>`)
}

// ── Relatório ───────────────────────────────────────────────────────────────
if (problemas.length) {
  console.error(`\n${problemas.length} problema(s) no índice de navegação:\n`)
  for (const p of problemas) console.error(`  - ${p}`)
  process.exitCode = 1
} else {
  const n = todasEntradas.length
  console.log(`OK — ${n} entrada(s) de índice apontam para rotas existentes, `
    + `nenhuma listagem esquecida, 6 Reference renderizando.`)
}
