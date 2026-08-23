#!/usr/bin/env node
/**
 * Reconcilia o catálogo de AWS Managed Policies do site contra a lista oficial
 * da AWS — responde "quantas existem hoje e quais entraram/saíram".
 *
 * Fonte: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html
 *   Domínio da própria AWS, público, sem credencial e sem conta.
 *   É a mesma lista que o `fetch-aws-managed-policies.js` já usa para baixar o
 *   documento de cada policy — aqui só a lista é buscada (1 requisição), o que
 *   torna a checagem de contagem rápida.
 *
 * Este script NÃO reescreve dados por padrão. O fluxo é:
 *   1. node scripts/reconcile-aws-policies.js         -> relatório do diff
 *   2. node scripts/fetch-aws-managed-policies.js     -> recarga completa, se o diff justificar
 *
 * Opções:
 *   --json    imprime o diff em JSON (para CI)
 *
 * Node 18+ (fetch nativo), sem dependências.
 */
const fs = require('fs')
const path = require('path')

const DATA = path.join(__dirname, '..', 'src', 'data', 'aws.ts')
const INDEX_URL = 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html'
const AS_JSON = process.argv.includes('--json')

/**
 * A página-índice lista cada policy como link para a própria página.
 * Extrai o nome a partir do href — mais estável que depender do texto visível,
 * que muda de marcação entre revisões da doc.
 */
function parsePolicyNames(html) {
  const names = new Set()
  // <a href="./AdministratorAccess.html"> ou href="AdministratorAccess.html"
  const rx = /href="\.?\/?([A-Za-z0-9_+=,.@-]+)\.html"/g
  let m
  while ((m = rx.exec(html)) !== null) {
    const n = m[1]
    // descarta páginas de navegação da própria doc
    if (/^(policy-list|reference|index|about-managed-policy-reference|what-is|history|security|troubleshoot)$/i.test(n)) continue
    if (n.length < 3) continue
    names.add(n)
  }
  return [...names].sort()
}

function currentPolicies() {
  const src = fs.readFileSync(DATA, 'utf8')
  // aws.ts guarda name e arn por policy
  const rows = [...src.matchAll(/name: '((?:[^'\\]|\\.)*)',[\s\S]{0,400}?arn: '([^']*)'/g)]
    .map((m) => ({ name: m[1].replace(/\\'/g, "'"), arn: m[2] }))
  if (rows.length === 0) {
    // fallback: só nomes
    return [...src.matchAll(/name: '((?:[^'\\]|\\.)*)'/g)].map((m) => ({ name: m[1].replace(/\\'/g, "'"), arn: '' }))
  }
  return rows
}

;(async () => {
  console.log('Buscando a lista oficial de AWS Managed Policies...')
  const res = await fetch(INDEX_URL, {
    headers: { 'user-agent': 'Mozilla/5.0 (IAM Scope data reconciler)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${INDEX_URL}`)
  const html = await res.text()

  const official = parsePolicyNames(html)
  if (official.length < 100) {
    throw new Error(
      `Só ${official.length} policies extraídas — o layout da página provavelmente mudou.\n` +
      `  Verifique o parser em parsePolicyNames(). Tamanho do HTML: ${html.length} bytes.`,
    )
  }

  const cur = currentPolicies()
  const curNames = new Set(cur.map((c) => c.name))
  const officialSet = new Set(official)

  const added = official.filter((n) => !curNames.has(n))
  const removed = cur.map((c) => c.name).filter((n) => !officialSet.has(n))

  if (AS_JSON) {
    console.log(JSON.stringify({
      official: official.length, current: cur.length,
      added, removed,
    }, null, 2))
    return
  }

  console.log('='.repeat(62))
  console.log(`Policies no site   : ${cur.length}`)
  console.log(`Policies oficiais  : ${official.length}`)
  console.log(`Diferença          : ${official.length - cur.length >= 0 ? '+' : ''}${official.length - cur.length}`)
  console.log('='.repeat(62))

  console.log(`\nNOVAS na AWS, ausentes no site: ${added.length}`)
  for (const n of added.slice(0, 40)) console.log(`   + ${n}`)
  if (added.length > 40) console.log(`   … e mais ${added.length - 40}`)

  console.log(`\nNO SITE mas fora da lista oficial (descontinuadas?): ${removed.length}`)
  for (const n of removed.slice(0, 40)) console.log(`   - ${n}`)
  if (removed.length > 40) console.log(`   … e mais ${removed.length - 40}`)

  if (added.length === 0 && removed.length === 0) {
    console.log('\nCatálogo em dia — nenhuma ação necessária.')
  } else {
    console.log('\nPara aplicar a diferença, rode a recarga completa:')
    console.log('   node scripts/fetch-aws-managed-policies.js')
    console.log('(ela rebaixa o documento de cada policy; leva alguns minutos)')
  }
})().catch((e) => {
  // process.exit() com stdout pendente derruba o libuv no Windows
  console.error('\nFALHOU:', e.message)
  process.exitCode = 1
})
