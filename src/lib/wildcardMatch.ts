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
