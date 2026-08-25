// gen-stats.mjs — as contagens saem do dado, nunca da mão.
//
// POR QUE ISTO EXISTE
//   Este projeto já perdeu duas frases para número escrito à mão: a página do
//   Role Advisor anunciava "mais de 1.700 roles" quando o índice tinha 4.603, e
//   a /info dizia "926 roles built-in do Azure" — número de um dataset que
//   virou 504 em julho. Os dois passaram meses no ar.
//
//   Enquanto eu montava este pacote, a mesma coisa quase aconteceu de novo: eu
//   escrevi "4.603 roles" e "32 mil permissões" nas descrições das ferramentas,
//   copiando de memória. Os números reais, medidos, são 4.640 e 30.865 — a AWS
//   subiu de 1.553 para 1.582 e o GCP de 2.381 para 2.389 desde que aquele
//   número foi anotado.
//
//   Uma descrição de ferramenta é lida pelo modelo antes de toda decisão de
//   chamada. Número errado ali não é cosmético: é o modelo dizendo ao usuário
//   quantas roles o catálogo tem, com a autoridade de quem consultou a fonte.
//
//   Então a contagem é gerada. `npm run build` roda isto antes de bundlar, e
//   src/catalogStats.ts é artefato, não código.

import * as esbuild from 'esbuild'
import { writeFile, readFile, rm, mkdtemp } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// O CONTADOR NÃO ESCREVE NADA DENTRO DO PACOTE.
//
// A primeira versão gravava `src/_count.ts` e `.stats-tmp/` aqui dentro e os
// apagava num `finally`. Funciona — até o `finally` não conseguir apagar. Num
// mount onde `unlink` é bloqueado os dois ficaram para trás: um `.ts` solto em
// `src/`, que entraria no próximo `git add`, e uma pasta órfã.
//
// Lixo que só some se a limpeza der certo é lixo. Agora o fonte do contador vai
// por `stdin` do esbuild (nunca vira arquivo) e o bundle sai na pasta temporária
// do sistema. O único arquivo que este script produz é `src/catalogStats.ts`,
// que é o resultado — não sobra.

const COUNTER = `
import { ROLES } from '@/data/roles'
import { AZURE_ROLES } from '@/data/azureRbac'
import { AWS_POLICIES } from '@/data/aws'
import { GCP_ROLES } from '@/data/gcp'
import { GWS_ROLES } from '@/data/googleWorkspace'
import { IBM_ROLES } from '@/data/ibmCloud'
import { SOD_RULES } from '@/lib/sod'
import { ensureLocalPermissionIndex, getLocalIndexStats } from '@/lib/permissionScope'
import equivalences from '@/data/compare/equivalences.json'
import { installLocalFetch } from './runtime'

installLocalFetch()
const rolesByPlatform = {
  entraId: ROLES.length, azureRbac: AZURE_ROLES.length, aws: AWS_POLICIES.length,
  gcp: GCP_ROLES.length, googleWorkspace: GWS_ROLES.length, ibmCloud: IBM_ROLES.length,
}
await ensureLocalPermissionIndex()
const permissionsByCloud = getLocalIndexStats()
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0)
process.stdout.write(JSON.stringify({
  rolesByPlatform,
  roles: sum(rolesByPlatform),
  permissionsByCloud,
  permissions: sum(permissionsByCloud),
  sodRules: SOD_RULES.length,
  equivalences: equivalences.length,
}))
`

const TMP = await mkdtemp(path.join(tmpdir(), 'iamscope-stats-'))

try {
  await esbuild.build({
    // stdin em vez de entryPoints: o fonte do contador nunca toca o disco do pacote.
    // resolveDir aponta para src/, que é como `./runtime` e os aliases resolvem.
    stdin: { contents: COUNTER, resolveDir: path.join(ROOT, 'src'), sourcefile: '_count.ts', loader: 'ts' },
    outdir: TMP,
    outExtension: { '.js': '.mjs' },
    bundle: true, splitting: true, format: 'esm', platform: 'node', target: 'node18',
    alias: { '@/lib': path.join(ROOT, '..', 'src/lib'), '@/data': path.join(ROOT, '..', 'src/data') },
    external: ['zod'],
    logLevel: 'error',
  })

  // Rodando de fora do pacote, o contador não tem `../data` embaixo dele — então
  // o caminho vai explícito por env. Ver IAMSCOPE_MCP_DATA_DIR em src/runtime.ts.
  // O esbuild nomeia a saída de um stdin como `stdin.mjs`.
  const raw = execFileSync(process.execPath, [path.join(TMP, 'stdin.mjs')], {
    encoding: 'utf8',
    env: { ...process.env, IAMSCOPE_MCP_DATA_DIR: path.join(ROOT, '..', 'public') },
  })
  const stats = JSON.parse(raw)

  const br = (n) => n.toLocaleString('pt-BR')
  await writeFile(path.join(ROOT, 'src/catalogStats.ts'), `// GERADO por scripts/gen-stats.mjs — não editar à mão.
// Rode \`npm run build\` depois de qualquer coleta que altere os datasets.

export const CATALOG_STATS = ${JSON.stringify(stats, null, 2)} as const

/** Formatados em pt-BR, para entrar em descrição de ferramenta sem virar "4640". */
export const CATALOG_TEXT = {
  roles: '${br(stats.roles)}',
  permissions: '${br(stats.permissions)}',
  sodRules: '${br(stats.sodRules)}',
  equivalences: '${br(stats.equivalences)}',
} as const
`)

  // O README declara os mesmos números. Um README que mente sobre o tamanho do
  // catálogo é a versão publicada do "mais de 1.700 roles" — então ele é conferido
  // aqui, contra o dado, e o build para se divergir.
  const readmePath = path.join(ROOT, 'README.md')
  const readme = await readFile(readmePath, 'utf8').catch(() => null)
  if (readme) {
    const esperado = [
      [`**${br(stats.roles)} roles**`, 'total de roles'],
      [`**${br(stats.permissions)} permissões**`, 'total de permissões'],
      [`**${br(stats.sodRules)} regras`, 'regras de SoD'],
      [`**${br(stats.equivalences)} equivalências`, 'equivalências'],
      ...Object.entries(stats.rolesByPlatform).map(([k, v]) => [`| ${br(v)} |`, `contagem de ${k}`]),
    ]
    const faltando = esperado.filter(([frag]) => !readme.includes(frag))
    if (faltando.length) {
      console.error('\nREADME desatualizado — estes números não batem com o dado:')
      for (const [frag, what] of faltando) console.error(`  ${what}: esperava encontrar "${frag}"`)
      console.error('\nCorrija o README.md e rode de novo.\n')
      process.exit(1)
    }
  }

  console.log(`catálogo medido: ${br(stats.roles)} roles · ${br(stats.permissions)} permissões · ${stats.sodRules} regras SoD · ${stats.equivalences} equivalências`)
  console.log(`  por plataforma: ${Object.entries(stats.rolesByPlatform).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
} finally {
  // A pasta é do sistema, fora do pacote. Se a remoção falhar, o SO limpa depois
  // — e nada ficou no repositório de qualquer jeito.
  await rm(TMP, { recursive: true, force: true }).catch(() => {})
}
