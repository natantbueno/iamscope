import { AWS_POLICIES, AwsTier } from '@/data/aws'

export interface AwsActionEntry {
  action: string        // e.g. s3:GetObject or s3:* (wildcard patterns preserved)
  service: string       // e.g. s3
  operation: string     // e.g. GetObject or *
  isWildcard: boolean   // true if action contains *
  tier: AwsTier
  usedByPolicies: { name: string; slug: string; isPrivileged: boolean }[]
  isUsedByPrivileged: boolean
}

let _cache: AwsActionEntry[] | null = null

export function getAwsActions(): AwsActionEntry[] {
  if (_cache) return _cache

  const map = new Map<string, AwsActionEntry>()

  for (const policy of AWS_POLICIES) {
    if (!policy.actions || policy.actions.length === 0) continue
    for (const action of policy.actions) {
      if (!map.has(action)) {
        const colonIdx = action.indexOf(':')
        const service = colonIdx === -1 ? action : action.substring(0, colonIdx)
        const operation = colonIdx === -1 ? '' : action.substring(colonIdx + 1)
        map.set(action, {
          action,
          service,
          operation,
          isWildcard: action.includes('*'),
          tier: policy.tier,
          usedByPolicies: [],
          isUsedByPrivileged: false,
        })
      }
      const entry = map.get(action)!
      if (!entry.usedByPolicies.some((p) => p.slug === policy.slug)) {
        entry.usedByPolicies.push({ name: policy.name, slug: policy.slug, isPrivileged: policy.isPrivileged })
        if (policy.isPrivileged) entry.isUsedByPrivileged = true
        // keep the highest-privilege tier
        const tierOrder: Record<AwsTier, number> = { FullAccess: 0, PowerUser: 1, Operator: 2, Specialized: 3, ReadOnly: 4 }
        if (tierOrder[policy.tier] < tierOrder[entry.tier]) {
          entry.tier = policy.tier
        }
      }
    }
  }

  _cache = Array.from(map.values()).sort((a, b) => {
    // sort: non-wildcards first, then alphabetically
    if (a.isWildcard !== b.isWildcard) return a.isWildcard ? 1 : -1
    return a.action.localeCompare(b.action)
  })
  return _cache
}

export function getAwsServices(): string[] {
  return [...new Set(getAwsActions().map((a) => a.service).filter(Boolean))].sort()
}
