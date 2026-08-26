// loop.mjs — o laço agêntico.
//
// O modelo entra por injeção (`modelo.criar`), e não como `new Anthropic()` aqui
// dentro. Não é purismo: sem isso, testar o laço exigiria uma chave de API e uma
// chamada paga a cada execução — e o que mais precisa de teste neste arquivo é
// justamente o caminho que NÃO depende do modelo (a sequência de chamadas, o
// acúmulo de `citados`, e o guardrail). Ver teste.mjs, que roda o laço inteiro
// com um modelo de mentira e sem rede.

import { chamar } from './mcp.mjs'
import { colherCitados, conferirResposta } from './guardrail.mjs'

const MAX_VOLTAS = 12

export const SISTEMA_BASE = `
Voce responde perguntas sobre controle de acesso em seis nuvens usando SOMENTE as ferramentas
disponiveis. Voce nao sabe de cor os nomes de role destas plataformas e nao deve tentar lembrar.

Responda em portugues do Brasil, a menos que a pergunta venha em outro idioma.

Ao citar um identificador (roles/..., ARN, GUID), escreva-o em crase. A resposta passa por uma
verificacao automatica depois, e a crase e o que permite conferir o nome contra o catalogo.

Quando a busca voltar fraca, leia o campo "plan" do retorno e diga o que nao casou, em vez de
preencher a lacuna com o que parece razoavel. "Nao achei" e uma resposta melhor que um palpite
com cara de fato.

Seja direto. Sem preambulo.
`.trim()

/**
 * Roda a conversa até o modelo parar de pedir ferramenta.
 *
 * `aoVivo` recebe eventos para a interface mostrar progresso — o laço não imprime
 * nada sozinho, para poder ser usado fora de um terminal.
 */
export async function conversar({
  client,
  modelo,
  ferramentas,
  pergunta,
  sistema,
  aoVivo = () => {},
  maxVoltas = MAX_VOLTAS,
}) {
  const mensagens = [{ role: 'user', content: pergunta }]
  const citados = new Set()
  const chamadas = []

  for (let volta = 0; volta < maxVoltas; volta++) {
    const resposta = await modelo.criar({ system: sistema, tools: ferramentas, messages: mensagens })

    const usos = (resposta.content ?? []).filter((b) => b.type === 'tool_use')
    const textos = (resposta.content ?? []).filter((b) => b.type === 'text').map((b) => b.text)

    if (usos.length === 0) {
      const texto = textos.join('\n').trim()
      const conferencia = await conferirResposta({
        texto,
        citados,
        verificar: async (nomes) => {
          const { json } = await chamar(client, 'verify_role_names', { names: nomes.slice(0, 50) })
          return json
        },
      })
      return { texto, conferencia, chamadas, voltas: volta + 1 }
    }

    mensagens.push({ role: 'assistant', content: resposta.content })

    const retornos = []
    for (const uso of usos) {
      aoVivo({ tipo: 'ferramenta', nome: uso.name, argumentos: uso.input })
      const { texto, json, isError } = await chamar(client, uso.name, uso.input)
      if (json) colherCitados(json, citados)
      chamadas.push({ nome: uso.name, argumentos: uso.input, erro: isError })
      retornos.push({
        type: 'tool_result',
        tool_use_id: uso.id,
        content: texto,
        is_error: isError,
      })
      aoVivo({ tipo: 'retorno', nome: uso.name, erro: isError, bytes: texto.length })
    }
    mensagens.push({ role: 'user', content: retornos })
  }

  // Teto de voltas atingido. Devolver o que houver seria apresentar uma conversa
  // truncada como resposta — pior que dizer que nao terminou.
  return {
    texto: '',
    conferencia: { limpo: true, naoVerificados: [], deFerramenta: [], ignorados: [] },
    chamadas,
    voltas: maxVoltas,
    estourou: true,
  }
}

/** Adaptador do SDK da Anthropic para a forma que o laço espera. */
export function modeloAnthropic(cliente, { model, max_tokens = 4096 }) {
  return {
    async criar({ system, tools, messages }) {
      return cliente.messages.create({ model, max_tokens, system, tools, messages })
    },
  }
}
