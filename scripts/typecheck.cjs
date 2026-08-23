#!/usr/bin/env node
/**
 * Type-check completo do projeto (equivalente ao passo "Linting and checking
 * validity of types" do `next build`), rodando o compilador direto pela API do
 * TypeScript em vez do binário .bin/tsc.
 *
 * Por que existe:
 *   - `npx tsc` falha em ambientes onde node_modules foi instalado em outro SO
 *     (o shim em node_modules/.bin aponta para node.exe);
 *   - chamar tsc.js diretamente contorna isso e funciona em qualquer plataforma;
 *   - `scripts/check-syntax.cjs` só valida sintaxe e escopo — NÃO pega erro de
 *     tipo. Foi assim que um resquício de import removido passou batido e só
 *     apareceu no `npm run build`.
 *
 * Uso:
 *   node scripts/typecheck.cjs
 *
 * Sai com código 1 se houver qualquer erro de tipo.
 */
const path = require('path')
const ts = require(path.join(__dirname, '..', 'node_modules', 'typescript'))

const projectDir = path.join(__dirname, '..')
const configPath = path.join(projectDir, 'tsconfig.json')

const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
if (configFile.error) {
  console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))
  process.exitCode = 1
  return
}

const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectDir)

// `incremental` do tsconfig exige tsBuildInfoFile quando não há emit — como
// aqui é só checagem, o modo incremental é desligado.
const options = { ...parsed.options, noEmit: true }
delete options.incremental
delete options.tsBuildInfoFile
delete options.composite

const program = ts.createProgram({ rootNames: parsed.fileNames, options })

const diagnostics = ts.getPreEmitDiagnostics(program)

if (diagnostics.length === 0) {
  console.log(`OK — ${parsed.fileNames.length} arquivo(s) sem erro de tipo.`)
} else {
  const fmt = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => projectDir,
    getNewLine: () => '\n',
  })
  console.error(fmt)
  console.error(`\n${diagnostics.length} erro(s) de tipo.`)
  process.exitCode = 1
}
