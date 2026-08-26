// teste.mjs — o laço inteiro, com um modelo de mentira.
//
// POR QUE UM MODELO FALSO, E NÃO UMA CHAMADA DE VERDADE
//   O que precisa de teste aqui não é o modelo — é o que acontece EM VOLTA dele:
//   as ferramentas chegam traduzidas? o retorno volta com o id certo? os nomes
//   citados são acumulados? e, sobretudo, o guardrail derruba um identificador
//   inventado na resposta final?
//
//   Nenhuma dessas perguntas precisa de rede, e todas ficariam caras e instáveis
//   se dependessem de uma chamada paga que responde diferente a cada execução.
//   O modelo entra por injeção justamente para poder ser roteirizado aqui.
//
//   O que ISTO NÃO cobre: se o modelo de verdade escolhe a ferramenta certa. Isso
//   só se sabe com a chave, rodando `node agente.mjs "..."`.
//
// O servidor MCP é REAL — sobe o pacote de verdade e responde do catálogo.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { conectar, ferramentasParaModelo, instrucoesDoServidor } from './lib/mcp.mjs'
import { conversar } from './lib/loop.mjs'
import { extrairIdentificadores, colherCitados } from './lib/guardrail.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SERVIDOR = process.env.IAMSCOPE_SERVIDOR ?? null

let pass = 0, fail = 0
const ok = (nome, cond, detalhe = '') => {
  if (cond) { pass++; console.log(`  ✓ ${nome}`) }
  else { fail++; console.log(`  ✗ ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}

/** Modelo roteirizado: devolve os blocos que a lista mandar, um por volta. */
function modeloFalso(roteiro) {
  let i = 0
  const vistas = []
  return {
    vistas,
    async criar({ system, tools, messages }) {
      vistas.push({ system, tools, messages: JSON.parse(JSON.stringify(messages)) })
      const passo = roteiro[Math.min(i++, roteiro.length - 1)]
      return { content: passo, stop_reason: passo.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn' }
    },
  }
}

console.log('\n── extração de identificador (sem rede) ──')
{
  const t = 'Use `roles/bigquery.dataViewer` no GCP. No Azure, a Owner. ' +
            'Veja `arn:aws:iam::aws:policy/ReadOnlyAccess` e a frase `nao e identificador`.'
  const ids = extrairIdentificadores(t)
  ok('pega roleId do GCP', ids.includes('roles/bigquery.dataViewer'), ids.join(' | '))
  ok('pega ARN da AWS', ids.some((s) => s.startsWith('arn:aws:iam')), ids.join(' | '))
  ok('ignora frase com espaço dentro de crase', !ids.includes('nao e identificador'))
  ok('não inventa identificador a partir de nome solto', !ids.includes('Owner'))
}
{
  // roles/... fora de crase também conta: é a forma que aparece em Terraform.
  const ids = extrairIdentificadores('recomendo roles/bigquery.readOnly para isso')
  ok('pega roles/... mesmo sem crase', ids.includes('roles/bigquery.readOnly'), ids.join(' | '))
}
{
  const c = colherCitados({ results: [{ name: 'Owner', matches: [{ nativeId: 'roles/owner', slug: 'owner' }] }] })
  ok('colhe name, nativeId e slug de qualquer formato', c.has('owner') && c.has('roles/owner'), [...c].join(' | '))
}

console.log('\n── laço completo, com servidor MCP de verdade ──')
const client = await conectar({ servidor: SERVIDOR })
const ferramentas = await ferramentasParaModelo(client)
ok('7 ferramentas traduzidas para o formato do modelo', ferramentas.length === 7, `${ferramentas.length}`)
ok('  → com input_schema, não inputSchema', ferramentas.every((f) => f.input_schema && !f.inputSchema))
ok('  → e com a descrição inteira', ferramentas.every((f) => (f.description ?? '').length > 80))

const instrucoes = instrucoesDoServidor(client)
ok('as instruções vêm do SERVIDOR, não do agente', /verify_role_names/.test(instrucoes), instrucoes.slice(0, 60))

console.log('\n── uma volta de ferramenta, e o resultado volta ao modelo ──')
{
  const modelo = modeloFalso([
    [{ type: 'tool_use', id: 'tu_1', name: 'compare_equivalent_roles', input: { query: 'Owner', clouds: ['gcp'] } }],
    [{ type: 'text', text: 'O equivalente e `roles/resourcemanager.organizationAdmin`.' }],
  ])
  const r = await conversar({ client, modelo, ferramentas, pergunta: 'equivalente do Owner no GCP?', sistema: 'x' })
  ok('a ferramenta foi chamada', r.chamadas.length === 1 && r.chamadas[0].nome === 'compare_equivalent_roles')
  ok('duas voltas', r.voltas === 2, `${r.voltas}`)

  const segunda = modelo.vistas[1].messages
  const ultimo = segunda[segunda.length - 1]
  ok('o retorno voltou como tool_result', ultimo.content[0].type === 'tool_result')
  ok('  → com o tool_use_id certo', ultimo.content[0].tool_use_id === 'tu_1')
  ok('  → e com conteúdo do catálogo', /organizationAdmin/.test(ultimo.content[0].content))

  ok('o identificador citado veio de ferramenta e passa limpo', r.conferencia.limpo, JSON.stringify(r.conferencia).slice(0, 160))
  ok('  → e foi registrado como conferido', r.conferencia.deFerramenta.includes('roles/resourcemanager.organizationAdmin'),
     r.conferencia.deFerramenta.join(' | '))
}

console.log('\n── o guardrail: modelo inventa um nome na resposta final ──')
{
  const modelo = modeloFalso([
    [{ type: 'tool_use', id: 'tu_1', name: 'search_roles', input: { query: 'bigquery leitura', limit: 3 } }],
    [{ type: 'text', text: 'Para leitura no BigQuery, use `roles/bigquery.readOnly`.' }],
  ])
  const r = await conversar({ client, modelo, ferramentas, pergunta: 'role de leitura do BigQuery?', sistema: 'x' })
  ok('a resposta NAO passa limpa', r.conferencia.limpo === false)
  ok('  → e o nome inventado é nomeado',
     r.conferencia.naoVerificados.some((n) => n.nome === 'roles/bigquery.readOnly'),
     JSON.stringify(r.conferencia.naoVerificados))
  ok('  → com parecidos do catálogo como pista',
     (r.conferencia.naoVerificados[0]?.sugestoes ?? []).length > 0,
     JSON.stringify(r.conferencia.naoVerificados[0]?.sugestoes))
}

console.log('\n── nome verdadeiro que o modelo cita sem ter chamado ferramenta ──')
{
  // Sem chamada nenhuma: o nome nao esta em `citados`, entao vai para
  // verify_role_names. Existe de verdade, entao passa. E o caso que separa
  // "nao veio de ferramenta" de "nao existe".
  const modelo = modeloFalso([[{ type: 'text', text: 'Use `roles/bigquery.dataViewer`.' }]])
  const r = await conversar({ client, modelo, ferramentas, pergunta: 'x', sistema: 'x' })
  ok('nome real, citado sem ferramenta, passa na verificação', r.conferencia.limpo, JSON.stringify(r.conferencia))
  ok('  → sem gastar chamada de ferramenta na conversa', r.chamadas.length === 0)
}

console.log('\n── erro de ferramenta chega ao modelo em vez de derrubar o laço ──')
{
  const modelo = modeloFalso([
    [{ type: 'tool_use', id: 'tu_1', name: 'find_role_conflicts', input: { role: 'Nao Existe', platform: 'gcp' } }],
    [{ type: 'text', text: 'Essa role nao existe no catalogo.' }],
  ])
  const r = await conversar({ client, modelo, ferramentas, pergunta: 'x', sistema: 'x' })
  ok('o laço sobreviveu', r.voltas === 2)
  const segunda = modelo.vistas[1].messages
  const conteudo = segunda[segunda.length - 1].content[0].content
  ok('  → e o modelo recebeu ROLE_NOT_IN_CATALOG para poder reagir', /ROLE_NOT_IN_CATALOG/.test(conteudo))
}

console.log('\n── teto de voltas: não devolve conversa truncada como resposta ──')
{
  const modelo = modeloFalso([[{ type: 'tool_use', id: 'tu_x', name: 'search_roles', input: { query: 'a' } }]])
  const r = await conversar({ client, modelo, ferramentas, pergunta: 'x', sistema: 'x', maxVoltas: 3 })
  ok('marca que estourou', r.estourou === true)
  ok('  → e não entrega texto pela metade', r.texto === '')
}

await client.close()
console.log(`\n${fail === 0 ? '✅' : '❌'}  ${pass} passaram, ${fail} falharam\n`)
process.exit(fail === 0 ? 0 : 1)
