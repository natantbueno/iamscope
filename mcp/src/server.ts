#!/usr/bin/env node
// server.ts — o servidor MCP, por stdio.
//
// stdio e não HTTP, por uma razão que é a promessa do produto e não uma
// preferência de transporte: o processo roda na máquina de quem pergunta, lê um
// catálogo que veio junto no pacote, e não abre socket nenhum. O que o
// PRODUCT.md promete — que o catálogo não sobe para lugar nenhum — aqui não
// depende de configuração de CORS nem de política de retenção de log. Depende
// de não haver rede.
//
// CUIDADO COM stdout
//   Em stdio, stdout É o canal do protocolo. Um único console.log de depuração
//   corrompe o frame JSON-RPC e o cliente desconecta com um erro que não
//   menciona o log. Todo diagnóstico vai para stderr.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { installLocalFetch, packageVersion } from './runtime'
import { SERVER_INSTRUCTIONS, LICENSE, THIRD_PARTY } from './provenance'
import { TOOLS, TIER_REFERENCE, ESCALADA_REFERENCE } from './tools'

installLocalFetch()

const VERSION = packageVersion()

const server = new McpServer(
  { name: 'iamscope', version: VERSION },
  {
    instructions: SERVER_INSTRUCTIONS,
    capabilities: { tools: {}, resources: {} },
  },
)

for (const tool of TOOLS) {
  server.registerTool(
    tool.name,
    { title: tool.title, description: tool.description, inputSchema: tool.schema },
    async (args: any) => {
      try {
        const out = await tool.run(args, VERSION)
        return { content: [{ type: 'text' as const, text: JSON.stringify(out, null, 2) }] }
      } catch (e) {
        // Erro vira conteúdo com isError, não exceção de protocolo: o modelo
        // precisa LER o que falhou para corrigir a chamada. Uma falha de
        // transporte ele não vê, e a conversa morre sem explicação.
        const msg = e instanceof Error ? e.message : String(e)
        process.stderr.write(`[iamscope-mcp] ${tool.name} falhou: ${msg}\n`)
        return {
          isError: true,
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'TOOL_FAILED', tool: tool.name, message: msg }, null, 2) }],
        }
      }
    },
  )
}

// ── Recursos ────────────────────────────────────────────────────────────────
// A atribuição precisa ser legível sem gastar uma chamada de ferramenta: a
// CC BY 4.0 e as duas licenças MIT exigem que o crédito viaje com o dado, e um
// recurso é o lugar do MCP para dado que se lê, não que se executa.

server.registerResource(
  'licenca',
  'iamscope://license',
  { title: 'Licença e atribuição', description: 'CC BY 4.0 sobre a curadoria, MIT dos terceiros, e os termos dos provedores.', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify({ license: LICENSE, thirdParty: THIRD_PARTY, dataLicense: 'https://github.com/natantbueno/iamscope/blob/main/DATA-LICENSE.md' }, null, 2),
    }],
  }),
)

server.registerResource(
  'tiers',
  'iamscope://tiers',
  { title: 'Escadas de tier e o Enterprise Access Model', description: 'As seis escadas de tier por plataforma e os três níveis EAM. Curadoria editorial.', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(TIER_REFERENCE, null, 2) }],
  }),
)

server.registerResource(
  'escalada-azure',
  'iamscope://azure/privilege-escalation',
  { title: 'Acoes do Azure que permitem escalar privilegio', description: 'A lista curta do que faz uma custom role parecer estreita sendo equivalente a Owner. Curadoria editorial.', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(ESCALADA_REFERENCE, null, 2) }],
  }),
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write(`[iamscope-mcp] v${VERSION} pronto — ${TOOLS.length} ferramentas, catálogo local, sem rede.\n`)
}

main().catch((e) => {
  process.stderr.write(`[iamscope-mcp] falha ao iniciar: ${e instanceof Error ? e.stack : e}\n`)
  process.exit(1)
})
