#!/usr/bin/env node
/**
 * Pega símbolo do projeto USADO mas NÃO IMPORTADO.
 *
 * POR QUE EXISTE
 *   Em 03/08 o build quebrou com "Cannot find name 'lookupActionDoc'": um
 *   helper novo foi usado em src/lib/azurePermissions.ts sem o import. O
 *   check-syntax.cjs não pegou — para o parser o arquivo é válido, o nome só
 *   não existe. E o `tsc --noEmit`, que pegaria, leva minutos por causa dos
 *   2,5 MB de datasets em src/data, então não serve de verificação rápida.
 *
 *   Este script fecha essa lacuna em segundos: só olha símbolos que ALGUM
 *   módulo do projeto exporta. Se um nome desses aparece num arquivo que não o
 *   importa nem o declara, é erro de import — não ambiguidade.
 *
 * O QUE ELE NÃO FAZ
 *   Não é type-checker. Não valida tipo, assinatura nem import de biblioteca
 *   externa. Para isso continua valendo o `npm run build`.
 *
 * Uso: node scripts/check-imports.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')

const arquivos = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.tsx?$/.test(e.name)) arquivos.push(p)
  }
})(SRC)

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')

/** Remove comentários e strings — evita casar nome citado em prosa. */
function limpar(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
}

// ── 1. Todo símbolo exportado pelo projeto ──────────────────────────────────
const exportadoPor = new Map() // nome -> [arquivos]
for (const abs of arquivos) {
  const s = limpar(fs.readFileSync(abs, 'utf8'))
  const nomes = new Set()
  const re = /export\s+(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g
  let m
  while ((m = re.exec(s)) !== null) nomes.add(m[1])
  // export { a, b as c }
  const re2 = /export\s*\{([^}]*)\}/g
  while ((m = re2.exec(s)) !== null) {
    for (const parte of m[1].split(',')) {
      const t = parte.trim()
      if (!t) continue
      const alias = /\bas\s+([A-Za-z_$][\w$]*)/.exec(t)
      nomes.add(alias ? alias[1] : t.replace(/^type\s+/, '').trim())
    }
  }
  for (const n of nomes) {
    if (!exportadoPor.has(n)) exportadoPor.set(n, [])
    exportadoPor.get(n).push(rel(abs))
  }
}

// ── 2. Por arquivo: o que ele importa ou declara ────────────────────────────
/**
 * @param s    fonte já limpa de comentários e strings (para achar declarações)
 * @param cru  fonte ORIGINAL (para achar imports)
 *
 * A separação não é capricho: limpar() troca 'modulo' por '', e um regex de
 * import que exige caminho não-vazio deixa de casar. Foi assim que a primeira
 * versão deste script produziu 226 falsos positivos.
 */
function nomesDisponiveis(s, cru) {
  const dispo = new Set()

  // imports: default, namespace e nomeados — lidos da fonte crua
  const reImp = /import\s+([\s\S]*?)\s+from\s+['"][^'"]*['"]/g
  let m
  while ((m = reImp.exec(cru)) !== null) {
    const clausula = m[1]
    const chaves = /\{([^}]*)\}/.exec(clausula)
    if (chaves) {
      for (const parte of chaves[1].split(',')) {
        const t = parte.trim()
        if (!t) continue
        const alias = /\bas\s+([A-Za-z_$][\w$]*)/.exec(t)
        dispo.add(alias ? alias[1] : t.replace(/^type\s+/, '').trim())
      }
    }
    const antesDaChave = clausula.split('{')[0]
    for (const t of antesDaChave.split(',')) {
      const nome = t.replace(/\*\s+as\s+/, '').replace(/^type\s+/, '').trim()
      if (/^[A-Za-z_$][\w$]*$/.test(nome)) dispo.add(nome)
    }
  }

  // declarações locais (inclui as exportadas pelo próprio arquivo)
  const reDecl = /(?:^|\s)(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g
  while ((m = reDecl.exec(s)) !== null) dispo.add(m[1])

  // desestruturação: const { a, b } = ... / ([{ a }]) em params
  const reDes = /\{([^{}]*)\}\s*(?:=|:)/g
  while ((m = reDes.exec(s)) !== null) {
    for (const parte of m[1].split(',')) {
      const nome = parte.split(':').pop().split('=')[0].trim()
      if (/^[A-Za-z_$][\w$]*$/.test(nome)) dispo.add(nome)
    }
  }

  // parâmetros simples de função/arrow
  const rePar = /\(([^()]*)\)\s*(?::[^=>{]+)?=>/g
  while ((m = rePar.exec(s)) !== null) {
    for (const parte of m[1].split(',')) {
      const nome = parte.split(':')[0].replace(/\.\.\./, '').trim()
      if (/^[A-Za-z_$][\w$]*$/.test(nome)) dispo.add(nome)
    }
  }

  return dispo
}

// ── 3. Cruza ────────────────────────────────────────────────────────────────
const problemas = []
for (const abs of arquivos) {
  const bruto = fs.readFileSync(abs, 'utf8')
  const s = limpar(bruto)
  const dispo = nomesDisponiveis(s, bruto)
  const meu = rel(abs)

  // Usos: chamada `nome(` e JSX `<Nome`
  const usados = new Map() // nome -> linha
  const marcar = (nome, index) => {
    if (!usados.has(nome)) usados.set(nome, s.slice(0, index).split('\n').length)
  }
  let m
  const reCall = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g
  while ((m = reCall.exec(s)) !== null) marcar(m[1], m.index)
  const reJsx = /<([A-Z][\w$]*)[\s/>]/g
  while ((m = reJsx.exec(s)) !== null) marcar(m[1], m.index)

  for (const [nome, linha] of usados) {
    if (dispo.has(nome)) continue
    const origem = exportadoPor.get(nome)
    if (!origem) continue                       // não é símbolo do projeto
    if (origem.includes(meu)) continue          // exportado pelo próprio arquivo
    problemas.push({ arquivo: meu, nome, linha, origem: origem.slice(0, 2) })
  }
}

if (problemas.length === 0) {
  console.log(`OK — ${arquivos.length} arquivo(s) sem símbolo do projeto usado sem import.`)
  return
}

console.error(`\n${problemas.length} símbolo(s) usado(s) sem import:\n`)
for (const p of problemas) {
  console.error(`  ${p.arquivo}:${p.linha}`)
  console.error(`    ${p.nome}  —  exportado por ${p.origem.join(', ')}`)
}
process.exitCode = 1
