// Permission Scope — busca reversa de permissão em todas as clouds.
//
// A pergunta que esta lib responde é: "dada uma permissão qualquer, quais roles
// (ou policies) a concedem?" — em qualquer uma das 6 plataformas do catálogo.
//
// Reaproveita os índices que já existem no site (getRoleActions, getAwsActions,
// getGcpPermissions), que já invertem a relação role -> permissão e são
// cacheados em memória. Google Workspace não tinha um helper equivalente, então
// é montado aqui a partir de privileges/apiPrivileges.
//
// NENHUM dataset entra por import estático: todos chegam por `await import()`
// dentro de ensureLocalPermissionIndex(). Ver o bloco de Entra/GWS abaixo.
//
// Azure RBAC é o único caso que NÃO entra aqui: as permissões dele vivem em 926
// arquivos JSON separados (public/azure-perms/*.json), fora do bundle. A página
// carrega o índice invertido dele sob demanda (public/azure-perms-index.json) e
// mescla o resultado com o que esta lib devolve.

import { CloudId } from '@/data/compare/types'
import { getAwsActions, getAwsActionsSync, getAwsDenyBySlug } from './awsActions'
import {
  isUnanchoredPattern, isWildcardPattern, looksLikeConcreteAction, namespaceKey, wildcardMatches,
} from './wildcardMatch'
import { getGcpPermissions, getGcpPermissionsSync } from './gcpPermissions'

export interface ScopeRoleRef {
  name: string
  slug: string
  isPrivileged: boolean
}

export interface ScopeMatch {
  cloud: CloudId
  /** A permissão exatamente como aparece na plataforma de origem. */
  permission: string
  roles: ScopeRoleRef[]
  /**
   * A entrada não casou com o texto digitado: ela é um PADRÃO (`s3:*`, `*\/read`,
   * `*`) que cobre a action procurada. A interface precisa dizer isso — senão a
   * pessoa lê "AdministratorAccess" numa busca por `iam:CreateUser` e conclui
   * que existe uma action literal com esse nome na policy.
   */
  viaWildcard?: boolean
  /**
   * Roles/policies que NEGAM explicitamente esta permissão.
   *
   * Não some da tela: é o dado mais acionável que existe aqui. Uma policy de
   * quarentena da AWS, ou uma role do Azure com a action em `NotActions`,
   * responde à pergunta "quem pode fazer isso?" com um "esta aqui
   * explicitamente não pode" — que vale tanto quanto a lista de quem pode.
   */
  deniedBy?: ScopeRoleRef[]
}

/** Rótulo do que a plataforma chama de "permissão" e de "role". */
export const CLOUD_TERMS: Record<CloudId, { permission: string; principal: string }> = {
  entraId:         { permission: 'Role action',   principal: 'roles' },
  azureRbac:       { permission: 'Action',        principal: 'roles' },
  aws:             { permission: 'IAM action',    principal: 'policies' },
  gcp:             { permission: 'Permission',    principal: 'roles' },
  ibmCloud:        { permission: 'IAM action',    principal: 'roles' },
  googleWorkspace: { permission: 'Privilege',     principal: 'roles' },
}

// ── Entra ID e Google Workspace, sob demanda ────────────────────────────────
//
// POR QUE ESTES DOIS TAMBÉM SAÍRAM DO IMPORT ESTÁTICO
//   AWS e GCP já vinham de índice em public/. Entra e GWS continuavam entrando
//   pelo topo do módulo: `getRoleActions` arrasta src/data/roles.ts (392 kB) e
//   `GWS_ROLES` arrasta googleWorkspace.ts (54 kB). Como esta lib é importada
//   pela página /permission-scope, os dois caíam no First Load JS da rota
//   inteira — ~416 kB para uma busca que o usuário talvez nem faça.
//
//   Agora chegam por `await import()` dentro de ensureLocalPermissionIndex(),
//   que a página já chamava antes da primeira busca. Mesmo desenho de AWS e
//   GCP: um cache em memória e um acessor síncrono que devolve null enquanto
//   não chegou — nunca uma lista vazia, que a busca leria como "sem resultado".

interface GwsPermEntry { permission: string; roles: ScopeRoleRef[] }
let _gwsCache: GwsPermEntry[] | null = null

/** null = ainda não carregado. Diferente de [], que significaria "não achou". */
function getGwsPermissionsSync(): GwsPermEntry[] | null { return _gwsCache }

async function loadGwsPermissions(): Promise<void> {
  if (_gwsCache) return
  const { GWS_ROLES } = await import('@/data/googleWorkspace')
  const map = new Map<string, GwsPermEntry>()
  for (const role of GWS_ROLES) {
    const all = [...(role.privileges ?? []), ...(role.apiPrivileges ?? [])]
    for (const p of new Set(all)) {
      let entry = map.get(p)
      if (!entry) { entry = { permission: p, roles: [] }; map.set(p, entry) }
      if (!entry.roles.some((r) => r.slug === role.slug)) {
        entry.roles.push({ name: role.name, slug: role.slug, isPrivileged: role.isPrivileged })
      }
    }
  }
  _gwsCache = [...map.values()]
}

interface EntraPermEntry { action: string; usedByRoles: ScopeRoleRef[] }
let _entraCache: EntraPermEntry[] | null = null

function getEntraActionsSync(): EntraPermEntry[] | null { return _entraCache }

async function loadEntraActions(): Promise<void> {
  if (_entraCache) return
  const { getRoleActions } = await import('./roleActions')
  _entraCache = getRoleActions()
}

// ── Índice unificado (tudo menos Azure RBAC) ────────────────────────────────

let _cache: ScopeMatch[] | null = null

/**
 * Índice achatado de permissão -> roles das 6 clouds que vivem no bundle.
 * Construído uma única vez e mantido em memória.
 */
export function getLocalPermissionIndex(): ScopeMatch[] {
  if (_cache) return _cache

  const out: ScopeMatch[] = []

  for (const e of getEntraActionsSync() ?? []) {
    out.push({ cloud: 'entraId', permission: e.action, roles: e.usedByRoles })
  }
  for (const e of getAwsActionsSync() ?? []) {
    out.push({ cloud: 'aws', permission: e.action, roles: e.usedByPolicies })
  }
  // GCP saiu do bundle: as permissões vêm de public/gcp-perms-index.json.
  // Aqui usamos só o que já estiver em memória — quem precisa do índice
  // completo chama ensureLocalPermissionIndex() antes.
  for (const e of getGcpPermissionsSync() ?? []) {
    out.push({ cloud: 'gcp', permission: e.permission, roles: e.usedByRoles })
  }
  // IBM Cloud fora: a busca reversa precisa de permission com identificador, e
  // a IBM não publica isso — as ações são mapeadas por cada serviço, não pelo
  // catálogo de roles. O que existia aqui vinha de 557 actions inventadas.
  for (const e of getGwsPermissionsSync() ?? []) {
    out.push({ cloud: 'googleWorkspace', permission: e.permission, roles: e.roles })
  }

  _cache = out
  return out
}

/**
 * Garante que GCP e AWS estejam no índice antes de montá-lo.
 *
 * getLocalPermissionIndex() é síncrono e não pode esperar rede; sem esta
 * chamada, uma busca feita antes de os índices chegarem devolveria zero
 * resultados dessas clouds silenciosamente — pior do que demorar um instante.
 */
export async function ensureLocalPermissionIndex(): Promise<ScopeMatch[]> {
  const pending: Promise<unknown>[] = []
  if (getGcpPermissionsSync() === null) pending.push(getGcpPermissions())
  if (getAwsActionsSync() === null) pending.push(getAwsActions())
  if (getEntraActionsSync() === null) pending.push(loadEntraActions())
  if (getGwsPermissionsSync() === null) pending.push(loadGwsPermissions())

  if (pending.length) {
    // allSettled: se o índice de uma cloud falhar, as outras continuam valendo
    await Promise.allSettled(pending)
    _cache = null // rebuild, agora com o que tiver chegado
    _wildcardCache = null
    _nsCache = null
  }
  return getLocalPermissionIndex()
}

/**
 * Entradas do índice cujo identificador é um padrão wildcard.
 *
 * Separadas na construção porque a segunda passada da busca só olha para elas:
 * varrer as ~32 mil entradas de novo a cada tecla, para achar as ~1,3 mil que
 * têm `*`, seria trabalho jogado fora.
 */
let _wildcardCache: ScopeMatch[] | null = null

function getWildcardEntries(): ScopeMatch[] {
  if (_wildcardCache) return _wildcardCache
  _wildcardCache = getLocalPermissionIndex().filter((m) => isWildcardPattern(m.permission))
  return _wildcardCache
}

/**
 * Os espaços de nomes que cada nuvem de fato ocupa, tirados do próprio índice.
 *
 * O QUE ISTO CONSERTA
 *   O `*` da AdministratorAccess casa com QUALQUER texto. Sem este filtro,
 *   buscar `storage.buckets.delete` — uma permissão do GCP — devolvia a policy
 *   da AWS, e buscar `microsoft.directory/users/create` devolvia a Owner do
 *   Azure pelo `*` dela. Na tela a nuvem aparece agrupada e a linha se
 *   denuncia; num retorno de ferramenta lido por modelo, não.
 *
 *   A lista NÃO é escrita à mão: sai das entradas literais do índice, então
 *   acompanha a próxima coleta sozinha. Padrão não define espaço de nomes e
 *   por isso fica de fora da construção.
 */
let _nsCache: Map<CloudId, Set<string>> | null = null

function getNamespaceKeys(): Map<CloudId, Set<string>> {
  if (_nsCache) return _nsCache
  const porNuvem = new Map<CloudId, Set<string>>()
  for (const m of getLocalPermissionIndex()) {
    if (isWildcardPattern(m.permission)) continue
    let set = porNuvem.get(m.cloud)
    if (!set) { set = new Set<string>(); porNuvem.set(m.cloud, set) }
    set.add(namespaceKey(m.permission))
  }
  _nsCache = porNuvem
  return porNuvem
}

/**
 * Este padrão pode falar sobre esta consulta, ou é de outra nuvem?
 *
 * Padrão com prefixo literal passa direto: a própria regex já o prende ao
 * espaço de nomes dele. Só o padrão sem âncora precisa da pergunta.
 */
function patternCanCover(m: ScopeMatch, qNs: string): boolean {
  if (!isUnanchoredPattern(m.permission)) return true
  return getNamespaceKeys().get(m.cloud)?.has(qNs) ?? false
}

/**
 * Casamento em duas passadas.
 *
 * 1. LITERAL — substring, case-insensitive. É o que a página promete ("aceita
 *    busca parcial") e continua sendo a passada principal.
 * 2. WILDCARD — só quando o que foi digitado parece o identificador COMPLETO de
 *    uma action. Aí cada padrão com `*` é testado contra ela e entra marcado
 *    com `viaWildcard`, para a interface poder dizer de onde veio.
 *
 * A passada 2 é condicionada porque `*` casa com tudo: aplicada a busca
 * parcial, ela empurraria AdministratorAccess e Owner para cima de todo
 * resultado. Ver `looksLikeConcreteAction` em ./wildcardMatch.
 *
 * Medido antes desta correção: `iam:CreateUser` devolvia 3 policies. Devolve 8,
 * e a AdministratorAccess — que concede a action literal `*` — só aparece aqui.
 */
/**
 * Tira da lista de concessão quem NEGA a action procurada, e guarda esses
 * nomes em `deniedBy`.
 *
 * POR QUE PRECISA SER POR POLICY, E NÃO POR ENTRADA DO ÍNDICE
 *   Descontar só os pares negativos do índice resolve o caso simples — a
 *   `AWSCompromisedKeyQuarantine`, que não concede nada. Não resolve o caso
 *   que a expansão de wildcard cria: uma policy que concede `*` num statement
 *   e nega `iam:CreateUser` em outro passaria a aparecer em `iam:CreateUser`
 *   pela via do `*`, afirmando exatamente o contrário do documento.
 *
 *   Então a regra é a mesma do Azure: concede se algum padrão positivo casa E
 *   nenhum padrão negativo casa.
 */
function dropDenied(hits: ScopeMatch[], q: string): ScopeMatch[] {
  const denyBySlug = getAwsDenyBySlug()
  if (!denyBySlug || denyBySlug.size === 0) return hits

  const concreta = looksLikeConcreteAction(q)
  const out: ScopeMatch[] = []
  for (const m of hits) {
    if (m.cloud !== 'aws') { out.push(m); continue }
    // Contra o que a negação é medida: a action concreta digitada, quando é
    // uma; senão a própria permissão da entrada, exata no casamento literal.
    const target = concreta ? q : m.permission.toLowerCase()
    const nega = (slug: string) => {
      const pats = denyBySlug.get(slug)
      return !!pats && pats.some((p) => p.toLowerCase() === target || wildcardMatches(p, target))
    }
    const concedem = m.roles.filter((r) => !nega(r.slug))
    if (concedem.length === m.roles.length) { out.push(m); continue }
    const negam = m.roles.filter((r) => nega(r.slug))
    // A entrada FICA mesmo sem ninguém concedendo, desde que alguém negue.
    //
    // Medido: `profile:*` é concedido por uma policy só — a mesma que nega
    // `profile:CreateDomain`. Descartar a entrada por ter zero concessões
    // apagaria justamente a informação mais forte da busca: "a única policy
    // que cobriria esta action por wildcard a proíbe explicitamente".
    if (concedem.length || negam.length) out.push({ ...m, roles: concedem, deniedBy: negam })
  }
  return out
}

function collectHits(q: string, includeWildcard: boolean): ScopeMatch[] {
  const literal = getLocalPermissionIndex().filter((m) => m.permission.toLowerCase().includes(q))
  if (!includeWildcard || !looksLikeConcreteAction(q)) return dropDenied(literal, q)

  // Um padrão pode casar pelas duas vias (procurar `s3:` acha `s3:*` literal).
  // A literal vence e a marcação não aparece — senão a mesma linha sairia duas
  // vezes, uma delas dizendo "via wildcard" para um casamento que foi textual.
  const seen = new Set(literal.map((m) => `${m.cloud}|${m.permission}`))
  const out = literal.slice()
  const qNs = namespaceKey(q)
  for (const m of getWildcardEntries()) {
    if (seen.has(`${m.cloud}|${m.permission}`)) continue
    if (!patternCanCover(m, qNs)) continue
    if (wildcardMatches(m.permission, q)) out.push({ ...m, viaWildcard: true })
  }
  return dropDenied(out, q)
}

/** igual > começa com > contém > concedido por wildcard. */
function rankOf(m: ScopeMatch, q: string): number {
  if (m.viaWildcard) return 3
  const s = m.permission.toLowerCase()
  if (s === q) return 0
  if (s.startsWith(q)) return 1
  return 2
}

/**
 * Ordena priorizando o match mais "exato" possível, e depois pelo número de
 * roles (mais roles = permissão mais difundida, normalmente mais relevante).
 */
export function searchLocalPermissions(
  query: string, limitPerCloud = 40, includeWildcard = true,
): ScopeMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const hits = collectHits(q, includeWildcard)

  hits.sort((a, b) =>
    rankOf(a, q) - rankOf(b, q) ||
    b.roles.length - a.roles.length ||
    a.permission.localeCompare(b.permission),
  )

  // Limita por cloud para uma cloud com milhares de matches não afogar as outras.
  const perCloud = new Map<CloudId, number>()
  const capped: ScopeMatch[] = []
  for (const h of hits) {
    const n = perCloud.get(h.cloud) ?? 0
    if (n >= limitPerCloud) continue
    perCloud.set(h.cloud, n + 1)
    capped.push(h)
  }
  return capped
}

/** Quantos matches existem por cloud, antes de qualquer limite. */
export function countLocalMatches(query: string, includeWildcard = true): Record<string, number> {
  const q = query.trim().toLowerCase()
  if (!q) return {}
  const counts: Record<string, number> = {}
  for (const m of collectHits(q, includeWildcard)) {
    counts[m.cloud] = (counts[m.cloud] ?? 0) + 1
  }
  return counts
}

/** Total de permissões distintas indexadas por cloud — usado no estado vazio. */
export function getLocalIndexStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const m of getLocalPermissionIndex()) {
    stats[m.cloud] = (stats[m.cloud] ?? 0) + 1
  }
  return stats
}
