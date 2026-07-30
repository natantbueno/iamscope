import { GCP_ROLES, GcpTier } from '@/data/gcp'

/**
 * Índice de permissões do GCP.
 *
 * MUDANÇA IMPORTANTE: as permissões não vivem mais em GCP_ROLES[].permissions.
 * São ~13.6 mil permissões distintas em ~131 mil vínculos role→permissão; no
 * bundle isso custaria vários MB de JS. Ficam em public/gcp-perms-index.json,
 * gerado por scripts/fetch-gcp-roles-from-docs.js e buscado sob demanda —
 * mesmo desenho de public/azure-perms-index.json.
 *
 * Por isso getGcpPermissions() agora é assíncrono. Para exibir apenas a
 * contagem, use GCP_PERMISSION_COUNT / GCP_SERVICE_COUNT de '@/data/gcp',
 * que são constantes e não disparam download.
 */

export interface GcpPermEntry {
  permission: string   // ex.: compute.instances.get
  service: string      // ex.: compute
  resource: string     // ex.: instances
  verb: string         // ex.: get
  tier: GcpTier
  usedByRoles: { name: string; slug: string; isPrivileged: boolean }[]
  isUsedByPrivileged: boolean
}

/** Formato de public/gcp-perms-index.json */
interface GcpPermsIndex {
  slugs: string[]
  index: Record<string, number[]>
}

function parsePermission(perm: string): { service: string; resource: string; verb: string } {
  const parts = perm.split('.')
  if (parts.length === 1) return { service: perm, resource: '', verb: '' }
  if (parts.length === 2) return { service: parts[0], resource: '', verb: parts[1] }
  const service = parts[0]
  const verb = parts[parts.length - 1]
  const resource = parts.slice(1, -1).join('.')
  return { service, resource, verb }
}

const TIER_ORDER: Record<GcpTier, number> = {
  ProjectOwner: 0, Admin: 1, Editor: 2, Operator: 3, Developer: 4, Viewer: 5, Specialized: 6,
}

let _cache: GcpPermEntry[] | null = null
let _inflight: Promise<GcpPermEntry[]> | null = null

/** Já carregado? Devolve sem disparar rede — útil para render inicial. */
export function getGcpPermissionsSync(): GcpPermEntry[] | null {
  return _cache
}

export async function getGcpPermissions(): Promise<GcpPermEntry[]> {
  if (_cache) return _cache
  if (_inflight) return _inflight

  _inflight = (async () => {
    const res = await fetch('/gcp-perms-index.json')
    if (!res.ok) throw new Error(`Falha ao carregar gcp-perms-index.json (HTTP ${res.status})`)
    const data: GcpPermsIndex = await res.json()

    const bySlug = new Map(GCP_ROLES.map((r) => [r.slug, r]))

    const out: GcpPermEntry[] = []
    for (const [perm, roleIdxs] of Object.entries(data.index)) {
      const entry: GcpPermEntry = {
        permission: perm,
        ...parsePermission(perm),
        tier: 'Specialized',
        usedByRoles: [],
        isUsedByPrivileged: false,
      }
      let best = Number.POSITIVE_INFINITY
      for (const i of roleIdxs) {
        const role = bySlug.get(data.slugs[i])
        if (!role) continue
        entry.usedByRoles.push({ name: role.name, slug: role.slug, isPrivileged: role.isPrivileged })
        if (role.isPrivileged) entry.isUsedByPrivileged = true
        const order = TIER_ORDER[role.tier]
        if (order < best) { best = order; entry.tier = role.tier }
      }
      out.push(entry)
    }

    out.sort((a, b) => a.permission.localeCompare(b.permission))
    _cache = out
    _inflight = null
    return out
  })()

  return _inflight
}

export async function getGcpServices(): Promise<string[]> {
  return [...new Set((await getGcpPermissions()).map((p) => p.service))].sort()
}

export async function getGcpVerbs(): Promise<string[]> {
  return [...new Set((await getGcpPermissions()).map((p) => p.verb).filter(Boolean))].sort()
}

/** Permissões de uma role específica, sem baixar o índice inteiro. */
export async function getGcpRolePermissions(slug: string): Promise<string[]> {
  const res = await fetch(`/gcp-perms/${slug}.json`)
  if (!res.ok) throw new Error(`Falha ao carregar permissões de ${slug} (HTTP ${res.status})`)
  return res.json()
}
