// runtime.ts — o que faz o código do site rodar em Node sem ser reescrito.
//
// O PROBLEMA
//   As funções puras do IAM Scope são de navegador por acidente, não por
//   desenho: `awsActions.ts` e `gcpPermissions.ts` buscam seus índices com
//   `fetch('/aws-actions-index.json')`. Em Node isso não é "lento", é
//   `TypeError: Failed to parse URL` — caminho absoluto sem origem.
//
//   Reimplementar os dois carregadores aqui seria o começo do fim: duas cópias
//   da mesma inversão de índice, uma delas envelhecendo em silêncio. O que a
//   busca de AWS devolve tem de ser o que o site devolve, ou o pacote vira um
//   segundo catálogo com o mesmo nome.
//
// A SAÍDA
//   Um `fetch` global que intercepta SÓ caminhos que começam com `/` e os
//   resolve contra a pasta `data/` embutida no pacote. Qualquer outra URL cai
//   no fetch de verdade — mas nada aqui chama uma, e é assim que fica: ver o
//   teste `nenhuma-rede` em scripts/smoke.mjs.
//
//   O código do site continua byte a byte o mesmo. Um `git diff` contra
//   src/lib/ do repositório tem de sair vazio; quando não sair, foi alguém
//   editando o vendor em vez de corrigir o original.

import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/**
 * Onde os índices vivem depois do bundle.
 *
 * dist/ e data/ são irmãos no pacote publicado, então `../data` a partir de
 * dist/ chega lá. Em desenvolvimento (tsx/ts-node sobre src/) o caminho é o
 * mesmo, porque src/ também é irmão de data/.
 *
 * `IAMSCOPE_MCP_DATA_DIR` é a exceção, e existe para o contador de estatísticas:
 * ele é bundlado para uma pasta temporária FORA do pacote, então não tem
 * `../data` embaixo dele. Ver scripts/gen-stats.mjs. Nada no caminho normal do
 * servidor define esta variável.
 */
const DATA_DIR = process.env.IAMSCOPE_MCP_DATA_DIR
  ? path.resolve(process.env.IAMSCOPE_MCP_DATA_DIR)
  : path.resolve(HERE, '..', 'data')

/** Os únicos caminhos que o catálogo pede. Lista fechada, de propósito. */
const SERVED = new Set(['/aws-actions-index.json', '/gcp-perms-index.json'])

let installed = false

/**
 * Resposta mínima. Os dois consumidores usam `.ok`, `.status` e `.json()` —
 * nada mais. Um objeto de 4 campos é mais honesto aqui do que um `Response`
 * completo que sugeriria que houve HTTP.
 */
function localResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body },
    async text() { return JSON.stringify(body) },
  }
}

/** Onde os indices embutidos vivem. O azure.ts le direto daqui, sem passar pelo shim. */
export function dataDir(): string { return DATA_DIR }

export function installLocalFetch(): void {
  if (installed) return
  installed = true

  const upstream = globalThis.fetch

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : String(input?.url ?? input)

    if (url.startsWith('/')) {
      if (!SERVED.has(url)) {
        // Falhar alto. Um índice novo no site que ninguém embutiu aqui tem de
        // parar o servidor, não devolver lista vazia — que a busca leria como
        // "não achei nada", a pior mentira que este pacote pode contar.
        throw new Error(
          `iamscope-mcp: o catálogo pediu "${url}", que não está embutido no pacote. ` +
          `Índices disponíveis: ${[...SERVED].join(', ')}. ` +
          `Se o site ganhou um índice novo, ele precisa entrar em data/ e em SERVED.`,
        )
      }
      const file = path.join(DATA_DIR, path.basename(url))
      try {
        return localResponse(JSON.parse(await readFile(file, 'utf8')))
      } catch (e) {
        throw new Error(
          `iamscope-mcp: falha ao ler o índice embutido ${file}. ` +
          `O pacote está incompleto — reinstale. (${e instanceof Error ? e.message : e})`,
        )
      }
    }

    if (!upstream) throw new Error('iamscope-mcp: fetch indisponível neste Node.')
    return upstream(input, init)
  }
}

/** Versão do pacote, lida do próprio package.json — nunca escrita à mão. */
export function packageVersion(): string {
  try {
    const require = createRequire(import.meta.url)
    return require(path.resolve(HERE, '..', 'package.json')).version as string
  } catch {
    return '0.0.0'
  }
}
