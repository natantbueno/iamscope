#!/usr/bin/env node
/**
 * Gera src/data/stats.ts — o panorama cross-cloud de /stats.
 *
 * POR QUE ISTO É UM SCRIPT E NÃO UM `useMemo` NA PÁGINA
 *   As seis respostas que /stats dá exigem varrer os datasets INTEIROS: as
 *   2.389 roles do GCP, as 1.582 policies da AWS, e — para o top de permissões
 *   — os índices invertidos de public/, que somam ~2,3 MB de JSON. Calcular
 *   isso no cliente significaria baixar tudo aquilo para desenhar seis barras.
 *
 *   Mesmo desenho de src/data/counts.ts: o script mói o dado, o arquivo gerado
 *   carrega só o resultado, e a página importa números. Nenhum dataset entra no
 *   bundle de /stats.
 *
 * E POR QUE NENHUM NÚMERO PODE SER ESCRITO À MÃO
 *   "1.700 roles" e "926 roles built-in do Azure" ficaram meses na tela depois
 *   de deixarem de ser verdade. scripts/check-stale-numbers.js existe por causa
 *   disso. Tudo aqui é derivado; a prosa da página recebe `{n}` e preenche.
 *
 * AS BASES DE CONTAGEM SÃO DIFERENTES ENTRE AS CLOUDS — e isso é publicado
 * junto do número, no campo `basis` de cada `size`. Ver o comentário de
 * tamanhoDeRole() abaixo: somar ou comparar as seis medianas sem ler o `basis`
 * é comparar coisas que não são a mesma coisa.
 *
 * Rode depois de qualquer coletor que altere src/data/ ou public/*-index.json.
 *
 * Uso: node scripts/build-stats.js [--dry-run]
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'src', 'data', 'stats.ts')
const DRY = process.argv.includes('--dry-run')

const { ROLES } = loadTs('src/data/roles.ts')
const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')
const { AWS_POLICIES } = loadTs('src/data/aws.ts')
const { GCP_ROLES } = loadTs('src/data/gcp.ts')
const { GWS_ROLES } = loadTs('src/data/googleWorkspace.ts')
const { IBM_ROLES } = loadTs('src/data/ibmCloud.ts')
const { AZURE_EFFECTIVE, AZURE_EFFECTIVE_UNIVERSE } = loadTs('src/data/azureEffective.ts')
const {
  GCP_TIER_META, AWS_TIER_META, AZURE_TIER_META, GWS_TIER_META, IBM_TIER_META, EAM_META,
} = loadTs('src/data/tierMeta.ts')
const {
  ENTRA_TIER_LEVEL, AZURE_TIER_LEVEL, AWS_TIER_LEVEL,
  GCP_TIER_LEVEL, GWS_TIER_LEVEL, IBM_TIER_LEVEL,
} = loadTs('src/lib/eamLevels.ts')
const {
  SOD_RULES, SOD_PLATFORM_META, SOD_PLATFORMS, rulePlatforms, isCrossPlatform, ruleProvider,
} = loadTs('src/data/sod/rules.ts')

const lerJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))

// ── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Mediana de verdade: média dos dois centrais quando a lista é par.
 * Devolve null para lista vazia — nunca 0, que a tela leria como "a mediana é
 * zero permissões" em vez de "não há base para calcular".
 */
function mediana(nums) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const meio = Math.floor(s.length / 2)
  return s.length % 2 ? s[meio] : Math.round((s[meio - 1] + s[meio]) / 2)
}

/**
 * Chave de dicionário do rótulo, quando existe.
 *
 * Os tiers das cinco plataformas de nuvem são a classificação editorial do IAM
 * Scope e ficam em inglês nos dois idiomas — "Full Control", "Power User",
 * "Specialized" são nomes, não rótulos de interface. Os três níveis do
 * Enterprise Access Model são a exceção: já existem no dicionário, e o quarto
 * valor (`Unclassified`) é a única string do EAM_META escrita em português.
 * Sem esta ponte, "Nao classificada" apareceria na versão em inglês.
 */
const CHAVE_DE_TIER = {
  ControlPlane: 'tier.controlPlane',
  ManagementPlane: 'tier.managementPlane',
  UserAccess: 'tier.userAccess',
  Unclassified: 'tier.unclassified',
}

/** Distribuição por tier nativo, na ordem em que o TIER_META declara. */
function distribuicaoPorTier(itens, meta, nivelDeTier, comChave = false) {
  const contagem = new Map(Object.keys(meta).map((t) => [t, 0]))
  for (const it of itens) contagem.set(it.tier, (contagem.get(it.tier) ?? 0) + 1)
  return [...contagem.entries()].map(([tier, count]) => ({
    tier,
    label: meta[tier].label,
    labelKey: comChave ? (CHAVE_DE_TIER[tier] ?? null) : null,
    // `color` sai do próprio TIER_META: é a escada do nível 3 (vermelho só no
    // topo, um cinza único no resto). Um gráfico com paleta própria
    // reintroduziria a escala de matiz por categoria que saiu em 06/08.
    color: meta[tier].color ?? meta[tier].textColor,
    count,
    level: nivelDeTier[tier] ?? null,
  }))
}

/** Roll-up para os três níveis do Enterprise Access Model. */
function porNivelEam(itens, nivelDeTier) {
  const n = { 0: 0, 1: 0, 2: 0, unclassified: 0 }
  for (const it of itens) {
    const nivel = nivelDeTier[it.tier]
    if (nivel === 0 || nivel === 1 || nivel === 2) n[nivel]++
    else n.unclassified++
  }
  return n
}

/**
 * Top-10 permissões por número de roles que as concedem.
 *
 * `entradas` é o índice invertido já pronto: permissão -> nº de roles.
 * Padrão wildcard vem marcado (`isPattern`): numa lista da AWS, `s3:*` ao lado
 * de `sts:AssumeRole` sem aviso faria a pessoa ler as duas como a mesma coisa.
 */
function topPermissoes(entradas, ehPadrao) {
  return [...entradas.entries()]
    .map(([permission, roles]) => ({ permission, roles, isPattern: ehPadrao(permission) }))
    .sort((a, b) => b.roles - a.roles || a.permission.localeCompare(b.permission))
    .slice(0, 10)
}

/** Índice de public/*-index.json: { slugs, index: { perm: [i, ...] } }. */
function contagemDoIndice(rel) {
  const idx = lerJson(rel)
  const m = new Map()
  for (const [perm, refs] of Object.entries(idx.index)) m.set(perm, refs.length)
  return { contagem: m, permissoes: m.size, slugs: idx.slugs.length }
}

// ── 1. Entra ID ─────────────────────────────────────────────────────────────
// permissionCount é literal: as 670 role actions do dataset não têm um `*`
// sequer (conferido aqui embaixo, não suposto). Base `exact`.

const entraAcoes = new Map()
for (const r of ROLES) {
  for (const p of new Set(r.permissions.map((x) => x.action))) {
    entraAcoes.set(p, (entraAcoes.get(p) ?? 0) + 1)
  }
}
const entraComWildcard = [...entraAcoes.keys()].filter((a) => a.includes('*')).length

// ── 2. Azure RBAC ───────────────────────────────────────────────────────────
// Aqui NÃO se usa permissionCount: ele conta entradas da definição, e a Owner
// (`[{"action":"*"}]`) aparecia com 1, empatada com a AcrPull. Ver o P1 em
// src/data/azureEffective.ts. O efetivo é um PISO — o `≥` na tela não é enfeite.

const azureIdx = contagemDoIndice('public/azure-perms-index.json')
const azureEfetivos = AZURE_ROLES.map((r) => AZURE_EFFECTIVE[r.slug]?.effectiveActions)
  .filter((n) => typeof n === 'number')
const azureSemEfetivo = AZURE_ROLES.length - azureEfetivos.length

// ── 3. AWS IAM ──────────────────────────────────────────────────────────────
// actionCount conta ENTRADAS do documento de policy, e a AdministratorAccess é
// `["*"]` — uma entrada. É exatamente o defeito que o P1 corrigiu no Azure, e
// que na AWS continua de pé: aqui o número sai com a ressalva do wildcard, e a
// contagem de quantas policies são afetadas é medida, não estimada.

const awsIdx = contagemDoIndice('public/aws-actions-index.json')
const awsPoliciesComPadrao = (() => {
  const idx = lerJson('public/aws-actions-index.json')
  const set = new Set()
  for (const [acao, refs] of Object.entries(idx.index)) {
    if (acao.includes('*')) for (const i of refs) set.add(i)
  }
  return set.size
})()

// ── 4. GCP IAM ──────────────────────────────────────────────────────────────
// Permissões literais (0 wildcards nas 13.701). As basic roles vêm com
// permissionCount 0 porque o Google não publica a lista delas — entram no total
// de roles e ficam FORA da mediana, com o número de excluídas publicado.

const gcpIdx = contagemDoIndice('public/gcp-perms-index.json')
const gcpComLista = GCP_ROLES.filter((r) => r.permissionCount > 0)
const gcpSemLista = GCP_ROLES.length - gcpComLista.length

// ── 5. Google Workspace ─────────────────────────────────────────────────────
// O tamanho aqui é a lista de CAPACIDADES que o Google publica por role, não
// uma contagem de permissão de API: o mapa role->privilegeName só existe para
// as roles com apiPrivilegesComplete, e são poucas. Base `declared`.

const gwsPrivilegios = new Map()
for (const r of GWS_ROLES) {
  for (const p of new Set([...(r.privileges ?? []), ...(r.apiPrivileges ?? [])])) {
    gwsPrivilegios.set(p, (gwsPrivilegios.get(p) ?? 0) + 1)
  }
}
const gwsApiCompleto = GWS_ROLES.filter((r) => r.apiPrivilegesComplete).length

// ── 6. IBM Cloud ────────────────────────────────────────────────────────────
// `actions` é vazio em todas as 7 roles, de propósito: a IBM mapeia ação por
// SERVIÇO, não por role. Não há tamanho e não há top de permissão — a lacuna é
// publicada, e é o mesmo motivo pelo qual a IBM está fora do Permission Scope e
// do SoD Analyzer.

const ibmComAcoes = IBM_ROLES.filter((r) => (r.actions ?? []).length > 0).length

// ── Montagem por cloud ──────────────────────────────────────────────────────

const ehCuringa = (s) => s.includes('*')
const nunca = () => false

const clouds = {
  entraId: {
    label: 'Entra ID',
    unit: 'roles',
    href: '/entraid/roles',
    total: ROLES.length,
    privileged: ROLES.filter((r) => r.isPrivileged).length,
    tiers: distribuicaoPorTier(ROLES.map((r) => ({ tier: r.eamTier })), EAM_META, ENTRA_TIER_LEVEL, true),
    eam: porNivelEam(ROLES.map((r) => ({ tier: r.eamTier })), ENTRA_TIER_LEVEL),
    size: {
      basis: 'exact',
      median: mediana(ROLES.map((r) => r.permissionCount)),
      max: Math.max(...ROLES.map((r) => r.permissionCount)),
      counted: ROLES.length,
      excluded: 0,
      patternRoles: entraComWildcard,
    },
    top: { basis: 'index', permissions: entraAcoes.size, items: topPermissoes(entraAcoes, ehCuringa) },
  },

  azureRbac: {
    label: 'Azure RBAC',
    unit: 'roles',
    href: '/azure-rbac/roles',
    total: AZURE_ROLES.length,
    privileged: AZURE_ROLES.filter((r) => r.isPrivileged).length,
    tiers: distribuicaoPorTier(AZURE_ROLES, AZURE_TIER_META, AZURE_TIER_LEVEL),
    eam: porNivelEam(AZURE_ROLES, AZURE_TIER_LEVEL),
    size: {
      basis: 'effective',
      median: mediana(azureEfetivos),
      max: Math.max(...azureEfetivos),
      counted: azureEfetivos.length,
      excluded: azureSemEfetivo,
      patternRoles: 0,
    },
    top: { basis: 'index', permissions: azureIdx.permissoes, items: topPermissoes(azureIdx.contagem, ehCuringa) },
  },

  aws: {
    label: 'AWS IAM',
    unit: 'policies',
    href: '/aws/policies',
    total: AWS_POLICIES.length,
    privileged: AWS_POLICIES.filter((p) => p.isPrivileged).length,
    tiers: distribuicaoPorTier(AWS_POLICIES, AWS_TIER_META, AWS_TIER_LEVEL),
    eam: porNivelEam(AWS_POLICIES, AWS_TIER_LEVEL),
    size: {
      basis: 'entries',
      median: mediana(AWS_POLICIES.map((p) => p.actionCount)),
      max: Math.max(...AWS_POLICIES.map((p) => p.actionCount)),
      counted: AWS_POLICIES.length,
      excluded: 0,
      patternRoles: awsPoliciesComPadrao,
    },
    top: { basis: 'index', permissions: awsIdx.permissoes, items: topPermissoes(awsIdx.contagem, ehCuringa) },
  },

  gcp: {
    label: 'GCP IAM',
    unit: 'roles',
    href: '/gcp/roles',
    total: GCP_ROLES.length,
    privileged: GCP_ROLES.filter((r) => r.isPrivileged).length,
    tiers: distribuicaoPorTier(GCP_ROLES, GCP_TIER_META, GCP_TIER_LEVEL),
    eam: porNivelEam(GCP_ROLES, GCP_TIER_LEVEL),
    size: {
      basis: 'exact',
      median: mediana(gcpComLista.map((r) => r.permissionCount)),
      max: Math.max(...gcpComLista.map((r) => r.permissionCount)),
      counted: gcpComLista.length,
      excluded: gcpSemLista,
      patternRoles: 0,
    },
    top: { basis: 'index', permissions: gcpIdx.permissoes, items: topPermissoes(gcpIdx.contagem, ehCuringa) },
  },

  ibmCloud: {
    label: 'IBM Cloud',
    unit: 'roles',
    href: '/ibm-cloud/roles',
    total: IBM_ROLES.length,
    privileged: IBM_ROLES.filter((r) => r.isPrivileged).length,
    tiers: distribuicaoPorTier(IBM_ROLES, IBM_TIER_META, IBM_TIER_LEVEL),
    eam: porNivelEam(IBM_ROLES, IBM_TIER_LEVEL),
    size: {
      basis: 'none',
      median: null,
      max: null,
      counted: ibmComAcoes,
      excluded: IBM_ROLES.length - ibmComAcoes,
      patternRoles: 0,
    },
    top: { basis: 'none', permissions: 0, items: [] },
  },

  googleWorkspace: {
    label: 'Google Workspace',
    unit: 'roles',
    href: '/google-workspace/roles',
    total: GWS_ROLES.length,
    privileged: GWS_ROLES.filter((r) => r.isPrivileged).length,
    tiers: distribuicaoPorTier(GWS_ROLES, GWS_TIER_META, GWS_TIER_LEVEL),
    eam: porNivelEam(GWS_ROLES, GWS_TIER_LEVEL),
    size: {
      basis: 'declared',
      median: mediana(GWS_ROLES.map((r) => (r.privileges ?? []).length)),
      max: Math.max(...GWS_ROLES.map((r) => (r.privileges ?? []).length)),
      counted: GWS_ROLES.length,
      excluded: 0,
      patternRoles: gwsApiCompleto,
    },
    top: { basis: 'declared', permissions: gwsPrivilegios.size, items: topPermissoes(gwsPrivilegios, nunca) },
  },
}

// ── SoD ─────────────────────────────────────────────────────────────────────
//
// A cobertura é medida por PLATAFORMA TOCADA, nunca por `rule.cloud ===
// plataforma`: as regras de cruzamento envolvem duas plataformas e sumiriam do
// numerador das duas se a comparação fosse por igualdade. É o mesmo defeito que
// o filtro da tela já teve.

const sodPorPlataforma = SOD_PLATFORMS.map((plat) => {
  const regras = SOD_RULES.filter((r) => rulePlatforms(r).includes(plat))
  const papeis = new Set()
  for (const r of regras) {
    for (const ref of [r.roleA, r.roleB]) if (ref.cloud === plat) papeis.add(ref.id)
  }
  const severidade = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const r of regras) severidade[r.severity]++
  return {
    platform: plat,
    label: SOD_PLATFORM_META[plat].label,
    provider: SOD_PLATFORM_META[plat].provider,
    rules: regras.length,
    cross: regras.filter(isCrossPlatform).length,
    roles: papeis.size,
    severity: severidade,
  }
})

const sodSeveridade = { critical: 0, high: 0, medium: 0, low: 0 }
for (const r of SOD_RULES) sodSeveridade[r.severity]++

const sodPorProvedor = {}
for (const r of SOD_RULES) {
  const p = ruleProvider(r)
  sodPorProvedor[p] = (sodPorProvedor[p] ?? 0) + 1
}

const sod = {
  total: SOD_RULES.length,
  cross: SOD_RULES.filter(isCrossPlatform).length,
  platforms: sodPorPlataforma,
  byProvider: sodPorProvedor,
  severity: sodSeveridade,
  /**
   * As clouds do catálogo que o SoD Analyzer NÃO cobre. Derivado, não escrito:
   * se a IBM um dia entrar, esta lista esvazia sozinha.
   */
  uncoveredClouds: Object.keys(clouds).filter((c) => {
    const rota = { entraId: 'entra-id', azureRbac: 'azure-rbac', aws: 'aws', gcp: 'gcp', googleWorkspace: 'google-workspace', ibmCloud: null }[c]
    return rota === null || !SOD_PLATFORMS.includes(rota)
  }),
}

// ── Totais do catálogo ──────────────────────────────────────────────────────

const totals = {
  roles: Object.values(clouds).reduce((s, c) => s + c.total, 0),
  privileged: Object.values(clouds).reduce((s, c) => s + c.privileged, 0),
  tierZero: Object.values(clouds).reduce((s, c) => s + c.eam[0], 0),
  // NÃO existe `permissions` aqui de propósito: as seis contagens têm bases
  // diferentes (as 2.697 do Azure são as actions CITADAS pelas roles, contra um
  // universo de 17.591 na documentação), e somá-las publicaria um total que não
  // é o total de nada.
  clouds: Object.keys(clouds).length,
}

// ── Saída ───────────────────────────────────────────────────────────────────

const j = (v) => JSON.stringify(v, null, 2).replace(/\n/g, '\n')

const body = `// AUTO-GERADO por scripts/build-stats.js — não editar à mão.
// Gerado em: ${new Date().toISOString()}
//
// O panorama cross-cloud que /stats publica. Só números e rótulos: nenhum
// dataset entra no bundle da página. Mesmo desenho de src/data/counts.ts.
//
// AS BASES DE CONTAGEM DE TAMANHO NÃO SÃO A MESMA COISA — leia \`size.basis\`
// antes de comparar duas medianas:
//
//   exact      contagem literal, sem wildcard envolvido (Entra ID, GCP IAM)
//   effective  wildcards já expandidos, e o resultado é um PISO (Azure RBAC).
//              Ver src/data/azureEffective.ts: o universo vem da documentação,
//              a Management API expõe mais. Sempre exibido com \`≥\`.
//   entries    entradas do documento de policy — \`"*"\` conta 1 (AWS IAM).
//              \`patternRoles\` diz quantas policies têm ao menos um padrão.
//   declared   capacidades que o provedor publica por role, não permissão de
//              API (Google Workspace).
//   none       o provedor não publica ação por role (IBM Cloud).
//
// Rode de novo depois de qualquer coletor que altere src/data/ ou
// public/*-index.json.

export type StatsCloudId = ${Object.keys(clouds).map((c) => `'${c}'`).join(' | ')}

export type SizeBasis = 'exact' | 'effective' | 'entries' | 'declared' | 'none'

export interface StatsTier {
  tier: string
  label: string
  /** Chave de dicionário quando o rótulo é de interface; null quando é nome próprio. */
  labelKey: string | null
  /** Do TIER_META da plataforma — a escada do nível 3, não uma paleta nova. */
  color: string
  count: number
  level: 0 | 1 | 2 | null
}

export interface StatsEam { 0: number; 1: number; 2: number; unclassified: number }

export interface StatsSize {
  basis: SizeBasis
  /** null quando não há base para calcular — nunca 0, que se leria como zero permissões. */
  median: number | null
  max: number | null
  /** Quantas roles entraram na conta. */
  counted: number
  /** Quantas ficaram de fora por não terem lista publicada. */
  excluded: number
  /**
   * AWS: policies com ao menos um padrão wildcard.
   * Entra ID: actions com wildcard no dataset (é 0, e a tela usa isso para
   * afirmar que a base é literal em vez de prometer).
   * Google Workspace: roles cujo mapa de privilégio de API é completo.
   */
  patternRoles: number
}

export interface StatsTopItem { permission: string; roles: number; isPattern: boolean }

/**
 * De onde sai o top de permissões:
 *   index     índice invertido real de permissão -> roles
 *   declared  a lista de capacidades que o provedor publica, em prosa — o mapa
 *             machine-readable só existe para parte das roles (Google Workspace)
 *   none      o provedor não publica permissão por role (IBM Cloud)
 */
export type TopBasis = 'index' | 'declared' | 'none'

export interface StatsCloud {
  label: string
  unit: 'roles' | 'policies'
  href: string
  total: number
  privileged: number
  tiers: StatsTier[]
  eam: StatsEam
  size: StatsSize
  top: { basis: TopBasis; permissions: number; items: StatsTopItem[] }
}

export const STATS_CLOUDS: Record<StatsCloudId, StatsCloud> = ${j(clouds)}

/** Ordem de exibição — a mesma de CLOUD_ORDER em src/data/compare/types.ts. */
export const STATS_ORDER: StatsCloudId[] = ${j(['entraId', 'azureRbac', 'aws', 'gcp', 'ibmCloud', 'googleWorkspace'])}

export interface StatsSodPlatform {
  platform: string
  label: string
  provider: string
  rules: number
  cross: number
  roles: number
  severity: { critical: number; high: number; medium: number; low: number }
}

export const STATS_SOD = ${j(sod)} as {
  total: number
  cross: number
  platforms: StatsSodPlatform[]
  byProvider: Record<string, number>
  severity: { critical: number; high: number; medium: number; low: number }
  uncoveredClouds: string[]
}

export const STATS_TOTALS = ${j(totals)}

/** Universo da expansão do Azure, para a página poder dizer contra o que o piso é medido. */
export const STATS_AZURE_UNIVERSE = ${j({
  actions: AZURE_EFFECTIVE_UNIVERSE.actions,
  providers: AZURE_EFFECTIVE_UNIVERSE.providers,
})}
`

for (const [id, c] of Object.entries(clouds)) {
  const pct = c.total ? ((c.privileged / c.total) * 100).toFixed(1) : '0.0'
  console.log(
    `  ${id.padEnd(16)} ${String(c.total).padStart(5)} ${c.unit.padEnd(8)} · `
    + `privilegiadas ${String(c.privileged).padStart(4)} (${pct}%) · `
    + `tier0 ${String(c.eam[0]).padStart(4)} · `
    + `tamanho ${c.size.basis} mediana=${c.size.median ?? '—'} max=${c.size.max ?? '—'} · `
    + `top de ${c.top.permissions} permissões`,
  )
}
console.log(`\n  SoD: ${sod.total} regras, ${sod.cross} de cruzamento, ${sod.platforms.length} plataformas`)
console.log(`  Totais: ${totals.roles} roles/policies, ${totals.privileged} privilegiadas, ${totals.tierZero} em Tier 0`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); process.exit(0) }

fs.writeFileSync(OUT, body)
console.log('\nEscrito: src/data/stats.ts')
