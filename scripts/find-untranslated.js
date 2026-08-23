#!/usr/bin/env node
/**
 * Encontra texto de interface ainda fixo em português no código.
 *
 * POR QUE EXISTE
 *   A tradução da UI passa por ~40 arquivos. Sem um inventário, não há como
 *   saber o que já foi feito, o que falta, nem detectar regressão quando
 *   alguém adiciona uma tela nova com string solta.
 *
 * COMO DECIDE O QUE É TEXTO DE UI
 *   Procura literais com acento ou palavra portuguesa comum em três posições:
 *     - texto entre tags JSX            >Buscar<
 *     - props de texto                  placeholder="Buscar..." title="..."
 *     - strings soltas em .tsx          label: 'Privilegiadas'
 *
 *   NÃO acusa: comentários, imports, nomes de classe CSS, chaves de dicionário,
 *   e o próprio src/i18n/.
 *
 * Uso:
 *   node scripts/find-untranslated.js            # resumo por arquivo
 *   node scripts/find-untranslated.js --list     # cada ocorrência
 *   node scripts/find-untranslated.js --file X   # só um arquivo
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const LIST = process.argv.includes('--list')
const fileArg = process.argv.find((a) => a.startsWith('--file='))
const ONLY = fileArg ? fileArg.slice('--file='.length) : null

// Pastas que não são interface
const SKIP_DIRS = new Set(['i18n', 'data'])

const ACENTO = /[áàâãéêíóôõúüç]/i
const PALAVRAS_PT = /\b(de|da|do|para|com|sem|por|não|todos|todas|nenhum|nenhuma|buscar|filtrar|limpar|voltar|exportar|copiar|baixar|mostrar|carregando|selecione|clique|veja|ver|acesso|permiss|função|funções|regra|regras|risco|nível|conta|usuário|senha|escopo|origem|detalhes|resumo|sobre)\b/i

function pareceUI(s) {
  const t = s.trim()
  if (t.length < 3) return false
  if (/^[a-z0-9_.:/@#-]+$/i.test(t)) return false        // slug, classe, id
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return false           // cor
  if (/^[\d\s.,%-]+$/.test(t)) return false               // só número
  if (/^https?:\/\//.test(t)) return false
  if (/^[a-z]+\.[a-zA-Z]+$/.test(t)) return false         // chave de dicionário
  return ACENTO.test(t) || PALAVRAS_PT.test(t)
}

/** Remove comentários e imports para não gerar falso positivo. */
function limpar(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*import[\s\S]*?from\s+'[^']*'\s*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
}

function achados(src) {
  const out = []
  const s = limpar(src)
  const linhas = s.split('\n')

  linhas.forEach((linha, i) => {
    const add = (txt) => {
      if (pareceUI(txt) && !out.some((o) => o.linha === i + 1 && o.texto === txt.trim())) {
        out.push({ linha: i + 1, texto: txt.trim().slice(0, 70) })
      }
    }
    // texto entre tags JSX
    for (const m of linha.matchAll(/>([^<>{}\n]{3,})</g)) add(m[1])
    // props de texto
    for (const m of linha.matchAll(/\b(placeholder|title|alt|aria-label|label)=["']([^"'\n]{3,})["']/g)) add(m[2])
    // string solta
    for (const m of linha.matchAll(/['"]([^'"\n]{4,})['"]/g)) add(m[1])
  })
  return out
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      walk(path.join(dir, e.name), acc)
    } else if (/\.tsx?$/.test(e.name)) {
      acc.push(path.join(dir, e.name))
    }
  }
  return acc
}

const arquivos = walk(SRC)
  .filter((f) => !ONLY || f.includes(ONLY))
  .map((f) => ({ rel: path.relative(ROOT, f).replace(/\\/g, '/'), hits: achados(fs.readFileSync(f, 'utf8')) }))
  .filter((f) => f.hits.length > 0)
  .sort((a, b) => b.hits.length - a.hits.length)

const total = arquivos.reduce((n, f) => n + f.hits.length, 0)

for (const f of arquivos) {
  const jaUsa = fs.readFileSync(path.join(ROOT, f.rel), 'utf8').includes('useT(')
  console.log(`${String(f.hits.length).padStart(4)}  ${f.rel}${jaUsa ? '  (já usa useT)' : ''}`)
  if (LIST) for (const h of f.hits) console.log(`        ${String(h.linha).padStart(4)}: ${h.texto}`)
}

console.log(`\n${arquivos.length} arquivo(s), ${total} string(s) de UI ainda fixas.`)
console.log('Use --list para ver cada ocorrência, --file=<parte-do-caminho> para filtrar.')
