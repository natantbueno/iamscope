import { IBM_ROLES, IbmTier } from '@/data/ibmCloud'

export interface IbmActionEntry {
  action: string        // e.g. iam-identity.apikey.create
  service: string       // e.g. iam-identity
  resource: string      // e.g. apikey
  operation: string     // e.g. create
  tier: IbmTier
  usedByRoles: { name: string; slug: string; isPrivileged: boolean }[]
  isUsedByPrivileged: boolean
}

const TIER_ORDER: Record<IbmTier, number> = {
  AccountAdmin: 0,
  PlatformAdmin: 1,
  PlatformOperator: 2,
  ServiceManager: 3,
  ReadOnly: 4,
}

let _cache: IbmActionEntry[] | null = null

function parseAction(action: string): { service: string; resource: string; operation: string } {
  const parts = action.split('.')
  if (parts.length === 1) return { service: action, resource: '', operation: '' }
  if (parts.length === 2) return { service: parts[0], resource: '', operation: parts[1] }
  return { service: parts[0], resource: parts[1], operation: parts.slice(2).join('.') }
}

export function getIbmActions(): IbmActionEntry[] {
  if (_cache) return _cache

  const map = new Map<string, IbmActionEntry>()

  for (const role of IBM_ROLES) {
    if (!role.actions || role.actions.length === 0) continue
    for (const action of role.actions) {
      if (!map.has(action)) {
        map.set(action, {
          action,
          ...parseAction(action),
          tier: role.tier,
          usedByRoles: [],
          isUsedByPrivileged: false,
        })
      }
      const entry = map.get(action)!
      if (!entry.usedByRoles.some((r) => r.slug === role.slug)) {
        entry.usedByRoles.push({ name: role.name, slug: role.slug, isPrivileged: role.isPrivileged })
        if (role.isPrivileged) entry.isUsedByPrivileged = true
        if (TIER_ORDER[role.tier] < TIER_ORDER[entry.tier]) {
          entry.tier = role.tier
        }
      }
    }
  }

  _cache = Array.from(map.values()).sort((a, b) => a.action.localeCompare(b.action))
  return _cache
}

export function getIbmServices(): string[] {
  return [...new Set(getIbmActions().map((a) => a.service).filter(Boolean))].sort()
}

export function getIbmOperations(): string[] {
  return [...new Set(getIbmActions().map((a) => a.operation).filter(Boolean))].sort()
}
