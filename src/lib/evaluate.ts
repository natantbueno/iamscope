// ── Role Evaluator — detecção de cloud + matching, 100% client-side ─────────
// Nenhuma chamada de rede externa. A única exceção é um fetch same-origin
// opcional para public/azure-perms/{slug}.json — o mesmo asset estático que
// /azure-rbac/roles/[slug] já usa para exibir a lista de Actions do Azure RBAC
// (esse dataset não guarda a lista de actions no bundle TypeScript, só o
// permissionCount). Não é uma API externa, é um JSON do próprio site.
//
// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISE PRÉVIA — achados que orientam este arquivo
// ═══════════════════════════════════════════════════════════════════════════
// 1. Nenhum dos 7 datasets em src/data/ tem campos "risk" ou "mitigations"
//    por role/policy. Esses dados só existem em src/data/compare/equivalences.json,
//    curado para ~23 funções críticas (global-admin, billing-admin, security-admin,
//    privileged-role-admin, conditional-access-admin, entre outras) — no máximo
//    1 role por cloud por função. A Seção "Riscos e Mitigações" só terá dados
//    reais quando o slug do role encontrado bater com um slug cadastrado em
//    equivalences.json; caso contrário, mostra aviso honesto de indisponibilidade.
//
// 2. Identificador nativo da plataforma (o que aparece no JSON exportado da
//    API real) só é armazenado no dataset do site para 4 das 6 clouds:
//      Entra ID    → id (GUID / roleTemplateId)
//      Azure RBAC  → id (GUID do roleDefinition)
//      AWS         → arn
//      GCP         → roleId (formato "roles/xxx")
//    As outras 3 só têm slug/name no dataset do site — sem roleId numérico
//    (Google Workspace) e sem CRN (IBM Cloud). Nesses casos
//    clouds o matching é necessariamente por nome (case-insensitive),
//    nunca por ID nativo da plataforma.
//
// 3. Lista de permissões granulares no bundle:
//      Entra ID           → permissions[] (action + category + tier individual)
//      AWS / GCP / GWS /
//      IBM Cloud           → privileges[] (texto) e um array bruto opcional
//                            (actions / permissions / apiPrivileges / verbActions)
//      Azure RBAC          → NÃO tem lista no bundle .ts, só permissionCount.
//                            A lista real mora em public/azure-perms/{slug}.json,
//                            buscada sob demanda via fetchExternalPermissions().
// ═══════════════════════════════════════════════════════════════════════════

import { ROLES, EntraRole, EamTier } from '@/data/roles'
import { AZURE_ROLES, AzureRbacRole, AzureRbacTier, AzureRbacPermission, AZURE_TIER_META } from '@/data/azureRbac'
import { AWS_POLICIES, AwsPolicy, AwsTier, AWS_TIER_META } from '@/data/aws'
import { GCP_ROLES, GcpRole, GcpTier, GCP_TIER_META } from '@/data/gcp'
import { GWS_ROLES, GwsAdminRole, GwsTier, GWS_TIER_META } from '@/data/googleWorkspace'
import { IBM_ROLES, IbmRole, IbmTier, IBM_TIER_META } from '@/data/ibmCloud'
import { CloudId, CLOUD_META, RiskLevel, getCloudUrl } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'
import tiersData from '@/data/compare/tiers.json'

export type EvaluateCloud = CloudId

export const EVALUATE_CLOUDS: EvaluateCloud[] = ['entraId', 'azureRbac', 'aws', 'gcp', 'googleWorkspace', 'ibmCloud']

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Tipos de resultado ───────────────────────────────────────────────────────

export interface DetectionResult {
  cloud: EvaluateCloud | null
  reason: string
}

export interface EvaluatedPermission {
  name: string
  tier?: string // sub-tier individual — só disponível para Entra ID
}

export interface EvaluationTier {
  level: 0 | 1 | 2 | null
  rawTier: string | null
  label: string
  color: string
  bg: string
  justification: string
}

export interface EvaluationRisk {
  available: boolean
  level?: RiskLevel
  functionName?: string
  keyPermissions?: string[]
  mitigations?: string[]
  notes?: string
}

export interface EvaluationResultData {
  cloud: EvaluateCloud
  matched: boolean
  matchedBy: 'id' | 'name' | null
  identity: {
    name: string
    id: string | null
    description: string | null
    sourceUrl: string | null
    slug: string | null
  }
  tier: EvaluationTier
  permissions: EvaluatedPermission[]
  permissionCountHint: number | null // usado quando a lista completa não está no bundle (Azure RBAC)
  /** Sinaliza a UI para buscar as permissões fora do bundle (Azure RBAC, GCP). */
  needsPermFetch: boolean
  permFetchSlug: string | null
  risk: EvaluationRisk
}

export type EvaluateOutcome =
  | { ok: true; result: EvaluationResultData }
  | { ok: false; error: string; code: 'invalid_json' | 'not_object' | 'cloud_not_detected' }

// ── Detecção automática de cloud ────────────────────────────────────────────

export function detectCloud(json: unknown): DetectionResult {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) {
    return { cloud: null, reason: 'JSON não é um objeto único' }
  }
  const j = json as Record<string, any>

  // Azure RBAC — assinatura ARM bem específica
  if (j.type === 'Microsoft.Authorization/roleDefinitions' || j.properties?.roleName) {
    return { cloud: 'azureRbac', reason: '"type": "Microsoft.Authorization/roleDefinitions" ou "properties.roleName" encontrado' }
  }

  // AWS — ARN ou Policy Document
  const arn = j.Arn ?? j.arn ?? j.Policy?.Arn
  if (typeof arn === 'string' && arn.startsWith('arn:aws:iam')) {
    return { cloud: 'aws', reason: `ARN com prefixo "arn:aws:iam" encontrado` }
  }
  if (j.PolicyDocument || Array.isArray(j.Statement)) {
    return { cloud: 'aws', reason: 'Estrutura de Policy Document (Statement) da AWS encontrada' }
  }

  // GCP — role name no formato roles/xxx ou projects/.../roles/xxx
  if (typeof j.name === 'string' && /(^roles\/)|(\/roles\/)/.test(j.name)) {
    return { cloud: 'gcp', reason: `"name" no formato de role do GCP ("${j.name}")` }
  }

  // Google Workspace — roleId + isSuperAdminRole, ou kind do Directory API
  if ((typeof j.roleId === 'string' || typeof j.roleId === 'number') && typeof j.isSuperAdminRole === 'boolean') {
    return { cloud: 'googleWorkspace', reason: '"roleId" + "isSuperAdminRole" encontrados (Directory API)' }
  }
  if (j.kind === 'admin#directory#role') {
    return { cloud: 'googleWorkspace', reason: '"kind": "admin#directory#role" encontrado' }
  }


  // IBM Cloud — CRN
  const crn = j.crn ?? j.id
  if (typeof crn === 'string' && crn.startsWith('crn:v1:bluemix')) {
    return { cloud: 'ibmCloud', reason: '"crn"/"id" com prefixo "crn:v1:bluemix" encontrado' }
  }

  // Entra ID — campos explícitos de directory role
  if (typeof j.roleTemplateId === 'string' || typeof j.directoryRoleId === 'string') {
    return { cloud: 'entraId', reason: '"roleTemplateId"/"directoryRoleId" encontrado' }
  }

  // Entra ID — fallback fraco: UUID + displayName, sem sinal de nenhuma outra cloud
  if (typeof j.id === 'string' && UUID_RE.test(j.id) && typeof j.displayName === 'string') {
    return { cloud: 'entraId', reason: '"id" em formato UUID + "displayName" (padrão de directory role do Entra ID)' }
  }

  return { cloud: null, reason: 'Nenhuma assinatura de cloud reconhecida' }
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
    case 'googleWorkspace':
      return {
        name: j.roleName ?? j.name ?? '',
        id: j.roleId != null ? String(j.roleId) : null,
        description: j.roleDescription ?? j.description ?? null,
      }
      return {
        name: j.name ?? j.displayName ?? '',
        id: typeof j.id === 'string' ? j.id : null,
        description: j.description ?? null,
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

// Google Workspace e IBM Cloud: o dataset do site não guarda o
// identificador nativo da plataforma (roleId numérico / CRN),
// então o match só pode ser feito por nome (case-insensitive).

function matchGws(j: Record<string, any>): { record: GwsAdminRole; matchedBy: MatchedBy } | null {
  const nameCandidate = j.roleName ?? j.name
  if (typeof nameCandidate === 'string' && nameCandidate.trim()) {
    const byName = GWS_ROLES.find((r) => r.name.toLowerCase() === nameCandidate.trim().toLowerCase())
    if (byName) return { record: byName, matchedBy: 'name' }
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

const ENTRA_TIER_LEVEL: Record<EamTier, 0 | 1 | 2 | null> = {
  ControlPlane: 0, ManagementPlane: 1, UserAccess: 2, Unclassified: null,
}
const AZURE_TIER_LEVEL: Record<AzureRbacTier, 0 | 1 | 2> = {
  FullControl: 0, AccessManagement: 0, Contributor: 1, DataPlane: 1, Specialized: 1, Reader: 2,
}
const AWS_TIER_LEVEL: Record<AwsTier, 0 | 1 | 2> = {
  FullAccess: 0, PowerUser: 1, Operator: 1, Specialized: 1, ReadOnly: 2,
}
const GCP_TIER_LEVEL: Record<GcpTier, 0 | 1 | 2> = {
  ProjectOwner: 0, Admin: 0, Editor: 1, Operator: 1, Developer: 1, Specialized: 1, Viewer: 2,
}
const GWS_TIER_LEVEL: Record<GwsTier, 0 | 1 | 2> = {
  SuperAdmin: 0, DelegatedAdmin: 1, ServiceAdmin: 1, SpecializedAdmin: 1, ReadOnly: 2,
}
const IBM_TIER_LEVEL: Record<IbmTier, 0 | 1 | 2> = {
  AccountAdmin: 0, PlatformAdmin: 1, PlatformOperator: 1, ServiceManager: 1, ReadOnly: 2,
}

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
      return (r.apiPrivileges ?? r.privileges).map((a) => ({ name: a }))
    }
    case 'ibmCloud': {
      const r = record as IbmRole
      return (r.actions ?? r.privileges).map((a) => ({ name: a }))
    }
  }
}

/**
 * Enriquecimento sob demanda para as clouds cujas permissões não vivem no
 * bundle — hoje Azure RBAC e GCP. Usa os mesmos assets estáticos das páginas
 * de detalhe: public/azure-perms/{slug}.json e public/gcp-perms/{slug}.json.
 *
 * Chamar apenas quando needsPermFetch === true.
 */
export async function fetchExternalPermissions(
  cloud: EvaluateCloud, slug: string,
): Promise<EvaluatedPermission[]> {
  try {
    if (cloud === 'azureRbac') {
      const res = await fetch(`/azure-perms/${slug}.json`)
      if (!res.ok) return []
      const data = (await res.json()) as AzureRbacPermission[]
      return data.map((p) => ({ name: p.action, tier: p.type }))
    }
    if (cloud === 'gcp') {
      const res = await fetch(`/gcp-perms/${slug}.json`)
      if (!res.ok) return []
      const data = (await res.json()) as string[]
      return data.map((a) => ({ name: a }))
    }
    if (cloud === 'aws') {
      const res = await fetch(`/aws-policy-docs/${slug}.json`)
      if (!res.ok) return []
      const data = (await res.json()) as { actions?: string[] }
      return (data.actions ?? []).map((a) => ({ name: a }))
    }
    return []
  } catch {
    return []
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

export function getResultForSlug(cloud: EvaluateCloud, slug: string): EvaluationResultData | null {
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

export function evaluateRole(rawText: string, manualCloud?: EvaluateCloud | null): EvaluateOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (e) {
    return { ok: false, code: 'invalid_json', error: 'JSON inválido — verifique vírgulas, aspas e chaves. ' + (e instanceof Error ? e.message : '') }
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, code: 'not_object', error: 'O JSON precisa ser um objeto único (não uma lista). Cole o objeto de um único role/policy.' }
  }
  const j = parsed as Record<string, any>

  const detection = manualCloud ? { cloud: manualCloud, reason: 'Selecionado manualmente' } : detectCloud(j)
  if (!detection.cloud) {
    return { ok: false, code: 'cloud_not_detected', error: detection.reason }
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
      ok: true,
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
    ok: true,
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
