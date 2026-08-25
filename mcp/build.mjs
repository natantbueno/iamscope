// build.mjs — TypeScript do site → um bundle Node, sem tocar no código do site.
//
// ESM com code splitting, e não um arquivo só, de propósito:
//   roleAdvisor, permissionScope e evaluateCatalog já carregam os datasets
//   pesados por `await import()` — é como o site evita pagar 4 MB no First
//   Load. Achatar tudo num bundle único jogaria esse desenho fora e faria todo
//   `npx iamscope-mcp` parsear os 4 MB antes de responder "pronto".
//
//   Com --splitting o esbuild preserva os pontos de import dinâmico: o
//   servidor sobe lendo alguns KB e o dataset da AWS só entra em memória
//   quando alguém pergunta sobre a AWS.
//
// O que fica FORA do bundle: as dependências de runtime (@modelcontextprotocol/sdk,
// zod). Elas vêm do node_modules de quem instala, como qualquer pacote npm.

import * as esbuild from 'esbuild'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, writeFile, rm, mkdir, readdir, stat, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, e NÃO `new URL(...).pathname`.
//
// No Linux os dois dão a mesma string e o erro passa despercebido. No Windows,
// `import.meta.url` é `file:///F:/proj/build.mjs` e `.pathname` devolve
// `/F:/proj/build.mjs` — com barra na frente. O `path.join` seguinte então
// produz `\F:\proj\scripts\gen-stats.mjs`, que o Node resolve contra a raiz
// da unidade atual e vira `F:\F:\proj\...`. O build morre com MODULE_NOT_FOUND
// apontando para um caminho com a letra da unidade duplicada.
//
// Todo derivar-caminho-do-próprio-módulo neste pacote usa fileURLToPath.
const ROOT = path.dirname(fileURLToPath(import.meta.url))

// PRE-VOO: este pacote so se constroi de DENTRO do repositorio do site.
//
// Ele le src/lib, src/data e public/ de `../`. Sem essa checagem, a primeira coisa
// a falhar seria o gen-stats la dentro, e o erro chegaria como um stack de
// execFileSync — que nao diz a unica coisa que a pessoa precisa saber.
{
  const exigidos = [
    ['../src/lib/roleAdvisor.ts', 'as funcoes puras do site'],
    ['../src/data/roles.ts', 'os datasets do catalogo'],
    ['../public/aws-actions-index.json', 'os indices de permissao'],
  ]
  const faltando = exigidos.filter(([rel]) => !existsSync(path.join(ROOT, rel)))
  if (faltando.length) {
    console.error('\nEste pacote precisa estar dentro do repositorio do IAM Scope.')
    console.error('Ele nao carrega copia propria do catalogo: le src/ e public/ de ../.\n')
    for (const [rel, oque] of faltando) console.error(`  faltando: ${rel}  (${oque})`)
    console.error('\nEsperado: <repo>/mcp/  — o pacote e uma pasta do repositorio, nao um projeto solto.\n')
    process.exit(1)
  }
}

// As contagens saem do dado antes de o dado ser bundlado. Ver scripts/gen-stats.mjs
// para os dois números que já envelheceram no ar neste projeto.
execFileSync(process.execPath, [path.join(ROOT, 'scripts/gen-stats.mjs')], { stdio: 'inherit' })

await rm(path.join(ROOT, 'dist'), { recursive: true, force: true })
await mkdir(path.join(ROOT, 'dist'), { recursive: true })

// data/ e MATERIALIZADO pelo build, nao versionado.
//
// Os dois indices sao byte a byte identicos a public/ do site. Versionar a copia
// seria 2 MB em todo clone para um arquivo que ja esta ali do lado. Mas o pacote
// publicado no npm PRECISA carrega-los — quem instala nao tem o repo. Entao eles
// entram aqui no build, e `files` do package.json os leva para o tarball.
const DATA_OUT = path.join(ROOT, 'data')
await mkdir(DATA_OUT, { recursive: true })
for (const nome of ['aws-actions-index.json', 'gcp-perms-index.json']) {
  const origem = path.join(ROOT, '..', 'public', nome)
  try {
    await copyFile(origem, path.join(DATA_OUT, nome))
  } catch (e) {
    console.error(`\nNao achei ${origem}.`)
    console.error('Este pacote precisa estar dentro do repositorio do site: ele le src/ e public/ de ../.')
    throw e
  }
}
console.log(`data/ materializado de ../public (2 indices)`)

const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/server.ts')],
  outdir: path.join(ROOT, 'dist'),
  outExtension: { '.js': '.mjs' },
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  // O codigo do site importa por '@/...'. O alias aponta para o src/ DO PROPRIO
  // REPOSITORIO, um nivel acima — este pacote mora dentro do repo do site.
  //
  // Ate 25/08 havia uma copia em src/vendor-lib e src/vendor-data, e um
  // scripts/check-vendor.mjs comparando as duas por sha256. A copia existia de
  // quando o pacote era pasta solta. Dentro do repo ela custava 3,3 MB em todo
  // clone e criava um espelho que alguem podia editar do lado errado — e o
  // checador so avisava DEPOIS. Sem copia nao ha o que divergir.
  alias: {
    '@/lib': path.join(ROOT, '..', 'src/lib'),
    '@/data': path.join(ROOT, '..', 'src/data'),
  },
  external: ['@modelcontextprotocol/sdk', '@modelcontextprotocol/sdk/*', 'zod'],
  banner: { js: '// iamscope-mcp — gerado por build.mjs. Não editar; edite src/ e rode `npm run build`.' },
  minify: true,
  legalComments: 'none',
  logLevel: 'info',
  metafile: true,
})

// O shebang some no minify. Sem ele o `bin` do npm não roda direto no Unix.
const entry = path.join(ROOT, 'dist/server.mjs')
const js = await readFile(entry, 'utf8')
if (!js.startsWith('#!')) await writeFile(entry, `#!/usr/bin/env node\n${js}`)

// Peso do que vai para o npm. Um pacote de MCP que passa de alguns MB é um
// pacote que ninguém instala duas vezes — o número precisa estar à vista.
async function dirSize(dir) {
  let total = 0
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name)
    total += f.isDirectory() ? await dirSize(p) : (await stat(p)).size
  }
  return total
}
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'
const distSize = await dirSize(path.join(ROOT, 'dist'))
const dataSize = await dirSize(path.join(ROOT, 'data'))
console.log(`\ndist/ ${mb(distSize)}  ·  data/ ${mb(dataSize)}  ·  total ${mb(distSize + dataSize)}`)

const chunks = Object.entries(result.metafile.outputs)
  .sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 6)
console.log('maiores chunks:')
for (const [name, o] of chunks) console.log(`  ${path.basename(name).padEnd(28)} ${mb(o.bytes)}`)
