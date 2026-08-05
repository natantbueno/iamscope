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

// ═══════════════════════════════════════════════════════════════════════════
// FRONT LEVE — O CATÁLOGO ENTRA POR IMPORT DINÂMICO
// ═══════════════════════════════════════════════════════════════════════════
// Este módulo não importa nenhum dataset. Fica aqui só o que não precisa deles:
// tipos, a detecção de cloud (que lê a forma do JSON colado, não o catálogo) e
// o fetch de permissões que já vinha de public/.
//
// O matching contra os 6 catálogos mora em ./evaluateCatalog, carregado com
// `await import()` na primeira avaliação. Antes desta separação, importar
// qualquer coisa daqui arrastava roles.ts + azureRbac.ts + aws.ts + gcp.ts +
// googleWorkspace.ts + ibmCloud.ts + equivalences.json — ~450 kB no First Load
// JS da rota /evaluate, e também em quem só queria `detectCloud` (RoleInput).
//
// Custo: evaluateRole() e getResultForSlug() passaram a ser assíncronos.
// ═══════════════════════════════════════════════════════════════════════════

import { CloudId, RiskLevel } from '@/data/compare/types'
// `import type` de propósito: é apagado na compilação, então tipar o retorno
// do fetch de public/azure-perms/{slug}.json NÃO traz azureRbac.ts de volta
// para o bundle desta rota — que é o ponto todo desta separação.
import type { AzureRbacPermission } from '@/data/azureRbac'

export type EvaluateCloud = CloudId

export const EVALUATE_CLOUDS: EvaluateCloud[] = ['entraId', 'azureRbac', 'aws', 'gcp', 'googleWorkspace', 'ibmCloud']

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

// ── Ponte para o catálogo ───────────────────────────────────────────────────
// Import dinâmico: o chunk pesado só é baixado quando alguém de fato avalia.

/** Avalia o JSON colado contra os catálogos das 6 clouds. */
export async function evaluateRole(
  rawText: string, manualCloud?: EvaluateCloud | null,
): Promise<EvaluateOutcome> {
  const { evaluateRoleSync } = await import('./evaluateCatalog')
  return evaluateRoleSync(rawText, manualCloud)
}

/** Reconstrói o resultado a partir de cloud+slug, para /evaluate?cloud=&role=. */
export async function getResultForSlug(
  cloud: EvaluateCloud, slug: string,
): Promise<EvaluationResultData | null> {
  const { getResultForSlugSync } = await import('./evaluateCatalog')
  return getResultForSlugSync(cloud, slug)
}
