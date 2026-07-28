#!/usr/bin/env node
/**
 * Gera public/azure-perms-index.json — índice invertido de permissão -> roles.
 *
 * Por que um índice: as permissões de cada role vivem em um arquivo separado
 * (public/azure-perms/{slug}.json, 926 arquivos). Buscar "quais roles têm a
 * permissão X" exigiria baixar todos eles no cliente. Este índice inverte a
 * relação uma única vez, em build time, num arquivo só (~364 KB, ~50 KB gzip)
 * que a página de roles carrega sob demanda, apenas quando o usuário de fato
 * usa a busca por permissão.
 *
 * Formato:
 *   {
 *     slugs:  ['acrpull', 'acrpush', ...],           // índice posicional
 *     index:  { 'Microsoft.X/y/read': [0, 3, 17] }   // posições em `slugs`
 *   }
 *
 * Uso: node scripts/build-azure-perms-index.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const PERMS_DIR = path.join(ROOT, 'public', 'azure-perms')
const DATA_FILE = path.join(ROOT, 'src', 'data', 'azureRbac.ts')
const OUT_FILE = path.join(ROOT, 'public', 'azure-perms-index.json')

// Ordem dos slugs = ordem em que aparecem no dataset, para o índice posicional
// bater com o que a UI já usa.
const src = fs.readFileSync(DATA_FILE, 'utf8')
const slugs = []
const re = /^  \{ name: '(?:[^'\\]|\\.)*', slug: '([^']*)'/gm
let m
while ((m = re.exec(src)) !== null) slugs.push(m[1])

if (slugs.length === 0) {
  console.error('Nenhuma role encontrada em azureRbac.ts — abortando.')
  process.exit(1)
}

const index = Object.create(null)
let pairs = 0
let missing = 0

slugs.forEach((slug, i) => {
  const file = path.join(PERMS_DIR, `${slug}.json`)
  if (!fs.existsSync(file)) {
    missing++
    console.warn(`  aviso: sem arquivo de permissões para "${slug}"`)
    return
  }
  let perms
  try {
    perms = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    console.warn(`  aviso: JSON inválido em ${slug}.json — ${err.message}`)
    return
  }
  const seen = new Set()
  for (const p of perms) {
    const action = p && p.action
    if (!action || seen.has(action)) continue
    seen.add(action)
    ;(index[action] || (index[action] = [])).push(i)
    pairs++
  }
})

fs.writeFileSync(OUT_FILE, JSON.stringify({ slugs, index }))

const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(1)
console.log(`roles indexadas      : ${slugs.length - missing}/${slugs.length}`)
console.log(`permissões distintas : ${Object.keys(index).length}`)
console.log(`pares (perm, role)   : ${pairs}`)
console.log(`saída                : public/azure-perms-index.json (${kb} KB)`)
if (missing > 0) console.log(`ATENÇÃO: ${missing} role(s) sem arquivo de permissões.`)
