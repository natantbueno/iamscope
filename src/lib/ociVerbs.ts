import { OCI_POLICIES, OciTier, OciCategory } from '@/data/oci'

export interface OciVerbEntry {
  verb: string          // e.g. INSTANCE_CREATE
  resource: string      // e.g. INSTANCE (everything before last _)
  operation: string     // e.g. CREATE (last segment)
  tier: OciTier
  category: OciCategory
  usedByPolicies: { name: string; slug: string; isPrivileged: boolean }[]
  isUsedByPrivileged: boolean
}

let _cache: OciVerbEntry[] | null = null

function parseVerb(verb: string): { resource: string; operation: string } {
  const lastUnderscore = verb.lastIndexOf('_')
  if (lastUnderscore === -1) return { resource: verb, operation: '' }
  return {
    resource: verb.substring(0, lastUnderscore),
    operation: verb.substring(lastUnderscore + 1),
  }
}

const TIER_ORDER: Record<OciTier, number> = { Manage: 0, Use: 1, Read: 2, Inspect: 3 }

export function getOciVerbs(): OciVerbEntry[] {
  if (_cache) return _cache

  const map = new Map<string, OciVerbEntry>()

  for (const policy of OCI_POLICIES) {
    if (!policy.verbActions || policy.verbActions.length === 0) continue
    for (const verb of policy.verbActions) {
      if (!map.has(verb)) {
        map.set(verb, {
          verb,
          ...parseVerb(verb),
          tier: policy.tier,
          category: policy.category,
          usedByPolicies: [],
          isUsedByPrivileged: false,
        })
      }
      const entry = map.get(verb)!
      if (!entry.usedByPolicies.some((p) => p.slug === policy.slug)) {
        entry.usedByPolicies.push({ name: policy.name, slug: policy.slug, isPrivileged: policy.isPrivileged })
        if (policy.isPrivileged) entry.isUsedByPrivileged = true
        if (TIER_ORDER[policy.tier] < TIER_ORDER[entry.tier]) {
          entry.tier = policy.tier
        }
      }
    }
  }

  _cache = Array.from(map.values()).sort((a, b) => a.verb.localeCompare(b.verb))
  return _cache
}

export function getOciOperations(): string[] {
  return [...new Set(getOciVerbs().map((v) => v.operation).filter(Boolean))].sort()
}

export function getOciResources(): string[] {
  return [...new Set(getOciVerbs().map((v) => v.resource).filter(Boolean))].sort()
}
