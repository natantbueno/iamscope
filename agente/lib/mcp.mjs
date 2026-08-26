// mcp.mjs — sobe o servidor iamscope-mcp e traduz as ferramentas dele.
//
// O agente não conhece IAM. Ele conhece o protocolo: pergunta ao servidor quais
// ferramentas existem, entrega essa lista ao modelo, e repassa as chamadas. Se o
// pacote ganhar uma oitava ferramenta amanhã, este arquivo não muda.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

/**
 * Conecta no servidor.
 *
 * Por padrão sobe o pacote publicado com `npx -y iamscope-mcp` — é o que qualquer
 * pessoa tem sem clonar nada. `servidor` aponta para um `dist/server.mjs` local
 * quando você está desenvolvendo o pacote e quer testar o que ainda não publicou.
 */
export async function conectar({ servidor = null, silencioso = true } = {}) {
  const transporte = servidor
    ? new StdioClientTransport({ command: process.execPath, args: [servidor], stderr: silencioso ? 'ignore' : 'inherit' })
    : new StdioClientTransport({
        // npx.cmd no Windows: o .cmd é o que o PATH resolve lá.
        command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
        args: ['-y', 'iamscope-mcp'],
        stderr: silencioso ? 'ignore' : 'inherit',
      })

  const client = new Client({ name: 'iamscope-agente', version: '0.1.0' })
  await client.connect(transporte)
  return client
}

/**
 * Ferramentas do MCP no formato que a API da Anthropic espera.
 *
 * A tradução é quase identidade — `inputSchema` vira `input_schema` — porque os
 * dois lados falam JSON Schema. É de propósito que a DESCRIÇÃO vai inteira: ela
 * carrega os avisos que impedem o modelo de usar a ferramenta errado ("não é
 * busca semântica", "nome ausente devolve erro, não lista vazia"), e resumir
 * aqui jogaria fora o trabalho feito lá.
 */
export async function ferramentasParaModelo(client) {
  const { tools } = await client.listTools()
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }))
}

/**
 * As instruções que o SERVIDOR declara.
 *
 * O servidor MCP publica um texto de instruções no handshake — nele estão a regra
 * do guardrail e o aviso sobre campos de curadoria. Usar esse texto, em vez de
 * reescrever a regra aqui, é o que impede as duas cópias de divergirem: quando o
 * pacote endurecer a regra, este agente herda sem release.
 */
export function instrucoesDoServidor(client) {
  return client.getInstructions?.() ?? ''
}

/** Executa uma ferramenta e devolve { texto, json }. */
export async function chamar(client, nome, argumentos) {
  const r = await client.callTool({ name: nome, arguments: argumentos ?? {} })
  const texto = (r.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
  let json = null
  try { json = JSON.parse(texto) } catch { /* nem toda ferramenta devolve JSON */ }
  return { texto, json, isError: !!r.isError }
}
