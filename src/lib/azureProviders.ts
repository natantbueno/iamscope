/**
 * Índice de resource providers do Azure — o Azure por serviço.
 *
 * A página /azure-rbac/permissions cataloga as ~2.700 actions que aparecem
 * POR EXTENSO nas definições das 504 roles. Este módulo é o outro recorte: o
 * universo inteiro documentado pela Microsoft — 17.591 ações em 151 providers —
 * agrupado por provider, com os wildcards das roles já expandidos.
 *
 * NADA DISSO VIVE NO BUNDLE. São 3,6 MB em 152 arquivos gerados por
 * scripts/build-azure-providers.js; a página do índice baixa só
 * `azure-providers/index.json` (~15 kB) e cada página de provider baixa só o
 * arquivo dela. Mesmo desenho de public/azure-perms/ e public/gcp-perms/.
 *
 * As tuplas dos arquivos são posicionais de propósito: com ~268 mil pares
 * ação->role, nomes de campo repetidos custariam mais que o dado.
 */

/** Uma linha do índice — o que a listagem dos 151 mostra sem baixar nada mais. */
export interface AzureProviderSummary {
  slug: string
  /** `Microsoft.Storage`. Nome próprio: fica em inglês nos dois idiomas. */
  name: string
  actions: number
  /** Roles que concedem ao menos uma ação deste provider. */
  roles: number
  read: number
  write: number
  delete: number
  action: number
  /** Ações cujo plano (control/data) alguma role declara por extenso. */
  typed: number
}

export interface AzureProviderIndexMeta {
  generatedAt: string
  universeKeys: number
  universeActions: number
  providersRaw: number
  providers: number
  roles: number
  typedActions: number
  rolePairs: number
  isFloor: boolean
}

export interface AzureProviderIndex {
  _meta: AzureProviderIndexMeta
  providers: AzureProviderSummary[]
}

/** `[slug, nome, tier, privilegiada]` — tabela local do arquivo do provider. */
export type AzureProviderRoleTuple = [string, string, string, number]

/** `[action, descrição, concedem, concedem-como-dado, negam, plano]` */
export type AzureProviderActionTuple = [string, string, number[], number[], number[], number]

export interface AzureProviderFile {
  slug: string
  provider: string
  roles: AzureProviderRoleTuple[]
  actions: AzureProviderActionTuple[]
}

export interface AzureProviderRole {
  slug: string
  name: string
  tier: string
  isPrivileged: boolean
}

/**
 * O plano de uma ação.
 *
 * `undeclared` NÃO quer dizer "não sabemos se existe" — quer dizer que nenhuma
 * das 504 definições de role cita esta ação por extenso, e o store de
 * descrições da Microsoft mistura os dois planos sem marcar nenhum. Afirmar o
 * plano dessas seria inventar. Ver o cabeçalho de
 * scripts/build-azure-providers.js.
 */
export type AzureActionPlane = 'undeclared' | 'control' | 'data' | 'both'

const PLANES: AzureActionPlane[] = ['undeclared', 'control', 'data', 'both']

export interface AzureProviderAction {
  action: string
  description: string
  /** Último segmento: read, write, delete, action. */
  verb: string
  plane: AzureActionPlane
  /** Roles que concedem no control plane (Actions expandidas). */
  grantedBy: AzureProviderRole[]
  /** Roles que concedem no data plane (DataActions expandidas). */
  grantedAsData: AzureProviderRole[]
  /** Roles que declaram a ação em NotActions/NotDataActions — negação explícita. */
  excludedBy: AzureProviderRole[]
}

export interface AzureProviderDetail {
  slug: string
  provider: string
  roles: AzureProviderRole[]
  actions: AzureProviderAction[]
}

/**
 * `Microsoft.Storage` -> `microsoft-storage`.
 *
 * Cópia da regra de scripts/build-azure-providers.js, que é quem nomeia os
 * arquivos e alimenta o generateStaticParams. Se uma mudar, a outra tem de
 * mudar junto — senão a rota gerada no build e a buscada no cliente divergem.
 */
export function providerToSlug(provider: string): string {
  return provider
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Índice dos 151 ──────────────────────────────────────────────────────────

let _index: AzureProviderIndex | null = null
let _indexInflight: Promise<AzureProviderIndex> | null = null

/** Já carregado? Devolve sem disparar rede. `null` = ainda não chegou. */
export function getAzureProviderIndexSync(): AzureProviderIndex | null {
  return _index
}

export async function getAzureProviderIndex(): Promise<AzureProviderIndex> {
  if (_index) return _index
  if (_indexInflight) return _indexInflight

  _indexInflight = (async () => {
    const res = await fetch('/azure-providers/index.json')
    if (!res.ok) throw new Error(`Falha ao carregar azure-providers/index.json (HTTP ${res.status})`)
    const data: AzureProviderIndex = await res.json()
    _index = data
    _indexInflight = null
    return data
  })()

  return _indexInflight
}

// ── Um provider ─────────────────────────────────────────────────────────────

const _cache = new Map<string, AzureProviderDetail>()

function hydrate(file: AzureProviderFile): AzureProviderDetail {
  const roles: AzureProviderRole[] = file.roles.map(([slug, name, tier, priv]) => ({
    slug, name, tier, isPrivileged: priv === 1,
  }))
  const pick = (idxs: number[]) =>
    idxs.map((i) => roles[i]).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))

  const actions: AzureProviderAction[] = file.actions.map(([action, description, g, dg, x, plano]) => {
    const partes = action.split('/')
    return {
      action,
      description,
      verb: partes.length > 1 ? partes[partes.length - 1] : '',
      plane: PLANES[plano] ?? 'undeclared',
      grantedBy: pick(g),
      grantedAsData: pick(dg),
      excludedBy: pick(x),
    }
  })

  return { slug: file.slug, provider: file.provider, roles, actions }
}

/** Já carregado? Devolve sem disparar rede. */
export function getAzureProviderSync(slug: string): AzureProviderDetail | null {
  return _cache.get(slug) ?? null
}

/** `null` quando o slug não existe — a página trata como 404 de conteúdo. */
export async function getAzureProvider(slug: string): Promise<AzureProviderDetail | null> {
  const hit = _cache.get(slug)
  if (hit) return hit
  const res = await fetch(`/azure-providers/${slug}.json`)
  if (!res.ok) return null
  const detail = hydrate(await res.json())
  _cache.set(slug, detail)
  return detail
}
