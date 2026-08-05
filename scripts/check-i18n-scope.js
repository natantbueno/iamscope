#!/usr/bin/env node
/**
 * Verifica se todo uso de t('chave') está no MESMO escopo de função que
 * declara `const t = useT()`.
 *
 * POR QUE PRECISA DE UM CHECADOR PRÓPRIO
 *   `const t = useT()` no lugar errado é sintaxe válida — o sucrase aprova e o
 *   check-syntax passa. O erro só aparece no `next build`, como
 *   "Cannot find name 't'". Aconteceu em azure-rbac/roles/page.tsx: o script de
 *   i18n inseriu o hook no primeiro componente com JSX do arquivo, que era um
 *   helper (RszTh), enquanto o t() usado ficava no componente principal.
 *
 * COMO FUNCIONA
 *   Acha a declaração do hook, delimita a função que a contém por contagem de
 *   chaves, e confere se todas as chamadas t('...') caem dentro desse intervalo.
 *
 * Uso: node scripts/check-i18n-scope.js
 * Sai com código 1 se houver uso fora de escopo.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (e.name.endsWith('.tsx')) acc.push(p)
  }
  return acc
}

/** Início da função que contém `pos`: volta até achar `{` de abertura sem par. */
function inicioFuncao(src, pos) {
  let nivel = 0
  for (let i = pos; i >= 0; i--) {
    const c = src[i]
    if (c === '}') nivel++
    else if (c === '{') {
      if (nivel === 0) return i
      nivel--
    }
  }
  return 0
}

/** Fim do bloco que começa em `abre`. */
function fimBloco(src, abre) {
  let nivel = 0
  for (let i = abre; i < src.length; i++) {
    const c = src[i]
    if (c === '{') nivel++
    else if (c === '}') { nivel--; if (nivel === 0) return i }
  }
  return src.length
}

const problemas = []
let verificados = 0

for (const abs of [...walk(path.join(ROOT, 'src', 'app')), ...walk(path.join(ROOT, 'src', 'components'))]) {
  const src = fs.readFileSync(abs, 'utf8')
  // Um arquivo pode ter VÁRIAS declarações — o componente principal e
  // subcomponentes definidos abaixo (RoleDefinitionJson, AwsPolicyDocumentJson…).
  // Cada uso precisa cair no escopo de ALGUMA delas.
  const decls = []
  const reDecl = /const t = useT\(\)|const \{[^}]*\bt\b[^}]*\} = useLanguage\(\)/g
  let d
  while ((d = reDecl.exec(src)) !== null) decls.push(d.index)

  const usos = [...src.matchAll(/\bt\(\s*'[a-z]+\.[A-Za-z]+'\s*\)/g)]
  if (usos.length === 0) continue
  verificados++

  const rel = path.relative(ROOT, abs).replace(/\\/g, '/')

  if (decls.length === 0) {
    problemas.push({ rel, msg: `${usos.length} uso(s) de t() sem declaração do hook no arquivo` })
    continue
  }

  const escopos = decls.map((pos) => {
    const abre = inicioFuncao(src, pos)
    return [abre, fimBloco(src, abre)]
  })

  const fora = usos.filter((m) => !escopos.some(([a, b]) => m.index >= a && m.index <= b))
  if (fora.length) {
    const linhas = fora.map((m) => src.slice(0, m.index).split('\n').length)
    problemas.push({ rel, msg: `${fora.length} uso(s) fora do escopo do hook — linha(s) ${linhas.join(', ')}` })
  }
}

if (problemas.length === 0) {
  console.log(`OK — ${verificados} arquivo(s) com t() no escopo correto.`)
} else {
  for (const p of problemas) console.error(`  ${p.rel}\n      ${p.msg}`)
  console.error(`\n${problemas.length} arquivo(s) com problema de escopo.`)
  process.exitCode = 1
}
