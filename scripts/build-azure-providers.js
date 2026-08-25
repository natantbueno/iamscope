#!/usr/bin/env node
/**
 * Índice de PROVIDERS do Azure RBAC — o Azure por serviço.
 *
 * POR QUE EXISTE
 *   O site tem `/aws/actions` (16.423 actions em 451 serviços) e
 *   `/gcp/permissions` (13.701 permissions em 317 serviços). O Azure era a
 *   única nuvem grande sem entrada por serviço: quem procurava
 *   `Microsoft.Storage/blobServices/containers/write` não chegava ao IAM Scope,
 *   porque `/azure-rbac/permissions` só cataloga as 2.697 actions que aparecem
 *   LITERALMENTE nas definições das 504 roles — e essa não é a operação que a
 *   pessoa digitou.
 *
 *   Este script cobre o universo inteiro: as 17.591 ações distintas de
 *   `public/azure-action-descriptions.json`, agrupadas por resource provider.
 *
 * SÃO 151 PROVIDERS, NÃO 158
 *   `azure-action-descriptions.json` tem 17.605 CHAVES; 14 são a mesma ação em
 *   dois cases (`Microsoft.App/artifacts/read` e `microsoft.app/artifacts/read`)
 *   — resíduo do merge do lote manual antigo com o coletor. Contando o prefixo
 *   dessas chaves cru dá 158 providers; distintos, case-insensitive, são 151.
 *   É o mesmo par de números que `scripts/build-effective-perms.js` já apura, e
 *   é o distinto que vira rota: gerar as 158 produziria sete pares de URLs que
 *   colidem no slug (`microsoft-insights` duas vezes) e teriam de ganhar sufixo
 *   `-2` sem que nada as distinguisse na tela.
 *
 * QUEM CONCEDE CADA AÇÃO — E POR QUE NÃO DÁ PARA LER DO ÍNDICE EXISTENTE
 *   `public/azure-perms-index.json` inverte action -> roles, mas só para as
 *   actions escritas por extenso na definição. A Owner é `[{"action":"*"}]`:
 *   ela concede as 17.591 e não aparece em nenhuma entrada literal. Então aqui
 *   os padrões são EXPANDIDOS contra o universo, com o mesmo motor de
 *   build-effective-perms.js — regex ancorada, case-insensitive, e o `*`
 *   atravessando `/`, que é como o Azure resolve, não como um glob de shell.
 *
 *   Control plane: `Actions` expandidas, `NotActions` subtraídas (viram `x`,
 *   a lista de quem NEGA explicitamente — dado que a página mostra).
 *   Data plane: `DataActions` expandidas, `NotDataActions` subtraídas. É
 *   seguro fazer isso aqui, e não era em build-effective-perms.js, porque a
 *   pergunta é outra: lá era "quantas ações de dados esta role concede?", que
 *   exige um denominador de data plane que o store não tem; aqui é "esta role
 *   concede ESTA ação?", que se responde casando o padrão. Conferido: nenhuma
 *   das 504 roles tem `*` sozinho em DataActions — o padrão mais largo é de
 *   provider (`Microsoft.CognitiveServices/*`).
 *
 * O PLANO (CONTROL/DATA) VEM DAS ROLES, NÃO DO STORE
 *   O store MISTURA os dois planos e não marca nenhuma chave — ver o cabeçalho
 *   de src/data/azureEffective.ts. Então o campo `p` só é preenchido quando
 *   alguma definição de role declara a ação POR EXTENSO (sem wildcard) em
 *   Actions/NotActions ou em DataActions/NotDataActions. É prova, não
 *   heurística — e cobre ~1.816 das 17.591. O resto sai como "não declarado",
 *   escrito assim na tela.
 *
 * O NÚMERO É UM PISO
 *   O universo vem da documentação; a Azure Management API expõe mais. Toda
 *   contagem que sai daqui é limite inferior, e a interface diz isso.
 *
 * Ordem: depois de scripts/build-azure-perms-index.js (lê o `slugs` dele).
 *
 * Uso:
 *   node scripts/build-azure-providers.js
 *   node scripts/build-azure-providers.js --dry-run   # relatório, nada escrito
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const UNIVERSE_FILE = path.join(ROOT, 'public', 'azure-action-descriptions.json')
const PERMS_DIR = path.join(ROOT, 'public', 'azure-perms')
const INDEX_FILE = path.join(ROOT, 'public', 'azure-perms-index.json')
const OUT_DIR = path.join(ROOT, 'public', 'azure-providers')

const DRY = process.argv.includes('--dry-run')

// ── Slug de provider ────────────────────────────────────────────────────────

/**
 * `Microsoft.Storage` -> `microsoft-storage`.
 *
 * Mesma regra de actionToSlug em src/lib/azurePermissions.ts, e o cliente
 * precisa reproduzi-la — está em src/lib/azureProviders.ts. Se mudar aqui,
 * muda lá.
 */
function providerToSlug(provider) {
  return provider
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Universo ────────────────────────────────────────────────────────────────

const rawDocs = JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8'))
const rawKeys = Object.keys(rawDocs)

/**
 * UPPER -> { action, desc }. A caixa exibida é a "própria" (a das tabelas
 * canônicas da Microsoft), não a minúscula do lote antigo — mesmo critério de
 * desempate de src/lib/azureActionDocs.ts.
 */
const canon = new Map()
for (const k of rawKeys) {
  const u = k.toUpperCase()
  const atual = canon.get(u)
  const desc = String(rawDocs[k] ?? '')
  if (!atual) { canon.set(u, { action: k, desc }); continue }
  const ganhaCaixa = k !== k.toLowerCase() && atual.action === atual.action.toLowerCase()
  if (ganhaCaixa || desc.length > atual.desc.length) canon.set(u, { action: k, desc })
}

const UNIVERSE = [...canon.keys()]
const UNIVERSE_SET = new Set(UNIVERSE)
const PROVIDERS_RAW = new Set(rawKeys.map((k) => k.split('/')[0]))

// ── Padrão -> regex ancorada (idêntico a build-effective-perms.js) ──────────

/** Escapa tudo que é meta em regex, MENOS o `*`, que vira `.*` (casa `/` também). */
function patternToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp('^' + escaped + '$', 'i')
}

const matchCache = new Map()
function matchUniverse(pattern) {
  const key = pattern.toUpperCase()
  const hit = matchCache.get(key)
  if (hit) return hit
  let set
  if (!pattern.includes('*')) {
    set = UNIVERSE_SET.has(key) ? [key] : []
  } else {
    const rx = patternToRegex(pattern)
    set = UNIVERSE.filter((a) => rx.test(a))
  }
  matchCache.set(key, set)
  return set
}

// ── Definições das roles ────────────────────────────────────────────────────

const idx = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
const roleSlugs = idx.slugs

const { AZURE_ROLES } = require('./lib/load-ts.js').loadTs('src/data/azureRbac.ts')
const roleBySlug = new Map(AZURE_ROLES.map((r) => [r.slug, r]))

const semArquivo = []
const semMetadado = []
const defs = new Map()
for (const slug of roleSlugs) {
  if (!roleBySlug.has(slug)) semMetadado.push(slug)
  const f = path.join(PERMS_DIR, slug + '.json')
  if (!fs.existsSync(f)) { semArquivo.push(slug); defs.set(slug, []); continue }
  defs.set(slug, JSON.parse(fs.readFileSync(f, 'utf8')))
}

// ── Plano declarado por extenso ─────────────────────────────────────────────
//
// Só literais: um wildcard não diz nada sobre o plano da ação que ele cobre.

const literaisControl = new Set()
const literaisData = new Set()
for (const perms of defs.values()) {
  for (const p of perms) {
    if (p.action.includes('*')) continue
    const u = p.action.toUpperCase()
    if (p.type === 'Actions' || p.type === 'NotActions') literaisControl.add(u)
    if (p.type === 'DataActions' || p.type === 'NotDataActions') literaisData.add(u)
  }
}

/** 0 = não declarado · 1 = control · 2 = data · 3 = declarada nos dois. */
function planoDe(upper) {
  return (literaisControl.has(upper) ? 1 : 0) | (literaisData.has(upper) ? 2 : 0)
}

// ── Expansão: ação -> roles ─────────────────────────────────────────────────

const byType = (perms, type) => perms.filter((p) => p.type === type).map((p) => p.action)

/** UPPER -> { g:Set<idxRole>, dg:Set, x:Set } */
const grants = new Map()
for (const u of UNIVERSE) grants.set(u, { g: [], dg: [], x: [] })

roleSlugs.forEach((slug, i) => {
  const perms = defs.get(slug) ?? []

  // Control plane
  const allow = new Set()
  for (const a of byType(perms, 'Actions')) for (const m of matchUniverse(a)) allow.add(m)
  const notRx = byType(perms, 'NotActions').map(patternToRegex)
  if (notRx.length) {
    for (const a of [...allow]) {
      if (notRx.some((rx) => rx.test(a))) { allow.delete(a); grants.get(a).x.push(i) }
    }
  }
  for (const a of allow) grants.get(a).g.push(i)

  // Data plane
  const dataAllow = new Set()
  for (const a of byType(perms, 'DataActions')) for (const m of matchUniverse(a)) dataAllow.add(m)
  const notDataRx = byType(perms, 'NotDataActions').map(patternToRegex)
  if (notDataRx.length) {
    for (const a of [...dataAllow]) {
      if (notDataRx.some((rx) => rx.test(a))) { dataAllow.delete(a); grants.get(a).x.push(i) }
    }
  }
  for (const a of dataAllow) grants.get(a).dg.push(i)
})

// ── Agrupamento por provider ────────────────────────────────────────────────

/** UPPER do provider -> { name, actions: [...] } */
const porProvider = new Map()
for (const u of UNIVERSE) {
  const { action, desc } = canon.get(u)
  const nome = action.split('/')[0]
  const chave = nome.toUpperCase()
  let p = porProvider.get(chave)
  if (!p) { p = { name: nome, acoes: [] }; porProvider.set(chave, p) }
  // Mesma preferência de caixa das ações: nome próprio ganha do minúsculo.
  if (nome !== nome.toLowerCase() && p.name === p.name.toLowerCase()) p.name = nome
  const partes = action.split('/')
  p.acoes.push({
    upper: u,
    action,
    desc,
    verb: partes.length > 1 ? partes[partes.length - 1] : '',
    plano: planoDe(u),
  })
}

// Colisão de slug entre providers distintos seria um bug de dado, não algo a
// contornar com sufixo — os 151 nomes diferem por mais do que pontuação.
const slugVisto = new Map()
for (const [, p] of porProvider) {
  const s = providerToSlug(p.name)
  if (slugVisto.has(s)) {
    console.error(`ERRO: slug "${s}" colide entre "${slugVisto.get(s)}" e "${p.name}".`)
    process.exit(1)
  }
  slugVisto.set(s, p.name)
  p.slug = s
}

// ── Emissão ─────────────────────────────────────────────────────────────────

const indice = []
let totalPares = 0
let bytes = 0
let maiorArquivo = { slug: '', bytes: 0 }

if (!DRY) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

for (const [, p] of porProvider) {
  // Ordem alfabética estável — é a ordem em que a página exibe sem filtro, e a
  // mesma que generateStaticParams usa.
  p.acoes.sort((a, b) => a.action.localeCompare(b.action))

  // Tabela LOCAL de roles: só as que tocam este provider. Guardar índices na
  // lista global das 504 gastaria 3 dígitos por par em vez de 1 ou 2, e são
  // ~268 mil pares no total.
  const locais = []
  const localDe = new Map()
  const idxLocal = (i) => {
    let l = localDe.get(i)
    if (l === undefined) { l = locais.length; locais.push(i); localDe.set(i, l) }
    return l
  }

  const verbos = {}
  const acoes = p.acoes.map((a) => {
    const g = grants.get(a.upper)
    verbos[a.verb.toLowerCase()] = (verbos[a.verb.toLowerCase()] ?? 0) + 1
    totalPares += g.g.length + g.dg.length + g.x.length
    // [action, descrição, concedem, concedem-como-dado, negam, plano]
    return [
      a.action,
      a.desc,
      g.g.map(idxLocal),
      g.dg.map(idxLocal),
      g.x.map(idxLocal),
      a.plano,
    ]
  })

  const roles = locais.map((i) => {
    const r = roleBySlug.get(roleSlugs[i])
    // slug, nome, tier, privilegiada — o suficiente para a página não precisar
    // de AZURE_ROLES no bundle.
    return r ? [r.slug, r.name, r.tier, r.isPrivileged ? 1 : 0] : [roleSlugs[i], roleSlugs[i], '', 0]
  })

  const arquivo = { slug: p.slug, provider: p.name, roles, actions: acoes }
  const json = JSON.stringify(arquivo)
  bytes += json.length
  if (json.length > maiorArquivo.bytes) maiorArquivo = { slug: p.slug, bytes: json.length }
  if (!DRY) fs.writeFileSync(path.join(OUT_DIR, p.slug + '.json'), json)

  indice.push({
    slug: p.slug,
    name: p.name,
    actions: p.acoes.length,
    roles: roles.length,
    read: verbos.read ?? 0,
    write: verbos.write ?? 0,
    delete: verbos.delete ?? 0,
    action: verbos.action ?? 0,
    typed: p.acoes.filter((a) => a.plano !== 0).length,
  })
}

indice.sort((a, b) => b.actions - a.actions || a.name.localeCompare(b.name))

const meta = {
  generatedAt: new Date().toISOString(),
  script: 'scripts/build-azure-providers.js',
  source: 'public/azure-action-descriptions.json + public/azure-perms/*.json',
  universeKeys: rawKeys.length,
  universeActions: UNIVERSE.length,
  providersRaw: PROVIDERS_RAW.size,
  providers: porProvider.size,
  roles: roleSlugs.length,
  typedActions: indice.reduce((s, p) => s + p.typed, 0),
  rolePairs: totalPares,
  isFloor: true,
  floorNote:
    'O universo vem da documentação da Microsoft. A Azure Management API expõe mais operações: '
    + 'toda contagem aqui é limite inferior.',
  planeNote:
    'O store de descrições mistura control plane e data plane e não marca nenhuma chave. '
    + 'O plano só é afirmado quando alguma definição de role declara a ação por extenso.',
}

if (!DRY) {
  fs.writeFileSync(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify({ _meta: meta, providers: indice }),
  )
}

// ── Relatório ───────────────────────────────────────────────────────────────

console.log('')
console.log(`  chaves no store            ${meta.universeKeys}`)
console.log(`  ações distintas            ${meta.universeActions}`)
console.log(`  providers (case-sensitive) ${meta.providersRaw}`)
console.log(`  providers distintos        ${meta.providers}   ← vira rota`)
console.log(`  roles expandidas           ${meta.roles}`)
console.log(`  pares ação->role           ${meta.rolePairs}`)
console.log(`  ações com plano declarado  ${meta.typedActions} (${(meta.typedActions / meta.universeActions * 100).toFixed(1)}%)`)
console.log(`  JSON gerado                ${(bytes / 1e6).toFixed(1)} MB em ${indice.length} arquivos`)
console.log(`  maior arquivo              ${maiorArquivo.slug}.json — ${(maiorArquivo.bytes / 1e3).toFixed(0)} kB`)
if (semArquivo.length) console.log(`  AVISO: ${semArquivo.length} role(s) sem arquivo de permissões`)
if (semMetadado.length) console.log(`  AVISO: ${semMetadado.length} slug(s) do índice fora de AZURE_ROLES`)
console.log('')
console.log('  Top 5:', indice.slice(0, 5).map((p) => `${p.name} (${p.actions})`).join(', '))
console.log('')

// ── Verificações ────────────────────────────────────────────────────────────
//
// Mesmo espírito das seis de build-effective-perms.js: o que quebraria calado.

const check = []
const assert = (label, ok, detail) => check.push({ label, ok, detail })

const soma = indice.reduce((s, p) => s + p.actions, 0)
assert('soma das ações por provider = universo', soma === UNIVERSE.length,
  `${soma} = ${UNIVERSE.length}`)

// A Owner é `*`: tem de conceder toda ação de todo provider, no control plane.
const iOwner = roleSlugs.indexOf('owner')
const ownerFora = UNIVERSE.filter((u) => !grants.get(u).g.includes(iOwner)).length
assert('Owner concede as 17.591 (control plane)', ownerFora === 0,
  `${UNIVERSE.length - ownerFora} de ${UNIVERSE.length}`)

// A Reader é `*/read`: exatamente o sufixo /read, e nada além.
const iReader = roleSlugs.indexOf('reader')
const reader = UNIVERSE.filter((u) => grants.get(u).g.includes(iReader))
const readerForaDoPadrao = reader.filter((u) => !u.endsWith('/READ')).length
const readNoUniverso = UNIVERSE.filter((u) => u.endsWith('/READ')).length
assert('Reader = sufixo /read, sem sobra', reader.length === readNoUniverso && readerForaDoPadrao === 0,
  `${reader.length} de ${readNoUniverso} ações /read; ${readerForaDoPadrao} fora do padrão`)

// A Contributor tem NotActions em Microsoft.Authorization: a escrita de role
// assignment tem de aparecer como NEGADA, não como concedida.
const iContrib = roleSlugs.indexOf('contributor')
const alvo = 'MICROSOFT.AUTHORIZATION/ROLEASSIGNMENTS/WRITE'
const gAlvo = grants.get(alvo)
assert('Contributor NEGA roleAssignments/write',
  !!gAlvo && gAlvo.x.includes(iContrib) && !gAlvo.g.includes(iContrib),
  gAlvo ? `nega=${gAlvo.x.includes(iContrib)} concede=${gAlvo.g.includes(iContrib)}` : 'ação ausente do universo')

// O `*` do Azure atravessa `/` — um glob de shell erraria aqui.
assert('wildcard atravessa a barra',
  matchUniverse('Microsoft.Authorization/*/read').includes('MICROSOFT.AUTHORIZATION/ROLEASSIGNMENTS/READ'),
  `${matchUniverse('Microsoft.Authorization/*/read').length} casadas`)

// Nenhuma role com `*` solto em DataActions — é o que torna a expansão de data
// plane defensável aqui. Se um dia aparecer, esta verificação avisa.
const comStarData = roleSlugs.filter((s) =>
  byType(defs.get(s) ?? [], 'DataActions').includes('*'))
assert('nenhuma role com DataActions ["*"]', comStarData.length === 0,
  comStarData.join(', ') || 'nenhuma')

// Toda ação declarada por extenso em alguma role está no universo? Não — e é
// esperado: o store é parcial. O que NÃO pode é o contrário do plano.
const conflito = [...literaisControl].filter((u) => literaisData.has(u)).length
assert('conflito de plano é raro e visível', conflito <= 5, `${conflito} ação(ões) declaradas nos dois planos`)

console.log('  Verificações')
let falhou = false
for (const c of check) {
  console.log(`   ${c.ok ? 'OK  ' : 'FALHA'} ${c.label.padEnd(46)} ${c.detail}`)
  if (!c.ok) falhou = true
}
console.log('')

if (DRY) console.log('--dry-run: nada escrito.\n')
else console.log(`Escrito: public/azure-providers/ (${indice.length + 1} arquivos)\n`)

if (falhou) process.exitCode = 1
