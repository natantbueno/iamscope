// Catálogo de permissões (actions) do Azure RBAC — visão invertida das roles.
//
// As permissões do Azure não vivem no bundle: cada role tem seu arquivo em
// public/azure-perms/<slug>.json, e o índice invertido action -> roles é gerado
// em build time por scripts/build-azure-perms-index.js.
//
// Este módulo é o lado cliente disso: carrega o índice uma vez, junta com os
// metadados das roles (que estão no bundle) e com as descrições oficiais da
// Microsoft, e entrega uma lista pronta de permissões para as páginas
// /azure-rbac/permissions e /azure-rbac/permissions/[slug].

import { AZURE_ROLES, AzureRbacRole } from '@/data/azureRbac'
import { lookupActionDoc } from './azureActionDocs'

export interface AzurePermIndexFile {
  slugs: string[]
  index: Record<string, number[]>
}

export interface AzurePermissionEntry {
  /** A action exatamente como a Microsoft publica. */
  action: string
  /** Slug estável para a URL de detalhe. */
  slug: string
  /** Resource provider, ex.: Microsoft.Storage. */
  provider: string
  /** Caminho do recurso entre o provider e o verbo. */
  resource: string
  /** Último segmento: read, write, delete, action... */
  verb: string
  /** Wildcard (contém `*`) concede tudo abaixo do escopo. */
  isWildcard: boolean
  /** Descrição oficial, quando já coletada de learn.microsoft.com. */
  description?: string
  roles: AzureRbacRole[]
}

/**
 * A action vira slug de URL. Barras e pontos não sobrevivem bem em rota
 * estática, então viram hífen; o `*` vira "all" para não quebrar o filesystem
 * no export estático.
 */
export function actionToSlug(action: string): string {
  return action
    .toLowerCase()
    .replace(/\*/g, 'all')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseAction(action: string) {
  const parts = action.split('/')
  if (parts.length === 1) return { provider: action, resource: '', verb: '' }
  const provider = parts[0]
  const verb = parts[parts.length - 1]
  const resource = parts.slice(1, -1).join('/')
  return { provider, resource, verb }
}

let _cache: AzurePermissionEntry[] | null = null
let _bySlug: Map<string, AzurePermissionEntry> | null = null

/**
 * Monta o catálogo a partir do índice já baixado. Idempotente: o resultado é
 * cacheado em memória, então as páginas podem chamar à vontade.
 */
export function buildAzurePermissionCatalog(
  idx: AzurePermIndexFile,
  descriptions: Record<string, string> = {},
): AzurePermissionEntry[] {
  if (_cache) return _cache

  const roleBySlug = new Map(AZURE_ROLES.map((r) => [r.slug, r]))
  const out: AzurePermissionEntry[] = []
  const slugSeen = new Map<string, number>()

  // .sort() NÃO é cosmético: 57 actions colidem no slug (a mesma operação
  // aparece com caixas diferentes nas definições de role — Microsoft.insights/
  // logs/read, Microsoft.Insights/Logs/Read...). O sufixo de desambiguação é
  // atribuído por ordem de iteração, e generateStaticParams em
  // app/azure-rbac/permissions/[slug]/page.tsx itera ORDENADO. Sem o mesmo
  // critério aqui, a página gerada no build e a resolvida no cliente podem
  // apontar para actions diferentes sob a mesma URL.
  for (const action of Object.keys(idx.index).sort()) {
    const roles: AzureRbacRole[] = []
    for (const i of idx.index[action]) {
      const s = idx.slugs[i]
      const role = s ? roleBySlug.get(s) : undefined
      if (role) roles.push(role)
    }
    const { provider, resource, verb } = parseAction(action)

    // Colisão de slug é possível (ex.: `.../read` e `.../Read`); desambigua.
    let slug = actionToSlug(action)
    const n = slugSeen.get(slug) ?? 0
    slugSeen.set(slug, n + 1)
    if (n > 0) slug = `${slug}-${n + 1}`

    out.push({
      action, slug, provider, resource, verb,
      isWildcard: action.includes('*'),
      // Busca tolerante a caixa: a doc da Microsoft e as definições de role
      // divergem em maiúsculas para a mesma action (ver azureActionDocs.ts).
      description: lookupActionDoc(descriptions, action),
      roles: roles.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  out.sort((a, b) => a.action.localeCompare(b.action))
  _cache = out
  _bySlug = new Map(out.map((e) => [e.slug, e]))
  return out
}

export function getAzurePermissionBySlug(slug: string): AzurePermissionEntry | null {
  return _bySlug?.get(slug) ?? null
}

/** Providers distintos com contagem, para os filtros da listagem. */
export function getProviderCounts(entries: AzurePermissionEntry[]): [string, number][] {
  const m = new Map<string, number>()
  for (const e of entries) m.set(e.provider, (m.get(e.provider) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/** Verbos distintos com contagem. */
export function getVerbCounts(entries: AzurePermissionEntry[]): [string, number][] {
  const m = new Map<string, number>()
  for (const e of entries) {
    if (!e.verb) continue
    m.set(e.verb, (m.get(e.verb) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
