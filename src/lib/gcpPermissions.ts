import { GCP_ROLES, GcpTier } from '@/data/gcp'

export interface GcpPermEntry {
  permission: string   // e.g. compute.instances.get
  service: string      // e.g. compute
  resource: string     // e.g. instances
  verb: string         // e.g. get
  tier: GcpTier
  usedByRoles: { name: string; slug: string; isPrivileged: boolean }[]
  isUsedByPrivileged: boolean
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

let _cache: GcpPermEntry[] | null = null

export function getGcpPermissions(): GcpPermEntry[] {
  if (_cache) return _cache

  const map = new Map<string, GcpPermEntry>()

  for (const role of GCP_ROLES) {
    if (!role.permissions || role.permissions.length === 0) continue
    for (const perm of role.permissions) {
      if (!map.has(perm)) {
        map.set(perm, {
          permission: perm,
          ...parsePermission(perm),
          tier: role.tier,
          usedByRoles: [],
          isUsedByPrivileged: false,
        })
      }
      const entry = map.get(perm)!
      if (!entry.usedByRoles.some((r) => r.slug === role.slug)) {
        entry.usedByRoles.push({ name: role.name, slug: role.slug, isPrivileged: role.isPrivileged })
        if (role.isPrivileged) entry.isUsedByPrivileged = true
        // take the highest (lowest tier order) tier seen
        const tierOrder: Record<GcpTier, number> = { ProjectOwner: 0, Admin: 1, Editor: 2, Operator: 3, Developer: 4, Viewer: 5, Specialized: 6 }
        if (tierOrder[role.tier] < tierOrder[entry.tier]) {
          entry.tier = role.tier
        }
      }
    }
  }

  _cache = Array.from(map.values()).sort((a, b) => a.permission.localeCompare(b.permission))
  return _cache
}

export function getGcpServices(): string[] {
  return [...new Set(getGcpPermissions().map((p) => p.service))].sort()
}

export function getGcpVerbs(): string[] {
  return [...new Set(getGcpPermissions().map((p) => p.verb).filter(Boolean))].sort()
}
