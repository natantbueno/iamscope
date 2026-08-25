#!/usr/bin/env node
/**
 * Grava o estado do catálogo de uma nuvem em data/snapshots/{cloud}/{data}.json.
 *
 * ONDE ENTRA NO PIPELINE
 *   Depois do coletor e de build-counts.js, junto dos outros derivados. Ele lê
 *   os DATASETS (src/data/*.ts e public/*.json), não a rede — de propósito:
 *
 *   1. fetch-aws-policies-official.js e fetch-gcp-roles-from-docs.js levam 403
 *      no container. Se o snapshot dependesse do coletor, AWS e GCP nunca
 *      teriam histórico fora da máquina do Natan. Lendo o dataset, a coleta
 *      roda onde tem que rodar e o snapshot roda em qualquer lugar.
 *   2. Não é preciso mexer nos oito coletores. O único que ganha uma linha é o
 *      do Azure, e só para declarar as páginas que falharam (ver COBERTURA).
 *
 * SÓ GRAVA QUANDO MUDA
 *   Um arquivo por dia por nuvem, com o catálogo inteiro, custaria ~500 KB/dia
 *   de conteúdo quase idêntico. Em vez disso:
 *
 *     - TODA execução vira uma linha em data/snapshots/{cloud}/runs.jsonl
 *       (~100 bytes). É o que prova "N varreduras, M mudanças" — a evidência
 *       de que o catálogo foi olhado e estava igual.
 *     - Um {data}.json só nasce quando o hash agregado de alguma coleção
 *       difere do último snapshot.
 *     - Dentro do arquivo, coleção que não mudou vira { unchanged, since } e
 *       aponta para o snapshot onde ela está por extenso. Assim uma mudança
 *       nas 17.605 actions do Azure não reescreve as 504 roles, e vice-versa.
 *
 *   build-changelog.js resolve as referências `since` ao caminhar a cadeia.
 *
 * COBERTURA — a armadilha que faz um changelog mentir
 *   fetch-azure-roles-official.js reporta HTTP 404 em três páginas
 *   (mixed-reality, virtual-desktop-infrastructure, other) e MESMO ASSIM
 *   reescreve azureRbac.ts. Se essas páginas um dia contiverem roles que só
 *   elas listam, o dataset encolhe e o snapshot registra o encolhimento — e o
 *   changelog anunciaria uma exclusão em massa que nunca aconteceu.
 *
 *   Duas defesas, independentes de propósito:
 *
 *     a) data/collector-health.json — o coletor declara o que não conseguiu
 *        ler. Vira `coverage: { complete: false, missing: [...] }` na coleção,
 *        e build-changelog.js recusa emitir `removida` a partir dela.
 *     b) O limiar de remoção em massa de build-changelog.js, que vale mesmo
 *        quando nenhum coletor declarou nada. É a defesa que funciona hoje,
 *        sem depender de os oito coletores cooperarem.
 *
 * Uso:
 *   node scripts/build-snapshot.js                 # todas as nuvens
 *   node scripts/build-snapshot.js --cloud=gcp     # uma só
 *   node scripts/build-snapshot.js --dry-run       # relatório, nada escrito
 *   node scripts/build-snapshot.js --date=2026-08-24
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')
const S = require('./lib/snapshot-schema')

const ROOT = path.join(__dirname, '..')
const SNAP_DIR = path.join(ROOT, 'data', 'snapshots')
const HEALTH = path.join(ROOT, 'data', 'collector-health.json')
const PUBLIC = path.join(ROOT, 'public')

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
const arg = (name) => (argv.find((a) => a.startsWith(`--${name}=`)) ?? '').split('=')[1] || null
const ONLY = arg('cloud')
const DATE = arg('date') ?? new Date().toISOString().slice(0, 10)

const readJson = (p, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

// ── Índice de SoD: slug → ids das regras que o citam ─────────────────────────
// É o que permite emitir "entrou/saiu de uma regra de SoD", evento que nenhum
// catálogo de provedor tem como publicar porque as 190 regras são nossas.
function buildSodIndex() {
  const { SOD_RULES } = loadTs('src/data/sod/rules.ts')
  const idx = {}
  for (const rule of SOD_RULES) {
    for (const ref of [rule.roleA, rule.roleB]) {
      // ref.cloud guarda a PLATAFORMA (nome histórico do campo), e ref.id o slug.
      const cloud = S.SOD_PLATFORM_TO_CLOUD[ref.cloud]
      if (!cloud) continue
      ;((idx[cloud] ??= {})[ref.id] ??= []).push(rule.id)
    }
  }
  return idx
}

/** Inverte um índice ação→[i] em slug→[ações], como os de public/*-index.json. */
function permsBySlug(index, slugs, prefix = '') {
  const out = new Map(slugs.map((s) => [s, []]))
  for (const [action, refs] of Object.entries(index)) {
    for (const i of refs) {
      const slug = slugs[i]
      if (slug !== undefined) out.get(slug).push(prefix + action)
    }
  }
  return out
}

// ── Extratores por nuvem ─────────────────────────────────────────────────────
// Cada um devolve { [collectionId]: item[] }. Nada aqui vai à rede.

function extractEntraId(sod) {
  const { ROLES } = loadTs('src/data/roles.ts')
  const { API_PERMISSIONS } = loadTs('src/data/apiPermissions.ts')
  return {
    roles: ROLES.map((r) => S.roleRecord({
      id: r.slug, name: r.name, description: r.description,
      tier: r.eamTier, category: r.category, isPrivileged: r.isPrivileged,
      perms: (r.permissions ?? []).map((p) => p.action),
      sod: sod.entraid?.[r.slug],
    })),
    // A permission do Graph não tem lista de permissões: ela É a folha. `perms`
    // fica null (a fonte não publica lista), não [] (lista vazia declarada).
    'api-permissions': API_PERMISSIONS.map((p) => S.roleRecord({
      id: `${p.type}:${p.name}`, name: p.name, description: p.description,
      tier: p.eamTier, category: p.category,
      isPrivileged: p.eamTier === 'ControlPlane',
      perms: null,
    })),
  }
}

function extractAzureRbac(sod) {
  const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')
  const idx = readJson(path.join(PUBLIC, 'azure-perms-index.json'))
  let perms = new Map()
  if (idx) {
    perms = permsBySlug(idx.index, idx.slugs)
    // NotActions entram com '!' na frente. Mover uma action de Actions para
    // NotActions não muda a CONTAGEM e inverte o efeito — sem o prefixo, o
    // hash não veria a diferença.
    for (const [action, refs] of Object.entries(idx.denied ?? {})) {
      for (const i of refs) perms.get(idx.slugs[i])?.push(`!${action}`)
    }
  }
  const descs = readJson(path.join(PUBLIC, 'azure-action-descriptions.json'), {})
  return {
    roles: AZURE_ROLES.map((r) => S.roleRecord({
      id: r.slug, name: r.name, description: r.description,
      tier: r.tier, category: r.category, isPrivileged: r.isPrivileged,
      perms: perms.get(r.slug) ?? null,
      sod: sod['azure-rbac']?.[r.slug],
    })),
    actions: Object.entries(descs).map(([action, desc]) =>
      S.leafRecord({ id: action, name: action, description: desc })),
  }
}

function extractAws(sod) {
  const { AWS_POLICIES } = loadTs('src/data/aws.ts')
  const idx = readJson(path.join(PUBLIC, 'aws-actions-index.json'))
  let perms = new Map()
  if (idx) {
    perms = permsBySlug(idx.index, idx.slugs)
    for (const [action, refs] of Object.entries(idx.denied ?? {})) {
      for (const i of refs) perms.get(idx.slugs[i])?.push(`!${action}`)
    }
  }
  return {
    policies: AWS_POLICIES.map((p) => S.roleRecord({
      id: p.slug, name: p.name, description: p.description,
      tier: p.tier, category: p.category, isPrivileged: p.isPrivileged,
      perms: perms.get(p.slug) ?? null,
      sod: sod.aws?.[p.slug],
    })),
    // Sem descrição: o índice da AWS lista as actions usadas pelas policies e
    // não publica texto para elas. Só nascimento e morte de action são
    // detectáveis aqui, e é honesto que seja assim.
    actions: Object.keys(idx?.index ?? {}).map((a) =>
      S.leafRecord({ id: a, name: a, description: null })),
  }
}

function extractGcp(sod) {
  const { GCP_ROLES } = loadTs('src/data/gcp.ts')
  const idx = readJson(path.join(PUBLIC, 'gcp-perms-index.json'))
  const perms = idx ? permsBySlug(idx.index, idx.slugs) : new Map()
  return {
    roles: GCP_ROLES.map((r) => S.roleRecord({
      id: r.slug, name: r.name, description: r.description,
      tier: r.tier, category: r.category, isPrivileged: r.isPrivileged,
      // As basic roles têm permissionCount 0 porque o Google não publica a
      // lista. `null` diz "não publicada"; `[]` diria "publicada e vazia".
      perms: r.permissionsNote ? null : (perms.get(r.slug) ?? null),
      sod: sod.gcp?.[r.slug],
    })),
    permissions: Object.keys(idx?.index ?? {}).map((p) =>
      S.leafRecord({ id: p, name: p, description: null })),
  }
}

function extractGoogleWorkspace(sod) {
  const gws = loadTs('src/data/googleWorkspace.ts')
  return {
    roles: gws.GWS_ROLES.map((r) => S.roleRecord({
      id: r.slug, name: r.name, description: r.description,
      tier: r.tier, category: r.category, isPrivileged: r.isPrivileged,
      perms: r.privileges ?? null,
      sod: sod['google-workspace']?.[r.slug],
    })),
    privileges: gws.GWS_PRIVILEGES.map((p) =>
      S.leafRecord({ id: p.slug, name: p.name, description: p.description })),
  }
}

function extractIbmCloud() {
  const ibm = loadTs('src/data/ibmCloud.ts')
  return {
    roles: ibm.IBM_ROLES.map((r) => S.roleRecord({
      id: r.slug, name: r.name, description: r.description,
      tier: r.tier, category: r.category, isPrivileged: r.isPrivileged,
      // `actions: []` é vazio DE PROPÓSITO no dataset — a IBM mapeia ação por
      // serviço, não por role. Vira null: lista ausente, não lista vazia.
      perms: null,
      // IBM não tem regra de SoD (decisão de 07/08/2026): o SoD real dela vive
      // nas 71 permissões clássicas, que não são roles.
    })),
    'classic-permissions': ibm.IBM_CLASSIC_PERMISSIONS.map((p) =>
      S.leafRecord({ id: `${p.category}/${p.name}`, name: p.name, description: p.description })),
  }
}

const EXTRACTORS = {
  'entraid': extractEntraId,
  'azure-rbac': extractAzureRbac,
  'aws': extractAws,
  'gcp': extractGcp,
  'google-workspace': extractGoogleWorkspace,
  'ibm-cloud': extractIbmCloud,
}

// ── Leitura da cadeia de snapshots ───────────────────────────────────────────

/** Datas dos snapshots de uma nuvem, em ordem crescente. */
function snapshotDates(cloud) {
  const dir = path.join(SNAP_DIR, cloud)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.slice(0, -5))
    .sort()
}

const readSnapshot = (cloud, date) =>
  readJson(path.join(SNAP_DIR, cloud, `${date}.json`))

/**
 * Resolve uma coleção seguindo as referências `unchanged/since` até achar o
 * arquivo que a guarda por extenso. Devolve null se a cadeia quebrar — o que
 * build-changelog.js trata como desconhecido, nunca como coleção vazia.
 */
function resolveCollection(cloud, date, collId, depth = 0) {
  if (depth > 400) return null
  const snap = readSnapshot(cloud, date)
  const coll = snap?.collections?.[collId]
  if (!coll) return null
  if (coll.unchanged) {
    if (!coll.since || coll.since === date) return null
    return resolveCollection(cloud, coll.since, collId, depth + 1)
  }
  return { ...coll, resolvedFrom: date }
}

// ── Escrita ──────────────────────────────────────────────────────────────────

function writeSnapshot(cloud, date, collections) {
  const dir = path.join(SNAP_DIR, cloud)
  fs.mkdirSync(dir, { recursive: true })
  const parts = Object.entries(collections).map(([id, c]) => {
    const head = { ...c }
    delete head.items
    const body = c.items ? `,\n    "items": ${S.serializeItems(c.items).replace(/\n/g, '\n    ')}` : ''
    const headJson = Object.entries(head)
      .map(([k, v]) => `      ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')
    return `    ${JSON.stringify(id)}: {\n${headJson}${body}\n    }`
  })
  const doc = `{
  "schema": 1,
  "cloud": ${JSON.stringify(cloud)},
  "date": ${JSON.stringify(date)},
  "generatedAt": ${JSON.stringify(new Date().toISOString())},
  "collections": {
${parts.join(',\n')}
  }
}
`
  fs.writeFileSync(path.join(dir, `${date}.json`), doc)
  return doc.length
}

function appendRun(cloud, entry) {
  const dir = path.join(SNAP_DIR, cloud)
  fs.mkdirSync(dir, { recursive: true })
  fs.appendFileSync(path.join(dir, 'runs.jsonl'), `${JSON.stringify(entry)}\n`)
}

// ── Principal ────────────────────────────────────────────────────────────────

function run() {
  const sod = buildSodIndex()
  const health = readJson(HEALTH, {})
  const clouds = ONLY ? [ONLY] : S.CLOUDS
  let anyWritten = false

  for (const cloud of clouds) {
    if (!EXTRACTORS[cloud]) { console.error(`nuvem desconhecida: ${cloud}`); process.exitCode = 1; continue }
    const extracted = EXTRACTORS[cloud](sod)
    const dates = snapshotDates(cloud)
    const prevDate = dates.filter((d) => d < DATE).pop() ?? null
    const genesis = prevDate === null

    const collections = {}
    const changed = []
    for (const meta of S.COLLECTIONS[cloud]) {
      const items = extracted[meta.id] ?? []
      const hash = S.collectionHash(items)
      const prev = prevDate ? resolveCollection(cloud, prevDate, meta.id) : null
      const coverage = health[cloud]?.[meta.id] ?? { complete: true }

      // Coleção que não mudou E que estava completa antes vira referência.
      // Se a cobertura mudou (o coletor falhou hoje e não falhou antes), grava
      // por extenso mesmo com o hash igual: a mudança de cobertura é fato que
      // o changelog precisa enxergar.
      const sameHash = prev && prev.hash === hash
      const sameCoverage = prev && JSON.stringify(prev.coverage ?? { complete: true }) === JSON.stringify(coverage)
      if (sameHash && sameCoverage) {
        collections[meta.id] = {
          unchanged: true, since: prev.resolvedFrom, hash, count: items.length,
        }
        continue
      }
      changed.push(meta.id)
      collections[meta.id] = {
        label: meta.label, kind: meta.kind, route: meta.route,
        count: items.length, hash, coverage, items,
      }
    }

    const runEntry = {
      date: DATE, at: new Date().toISOString(),
      counts: Object.fromEntries(S.COLLECTIONS[cloud].map((m) => [m.id, (extracted[m.id] ?? []).length])),
      hashes: Object.fromEntries(S.COLLECTIONS[cloud].map((m) => [m.id, S.collectionHash(extracted[m.id] ?? [])])),
      changed,
      snapshot: changed.length > 0,
    }

    const rotulo = `${S.CLOUD_LABEL[cloud]} (${cloud})`
    if (changed.length === 0) {
      console.log(`${rotulo}: sem mudança — ${genesis ? 'nada a gravar' : `igual a ${prevDate}`}`)
      if (!DRY) appendRun(cloud, runEntry)
      continue
    }

    if (DRY) {
      console.log(`${rotulo}: ${genesis ? 'GENESIS' : 'mudou'} — coleções: ${changed.join(', ')}`)
      for (const id of changed) {
        const prev = prevDate ? resolveCollection(cloud, prevDate, id) : null
        console.log(`   ${id}: ${prev ? `${prev.count} → ` : ''}${collections[id].count} itens`
          + (collections[id].coverage.complete === false ? '  [COBERTURA PARCIAL]' : ''))
      }
      continue
    }

    const bytes = writeSnapshot(cloud, DATE, collections)
    appendRun(cloud, runEntry)
    anyWritten = true
    console.log(`${rotulo}: gravado data/snapshots/${cloud}/${DATE}.json `
      + `(${(bytes / 1024).toFixed(0)} KB; ${changed.join(', ')})`)
    for (const id of changed) {
      if (collections[id].coverage.complete === false) {
        console.log(`   AVISO — cobertura parcial em '${id}': faltou ${collections[id].coverage.missing?.join(', ')}. `
          + 'build-changelog.js não vai emitir remoção a partir desta coleção.')
      }
    }
  }

  if (DRY) console.log('\n--dry-run: nada escrito.')
  else if (anyWritten) console.log('\nAgora rode:  node scripts/build-changelog.js')
}

module.exports = { snapshotDates, readSnapshot, resolveCollection }

if (require.main === module) {
  try { run() } catch (e) {
    console.error('\nFALHOU:', e.message)
    process.exitCode = 1
  }
}
