'use strict'
/**
 * Carrega um módulo TypeScript do projeto dentro do Node, para scripts que
 * precisam ler src/data/ sem depender do Next.
 *
 * POR QUE NÃO BASTA TRANSPILAR O ARQUIVO PEDIDO
 *   A primeira versão transpilava só o arquivo alvo e o compilava como
 *   CommonJS. Funcionou enquanto os arquivos de dados eram autocontidos.
 *   Quando os TIER_META saíram para src/data/tierMeta.ts, roles.ts passou a
 *   ter `export { EAM_META } from './tierMeta'` — que vira um require('./tierMeta')
 *   que o Node não resolve, porque a extensão é .ts:
 *
 *     Error: Cannot find module './tierMeta'
 *
 *   A correção é registrar um handler em require.extensions para '.ts'/'.tsx'.
 *   Aí qualquer import aninhado é transpilado sob demanda, em cadeia, e o
 *   alias '@/' também passa a funcionar.
 */
const fs = require('fs')
const path = require('path')
const Module = require('module')

const ROOT = path.join(__dirname, '..', '..')
const { transform } = require(path.join(ROOT, 'node_modules', 'sucrase'))

let registered = false

function register() {
  if (registered) return
  registered = true

  for (const ext of ['.ts', '.tsx']) {
    require.extensions[ext] = (module, filename) => {
      const src = fs.readFileSync(filename, 'utf8')
      const { code } = transform(src, {
        transforms: ['typescript', 'imports', 'jsx'],
        filePath: filename,
      })
      module._compile(code, filename)
    }
  }

  // Resolve o alias '@/' do tsconfig para src/, como o Next faz.
  const originalResolve = Module._resolveFilename
  Module._resolveFilename = function (request, ...rest) {
    if (request.startsWith('@/')) {
      request = path.join(ROOT, 'src', request.slice(2))
    }
    return originalResolve.call(this, request, ...rest)
  }
}

/**
 * @param {string} relPath caminho a partir da raiz do repo, ex.: 'src/data/roles.ts'
 */
function loadTs(relPath) {
  register()
  const abs = path.join(ROOT, relPath)
  delete require.cache[require.resolve(abs)]
  return require(abs)
}

module.exports = { loadTs, ROOT }
