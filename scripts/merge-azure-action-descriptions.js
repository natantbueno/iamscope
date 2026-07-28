#!/usr/bin/env node
/**
 * Acumula as descrições OFICIAIS de cada action do Azure em
 * public/azure-action-descriptions.json.
 *
 * Fonte: learn.microsoft.com/en-us/azure/role-based-access-control/permissions/*
 * Essas páginas listam cada action UMA vez por resource provider, com a
 * descrição oficial da Microsoft — diferente das páginas de built-in-roles,
 * onde a mesma action se repete em dezenas de roles.
 *
 * O conteúdo é coletado em lotes (uma página de categoria por vez) e passado
 * para este script em stdin, no formato markdown original:
 *
 *   | `Microsoft.Foo/bar/read` | Descrição oficial. |
 *
 * Uso:
 *   node scripts/merge-azure-action-descriptions.js < lote.md
 *   node scripts/merge-azure-action-descriptions.js --stats
 *
 * O merge é idempotente e nunca sobrescreve com string vazia.
 */
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'public', 'azure-action-descriptions.json')
const INDEX = path.join(__dirname, '..', 'public', 'azure-perms-index.json')

function load(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

const store = load(OUT, {})

if (process.argv.includes('--stats')) {
  const idx = load(INDEX, { index: {} })
  const used = Object.keys(idx.index)
  const have = used.filter((a) => store[a])
  console.log(`actions descritas no store : ${Object.keys(store).length}`)
  console.log(`actions usadas pelas roles : ${used.length}`)
  console.log(`cobertura                  : ${have.length} (${(have.length / used.length * 100).toFixed(1)}%)`)
  const missing = used.filter((a) => !store[a])
  console.log(`faltando                   : ${missing.length}`)
  // agrupa o que falta por resource provider, para priorizar o próximo lote
  const byProvider = {}
  for (const a of missing) {
    const p = a.split('/')[0]
    byProvider[p] = (byProvider[p] || 0) + 1
  }
  const top = Object.entries(byProvider).sort((a, b) => b[1] - a[1]).slice(0, 25)
  console.log('\nprovedores com mais actions sem descrição:')
  for (const [p, n] of top) console.log(`  ${String(n).padStart(5)}  ${p}`)
  process.exit(0)
}

const input = fs.readFileSync(0, 'utf8')

// | `Microsoft.Foo/bar/read` | Descrição. |
const ROW = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/gm
let m
let added = 0
let updated = 0
let skipped = 0

while ((m = ROW.exec(input)) !== null) {
  const action = m[1].trim()
  const desc = m[2].trim()
  if (!action || !desc) { skipped++; continue }
  if (!store[action]) { store[action] = desc; added++ }
  else if (store[action] !== desc) { store[action] = desc; updated++ }
}

// ordena as chaves para o diff do git ficar estável
const sorted = {}
for (const k of Object.keys(store).sort()) sorted[k] = store[k]
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 0))

console.log(`novas: ${added} | atualizadas: ${updated} | linhas sem descrição: ${skipped}`)
console.log(`total no store: ${Object.keys(sorted).length}`)
