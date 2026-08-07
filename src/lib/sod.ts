// SoD Analyzer — lógica 100% client-side: resolução de roles, matching de
// conflitos e avaliação de listas de roles coladas pelo usuário.
// Nenhuma chamada de rede. Compatível com output: export.
//
// A resolução de nome→slug vem de src/data/sod/roleIndex.ts, não dos datasets
// completos: este módulo é carregado por /sod e por /sod/rules/[id], e importar
// aws.ts + gcp.ts + roles.ts + azureRbac.ts aqui levaria ~2,2 MB de JS para
// essas rotas só para ler dois campos por item. Ver o cabeçalho do roleIndex.

import {
  SOD_RULES, SoDRule, SoDRoleRef, SoDSeverity, SoDFramework, SoDPlatform, SoDProvider,
  SOD_PLATFORM_META, SOD_PROVIDER_META, SOD_PLATFORMS,
  findSoDRuleForPair, platformProvider, roleRefUrl,
} from '@/data/sod/rules'
import { SOD_ROLE_INDEX } from '@/data/sod/roleIndex'

/**
 * Escopo dos seletores e do avaliador. `all` significa "procure em todas as
 * plataformas"; um provedor restringe às plataformas dele; uma plataforma
 * restringe a ela mesma.
 *
 * Era `SoDCloudScope = 'entra-id' | 'azure-rbac' | 'both'` enquanto o catálogo
 * tinha um provedor só. Com cinco plataformas, `both` deixou de ter referente.
 */
export type SoDPlatformScope = 'all' | SoDProvider | SoDPlatform

export interface ResolvedRole {
  name: string
  cloud: SoDPlatform
  slug: string
  url: string
}

export interface RoleOption {
  name: string
  cloud: SoDPlatform
  slug: string
}

/** Plataformas que um escopo abrange. */
export function platformsInScope(scope: SoDPlatformScope): SoDPlatform[] {
  if (scope === 'all') return SOD_PLATFORMS
  if (scope in SOD_PROVIDER_META) return SOD_PROVIDER_META[scope as SoDProvider].platforms
  return [scope as SoDPlatform]
}

// ── Resolução de roles (por nome, case-insensitive) ─────────────────────────

/**
 * Nome de role não é chave em toda plataforma — o GCP tem sete nomes de
 * exibição repetidos. A busca devolve a primeira ocorrência em ordem
 * alfabética, que é a ordem do índice. As regras do catálogo não dependem
 * disso: elas referenciam o slug.
 */
export function matchRoleByName(name: string, scope: SoDPlatformScope = 'all'): ResolvedRole | null {
  const n = name.trim().toLowerCase()
  if (!n) return null
  for (const platform of platformsInScope(scope)) {
    for (const [roleName, slug] of SOD_ROLE_INDEX[platform]) {
      if (roleName.toLowerCase() === n) {
        return { name: roleName, cloud: platform, slug, url: `${SOD_PLATFORM_META[platform].urlBase}/${slug}` }
      }
    }
  }
  return null
}

export function resolveRoleRef(ref: SoDRoleRef): ResolvedRole | null {
  const entry = SOD_ROLE_INDEX[ref.cloud]?.find(([, slug]) => slug === ref.id)
  if (!entry) return null
  return { name: entry[0], cloud: ref.cloud, slug: entry[1], url: roleRefUrl(ref) }
}

/** Lista de roles disponíveis para os seletores com busca (matriz de conflito). */
export function listRoleOptions(scope: SoDPlatformScope): RoleOption[] {
  const out: RoleOption[] = []
  for (const platform of platformsInScope(scope)) {
    for (const [name, slug] of SOD_ROLE_INDEX[platform]) out.push({ name, cloud: platform, slug })
  }
  return out
}

export function searchRoleOptions(query: string, scope: SoDPlatformScope, limit = 50): RoleOption[] {
  const q = query.trim().toLowerCase()
  const all = listRoleOptions(scope)
  if (!q) return all.slice(0, limit)
  // Prefixo antes de "contém": com 4.596 itens, digitar "owner" precisa trazer
  // Owner antes de AcrQuarantineOwner.
  const starts: RoleOption[] = []
  const contains: RoleOption[] = []
  for (const r of all) {
    const n = r.name.toLowerCase()
    if (n.startsWith(q)) starts.push(r)
    else if (n.includes(q)) contains.push(r)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

/**
 * Sugestão de roles parecidas para uma role não reconhecida — comparação
 * simples via startsWith()/includes() (sem fuzzy matching), como um "você quis
 * dizer?" para ajudar a diagnosticar erros de digitação ou nomes desatualizados.
 */
export function findSimilarRoleNames(query: string, scope: SoDPlatformScope, limit = 3): RoleOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const all = listRoleOptions(scope)
  const starts = all.filter((r) => r.name.toLowerCase().startsWith(q) || q.startsWith(r.name.toLowerCase()))
  const contains = all.filter(
    (r) => !starts.includes(r) && (r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase()))
  )
  return [...starts, ...contains].sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit)
}

/** Todas as regras SoD em que a role informada aparece (como roleA ou roleB). */
export function findConflictsForRole(name: string, cloud: SoDPlatform): SoDRule[] {
  const n = name.trim().toLowerCase()
  return SOD_RULES.filter(
    (r) =>
      (r.roleA.name.toLowerCase() === n && r.roleA.cloud === cloud) ||
      (r.roleB.name.toLowerCase() === n && r.roleB.cloud === cloud)
  )
}

// ── Matriz de conflito: verificação de um par específico ────────────────────

export function checkConflict(
  nameA: string, cloudA: SoDPlatform,
  nameB: string, cloudB: SoDPlatform,
): SoDRule | undefined {
  return findSoDRuleForPair(nameA, cloudA, nameB, cloudB)
}

// ── Parsing do input colado na Avaliação de Usuário ─────────────────────────
// Aceita: uma role por linha, JSON array (["A","B"]) ou CSV ("A, B, C").

export function parseRoleListInput(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  // JSON array
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean)
      }
    } catch {
      // não era JSON válido — cai para os outros formatos
    }
  }

  // CSV — uma única linha com vírgulas
  if (!trimmed.includes('\n') && trimmed.includes(',')) {
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean)
  }

  // Uma role por linha (tolera "- ", "* ", "1. " no início de cada linha)
  return trimmed
    .split('\n')
    .map((s) => s.replace(/^\s*[-*•]\s*/, '').replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

// ── Avaliação de usuário: cruza todos os pares da lista colada ──────────────

export type SoDRiskLevel = 'approved' | 'attention' | 'elevated' | 'violation'

export interface ConflictFound {
  roleA: ResolvedRole
  roleB: ResolvedRole
  rule: SoDRule
}

export interface SoDEvaluationResult {
  totalRoles: number
  matchedRoles: ResolvedRole[]
  rolesNotFound: string[]
  conflicts: ConflictFound[]
  conflictsFound: number
  riskLevel: SoDRiskLevel
  severityBreakdown: Record<SoDSeverity, number>
  frameworksImpacted: SoDFramework[]
  /** Provedores presentes na lista avaliada. Mais de um = nenhuma regra cruza entre eles. */
  providersMatched: SoDProvider[]
}

export const SOD_RISK_META: Record<SoDRiskLevel, { label: string; color: string; bg: string; pulse?: boolean }> = {
  approved:  { label: 'APROVADO',        color: '#16a34a', bg: '#16a34a18' },
  attention: { label: 'ATENÇÃO',         color: '#ca8a04', bg: '#ca8a0418' },
  elevated:  { label: 'RISCO ELEVADO',   color: '#dc2626', bg: '#dc262618' },
  violation: { label: 'VIOLAÇÃO CRÍTICA', color: '#dc2626', bg: '#dc262630', pulse: true },
}

function calculateRiskLevel(severityBreakdown: Record<SoDSeverity, number>, totalConflicts: number): SoDRiskLevel {
  if (totalConflicts === 0) return 'approved'
  if (severityBreakdown.critical >= 2) return 'violation'
  if (severityBreakdown.critical >= 1 || severityBreakdown.high >= 1) return 'elevated'
  return 'attention'
}

export function evaluateUserRoles(rawNames: string[], scope: SoDPlatformScope): SoDEvaluationResult {
  const matched: ResolvedRole[] = []
  const rolesNotFound: string[] = []

  for (const raw of rawNames) {
    const resolved = matchRoleByName(raw, scope)
    if (resolved) matched.push(resolved)
    else rolesNotFound.push(raw)
  }

  const conflicts: ConflictFound[] = []
  for (let i = 0; i < matched.length; i++) {
    for (let j = i + 1; j < matched.length; j++) {
      const rule = findSoDRuleForPair(matched[i].name, matched[i].cloud, matched[j].name, matched[j].cloud)
      if (rule) conflicts.push({ roleA: matched[i], roleB: matched[j], rule })
    }
  }

  const severityBreakdown: Record<SoDSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  const frameworksSet = new Set<SoDFramework>()
  for (const c of conflicts) {
    severityBreakdown[c.rule.severity]++
    c.rule.frameworks.forEach((f) => frameworksSet.add(f))
  }

  const providersSet = new Set<SoDProvider>(matched.map((r) => platformProvider(r.cloud)))

  return {
    totalRoles: rawNames.length,
    matchedRoles: matched,
    rolesNotFound,
    conflicts,
    conflictsFound: conflicts.length,
    riskLevel: calculateRiskLevel(severityBreakdown, conflicts.length),
    severityBreakdown,
    frameworksImpacted: Array.from(frameworksSet),
    providersMatched: Array.from(providersSet),
  }
}

// ── Exemplos prontos para os botões da Avaliação de Usuário ────────────────
// Cada um é um conjunto REAL que dispara conflitos catalogados na plataforma
// indicada. Se uma regra for removida do catálogo, o exemplo correspondente
// perde efeito — por isso scripts/check-sod-examples.js os verifica.

export interface SoDExample {
  id: string
  scope: SoDPlatformScope
  roles: string[]
}

/** Cenário crítico do Entra ID — inclui 2 críticos, disparando "VIOLAÇÃO CRÍTICA". */
export const SOD_EXAMPLE_ROLES = [
  'Global Administrator',
  'Security Reader',
  'Privileged Role Administrator',
  'Security Administrator',
  'Compliance Administrator',
]

/** Acúmulo comum, sem Global Administrator: High/Medium, sem violação crítica. */
export const SOD_EXAMPLE_ROLES_TYPICAL = [
  'User Administrator',
  'Password Administrator',
  'Identity Governance Administrator',
]

export const SOD_EXAMPLES: SoDExample[] = [
  { id: 'entra-critical', scope: 'entra-id', roles: SOD_EXAMPLE_ROLES },
  { id: 'entra-typical',  scope: 'entra-id', roles: SOD_EXAMPLE_ROLES_TYPICAL },
  { id: 'aws',   scope: 'aws', roles: ['PowerUserAccess', 'IAMFullAccess', 'AWSCloudTrail_FullAccess', 'SecurityAudit'] },
  { id: 'gcp',   scope: 'gcp', roles: ['Service Account Admin', 'Service Account Key Admin', 'Security Admin', 'Logging Admin'] },
  { id: 'gws',   scope: 'google', roles: ['Super Admin', 'Multi-party approval Admin', 'Organization Administrator'] },
]

// ── Exportação em texto estruturado (botão "Exportar") ──────────────────────

export function generateSoDReportText(result: SoDEvaluationResult): string {
  const lines: string[] = []
  const riskMeta = SOD_RISK_META[result.riskLevel]
  const platformLabel = (p: SoDPlatform) => SOD_PLATFORM_META[p].label

  const platforms = Array.from(new Set(result.matchedRoles.map((r) => r.cloud))).map(platformLabel)
  lines.push('=== Relatório SoD Analyzer — IAM Scope ===')
  lines.push(`Gerado em: ${new Date().toISOString()}`)
  lines.push(`Plataformas na lista: ${platforms.length > 0 ? platforms.join(', ') : '—'}`)
  lines.push('')
  lines.push(`Risco geral: ${riskMeta.label}`)
  lines.push(`Total de roles avaliadas: ${result.totalRoles}`)
  lines.push(`Conflitos encontrados: ${result.conflictsFound}`)
  lines.push(`Breakdown: ${result.severityBreakdown.critical} Critical, ${result.severityBreakdown.high} High, ${result.severityBreakdown.medium} Medium, ${result.severityBreakdown.low} Low`)
  if (result.frameworksImpacted.length > 0) {
    lines.push(`Frameworks impactados: ${result.frameworksImpacted.join(', ')}`)
  }
  if (result.providersMatched.length > 1) {
    lines.push('')
    lines.push('NOTA: a lista contém roles de mais de um provedor. O catálogo não')
    lines.push('cruza provedores diferentes — acúmulo entre eles não gera conflito')
    lines.push('aqui, e precisa ser avaliado como risco de governança, à parte.')
  }
  lines.push('')

  if (result.conflicts.length > 0) {
    lines.push('--- Conflitos ---')
    result.conflicts.forEach((c, i) => {
      lines.push(`${i + 1}. [${c.rule.severity.toUpperCase()}] ${c.roleA.name} (${platformLabel(c.roleA.cloud)}) + ${c.roleB.name} (${platformLabel(c.roleB.cloud)})`)
      lines.push(`   Regra: ${c.rule.name}`)
      lines.push(`   Risco: ${c.rule.risk}`)
      lines.push(`   Mitigação: ${c.rule.mitigation.join(' | ')}`)
      lines.push('')
    })
  } else {
    lines.push('Nenhum conflito encontrado na base de regras.')
    lines.push('')
  }

  if (result.rolesNotFound.length > 0) {
    lines.push('--- Roles não reconhecidas (validar manualmente) ---')
    result.rolesNotFound.forEach((r) => lines.push(`- ${r}`))
  }

  return lines.join('\n')
}

// Re-exporta os tipos/dados principais de rules.ts para conveniência dos componentes.
export { SOD_RULES } from '@/data/sod/rules'
export type {
  SoDRule, SoDCategory, SoDFramework, SoDSeverity, SoDCloud, SoDRoleRef,
  SoDPlatform, SoDProvider,
} from '@/data/sod/rules'
