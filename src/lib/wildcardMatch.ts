// ── Casamento de padrão wildcard, para a busca reversa de permissão ─────────
//
// O PROBLEMA QUE ISTO RESOLVE
//   Os índices invertidos guardam a action exatamente como a plataforma a
//   escreve — e a plataforma escreve wildcard. A `AdministratorAccess` da AWS
//   concede a action literal `*`; a `Reader` do Azure concede `*/read`; a
//   `AmazonS3ReadOnlyAccess` concede `s3:Get*`. Como a busca era só substring,
//   procurar `iam:CreateUser` NUNCA devolvia a AdministratorAccess: a string
//   "iam:CreateUser" não está contida em "*".
//
//   Medido no índice que está no ar antes desta correção:
//     AWS   1.284 padrões wildcard em 16.117 chaves — 537 das 1.553 policies
//           (35%) concedem alguma coisa só por wildcard e eram invisíveis.
//     Azure   750 padrões wildcard em 2.697 chaves — Owner, Contributor e
//           Reader não apareciam em busca nenhuma por action concreta.
//
// POR QUE O CASAMENTO É CONDICIONADO
//   `*` casa com tudo. Se a expansão valesse para qualquer texto digitado,
//   escrever "listKeys" (busca parcial, que a página promete aceitar) traria
//   AdministratorAccess, Owner e Contributor em cima de todo resultado — ruído
//   com cara de resposta. Por isso a expansão só entra quando o que foi
//   digitado se parece com o identificador COMPLETO de uma action; para busca
//   parcial, a passada literal continua sozinha.

/** Cache de regex compilada. São ~2 mil padrões nos dois índices somados. */
const RE_CACHE = new Map<string, RegExp>()

function toRegExp(pattern: string): RegExp {
  const cached = RE_CACHE.get(pattern)
  if (cached) return cached
  // Escapa tudo que é especial em regex, MENOS o `*`, que vira `.*`.
  const body = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  const re = new RegExp(`^${body}$`, 'i')
  RE_CACHE.set(pattern, re)
  return re
}

/** O texto é um padrão wildcard (e não uma action literal)? */
export function isWildcardPattern(s: string): boolean {
  return s.includes('*')
}

/**
 * O que foi digitado parece o identificador completo de uma action?
 *
 * Cobre as quatro formas que existem nos índices:
 *   AWS      s3:GetObject                              — tem `:`
 *   Azure    Microsoft.Storage/.../listKeys/action      — tem `/`
 *   Entra ID microsoft.directory/users/create           — tem `/`
 *   GCP      compute.instances.delete                   — 3+ segmentos com `.`
 *
 * Privilege do Google Workspace é prosa ("Manage other admins") e não casa com
 * nenhuma das formas — que é o certo, porque o índice do Workspace não tem
 * wildcard nenhum.
 */
export function looksLikeConcreteAction(query: string): boolean {
  const s = query.trim()
  if (s.length < 4) return false
  if (s.includes('*')) return false // quem já digitou wildcard quer a passada literal
  if (s.includes(':') || s.includes('/')) return true
  return /^[a-z][\w-]*(\.[\w-]+){2,}$/i.test(s)
}

/** O padrão (`s3:*`, `*\/read`, `*`) concede a action pedida? */
export function wildcardMatches(pattern: string, action: string): boolean {
  if (!isWildcardPattern(pattern)) return false
  return toRegExp(pattern).test(action.trim())
}

/**
 * O padrão NÃO carrega texto da própria nuvem?
 *
 * `s3:Get*` só casa com quem começa em `s3:`; `Microsoft.Authorization/*\/read`
 * só casa com quem começa naquele provedor. Esses se defendem sozinhos — o
 * prefixo literal é a fronteira. Já um padrão que COMEÇA com `*` não afirma
 * nada sobre o identificador, e é por ele que uma nuvem invade a outra.
 *
 * Medido nos índices em 25/08/2026: dos 1.267 padrões da AWS, exatamente UM é
 * assim (`*`); dos 750 do Azure, DOIS. O Entra ID não tem padrão nenhum (670
 * actions) e o GCP também não (13.701 permissões). O vazamento inteiro cabe em
 * três strings — e é por isso que a correção filtra estas, em vez de mexer no
 * casamento dos outros 2.014.
 */
export function isUnanchoredPattern(pattern: string): boolean {
  return pattern.trimStart().startsWith('*')
}

/**
 * A que espaço de nomes um identificador pertence.
 *
 * Não é "cara de action": é o separador, e ele separa as nuvens de verdade
 * porque foi medido, não suposto (25/08/2026):
 *
 *   `:`  16.422 das 16.423 actions da AWS têm — a única exceção é o próprio
 *        `*`. NENHUMA permissão de GCP, Azure ou Entra tem `:`.
 *   `/`  o prefixo antes da primeira barra. Têm barra: 2.696 das 2.697 chaves
 *        do Azure, as 670 do Entra, e 138 do GCP
 *        (`cloudonefs.isiloncloud.com/clusters.create` e vizinhas — foi o dado
 *        que derrubou a regra ingênua de "barra = Microsoft").
 *   `.`  o resto do GCP, pontilhado, sem separador de família.
 *
 * **Entra e Azure colidem em dois prefixos** — `microsoft.edge` e
 * `microsoft.insights` existem nos dois catálogos. Consulta com um desses é
 * ambígua de verdade, e o chamador a trata como pertencente às duas nuvens:
 * inventar um desempate seria escolher por palpite.
 */
export function namespaceKey(identifier: string): string {
  const s = identifier.trim().toLowerCase()
  if (s.includes(':')) return ':'
  const i = s.indexOf('/')
  return i > 0 ? s.slice(0, i) : '.'
}
