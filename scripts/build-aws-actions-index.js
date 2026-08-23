#!/usr/bin/env node
/**
 * Gera public/aws-actions-index.json — índice invertido action -> policies.
 *
 * POR QUE SAIU DE DENTRO DO COLETOR
 *   O índice era montado no fim de fetch-aws-policies-official.js, que só roda
 *   com rede (a referência da AWS responde 403 de dentro de sandbox). Isso
 *   amarrava qualquer conserto no índice a uma recoleta inteira. Como os
 *   documentos oficiais já ficam gravados em public/aws-policy-docs/, o índice
 *   pode ser reconstruído a seco, offline, quantas vezes for preciso.
 *
 *   O coletor continua chamando este módulo no fim, para não haver duas
 *   implementações do mesmo índice.
 *
 * FORMATO
 *   {
 *     slugs:  ['administratoraccess', ...],        // índice posicional
 *     index:  { 's3:GetObject': [3, 17] },         // quem CONCEDE
 *     denied: { 'iam:CreateUser': [42] }           // quem NEGA (Effect: Deny)
 *   }
 *
 *   `index` traz só o que é concedido. Diferente do índice do Azure — onde o
 *   conjunto completo precisa continuar existindo porque dele saem ~2.700
 *   páginas estáticas — aqui não há rota por action, então a entrada fantasma
 *   não tem por que ficar.
 *
 *   `denied` não é descarte: uma policy que NEGA uma action é informação de
 *   segurança de primeira ordem (é o que as AWSCompromisedKeyQuarantine fazem).
 *   Ela só não é uma concessão.
 *
 * Uso: node scripts/build-aws-actions-index.js
 */
const fs = require('fs')
const path = require('path')
const { splitByEffect } = require('./lib/aws-effects')

const ROOT = path.join(__dirname, '..')
const DOCS_DIR = path.join(ROOT, 'public', 'aws-policy-docs')
const DATA_FILE = path.join(ROOT, 'src', 'data', 'aws.ts')
const OUT_FILE = path.join(ROOT, 'public', 'aws-actions-index.json')

/** Ordem dos slugs = ordem do dataset, para o índice posicional ser estável. */
function slugsFromDataset() {
  const src = fs.readFileSync(DATA_FILE, 'utf8')
  const out = []
  const re = /^ {2}\{ slug: '([^']+)'/gm
  let m
  while ((m = re.exec(src)) !== null) out.push(m[1])
  return out
}

function build({ log = console.log } = {}) {
  const slugs = slugsFromDataset()
  if (slugs.length === 0) throw new Error('Nenhuma policy encontrada em src/data/aws.ts')

  const index = Object.create(null)
  const denied = Object.create(null)
  let missing = 0, allowPairs = 0, denyPairs = 0
  let policiesSoDeny = 0, policiesMistas = 0

  slugs.forEach((slug, i) => {
    const file = path.join(DOCS_DIR, `${slug}.json`)
    if (!fs.existsSync(file)) { missing++; return }
    let doc
    try {
      doc = JSON.parse(fs.readFileSync(file, 'utf8')).document
    } catch (err) {
      log(`  aviso: JSON inválido em ${slug}.json — ${err.message}`)
      return
    }
    const { allow, deny } = splitByEffect(doc)
    if (deny.length && !allow.length) policiesSoDeny++
    else if (deny.length) policiesMistas++
    for (const a of allow) { (index[a] || (index[a] = [])).push(i); allowPairs++ }
    for (const a of deny) { (denied[a] || (denied[a] = [])).push(i); denyPairs++ }
  })

  const fantasmas = Object.keys(denied).filter((a) => !(a in index))

  fs.writeFileSync(OUT_FILE, JSON.stringify({ slugs, index, denied }))
  const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2)

  log(`policies indexadas   : ${slugs.length - missing}/${slugs.length}`)
  log(`actions concedidas   : ${Object.keys(index).length}`)
  log(`  pares (action,pol) : ${allowPairs}`)
  log(`actions negadas      : ${Object.keys(denied).length} em ${policiesSoDeny + policiesMistas} policies`)
  log(`  pares negativos    : ${denyPairs} (${policiesSoDeny} policies 100% Deny, ${policiesMistas} mistas)`)
  log(`  só existiam por Deny: ${fantasmas.length} action(s) — fora do índice agora`)
  log(`saída                : public/aws-actions-index.json (${mb} MB)`)
  if (missing) log(`ATENÇÃO: ${missing} policy(ies) sem documento em public/aws-policy-docs/.`)

  return { slugs, index, denied, allowPairs, denyPairs, fantasmas }
}

module.exports = { build }

if (require.main === module) build()
