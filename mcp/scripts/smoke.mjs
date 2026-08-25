// smoke.mjs — sobe o servidor de verdade, por stdio, e conversa MCP com ele.
//
// Não testa as funções puras: elas já são testadas no site. Testa o que só
// existe aqui — o shim de fetch, o envelope, e os três lugares onde um nome
// inventado tinha como virar um atestado falso.
//
// Roda no `prepublishOnly`. Um pacote que publica sem isto é um pacote que
// publica um guardrail quebrado sem ninguém perceber.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`) }
}

const call = async (client, name, args) => {
  const r = await client.callTool({ name, arguments: args })
  return JSON.parse(r.content[0].text)
}

// ── Subir o servidor ─────────────────────────────────────────────────────────
//
// O CAMINHO INFELIZ AQUI E O MAIS COMUM, E ELE PRECISA SER LEGIVEL.
//
// `dist/` e `data/` sao saida de build e nao sao versionados. Quem clona o
// repositorio e roda `npm run smoke` direto cai neles ausentes — e o SDK do MCP
// reporta isso como `McpError -32000: Connection closed`, com um stack de dentro
// do proprio SDK. A causa verdadeira (o processo filho morreu com
// MODULE_NOT_FOUND) fica invisivel, porque o stderr do filho estava sendo
// descartado.
//
// Custou uma rodada. Entao: confere antes, e se ainda assim falhar, MOSTRA o que
// o servidor escreveu antes de morrer.
const SERVIDOR = path.join(ROOT, 'dist/server.mjs')
{
  const { access } = await import('node:fs/promises')
  try {
    await access(SERVIDOR)
  } catch {
    console.error('\n  Nao achei dist/server.mjs.\n')
    console.error('  dist/ e data/ sao saida de build e nao entram no git — por desenho.')
    console.error('  Rode o build antes:\n')
    console.error('      npm run build\n')
    process.exit(2)
  }
}

// dist/ VELHO e pior que dist/ ausente: o smoke passa verde testando o codigo
// de ontem. E o mesmo falso verde do tsbuildinfo e do stage servindo copia velha
// — neste projeto ja custou um build inteiro. Entao: se qualquer fonte for mais
// nova que o bundle, para.
{
  const { stat, readdir } = await import('node:fs/promises')
  const bundle = (await stat(SERVIDOR)).mtimeMs
  const fontes = [
    ...(await readdir(path.join(ROOT, 'src'))).map((f) => path.join('src', f)),
    'build.mjs', 'scripts/gen-stats.mjs', 'package.json',
  ]
  const novas = []
  for (const rel of fontes) {
    try {
      if ((await stat(path.join(ROOT, rel))).mtimeMs > bundle + 1000) novas.push(rel)
    } catch { /* opcional */ }
  }
  if (novas.length) {
    console.error('\n  dist/ esta mais velho que o fonte — este smoke testaria codigo desatualizado.\n')
    console.error('  Mudou depois do ultimo build:')
    for (const f of novas) console.error('    ' + f)
    console.error('\n  Rode `npm run build` e repita.\n')
    process.exit(2)
  }
}

const client = new Client({ name: 'smoke', version: '1.0.0' })
const transporte = new StdioClientTransport({
  command: process.execPath,
  args: [SERVIDOR],
  stderr: 'pipe',
})
let stderrServidor = ''
transporte.stderr?.on('data', (d) => { stderrServidor += d.toString() })
try {
  await client.connect(transporte)
} catch (e) {
  console.error('\n  O servidor nao subiu.\n')
  if (stderrServidor.trim()) {
    console.error('  O que ele escreveu antes de morrer:')
    console.error(stderrServidor.trim().split('\n').map((l) => '    ' + l).join('\n'))
  } else {
    console.error(`  Ele nao escreveu nada. Erro do cliente: ${e instanceof Error ? e.message : e}`)
  }
  console.error('\n  Se a mensagem falar em data/ ou em indice ausente, rode `npm run build`.\n')
  process.exit(2)
}

console.log('\n── protocolo ──')
const { tools } = await client.listTools()
ok('7 ferramentas registradas', tools.length === 7, `veio ${tools.length}`)
const { resources } = await client.listResources()
ok('2 recursos registrados', resources.length === 2, `veio ${resources.length}`)

console.log('\n── o guardrail: roles/bigquery.readOnly ──')
// O nome canônico da alucinação. Plausível, e não existe.
const v = await call(client, 'verify_role_names', { names: ['roles/bigquery.readOnly', 'roles/bigquery.dataViewer', 'Global Administrator'] })
const byName = Object.fromEntries(v.results.map((r) => [r.query, r]))
ok('roles/bigquery.readOnly → NOT_IN_CATALOG', byName['roles/bigquery.readOnly'].verdict === 'NOT_IN_CATALOG')
ok('roles/bigquery.dataViewer → IN_CATALOG pelo id nativo',
   byName['roles/bigquery.dataViewer'].verdict === 'IN_CATALOG' && byName['roles/bigquery.dataViewer'].matchedAs === 'nativeId',
   JSON.stringify(byName['roles/bigquery.dataViewer']).slice(0, 160))
ok('Global Administrator → IN_CATALOG pelo nome', byName['Global Administrator'].verdict === 'IN_CATALOG')
ok('a negativa vem com pistas, não com substituto', byName['roles/bigquery.readOnly'].didYouMean.length > 0)
ok('a nota manda não citar', /não os cite/i.test(v.note))

console.log('\n── nome inventado não vira "sem conflitos" ──')
const c = await call(client, 'find_role_conflicts', { role: 'roles/bigquery.readOnly', platform: 'gcp' })
ok('find_role_conflicts devolve ERRO, não lista vazia', c.error === 'ROLE_NOT_IN_CATALOG', JSON.stringify(c).slice(0, 200))
ok('e diz explicitamente para não concluir "sem conflitos"', /Não conclua/i.test(c.message))

const e = await call(client, 'evaluate_user_roles', { roles: ['Papel Que Nao Existe', 'Outro Inventado'] })
ok('evaluate_user_roles não devolve "approved" sobre nada', e.riskLevel === 'INDETERMINATE', `veio ${e.riskLevel}`)
ok('e lista o que não resolveu', e.rolesNotFound.length === 2)

const mixed = await call(client, 'evaluate_user_roles', { roles: ['Global Administrator', 'Papel Que Nao Existe'] })
ok('lista parcial marca que o veredito é parcial', mixed.verdictCoversOnlyResolvedRoles === true)

console.log('\n── conflito real de SoD ──')
const real = await call(client, 'evaluate_user_roles', { roles: ['Global Administrator', 'Privileged Role Administrator'], scope: 'entra-id' })
ok('duas roles Tier 0 do Entra resolvem', real.matchedRoles.length === 2, JSON.stringify(real.matchedRoles))
ok('e o veredito não é INDETERMINATE', real.riskLevel !== 'INDETERMINATE', real.riskLevel)

console.log('\n── busca: as consultas de referência ──')
const q1 = await call(client, 'search_roles', { query: 'resetar senha, não quero global admin', limit: 3 })
const n1 = q1.results.map((r) => r.name)
ok('"resetar senha, não quero global admin" NÃO devolve Global Administrator',
   !n1.includes('Global Administrator'), n1.join(' | '))
ok('  → o topo é Password Administrator', n1[0] === 'Password Administrator', n1.join(' | '))

const q2 = await call(client, 'search_roles', { query: 'kubernetes sem billing', limit: 3 })
ok('"kubernetes sem billing" não devolve role de billing',
   !q2.results.some((r) => /billing/i.test(r.name)), q2.results.map((r) => r.name).join(' | '))

const q3 = await call(client, 'search_roles', { query: 'rodar terraform no meu ambiente', limit: 3 })
ok('"terraform no meu ambiente" — o "no" português não corta o resultado',
   q3.results.length >= 3, `${q3.results.length} resultados`)

const q4 = await call(client, 'search_roles', { query: 'asdfghjkl' })
ok('lixo devolve zero, não trinta', q4.results.length === 0, `${q4.results.length}`)
ok('e o plan diz o que não casou', q4.plan.unmatched.length > 0)

console.log('\n── permissões: o shim de fetch está servindo os índices ──')
const p = await call(client, 'search_permissions', { permission: 'iam:CreateUser' })
ok('iam:CreateUser tem resultados (índice AWS embutido carregou)', p.totalMatches > 0, `${p.totalMatches}`)
ok('AdministratorAccess aparece via wildcard',
   p.matches.some((m) => m.viaWildcard && m.grantedBy.some((g) => g.name === 'AdministratorAccess')),
   JSON.stringify(p.matches.slice(0, 2)).slice(0, 200))

const g = await call(client, 'search_permissions', { permission: 'storage.buckets.delete' })
ok('storage.buckets.delete tem resultados (índice GCP embutido carregou)',
   g.matches.some((m) => m.cloud === 'gcp'), `${g.totalMatches}`)

console.log('\n── equivalências: a pergunta que só seis nuvens respondem ──')
const eq = await call(client, 'compare_equivalent_roles', { query: 'Global Administrator' })
ok('"Global Administrator" mapeia', eq.matches?.length > 0, JSON.stringify(eq).slice(0, 200))
const clouds = Object.keys(eq.matches[0].clouds)
ok('  → e devolve as seis nuvens', clouds.length === 6, clouds.join(','))
ok('  → com o equivalente do GCP nomeado', !!eq.matches[0].clouds.gcp?.role, JSON.stringify(eq.matches[0].clouds.gcp).slice(0, 120))
ok('  → e a ressalva de que equivalência não é identidade', /não são\s*\n?\s*isomórficos|isomórficos/.test(eq.caveat))

const eqNo = await call(client, 'compare_equivalent_roles', { query: 'zzz função inexistente' })
ok('função não mapeada não é inventada', eqNo.error === 'NO_EQUIVALENCE_MAPPED')

console.log('\n── envelope: classificação e atribuição em toda resposta ──')
for (const [name, res] of [['search_roles', q1], ['find_role_conflicts', c], ['compare_equivalent_roles', eq], ['search_permissions', p]]) {
  ok(`${name} carrega o envelope`, res._iamscope?.source === 'iamscope-mcp')
}
ok('editorialFields nomeia os campos de curadoria', q1._iamscope.classification.editorialFields.includes('tier'))
ok('a licença da curadoria é CC BY 4.0', q1._iamscope.license.curation === 'CC-BY-4.0')
ok('o guardrail viaja no envelope', /verify_role_names/.test(q1._iamscope.guardrail))

const entra = await call(client, 'search_roles', { query: 'senha', platform: 'entraId', limit: 2 })
const attrib = entra._iamscope.attribution.map((a) => a.source)
ok('resposta de Entra ID carrega EntraOps', attrib.includes('AzurePrivilegedIAM / EntraOps'), attrib.join(' | '))
ok('resposta de Entra ID carrega merill/microsoft-info', attrib.includes('merill/microsoft-info'), attrib.join(' | '))

console.log('\n── recursos ──')
const lic = JSON.parse((await client.readResource({ uri: 'iamscope://license' })).contents[0].text)
ok('o recurso de licença traz as duas licenças MIT', lic.thirdParty.length === 2)
const tiers = JSON.parse((await client.readResource({ uri: 'iamscope://tiers' })).contents[0].text)
ok('o recurso de tiers se declara editorial', tiers.classification === 'iamscope-editorial')
ok('  → e cobre as seis escadas + EAM',
   ['eam', 'gcp', 'aws', 'azureRbac', 'googleWorkspace', 'ibmCloud'].every((k) => k in tiers))

console.log('\n── avaliação de JSON ──')
const ev = await call(client, 'evaluate_role_json', {
  json: JSON.stringify({ displayName: 'Global Administrator', id: '62e90394-69f5-4237-9190-012177145e10' }),
})
ok('JSON de role do Entra é detectado e casado', ev.cloud === 'entraId' && ev.matchedInCatalog === true, JSON.stringify(ev).slice(0, 200))
const evBad = await call(client, 'evaluate_role_json', { json: '{ isso não é json' })
ok('JSON inválido devolve erro legível', !!evBad.error)

console.log('\n── os campos das regras existem de verdade ──')
// Este bloco existe porque o smoke passou verde uma vez com `title: undefined`
// em toda regra: eu tinha inventado o nome do campo, e "a chave está lá" não é
// a mesma pergunta que "a chave tem valor". Quem pegou foi o tsc, não o teste.
const rc = await call(client, 'find_role_conflicts', { role: 'Global Administrator', platform: 'entra-id' })
ok('Global Administrator tem conflitos catalogados', rc.conflictsFound > 0, `${rc.conflictsFound}`)
const c0 = rc.conflicts[0]
for (const f of ['id', 'name', 'description', 'severity', 'category', 'rationale', 'risk', 'mitigation', 'frameworks']) {
  ok(`  regra.${f} tem valor`, c0[f] !== undefined && c0[f] !== null && (!Array.isArray(c0[f]) || c0[f].length > 0), JSON.stringify(c0[f]))
}
const rr = await call(client, 'evaluate_user_roles', { roles: ['Global Administrator', 'Privileged Role Administrator'], scope: 'entra-id' })
if (rr.conflicts.length) {
  ok('  o conflito do avaliador também tem name', typeof rr.conflicts[0].name === 'string' && rr.conflicts[0].name.length > 0)
}

console.log('\n── as contagens das descrições vêm do dado ──')
// "mais de 1.700 roles" ficou meses no ar numa página cujo índice tinha 4.603.
// Aqui o número da descrição e o número que o catálogo devolve são o mesmo, ou falha.
const counts = await call(client, 'verify_role_names', { names: ['Owner'] })
const declared = tools.find((t) => t.name === 'search_roles').description.match(/entre as ([\d.]+) roles/)
ok('a descrição de search_roles declara uma contagem', !!declared, 'não achei o número na descrição')
if (declared) {
  const n = Number(declared[1].replace(/\./g, ''))
  ok(`  → e ela bate com o catálogo (${n} = ${counts.catalogSize})`, n === counts.catalogSize)
}
ok('o total por plataforma soma o total',
   Object.values(counts.catalogByPlatform).reduce((a, b) => a + b, 0) === counts.catalogSize,
   JSON.stringify(counts.catalogByPlatform))
const sodDesc = tools.find((t) => t.name === 'find_role_conflicts').description.match(/([\d.]+) regras curadas/)
ok('a descrição de SoD declara as regras', !!sodDesc)

console.log('\n── as URLs apontam para rotas que existem ──')
const shapes = [/^https:\/\/iamscope\.cloud\/(entraid|azure-rbac|aws|gcp|ibm-cloud|google-workspace)\/(roles|policies)\//]
const urls = [...q1.results.map((r) => r.url), ...Object.values(eq.matches[0].clouds).map((c) => c.url).filter(Boolean)]
ok('toda URL devolvida tem forma de rota real do site',
   urls.every((u) => shapes.some((re) => re.test(u))),
   urls.find((u) => !shapes.some((re) => re.test(u))) ?? '')

console.log('\n── o wildcard da AWS não concede permissão de outra nuvem ──')
for (const q of ['storage.buckets.delete', 'microsoft.directory/users/password/update', 'compute.instances.delete']) {
  const r = await call(client, 'search_permissions', { permission: q, limitPerCloud: 50 })
  const fantasma = r.matches.filter((m) => m.viaWildcard && m.cloud === 'aws')
  ok(`"${q}" não é concedida por wildcard da AWS`, fantasma.length === 0,
     fantasma.map((m) => m.permission + ' ← ' + m.grantedBy.map((g) => g.name).join('/')).join(' | '))
  if (q === 'storage.buckets.delete') {
    ok('  → e o que foi removido fica registrado', r.suppressedCrossCloudWildcards?.count > 0,
       JSON.stringify(r.suppressedCrossCloudWildcards ?? null).slice(0, 120))
    ok('  → sobrando só resultado de GCP', r.matches.every((m) => m.cloud === 'gcp'), [...new Set(r.matches.map((m) => m.cloud))].join(','))
  }
}
// A recíproca: query com forma de action da AWS mantém o wildcard, que é o dado bom.
const s3 = await call(client, 'search_permissions', { permission: 's3:GetObject', limitPerCloud: 50 })
ok('s3:GetObject MANTÉM os wildcards da AWS', s3.matches.some((m) => m.viaWildcard && m.cloud === 'aws'),
   s3.matches.filter((m) => m.viaWildcard).map((m) => m.permission).join(','))
ok('  → e AdministratorAccess aparece por "*"',
   s3.matches.some((m) => m.permission === '*' && m.grantedBy.some((g) => g.name === 'AdministratorAccess')))

console.log('\n── nada aqui supõe que o caminho é do Linux ──')
// Custou um build no Windows: build.mjs derivava a própria pasta lendo a
// propriedade `pathname` da URL do próprio módulo, em vez de fileURLToPath. No
// Linux as duas dão a mesma string. No Windows a primeira devolve "/F:/proj/..."
// — com barra na frente — e o path.join seguinte vira "F:\F:\proj\...", com a
// letra da unidade duplicada. O build morre com MODULE_NOT_FOUND.
//
// (Este comentário evita de propósito escrever a expressão proibida: a checagem
// abaixo é textual e acusaria o comentário que a explica.)
//
// A checagem é estática de propósito: o erro não aparece rodando em Linux, então
// executar não pega. O padrão é montado por concatenação para o texto procurado
// não existir neste arquivo — senão a guarda acusa a si mesma, que foi o que
// aconteceu na primeira tentativa.
{
  const { readFile: rf } = await import('node:fs/promises')
  const PROIBIDO = new RegExp(['URL\\s*\\(\\s*import\\', '.meta\\', '.url\\s*\\)[\\s\\S]{0,20}?\\', '.pathname'].join(''))
  const arquivos = [
    'build.mjs', 'scripts/gen-stats.mjs', 'scripts/smoke.mjs', 'scripts/metrics.mjs',
    'src/runtime.ts', 'src/server.ts', 'src/tools.ts', 'src/verify.ts', 'src/provenance.ts',
  ]
  const culpados = []
  for (const f of arquivos) {
    const txt = await rf(path.join(ROOT, f), 'utf8').catch(() => '')
    if (PROIBIDO.test(txt)) culpados.push(f)
  }
  ok('nenhum módulo deriva a própria pasta por .pathname', culpados.length === 0, culpados.join(' | '))
  ok('  → e a guarda não acusa a si mesma', !culpados.includes('scripts/smoke.mjs'))
}

console.log('\n── o pacote le o src/ do repo, nao uma copia ──')
// Ate 25/08 havia um espelho de src/lib e src/data dentro do pacote, com um
// checador comparando os dois por sha256. Dentro do repositorio a copia era 3,3 MB
// duplicados e um lugar onde alguem podia corrigir um bug do lado errado.
//
// Agora o esbuild aponta para ../src. Nao ha copia, entao nao ha o que divergir —
// e o que resta a verificar e que o pacote realmente esta DENTRO do repo, porque
// fora dele ele nao tem como se construir.
{
  const { access } = await import('node:fs/promises')
  const precisa = ['../src/lib/roleAdvisor.ts', '../src/data/roles.ts', '../public/aws-actions-index.json']
  const faltando = []
  for (const rel of precisa) {
    try { await access(path.join(ROOT, rel)) } catch { faltando.push(rel) }
  }
  ok('o pacote enxerga src/ e public/ do site em ../', faltando.length === 0, faltando.join(', '))
  ok('nenhuma copia de vendor sobrou no pacote',
     await access(path.join(ROOT, 'src/vendor-lib')).then(() => false, () => true))
}

console.log('\n── indice ausente e ERRO, nao "nenhum resultado" ──')
// Achado ao mover data/ para fora: o servidor subia e `iam:CreateUser` respondia
// totalMatches: 0 — indistinguivel de "esta permissao nao existe". A causa e o
// Promise.allSettled de ensureLocalPermissionIndex, que e o desenho certo no site
// (uma nuvem falhar nao pode derrubar a pagina) e engole a falha aqui.
//
// Este teste roda um segundo servidor com IAMSCOPE_MCP_DATA_DIR apontando para uma
// pasta vazia, que e como reproduzir a falta de data/ sem mexer no pacote.
{
  const { mkdtemp } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const vazia = await mkdtemp(path.join(tmpdir(), 'iamscope-vazia-'))
  const c2 = new Client({ name: 'sem-indice', version: '1.0.0' })
  await c2.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(ROOT, 'dist/server.mjs')], stderr: 'ignore',
    env: { ...process.env, IAMSCOPE_MCP_DATA_DIR: vazia },
  }))
  const r = JSON.parse((await c2.callTool({ name: 'search_permissions', arguments: { permission: 'iam:CreateUser' } })).content[0].text)
  ok('sem indice, search_permissions devolve INDEX_NOT_LOADED', r.error === 'INDEX_NOT_LOADED', JSON.stringify(r).slice(0, 140))
  ok('  → e nomeia as nuvens que faltaram', Array.isArray(r.missingClouds) && r.missingClouds.length === 2, JSON.stringify(r.missingClouds))
  ok('  → e manda NAO concluir que a permissao nao existe', /NÃO conclua/.test(r.message ?? ''))
  const s2 = JSON.parse((await c2.callTool({ name: 'search_roles', arguments: { query: 'resetar senha', limit: 2 } })).content[0].text)
  ok('  → e o catalogo de roles continua respondendo (nao depende de data/)', s2.results.length > 0)
  await c2.close()
}

console.log('\n── a promessa: nada sai para a rede ──')
// O pacote afirma que o catálogo não sobe para lugar nenhum. A afirmação vale o
// que valer a checagem: nenhum fetch de URL absoluta pode existir no bundle, e
// todo caminho local pedido tem de estar na lista fechada do shim.
const { readFile: rf, readdir: rd } = await import('node:fs/promises')
let absolutas = []
for (const f of await rd(path.join(ROOT, 'dist'))) {
  if (!f.endsWith('.mjs')) continue
  const txt = await rf(path.join(ROOT, 'dist', f), 'utf8')
  for (const m of txt.matchAll(/fetch\(\s*[`"'](https?:)?\/\//g)) absolutas.push(`${f}: ${m[0]}`)
}
ok('nenhum fetch de URL absoluta no bundle', absolutas.length === 0, absolutas.join(' | '))

const naoServido = await call(client, 'search_permissions', { permission: 'x' })
ok('um caminho fora da lista do shim falharia alto, não em silêncio',
   !naoServido.error || /não está embutido/.test(naoServido.message ?? ''),
   'a busca por "x" rodou sem erro, então os dois índices embutidos carregaram')

await client.close()

console.log(`\n${fail === 0 ? '✅' : '❌'}  ${pass} passaram, ${fail} falharam\n`)
process.exit(fail === 0 ? 0 : 1)
