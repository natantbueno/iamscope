#!/usr/bin/env node
/**
 * fetch-aws-managed-policies.js
 *
 * Busca TODAS as AWS Managed Policies da documentação pública da AWS
 * (docs.aws.amazon.com/aws-managed-policy — sem autenticação, sem conta AWS).
 *
 * Gera: src/data/aws.ts
 *
 * COMO USAR:
 *   node scripts/fetch-aws-managed-policies.js
 *
 * Isso substitui completamente src/data/aws.ts. Faça backup ou rode em uma
 * branch separada se quiser comparar com a versão atual antes de commitar.
 *
 * NOTA: a AWS tem 1000+ managed policies. O script busca a página-índice uma
 * vez e depois uma página por política, com concorrência limitada e retry.
 * Isso pode levar alguns minutos — é normal.
 *
 * v2: reescrito para parsear o HTML real das páginas (não a variante .md,
 * que na v1 não bateu com o formato real recebido pelo Node — resultava em
 * 0 políticas encontradas). Se o parser ainda assim não encontrar nada, o
 * script salva o HTML bruto em scripts/debug-index.html para diagnóstico.
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'aws.ts')
const CACHE_FILE = path.join(__dirname, 'aws-policies-raw.json')
const DEBUG_INDEX_FILE = path.join(__dirname, 'debug-index.html')
const DEBUG_POLICY_FILE = path.join(__dirname, 'debug-policy-sample.html')

const INDEX_URL = 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html'
const POLICY_URL = (name) => `https://docs.aws.amazon.com/aws-managed-policy/latest/reference/${name}.html`

const CONCURRENCY = 6          // requisições simultâneas — não sobrecarregar docs.aws.amazon.com
const RETRY_COUNT = 3
const RETRY_DELAY_MS = 800
const REQUEST_TIMEOUT_MS = 15000

// Páginas conhecidas que não são políticas — não confundir com nomes reais
const NON_POLICY_PAGES = new Set([
  'policy-list', 'index', 'about-managed-policy-reference', 'reference-policies-managed',
  'aws-managed-policy-reference-guide', 'welcome', 'document-history',
])

// ── HTTP fetch com retry ──────────────────────────────────────────────────────

function fetchUrlOnce(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 node-script (entraid.permissions data generator)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrlOnce(res.headers.location).then(resolve)
      }
      if (res.statusCode !== 200) { resolve(null); return }
      let data = ''
      res.setEncoding('utf-8')
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(data))
    })
    req.on('error', () => resolve(null))
    req.setTimeout(REQUEST_TIMEOUT_MS, () => { req.destroy(); resolve(null) })
  })
}

async function fetchUrl(url) {
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    const result = await fetchUrlOnce(url)
    if (result) return result
    await sleep(RETRY_DELAY_MS * attempt)
  }
  return null
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

// ── Pool de concorrência simples ──────────────────────────────────────────────

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length)
  let nextIndex = 0
  let done = 0

  async function runOne() {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await worker(items[i], i)
      done++
      if (done % 25 === 0 || done === items.length) {
        process.stdout.write(`\r  ⬇  ${done}/${items.length} políticas processadas...`)
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => runOne())
  await Promise.all(workers)
  process.stdout.write('\n')
  return results
}

// ── Utilitários de texto (HTML → texto plano) ─────────────────────────────────

function decodeEntities(s) {
  return String(s || '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/** Extrai o primeiro objeto JSON balanceado a partir do índice de abertura `{`. */
function extractBalancedJson(text, startIdx) {
  let depth = 0
  let inString = false
  let escapeNext = false
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (escapeNext) { escapeNext = false; continue }
    if (ch === '\\') { escapeNext = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(startIdx, i + 1)
    }
  }
  return null
}

// ── Parser da página-índice (lista de nomes de políticas) ────────────────────

function parseIndex(html) {
  const names = new Set()

  // Estratégia 1: nomes aparecem como href para "{Name}.html" (funciona tanto
  // em HTML real: href="X.html", quanto em variantes markdown: (X.html)).
  const hrefRe = /(?:href="|\()\.?\/?([A-Za-z][A-Za-z0-9_.\-]*)\.html?["')]/g
  let m
  while ((m = hrefRe.exec(html)) !== null) {
    const name = m[1].trim()
    if (name.length > 2 && !NON_POLICY_PAGES.has(name.toLowerCase())) names.add(name)
  }

  // Estratégia 2 (fallback): se a estratégia 1 não achou nada, tenta capturar
  // qualquer token "PalavraJuntaSemEspaco.html" solto no texto (menos preciso,
  // mas serve de rede de segurança se o formato de link mudar).
  if (names.size === 0) {
    const looseRe = /([A-Za-z][A-Za-z0-9_.\-]{2,80})\.html/g
    while ((m = looseRe.exec(html)) !== null) {
      const name = m[1].trim()
      if (!NON_POLICY_PAGES.has(name.toLowerCase())) names.add(name)
    }
  }

  return Array.from(names)
}

// ── Parser da página individual de cada política ──────────────────────────────

function parsePolicyPage(html, name) {
  if (!html) return null

  // ARN — procura direto no HTML bruto (não depende de tags ao redor)
  const arnMatch = html.match(/arn:aws[a-z0-9-]*:iam::(?:aws|\d+):policy\/[^\s"'<)\\]+/)
  const arn = arnMatch ? arnMatch[0].trim() : `arn:aws:iam::aws:policy/${name}`

  const text = stripTags(html)

  // Descrição — texto logo após o rótulo "Description:"
  const descMatch = text.match(/Description:\s*([^.]+(?:\.[^.]+){0,2}\.)/) || text.match(/Description:\s*(.{0,400}?)(?:\s{2,}|Using this policy|Policy details)/)
  let description = descMatch ? descMatch[1].trim() : ''

  // JSON policy document — vive num bloco <code class="json"> em que o HTML da
  // AWS envolve chaves/colchetes em <span> (ex.: <span>{</span>). Por isso o
  // parse direto do HTML bruto falhava (v2 gerava statements: [] para todas as
  // 1526 políticas — corrigido em 2026-07): é preciso remover as tags DENTRO
  // do bloco de código antes do JSON.parse.
  let statements = []
  const codeBlocks = html.match(/<code[^>]*class="[^"]*json[^"]*"[^>]*>[\s\S]*?<\/code>/gi) || []
  for (const block of codeBlocks) {
    const inner = decodeEntities(block.replace(/<[^>]+>/g, ''))
    const braceStart = inner.indexOf('{')
    if (braceStart === -1) continue
    const candidate = extractBalancedJson(inner, braceStart)
    if (!candidate) continue
    try {
      const doc = JSON.parse(candidate)
      if (doc && doc.Statement) {
        statements = Array.isArray(doc.Statement) ? doc.Statement : [doc.Statement]
        break
      }
    } catch {
      // bloco não era o policy document — tenta o próximo
    }
  }
  // Fallback: método antigo (busca balanceada no HTML bruto), caso o formato mude
  if (statements.length === 0) {
    const stmtIdx = html.indexOf('"Statement"')
    if (stmtIdx !== -1) {
      let braceStart = html.lastIndexOf('{', stmtIdx)
      while (braceStart !== -1 && statements.length === 0) {
        const candidate = decodeEntities(extractBalancedJson(html, braceStart) || '')
        if (candidate) {
          try {
            const doc = JSON.parse(candidate.replace(/<[^>]+>/g, ''))
            if (doc && doc.Statement) {
              statements = Array.isArray(doc.Statement) ? doc.Statement : [doc.Statement]
              break
            }
          } catch { /* tenta um '{' anterior */ }
        }
        braceStart = html.lastIndexOf('{', braceStart - 1)
      }
    }
  }

  const isServiceLinked = /can'?t attach|cannot attach|service-linked role|not attach.*to your IAM/i.test(text)

  return {
    name,
    arn,
    description: description || `${name} — AWS managed policy.`,
    statements,
    isServiceLinked,
  }
}

// ── Classificação: categoria, tier, privilégio, tipo, escopo ─────────────────

const SERVICE_TO_CATEGORY = [
  [/^(iam|sts|organizations|account|signin|identitystore|sso)$/, 'IAM'],
  [/^(kms|guardduty|securityhub|macie2?|inspector2?|waf2?|wafv2|shield|acm|secretsmanager|access-analyzer|accessanalyzer|cloudtrail|config|detective|network-firewall|networkfirewall)$/, 'Security'],
  [/^(ec2|autoscaling|elasticloadbalancing|lightsail|imagebuilder|batch|ec2messages|ssmmessages)$/, 'Compute'],
  [/^(s3|s3-object-lambda|s3tables|glacier|storagegateway|backup|fsx|elasticfilesystem)$/, 'Storage'],
  [/^(rds|dynamodb|elasticache|redshift|docdb|neptune|memorydb|keyspaces|dax|qldb|timestream)$/, 'Database'],
  [/^(vpc|route53|route53domains|route53resolver|cloudfront|directconnect|globalaccelerator|networkmanager|ram|elasticloadbalancingv2)$/, 'Networking'],
  [/^(codebuild|codedeploy|codepipeline|codecommit|codeartifact|cloud9|cloudformation|ssm|systems-manager)$/, 'DevOps'],
  [/^(lambda|states|events|schemas|apprunner|scheduler)$/, 'Serverless'],
  [/^(ecs|eks|ecr)$/, 'Containers'],
  [/^(sagemaker|bedrock|rekognition|textract|comprehend|polly|translate|lex|personalize|forecast|codeguru-security)$/, 'AI'],
  [/^(athena|glue|elasticmapreduce|opensearch|quicksight|kinesis|firehose|lakeformation|datapipeline)$/, 'Analytics'],
  [/^(cloudwatch|logs|xray|health|trustedadvisor|servicecatalog|tag|resource-groups|controltower|identity-sync)$/, 'Management'],
  [/^(iot|greengrass|iotsitewise)$/, 'IoT'],
  [/^(aws-portal|billing|ce|budgets|freetier|payments|invoicing)$/, 'Billing'],
  [/^(sqs|sns|mq|chime|connect)$/, 'Messaging'],
]

function deriveCategoryFromStatements(statements) {
  const prefixes = new Set()
  for (const s of statements) {
    const actions = Array.isArray(s.Action) ? s.Action : [s.Action]
    for (const a of actions) {
      if (typeof a === 'string' && a.includes(':')) prefixes.add(a.split(':')[0].toLowerCase())
    }
  }
  for (const prefix of prefixes) {
    for (const [re, cat] of SERVICE_TO_CATEGORY) {
      if (re.test(prefix)) return cat
    }
  }
  return 'Management' // fallback seguro — sem categoria "General" no type AwsCategory
}

function deriveTier(name, statements) {
  if (/^AdministratorAccess/.test(name)) return 'FullAccess'
  if (/PowerUser/i.test(name)) return 'PowerUser'
  if (/ReadOnly|ViewOnly/i.test(name)) return 'ReadOnly'
  if (/FullAccess$/i.test(name)) return 'FullAccess'

  const allActions = statements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action])).filter(Boolean)
  const allAllow = statements.length > 0 && statements.every((s) => s.Effect === 'Allow')
  const hasWildcard = allActions.includes('*')
  if (hasWildcard && allAllow) return 'FullAccess'

  const onlyRead = allActions.length > 0 && allActions.every((a) =>
    /:(Get|List|Describe|View|Lookup)/i.test(a) || a.endsWith(':Get*') || a.endsWith(':List*') || a.endsWith(':Describe*')
  )
  if (onlyRead) return 'ReadOnly'

  const hasCreateOrUpdate = allActions.some((a) => /:(Create|Update|Put|Start|Stop|Enable|Disable)/i.test(a))
  const hasDelete = allActions.some((a) => /:(Delete|Terminate|Remove)/i.test(a))
  if (hasCreateOrUpdate && !hasDelete) return 'Operator'

  return 'Specialized'
}

function derivePrivileged(name, tier, statements) {
  if (tier === 'FullAccess') return true
  if (/Administrator|FullAccess|PowerUser/i.test(name)) return true
  const allActions = statements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action])).filter(Boolean)
  if (allActions.some((a) => /^iam:(Create|Attach|Put|Update).*Polic/i.test(a) || /^iam:PassRole$/i.test(a) || /^organizations:/i.test(a))) return true
  return false
}

function deriveType(name, isServiceLinked) {
  if (isServiceLinked) return 'service-role'
  if (/\(Permission Set\)/i.test(name)) return 'permission-set'
  if (/\(Permission Boundary\)/i.test(name)) return 'permission-boundary'
  return 'managed'
}

function deriveScope(statements) {
  const allActions = statements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action])).filter(Boolean)
  if (allActions.some((a) => /^(organizations|account):/i.test(a))) return 'account'
  const allResources = statements.flatMap((s) => (Array.isArray(s.Resource) ? s.Resource : [s.Resource])).filter(Boolean)
  if (allResources.length > 0 && allResources.every((r) => r !== '*')) return 'resource'
  return 'service'
}

function summarizePrivileges(statements, tier) {
  if (tier === 'FullAccess' && statements.some((s) => (Array.isArray(s.Action) ? s.Action : [s.Action]).includes('*'))) {
    return ['Acesso irrestrito a todos os serviços e recursos AWS']
  }
  const actions = statements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action])).filter(Boolean)
  const uniq = Array.from(new Set(actions))
  return uniq.slice(0, 8)
}

function toSlug(name, seen) {
  const base = name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  if (!seen[base]) { seen[base] = 1; return base }
  seen[base]++
  return `${base}-${seen[base]}`
}

function escapeStr(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ')
}

// ── Gerador do TypeScript final ───────────────────────────────────────────────

function generateTs(policies) {
  const lines = []
  lines.push(`// AWS IAM — Managed Policies, Service Roles & Permission Sets — AUTO-GENERATED`)
  lines.push(`// Source: docs.aws.amazon.com/aws-managed-policy (public, no auth required)`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// Total: ${policies.length} policies`)
  lines.push(``)
  lines.push(`export type AwsTier = 'FullAccess' | 'PowerUser' | 'ReadOnly' | 'Operator' | 'Specialized'`)
  lines.push(`export type AwsCategory =`)
  lines.push(`  | 'IAM' | 'Compute' | 'Storage' | 'Database' | 'Networking'`)
  lines.push(`  | 'Security' | 'DevOps' | 'Serverless' | 'Containers' | 'AI'`)
  lines.push(`  | 'Analytics' | 'Management' | 'IoT' | 'Billing' | 'Messaging'`)
  lines.push(``)
  lines.push(`export type AwsPolicyType = 'managed' | 'service-role' | 'permission-set' | 'permission-boundary'`)
  lines.push(``)
  lines.push(`export interface AwsPolicy {`)
  lines.push(`  slug: string`)
  lines.push(`  name: string`)
  lines.push(`  arn: string`)
  lines.push(`  description: string`)
  lines.push(`  tier: AwsTier`)
  lines.push(`  category: AwsCategory`)
  lines.push(`  isPrivileged: boolean`)
  lines.push(`  type: AwsPolicyType`)
  lines.push(`  scope: 'account' | 'resource' | 'service'`)
  lines.push(`  privileges: string[]`)
  lines.push(`  actions?: string[]`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`export interface AwsTierMeta {`)
  lines.push(`  label: string`)
  lines.push(`  color: string`)
  lines.push(`  bg: string`)
  lines.push(`  description: string`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`export const AWS_TIER_META: Record<AwsTier, AwsTierMeta> = {`)
  lines.push(`  FullAccess:  { label: 'Full Access',  color: '#dc2626', bg: '#dc262618', description: 'Unrestricted access to a service or the entire account — treat as privileged' },`)
  lines.push(`  PowerUser:   { label: 'Power User',   color: '#ea580c', bg: '#ea580c18', description: 'Broad service access without IAM management capabilities' },`)
  lines.push(`  ReadOnly:    { label: 'Read Only',    color: '#16a34a', bg: '#16a34a18', description: 'List and describe resources only — no write or delete actions' },`)
  lines.push(`  Operator:    { label: 'Operator',     color: '#0891b2', bg: '#0891b218', description: 'Operational tasks: start/stop, deploy, patch — limited create/delete' },`)
  lines.push(`  Specialized: { label: 'Specialized',  color: '#7c3aed', bg: '#7c3aed18', description: 'Narrow-purpose policies for specific use cases or service integrations' },`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`export const AWS_CATEGORIES: AwsCategory[] = [`)
  lines.push(`  'IAM','Compute','Storage','Database','Networking','Security','DevOps',`)
  lines.push(`  'Serverless','Containers','AI','Analytics','Management','IoT','Billing','Messaging',`)
  lines.push(`]`)
  lines.push(``)
  lines.push(`export const AWS_POLICIES: AwsPolicy[] = [`)

  for (const p of policies) {
    lines.push(`  {`)
    lines.push(`    slug: '${p.slug}',`)
    lines.push(`    name: '${escapeStr(p.name)}',`)
    lines.push(`    arn: '${escapeStr(p.arn)}',`)
    lines.push(`    description: '${escapeStr(p.description)}',`)
    lines.push(`    tier: '${p.tier}', category: '${p.category}', isPrivileged: ${p.isPrivileged}, type: '${p.type}', scope: '${p.scope}',`)
    lines.push(`    privileges: ${JSON.stringify(p.privileges)},`)
    if (p.actions && p.actions.length > 0 && p.actions.length <= 200) {
      lines.push(`    actions: ${JSON.stringify(p.actions)},`)
    }
    lines.push(`  },`)
  }

  lines.push(`]`)
  lines.push(``)
  return lines.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // --from-cache: pula o fetch e regenera src/data/aws.ts a partir de
  // scripts/aws-policies-raw.json (útil quando os statements foram populados
  // por outra fonte, ou para re-gerar sem rebuscar 1500+ páginas).
  if (process.argv.includes('--from-cache')) {
    if (!fs.existsSync(CACHE_FILE)) {
      console.error(`❌ --from-cache: ${CACHE_FILE} não existe. Rode sem a flag primeiro.`)
      process.exit(1)
    }
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
    console.log(`📦 --from-cache: ${cached.length} políticas lidas de aws-policies-raw.json`)
    const withStmts = cached.filter((p) => p.statements && p.statements.length > 0)
    console.log(`   ${withStmts.length} com statements`)
    generateAndWrite(cached)
    return
  }

  console.log('🔍 Buscando AWS Managed Policies em docs.aws.amazon.com...\n')

  console.log('  ⬇  Página-índice (policy-list.html)...')
  const indexHtml = await fetchUrl(INDEX_URL)
  if (!indexHtml) {
    console.error('\n❌ Não foi possível buscar a página-índice. Verifique sua conexão com a internet.')
    process.exit(1)
  }

  const names = parseIndex(indexHtml)
  console.log(`  ✅ ${names.length} políticas encontradas no índice\n`)

  if (names.length === 0) {
    fs.writeFileSync(DEBUG_INDEX_FILE, indexHtml, 'utf-8')
    console.error('❌ Nenhum nome de política extraído do índice.')
    console.error(`   O HTML bruto foi salvo em scripts/debug-index.html — abra esse arquivo,`)
    console.error(`   procure por um link de exemplo (ex.: um href apontando para uma política`)
    console.error(`   como "AdministratorAccess") e ajuste a regex em parseIndex() para bater`)
    console.error(`   com o formato real encontrado.`)
    process.exit(1)
  }

  console.log('📥 Buscando detalhes de cada política (isso pode levar alguns minutos)...')
  let debugSampleSaved = false
  const rawResults = await runPool(names, async (name) => {
    const htmlPage = await fetchUrl(POLICY_URL(name))
    if (htmlPage && !debugSampleSaved) {
      fs.writeFileSync(DEBUG_POLICY_FILE, htmlPage, 'utf-8')
      debugSampleSaved = true
    }
    return parsePolicyPage(htmlPage, name)
  }, CONCURRENCY)

  const valid = rawResults.filter(Boolean)
  const withStatements = valid.filter((p) => p.statements.length > 0)
  console.log(`\n✅ ${valid.length}/${names.length} páginas de política obtidas com sucesso`)
  console.log(`   ${withStatements.length}/${valid.length} com JSON de permissões extraído corretamente`)
  if (withStatements.length < valid.length * 0.5) {
    console.log(`   ⚠️  Menos da metade teve o JSON extraído — confira scripts/debug-policy-sample.html`)
    console.log(`      e ajuste a extração de "Statement" em parsePolicyPage() se necessário.`)
  }

  // Salva cache bruto — útil para depuração ou para re-gerar o .ts sem rebuscar tudo
  fs.writeFileSync(CACHE_FILE, JSON.stringify(valid, null, 2), 'utf-8')
  console.log(`💾 Cache bruto salvo em scripts/aws-policies-raw.json`)

  generateAndWrite(valid)
}

// ── Classificação, dedupe e geração do .ts (compartilhado com --from-cache) ──
function generateAndWrite(valid) {
  const seenNames = new Set()
  const seenSlugs = {}
  const policies = []

  for (const raw of valid) {
    if (seenNames.has(raw.name)) continue // nunca inserir o mesmo nome de política duas vezes
    seenNames.add(raw.name)

    const category = deriveCategoryFromStatements(raw.statements)
    const tier = deriveTier(raw.name, raw.statements)
    const isPrivileged = derivePrivileged(raw.name, tier, raw.statements)
    const type = deriveType(raw.name, raw.isServiceLinked)
    const scope = deriveScope(raw.statements)
    const privileges = summarizePrivileges(raw.statements, tier)
    const actions = Array.from(new Set(
      raw.statements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action])).filter(Boolean)
    ))
    const slug = toSlug(raw.name, seenSlugs)

    policies.push({
      slug, name: raw.name, arn: raw.arn, description: raw.description,
      tier, category, isPrivileged, type, scope, privileges, actions,
    })
  }

  policies.sort((a, b) => a.name.localeCompare(b.name))

  const ts = generateTs(policies)
  fs.writeFileSync(OUTPUT_FILE, ts, 'utf-8')

  // ── Resumo ───────────────────────────────────────────────────────────────
  const byTier = {}
  const byCategory = {}
  for (const p of policies) {
    byTier[p.tier] = (byTier[p.tier] || 0) + 1
    byCategory[p.category] = (byCategory[p.category] || 0) + 1
  }

  console.log(`\n✅ Arquivo gerado: src/data/aws.ts`)
  console.log(`   Total: ${policies.length} políticas únicas (${valid.length - policies.length} duplicatas descartadas)\n`)
  console.log('Por Tier:')
  for (const [t, c] of Object.entries(byTier).sort((a, b) => b[1] - a[1])) console.log(`  ${t.padEnd(20)} ${c}`)
  console.log('\nPor Categoria:')
  for (const [c, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) console.log(`  ${c.padEnd(20)} ${n}`)
  console.log('\n⚠️  Revise o resultado antes de commitar: heurísticas de categoria/tier são aproximações.')
  console.log('🚀 Depois, rode: npm run build\n')
}

main().catch((err) => {
  console.error('\n❌ Erro inesperado:', err)
  process.exit(1)
})
