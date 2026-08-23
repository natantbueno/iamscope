/**
 * Busca da descrição oficial de uma action do Azure, tolerante a caixa.
 *
 * POR QUE NÃO DÁ PARA COMPARAR DIRETO
 *   Os identificadores de action do Azure são case-insensitive no ARM, e a
 *   documentação da Microsoft não é consistente: a mesma operação aparece como
 *   `Microsoft.Insights/Logs/Read` nas tabelas de permissões e como
 *   `Microsoft.insights/logs/read` dentro das definições de role. Comparando
 *   string exata, 225 actions ficavam sem descrição — não por falta de dado,
 *   mas por diferença de maiúsculas.
 *
 *   Isso mantinha a cobertura reportada em 60,4% quando o valor real, sobre as
 *   actions concretas, era 95,2%.
 *
 * COLISÕES
 *   14 chaves colidem ao normalizar (a Microsoft documenta a mesma operação
 *   duas vezes, com redação levemente diferente). Preferimos a variante com
 *   caixa própria, que é a das tabelas canônicas; a duplicata em minúsculas
 *   costuma ser a redação mais curta e antiga.
 */

export type ActionDocs = Record<string, string>

/**
 * Índice normalizado. Construído uma vez por conjunto de dados e memoizado por
 * referência — as páginas fazem `fetch` uma vez e passam o mesmo objeto adiante.
 */
const cache = new WeakMap<ActionDocs, Map<string, string>>()

function buildIndex(docs: ActionDocs): Map<string, string> {
  const m = new Map<string, string>()
  for (const [k, v] of Object.entries(docs)) {
    const key = k.toLowerCase()
    const existente = m.get(key)
    // Sem conflito, ou a nova chave tem caixa própria e a anterior não:
    // fica com a de caixa própria.
    if (existente === undefined || (k !== key && existente.length < v.length)) {
      m.set(key, v)
    }
  }
  return m
}

function indexOf(docs: ActionDocs): Map<string, string> {
  let idx = cache.get(docs)
  if (!idx) {
    idx = buildIndex(docs)
    cache.set(docs, idx)
  }
  return idx
}

/** Descrição oficial da action, ou undefined se a Microsoft não documenta. */
export function lookupActionDoc(docs: ActionDocs, action: string): string | undefined {
  if (!action) return undefined
  const direta = docs[action]
  if (direta) return direta
  return indexOf(docs).get(action.toLowerCase())
}

/**
 * Wildcards (`Microsoft.Foo/*`) nunca terão descrição oficial: são padrões de
 * correspondência, não operações, e por isso não aparecem nas tabelas da
 * Microsoft. Separar isso importa para não reportar como lacuna algo que é
 * impossível de preencher — 750 das 2.697 actions do catálogo são wildcard.
 */
export function isWildcardAction(action: string): boolean {
  return action.includes('*')
}
