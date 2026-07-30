// ── Role Advisor — cross-platform TF-IDF-style search ────────────────────────
// Works 100% client-side, no backend needed.

export type AdvisorPlatform = 'entraId' | 'azureRbac' | 'googleWorkspace' | 'ibmCloud' | 'gcp' | 'aws'

export interface AdvisorRole {
  /** Unique key: platform:slug */
  key: string
  platform: AdvisorPlatform
  platformLabel: string
  platformColor: string
  name: string
  description: string
  tier: string
  tierColor: string
  href: string
  isPrivileged: boolean
  /** Pre-built searchable corpus */
  corpus: string
}

export interface AdvisorResult {
  role: AdvisorRole
  score: number
  /** Matched terms for highlighting */
  matchedTerms: string[]
}

// ── Stop words (EN + PT) ─────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','of','to','in','for','with','on','at','by','from',
  'is','are','can','be','as','that','this','it','its','all','any','has','have',
  'do','not','no','but','was','were','been','will','would','could','should',
  'de','do','da','dos','das','e','em','um','uma','para','por','com','na','no',
  'os','as','que','se','ou','mais','também','quando','como','qual','cada',
  'sobre','entre','dentro','fora','sem','após','antes','durante','até',
])

// ── Tokenize a text into normalized terms ─────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Replace common dashes/special chars with space
    .replace(/[—–\-\/\\|]/g, ' ')
    .replace(/[^a-záéíóúàâêôãõüçñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

// ── Score a single role against query terms ──────────────────────────────────
function scoreRole(role: AdvisorRole, queryTerms: string[]): { score: number; matchedTerms: string[] } {
  if (queryTerms.length === 0) return { score: 0, matchedTerms: [] }

  const nameLower     = role.name.toLowerCase()
  const descLower     = role.description.toLowerCase()
  const corpusLower   = role.corpus.toLowerCase()
  const nameTerms     = tokenize(role.name)
  const corpusTerms   = tokenize(role.corpus)

  let score = 0
  const matchedTerms: string[] = []

  for (const qt of queryTerms) {
    let termScore = 0

    // Exact phrase in name (highest value)
    if (nameLower.includes(qt)) {
      termScore += 12
    }
    // Exact phrase in description
    else if (descLower.includes(qt)) {
      termScore += 6
    }
    // Anywhere in corpus
    else if (corpusLower.includes(qt)) {
      termScore += 2
    }

    // Prefix/stemming in name tokens
    if (nameTerms.some(t => t.startsWith(qt) || qt.startsWith(t))) {
      termScore += 4
    }

    // Term frequency in corpus (reward repetition)
    const tf = corpusTerms.filter(t => t === qt || t.startsWith(qt)).length
    termScore += tf * 0.5

    if (termScore > 0) {
      score += termScore
      if (!matchedTerms.includes(qt)) matchedTerms.push(qt)
    }
  }

  // Privileged penalty (slight — don't over-recommend destructive roles)
  if (role.isPrivileged && score > 0) score *= 0.85

  return { score, matchedTerms }
}

// ── Build the advisor index from all platform data ────────────────────────────
// Called lazily on first search to avoid import at module load time.
let INDEX: AdvisorRole[] | null = null

async function buildIndex(): Promise<AdvisorRole[]> {
  if (INDEX) return INDEX

  // Dynamic imports to avoid bloating the initial bundle
  const [
    { ROLES },
    { AZURE_ROLES },
    { GWS_ROLES },
    { IBM_ROLES, IBM_TIER_META },
    { GCP_ROLES, GCP_TIER_META },
    { AWS_POLICIES, AWS_TIER_META },
  ] = await Promise.all([
    import('@/data/roles'),
    import('@/data/azureRbac'),
    import('@/data/googleWorkspace'),
    import('@/data/ibmCloud'),
    import('@/data/gcp'),
    import('@/data/aws'),
  ])

  const entraColors: Record<string, string> = {
    ControlPlane: '#dc2626', ManagementPlane: '#ea580c',
    UserAccess: '#ca8a04', Unclassified: '#6b7280',
  }
  const azureColors: Record<string, string> = {
    FullControl: '#dc2626', AccessManagement: '#ea580c',
    Contributor: '#ca8a04', DataPlane: '#0891b2',
    Reader: '#16a34a', Specialized: '#7c3aed',
  }
  const gwsColors: Record<string, string> = {
    SuperAdmin: '#dc2626', DelegatedAdmin: '#ea580c',
    ServiceAdmin: '#0891b2', SpecializedAdmin: '#7c3aed', ReadOnly: '#16a34a',
  }

  const roles: AdvisorRole[] = []

  // ── Entra ID ──
  for (const r of ROLES) {
    const perms = (r.permissions ?? []).map((p: any) => p.action).join(' ')
    roles.push({
      key: `entraId:${r.slug}`,
      platform: 'entraId',
      platformLabel: 'Entra ID',
      platformColor: '#0078d4',
      name: r.name,
      description: r.description,
      tier: r.eamTier,
      tierColor: entraColors[r.eamTier] ?? '#6b7280',
      href: `/entraid/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      corpus: [r.name, r.description, r.richDescription ?? '', perms].join(' '),
    })
  }

  // ── Azure RBAC ──
  for (const r of AZURE_ROLES) {
    roles.push({
      key: `azureRbac:${r.slug}`,
      platform: 'azureRbac',
      platformLabel: 'Azure RBAC',
      platformColor: '#008ad7',
      name: r.name,
      description: r.description,
      tier: r.tier,
      tierColor: azureColors[r.tier] ?? '#6b7280',
      href: `/azure-rbac/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      corpus: [r.name, r.description, r.category].join(' '),
    })
  }

  // ── Google Workspace ──
  for (const r of GWS_ROLES) {
    roles.push({
      key: `gws:${r.slug}`,
      platform: 'googleWorkspace',
      platformLabel: 'Google Workspace',
      platformColor: '#34a853',
      name: r.name,
      description: r.description,
      tier: r.tier,
      tierColor: gwsColors[r.tier] ?? '#6b7280',
      href: `/google-workspace/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      corpus: [r.name, r.description, ...(r.privileges ?? [])].join(' '),
    })
  }

  // ── IBM Cloud ──
  for (const r of IBM_ROLES) {
    const meta = IBM_TIER_META[r.tier]
    roles.push({
      key: `ibm:${r.slug}`,
      platform: 'ibmCloud',
      platformLabel: 'IBM Cloud',
      platformColor: '#0f62fe',
      name: r.name,
      description: r.description,
      tier: meta?.label ?? r.tier,
      tierColor: meta?.color ?? '#6b7280',
      href: `/ibm-cloud/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      corpus: [r.name, r.description, r.category, ...(r.privileges ?? [])].join(' '),
    })
  }

  // ── GCP IAM ──
  for (const r of GCP_ROLES) {
    const meta = GCP_TIER_META[r.tier]
    roles.push({
      key: `gcp:${r.slug}`,
      platform: 'gcp',
      platformLabel: 'GCP IAM',
      platformColor: '#4285f4',
      name: r.name,
      description: r.description,
      tier: meta?.label ?? r.tier,
      tierColor: meta?.color ?? '#6b7280',
      href: `/gcp/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      // As permissões do GCP saíram do bundle (public/gcp-perms/), então o
      // corpus usa só os metadados. Buscar por permissão é papel do
      // Permission Scope, que carrega o índice sob demanda.
      corpus: [r.name, r.description, r.category, r.roleId].join(' '),
    })
  }

  // ── AWS IAM ──
  for (const p of AWS_POLICIES) {
    const meta = AWS_TIER_META[p.tier]
    roles.push({
      key: `aws:${p.slug}`,
      platform: 'aws',
      platformLabel: 'AWS IAM',
      platformColor: '#ff9900',
      name: p.name,
      description: p.description,
      tier: meta?.label ?? p.tier,
      tierColor: meta?.color ?? '#6b7280',
      href: `/aws/policies/${p.slug}`,
      isPrivileged: p.isPrivileged,
      // As actions da AWS saíram do bundle (public/aws-policy-docs/), então o
      // corpus usa só metadados. Busca por action é papel do Permission Scope.
      corpus: [p.name, p.description, p.category, p.arn, p.type].join(' '),
    })
  }


  INDEX = roles
  return roles
}

// ── Main search function ──────────────────────────────────────────────────────
export async function searchRoles(
  query: string,
  platformFilter: AdvisorPlatform | 'all' = 'all',
  topN = 25,
): Promise<AdvisorResult[]> {
  const roles = await buildIndex()
  const queryTerms = tokenize(query)
  if (queryTerms.length === 0) return []

  const filtered = platformFilter === 'all'
    ? roles
    : roles.filter(r => r.platform === platformFilter)

  const results: AdvisorResult[] = []
  for (const role of filtered) {
    const { score, matchedTerms } = scoreRole(role, queryTerms)
    if (score > 0) results.push({ role, score, matchedTerms })
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

export type { AdvisorRole as Role }
