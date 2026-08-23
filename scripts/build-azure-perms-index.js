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
 *     index:  { 'Microsoft.X/y/read': [0, 3, 17] },  // posições em `slugs`
 *     denied: { 'Microsoft.Authorization/*\/Write': [12] }
 *   }
 *
 * O QUE `denied` RESOLVE
 *   Os arquivos de public/azure-perms/ misturam `Actions` com `NotActions` —
 *   e `NotActions` é o oposto de uma concessão: é a action que a role
 *   explicitamente NÃO pode executar. Até 20/08/2026 as duas entravam no mesmo
 *   `index`, então a Contributor aparecia "concedendo"
 *   `Microsoft.Authorization/*\/Delete`, que é justamente o que ela não faz.
 *
 *   Medido: 52 das 504 roles têm NotActions, 180 actions negativas distintas,
 *   144 delas existindo no índice SÓ como negativa, 235 pares fantasma.
 *
 *   `index` continua com o conjunto completo, de propósito: é dele que saem as
 *   ~2.700 páginas de /azure-rbac/permissions/[slug] e as URLs do sitemap, e
 *   tirar 144 actions de lá apagaria 144 páginas que já estão no ar. Quem
 *   precisa da relação correta subtrai `denied[action]` de `index[action]`.
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
const negative = Object.create(null)  // action -> Set de posições vindas de NotActions
const positive = Object.create(null)  // action -> Set de posições vindas de Actions
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
    if (!action) continue
    // `type` é 'Actions' | 'NotActions' | 'DataActions' | 'NotDataActions'.
    const isNegative = p.type === 'NotActions' || p.type === 'NotDataActions'
    const bucket = isNegative ? negative : positive
    ;(bucket[action] || (bucket[action] = new Set())).add(i)

    if (seen.has(action)) continue
    seen.add(action)
    ;(index[action] || (index[action] = [])).push(i)
    pairs++
  }
})

// Só entra em `denied` o par que é EXCLUSIVAMENTE negativo. Uma role que
// listasse a mesma action nos dois lados continuaria contando como concessão —
// subtrair nesse caso seria inventar uma exclusão que o dado não afirma.
const denied = Object.create(null)
let deniedPairs = 0
for (const action of Object.keys(negative)) {
  const pos = positive[action]
  const only = [...negative[action]].filter((i) => !pos || !pos.has(i))
  if (only.length) { denied[action] = only; deniedPairs += only.length }
}

fs.writeFileSync(OUT_FILE, JSON.stringify({ slugs, index, denied }))

const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(1)
console.log(`roles indexadas      : ${slugs.length - missing}/${slugs.length}`)
console.log(`permissões distintas : ${Object.keys(index).length}`)
console.log(`pares (perm, role)   : ${pairs}`)
console.log(`  destes, NEGATIVOS  : ${deniedPairs} (NotActions/NotDataActions, em ${Object.keys(denied).length} actions)`)
console.log(`saída                : public/azure-perms-index.json (${kb} KB)`)
if (missing > 0) console.log(`ATENÇÃO: ${missing} role(s) sem arquivo de permissões.`)
