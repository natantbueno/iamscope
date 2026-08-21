'use strict'
/**
 * Um lugar só para responder "o que esta policy CONCEDE?".
 *
 * POR QUE ISTO EXISTE
 *   Até 21/08/2026 o coletor lia `s.Action` de TODO statement, sem olhar o
 *   `s.Effect`. O resultado é que uma policy de negação aparecia concedendo:
 *   a `AWSDenyAll` "concedia" `*` e por isso era classificada como tier
 *   FullAccess e privilegiada — o rótulo mais grave do site numa policy que
 *   não concede absolutamente nada. As três `AWSCompromisedKeyQuarantine`,
 *   que existem para CONTER uma chave vazada, apareciam concedendo 99 actions.
 *
 *   Medido em 21/08/2026 sobre as 1.582 policies gerenciadas:
 *     42 policies afetadas (5 puramente Deny + 37 mistas)
 *     436 pares action->policy vindos de Deny, exibidos como concessão
 *     74 actions que só existiam no índice por causa de um Deny
 *     23 policies com actionCount errado
 *     4 policies com isPrivileged errado, 3 com tier errado
 *
 * O QUE NÃO MUDA
 *   `NotAction` continua saindo à parte, como já saía — o coletor sempre
 *   tratou isso certo. `NotAction` não é negação: é "todas as actions MENOS
 *   estas", e o site não expande esse complemento.
 */

/** Statement pode ser objeto único ou lista. Normaliza para lista. */
function statementsOf(document) {
  if (!document) return []
  const st = document.Statement
  if (Array.isArray(st)) return st
  return st ? [st] : []
}

/**
 * Divide um documento de policy nos três conjuntos que importam.
 *
 * @returns {{ allow: string[], deny: string[], notActions: string[] }}
 *   allow      actions concedidas de verdade (Effect diferente de 'Deny')
 *   deny       actions explicitamente negadas
 *   notActions complemento declarado com NotAction (não é nem um nem outro)
 */
function splitByEffect(document) {
  const allow = new Set()
  const deny = new Set()
  const notActions = new Set()
  for (const s of statementsOf(document)) {
    // O padrão do IAM é Allow: um statement sem Effect explícito é inválido na
    // AWS, mas o parser não deve inventar negação onde o campo está ausente.
    const negativo = s && s.Effect === 'Deny'
    for (const a of [].concat((s && s.Action) ?? [])) (negativo ? deny : allow).add(a)
    for (const a of [].concat((s && s.NotAction) ?? [])) notActions.add(a)
  }
  return {
    allow: [...allow].sort(),
    deny: [...deny].sort(),
    notActions: [...notActions].sort(),
  }
}

module.exports = { statementsOf, splitByEffect }
