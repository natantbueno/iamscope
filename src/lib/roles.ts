import { ROLES, EntraRole } from '@/data/roles'

export function getRoleBySlug(slug: string): EntraRole | undefined {
  return ROLES.find((r) => r.slug === slug)
}

export function getAllSlugs(): string[] {
  return ROLES.map((r) => r.slug)
}

// Roles relacionadas: mesma categoria ou mesmo tier, excluindo a própria
export function getRelatedRoles(role: EntraRole, limit = 5): EntraRole[] {
  return ROLES.filter(
    (r) => r.slug !== role.slug && (r.category === role.category || r.eamTier === role.eamTier)
  )
    .sort((a, b) => {
      // Prioriza mesma categoria E mesmo tier
      const scoreA = (a.category === role.category ? 1 : 0) + (a.eamTier === role.eamTier ? 1 : 0)
      const scoreB = (b.category === role.category ? 1 : 0) + (b.eamTier === role.eamTier ? 1 : 0)
      return scoreB - scoreA
    })
    .slice(0, limit)
}
