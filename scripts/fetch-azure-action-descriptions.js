#!/usr/bin/env node
/**
 * Coleta as descrições OFICIAIS de todas as actions do Azure e preenche
 * public/azure-action-descriptions.json.
 *
 * Fonte: learn.microsoft.com/en-us/azure/role-based-access-control/resource-provider-operations
 *   Essa página é um índice que aponta para uma subpágina por categoria em
 *   `permissions/<categoria>.md`. Cada subpágina lista, por resource provider,
 *   uma tabela `| \`action\` | descrição |` com a descrição oficial da Microsoft.
 *
 *   O conteúdo é lido do repositório público MicrosoftDocs/azure-docs (raw no
 *   GitHub) em vez do site renderizado: é o mesmo texto, sem HTML no meio,
 *   versionado e sem exigir credencial.
 *
 * Substitui o processo manual que alimentava o merge lote a lote — aquele
 * dependia de colar tabelas à mão e estava em 0,3% de cobertura.
 *
 * Uso:
 *   node scripts/fetch-azure-action-descriptions.js             # coleta e grava
 *   node scripts/fetch-azure-action-descriptions.js --dry-run   # só o relatório
 *
 * Node 18+ (fetch nativo), sem dependências.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'azure-action-descriptions.json')
const INDEX = path.join(ROOT, 'public', 'azure-perms-index.json')
const DRY = process.argv.includes('--dry-run')

const RAW = 'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/role-based-access-control'
const INDEX_MD = `${RAW}/resource-provider-operations.md`

/**
 * Descobre as subpáginas a partir do índice oficial, em vez de manter uma lista
 * fixa aqui — assim, se a Microsoft criar uma categoria nova, ela entra sozinha.
 * A lista abaixo é só o fallback caso o índice mude de formato.
 */
const FALLBACK_PAGES = [
  'general', 'compute', 'networking', 'storage', 'web-and-mobile', 'containers',
  'databases', 'analytics', 'ai-machine-learning', 'internet-of-things',
  'integration', 'identity', 'security', 'devops', 'migration', 'monitor',
  'management-and-governance', 'hybrid-multicloud',
]

async function discoverPages() {
  try {
    const res = await fetch(INDEX_MD)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const md = await res.text()
    // links do tipo ./permissions/compute.md#microsoftcompute
    const pages = new Set()
    const rx = /\.\/permissions\/([a-z0-9-]+)\.md#/g
    let m
    while ((m = rx.exec(md)) !== null) pages.add(m[1])
    if (pages.size >= 5) {
      console.log(`Índice oficial: ${pages.size} categorias descobertas.`)
      return [...pages].sort()
    }
    console.warn('Índice retornou poucas categorias — usando a lista de fallback.')
  } catch (e) {
    console.warn(`Não foi possível ler o índice (${e.message}) — usando a lista de fallback.`)
  }
  return FALLBACK_PAGES
}

/**
 * Extrai pares (action, descrição) das tabelas markdown.
 * Formato: | `Microsoft.Foo/bar/read` | Descrição oficial. |
 * Algumas linhas vêm prefixadas com "> " (bloco mx-tableFixed do Learn).
 */
function parseRows(md) {
  const out = []
  const rx = /^>?\s*\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/gm
  let m
  while ((m = rx.exec(md)) !== null) {
    const action = m[1].trim()
    const desc = m[2].trim()
    // ignora cabeçalho/separador e linhas sem descrição
    if (!action || action === 'Action' || /^-+$/.test(action)) continue
    out.push([action, desc])
  }
  return out
}

;(async () => {
  const pages = await discoverPages()
  const store = (() => {
    try { return JSON.parse(fs.readFileSync(OUT, 'utf8')) } catch { return {} }
  })()
  const before = Object.keys(store).length

  let added = 0, updated = 0, empty = 0
  const failed = []

  for (const page of pages) {
    const url = `${RAW}/permissions/${page}.md`
    try {
      const res = await fetch(url)
      if (!res.ok) { failed.push(`${page} (HTTP ${res.status})`); continue }
      const md = await res.text()
      const rows = parseRows(md)
      let a = 0, u = 0
      for (const [action, desc] of rows) {
        if (!desc) { empty++; continue }
        if (!store[action]) { store[action] = desc; a++; added++ }
        else if (store[action] !== desc) { store[action] = desc; u++; updated++ }
      }
      console.log(`  ${page.padEnd(30)} ${String(rows.length).padStart(5)} linhas · +${a} novas · ~${u} atualizadas`)
    } catch (e) {
      failed.push(`${page} (${e.message})`)
    }
  }

  if (failed.length) console.log('\nFalharam:', failed.join(', '))

  const total = Object.keys(store).length
  console.log(`\nStore: ${before} -> ${total} (+${added} novas, ${updated} atualizadas, ${empty} sem descrição)`)

  // ── Cobertura ─────────────────────────────────────────────────────────────
  //
  // Duas correções em relação à primeira versão deste relatório, que reportava
  // 60,4% e escondia o quadro real:
  //
  // 1. WILDCARDS NÃO CONTAM. `Microsoft.Foo/*` é padrão de correspondência, não
  //    operação — nunca aparece nas tabelas da Microsoft. São 750 das 2.697
  //    actions; incluí-las no denominador cria uma lacuna impossível de fechar.
  //
  // 2. COMPARAÇÃO TOLERANTE A CAIXA. Os identificadores são case-insensitive no
  //    ARM e a documentação diverge das definições de role
  //    (`Microsoft.Insights/Logs/Read` vs `Microsoft.insights/logs/read`).
  //    Comparando exato, 225 actions com descrição apareciam como faltantes.
  //    O site faz a mesma normalização — ver src/lib/azureActionDocs.ts.
  try {
    const idx = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
    const used = Object.keys(idx.index)

    const porCaixa = new Map()
    for (const k of Object.keys(store)) porCaixa.set(k.toLowerCase(), true)
    const temDesc = (a) => !!store[a] || porCaixa.has(a.toLowerCase())

    const wildcards = used.filter((a) => a.includes('*'))
    const concretas = used.filter((a) => !a.includes('*'))
    const have = concretas.filter(temDesc)
    const pct = (have.length / concretas.length * 100).toFixed(1)

    console.log(`\nActions no catálogo do site: ${used.length}`)
    console.log(`  wildcards (sem descrição possível): ${wildcards.length}`)
    console.log(`  concretas                         : ${concretas.length}`)
    console.log(`Cobertura sobre as concretas: ${have.length}/${concretas.length} (${pct}%)`)

    const exato = concretas.filter((a) => !!store[a]).length
    if (exato < have.length) {
      console.log(`  (${have.length - exato} só casam ignorando maiúsculas)`)
    }

    const missing = concretas.filter((a) => !temDesc(a))
    if (missing.length) {
      const byProvider = {}
      for (const a of missing) {
        const p = a.split('/')[0]
        byProvider[p] = (byProvider[p] || 0) + 1
      }
      const top = Object.entries(byProvider).sort((x, y) => y[1] - x[1]).slice(0, 12)
      console.log(`\n${missing.length} action(s) concreta(s) ainda sem descrição, por provider:`)
      for (const [p, n] of top) console.log(`  ${String(n).padStart(5)}  ${p}`)
      console.log('\nO resto é provider fora das tabelas de permissões da Microsoft')
      console.log('(clássicos, preview e alguns serviços de dados).')
    }
  } catch { /* índice ausente, ignora */ }

  if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

  const sorted = {}
  for (const k of Object.keys(store).sort()) sorted[k] = store[k]
  fs.writeFileSync(OUT, JSON.stringify(sorted))
  console.log(`\nEscrito: public/azure-action-descriptions.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
})().catch((e) => {
  console.error('\nFALHOU:', e.message)
  process.exitCode = 1
})
