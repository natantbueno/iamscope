// Catálogo do Role Evaluator — matching contra os 6 datasets.
//
// POR QUE ESTÁ SEPARADO DE ./evaluate
//   Aqui moram os únicos imports pesados do avaliador: os 6 datasets de
//   src/data/ e o equivalences.json. Enquanto isso vivia junto com os tipos e
//   com detectCloud, qualquer import de '@/lib/evaluate' trazia tudo junto —
//   inclusive em RoleInput, que só queria detectar a cloud pelo formato do
//   JSON. Ver o cabeçalho de ./evaluate.
//
//   Ninguém deve importar este módulo direto de um componente: a porta de
//   entrada é evaluateRole()/getResultForSlug() em ./evaluate, que fazem o
//   `await import()` daqui.

import { ROLES, EntraRole, EamTier } from '@/data/roles'
import { AZURE_ROLES, AzureRbacRole, AzureRbacTier, AzureRbacPermission, AZURE_TIER_META } from '@/data/azureRbac'
import { AWS_POLICIES, AwsPolicy, AwsTier, AWS_TIER_META } from '@/data/aws'
import { GCP_ROLES, GcpRole, GcpTier, GCP_TIER_META } from '@/data/gcp'
import { GWS_ROLES, GwsAdminRole, GwsTier, GWS_TIER_META } from '@/data/googleWorkspace'
import { IBM_ROLES, IbmRole, IbmTier, IBM_TIER_META } from '@/data/ibmCloud'
import { CloudId, CLOUD_META, RiskLevel, getCloudUrl } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'
import tiersData from '@/data/compare/tiers.json'

import type {
  EvaluateCloud, EvaluateOutcome, EvaluatedPermission, EvaluationResultData,
  EvaluationRisk, EvaluationTier,
} from './evaluate'
import { detectCloud, prepareRoleJson } from './evaluate'
import {
  ENTRA_TIER_LEVEL, AZURE_TIER_LEVEL, AWS_TIER_LEVEL,
  GCP_TIER_LEVEL, GWS_TIER_LEVEL, IBM_TIER_LEVEL,
} from './eamLevels'

// ── Tipos auxiliares dos dados de comparação ────────────────────────────────

interface EquivalenceCloudEntry {
  role: string
  slug?: string
  risk: RiskLevel
  keyPermissions: string[]
  mitigations: string[]
  notes?: string
}
interface EquivalenceEntry {
  id: string
  function: string
  tier: 0 | 1 | 2
  name: string
  description: string
  clouds: Partial<Record<CloudId, EquivalenceCloudEntry>>
}
const equivalences = equivalencesData as unknown as EquivalenceEntry[]

interface TierLevelMeta {
  id: string; level: 0 | 1 | 2; name: string; shortName: string
  description: string; color: string; bg: string; risk: RiskLevel; label: string
}
const tierLevels = tiersData as unknown as TierLevelMeta[]
const TIER_LEVEL_META: Record<0 | 1 | 2, TierLevelMeta> = {
  0: tierLevels.find((t) => t.level === 0)!,
  1: tierLevels.find((t) => t.level === 1)!,
  2: tierLevels.find((t) => t.level === 2)!,
}

// ── Extração de identidade a partir do JSON colado (independe de match) ────

function extractIdentity(cloud: EvaluateCloud, j: Record<string, any>): { name: string; id: string | null; description: string | null } {
  switch (cloud) {
    case 'entraId':
      return {
        name: j.displayName ?? j.name ?? '',
        id: j.roleTemplateId ?? j.directoryRoleId ?? j.id ?? null,
        description: j.description ?? null,
      }
    case 'azureRbac':
      return {
        name: j.properties?.roleName ?? j.roleName ?? j.displayName ?? '',
        id: j.name ?? j.properties?.roleDefinitionId ?? (typeof j.id === 'string' ? j.id : null),
        description: j.properties?.description ?? j.description ?? null,
      }
    case 'aws':
      return {
        name: j.PolicyName ?? j.RoleName ?? j.Policy?.PolicyName ?? j.name ?? '',
        id: j.Arn ?? j.arn ?? j.Policy?.Arn ?? null,
        description: j.Description ?? j.description ?? null,
      }
    case 'gcp':
      return {
        name: j.title ?? j.name ?? '',
        id: j.name ?? null,
        description: j.description ?? null,
      }
    case 'googleWorkspace': {
      // `_SEED_ADMIN_ROLE` é identificador, não nome. Deixar o nome vazio faz
      // o do catálogo prevalecer no resultado (ver `identity.name || record.name`
      // adiante) em vez de imprimir o identificador interno como se fosse
      // título de role.
      const raw = j.roleName ?? j.name ?? ''
      const interno = typeof raw === 'string' && /^_.+_ROLE$/i.test(raw.trim())
      return {
        name: interno ? '' : raw,
        id: j.roleId != null ? String(j.roleId) : (interno ? raw : null),
        description: j.roleDescription ?? j.description ?? null,
      }
    }
    case 'ibmCloud':
      return {
        name: j.display_name ?? j.displayName ?? j.name ?? '',
        id: j.crn ?? (typeof j.id === 'string' ? j.id : null),
        description: j.description ?? null,
      }
  }
}

// ── Extração de permissões cruas do JSON colado (usada quando não há match) ─

function extractRawPermissions(cloud: EvaluateCloud, j: Record<string, any>): EvaluatedPermission[] {
  try {
    switch (cloud) {
      case 'entraId': {
        const actions: string[] = j.rolePermissions?.[0]?.allowedResourceActions ?? j.allowedResourceActions ?? []
        return actions.map((a) => ({ name: a }))
      }
      case 'azureRbac': {
        const perm = j.properties?.permissions?.[0] ?? j.permissions?.[0]
        const actions: string[] = [...(perm?.actions ?? []), ...(perm?.dataActions ?? [])]
        return actions.map((a) => ({ name: a }))
      }
      case 'aws': {
        const stmts = j.PolicyDocument?.Statement ?? j.Statement ?? []
        const list = Array.isArray(stmts) ? stmts : [stmts]
        const actions = list.flatMap((s: any) => {
          const a = s?.Action ?? []
          return Array.isArray(a) ? a : [a]
        }).filter(Boolean)
        return actions.map((a: string) => ({ name: a }))
      }
      case 'gcp': {
        const actions: string[] = j.includedPermissions ?? []
        return actions.map((a) => ({ name: a }))
      }
      case 'googleWorkspace': {
        const privs: any[] = j.rolePrivileges ?? []
        return privs.map((p) => ({ name: p.privilegeName ?? String(p) }))
      }
      case 'ibmCloud': {
        const actions: string[] = j.actions ?? []
        return actions.map((a) => ({ name: a }))
      }
    }
  } catch {
    return []
  }
  return []
}

// ── Matching contra os datasets do site ─────────────────────────────────────

type MatchedBy = 'id' | 'name'

function matchEntra(j: Record<string, any>): { record: EntraRole; matchedBy: MatchedBy } | null {
  const idCandidate = j.roleTemplateId ?? j.directoryRoleId ?? j.id
  if (typeof idCandidate === 'string') {
    const byId = ROLES.find((r) => r.id.toLowerCase() === idCandidate.toLowerCase())
    if (byId) return { record: byId, matchedBy: 'id' }
  }
  const nameCandidate = j.displayName ?? j.name
  if (typeof nameCandidate === 'string' && nameCandidate.trim()) {
    const byName = ROLES.find((r) => r.name.toLowerCase() === nameCandidate.trim().toLowerCase())
    if (byName) return { record: byName, matchedBy: 'name' }
  }
  return null
}

function matchAzure(j: Record<string, any>): { record: AzureRbacRole; matchedBy: MatchedBy } | null {
  const idCandidate = j.name ?? j.properties?.roleDefinitionId ?? (typeof j.id === 'string' ? j.id.split('/').pop() : undefined)
  if (typeof idCandidate === 'string') {
    const byId = AZURE_ROLES.find((r) => r.id.toLowerCase() === idCandidate.toLowerCase())
    if (byId) return { record: byId, matchedBy: 'id' }
  }
  const nameCandidate = j.properties?.roleName ?? j.roleName ?? j.displayName
  if (typeof nameCandidate === 'string' && nameCandidate.trim()) {
    const byName = AZURE_ROLES.find((r) => r.name.toLowerCase() === nameCandidate.trim().toLowerCase())
    if (byName) return { record: byName, matchedBy: 'name' }
  }
  return null
}

function matchAws(j: Record<string, any>): { record: AwsPolicy; matchedBy: MatchedBy } | null {
  const arn = j.Arn ?? j.arn ?? j.Policy?.Arn
  if (typeof arn === 'string') {
    const byId = AWS_POLICIES.find((p) => p.arn.toLowerCase() === arn.toLowerCase())
    if (byId) return { record: byId, matchedBy: 'id' }
  }
  const nameCandidate = j.PolicyName ?? j.RoleName ?? j.Policy?.PolicyName ?? j.name
  if (typeof nameCandidate === 'string' && nameCandidate.trim()) {
    const byName = AWS_POLICIES.find((p) => p.name.toLowerCase() === nameCandidate.trim().toLowerCase())
    if (byName) return { record: byName, matchedBy: 'name' }
  }
  return null
}

function matchGcp(j: Record<string, any>): { record: GcpRole; matchedBy: MatchedBy } | null {
  if (typeof j.name === 'string') {
    const byId = GCP_ROLES.find((r) => r.roleId.toLowerCase() === j.name.toLowerCase())
    if (byId) return { record: byId, matchedBy: 'id' }
  }
  const nameCandidate = j.title ?? j.name
  if (typeof nameCandidate === 'string' && nameCandidate.trim()) {
    const byName = GCP_ROLES.find((r) => r.name.toLowerCase() === nameCandidate.trim().toLowerCase())
    if (byName) return { record: byName, matchedBy: 'name' }
  }
  return null
}

// IBM Cloud: o dataset do site não guarda o CRN, então o match é por nome
// (case-insensitive).

// ── Google Workspace ────────────────────────────────────────────────────────
//
// O DEFEITO QUE ISTO CORRIGE
//   O match do Workspace era por nome de exibição contra `roleName`. Só que a
//   Directory API não devolve nome de exibição em `roleName`: devolve o
//   identificador interno da role de sistema —
//
//     { "roleName": "_SEED_ADMIN_ROLE", "isSuperAdminRole": true, ... }
//
//   enquanto o catálogo guarda "Super Admin", que é como o Google escreve na
//   documentação e no Admin console. Resultado medido em 20/08/2026: **nenhuma
//   das 14 roles do Workspace conseguia casar** com um export real da API —
//   nem as que estão catalogadas. Era o caso mais literal do "mesmo roles do
//   site também não está trazendo" que veio no feedback.
//
// A ORDEM DAS TENTATIVAS, E POR QUE ELA É ESSA
//   1. `isSuperAdminRole` — flag booleana documentada pelo Google. É o sinal
//      mais forte que existe e não depende de string nenhuma.
//   2. Alias explícito, para o que a normalização não resolve sozinha.
//   3. Nome de exibição literal — cobre quem copiou do Admin console e a role
//      custom que por acaso se chama igual a uma catalogada.
//   4. Normalização do identificador interno: tira o `_` da frente, o `_ROLE`
//      do fim e a pontuação. `_USER_MANAGEMENT_ADMIN_ROLE` vira
//      `usermanagementadmin`, que é o que "User Management Admin" também vira.
//
//   Uma role CUSTOM continua não casando, e está certo: ela não está no
//   catálogo. Quem trata esse caso é a avaliação por permissões (E3).

const GWS_API_ALIASES: Record<string, string> = {
  // Documentado pelo Google: `_SEED_ADMIN_ROLE` é o "Google Workspace
  // Administrator Seed Role" — developers.google.com/workspace/admin/
  // directory/v1/guides/manage-roles.
  _SEED_ADMIN_ROLE: 'super-admin',
  // INFERIDO, não documentado: a normalização produz "service admin" e o
  // catálogo escreve "Services Admin". Único alias que não vem de fonte
  // oficial — se um dia bater errado, é o primeiro lugar para olhar.
  _SERVICE_ADMIN_ROLE: 'services-admin',
}

/** `_USER_MANAGEMENT_ADMIN_ROLE` e `User Management Admin` viram a mesma coisa. */
function normalizeGwsName(s: string): string {
  return s.replace(/^_+/, '').replace(/_ROLE$/i, '').replace(/[^a-z0-9]+/gi, '').toLowerCase()
}

function matchGws(j: Record<string, any>): { record: GwsAdminRole; matchedBy: MatchedBy } | null {
  const bySlug = (slug: string) => GWS_ROLES.find((r) => r.slug === slug)

  if (j.isSuperAdminRole === true) {
    const r = bySlug('super-admin')
    if (r) return { record: r, matchedBy: 'id' }
  }

  const raw = j.roleName ?? j.name
  if (typeof raw !== 'string' || !raw.trim()) return null
  const texto = raw.trim()

  const alias = GWS_API_ALIASES[texto.toUpperCase()]
  if (alias) {
    const r = bySlug(alias)
    if (r) return { record: r, matchedBy: 'id' }
  }

  const byName = GWS_ROLES.find((r) => r.name.toLowerCase() === texto.toLowerCase())
  if (byName) return { record: byName, matchedBy: 'name' }

  const alvo = normalizeGwsName(texto)
  if (alvo) {
    const byNorm = GWS_ROLES.find((r) => normalizeGwsName(r.name) === alvo)
    if (byNorm) return { record: byNorm, matchedBy: 'name' }
  }
  return null
}

function matchIbm(j: Record<string, any>): { record: IbmRole; matchedBy: MatchedBy } | null {
  const nameCandidate = j.display_name ?? j.displayName ?? j.name
  if (typeof nameCandidate === 'string' && nameCandidate.trim()) {
    const byName = IBM_ROLES.find((r) => r.name.toLowerCase() === nameCandidate.trim().toLowerCase())
    if (byName) return { record: byName, matchedBy: 'name' }
  }
  return null
}

// ── Normalização de tier (0/1/2) por cloud ──────────────────────────────────
// Heurística documentada: cada tier interno da plataforma é mapeado para o
// nível 0 (Control Plane) / 1 (Management Plane) / 2 (Data/Workload Plane) do
// modelo EAM multi-cloud já usado em /compare e /tier-comparison. É uma
// classificação aproximada — a fonte da verdade para Entra ID é o próprio
// eamTier já atribuído pelo EntraOps; para as demais clouds é a classificação
// própria do site (tier "FullAccess"/"ProjectOwner"/etc.), documentada nas
// páginas /reference de cada cloud.

// Os seis mapas moram em ./eamLevels — a avaliação por permissões usa os
// mesmos, e duas cópias divergiriam em silêncio.

function getTierInfo(cloud: EvaluateCloud, record: any): { level: 0 | 1 | 2 | null; rawTier: string; rawLabel: string; rawDescription: string } {
  switch (cloud) {
    case 'entraId': {
      const r = record as EntraRole
      return { level: ENTRA_TIER_LEVEL[r.eamTier], rawTier: r.eamTier, rawLabel: r.eamTier, rawDescription: '' }
    }
    case 'azureRbac': {
      const r = record as AzureRbacRole
      const meta = AZURE_TIER_META[r.tier]
      return { level: AZURE_TIER_LEVEL[r.tier], rawTier: r.tier, rawLabel: meta.label, rawDescription: meta.description }
    }
    case 'aws': {
      const r = record as AwsPolicy
      const meta = AWS_TIER_META[r.tier]
      return { level: AWS_TIER_LEVEL[r.tier], rawTier: r.tier, rawLabel: meta.label, rawDescription: meta.description }
    }
    case 'gcp': {
      const r = record as GcpRole
      const meta = GCP_TIER_META[r.tier]
      return { level: GCP_TIER_LEVEL[r.tier], rawTier: r.tier, rawLabel: meta.label, rawDescription: meta.description }
    }
    case 'googleWorkspace': {
      const r = record as GwsAdminRole
      const meta = GWS_TIER_META[r.tier]
      return { level: GWS_TIER_LEVEL[r.tier], rawTier: r.tier, rawLabel: meta.label, rawDescription: meta.description }
    }
    case 'ibmCloud': {
      const r = record as IbmRole
      const meta = IBM_TIER_META[r.tier]
      return { level: IBM_TIER_LEVEL[r.tier], rawTier: r.tier, rawLabel: meta.label, rawDescription: meta.description }
    }
  }
}

// ── Permissões a partir do registro encontrado no dataset ──────────────────

function extractDatasetPermissions(cloud: EvaluateCloud, record: any): EvaluatedPermission[] {
  switch (cloud) {
    case 'entraId':
      return (record as EntraRole).permissions.map((p) => ({ name: p.action, tier: p.tier }))
    case 'azureRbac':
      return [] // não há lista no bundle — ver needsPermFetch / fetchExternalPermissions()
    case 'aws':
      return [] // idem Azure/GCP: vive em public/aws-policy-docs/{slug}.json
    case 'gcp':
      return [] // idem Azure: vive em public/gcp-perms/{slug}.json
    case 'googleWorkspace': {
      const r = record as GwsAdminRole
      // Testa o COMPRIMENTO, não a existência: desde a recoleta oficial,
      // apiPrivileges é um array vazio (o Google só publica a lista de 2 das
      // 14 roles), e `??` não cai no fallback em array vazio — o avaliador
      // passaria a mostrar zero permissões para quase toda role do Workspace.
      return (r.apiPrivileges?.length ? r.apiPrivileges : r.privileges).map((a) => ({ name: a }))
    }
    case 'ibmCloud': {
      // `privileges` deixou de existir na recoleta de 03/08, e `actions` vem
      // sempre vazio de propósito: a IBM não publica ação por role — cada
      // serviço mapeia as próprias ações para as 7 roles do IAM.
      const r = record as IbmRole
      return r.actions.map((a) => ({ name: a }))
    }
  }
}

// ── Riscos e mitigações a partir de compare/equivalences.json ──────────────

function getRiskInfo(cloud: EvaluateCloud, slug: string): EvaluationRisk {
  for (const eq of equivalences) {
    const entry = eq.clouds[cloud]
    if (entry?.slug === slug) {
      return {
        available: true,
        level: entry.risk,
        functionName: eq.name,
        keyPermissions: entry.keyPermissions,
        mitigations: entry.mitigations,
        notes: entry.notes,
      }
    }
  }
  return { available: false }
}

// ── Reconstrução direta a partir de cloud+slug (usado por /evaluate?cloud=&role=) ─
// Permite compartilhar/recarregar um resultado sem colar o JSON de novo —
// monta o mesmo EvaluationResultData a partir do registro já catalogado.

function findRecordBySlug(cloud: EvaluateCloud, slug: string): any | null {
  switch (cloud) {
    case 'entraId': return ROLES.find((r) => r.slug === slug) ?? null
    case 'azureRbac': return AZURE_ROLES.find((r) => r.slug === slug) ?? null
    case 'aws': return AWS_POLICIES.find((p) => p.slug === slug) ?? null
    case 'gcp': return GCP_ROLES.find((r) => r.slug === slug) ?? null
    case 'googleWorkspace': return GWS_ROLES.find((r) => r.slug === slug) ?? null
    case 'ibmCloud': return IBM_ROLES.find((r) => r.slug === slug) ?? null
  }
}

export function getResultForSlugSync(cloud: EvaluateCloud, slug: string): EvaluationResultData | null {
  const record = findRecordBySlug(cloud, slug)
  if (!record) return null

  const tierInfo = getTierInfo(cloud, record)
  const tierMeta = tierInfo.level != null ? TIER_LEVEL_META[tierInfo.level] : null
  const permissions = extractDatasetPermissions(cloud, record)
  const risk = getRiskInfo(cloud, record.slug)

  return {
    cloud,
    matched: true,
    matchedBy: 'id',
    identity: {
      name: record.name,
      id: record.id ?? record.arn ?? record.roleId ?? null,
      description: record.description ?? null,
      sourceUrl: getCloudUrl(cloud, record.slug),
      slug: record.slug,
    },
    tier: {
      level: tierInfo.level,
      rawTier: tierInfo.rawTier,
      label: tierMeta ? tierMeta.name : 'Não classificado (Unclassified)',
      color: tierMeta ? tierMeta.color : '#6b7280',
      bg: tierMeta ? tierMeta.bg : '#6b728018',
      justification: tierMeta
        ? `No ${CLOUD_META[cloud].label}, este role/policy tem o tier interno "${tierInfo.rawLabel}"${tierInfo.rawDescription ? ` (${tierInfo.rawDescription})` : ''}. Neste site, esse tier é normalizado para ${tierMeta.name} do modelo Enterprise Access Model (EAM) multi-cloud — ${tierMeta.description}`
        : `O tier interno "${tierInfo.rawLabel}" desta plataforma ainda está marcado como não classificado (Unclassified) no modelo EAM deste site.`,
    },
    permissions,
    permissionCountHint:
      cloud === 'azureRbac' ? (record as AzureRbacRole).permissionCount
      : cloud === 'gcp' ? (record as GcpRole).permissionCount
      : null,
    needsPermFetch: cloud === 'azureRbac' || cloud === 'gcp' || cloud === 'aws',
    permFetchSlug: cloud === 'azureRbac' || cloud === 'gcp' || cloud === 'aws' ? record.slug : null,
    risk,
  }
}

// ── Função principal ─────────────────────────────────────────────────────────

export function evaluateRoleSync(rawText: string, manualCloud?: EvaluateCloud | null): EvaluateOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (e) {
    return { status: 'error', code: 'invalid_json', error: 'JSON inválido — verifique vírgulas, aspas e chaves. ' + (e instanceof Error ? e.message : '') }
  }

  // Desembrulha envelope, normaliza a caixa das chaves e separa lista de
  // objeto único. Ver o bloco NORMALIZAÇÃO DA ENTRADA em ./evaluate.
  const prep = prepareRoleJson(parsed)
  if (prep.candidates) {
    return { status: 'choose', candidates: prep.candidates, notes: prep.notes }
  }
  if (!prep.json) {
    return { status: 'error', code: 'not_object', error: 'Não encontrei um objeto de role neste JSON. Cole o objeto de um role/policy, ou a resposta da API que o contém.' }
  }
  return evaluateObjectSync(prep.json, manualCloud, prep.notes)
}

/**
 * O miolo da avaliação, já com um objeto pronto na mão.
 *
 * Separado de `evaluateRoleSync` porque a escolha na lista precisa entrar por
 * aqui: quando a pessoa clica numa das N roles do JSON, o texto já foi
 * parseado e normalizado — reparsear seria refazer trabalho e, pior, perder o
 * `addAliases` que já foi aplicado àquele objeto.
 */
export function evaluateObjectSync(
  j: Record<string, any>, manualCloud?: EvaluateCloud | null, notes: string[] = [],
): EvaluateOutcome {
  const detection = manualCloud ? { cloud: manualCloud, reason: 'Selecionado manualmente' } : detectCloud(j)
  if (!detection.cloud) {
    return { status: 'error', code: 'cloud_not_detected', error: detection.reason }
  }
  const cloud = detection.cloud
  const identity = extractIdentity(cloud, j)

  let matchResult: { record: any; matchedBy: MatchedBy } | null = null
  switch (cloud) {
    case 'entraId': matchResult = matchEntra(j); break
    case 'azureRbac': matchResult = matchAzure(j); break
    case 'aws': matchResult = matchAws(j); break
    case 'gcp': matchResult = matchGcp(j); break
    case 'googleWorkspace': matchResult = matchGws(j); break
    case 'ibmCloud': matchResult = matchIbm(j); break
  }

  if (!matchResult) {
    return {
      status: 'ok',
      notes,
      result: {
        cloud,
        matched: false,
        matchedBy: null,
        identity: {
          name: identity.name || '(nome não encontrado no JSON)',
          id: identity.id,
          description: identity.description,
          sourceUrl: null,
          slug: null,
        },
        tier: {
          level: null,
          rawTier: null,
          label: 'Não classificado',
          color: '#6b7280',
          bg: '#6b728018',
          justification: 'Este role não foi encontrado na base de dados do site — não é possível determinar o tier automaticamente. A classificação de tier deste site só existe para roles já catalogados.',
        },
        permissions: extractRawPermissions(cloud, j),
        permissionCountHint: null,
        needsPermFetch: false,
        permFetchSlug: null,
        risk: { available: false },
      },
    }
  }

  const { record, matchedBy } = matchResult
  const tierInfo = getTierInfo(cloud, record)
  const tierMeta = tierInfo.level != null ? TIER_LEVEL_META[tierInfo.level] : null
  const permissions = extractDatasetPermissions(cloud, record)
  const risk = getRiskInfo(cloud, record.slug)

  return {
    status: 'ok',
    notes,
    result: {
      cloud,
      matched: true,
      matchedBy,
      identity: {
        name: identity.name || record.name,
        id: identity.id,
        description: identity.description || record.description || null,
        sourceUrl: getCloudUrl(cloud, record.slug),
        slug: record.slug,
      },
      tier: {
        level: tierInfo.level,
        rawTier: tierInfo.rawTier,
        label: tierMeta ? tierMeta.name : 'Não classificado (Unclassified)',
        color: tierMeta ? tierMeta.color : '#6b7280',
        bg: tierMeta ? tierMeta.bg : '#6b728018',
        justification: tierMeta
          ? `No ${CLOUD_META[cloud].label}, este role/policy tem o tier interno "${tierInfo.rawLabel}"${tierInfo.rawDescription ? ` (${tierInfo.rawDescription})` : ''}. Neste site, esse tier é normalizado para ${tierMeta.name} do modelo Enterprise Access Model (EAM) multi-cloud — ${tierMeta.description}`
          : `O tier interno "${tierInfo.rawLabel}" desta plataforma ainda está marcado como não classificado (Unclassified) no modelo EAM deste site.`,
      },
      permissions,
      permissionCountHint:
        cloud === 'azureRbac' ? (record as AzureRbacRole).permissionCount
        : cloud === 'gcp' ? (record as GcpRole).permissionCount
        : null,
      needsPermFetch: cloud === 'azureRbac' || cloud === 'gcp' || cloud === 'aws',
      permFetchSlug: cloud === 'azureRbac' || cloud === 'gcp' || cloud === 'aws' ? record.slug : null,
      risk,
    },
  }
}

