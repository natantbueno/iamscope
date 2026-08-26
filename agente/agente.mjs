#!/usr/bin/env node
// agente.mjs — pergunte sobre IAM em linguagem natural, na linha de comando.
//
//   node agente.mjs "qual a role equivalente ao Owner do Azure no GCP?"
//   node agente.mjs                          (modo conversa)
//   node agente.mjs --servidor ../mcp/dist/server.mjs "..."   (pacote local)
//   node agente.mjs --estrito "..."          (sai != 0 se citar nome inexistente)
//
// Precisa de ANTHROPIC_API_KEY no ambiente.

import Anthropic from '@anthropic-ai/sdk'
import readline from 'node:readline/promises'
import { conectar, ferramentasParaModelo, instrucoesDoServidor } from './lib/mcp.mjs'
import { conversar, modeloAnthropic, SISTEMA_BASE } from './lib/loop.mjs'
import { formatarAviso } from './lib/guardrail.mjs'

const MODELO_PADRAO = 'claude-sonnet-5'

const args = process.argv.slice(2)
const opt = (nome) => {
  const i = args.indexOf(nome)
  if (i === -1) return null
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const flag = (nome) => {
  const i = args.indexOf(nome)
  if (i === -1) return false
  args.splice(i, 1)
  return true
}

const servidor = opt('--servidor')
const modeloId = opt('--modelo') ?? process.env.IAMSCOPE_MODELO ?? MODELO_PADRAO
const estrito = flag('--estrito')
const verboso = flag('--verboso')
const pergunta = args.join(' ').trim()

const cinza = (s) => `\x1b[90m${s}\x1b[0m`
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n  Falta ANTHROPIC_API_KEY no ambiente.\n')
  console.error('  PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."')
  console.error('  bash:        export ANTHROPIC_API_KEY=sk-ant-...\n')
  process.exit(2)
}

console.error(cinza(servidor ? `  subindo ${servidor}...` : '  subindo iamscope-mcp (npx)...'))

let client
try {
  client = await conectar({ servidor, silencioso: !verboso })
} catch (e) {
  console.error(vermelho('\n  O servidor MCP nao subiu.\n'))
  console.error(`  ${e instanceof Error ? e.message : e}\n`)
  console.error('  Se estiver usando --servidor, confira que o dist/ existe (npm run build em mcp/).')
  console.error('  Sem --servidor, o npx precisa de rede no primeiro arranque.\n')
  process.exit(2)
}

const ferramentas = await ferramentasParaModelo(client)

// As instrucoes do SERVIDOR vem primeiro: e la que mora a regra do guardrail e o
// aviso sobre campos de curadoria. O prompt local so acrescenta o que e do
// agente (idioma, crase, formato).
const instrucoes = instrucoesDoServidor(client)
const sistema = [instrucoes, SISTEMA_BASE].filter(Boolean).join('\n\n')

const anthropic = new Anthropic()
const modelo = modeloAnthropic(anthropic, { model: modeloId })

console.error(cinza(`  ${ferramentas.length} ferramentas · modelo ${modeloId}`))

// Dois desfechos ruins, e eles NAO sao a mesma coisa:
//
//   falhou  = o comando nao fez o trabalho (modelo recusou, laco estourou).
//             Sempre sai != 0 — senao um script a montante trata erro como
//             sucesso, que e a pior forma de falhar.
//   sujo    = o trabalho foi feito, mas a resposta citou nome inexistente.
//             So derruba o codigo de saida com --estrito, porque o texto ainda
//             pode ser util para quem esta lendo com o aviso na frente.
let falhou = false
let sujo = false

async function responder(texto) {
  const inicio = Date.now()
  let r
  try {
    r = await conversar({
      client,
      modelo,
      ferramentas,
      pergunta: texto,
      sistema,
      aoVivo: (ev) => {
        if (ev.tipo === 'ferramenta') {
          const arg = JSON.stringify(ev.argumentos)
          console.error(cinza(`  · ${ev.nome} ${arg.length > 90 ? arg.slice(0, 90) + '…' : arg}`))
        }
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    falhou = true
    console.error(vermelho(`\n  A chamada ao modelo falhou: ${msg}\n`))
    if (/model/i.test(msg)) {
      console.error(`  Se for id de modelo invalido, passe outro: --modelo <id>`)
      console.error(`  A lista atual esta em https://platform.claude.com/docs/en/models/overview\n`)
    }
    return false
  }

  if (r.estourou) {
    falhou = true
    console.error(vermelho(`\n  Parei em ${r.voltas} voltas de ferramenta sem o modelo concluir.`))
    console.error('  Devolver a conversa truncada como resposta seria pior. Refaca a pergunta mais estreita.\n')
    return false
  }

  console.log('\n' + r.texto + '\n')

  const aviso = formatarAviso(r.conferencia)
  if (aviso) console.error(amarelo(aviso))

  const seg = ((Date.now() - inicio) / 1000).toFixed(1)
  const verif = r.conferencia.deFerramenta.length
  console.error(cinza(`  ${r.chamadas.length} chamada(s) · ${r.voltas} volta(s) · ${seg}s` +
    (verif ? ` · ${verif} identificador(es) conferido(s)` : '')))

  if (!r.conferencia.limpo) sujo = true
  return r.conferencia.limpo
}

if (pergunta) {
  await responder(pergunta)
} else {
  console.error(cinza('  modo conversa — linha vazia ou Ctrl+C para sair\n'))
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    for (;;) {
      const q = (await rl.question('> ')).trim()
      if (!q) break
      await responder(q)
    }
  } catch { /* Ctrl+C */ }
  rl.close()
}

await client.close()
if (falhou) process.exit(1)
process.exit(estrito && sujo ? 1 : 0)
