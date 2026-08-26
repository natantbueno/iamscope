'use strict'
/**
 * Gera a API pública estática em public/api/v1/.
 *
 * Roda ANTES do `next build` (ver o script "build" do package.json), porque a
 * saída precisa estar em public/ para o export estático levar para out/.
 *
 * A PASTA public/api/ ESTÁ NO .gitignore, DE PROPÓSITO
 *   São ~6 MB derivados de src/data/ e public/*.json. Versionar isso dobraria
 *   o peso de cada coleta no histórico sem acrescentar informação: o conteúdo
 *   é 100% reproduzível a partir do que já está no repositório. A Vercel gera
 *   no deploy.
 *
 * O CONTRATO É docs/API.md
 *   Cada campo emitido aqui está documentado lá, e o
 *   scripts/check-api-contract.js quebra o build se os dois divergirem. Ao
 *   mexer neste arquivo, mexa nos três.
 *
 * POR QUE generatedAt SÓ EXISTE NO index.json
 *   Se o carimbo de tempo entrasse no envelope de cada arquivo, o sha256 de
 *   todos eles mudaria a cada build, mesmo sem mudança de dado — e o manifesto
 *   perderia a única função que justifica ele existir, que é dizer ao
 *   consumidor o que NÃO precisa baixar de novo.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { loadTs, ROOT } = require('./lib/load-ts')

const OUT = path.join(ROOT, 'public', 'api', 'v1')
const SITE = 'https://iamscope.cloud'
const API_VERSION = 'v1'
const LICENSE = 'CC-BY-4.0'
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
const ATTRIBUTION = 'IAM Scope — https://iamscope.cloud'

// A classificação de risco é editorial nossa e precisa dizer isso em cada
// arquivo. Ver docs/API.md, seção "Classification is editorial".
const CLASSIFICATION = 'iamscope-editorial'

const log = (...a) => console.log('[build-api]', ...a)

// ── datasets ─────────────────────────────────────────────────────────────────
const { ROLES: ENTRA_ROLES } = loadTs('src/data/roles.ts')
const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')
const { AWS_POLICIES } = loadTs('src/data/aws.ts')
const { GCP_ROLES } = loadTs('src/data/gcp.ts')
const { GWS_ROLES } = loadTs('src/data/googleWorkspace.ts')
const { IBM_ROLES } = loadTs('src/data/ibmCloud.ts')
const { API_PERMISSIONS } = loadTs('src/data/apiPermissions.ts')
const { DATA_SYNC } = loadTs('src/data/syncMeta.ts')
const LEVEL = loadTs('src/lib/eamLevels.ts')
const TIER_META = loadTs('src/data/tierMeta.ts')
const COUNTS = loadTs('src/data/counts.ts')

const syncById = Object.fromEntries(DATA_SYNC.map((s) => [s.id, s]))

function readPublicJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'public', name), 'utf8'))
}

// ── plataformas ──────────────────────────────────────────────────────────────
// Um objeto por plataforma com tudo que difere entre elas. O mapeamento de
// registro é o mesmo para todas; o que muda mora aqui.
const PLATFORMS = [
  {
    key: 'entra',
    kind: 'role',
    rows: ENTRA_ROLES,
    syncId: 'entra-directory-roles',
    levels: LEVEL.ENTRA_TIER_LEVEL,
    url: (r) => `${SITE}/entraid/roles/${r.slug}/`,
    id: (r) => r.id,
    tier: (r) => r.eamTier,
    permCount: (r) => r.permissionCount,
    // templateId é o mesmo GUID do id no Entra; tierSource diz de onde veio a
    // classificação daquela linha (curadoria, herança ou tabela do script).
    block: (r) => ({ templateId: r.id, tierSource: r.tierSource || 'entraops' }),
    // O array completo de permissões só vai no arquivo da plataforma.
    detail: (r) => ({ permissions: r.permissions.map((p) => ({ action: p.action, category: p.category, tier: p.tier })) }),
  },
  {
    key: 'azure',
    kind: 'role',
    rows: AZURE_ROLES,
    syncId: 'azure-rbac-roles',
    levels: LEVEL.AZURE_TIER_LEVEL,
    url: (r) => `${SITE}/azure-rbac/roles/${r.slug}/`,
    id: (r) => r.id,
    tier: (r) => r.tier,
    permCount: (r) => r.permissionCount,
    block: (r) => ({ assignableScopes: r.assignableScopes || [] }),
    detail: (r) => ({ permissions: (r.permissions || []).map((p) => ({ action: p.action, type: p.type })) }),
  },
  {
    key: 'aws',
    kind: 'managed-policy',
    rows: AWS_POLICIES,
    syncId: 'aws-policies',
    levels: LEVEL.AWS_TIER_LEVEL,
    url: (r) => `${SITE}/aws/policies/${r.slug}/`,
    id: (r) => r.arn,
    tier: (r) => r.tier,
    permCount: (r) => r.actionCount,
    block: (r) => ({
      arn: r.arn,
      policyType: r.type,
      scope: r.scope,
      version: r.version || null,
      createdAt: r.createdAt || null,
      editedAt: r.editedAt || null,
      officialType: r.officialType || null,
    }),
    // As actions da AWS vivem em public/aws-policy-docs/<slug>.json, fora do
    // bundle. Quem precisa delas usa permissions/aws.json.
    detail: () => ({}),
  },
  {
    key: 'gcp',
    kind: 'role',
    rows: GCP_ROLES,
    syncId: 'gcp-roles',
    levels: LEVEL.GCP_TIER_LEVEL,
    url: (r) => `${SITE}/gcp/roles/${r.slug}/`,
    id: (r) => r.roleId,
    tier: (r) => r.tier,
    permCount: (r) => r.permissionCount,
    block: (r) => ({
      roleId: r.roleId,
      scope: r.scope,
      stage: r.stage || null,
      lowestResources: r.lowestResources || null,
    }),
    detail: () => ({}),
  },
  {
    key: 'workspace',
    kind: 'role',
    rows: GWS_ROLES,
    syncId: 'gws-roles',
    levels: LEVEL.GWS_TIER_LEVEL,
    url: (r) => `${SITE}/google-workspace/roles/${r.slug}/`,
    // O Workspace não publica identificador estável para as admin roles: o
    // slug é o que temos, e é estável dentro da v1. Registrado em meta/tiers.
    id: (r) => r.slug,
    tier: (r) => r.tier,
    permCount: (r) => (r.privileges || []).length,
    block: (r) => ({
      privileges: r.privileges || [],
      apiPrivileges: r.apiPrivileges || null,
      apiPrivilegesComplete: r.apiPrivilegesComplete === true,
    }),
    detail: () => ({}),
  },
  {
    key: 'ibm',
    kind: 'role',
    rows: IBM_ROLES,
    syncId: 'ibm-roles',
    levels: LEVEL.IBM_TIER_LEVEL,
    url: (r) => `${SITE}/ibm-cloud/roles/${r.slug}/`,
    id: (r) => r.slug, // idem Workspace
    tier: (r) => r.tier,
    // A IBM não publica a lista de ações das roles de plataforma: os 7 arrays
    // vêm vazios da fonte. Documentado em docs/API.md, "Known data limits".
    permCount: (r) => (r.actions || []).length,
    block: (r) => ({ accessModel: r.accessModel, roleKind: r.kind }),
    detail: (r) => ({ permissions: (r.actions || []).map((a) => ({ action: a })) }),
  },
]

// ── mapeamento de um registro ────────────────────────────────────────────────
function toRecord(p, r) {
  const sync = syncById[p.syncId]
  const nativeTier = p.tier(r)
  const level = p.levels[nativeTier]

  return {
    platform: p.key,
    kind: p.kind,
    id: p.id(r),
    slug: r.slug,
    name: r.name,
    description: r.description || '',

    nativeTier,
    // `undefined` viraria campo ausente no JSON; o contrato diz que eamLevel
    // sempre existe, e que null significa "não classificado".
    eamLevel: level === undefined ? null : level,
    category: r.category,
    isPrivileged: r.isPrivileged === true,
    permissionCount: p.permCount(r),
    deprecated: r.deprecated === true,

    url: p.url(r),
    source: sync.sourceUrl,
    lastSynced: sync.lastSynced,

    [p.key]: p.block(r),
  }
}

function envelope(extra) {
  return {
    apiVersion: API_VERSION,
    classification: CLASSIFICATION,
    license: LICENSE,
    licenseUrl: LICENSE_URL,
    attribution: ATTRIBUTION,
    ...extra,
  }
}

// ── escrita ──────────────────────────────────────────────────────────────────
const written = []

function write(rel, obj, count, lastSynced) {
  const file = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const body = Buffer.from(JSON.stringify(obj), 'utf8')
  fs.writeFileSync(file, body)
  written.push({
    path: rel,
    bytes: body.length,
    sha256: crypto.createHash('sha256').update(body).digest('hex'),
    count: count === undefined ? null : count,
    lastSynced: lastSynced || null,
  })
  log(`${rel.padEnd(28)} ${String(count ?? '-').padStart(6)} registros  ${(body.length / 1024).toFixed(0)} KB`)
}

// Este script NÃO é o único dono de public/api/v1/: o build-changelog.js
// escreve changes.json no mesmo diretório. Apagar a pasta inteira levaria o
// arquivo dele junto, e o estrago só apareceria em produção. Então limpamos
// apenas o que este script escreve.
// Só as PASTAS precisam ser limpas, para não sobrar arquivo de uma versão
// anterior que não é mais emitido. O index.json não entra na lista porque é
// reescrito por inteiro no fim — apagar antes só criaria uma janela em que ele
// não existe.
const MINHAS_PASTAS = ['roles', 'permissions', 'meta']

function limparSaidaPropria() {
  fs.mkdirSync(OUT, { recursive: true })
  for (const nome of MINHAS_PASTAS) {
    try {
      fs.rmSync(path.join(OUT, nome), { recursive: true, force: true })
    } catch (e) {
      // Em sistema de arquivos que recusa unlink (o mount do ambiente remoto,
      // por exemplo), seguir em frente é melhor que abortar: writeFileSync
      // trunca e reescreve, e o check-api-contract pega qualquer sobra.
      log(`aviso: nao consegui limpar ${nome}/ (${e.code}); os arquivos serao sobrescritos`)
    }
  }
  const alheios = fs.readdirSync(OUT).filter((n) => !MINHAS_PASTAS.includes(n) && n !== 'index.json')
  if (alheios.length) log(`preservado em api/v1/ (de outro gerador): ${alheios.join(', ')}`)
}

function main() {
  limparSaidaPropria()

  // roles/<plataforma>.json — com o array de permissões quando existir
  const todos = []
  for (const p of PLATFORMS) {
    const sync = syncById[p.syncId]
    const items = p.rows.map((r) => ({ ...toRecord(p, r), ...p.detail(r) }))
    write(
      `roles/${p.key}.json`,
      envelope({ platform: p.key, dataset: 'roles', count: items.length, lastSynced: sync.lastSynced, source: sync.sourceUrl, items }),
      items.length,
      sync.lastSynced
    )
    // O all.json não leva o array de permissões: é o catálogo de largura.
    todos.push(...p.rows.map((r) => toRecord(p, r)))
  }

  write(
    'roles/all.json',
    envelope({ platform: 'all', dataset: 'roles', count: todos.length, items: todos }),
    todos.length,
    DATA_SYNC.map((s) => s.lastSynced).sort().pop()
  )

  // permissions/*.json
  buildPermissions()

  // meta/*.json
  buildMeta()

  // index.json por último: ele descreve todos os outros.
  const manifest = envelope({
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    site: SITE,
    docs: `${SITE}/api/`,
    counts: {
      roles: todos.length,
      platforms: PLATFORMS.length,
      sodRules: COUNTS.SOD_RULES_COUNT,
    },
    files: written.slice(),
  })
  const file = path.join(OUT, 'index.json')
  fs.writeFileSync(file, JSON.stringify(manifest))
  log(`index.json                  ${String(written.length).padStart(6)} arquivos descritos`)

  log(`pronto — ${written.length + 1} arquivos em public/api/${API_VERSION}/`)
}

function buildPermissions() {
  // AWS e GCP: forma compacta. O mapa ação -> roles é grande demais para
  // repetir o slug em cada entrada (seriam ~4 MB na AWS), então os slugs vão
  // uma vez em roleSlugs e as entradas guardam a posição no array.
  const aws = readPublicJson('aws-actions-index.json')
  const awsSync = syncById['aws-policies']
  write(
    'permissions/aws.json',
    envelope({
      platform: 'aws',
      dataset: 'permissions',
      classification: 'provider-data',
      note: 'grantedBy e deniedBy são índices em roleSlugs.',
      count: Object.keys(aws.index).length,
      lastSynced: awsSync.lastSynced,
      source: awsSync.sourceUrl,
      roleSlugs: aws.slugs,
      permissions: Object.fromEntries(
        Object.entries(aws.index).map(([action, granted]) => {
          const denied = aws.denied && aws.denied[action]
          return [action, denied ? { grantedBy: granted, deniedBy: denied } : { grantedBy: granted }]
        })
      ),
    }),
    Object.keys(aws.index).length,
    awsSync.lastSynced
  )

  const gcp = readPublicJson('gcp-perms-index.json')
  const gcpSync = syncById['gcp-roles']
  write(
    'permissions/gcp.json',
    envelope({
      platform: 'gcp',
      dataset: 'permissions',
      classification: 'provider-data',
      note: 'grantedBy são índices em roleSlugs.',
      count: Object.keys(gcp.index).length,
      lastSynced: gcpSync.lastSynced,
      source: gcpSync.sourceUrl,
      roleSlugs: gcp.slugs,
      permissions: Object.fromEntries(
        Object.entries(gcp.index).map(([perm, granted]) => [perm, { grantedBy: granted }])
      ),
    }),
    Object.keys(gcp.index).length,
    gcpSync.lastSynced
  )

  // Azure: descrição para as 17.605 actions, mais grantedBy/deniedBy para as
  // que alguma role built-in referencia. As duas fontes usam caixas
  // diferentes para a mesma action — o índice é case-sensitive e o arquivo de
  // descrições é todo em maiúsculas —, então o join é por UPPER().
  const descRaw = readPublicJson('azure-action-descriptions.json')
  const azIdx = readPublicJson('azure-perms-index.json')
  const azSync = syncById['azure-rbac-actions']

  const grantedByUpper = new Map()
  for (const [action, roles] of Object.entries(azIdx.index)) grantedByUpper.set(action.toUpperCase(), roles)
  const deniedByUpper = new Map()
  for (const [action, roles] of Object.entries(azIdx.denied || {})) deniedByUpper.set(action.toUpperCase(), roles)

  const azPerms = {}
  for (const [upper, description] of Object.entries(descRaw)) {
    const e = { description }
    const g = grantedByUpper.get(upper)
    const d = deniedByUpper.get(upper)
    if (g) e.grantedBy = g
    if (d) e.deniedBy = d
    azPerms[upper] = e
  }
  write(
    'permissions/azure.json',
    envelope({
      platform: 'azure',
      dataset: 'permissions',
      classification: 'provider-data',
      note: 'As chaves são a action em MAIÚSCULAS, como o provedor publica no catálogo de descrições. grantedBy e deniedBy são índices em roleSlugs.',
      count: Object.keys(azPerms).length,
      lastSynced: azSync.lastSynced,
      source: azSync.sourceUrl,
      roleSlugs: azIdx.slugs,
      permissions: azPerms,
    }),
    Object.keys(azPerms).length,
    azSync.lastSynced
  )

  // Entra: as API permissions do Graph. eamTier aqui usa o mesmo vocabulário
  // das directory roles, então o eamLevel sai pelo mesmo mapa.
  const entraSync = syncById['entra-api-permissions']
  const items = API_PERMISSIONS.map((p) => ({
    platform: 'entra',
    kind: 'api-permission',
    id: p.id,
    name: p.name,
    type: p.type,
    resource: p.resource,
    description: p.description || '',
    nativeTier: p.eamTier,
    eamLevel: LEVEL.ENTRA_TIER_LEVEL[p.eamTier] === undefined ? null : LEVEL.ENTRA_TIER_LEVEL[p.eamTier],
    category: p.category,
    tierSource: p.tierSource || null,
    url: `${SITE}/entraid/api-permissions/`,
    source: entraSync.sourceUrl,
    lastSynced: entraSync.lastSynced,
  }))
  write(
    'permissions/entra.json',
    envelope({
      platform: 'entra',
      dataset: 'permissions',
      count: items.length,
      lastSynced: entraSync.lastSynced,
      source: entraSync.sourceUrl,
      items,
    }),
    items.length,
    entraSync.lastSynced
  )
}

function buildMeta() {
  write(
    'meta/sources.json',
    envelope({
      dataset: 'sources',
      classification: 'provider-data',
      count: DATA_SYNC.length,
      sources: DATA_SYNC.map((s) => ({
        id: s.id,
        label: s.label,
        platform: s.platform,
        lastSynced: s.lastSynced,
        sourceLabel: s.sourceLabel,
        sourceUrl: s.sourceUrl,
        sourceRef: s.sourceRef || null,
        notes: s.notes || null,
      })),
    }),
    DATA_SYNC.length,
    DATA_SYNC.map((s) => s.lastSynced).sort().pop()
  )

  const label = (meta, tier) => (meta && meta[tier] && meta[tier].label) || tier

  write(
    'meta/tiers.json',
    envelope({
      dataset: 'tiers',
      levels: {
        0: { name: 'Control Plane', description: 'Identity and access itself.' },
        1: { name: 'Management Plane', description: 'Resource administration.' },
        2: { name: 'Workload / Data', description: 'Reading or operating inside a resource.' },
        null: { name: 'Unclassified', description: 'Not classified upstream. Treat as unknown, never as level 2.' },
      },
      platforms: {
        entra: LEVEL.ENTRA_TIER_LEVEL,
        azure: LEVEL.AZURE_TIER_LEVEL,
        aws: LEVEL.AWS_TIER_LEVEL,
        gcp: LEVEL.GCP_TIER_LEVEL,
        workspace: LEVEL.GWS_TIER_LEVEL,
        ibm: LEVEL.IBM_TIER_LEVEL,
      },
      tierLabels: {
        azure: Object.fromEntries(Object.keys(LEVEL.AZURE_TIER_LEVEL).map((t) => [t, label(TIER_META.AZURE_TIER_META, t)])),
        aws: Object.fromEntries(Object.keys(LEVEL.AWS_TIER_LEVEL).map((t) => [t, label(TIER_META.AWS_TIER_META, t)])),
        gcp: Object.fromEntries(Object.keys(LEVEL.GCP_TIER_LEVEL).map((t) => [t, label(TIER_META.GCP_TIER_META, t)])),
        workspace: Object.fromEntries(Object.keys(LEVEL.GWS_TIER_LEVEL).map((t) => [t, label(TIER_META.GWS_TIER_META, t)])),
        ibm: Object.fromEntries(Object.keys(LEVEL.IBM_TIER_LEVEL).map((t) => [t, label(TIER_META.IBM_TIER_META, t)])),
      },
      idNote: {
        workspace: 'O Google Workspace não publica identificador estável para as admin roles; id === slug.',
        ibm: 'A IBM não publica identificador estável para as roles de plataforma; id === slug.',
      },
    }),
    undefined,
    null
  )
}

main()
