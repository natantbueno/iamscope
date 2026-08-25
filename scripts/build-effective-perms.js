#!/usr/bin/env node
/**
 * Permissões EFETIVAS das roles do Azure RBAC — expande os wildcards.
 *
 * POR QUE EXISTE
 *   `permissionCount` em src/data/azureRbac.ts conta ENTRADAS DA DEFINIÇÃO,
 *   não permissões concedidas. `public/azure-perms/owner.json` é
 *   `[{"action":"*","type":"Actions"}]` — uma entrada. Por isso a Owner
 *   aparecia no site com "1 permissão", empatada com a AcrPull, que de fato
 *   concede uma. Medido em 22/08/2026: 56 das 504 roles marcavam 1, entre elas
 *   Owner, Contributor e Reader, e o máximo do dataset inteiro era 103.
 *   Qualquer ordenação por "menor privilégio" estava invertida.
 *
 *   Este script não substitui nada: emite `effectiveActions` e
 *   `effectiveDataActions` AO LADO. `permissionCount` continua sendo o número
 *   nativo da Microsoft (quantas linhas a definição tem) e continua exatamente
 *   como está. É a mesma regra de "nativo E normalizado" que governa o
 *   `eamLevel` na API — só o normalizado destruiria a volta ao dado do
 *   provedor.
 *
 * O WILDCARD DO AZURE NÃO É GLOB DE SHELL
 *   No Azure o `*` casa QUALQUER sequência, inclusive `/`. Ou seja,
 *   `Microsoft.Authorization/*​/read` casa
 *   `Microsoft.Authorization/roleAssignments/read`, e `*` sozinho casa o
 *   universo inteiro. Por isso a conversão é para regex ancorada
 *   (`^...$`, `.*` no lugar do `*`), case-insensitive. Há um teste disso nas
 *   verificações abaixo, porque é o ponto em que um glob ingênuo erraria.
 *
 * O UNIVERSO TEM MENOS AÇÕES DO QUE CHAVES
 *   `azure-action-descriptions.json` tem 17.605 CHAVES, mas 14 delas são a
 *   mesma ação escrita em dois cases (`Microsoft.App/artifacts/read` e
 *   `microsoft.app/artifacts/read`) — resíduo do merge do lote manual antigo
 *   com o coletor. Distintas, case-insensitive: 17.591 ações e 151 providers,
 *   não 158. Os dois números saem no `_meta`; o que a interface exibe é o
 *   distinto, porque é ele que limita a expansão.
 *
 * O EFETIVO É UM PISO, NÃO O NÚMERO REAL
 *   O universo vem da documentação (learn.microsoft.com/.../permissions/*.md).
 *   A Azure Management API (`providerOperations`) expõe MAIS: um catálogo de
 *   terceiro medido em 22/08 reportava ~23,5 mil operations e 312 providers.
 *   Todo número que sai daqui é limite inferior, e a interface tem de dizer
 *   isso JUNTO do número — é o que fazem o `≥` e o tooltip nas telas do Azure.
 *
 * Uso:
 *   node scripts/build-effective-perms.js              # calcula e grava
 *   node scripts/build-effective-perms.js --dry-run    # só o relatório
 *   node scripts/build-effective-perms.js --verify     # só as verificações
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const UNIVERSE_FILE = path.join(ROOT, 'public', 'azure-action-descriptions.json')
const PERMS_DIR = path.join(ROOT, 'public', 'azure-perms')
const INDEX_FILE = path.join(ROOT, 'public', 'azure-perms-index.json')
const OUT_JSON = path.join(ROOT, 'public', 'azure-effective-perms.json')
const OUT_TS = path.join(ROOT, 'src', 'data', 'azureEffective.ts')

const DRY = process.argv.includes('--dry-run')
const VERIFY_ONLY = process.argv.includes('--verify')

// ── Universo ────────────────────────────────────────────────────────────────

const rawKeys = Object.keys(JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8')))
const UNIVERSE = [...new Set(rawKeys.map((k) => k.toUpperCase()))]
const UNIVERSE_SET = new Set(UNIVERSE)
const PROVIDERS = new Set(UNIVERSE.map((k) => k.split('/')[0]))
const PROVIDERS_RAW = new Set(rawKeys.map((k) => k.split('/')[0]))

// ── Padrão -> regex ancorada ────────────────────────────────────────────────

/** Escapa tudo que é meta em regex, MENOS o `*`, que vira `.*` (casa `/` também). */
function patternToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp('^' + escaped + '$', 'i')
}

/**
 * Conjunto de ações do universo que um padrão casa.
 * Memoizado: as 504 roles compartilham muitos padrões, e sem cache seriam
 * dezenas de milhões de testes de regex.
 */
const matchCache = new Map()
function matchUniverse(pattern) {
  const key = pattern.toUpperCase()
  const hit = matchCache.get(key)
  if (hit) return hit
  let set
  if (!pattern.includes('*')) {
    // Literal: consulta direta no Set, sem varrer as 17,6 mil chaves.
    set = UNIVERSE_SET.has(key) ? new Set([key]) : new Set()
  } else {
    const rx = patternToRegex(pattern)
    set = new Set(UNIVERSE.filter((a) => rx.test(a)))
  }
  matchCache.set(key, set)
  return set
}

/** Aplica padrões a um conjunto JÁ CONCRETO de ações (para NotActions/NotDataActions). */
function matchesWithin(patterns, concreteSet) {
  const out = new Set()
  if (!patterns.length) return out
  const regexes = patterns.map(patternToRegex)
  for (const a of concreteSet) {
    if (regexes.some((rx) => rx.test(a))) out.add(a)
  }
  return out
}

// ── A pergunta do denominador ───────────────────────────────────────────────

/**
 * O store é control plane, data plane, ou os dois? Não dá para responder lendo
 * o arquivo — ele não marca tipo nenhum. A prova tem de vir de fora: as
 * DataActions LITERAIS que as próprias definições declaram são, por
 * construção, data plane. Se elas estão no store, o store tem data plane.
 */
function probePlane(defs) {
  const litData = new Set()
  const litCtrl = new Set()
  for (const perms of defs.values()) {
    for (const p of perms) {
      if (p.action.includes('*')) continue
      if (p.type === 'DataActions') litData.add(p.action.toUpperCase())
      if (p.type === 'Actions') litCtrl.add(p.action.toUpperCase())
    }
  }
  return {
    dataLiterals: litData.size,
    dataInStore: [...litData].filter((a) => UNIVERSE_SET.has(a)).length,
    ctrlLiterals: litCtrl.size,
    ctrlInStore: [...litCtrl].filter((a) => UNIVERSE_SET.has(a)).length,
    // Nenhuma chave carrega marcador de tipo — conferido, não suposto.
    typedKeys: UNIVERSE.filter((k) => /DATAACTION/.test(k)).length,
    // Cobertura de data plane é reconhecidamente parcial: os itens de Cosmos DB
    // não estão no store, então nem heurística por prefixo salvaria.
    cosmosItems: UNIVERSE.filter((k) => k.includes('SQLDATABASES/CONTAINERS/ITEMS')).length,
  }
}

// ── Definições ──────────────────────────────────────────────────────────────

const idx = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
const slugs = idx.slugs

const defs = new Map()
const semArquivo = []
for (const slug of slugs) {
  const f = path.join(PERMS_DIR, slug + '.json')
  if (!fs.existsSync(f)) { semArquivo.push(slug); defs.set(slug, []); continue }
  defs.set(slug, JSON.parse(fs.readFileSync(f, 'utf8')))
}

const plane = probePlane(defs)

// ── Cálculo ─────────────────────────────────────────────────────────────────

const byType = (perms, type) => perms.filter((p) => p.type === type).map((p) => p.action)

function effective(perms) {
  // Control plane: expande Actions contra o universo, subtrai NotActions.
  const allow = new Set()
  for (const a of byType(perms, 'Actions')) for (const m of matchUniverse(a)) allow.add(m)
  const denied = matchesWithin(byType(perms, 'NotActions'), allow)
  for (const d of denied) allow.delete(d)

  // Data plane: SEM DENOMINADOR — ver a resposta no cabeçalho do gerado.
  // Só dá para contar quando toda DataActions é literal: aí o conjunto é
  // exato e não precisa de universo nenhum. Com wildcard, é null — expandir
  // contra as 17.591 contaria control plane como se fosse dado.
  const dataPatterns = byType(perms, 'DataActions')
  const temWildcard = dataPatterns.some((a) => a.includes('*'))
  let effectiveDataActions = null
  let dataBasis = 'unbounded'
  if (!temWildcard) {
    const dataSet = new Set(dataPatterns.map((a) => a.toUpperCase()))
    for (const d of matchesWithin(byType(perms, 'NotDataActions'), dataSet)) dataSet.delete(d)
    effectiveDataActions = dataSet.size
    dataBasis = 'exact'
  }

  return { effectiveActions: allow.size, effectiveDataActions, dataBasis, _allow: allow, _denied: denied }
}

const result = new Map()
for (const slug of slugs) result.set(slug, effective(defs.get(slug)))

// ── Verificação ─────────────────────────────────────────────────────────────

const { AZURE_ROLES } = require('./lib/load-ts.js').loadTs('src/data/azureRbac.ts')
const nativeCount = new Map(AZURE_ROLES.map((r) => [r.slug, r.permissionCount]))

const check = []
const assert = (label, ok, detail) => check.push({ label, ok, detail })

const owner = result.get('owner')
const contributor = result.get('contributor')
const reader = result.get('reader')
const acrpull = result.get('acrpull')

// 1. Owner > Contributor > Reader
assert('Owner > Contributor > Reader',
  owner.effectiveActions > contributor.effectiveActions &&
  contributor.effectiveActions > reader.effectiveActions,
  `${owner.effectiveActions} > ${contributor.effectiveActions} > ${reader.effectiveActions}`)

// 2. Contributor = Owner menos EXATAMENTE os padrões de NotActions dela
const contribNot = byType(defs.get('contributor'), 'NotActions')
const removidas = matchesWithin(contribNot, owner._allow)
const esperado = owner.effectiveActions - removidas.size
assert('Contributor = Owner − NotActions da contributor.json',
  contributor.effectiveActions === esperado &&
  [...contributor._allow].every((a) => owner._allow.has(a)),
  `${owner.effectiveActions} − ${removidas.size} = ${esperado} (calculado: ${contributor.effectiveActions}; ${contribNot.length} padrões de NotActions)`)

// 3. Reader ≈ o subconjunto que termina em /read
const universoRead = UNIVERSE.filter((a) => a.endsWith('/READ')).length
const foraDoPadrao = [...reader._allow].filter((a) => !a.endsWith('/READ'))
assert('Reader ≈ subconjunto terminado em /read',
  foraDoPadrao.length === 0 && reader.effectiveActions === universoRead,
  `${reader.effectiveActions} de ${universoRead} ações /read do universo; ${foraDoPadrao.length} fora do padrão`)

// 4. AcrPull continua 1 — a definição dela é literal, sem wildcard
assert('AcrPull continua 1',
  acrpull.effectiveActions === 1,
  `effectiveActions=${acrpull.effectiveActions}, permissionCount=${nativeCount.get('acrpull')}`)

// 5. As roles que hoje marcam permissionCount 1 não continuam todas em 1
const um = slugs.filter((s) => nativeCount.get(s) === 1)
const umDepois = um.filter((s) => result.get(s).effectiveActions === 1)
assert('As roles de permissionCount 1 não continuam todas em 1',
  umDepois.length < um.length,
  `${um.length} com permissionCount 1 → ${umDepois.length} continuam com effectiveActions 1 (${um.length - umDepois.length} mudaram)`)

// 6. Sanidade do motor: `*` casa o universo inteiro, e o `*` atravessa `/`
const cruzaBarra = patternToRegex('Microsoft.Authorization/*/read')
  .test('MICROSOFT.AUTHORIZATION/ROLEASSIGNMENTS/READ')
assert('Motor: `*` casa o universo inteiro e atravessa `/`',
  owner.effectiveActions === UNIVERSE.length && cruzaBarra,
  `Owner=${owner.effectiveActions} de ${UNIVERSE.length} ações distintas; Microsoft.Authorization/*​/read casa roleAssignments/read: ${cruzaBarra}`)

// ── Relatório ───────────────────────────────────────────────────────────────

const maxNative = Math.max(...slugs.map((s) => nativeCount.get(s) ?? 0))
const maxEff = Math.max(...slugs.map((s) => result.get(s).effectiveActions))
const semDenominador = slugs.filter((s) => result.get(s).effectiveDataActions === null).length

console.log('')
console.log(`Universo: ${rawKeys.length} chaves → ${UNIVERSE.length} ações distintas (case-insensitive), ${PROVIDERS.size} providers distintos (${PROVIDERS_RAW.size} chaves de provider).`)
console.log(`Plano: ${plane.dataInStore}/${plane.dataLiterals} DataActions literais das definições estão no store; ${plane.typedKeys} chaves com marcador de tipo; ${plane.cosmosItems} ações de item de Cosmos DB.`)
console.log(`Roles: ${slugs.length}${semArquivo.length ? ` (${semArquivo.length} sem arquivo de permissões)` : ''}. Máximo permissionCount ${maxNative} → máximo effectiveActions ${maxEff}.`)
console.log(`effectiveDataActions null (wildcard em DataActions): ${semDenominador} roles.`)
console.log('')
for (const c of check) console.log(`  ${c.ok ? 'OK   ' : 'FALHA'} ${c.label}\n        ${c.detail}`)
console.log('')

if (check.some((c) => !c.ok)) process.exitCode = 1
if (VERIFY_ONLY) return

// ── Saída ───────────────────────────────────────────────────────────────────

const RESPOSTA_PLANO = [
  'O store MISTURA control plane e data plane — e NÃO marca qual é qual.',
  '',
  'Prova, não leitura: das ' + plane.dataLiterals + ' DataActions literais declaradas pelas ' + slugs.length + ' definições',
  'de role, ' + plane.dataInStore + ' estão no store (' + ((100 * plane.dataInStore) / plane.dataLiterals).toFixed(1) + '%) — inclusive',
  'MICROSOFT.STORAGE/STORAGEACCOUNTS/BLOBSERVICES/CONTAINERS/BLOBS/READ, que é data plane puro.',
  'Ao mesmo tempo ' + plane.ctrlInStore + ' das ' + plane.ctrlLiterals + ' Actions literais também estão lá. E ' + plane.typedKeys + ' chaves',
  'carregam marcador de tipo: a fonte (learn.microsoft.com/.../permissions/*.md) publica as duas',
  'famílias na mesma tabela, sem coluna que as separe.',
  '',
  'CONSEQUÊNCIA: não existe subconjunto que sirva de denominador para o data plane.',
  'Expandir `DataActions: *` contra as ' + UNIVERSE.length + ' contaria operação de control plane como se',
  'fosse de dados — seria número inventado. Pior: a cobertura de data plane no store é',
  'reconhecidamente parcial (os itens de Cosmos DB, .../SQLDATABASES/CONTAINERS/ITEMS/*,',
  'têm exatamente ' + plane.cosmosItems + ' entradas no store), então nem heurística por prefixo salvaria.',
  '',
  'POR ISSO: `effectiveDataActions` é `null` sempre que a role tem wildcard em DataActions',
  '(' + semDenominador + ' das ' + slugs.length + ' roles), com `dataBasis: "unbounded"`. Quando toda DataActions é literal,',
  'o conjunto é EXATO e não precisa de universo nenhum — aí o campo traz o número, com',
  '`dataBasis: "exact"`. Nenhum número é estimado.',
].join('\n')

const now = new Date().toISOString()

const payload = {
  _meta: {
    generatedAt: now,
    generatedBy: 'scripts/build-effective-perms.js',
    classification: 'iamscope-derived',
    universeKeys: rawKeys.length,
    universeActions: UNIVERSE.length,
    universeProviders: PROVIDERS.size,
    universeProviderKeys: PROVIDERS_RAW.size,
    universeNote:
      'universeKeys conta as chaves do arquivo; universeActions desconta ' + (rawKeys.length - UNIVERSE.length) +
      ' pares que são a mesma ação em dois cases. A expansão usa o distinto.',
    universeSource:
      'public/azure-action-descriptions.json (MicrosoftDocs/azure-docs → role-based-access-control/permissions/*.md)',
    isFloor: true,
    floorNote:
      'Limite INFERIOR. O universo vem da documentação; a Azure Management API (providerOperations) expõe mais ações e mais providers. Nenhum número daqui é o total real.',
    planeAnswer: RESPOSTA_PLANO,
    dataPlaneDenominator: null,
    rolesWithoutDataDenominator: semDenominador,
    note:
      'permissionCount (nativo: entradas da definição) continua em src/data/azureRbac.ts e não é alterado por este script.',
    checks: check.map((c) => ({ label: c.label, ok: c.ok, detail: c.detail })),
  },
  roles: {},
}
for (const slug of slugs) {
  const r = result.get(slug)
  payload.roles[slug] = {
    permissionCount: nativeCount.get(slug) ?? null,
    effectiveActions: r.effectiveActions,
    effectiveDataActions: r.effectiveDataActions,
    dataBasis: r.dataBasis,
  }
}

const L = []
L.push('// AUTO-GERADO por scripts/build-effective-perms.js — não editar à mão.')
L.push('// Gerado em: ' + now)
L.push('//')
L.push('// PERMISSÕES EFETIVAS DO AZURE RBAC — os wildcards expandidos.')
L.push('//')
L.push('// `permissionCount`, em src/data/azureRbac.ts, conta ENTRADAS DA DEFINIÇÃO.')
L.push('// A Owner é `[{"action":"*"}]`: uma entrada, e por isso aparecia com 1, empatada')
L.push('// com a AcrPull. Este arquivo entra AO LADO — o nativo continua intacto.')
L.push('//')
L.push('// ── A PERGUNTA DO DENOMINADOR ─────────────────────────────────────────────')
L.push('//')
for (const l of RESPOSTA_PLANO.split('\n')) L.push(('// ' + l).trimEnd())
L.push('//')
L.push('// ── O NÚMERO É UM PISO ────────────────────────────────────────────────────')
L.push('//')
L.push('// Universo: ' + UNIVERSE.length + ' ações distintas em ' + PROVIDERS.size + ' providers, colhidas da DOCUMENTAÇÃO')
L.push('// (' + rawKeys.length + ' chaves no arquivo; ' + (rawKeys.length - UNIVERSE.length) + ' são a mesma ação em dois cases).')
L.push('// A Azure Management API expõe mais. Todo effectiveActions é limite INFERIOR, e a')
L.push('// interface exibe isso junto do número — o `≥` e o tooltip —, não só aqui.')
L.push('')
L.push('export interface AzureEffective {')
L.push('  /** Ações de control plane concedidas: Actions expandidas, NotActions subtraídas. É um piso. */')
L.push('  effectiveActions: number')
L.push('  /** Ações de data plane. `null` quando a definição tem wildcard — não há universo de data plane para servir de denominador. */')
L.push('  effectiveDataActions: number | null')
L.push("  /** 'exact' = contagem fechada, sem universo envolvido. 'unbounded' = wildcard sem denominador. */")
L.push("  dataBasis: 'exact' | 'unbounded'")
L.push('}')
L.push('')
L.push('/** Universo da expansão. Sai daqui para a tela — nunca escrito no texto da interface. */')
L.push('export const AZURE_EFFECTIVE_UNIVERSE = {')
L.push('  /** Ações distintas, case-insensitive. É o teto de qualquer effectiveActions. */')
L.push('  actions: ' + UNIVERSE.length + ',')
L.push('  providers: ' + PROVIDERS.size + ',')
L.push('  /** Chaves cruas do arquivo de descrições, antes de juntar os dois cases. */')
L.push('  keys: ' + rawKeys.length + ',')
L.push('  isFloor: true as const,')
L.push('}')
L.push('')
L.push('export const AZURE_EFFECTIVE: Record<string, AzureEffective> = {')
for (const slug of slugs) {
  const r = result.get(slug)
  L.push("  '" + slug + "': { effectiveActions: " + r.effectiveActions +
    ', effectiveDataActions: ' + (r.effectiveDataActions === null ? 'null' : r.effectiveDataActions) +
    ", dataBasis: '" + r.dataBasis + "' },")
}
L.push('}')
L.push('')
L.push('/** Efetivo de uma role, ou `undefined` se o slug não estiver no dataset. */')
L.push('export function azureEffective(slug: string): AzureEffective | undefined {')
L.push('  return AZURE_EFFECTIVE[slug]')
L.push('}')
L.push('')

if (DRY) {
  console.log('--dry-run: nada gravado.\n')
  console.log(RESPOSTA_PLANO)
} else {
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n')
  fs.writeFileSync(OUT_TS, L.join('\n'))
  console.log('Gravado: public/azure-effective-perms.json e src/data/azureEffective.ts')
}
