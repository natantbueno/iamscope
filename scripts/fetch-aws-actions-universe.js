#!/usr/bin/env node
/**
 * Coleta o UNIVERSO de actions de IAM da AWS.
 *
 * A PERGUNTA QUE ISTO RESPONDE, E QUE O SITE NÃO RESPONDIA
 *   O índice do Permission Scope só conhece o que as managed policies citam:
 *   16.423 strings de action, das quais 1.267 são padrão (`s3:*`). Quando
 *   alguém procurava uma action que existe na AWS mas nenhuma policy
 *   gerenciada concede, a resposta era "nenhuma permissão encontrada" — que
 *   soa como "essa action não existe", quando o certo seria "existe, e nenhuma
 *   policy gerenciada a concede", que é uma informação de segurança útil.
 *
 *   Um revisor apontou isso de outro jeito: "16k actions, hoje temos 22k
 *   actions quase". Ele está certo. Os dois números medem coisas diferentes, e
 *   o site apresentava o primeiro como se fosse o segundo.
 *
 * A FONTE
 *   https://servicereference.us-east-1.amazonaws.com/ — o Service Reference
 *   Information, publicado pela própria AWS em JSON, sem credencial: um índice
 *   de ~1.050 serviços e um arquivo por serviço com as actions dele. É a
 *   contraparte legível por máquina do Service Authorization Reference.
 *
 * ONDE RODA
 *   **Só na máquina do Natan.** Esse host responde 403 de dentro do sandbox,
 *   igual ao fetch-aws-policies-official.js. Ver a memória do projeto,
 *   "Pipeline de atualização".
 *
 * SAÍDA
 *   public/aws-actions-universe.json
 *   { generatedAt, serviceCount, actionCount, services: { s3: ['GetObject', ...] } }
 *
 *   Guardado como serviço -> operações, e não como lista achatada de
 *   "s3:GetObject", porque o prefixo se repete centenas de vezes: a forma
 *   agrupada sai em torno de um terço do tamanho, e o cliente remonta a string
 *   completa em memória quando precisa.
 *
 * Uso: node scripts/fetch-aws-actions-universe.js [--dry-run]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'aws-actions-universe.json')
const INDEX = 'https://servicereference.us-east-1.amazonaws.com/'
const CONCURRENCY = 16
const DRY = process.argv.includes('--dry-run')

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`)
  return res.json()
}

async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) }
  }))
  return out
}

;(async () => {
  console.log('Buscando o índice de serviços da AWS...')
  const index = await getJson(INDEX)
  console.log(`  ${index.length} serviços no índice`)

  let feitos = 0, falhas = 0
  const services = {}
  await pool(index, CONCURRENCY, async (s) => {
    try {
      const d = await getJson(s.url)
      // `Name` é o prefixo de IAM (o "s3" de "s3:GetObject"); quando ausente,
      // o nome do serviço no índice serve — os dois batem na esmagadora
      // maioria, e discordar aqui vale um aviso, não um chute silencioso.
      const prefixo = d.Name || s.service
      if (d.Name && d.Name !== s.service) {
        console.log(`  aviso: índice diz "${s.service}", arquivo diz "${d.Name}"`)
      }
      const acoes = (d.Actions || []).map((a) => a.Name).filter(Boolean).sort()
      if (acoes.length) services[prefixo] = [...new Set(acoes)]
    } catch (err) {
      falhas++
      if (falhas <= 5) console.log(`  falhou ${s.service}: ${err.message}`)
    }
    feitos++
    if (feitos % 200 === 0) console.log(`  ${feitos}/${index.length}`)
  })

  const serviceCount = Object.keys(services).length
  const actionCount = Object.values(services).reduce((n, a) => n + a.length, 0)
  console.log(`\nserviços com actions : ${serviceCount}`)
  console.log(`actions distintas    : ${actionCount}`)
  if (falhas) console.log(`falhas               : ${falhas}`)

  // Comparação com o que as managed policies cobrem — é o número que motiva
  // este coletor, então ele é impresso aqui em vez de ficar só num relatório.
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'aws-actions-index.json'), 'utf8'))
    const concedidas = new Set(Object.keys(idx.index).filter((a) => !a.includes('*')))
    let semPolicy = 0
    for (const [svc, ops] of Object.entries(services)) {
      for (const op of ops) if (!concedidas.has(`${svc}:${op}`)) semPolicy++
    }
    console.log(`\nactions concretas citadas por managed policy : ${concedidas.size}`)
    console.log(`actions sem nenhuma policy gerenciada citando : ${semPolicy}`)
  } catch { /* índice ainda não gerado */ }

  if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: INDEX,
    serviceCount,
    actionCount,
    services,
  }))
  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2)
  console.log(`\nEscrito: public/aws-actions-universe.json (${mb} MB)`)
})().catch((e) => {
  console.error('\nFALHOU:', e.message)
  console.error('Se for 403: este host bloqueia sandbox. Rode na sua máquina.')
  process.exitCode = 1
})
