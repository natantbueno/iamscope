// Permission Scope — busca reversa de permissão em todas as clouds.
//
// A pergunta que esta lib responde é: "dada uma permissão qualquer, quais roles
// (ou policies) a concedem?" — em qualquer uma das 6 plataformas do catálogo.
//
// Reaproveita os índices que já existem no site (getRoleActions, getAwsActions,
// getGcpPermissions, getIbmActions), que já invertem a relação
// role -> permissão e são cacheados em memória. Google Workspace não tinha um
// helper equivalente, então é montado aqui a partir de privileges/apiPrivileges.
//
// Azure RBAC é o único caso que NÃO entra aqui: as permissões dele vivem em 926
// arquivos JSON separados (public/azure-perms/*.json), fora do bundle. A página
// carrega o índice invertido dele sob demanda (public/azure-perms-index.json) e
// mescla o resultado com o que esta lib devolve.

import { CloudId } from '@/data/compare/types'
import { getRoleActions } from './roleActions'
import { getAwsActions, getAwsActionsSync } from './awsActions'
import { getGcpPermissions, getGcpPermissionsSync } from './gcpPermissions'
import { getIbmActions } from './ibmActions'
import { GWS_ROLES } from '@/data/googleWorkspace'

export interface ScopeRoleRef {
  name: string
  slug: string
  isPrivileged: boolean
}

export interface ScopeMatch {
  cloud: CloudId
  /** A permissão exatamente como aparece na plataforma de origem. */
  permission: string
  roles: ScopeRoleRef[]
}

/** Rótulo do que a plataforma chama de "permissão" e de "role". */
export const CLOUD_TERMS: Record<CloudId, { permission: string; principal: string }> = {
  entraId:         { permission: 'Role action',   principal: 'roles' },
  azureRbac:       { permission: 'Action',        principal: 'roles' },
  aws:             { permission: 'IAM action',    principal: 'policies' },
  gcp:             { permission: 'Permission',    principal: 'roles' },
  ibmCloud:        { permission: 'IAM action',    principal: 'roles' },
  googleWorkspace: { permission: 'Privilege',     principal: 'roles' },
}

// ── Google Workspace ────────────────────────────────────────────────────────
// Não existe helper pronto: as roles carregam `privileges` (privilégios do
// Admin console) e `apiPrivileges` (nomes usados pela Admin SDK). Os dois são
// tratados como permissões pesquisáveis, deduplicados por nome.

interface GwsPermEntry { permission: string; roles: ScopeRoleRef[] }
let _gwsCache: GwsPermEntry[] | null = null

function getGwsPermissions(): GwsPermEntry[] {
  if (_gwsCache) return _gwsCache
  const map = new Map<string, GwsPermEntry>()
  for (const role of GWS_ROLES) {
    const all = [...(role.privileges ?? []), ...(role.apiPrivileges ?? [])]
    for (const p of new Set(all)) {
      let entry = map.get(p)
      if (!entry) { entry = { permission: p, roles: [] }; map.set(p, entry) }
      if (!entry.roles.some((r) => r.slug === role.slug)) {
        entry.roles.push({ name: role.name, slug: role.slug, isPrivileged: role.isPrivileged })
      }
    }
  }
  _gwsCache = [...map.values()]
  return _gwsCache
}

// ── Índice unificado (tudo menos Azure RBAC) ────────────────────────────────

let _cache: ScopeMatch[] | null = null

/**
 * Índice achatado de permissão -> roles das 6 clouds que vivem no bundle.
 * Construído uma única vez e mantido em memória.
 */
export function getLocalPermissionIndex(): ScopeMatch[] {
  if (_cache) return _cache

  const out: ScopeMatch[] = []

  for (const e of getRoleActions()) {
    out.push({ cloud: 'entraId', permission: e.action, roles: e.usedByRoles })
  }
  for (const e of getAwsActionsSync() ?? []) {
    out.push({ cloud: 'aws', permission: e.action, roles: e.usedByPolicies })
  }
  // GCP saiu do bundle: as permissões vêm de public/gcp-perms-index.json.
  // Aqui usamos só o que já estiver em memória — quem precisa do índice
  // completo chama ensureLocalPermissionIndex() antes.
  for (const e of getGcpPermissionsSync() ?? []) {
    out.push({ cloud: 'gcp', permission: e.permission, roles: e.usedByRoles })
  }
  for (const e of getIbmActions()) {
    out.push({ cloud: 'ibmCloud', permission: e.action, roles: e.usedByRoles })
  }
  for (const e of getGwsPermissions()) {
    out.push({ cloud: 'googleWorkspace', permission: e.permission, roles: e.roles })
  }

  _cache = out
  return out
}

/**
 * Garante que GCP e AWS estejam no índice antes de montá-lo.
 *
 * getLocalPermissionIndex() é síncrono e não pode esperar rede; sem esta
 * chamada, uma busca feita antes de os índices chegarem devolveria zero
 * resultados dessas clouds silenciosamente — pior do que demorar um instante.
 */
export async function ensureLocalPermissionIndex(): Promise<ScopeMatch[]> {
  const pending: Promise<unknown>[] = []
  if (getGcpPermissionsSync() === null) pending.push(getGcpPermissions())
  if (getAwsActionsSync() === null) pending.push(getAwsActions())

  if (pending.length) {
    // allSettled: se o índice de uma cloud falhar, as outras continuam valendo
    await Promise.allSettled(pending)
    _cache = null // rebuild, agora com o que tiver chegado
  }
  return getLocalPermissionIndex()
}

/**
 * Busca por substring, case-insensitive. Ordena priorizando o match mais
 * "exato" possível: igual > começa com > contém, e depois pelo número de roles
 * (mais roles = permissão mais difundida, normalmente mais relevante).
 */
export function searchLocalPermissions(query: string, limitPerCloud = 40): ScopeMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const hits = getLocalPermissionIndex().filter((m) =>
    m.permission.toLowerCase().includes(q),
  )

  const rank = (p: string) => {
    const s = p.toLowerCase()
    if (s === q) return 0
    if (s.startsWith(q)) return 1
    return 2
  }

  hits.sort((a, b) =>
    rank(a.permission) - rank(b.permission) ||
    b.roles.length - a.roles.length ||
    a.permission.localeCompare(b.permission),
  )

  // Limita por cloud para uma cloud com milhares de matches não afogar as outras.
  const perCloud = new Map<CloudId, number>()
  const capped: ScopeMatch[] = []
  for (const h of hits) {
    const n = perCloud.get(h.cloud) ?? 0
    if (n >= limitPerCloud) continue
    perCloud.set(h.cloud, n + 1)
    capped.push(h)
  }
  return capped
}

/** Quantos matches existem por cloud, antes de qualquer limite. */
export function countLocalMatches(query: string): Record<string, number> {
  const q = query.trim().toLowerCase()
  if (!q) return {}
  const counts: Record<string, number> = {}
  for (const m of getLocalPermissionIndex()) {
    if (m.permission.toLowerCase().includes(q)) {
      counts[m.cloud] = (counts[m.cloud] ?? 0) + 1
    }
  }
  return counts
}

/** Total de permissões distintas indexadas por cloud — usado no estado vazio. */
export function getLocalIndexStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const m of getLocalPermissionIndex()) {
    stats[m.cloud] = (stats[m.cloud] ?? 0) + 1
  }
  return stats
}
