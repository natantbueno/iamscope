#!/usr/bin/env node
/**
 * Coleta TODAS as predefined roles do GCP — com permissões reais, descrição
 * oficial, launch stage e "lowest-level resources" — direto da documentação
 * pública do Google, SEM credencial.
 *
 * Fonte: https://docs.cloud.google.com/iam/docs/roles-permissions/<serviço>
 *   Uma página por serviço (~353 no total). Cada página traz uma tabela
 *   Role | Permissions, e é a mesma informação que a IAM API devolve em
 *   roles.list?view=FULL — só que aberta, sem exigir login nem projeto.
 *
 * POR QUE ESTE SCRIPT EXISTE (e como ele difere de fetch-gcp-roles.js)
 *   fetch-gcp-roles.js usa a IAM API, que responde 403 sem credencial. Este
 *   aqui não precisa de nada: roda em qualquer máquina, inclusive em CI sem
 *   secret. Os dois produzem a mesma classificação porque compartilham
 *   scripts/lib/gcp-classify.js.
 *
 * ATENÇÃO — a página ÍNDICE (/iam/docs/roles-permissions, sem serviço) é
 *   montada por JavaScript e serve HTML vazio para um fetch de servidor. As
 *   páginas POR SERVIÇO, não: vêm renderizadas do servidor (~1 MB de HTML).
 *   Por isso a lista de serviços é descoberta pela navegação lateral de uma
 *   página de serviço, e não pelo índice.
 *
 * DETALHES DE PARSING que já quebraram uma versão anterior:
 *   - o Google injeta <wbr> no meio dos identificadores
 *     (`storage.<wbr>bucketOperations.<wbr>cancel`) — tem que remover antes;
 *   - a descrição vem em <span class="role-description"> OU
 *     <span class="role-description custom"> — o regex precisa aceitar as duas;
 *   - permissões com wildcard ficam dentro de <devsite-expandable>, com o
 *     wildcard (`storage.buckets.*`) num <span class="iamperm-wildcard"> e as
 *     permissões concretas em <li><code>. Guardamos as duas coisas.
 *
 * Uso:
 *   node scripts/fetch-gcp-roles-from-docs.js --dry-run       # só relatório
 *   node scripts/fetch-gcp-roles-from-docs.js                 # grava o JSON bruto
 *   node scripts/fetch-gcp-roles-from-docs.js --write-ts      # + regenera src/data/gcp.ts
 *   node scripts/fetch-gcp-roles-from-docs.js --limit=20      # amostra, para testar
 *
 * Node 18+ (fetch nativo), sem dependências.
 */
const fs = require('fs')
const path = require('path')
const {
  classifyTier, classifyCategory, classifyScope, isPrivileged, slugify, esc,
} = require('./lib/gcp-classify')
const { isDeprecated } = require('./lib/deprecation')

const ROOT = path.join(__dirname, '..')
const RAW_OUT = path.join(ROOT, 'public', 'gcp-roles-official.json')
const TS_OUT = path.join(ROOT, 'src', 'data', 'gcp.ts')

const BASE = 'https://docs.cloud.google.com/iam/docs/roles-permissions'
const SEED = `${BASE}/storage`
const CONCURRENCY = 8

const DRY = process.argv.includes('--dry-run')
const WRITE_TS = process.argv.includes('--write-ts')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : 0

// ── HTML helpers ─────────────────────────────────────────────────────────────
const strip = (s) => String(s)
  .replace(/<wbr\s*\/?>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

/**
 * hl=en é obrigatório, não cosmético: a doc do Google responde no idioma do
 * leitor (docs.cloud.google.com/...?hl=pt-br devolve tudo em português). Sem
 * fixar o idioma, o dataset mudaria de língua dependendo de quem rodou o
 * script, e as descrições oficiais precisam bater com as das outras clouds,
 * que estão em inglês.
 */
async function get(url, tries = 3) {
  const u = url + (url.includes('?') ? '&' : '?') + 'hl=en'
  let last
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(u, {
        headers: {
          'user-agent': 'Mozilla/5.0 (IAM Scope docs reader)',
          accept: 'text/html',
          'accept-language': 'en-US,en;q=0.9',
        },
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
  throw last
}

/** Descobre os serviços pela navegação lateral (presente no HTML servido). */
function discoverServices(html) {
  const s = new Set()
  for (const m of html.matchAll(/roles-permissions\/([a-z0-9-]+)/g)) s.add(m[1])
  return [...s].sort()
}

/** Extrai as roles de uma página de serviço. */
function parseRoles(html, service) {
  const roles = []
  const rowRx = /<td class="role-description">([\s\S]*?)<\/td>\s*<td class="role-permissions">([\s\S]*?)<\/td>/g
  let m
  while ((m = rowRx.exec(html)) !== null) {
    const D = m[1]
    const PC = m[2]

    const idm = /<h4[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h4>/.exec(D)
    if (!idm) continue

    const ridm = /<code[^>]*>roles\/([\s\S]*?)<\/code>/.exec(D)
    const roleId = ridm ? `roles/${strip(ridm[1])}` : null
    if (!roleId) continue

    const descBlock = (/<span class="role-description[^"]*">([\s\S]*?)<\/span>/.exec(D) || [])[1] || ''
    const description = [...descBlock.matchAll(/<p>([\s\S]*?)<\/p>/g)]
      .map((x) => strip(x[1])).filter(Boolean).join(' ')

    const lowestBlock = (/<ul class="role-lowest-resource">([\s\S]*?)<\/ul>/.exec(D) || ['', ''])[1]
    const lowestResources = [...lowestBlock.matchAll(/<li>([\s\S]*?)<\/li>/g)]
      .map((x) => strip(x[1])).filter(Boolean)

    const stageM = /<[^>]*class="launch-stage[^"]*"[^>]*>([\s\S]*?)</.exec(D)
    const stage = stageM ? strip(stageM[1]) : null

    // wildcards ficam em <devsite-expandable>; removemos o bloco para que as
    // permissões "soltas" restantes não sejam contadas duas vezes
    const wildcards = []
    const expanded = []
    const rest = PC.replace(/<devsite-expandable[\s\S]*?<\/devsite-expandable>/g, (blk) => {
      const w = (/<span class="iamperm-wildcard">\s*<code[^>]*>([\s\S]*?)<\/code>/.exec(blk) || [])[1]
      if (w) wildcards.push(strip(w))
      for (const li of blk.matchAll(/<li><code[^>]*>([\s\S]*?)<\/code><\/li>/g)) expanded.push(strip(li[1]))
      return ''
    })
    const plain = [...rest.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)]
      .map((x) => strip(x[1])).filter(Boolean)

    roles.push({
      roleId,
      anchor: idm[1],
      title: strip(idm[2]),
      stage,
      description,
      lowestResources,
      permissions: [...new Set([...plain, ...expanded])].sort(),
      wildcards: [...new Set(wildcards)].sort(),
      service,
      // A doc do Google não tem marcador de depreciação (o launch stage só
      // mostra GA/Beta); o único sinal disponível é o texto da descrição.
      deprecated: isDeprecated(description),
    })
  }
  return roles
}

/**
 * Basic roles NÃO aparecem nas páginas por serviço — ficam só em roles-overview,
 * em duas tabelas ("Basic role" e "Legacy basic role").
 *
 * E o Google NÃO publica a lista de permissões delas em lugar nenhum da doc:
 * o texto manda abrir o console ou usar `gcloud iam roles describe`. Por isso
 * saem daqui com permissions: [] e um aviso — inventar a lista seria pior que
 * deixar vazio.
 *
 * Descoberta relevante: hoje as basic roles são Admin/Writer/Reader, e
 * Owner/Editor/Viewer foram reclassificadas como "legacy basic roles".
 */
function parseBasicRoles(html) {
  const roles = []
  for (const tbl of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
    const t = tbl[0]
    const headers = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((x) => strip(x[1]))
    const isBasic = headers.some((h) => /^basic role$/i.test(h))
    const isLegacy = headers.some((h) => /^legacy basic role$/i.test(h))
    if (!isBasic && !isLegacy) continue

    for (const row of t.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)) {
      const nameCell = row[1]
      const descCell = row[2]
      const ridm = /<code[^>]*>roles\/([\s\S]*?)<\/code>/.exec(nameCell)
      if (!ridm) continue
      const titleM = /<strong>([\s\S]*?)<\/strong>/.exec(nameCell)
      // Só o primeiro <p>: os seguintes são "para ver a lista, abra o console".
      // Exceção: Admin e Owner terminam em "actions like the following:" e a
      // lista vem num <ul> logo depois — sem ele a frase fica pendurada.
      const firstP = /<p>([\s\S]*?)<\/p>/.exec(descCell)
      let description = firstP ? strip(firstP[1]) : strip(descCell)
      if (description.endsWith(':')) {
        const ulM = /<ul[^>]*>([\s\S]*?)<\/ul>/.exec(descCell)
        if (ulM) {
          const items = [...ulM[1].matchAll(/<li>([\s\S]*?)<\/li>/g)]
            .map((x) => strip(x[1])).filter(Boolean)
          if (items.length) description += ` ${items.join('; ')}.`
        }
      }
      roles.push({
        roleId: `roles/${strip(ridm[1])}`,
        anchor: strip(ridm[1]),
        title: titleM ? strip(titleM[1]) : strip(ridm[1]),
        stage: null,
        description,
        lowestResources: [],
        permissions: [],
        wildcards: [],
        service: 'basic',
        kind: isLegacy ? 'legacy-basic' : 'basic',
        permissionsNote: 'O Google não publica a lista de permissões das basic roles na documentação. '
          + 'Use `gcloud iam roles describe <roleId>` ou o console para obtê-la.',
      })
    }
  }
  return roles
}

async function pool(items, n, fn) {
  const out = []
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  }))
  return out
}

// ── Geração do src/data/gcp.ts ───────────────────────────────────────────────
/**
 * IMPORTANTE: as permissões NÃO entram no .ts.
 *
 * São 130 mil strings; embutidas no módulo elas iriam parar no bundle do
 * cliente e o `output: 'export'` ficaria com vários MB de JS morto. O site já
 * resolve isso na Azure — azureRbac.ts guarda só metadados + permissionCount,
 * e as permissões ficam em public/azure-perms/<slug>.json, buscadas sob
 * demanda. Aqui seguimos exatamente o mesmo desenho.
 */
function renderTs(roles) {
  const lines = roles.map((r) => {
    const perms = r.permissions
    const tier = classifyTier(r.roleId, perms)
    const cat = classifyCategory(r.roleId)
    const scope = classifyScope(r.lowestResources)
    const priv = isPrivileged(r.roleId, perms)
    const lowestLit = r.lowestResources.length
      ? `, lowestResources: [${r.lowestResources.map((l) => `'${esc(l)}'`).join(', ')}]`
      : ''
    const stageLit = r.stage ? `, stage: '${esc(r.stage)}'` : ''
    const kindLit = r.kind ? `, kind: '${esc(r.kind)}'` : ''
    const depLit = r.deprecated ? ', deprecated: true' : ''
    const noteLit = r.permissionsNote ? `, permissionsNote: '${esc(r.permissionsNote)}'` : ''
    return `  { slug: '${slugify(r.roleId)}', name: '${esc(r.title)}', roleId: '${esc(r.roleId)}', `
      + `description: '${esc(r.description)}', tier: '${tier}', category: '${cat}', `
      + `isPrivileged: ${priv}, scope: '${scope}', permissionCount: ${perms.length}`
      + `${lowestLit}${stageLit}${kindLit}${depLit}${noteLit} },`
  })

  const header = fs.readFileSync(TS_OUT, 'utf8').split('export const GCP_ROLES')[0]
    .replace(
      '// Source: https://cloud.google.com/iam/docs/understanding-roles',
      '// Source: https://docs.cloud.google.com/iam/docs/roles-permissions (dados oficiais)\n'
      + `// Gerado por scripts/fetch-gcp-roles-from-docs.js em ${new Date().toISOString().slice(0, 10)}.\n`
      + '// NÃO editar à mão — rode o script novamente.',
    )

  // Contagens exportadas para a Sidebar e a home não precisarem carregar o
  // índice de permissões só para mostrar um número.
  const allPerms = new Set(roles.flatMap((r) => r.permissions))
  const services = new Set([...allPerms].map((p) => p.split('.')[0]))
  const counts = `\nexport const GCP_PERMISSION_COUNT = ${allPerms.size}\n`
    + `export const GCP_SERVICE_COUNT = ${services.size}\n`

  // GCP_CATEGORIES precisa ser emitido aqui: ele fica DEPOIS de GCP_ROLES no
  // arquivo, e o header preservado acima só cobre o que vem antes. Já se
  // perdeu uma vez numa regeneração e quebrou /gcp.
  // Extraído do próprio union GcpCategory para não divergir do tipo.
  const catUnion = /export type GcpCategory =([\s\S]*?)\n\n/.exec(header)
  const cats = catUnion
    ? [...catUnion[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    : []
  if (!cats.length) throw new Error('Não consegui extrair GcpCategory do header de gcp.ts')
  const catsLit = `\nexport const GCP_CATEGORIES: GcpCategory[] = [`
    + `${cats.map((c) => `'${c}'`).join(', ')}]\n`

  return `${header}export const GCP_ROLES: GcpRole[] = [\n${lines.join('\n')}\n]\n${counts}${catsLit}`
}

// Exportado para scripts/test-gcp-docs-parser.js poder testar o parser sem rede.
module.exports = { parseRoles, parseBasicRoles, discoverServices, strip, renderTs }

// ── Main ─────────────────────────────────────────────────────────────────────
if (require.main !== module) return

;(async () => {
  console.log('Descobrindo serviços pela navegação das docs...')
  const seed = await get(SEED)
  if (!seed) throw new Error(`Não consegui ler a página semente ${SEED}`)
  let services = discoverServices(seed)
  if (services.length < 50) {
    throw new Error(
      `Só ${services.length} serviços descobertos — o layout da navegação provavelmente mudou.\n`
      + '  Confira discoverServices().',
    )
  }
  if (LIMIT) services = services.slice(0, LIMIT)
  console.log(`  ${services.length} páginas de serviço a buscar.\n`)

  let done = 0
  const failed = []
  const perService = await pool(services, CONCURRENCY, async (svc) => {
    try {
      const html = await get(`${BASE}/${svc}`)
      done++
      if (done % 25 === 0 || done === services.length) {
        process.stdout.write(`\r  ${done}/${services.length} páginas`)
      }
      if (!html) return []
      return parseRoles(html, svc)
    } catch (e) {
      failed.push(`${svc} (${e.message})`)
      done++
      return []
    }
  })
  process.stdout.write('\n')

  // Basic roles vivem fora das páginas por serviço.
  let basic = []
  if (!LIMIT) {
    try {
      const ov = await get(`${BASE.replace('/roles-permissions', '')}/roles-overview`)
      basic = ov ? parseBasicRoles(ov) : []
      if (basic.length < 3) {
        console.warn(`  AVISO: só ${basic.length} basic roles extraídas de roles-overview `
          + '— confira parseBasicRoles(); owner/editor/viewer podem sumir do site.')
      } else {
        console.log(`  ${basic.length} basic roles de roles-overview `
          + `(${basic.filter((r) => r.kind === 'legacy-basic').length} legacy).`)
      }
    } catch (e) {
      console.warn(`  AVISO: falha ao ler roles-overview (${e.message}) — basic roles ficarão de fora.`)
    }
  }

  // Uma role pode aparecer em mais de uma página (ex.: jobfunctions).
  // Fica a ocorrência mais completa.
  const byId = new Map()
  for (const r of [...perService.flat(), ...basic]) {
    const prev = byId.get(r.roleId)
    if (!prev
      || r.permissions.length > prev.permissions.length
      || (r.permissions.length === prev.permissions.length && r.description.length > prev.description.length)) {
      byId.set(r.roleId, r)
    }
  }
  const roles = [...byId.values()].sort((a, b) => a.roleId.localeCompare(b.roleId))

  const uniquePerms = new Set(roles.flatMap((r) => r.permissions))
  const noDesc = roles.filter((r) => !r.description)
  const noPerms = roles.filter((r) => !r.permissions.length)

  console.log(`\n${'='.repeat(62)}`)
  console.log(`Roles encontradas       : ${roles.length}`)
  console.log(`Permissões únicas       : ${uniquePerms.size}`)
  console.log(`Permissões (soma)       : ${roles.reduce((a, r) => a + r.permissions.length, 0)}`)
  console.log(`Com lowest-resources    : ${roles.filter((r) => r.lowestResources.length).length}`)
  console.log(`Com launch stage        : ${roles.filter((r) => r.stage).length}`)
  console.log(`Deprecated (pela descrição): ${roles.filter((r) => r.deprecated).length}`
    + '  — a doc do Google não publica flag; ver lib/deprecation.js')
  console.log(`Sem descrição           : ${noDesc.length}`)
  console.log(`Sem permissão           : ${noPerms.length}`)
  console.log(`  dos quais basic roles : ${roles.filter((r) => r.kind && !r.permissions.length).length}`
    + ' (esperado — o Google não publica)')
  console.log('='.repeat(62))

  const basicFound = roles.filter((r) => r.kind)
  if (basicFound.length) {
    console.log('\nBasic roles (permissões não publicadas pelo Google):')
    for (const r of basicFound) console.log(`  ${r.kind === 'legacy-basic' ? '[legacy]' : '[basic] '} ${r.roleId}`)
  }

  if (failed.length) {
    console.log(`\nPáginas que falharam (${failed.length}):`)
    for (const f of failed.slice(0, 15)) console.log(`  - ${f}`)
    if (failed.length > 15) console.log(`  … e mais ${failed.length - 15}`)
  }

  // Diff contra o que está no site hoje
  try {
    const cur = fs.readFileSync(TS_OUT, 'utf8')
    const curIds = new Set([...cur.matchAll(/roleId: '([^']+)'/g)].map((m) => m[1]))
    const newIds = new Set(roles.map((r) => r.roleId))
    const added = [...newIds].filter((x) => !curIds.has(x))
    const removed = [...curIds].filter((x) => !newIds.has(x))
    const curPerms = (cur.match(/permissions: \[/g) || []).length
    console.log(`\nHoje no site: ${curIds.size} roles (${curPerms} com array de permissions)`)
    console.log(`  + ${added.length} novas   - ${removed.length} que sairiam`)
    for (const r of removed.slice(0, 20)) console.log(`      - ${r}`)
    if (removed.length > 20) console.log(`      … e mais ${removed.length - 20}`)
  } catch { /* primeira execução */ }

  if (noDesc.length) {
    console.log(`\nSem descrição (amostra): ${noDesc.slice(0, 8).map((r) => r.roleId).join(', ')}`)
  }

  if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

  fs.writeFileSync(RAW_OUT, JSON.stringify({
    source: BASE,
    fetchedAt: new Date().toISOString(),
    roleCount: roles.length,
    permissionCount: uniquePerms.size,
    roles,
  }))
  console.log(`\nEscrito: public/gcp-roles-official.json (${(fs.statSync(RAW_OUT).size / 1024 / 1024).toFixed(1)} MB)`)

  if (!WRITE_TS) {
    console.log('\nsrc/data/gcp.ts NÃO foi tocado. Para regenerar, rode com --write-ts')
    console.log('(revise o diff acima antes — a contagem de roles muda bastante).')
    return
  }

  // public/gcp-perms/<slug>.json — uma lista por role, buscada sob demanda
  // (mesmo desenho de public/azure-perms/).
  const permsDir = path.join(ROOT, 'public', 'gcp-perms')
  fs.mkdirSync(permsDir, { recursive: true })
  const wanted = new Set()
  for (const r of roles) {
    const slug = slugify(r.roleId)
    wanted.add(`${slug}.json`)
    fs.writeFileSync(path.join(permsDir, `${slug}.json`), JSON.stringify(r.permissions))
  }
  // remove órfãos de execuções anteriores, senão o export leva lixo junto
  let removed = 0
  for (const f of fs.readdirSync(permsDir)) {
    if (f.endsWith('.json') && !wanted.has(f)) { fs.unlinkSync(path.join(permsDir, f)); removed++ }
  }
  console.log(`Escrito: public/gcp-perms/ (${wanted.size} arquivos${removed ? `, ${removed} órfão(s) removido(s)` : ''})`)

  // Índice invertido permissão -> roles, para o Permission Scope
  const slugs = roles.map((r) => slugify(r.roleId))
  const index = {}
  roles.forEach((r, i) => {
    for (const p of r.permissions) (index[p] ||= []).push(i)
  })
  const idxPath = path.join(ROOT, 'public', 'gcp-perms-index.json')
  fs.writeFileSync(idxPath, JSON.stringify({ slugs, index }))
  console.log(`Escrito: public/gcp-perms-index.json `
    + `(${Object.keys(index).length} permissões, ${(fs.statSync(idxPath).size / 1024 / 1024).toFixed(1)} MB)`)

  fs.writeFileSync(TS_OUT, renderTs(roles))
  console.log(`Escrito: src/data/gcp.ts (${roles.length} roles, `
    + `${(fs.statSync(TS_OUT).size / 1024).toFixed(0)} KB — sem as permissões, que ficam nos JSONs)`)
  console.log('\nAgora rode:  node scripts/typecheck.cjs')
})().catch((e) => {
  // process.exit() com stdout pendente derruba o libuv no Windows
  console.error('\nFALHOU:', e.message)
  process.exitCode = 1
})
