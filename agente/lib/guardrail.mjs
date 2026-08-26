// guardrail.mjs — a verificação DEPOIS, que só o agente consegue fazer.
//
// POR QUE ISTO EXISTE, E POR QUE NÃO PODIA ESTAR NO SERVIDOR MCP
//   O desenho aprovado do agente do Role Advisor diz: "toda role citada tem que
//   vir de retorno de ferramenta, com verificação depois; nome ausente do
//   catálogo é derrubado, não devolvido".
//
//   Um servidor MCP não consegue cumprir a segunda metade. Ele nunca vê a prosa
//   do modelo — devolve JSON e some. O que ele pode fazer é não produzir nome
//   falso, oferecer `verify_role_names`, e dizer a regra nas instruções. Isso é
//   menos do que "derrubado".
//
//   O agente vê a resposta final. Então aqui a regra fecha: extrai os nomes que o
//   modelo escreveu, confere contra o que as ferramentas realmente devolveram, e
//   o que sobrar passa por verify_role_names. `roles/bigquery.readOnly` não sai
//   sem aviso.
//
// O QUE ESTA CHECAGEM ALCANÇA, E O QUE NÃO
//   Ela pega identificador — `roles/x.y`, ARN, e o que o modelo põe em crase.
//   É de propósito: é a forma que vai para um `terraform apply`, e é onde a
//   invenção custa caro.
//
//   Nome de exibição solto no meio de uma frase ("use a Password Administrator")
//   ela NÃO tenta extrair. Fazer isso exigiria adivinhar onde um nome próprio
//   começa e termina em texto livre, e o resultado seria falso positivo em toda
//   frase — um alarme que dispara sempre é um alarme desligado. O que cobre esse
//   caso é a outra metade: nomes de exibição vêm dos retornos de ferramenta, e o
//   conjunto `citados` registra todos eles.

/** Chaves cujo valor, em qualquer retorno de ferramenta, é nome de role. */
const CHAVES_DE_NOME = new Set(['name', 'slug', 'nativeId', 'role'])

/**
 * Varre um retorno de ferramenta e recolhe tudo que é nome/identificador de role.
 *
 * Anda no JSON inteiro em vez de conhecer o formato de cada uma das sete
 * ferramentas. Formato muda; a pergunta "que nomes este retorno afirma?" não.
 */
export function colherCitados(valor, destino = new Set()) {
  if (valor == null) return destino
  if (Array.isArray(valor)) {
    for (const v of valor) colherCitados(v, destino)
    return destino
  }
  if (typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      if (typeof v === 'string' && CHAVES_DE_NOME.has(k) && v.trim()) destino.add(v.trim().toLowerCase())
      else colherCitados(v, destino)
    }
  }
  return destino
}

// roleId do GCP: roles/bigquery.dataViewer, roles/resourcemanager.organizationAdmin
const RE_GCP = /\broles\/[A-Za-z][\w.]*\b/g
// ARN de policy gerenciada da AWS
const RE_ARN = /\barn:aws:iam::[^\s`"']*policy\/[\w+=,.@/-]+/g
// Qualquer coisa em crase que tenha cara de identificador (com / . : _ -)
const RE_CRASE = /`([^`\n]{2,120})`/g

/** Parece identificador, e não frase solta em crase. */
function pareceIdentificador(s) {
  if (/\s/.test(s)) return false
  return /[/.:]/.test(s) && /[A-Za-z]/.test(s)
}

/** Identificadores que o modelo escreveu na resposta final. */
export function extrairIdentificadores(texto) {
  const achados = new Set()
  for (const m of texto.matchAll(RE_GCP)) achados.add(m[0])
  for (const m of texto.matchAll(RE_ARN)) achados.add(m[0])
  for (const m of texto.matchAll(RE_CRASE)) {
    const s = m[1].trim()
    if (pareceIdentificador(s)) achados.add(s)
  }
  return [...achados]
}

/**
 * Confere a resposta final.
 *
 * `citados` são os nomes que as ferramentas devolveram nesta conversa — o que
 * está lá dentro já é fato, e não gasta chamada. O resto vai para
 * `verify_role_names`, que é a autoridade.
 *
 * Devolve { limpo, naoVerificados, deFerramenta, ignorados }.
 */
export async function conferirResposta({ texto, citados, verificar }) {
  const candidatos = extrairIdentificadores(texto)
  const deFerramenta = []
  const aVerificar = []

  for (const c of candidatos) {
    if (citados.has(c.toLowerCase())) deFerramenta.push(c)
    else aVerificar.push(c)
  }

  if (aVerificar.length === 0) {
    return { limpo: true, naoVerificados: [], deFerramenta, ignorados: [] }
  }

  const resultado = await verificar(aVerificar)
  const porNome = new Map((resultado?.results ?? []).map((r) => [r.query, r]))

  const naoVerificados = []
  const ignorados = []
  for (const c of aVerificar) {
    const r = porNome.get(c)
    if (!r) { ignorados.push(c); continue }           // a ferramenta não opinou
    if (r.verdict === 'NOT_IN_CATALOG') {
      naoVerificados.push({ nome: c, sugestoes: (r.didYouMean ?? []).map((s) => s.nativeId || s.name) })
    }
  }

  return { limpo: naoVerificados.length === 0, naoVerificados, deFerramenta, ignorados }
}

/** O aviso, para quem está lendo a resposta no terminal. */
export function formatarAviso(conferencia) {
  if (conferencia.limpo) return null
  const linhas = ['', '  ATENCAO: a resposta acima cita nome que NAO existe no catalogo.', '']
  for (const n of conferencia.naoVerificados) {
    linhas.push(`    ${n.nome}`)
    if (n.sugestoes.length) linhas.push(`      parecidos no catalogo: ${n.sugestoes.join(', ')}`)
  }
  linhas.push('')
  linhas.push('  Nome plausivel e inexistente e o defeito que este agente existe para pegar.')
  linhas.push('  Nao use o identificador acima sem conferir na documentacao do provedor.')
  linhas.push('')
  return linhas.join('\n')
}
