'use strict'
/**
 * Verifica public/api/v1/ contra o contrato escrito em docs/API.md.
 *
 * Roda depois do build-api.js e quebra o build quando os dois divergem. É o
 * mesmo papel dos outros checadores do projeto: o dado publicado não pode
 * contradizer o que a documentação promete.
 *
 * O QUE ELE PEGA, E POR QUE CADA UM ESTÁ AQUI
 *   - contagem diferente de counts.ts   -> a API anunciaria um número que a
 *                                          interface não anuncia
 *   - sha256/bytes fora do manifesto    -> o consumidor que confia no digest
 *                                          para pular download baixaria errado
 *   - eamLevel fora de {0,1,2,null}     -> quebra o único campo pelo qual a
 *                                          API existe
 *   - eamLevel null fora do Entra       -> só o Entra tem tier não classificado
 *   - id repetido dentro da plataforma  -> o consumidor indexa por id
 *   - url que não aponta para o site    -> a citação é metade do produto
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { loadTs, ROOT } = require('./lib/load-ts')

const DIR = path.join(ROOT, 'public', 'api', 'v1')
const SITE = 'https://iamscope.cloud'
const C = loadTs('src/data/counts.ts')

const erros = []
const falha = (m) => erros.push(m)

const ESPERADOS = {
  entra: C.ENTRA_ROLES_COUNT,
  azure: C.AZURE_ROLES_COUNT,
  aws: C.AWS_POLICIES_COUNT,
  gcp: C.GCP_ROLES_COUNT,
  workspace: C.GWS_ROLES_COUNT,
  ibm: C.IBM_ROLES_COUNT,
}

const ARQUIVOS = [
  'index.json',
  'roles/all.json',
  ...Object.keys(ESPERADOS).map((p) => `roles/${p}.json`),
  'permissions/aws.json',
  'permissions/gcp.json',
  'permissions/azure.json',
  'permissions/entra.json',
  'meta/sources.json',
  'meta/tiers.json',
]

const CAMPOS = {
  platform: 'string',
  kind: 'string',
  id: 'string',
  slug: 'string',
  name: 'string',
  description: 'string',
  nativeTier: 'string',
  category: 'string',
  isPrivileged: 'boolean',
  permissionCount: 'number',
  deprecated: 'boolean',
  url: 'string',
  source: 'string',
  lastSynced: 'string',
}

function ler(rel) {
  const f = path.join(DIR, rel)
  if (!fs.existsSync(f)) return null
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}

// ── 1. todos os arquivos existem ─────────────────────────────────────────────
for (const rel of ARQUIVOS) {
  if (!fs.existsSync(path.join(DIR, rel))) falha(`arquivo ausente: ${rel}`)
}
if (erros.length) fim()

// ── 2. envelope de todo arquivo ──────────────────────────────────────────────
for (const rel of ARQUIVOS) {
  const d = ler(rel)
  for (const campo of ['apiVersion', 'classification', 'license', 'attribution']) {
    if (!d[campo]) falha(`${rel}: envelope sem "${campo}"`)
  }
  if (d.apiVersion !== 'v1') falha(`${rel}: apiVersion é "${d.apiVersion}", esperado "v1"`)
  if (d.license !== 'CC-BY-4.0') falha(`${rel}: license é "${d.license}", esperado "CC-BY-4.0"`)
}

// ── 3. registros de role ─────────────────────────────────────────────────────
let somaPlataformas = 0

for (const [plat, esperado] of Object.entries(ESPERADOS)) {
  const rel = `roles/${plat}.json`
  const d = ler(rel)

  if (!Array.isArray(d.items)) { falha(`${rel}: sem array "items"`); continue }
  if (d.items.length !== esperado) {
    falha(`${rel}: ${d.items.length} registros, counts.ts diz ${esperado}`)
  }
  if (d.count !== d.items.length) falha(`${rel}: count=${d.count} não bate com items.length=${d.items.length}`)
  somaPlataformas += d.items.length

  const vistos = new Set()
  d.items.forEach((r, i) => {
    const onde = `${rel}[${i}] ${r.slug || '?'}`

    for (const [campo, tipo] of Object.entries(CAMPOS)) {
      if (typeof r[campo] !== tipo) falha(`${onde}: campo "${campo}" é ${typeof r[campo]}, esperado ${tipo}`)
    }
    if (r.platform !== plat) falha(`${onde}: platform="${r.platform}", esperado "${plat}"`)

    // eamLevel: o campo pelo qual a API existe
    if (!(r.eamLevel === null || r.eamLevel === 0 || r.eamLevel === 1 || r.eamLevel === 2)) {
      falha(`${onde}: eamLevel=${JSON.stringify(r.eamLevel)} fora de {0,1,2,null}`)
    }
    if (r.eamLevel === null && plat !== 'entra') {
      falha(`${onde}: eamLevel null só é permitido no Entra ID`)
    }

    if (!r.url || !r.url.startsWith(`${SITE}/`) || !r.url.endsWith('/')) {
      falha(`${onde}: url "${r.url}" precisa começar com ${SITE}/ e terminar em /`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.lastSynced)) falha(`${onde}: lastSynced "${r.lastSynced}" não é YYYY-MM-DD`)

    if (!r[plat] || typeof r[plat] !== 'object') falha(`${onde}: sem o bloco "${plat}"`)

    if (vistos.has(r.id)) falha(`${onde}: id repetido "${r.id}"`)
    vistos.add(r.id)
  })
}

// ── 4. all.json é a soma, sem o array de permissões ──────────────────────────
const all = ler('roles/all.json')
if (all.items.length !== somaPlataformas) {
  falha(`roles/all.json: ${all.items.length} registros, soma das plataformas é ${somaPlataformas}`)
}
if (all.items.some((r) => r.permissions !== undefined)) {
  falha('roles/all.json: algum registro carrega "permissions" — o all.json é o catálogo sem elas')
}

// ── 5. contagens das permissões ──────────────────────────────────────────────
const permsEsperadas = {
  'permissions/aws.json': C.AWS_ACTIONS_COUNT,
  'permissions/gcp.json': C.GCP_PERMISSIONS_COUNT,
  'permissions/entra.json': C.ENTRA_API_PERMISSIONS_COUNT,
}
for (const [rel, esperado] of Object.entries(permsEsperadas)) {
  const d = ler(rel)
  if (d.count !== esperado) falha(`${rel}: count=${d.count}, counts.ts diz ${esperado}`)
}

// ── 6. o manifesto descreve a realidade ──────────────────────────────────────
const idx = ler('index.json')
if (!Array.isArray(idx.files)) falha('index.json: sem array "files"')
else {
  const descritos = new Set(idx.files.map((f) => f.path))
  for (const rel of ARQUIVOS) {
    if (rel === 'index.json') continue
    if (!descritos.has(rel)) falha(`index.json: não descreve ${rel}`)
  }
  for (const f of idx.files) {
    const abs = path.join(DIR, f.path)
    if (!fs.existsSync(abs)) { falha(`index.json: descreve ${f.path}, que não existe`); continue }
    const body = fs.readFileSync(abs)
    if (body.length !== f.bytes) falha(`index.json: ${f.path} tem ${body.length} bytes, manifesto diz ${f.bytes}`)
    const sha = crypto.createHash('sha256').update(body).digest('hex')
    if (sha !== f.sha256) falha(`index.json: sha256 de ${f.path} não confere`)
  }
}
if (idx.counts && idx.counts.roles !== somaPlataformas) {
  falha(`index.json: counts.roles=${idx.counts.roles}, soma real ${somaPlataformas}`)
}
if (idx.counts && idx.counts.sodRules !== C.SOD_RULES_COUNT) {
  falha(`index.json: counts.sodRules=${idx.counts.sodRules}, counts.ts diz ${C.SOD_RULES_COUNT}`)
}

// ── 7. o dicionário de tiers cobre todo nativeTier emitido ───────────────────
const tiers = ler('meta/tiers.json')
for (const plat of Object.keys(ESPERADOS)) {
  const mapa = tiers.platforms && tiers.platforms[plat]
  if (!mapa) { falha(`meta/tiers.json: sem o mapa de "${plat}"`); continue }
  const usados = new Set(ler(`roles/${plat}.json`).items.map((r) => r.nativeTier))
  for (const t of usados) {
    if (!(t in mapa)) falha(`meta/tiers.json: "${t}" é emitido em ${plat} mas não está no dicionário`)
  }
}

fim()

function fim() {
  if (erros.length) {
    console.error(`\n[check-api-contract] ${erros.length} problema(s):\n`)
    for (const e of erros.slice(0, 40)) console.error('  •', e)
    if (erros.length > 40) console.error(`  … e mais ${erros.length - 40}`)
    console.error('')
    process.exit(1)
  }
  console.log(
    `[check-api-contract] ok — ${ARQUIVOS.length} arquivos, ${somaPlataformas} roles, ` +
      'envelope, eamLevel, urls, ids e digests conferidos'
  )
  process.exit(0)
}
