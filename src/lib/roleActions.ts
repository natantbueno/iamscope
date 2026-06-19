import { ROLES, EamTier } from '@/data/roles'

export interface RoleActionEntry {
  action: string
  namespace: string      // tudo antes do primeiro '/'
  resource: string       // segmentos do meio
  verb: string           // último segmento
  category: string       // da classificação EntraOps
  tier: EamTier
  usedByRoles: { name: string; slug: string; isPrivileged: boolean }[]
  isUsedByPrivileged: boolean
}

function parseAction(action: string): { namespace: string; resource: string; verb: string } {
  const slashIdx = action.indexOf('/')
  if (slashIdx === -1) return { namespace: action, resource: '', verb: '' }
  const namespace = action.substring(0, slashIdx)
  const rest = action.substring(slashIdx + 1)
  const lastSlash = rest.lastIndexOf('/')
  if (lastSlash === -1) return { namespace, resource: '', verb: rest }
  return {
    namespace,
    resource: rest.substring(0, lastSlash),
    verb: rest.substring(lastSlash + 1),
  }
}

let _cache: RoleActionEntry[] | null = null

export function getRoleActions(): RoleActionEntry[] {
  if (_cache) return _cache

  const map = new Map<string, RoleActionEntry>()

  for (const role of ROLES) {
    for (const perm of role.permissions) {
      if (!map.has(perm.action)) {
        const parsed = parseAction(perm.action)
        map.set(perm.action, {
          action: perm.action,
          ...parsed,
          category: perm.category || 'Unknown',
          tier: perm.tier,
          usedByRoles: [],
          isUsedByPrivileged: false,
        })
      }
      const entry = map.get(perm.action)!
      // evita duplicatas (mesma role pode ter a action listada mais de uma vez)
      if (!entry.usedByRoles.some((r) => r.slug === role.slug)) {
        entry.usedByRoles.push({ name: role.name, slug: role.slug, isPrivileged: role.isPrivileged })
        if (role.isPrivileged) entry.isUsedByPrivileged = true
      }
    }
  }

  _cache = Array.from(map.values()).sort((a, b) => a.action.localeCompare(b.action))
  return _cache
}

export function getUniqueNamespaces(): string[] {
  return [...new Set(getRoleActions().map((a) => a.namespace))].sort()
}

export function getUniqueVerbs(): string[] {
  return [...new Set(getRoleActions().map((a) => a.verb))].sort()
}

export function getUniqueCategories(): string[] {
  return [...new Set(getRoleActions().map((a) => a.category).filter(Boolean))].sort()
}
