// Permission Scope — busca reversa de permissão em todas as clouds.
//
// A pergunta que esta lib responde é: "dada uma permissão qualquer, quais roles
// (ou policies) a concedem?" — em qualquer uma das 6 plataformas do catálogo.
//
// Reaproveita os índices que já existem no site (getRoleActions, getAwsActions,
// getGcpPermissions), que já invertem a relação role -> permissão e são
// cacheados em memória. Google Workspace não tinha um helper equivalente, então
// é montado aqui a partir de privileges/apiPrivileges.
//
// NENHUM dataset entra por import estático: todos chegam por `await import()`
// dentro de ensureLocalPermissionIndex(). Ver o bloco de Entra/GWS abaixo.
//
// Azure RBAC é o único caso que NÃO entra aqui: as permissões dele vivem em 926
// arquivos JSON separados (public/azure-perms/*.json), fora do bundle. A página
// carrega o índice invertido dele sob demanda (public/azure-perms-index.json) e
// mescla o resultado com o que esta lib devolve.

import { CloudId } from '@/data/compare/types'
import { getAwsActions, getAwsActionsSync } from './awsActions'
import { getGcpPermissions, getGcpPermissionsSync } from './gcpPermissions'

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

// ── Entra ID e Google Workspace, sob demanda ────────────────────────────────
//
// POR QUE ESTES DOIS TAMBÉM SAÍRAM DO IMPORT ESTÁTICO
//   AWS e GCP já vinham de índice em public/. Entra e GWS continuavam entrando
//   pelo topo do módulo: `getRoleActions` arrasta src/data/roles.ts (392 kB) e
//   `GWS_ROLES` arrasta googleWorkspace.ts (54 kB). Como esta lib é importada
//   pela página /permission-scope, os dois caíam no First Load JS da rota
//   inteira — ~416 kB para uma busca que o usuário talvez nem faça.
//
//   Agora chegam por `await import()` dentro de ensureLocalPermissionIndex(),
//   que a página já chamava antes da primeira busca. Mesmo desenho de AWS e
//   GCP: um cache em memória e um acessor síncrono que devolve null enquanto
//   não chegou — nunca uma lista vazia, que a busca leria como "sem resultado".

interface GwsPermEntry { permission: string; roles: ScopeRoleRef[] }
let _gwsCache: GwsPermEntry[] | null = null

/** null = ainda não carregado. Diferente de [], que significaria "não achou". */
function getGwsPermissionsSync(): GwsPermEntry[] | null { return _gwsCache }

async function loadGwsPermissions(): Promise<void> {
  if (_gwsCache) return
  const { GWS_ROLES } = await import('@/data/googleWorkspace')
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
}

interface EntraPermEntry { action: string; usedByRoles: ScopeRoleRef[] }
let _entraCache: EntraPermEntry[] | null = null

function getEntraActionsSync(): EntraPermEntry[] | null { return _entraCache }

async function loadEntraActions(): Promise<void> {
  if (_entraCache) return
  const { getRoleActions } = await import('./roleActions')
  _entraCache = getRoleActions()
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

  for (const e of getEntraActionsSync() ?? []) {
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
  // IBM Cloud fora: a busca reversa precisa de permission com identificador, e
  // a IBM não publica isso — as ações são mapeadas por cada serviço, não pelo
  // catálogo de roles. O que existia aqui vinha de 557 actions inventadas.
  for (const e of getGwsPermissionsSync() ?? []) {
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
  if (getEntraActionsSync() === null) pending.push(loadEntraActions())
  if (getGwsPermissionsSync() === null) pending.push(loadGwsPermissions())

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
