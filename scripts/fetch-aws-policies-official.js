#!/usr/bin/env node
/**
 * Coleta TODAS as AWS Managed Policies da referência oficial da AWS, com
 * descrição literal, datas, versão e o documento JSON real da policy.
 *
 * Fonte: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html
 *   Índice público, sem credencial. Uma página por policy, renderizada no
 *   servidor (verificado em 29/07/2026: o índice tem 172 KB e ~1.555 links).
 *
 * POR QUE ESTE SCRIPT SUBSTITUI O ANTERIOR
 *   O aws.ts gerado antes tinha as 1.553 descrições preenchidas com o template
 *   "<Nome> — AWS managed policy." — ou seja, 100% inventadas. A AWS publica a
 *   descrição real em cada página ("Provides read only access to all buckets
 *   via the AWS Management Console."), e é ela que passa a ser usada.
 *
 *   O campo `privileges` também saiu: era só um prefixo do array `actions`
 *   (399 de 400 amostrados), não um texto de capacidades. Duplicata inútil.
 *
 * O QUE É OFICIAL AQUI
 *   name, arn, description, type, createdAt, editedAt, version e o documento
 *   JSON. tier/category/isPrivileged são classificação editorial nossa, em
 *   scripts/lib/aws-classify.js, e a UI precisa rotular como tal.
 *
 * DETALHES DE PARSING que quebram parsers ingênuos:
 *   - "Edited time:" tem o dois-pontos DENTRO do <b>, enquanto Description,
 *     Type e ARN têm fora. O regex aceita as duas formas.
 *   - o bloco JSON vem com <span> injetado em volta das chaves e com entidades
 *     HTML (&quot;) — precisa remover tags e decodificar antes do JSON.parse.
 *   - Type varia: "AWS managed policy", "Service-linked role policy", etc.
 *
 * Uso:
 *   node scripts/fetch-aws-policies-official.js --dry-run     # só relatório
 *   node scripts/fetch-aws-policies-official.js --limit=25    # amostra
 *   node scripts/fetch-aws-policies-official.js --write-ts    # grava tudo
 *
 * Node 18+ (fetch nativo), sem dependências.
 */
const fs = require('fs')
const path = require('path')
const {
  classifyCategory, classifyTier, isPrivileged, classifyType, classifyScope,
  slugify, esc,
} = require('./lib/aws-classify')
const { isDeprecated } = require('./lib/deprecation')

const ROOT = path.join(__dirname, '..')
const TS_OUT = path.join(ROOT, 'src', 'data', 'aws.ts')
const DOCS_DIR = path.join(ROOT, 'public', 'aws-policy-docs')
const IDX_OUT = path.join(ROOT, 'public', 'aws-actions-index.json')

const BASE = 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference'
const INDEX = `${BASE}/policy-list.html`
const CONCURRENCY = 8

const DRY = process.argv.includes('--dry-run')
const WRITE_TS = process.argv.includes('--write-ts')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : 0

// ── HTML helpers ─────────────────────────────────────────────────────────────
const dec = (s) => String(s)
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')

const strip = (s) => dec(String(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

async function get(url, tries = 3) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (IAM Scope docs reader)', accept: 'text/html' },
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

const NAV_PAGES = new Set([
  'index', 'policy-list', 'about-managed-policy-reference', 'reference',
  'what-is', 'history', 'security', 'troubleshoot',
])

function discoverPolicies(html) {
  const names = new Set()
  for (const m of html.matchAll(/href="\.?\/?([A-Za-z0-9_+=,.@-]+)\.html"/g)) {
    const n = m[1]
    if (NAV_PAGES.has(n.toLowerCase())) continue
    if (n.length < 3) continue
    names.add(n)
  }
  return [...names].sort()
}

/** Extrai os campos oficiais de uma página de policy. */
function parsePolicy(html, name) {
  const f = (re) => { const m = re.exec(html); return m ? strip(m[1]) : null }

  const description = f(/<b>\s*Description\s*:?\s*<\/b>\s*:?\s*([\s\S]*?)<\/p>/)
  const officialType = f(/<b>\s*Type\s*:?\s*<\/b>\s*:?\s*([\s\S]*?)<\/p>/)
  const createdAt = f(/<b>\s*Creation time\s*:?\s*<\/b>\s*:?\s*([\s\S]*?)<\/p>/)
  const editedAt = f(/<b>\s*Edited time\s*:?\s*<\/b>\s*:?\s*([\s\S]*?)<\/p>/)
  const arn = f(/<b>\s*ARN\s*:?\s*<\/b>\s*:?\s*<code[^>]*>([\s\S]*?)<\/code>/)
  const version = f(/<b>\s*Policy version\s*:?\s*<\/b>\s*:?\s*([\s\S]*?)<\/p>/)

  // A AWS não tem campo "deprecated": escreve isso DENTRO da descrição, com a
  // redação "This policy is on a deprecation path.". O detector é
  // compartilhado com o GCP e recebe só a descrição — ver lib/deprecation.js
  // para os falsos positivos que isso evita.
  const deprecated = isDeprecated(description)

  let document = null
  let parseError = null
  const pre = /<code class="json[^"]*">([\s\S]*?)<\/code>/.exec(html)
  if (pre) {
    const raw = dec(pre[1].replace(/<[^>]+>/g, ''))
    try { document = JSON.parse(raw) } catch (e) { parseError = e.message.slice(0, 80) }
  }

  const actions = []
  const notActions = []
  if (document) {
    const st = Array.isArray(document.Statement) ? document.Statement
      : document.Statement ? [document.Statement] : []
    for (const s of st) {
      for (const a of [].concat(s.Action ?? [])) actions.push(a)
      for (const a of [].concat(s.NotAction ?? [])) notActions.push(a)
    }
  }

  return {
    name,
    arn: arn ?? `arn:aws:iam::aws:policy/${name}`,
    description,
    officialType,
    createdAt,
    editedAt,
    version,
    deprecated,
    document,
    parseError,
    actions: [...new Set(actions)].sort(),
    notActions: [...new Set(notActions)].sort(),
  }
}

async function pool(items, n, fn) {
  const out = []
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  }))
  return out
}

// ── Geração do src/data/aws.ts ───────────────────────────────────────────────
/**
 * As actions NÃO entram no .ts. Hoje o aws.ts tem 1,7 MB porque carrega os
 * arrays inteiros — tudo isso vai para o bundle do cliente. Seguimos o mesmo
 * desenho de Azure e GCP: metadados aqui, actions em public/aws-policy-docs/.
 */
function renderTs(policies) {
  const lines = policies.map((p) => {
    const cat = classifyCategory(p.name, p.actions)
    const tier = classifyTier(p.name, p.actions)
    const priv = isPrivileged(p.name, p.actions)
    const type = classifyType(p.arn, p.officialType)
    const scope = classifyScope(p.arn)
    const opt = (k, v) => (v ? `, ${k}: '${esc(v)}'` : '')
    return `  { slug: '${slugify(p.name)}', name: '${esc(p.name)}', arn: '${esc(p.arn)}', `
      + `description: '${esc(p.description ?? '')}', tier: '${tier}', category: '${cat}', `
      + `isPrivileged: ${priv}, type: '${type}', scope: '${scope}', `
      + `actionCount: ${p.actions.length}`
      + opt('officialType', p.officialType) + opt('createdAt', p.createdAt)
      + opt('editedAt', p.editedAt) + opt('version', p.version)
      + (p.deprecated ? ', deprecated: true' : '')
      + ' },'
  })

  const header = fs.readFileSync(TS_OUT, 'utf8').split('export const AWS_POLICIES')[0]
    .replace(/^\/\/ AWS IAM[\s\S]*?\n\n/, '')

  const banner = '// AWS IAM — Managed Policies — AUTO-GERADO por scripts/fetch-aws-policies-official.js\n'
    + `// Fonte: ${BASE}/policy-list.html (referência oficial, sem credencial)\n`
    + `// Gerado em: ${new Date().toISOString()}\n`
    + '// name/arn/description/type/datas/versão são literais da AWS.\n'
    + '// tier/category/isPrivileged são classificação editorial do IAM Scope.\n'
    + '// As actions ficam em public/aws-policy-docs/<slug>.json, fora do bundle.\n'
    + `// Total: ${policies.length} policies\n\n`

  // Contagens exportadas para a Sidebar e a home não precisarem baixar o
  // índice de 16 mil actions só para mostrar um número.
  const allActions = new Set(policies.flatMap((p) => p.actions))
  const services = new Set([...allActions]
    .map((a) => { const i = a.indexOf(':'); return i > 0 ? a.slice(0, i) : a })
    .filter((s) => s && s !== '*'))
  const counts = `\nexport const AWS_ACTION_COUNT = ${allActions.size}\n`
    + `export const AWS_SERVICE_COUNT = ${services.size}\n`

  return `${banner}${header}export const AWS_POLICIES: AwsPolicy[] = [\n${lines.join('\n')}\n]\n${counts}`
}

// Exportado para scripts/test-aws-parser.js testar o parser sem rede.
module.exports = { parsePolicy, discoverPolicies, strip, dec, renderTs }

// ── Main ─────────────────────────────────────────────────────────────────────
if (require.main !== module) return

;(async () => {
  console.log('Buscando o índice oficial de AWS Managed Policies...')
  const idxHtml = await get(INDEX)
  if (!idxHtml) throw new Error(`Não consegui ler ${INDEX}`)

  let names = discoverPolicies(idxHtml)
  if (names.length < 500) {
    throw new Error(
      `Só ${names.length} policies extraídas — o layout do índice provavelmente mudou.\n`
      + `  Confira discoverPolicies(). Tamanho do HTML: ${idxHtml.length} bytes.`)
  }
  if (LIMIT) names = names.slice(0, LIMIT)
  console.log(`  ${names.length} policies a buscar.\n`)

  let done = 0
  const failed = []
  const parsed = await pool(names, CONCURRENCY, async (n) => {
    try {
      const h = await get(`${BASE}/${n}.html`)
      done++
      if (done % 100 === 0 || done === names.length) {
        process.stdout.write(`\r  ${done}/${names.length} páginas`)
      }
      return h ? parsePolicy(h, n) : null
    } catch (e) { failed.push(`${n} (${e.message})`); done++; return null }
  })
  process.stdout.write('\n')

  const policies = parsed.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))

  const noDesc = policies.filter((p) => !p.description)
  const noDoc = policies.filter((p) => !p.document)
  const docErr = policies.filter((p) => p.parseError)
  const allActions = new Set(policies.flatMap((p) => p.actions))

  console.log(`\n${'='.repeat(62)}`)
  console.log(`Policies coletadas      : ${policies.length}`)
  console.log(`Com descrição oficial   : ${policies.length - noDesc.length}`)
  console.log(`Sem descrição           : ${noDesc.length}`)
  console.log(`Com documento JSON      : ${policies.length - noDoc.length}`)
  console.log(`JSON que não parseou    : ${docErr.length}`)
  console.log(`Deprecated              : ${policies.filter((p) => p.deprecated).length}`)
  console.log(`Actions únicas          : ${allActions.size}`)
  console.log(`Tipos oficiais          : ${[...new Set(policies.map((p) => p.officialType).filter(Boolean))].join(' | ')}`)
  console.log('='.repeat(62))

  if (failed.length) {
    console.log(`\nPáginas que falharam (${failed.length}):`)
    for (const f of failed.slice(0, 15)) console.log(`  - ${f}`)
  }
  if (docErr.length) {
    console.log('\nJSON com erro de parse (amostra):')
    for (const p of docErr.slice(0, 5)) console.log(`  - ${p.name}: ${p.parseError}`)
  }
  if (noDesc.length) {
    console.log(`\nSem descrição (amostra): ${noDesc.slice(0, 8).map((p) => p.name).join(', ')}`)
  }

  // Diff contra o site
  try {
    const cur = fs.readFileSync(TS_OUT, 'utf8')
    const curNames = new Set([...cur.matchAll(/name: '((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")))
    const newNames = new Set(policies.map((p) => p.name))
    const added = [...newNames].filter((x) => !curNames.has(x))
    const removed = [...curNames].filter((x) => !newNames.has(x))
    // só depois do array: o comentário da interface cita o template e
    // inflava a contagem em 1
    const dataPart = cur.split('export const AWS_POLICIES')[1] ?? ''
    const fakeDesc = (dataPart.match(/— AWS managed policy\./g) || []).length
    console.log(`\nHoje no site: ${curNames.size} policies`)
    console.log(`  descrições com o template inventado: ${fakeDesc}`)
    console.log(`  + ${added.length} novas   - ${removed.length} que sairiam`)
    for (const r of removed.slice(0, 15)) console.log(`      - ${r}`)
    if (removed.length > 15) console.log(`      … e mais ${removed.length - 15}`)
  } catch { /* primeira execução */ }

  if (DRY || !WRITE_TS) {
    console.log(DRY ? '\n--dry-run: nada escrito.'
      : '\nNada escrito. Para gravar, rode com --write-ts');
    return
  }

  // documentos oficiais + actions, fora do bundle
  fs.mkdirSync(DOCS_DIR, { recursive: true })
  const wanted = new Set()
  for (const p of policies) {
    const slug = slugify(p.name)
    wanted.add(`${slug}.json`)
    fs.writeFileSync(path.join(DOCS_DIR, `${slug}.json`), JSON.stringify({
      arn: p.arn, version: p.version, document: p.document,
      actions: p.actions, notActions: p.notActions,
    }))
  }
  let removedFiles = 0
  for (const f of fs.readdirSync(DOCS_DIR)) {
    if (f.endsWith('.json') && !wanted.has(f)) { fs.unlinkSync(path.join(DOCS_DIR, f)); removedFiles++ }
  }
  console.log(`\nEscrito: public/aws-policy-docs/ (${wanted.size} arquivos`
    + `${removedFiles ? `, ${removedFiles} órfão(s) removido(s)` : ''})`)

  const slugs = policies.map((p) => slugify(p.name))
  const index = {}
  policies.forEach((p, i) => { for (const a of p.actions) (index[a] ||= []).push(i) })
  fs.writeFileSync(IDX_OUT, JSON.stringify({ slugs, index }))
  console.log(`Escrito: public/aws-actions-index.json (${Object.keys(index).length} actions, `
    + `${(fs.statSync(IDX_OUT).size / 1024 / 1024).toFixed(1)} MB)`)

  fs.writeFileSync(TS_OUT, renderTs(policies))
  console.log(`Escrito: src/data/aws.ts (${policies.length} policies, `
    + `${(fs.statSync(TS_OUT).size / 1024).toFixed(0)} KB)`)
  console.log('\nAgora rode:  node scripts/typecheck.cjs')
})().catch((e) => {
  console.error('\nFALHOU:', e.message)
  process.exitCode = 1
})
