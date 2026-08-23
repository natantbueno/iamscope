#!/usr/bin/env node
/**
 * Recalcula, a seco, os campos DERIVADOS de src/data/aws.ts.
 *
 * POR QUE UM SCRIPT SÓ PARA ISSO
 *   tier, category, isPrivileged e actionCount não vêm da AWS: são calculados
 *   pelo coletor a partir da lista de actions da policy. E até 21/08/2026 essa
 *   lista incluía as actions de statements `Effect: Deny` — ver
 *   scripts/lib/aws-effects.js. O efeito visível era grotesco:
 *
 *     AWSDenyAll                      tier FullAccess, privilegiada
 *     AWSCompromisedKeyQuarantine v1-3  privilegiadas, categoria IAM
 *
 *   Três policies cuja função é NÃO conceder nada, carimbadas com o rótulo
 *   mais grave do site.
 *
 *   Corrigir isso não deveria exigir uma recoleta: os documentos oficiais já
 *   estão gravados em public/aws-policy-docs/. Este script recalcula só o que
 *   é derivado e não toca em nada que seja literal da AWS — nome, ARN,
 *   descrição, datas, versão.
 *
 * Uso: node scripts/rebuild-aws-derived.js [--dry-run]
 */
const fs = require('fs')
const path = require('path')
const { splitByEffect } = require('./lib/aws-effects')
const { classifyCategory, classifyTier, isPrivileged } = require('./lib/aws-classify')

const ROOT = path.join(__dirname, '..')
const DOCS_DIR = path.join(ROOT, 'public', 'aws-policy-docs')
const TS_FILE = path.join(ROOT, 'src', 'data', 'aws.ts')
const DRY = process.argv.includes('--dry-run')

const src = fs.readFileSync(TS_FILE, 'utf8')
const linhas = src.split('\n')

const mudancas = []
const allAllow = new Set()
let tocadas = 0

for (let n = 0; n < linhas.length; n++) {
  const linha = linhas[n]
  const m = /^ {2}\{ slug: '([^']+)', name: '((?:[^'\\]|\\.)*)'/.exec(linha)
  if (!m) continue
  const slug = m[1]
  const name = m[2].replace(/\\'/g, "'")

  const file = path.join(DOCS_DIR, `${slug}.json`)
  if (!fs.existsSync(file)) continue
  let doc
  try { doc = JSON.parse(fs.readFileSync(file, 'utf8')).document } catch { continue }

  const { allow } = splitByEffect(doc)
  for (const a of allow) allAllow.add(a)

  const novo = {
    tier: classifyTier(name, allow),
    category: classifyCategory(name, allow),
    isPrivileged: isPrivileged(name, allow),
    actionCount: allow.length,
  }

  let saida = linha
  const trocar = (re, valor, campo) => {
    const atual = re.exec(saida)
    if (!atual) return
    if (atual[1] !== String(valor)) mudancas.push(`${slug} · ${campo}: ${atual[1]} → ${valor}`)
    saida = saida.replace(re, (t) => t.replace(atual[1], String(valor)))
  }
  trocar(/tier: '([^']+)'/, novo.tier, 'tier')
  trocar(/category: '([^']+)'/, novo.category, 'category')
  trocar(/isPrivileged: (true|false)/, novo.isPrivileged, 'isPrivileged')
  trocar(/actionCount: (\d+)/, novo.actionCount, 'actionCount')

  if (saida !== linha) { linhas[n] = saida; tocadas++ }
}

// ── Contagens exportadas ────────────────────────────────────────────────────
// Três números, e não um, porque eles respondem a perguntas diferentes e o
// site vinha usando o primeiro como se respondesse as três. Ver P3a no
// FEEDBACK-2026-08-20.md.
const concretas = [...allAllow].filter((a) => !a.includes('*'))
const padroes = [...allAllow].filter((a) => a.includes('*'))
// O serviço sai de TODAS as actions concedidas, padrões inclusive: uma policy
// que concede `geo:*` cobre o serviço `geo` mesmo sem citar uma action dele.
// Só o `*` sozinho fica de fora, porque não nomeia serviço nenhum. É a mesma
// derivação que o coletor sempre usou — o que mudou aqui é só a entrada, que
// agora exclui o que vem de Deny.
const services = new Set([...allAllow]
  .map((a) => { const i = a.indexOf(':'); return i > 0 ? a.slice(0, i) : a })
  .filter((s) => s && s !== '*'))

let saida = linhas.join('\n')
const subst = [
  [/export const AWS_ACTION_COUNT = \d+/, `export const AWS_ACTION_COUNT = ${allAllow.size}`],
  [/export const AWS_SERVICE_COUNT = \d+/, `export const AWS_SERVICE_COUNT = ${services.size}`],
]
for (const [re, novo] of subst) {
  const atual = re.exec(saida)
  if (atual && atual[0] !== novo) mudancas.push(`constante · ${atual[0]} → ${novo}`)
  saida = saida.replace(re, novo)
}

// As duas novas entram uma única vez, logo depois de AWS_SERVICE_COUNT.
if (!/AWS_CONCRETE_ACTION_COUNT/.test(saida)) {
  saida = saida.replace(/(export const AWS_SERVICE_COUNT = \d+\n)/,
    `$1`
    + `\n/**\n`
    + ` * Recorte honesto do que AWS_ACTION_COUNT mede.\n`
    + ` *\n`
    + ` * AWS_ACTION_COUNT são as strings de action CONCEDIDAS pelas policies\n`
    + ` * gerenciadas — e boa parte delas é padrão (\`s3:*\`), não action. O\n`
    + ` * universo de actions da AWS é maior e mora no Service Authorization\n`
    + ` * Reference; ver scripts/fetch-aws-actions-universe.js.\n`
    + ` */\n`
    + `export const AWS_CONCRETE_ACTION_COUNT = ${concretas.length}\n`
    + `export const AWS_WILDCARD_PATTERN_COUNT = ${padroes.length}\n`)
} else {
  saida = saida
    .replace(/export const AWS_CONCRETE_ACTION_COUNT = \d+/, `export const AWS_CONCRETE_ACTION_COUNT = ${concretas.length}`)
    .replace(/export const AWS_WILDCARD_PATTERN_COUNT = \d+/, `export const AWS_WILDCARD_PATTERN_COUNT = ${padroes.length}`)
}

console.log(`policies com campo derivado alterado: ${tocadas}`)
for (const c of mudancas.slice(0, 40)) console.log('  ' + c)
if (mudancas.length > 40) console.log(`  … e mais ${mudancas.length - 40}`)
console.log(`\nactions concedidas   : ${allAllow.size}  (${concretas.length} concretas + ${padroes.length} padrões)`)
console.log(`serviços             : ${services.size}`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); process.exit(0) }
fs.writeFileSync(TS_FILE, saida)
console.log('\nEscrito: src/data/aws.ts')
console.log('Agora rode: node scripts/build-aws-actions-index.js && node scripts/typecheck.cjs')
