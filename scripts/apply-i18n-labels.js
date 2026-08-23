#!/usr/bin/env node
/**
 * Aplica as chaves do dicionário aos rótulos curtos e repetidos da interface.
 *
 * ESCOPO DELIBERADAMENTE ESTREITO
 *   Só troca rótulos de UI que aparecem em VÁRIOS arquivos com texto idêntico
 *   ("Descrição", "Categoria", "Voltar"...) e cuja chave já existe. Prosa
 *   longa — páginas de referência, textos explicativos — NÃO é tocada aqui:
 *   aquilo é trabalho de redação nos dois idiomas, não substituição mecânica,
 *   e um regex faria estrago.
 *
 * SEGURANÇA
 *   Cada arquivo é validado com sucrase depois da edição. Se não parsear, o
 *   arquivo é revertido e reportado — nunca fica pela metade.
 *
 * Uso:
 *   node scripts/apply-i18n-labels.js --dry-run
 *   node scripts/apply-i18n-labels.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DRY = process.argv.includes('--dry-run')
const { transform } = require(path.join(ROOT, 'node_modules', 'sucrase'))

/** texto exato -> chave. Só entra aqui o que é rótulo, não frase. */
const MAPA = {
  'Descrição': 'table.description',
  'Categoria': 'table.category',
  'Escopo': 'table.scope',
  'Tipo': 'table.type',
  'Serviço': 'table.service',
  'Recurso': 'table.resource',
  'Verbo': 'table.verb',
  'Severidade': 'table.severity',
  'Identidade': 'table.identity',
  'Permissões': 'table.permissions',
  'Permissão': 'table.permission',
  'Voltar': 'action.back',
  'Exportar': 'action.export',
  'Copiar': 'action.copy',
  'Buscar': 'action.search',
  'Limpar filtros': 'action.clearFilters',
  'Recolher tudo': 'action.collapseAll',
  'Expandir tudo': 'action.expandAll',
  'Privilegiadas': 'filter.privileged',
  'Categorias': 'sidebar.categories',
  'Referência': 'nav.reference',
  'Informações': 'nav.info',
  'Todos': 'filter.all',
  'Todas': 'filter.allFem',
  'Última verificação': 'data.lastCheck',
  'Conjunto de dados': 'data.dataset',
  'Fontes de dados': 'data.sources',
  'Exportar frescor dos dados': 'data.exportFreshness',
  'Documentação Oficial': 'data.officialDocs',
  'Ver documentação oficial na Microsoft Learn': 'data.seeOnLearn',
  'Por Categoria': 'section.byCategory',
  'Distribuição por Tier': 'section.tierDistribution',
  'Distribuição por Risk Tier': 'section.riskTierDist',
  'Categorias por Serviço': 'section.categoriesByService',
  'Escopos de Atribuição': 'section.assignmentScopes',
  'Mitigações': 'section.mitigations',
  'Operação': 'table.operation',
  'Conteúdo': 'table.content',
  'Serviços': 'table.services',
  'Serviço:': 'label.serviceColon',
  'Específica': 'label.specific',
  'Específicas': 'label.specificPlural',
  'Não classificado (Unclassified)': 'label.unclassified',
  'Não classificadas': 'label.unclassifiedFem',
  'Copiar JSON': 'action.copyJson',
  'Mostrar menos': 'action.showLess',
  'Limpar busca': 'action.clearSearch',
  '× limpar': 'action.clearInline',
  'Nenhuma role encontrada.': 'empty.roles',
  'Nenhuma permissão encontrada.': 'empty.permissions',
  'Nenhuma action encontrada.': 'empty.actions',
  'Role não encontrada': 'empty.roleNotFound',
  '(nome não encontrado no JSON)': 'empty.nameNotInJson',
  '— selecione —': 'empty.select',
  'Filtrar actions...': 'ph.filterActions',
}

const alvos = []
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'i18n') walk(p) }
    else if (e.name.endsWith('.tsx')) alvos.push(p)
  }
}
walk(path.join(ROOT, 'src', 'app'))
walk(path.join(ROOT, 'src', 'components'))

function parseOk(code, filename) {
  try { transform(code, { transforms: ['typescript', 'jsx'], filePath: filename }); return true }
  catch { return false }
}

/**
 * Insere `const t = useT()` na função que REALMENTE usa t().
 *
 * A primeira versão pegava a primeira função com JSX do arquivo — que muitas
 * vezes é um helper (RszTh, Badge...) e não o componente principal. O hook
 * ficava fora de escopo: sintaxe válida, mas o build quebra com
 * "Cannot find name 't'". Agora ancoramos na função que contém a PRIMEIRA
 * chamada t(), delimitando-a por contagem de chaves.
 */
function inserirHook(src) {
  if (/const t = useT\(\)/.test(src)) return src

  const uso = /\bt\(\s*'[a-z]+\.[A-Za-z]+'\s*\)/.exec(src)
  if (!uso) return null

  // volta do uso até a chave de abertura da função que o contém
  let nivel = 0
  let abre = -1
  for (let i = uso.index; i >= 0; i--) {
    const c = src[i]
    if (c === '}') nivel++
    else if (c === '{') {
      if (nivel === 0) {
        // é o corpo de uma função? (evita cair num objeto literal ou em JSX)
        const antes = src.slice(Math.max(0, i - 200), i)
        if (/\)\s*(:\s*[^{]+)?\s*$/.test(antes) || /=>\s*$/.test(antes)) { abre = i; break }
      } else nivel--
    }
  }
  if (abre === -1) return null

  const fimLinha = src.indexOf('\n', abre)
  return src.slice(0, fimLinha + 1) + '  const t = useT()\n' + src.slice(fimLinha + 1)
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')
let mudados = 0, trocas = 0
const revertidos = [], semHook = [], servidor = []

for (const abs of alvos) {
  const original = fs.readFileSync(abs, 'utf8')
  let s = original
  let n = 0

  for (const [txt, chave] of Object.entries(MAPA)) {
    const esc = txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // texto entre tags: >Descrição<
    s = s.replace(new RegExp(`>${esc}<`, 'g'), () => { n++; return `>{t('${chave}')}<` })
    // props: title="Voltar" / label="Descrição" / placeholder=...
    s = s.replace(new RegExp(`\\b(title|label|aria-label|placeholder)="${esc}"`, 'g'),
      (_, prop) => { n++; return `${prop}={t('${chave}')}` })
  }

  if (n === 0) continue

  // Server Component não pode virar client: 'use client' é incompatível com
  // export const metadata e generateStaticParams. Isso quebrou 4 páginas de
  // referência na primeira execução — o build falha, não o parser.
  const ehServer = !/'use client'/.test(original)
    && /export const metadata|export function generateStaticParams|export async function generateStaticParams/.test(original)
  if (ehServer) { servidor.push(rel(abs)); continue }

  if (!/from '@\/i18n\/LanguageProvider'/.test(s)) {
    const m = /^(import .*\n)/m.exec(s)
    if (!m) { revertidos.push(rel(abs) + ' (sem import para ancorar)'); continue }
    s = s.slice(0, m.index + m[1].length) + "import { useT } from '@/i18n/LanguageProvider'\n" + s.slice(m.index + m[1].length)
  }
  if (!/'use client'/.test(s)) s = "'use client'\n\n" + s

  const comHook = inserirHook(s)
  if (comHook === null) { semHook.push(rel(abs)); continue }
  s = comHook

  if (!parseOk(s, abs)) { revertidos.push(rel(abs) + ' (não parseou)'); continue }

  if (!DRY) fs.writeFileSync(abs, s)
  mudados++; trocas += n
  console.log(`  ${String(n).padStart(3)} trocas  ${rel(abs)}`)
}

console.log(`\n${mudados} arquivo(s), ${trocas} rótulo(s) trocado(s).`)
if (semHook.length) {
  console.log(`\n${semHook.length} pulado(s) — não achei onde declarar o hook com segurança:`)
  for (const f of semHook) console.log(`  - ${f}`)
}
if (servidor.length) {
  console.log(`\n${servidor.length} pulado(s) — Server Component com metadata/generateStaticParams:`)
  for (const f of servidor) console.log(`  - ${f}`)
}
if (revertidos.length) {
  console.log(`\n${revertidos.length} revertido(s):`)
  for (const f of revertidos) console.log(`  - ${f}`)
}
if (DRY) console.log('\n--dry-run: nada escrito.')
