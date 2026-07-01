import { ROLES, EntraRole } from '@/data/roles'

// Slugs antigos que foram renomeados — mantemos como redirect estático para
// não quebrar links/bookmarks externos apontando para o nome legado.
export const SLUG_REDIRECTS: Record<string, string> = {
  // Azure AD Joined Device Local Administrator → Microsoft Entra Joined Device Local Administrator
  // (rebranding Azure AD → Microsoft Entra; mesmo Template ID 9f06204d-73c1-4d4c-880a-6edb90606fd8)
  'azure-ad-joined-device-local-administrator': 'microsoft-entra-joined-device-local-administrator',
}

export function getRoleBySlug(slug: string): EntraRole | undefined {
  return ROLES.find((r) => r.slug === slug)
}

export function getAllSlugs(): string[] {
  return ROLES.map((r) => r.slug)
}

export function getAllSlugsIncludingRedirects(): string[] {
  return [...getAllSlugs(), ...Object.keys(SLUG_REDIRECTS)]
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
