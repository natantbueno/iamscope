// SoD Analyzer — lógica 100% client-side: resolução de roles, matching de
// conflitos e avaliação de listas de roles coladas pelo usuário.
// Nenhuma chamada de rede. Compatível com output: export.

import { ROLES } from '@/data/roles'
import { AZURE_ROLES } from '@/data/azureRbac'
import {
  SOD_RULES, SoDRule, SoDRoleRef, SoDSeverity, SoDFramework,
  findSoDRuleForPair,
} from '@/data/sod/rules'

export type SoDCloudScope = 'entra-id' | 'azure-rbac' | 'both'

export interface ResolvedRole {
  name: string
  cloud: 'entra-id' | 'azure-rbac'
  slug: string
  url: string
}

export interface RoleOption {
  name: string
  cloud: 'entra-id' | 'azure-rbac'
  slug: string
}

// ── Resolução de roles (por nome, case-insensitive) ─────────────────────────

export function matchRoleByName(name: string, cloud: SoDCloudScope = 'both'): ResolvedRole | null {
  const n = name.trim().toLowerCase()
  if (!n) return null
  if (cloud === 'entra-id' || cloud === 'both') {
    const r = ROLES.find((r) => r.name.toLowerCase() === n)
    if (r) return { name: r.name, cloud: 'entra-id', slug: r.slug, url: `/entraid/roles/${r.slug}` }
  }
  if (cloud === 'azure-rbac' || cloud === 'both') {
    const r = AZURE_ROLES.find((r) => r.name.toLowerCase() === n)
    if (r) return { name: r.name, cloud: 'azure-rbac', slug: r.slug, url: `/azure-rbac/roles/${r.slug}` }
  }
  return null
}

export function resolveRoleRef(ref: SoDRoleRef): ResolvedRole | null {
  return matchRoleByName(ref.name, ref.cloud)
}

/** Lista de roles disponíveis para os seletores com busca (matriz de conflito). */
export function listRoleOptions(cloud: SoDCloudScope): RoleOption[] {
  const out: RoleOption[] = []
  if (cloud === 'entra-id' || cloud === 'both') {
    out.push(...ROLES.map((r) => ({ name: r.name, cloud: 'entra-id' as const, slug: r.slug })))
  }
  if (cloud === 'azure-rbac' || cloud === 'both') {
    out.push(...AZURE_ROLES.map((r) => ({ name: r.name, cloud: 'azure-rbac' as const, slug: r.slug })))
  }
  return out
}

export function searchRoleOptions(query: string, cloud: SoDCloudScope, limit = 50): RoleOption[] {
  const q = query.trim().toLowerCase()
  const all = listRoleOptions(cloud).sort((a, b) => a.name.localeCompare(b.name))
  if (!q) return all.slice(0, limit)
  return all.filter((r) => r.name.toLowerCase().includes(q)).slice(0, limit)
}

/**
 * Sugestão de roles parecidas para uma role não reconhecida — comparação
 * simples via startsWith()/includes() (sem fuzzy matching), como um "você quis
 * dizer?" para ajudar a diagnosticar erros de digitação ou nomes desatualizados.
 */
export function findSimilarRoleNames(query: string, cloud: SoDCloudScope, limit = 3): RoleOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const all = listRoleOptions(cloud)
  const starts = all.filter((r) => r.name.toLowerCase().startsWith(q) || q.startsWith(r.name.toLowerCase()))
  const contains = all.filter(
    (r) => !starts.includes(r) && (r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase()))
  )
  return [...starts, ...contains].sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit)
}

/** Todas as regras SoD em que a role informada aparece (como roleA ou roleB). */
export function findConflictsForRole(name: string, cloud: 'entra-id' | 'azure-rbac'): SoDRule[] {
  const n = name.trim().toLowerCase()
  return SOD_RULES.filter(
    (r) =>
      (r.roleA.name.toLowerCase() === n && r.roleA.cloud === cloud) ||
      (r.roleB.name.toLowerCase() === n && r.roleB.cloud === cloud)
  )
}

// ── Matriz de conflito: verificação de um par específico ────────────────────

export function checkConflict(
  nameA: string, cloudA: 'entra-id' | 'azure-rbac',
  nameB: string, cloudB: 'entra-id' | 'azure-rbac',
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

export function evaluateUserRoles(rawNames: string[], cloudScope: SoDCloudScope): SoDEvaluationResult {
  const matched: ResolvedRole[] = []
  const rolesNotFound: string[] = []

  for (const raw of rawNames) {
    const resolved = matchRoleByName(raw, cloudScope)
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

  return {
    totalRoles: rawNames.length,
    matchedRoles: matched,
    rolesNotFound,
    conflicts,
    conflictsFound: conflicts.length,
    riskLevel: calculateRiskLevel(severityBreakdown, conflicts.length),
    severityBreakdown,
    frameworksImpacted: Array.from(frameworksSet),
  }
}

// ── Exemplo pronto para o botão "Exemplo" da Avaliação de Usuário ──────────
// Conjunto real de roles do Entra ID que dispara múltiplos conflitos
// catalogados (inclui 2 críticos, disparando o banner "VIOLAÇÃO CRÍTICA").

export const SOD_EXAMPLE_ROLES = [
  'Global Administrator',
  'Security Reader',
  'Privileged Role Administrator',
  'Security Administrator',
  'Compliance Administrator',
]

// ── Exemplo "Cenário Típico" — conflitos High/Medium reais, sem Global
// Administrator, para ilustrar um caso comum de acúmulo de acesso que ainda
// assim exige atenção (mas não dispara a violação crítica).

export const SOD_EXAMPLE_ROLES_TYPICAL = [
  'User Administrator',
  'Password Administrator',
  'Identity Governance Administrator',
]

// ── Exportação em texto estruturado (botão "Exportar") ──────────────────────

export function generateSoDReportText(result: SoDEvaluationResult): string {
  const lines: string[] = []
  const riskMeta = SOD_RISK_META[result.riskLevel]

  lines.push('=== Relatório SoD Analyzer — Entra ID + Azure RBAC ===')
  lines.push(`Gerado em: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(`Risco geral: ${riskMeta.label}`)
  lines.push(`Total de roles avaliadas: ${result.totalRoles}`)
  lines.push(`Conflitos encontrados: ${result.conflictsFound}`)
  lines.push(`Breakdown: ${result.severityBreakdown.critical} Critical, ${result.severityBreakdown.high} High, ${result.severityBreakdown.medium} Medium, ${result.severityBreakdown.low} Low`)
  if (result.frameworksImpacted.length > 0) {
    lines.push(`Frameworks impactados: ${result.frameworksImpacted.join(', ')}`)
  }
  lines.push('')

  if (result.conflicts.length > 0) {
    lines.push('--- Conflitos ---')
    result.conflicts.forEach((c, i) => {
      lines.push(`${i + 1}. [${c.rule.severity.toUpperCase()}] ${c.roleA.name} (${c.roleA.cloud}) + ${c.roleB.name} (${c.roleB.cloud})`)
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
export type { SoDRule, SoDCategory, SoDFramework, SoDSeverity, SoDCloud, SoDRoleRef } from '@/data/sod/rules'
