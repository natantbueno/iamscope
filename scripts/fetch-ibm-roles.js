#!/usr/bin/env node
/**
 * Regenera src/data/ibmCloud.ts a partir de scripts/ibm-official-source.json.
 *
 * POR QUE ESTA RECOLETA ACONTECEU
 *   O dataset anterior tinha 157 "roles". A auditoria de 03/08 mostrou:
 *     - 502 das 619 "actions" eram prosa em português escrita por nós;
 *       nas 83 roles clássicas, 243 de 243 — zero identificadores reais
 *     - 150 das 157 descrições estavam em português, num site cujo dado
 *       oficial é sempre em inglês
 *     - as 4 platform roles e 3 service roles que a IBM realmente publica
 *       (Viewer, Operator, Editor, Administrator / Reader, Writer, Manager)
 *       não existiam com esse nome
 *     - 138 dos 157 nomes usavam um padrão com travessão ("Classic — Storage
 *       Admin") que a IBM não usa
 *
 *   O modelo real da IBM é outro: 7 roles de IAM, e a infraestrutura clássica
 *   NÃO tem roles pré-construídas — o acesso lá é por permissão individual,
 *   em seis categorias.
 *
 * COLETA DE 05/08/2026
 *   A lista enumerada das 71 permissões clássicas entrou. Estava declarada como
 *   lacuna porque a página oficial é SPA — mas o doc-fonte MIGROU de
 *   ibm-cloud-docs/account para ibm-cloud-docs/iam (iam-mnginfra.md), onde as
 *   seis tabelas estão versionadas em markdown. Na mesma coleta caiu um erro de
 *   estrutura: eram quatro categorias declaradas (Account, Devices, Network,
 *   Services) contra as seis reais (Administrative, Devices, Network, Sales,
 *   Security, Software).
 *
 * POR QUE NÃO BUSCA DA WEB
 *   cloud.ibm.com/docs é renderizado no cliente; um fetch devolve o esqueleto
 *   da página. A extração fica congelada no JSON, com URL e data, e este
 *   script só a traduz para o formato do site.
 *
 * Uso:
 *   node scripts/fetch-ibm-roles.js --dry-run
 *   node scripts/fetch-ibm-roles.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(__dirname, 'ibm-official-source.json')
const OUT = path.join(ROOT, 'src', 'data', 'ibmCloud.ts')
const DRY = process.argv.includes('--dry-run')

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'))

/**
 * Classificação editorial de tier.
 *
 * São 7 roles, então a tabela é declarada e não heurística — com sete itens,
 * adivinhar por palavra no nome só cria chance de errar.
 *
 * Administrator é o único que concede acesso a outros; daí ser o topo. Editor
 * cria e destrói recurso sem mexer em acesso. Operator configura instância já
 * existente. Manager é o Administrator do plano de serviço.
 */
const TIER = {
  Administrator: 'PlatformAdmin',
  Editor: 'PlatformOperator',
  Operator: 'PlatformOperator',
  Viewer: 'ReadOnly',
  Manager: 'ServiceManager',
  Writer: 'PlatformOperator',
  Reader: 'ReadOnly',
}

/** Só Administrator concede acesso a terceiros — é o que define privilégio aqui. */
const PRIVILEGIADAS = new Set(['Administrator'])

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const problemas = []
const roles = []

for (const r of [...raw.platformRoles, ...raw.serviceRoles]) {
  const tier = TIER[r.name]
  if (!tier) problemas.push(`sem tier definido: ${r.name}`)
  roles.push({
    slug: slugify(`${r.kind}-${r.name}`),
    name: r.name,
    description: r.description,
    tier: tier ?? 'ReadOnly',
    category: r.kind === 'platform' ? 'Platform' : 'Identity',
    accessModel: 'iam',
    kind: r.kind,
    isPrivileged: PRIVILEGIADAS.has(r.name),
    // A IBM não publica lista de action por role: cada SERVIÇO mapeia as suas
    // ações para essas roles. Vazio aqui é lacuna declarada, não esquecimento.
    actions: [],
  })
}

// ── Permissões clássicas ────────────────────────────────────────────────────
// Verbatim da IBM. O único trabalho aqui é validar: categoria conhecida, nada
// duplicado, nada sem descrição. Nome e texto passam intactos.
const catIds = new Set(raw.classic.categories.map((c) => c.id))
const permissoes = raw.classic.permissions ?? []

if (raw.classic.permissionsAvailable && permissoes.length === 0) {
  problemas.push('permissionsAvailable=true mas nenhuma permissão no JSON')
}
for (const p of permissoes) {
  if (!catIds.has(p.category)) problemas.push(`categoria desconhecida em "${p.name}": ${p.category}`)
  if (!p.description) problemas.push(`permissão sem descrição: ${p.name}`)
}
const nomes = permissoes.map((p) => `${p.category}/${p.name}`)
const dupPerm = nomes.filter((n, i) => nomes.indexOf(n) !== i)
if (dupPerm.length) problemas.push(`permissão duplicada: ${[...new Set(dupPerm)].join(', ')}`)

const slugs = roles.map((r) => r.slug)
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i)
if (dup.length) problemas.push(`slug duplicado: ${[...new Set(dup)].join(', ')}`)

if (problemas.length) {
  console.error('\nProblemas — nada foi escrito:')
  for (const p of problemas) console.error(`  - ${p}`)
  process.exitCode = 1
  return
}

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const arr = (a) => `[${a.map(q).join(', ')}]`

const cabecalho = `// IBM Cloud IAM — Roles, e o modelo de acesso da infraestrutura clássica
//
// AUTO-GERADO por scripts/fetch-ibm-roles.js a partir de
// scripts/ibm-official-source.json. Não editar à mão.
//
// FONTES OFICIAIS
${raw.sources.map((s) => `//   ${s.title}\n//     ${s.url}`).join('\n')}
//
// Extraído em ${raw.extractedAt}.
//
// O MODELO DA IBM TEM DUAS METADES, E ELAS NÃO SE PARECEM
//
//   IAM      — 7 roles: 4 de plataforma (Viewer, Operator, Editor,
//              Administrator) e 3 de serviço (Reader, Writer, Manager).
//              A IBM não publica lista de action por role: cada SERVIÇO mapeia
//              as próprias ações para essas roles. Por isso \`actions\` vem
//              vazio — é lacuna declarada, não coleta incompleta.
//
//   Clássico — NÃO tem role. O acesso é por permissão individual, em seis
//              categorias (Administrative, Devices, Network, Sales, Security,
//              Software), atribuídas uma a uma ou em bloco por permission set
//              (View only, Basic user, Super user). Acesso a dispositivo e a
//              VPN subnet são concedidos à parte.
//
// O dataset anterior representava a metade clássica como 83 "roles" que a IBM
// não publica, com 243 "actions" que eram prosa em português escrita por nós.
// Ver ROADMAP.md.
//
// tier e isPrivileged são CLASSIFICAÇÃO EDITORIAL do IAM Scope.
`

const ts = `${cabecalho}
export type IbmTier =
  | 'AccountAdmin'      // reservado — hoje nenhuma role oficial cai aqui
  | 'PlatformAdmin'     // Administrator — único que concede acesso a outros
  | 'PlatformOperator'  // Editor, Operator, Writer
  | 'ServiceManager'    // Manager
  | 'ReadOnly'          // Viewer, Reader

export type IbmCategory = 'Identity' | 'Platform' | 'Classic'

export type IbmAccessModel = 'iam' | 'classic'

/** 'platform' vale para qualquer recurso; 'service' é por instância de serviço. */
export type IbmRoleKind = 'platform' | 'service'

export interface IbmTierMeta {
  label: string
  color: string
  bg: string
  description: string
}

export interface IbmRole {
  slug: string
  name: string
  description: string
  tier: IbmTier
  category: IbmCategory
  accessModel: IbmAccessModel
  kind: IbmRoleKind
  isPrivileged: boolean
  /** Vazio de propósito: a IBM mapeia ações por serviço, não por role. */
  actions: string[]
}

/** Categoria de permissão da infraestrutura clássica. */
export interface IbmClassicCategory {
  id: string
  name: string
  description: string
}

/** Permissão individual da infraestrutura clássica. Nome e descrição verbatim da IBM. */
export interface IbmClassicPermission {
  /** id de IbmClassicCategory. */
  category: string
  name: string
  description: string
}

export { IBM_TIER_META } from './tierMeta'

export const IBM_SOURCES = ${JSON.stringify(raw.sources, null, 2)} as const

export const IBM_EXTRACTED_AT = ${q(raw.extractedAt)}

export const IBM_ROLES: IbmRole[] = [
${roles.map((r) => `  {
    slug: ${q(r.slug)},
    name: ${q(r.name)},
    description: ${q(r.description)},
    tier: ${q(r.tier)}, category: ${q(r.category)}, accessModel: 'iam',
    kind: ${q(r.kind)}, isPrivileged: ${r.isPrivileged},
    actions: ${arr(r.actions)},
  },`).join('\n')}
]

// ── Infraestrutura clássica ─────────────────────────────────────────────────
//
// Modelo separado de propósito: não são roles, e tratá-las como se fossem foi
// exatamente o erro do dataset anterior.

export const IBM_CLASSIC_MODEL = ${q(raw.classic.model)}

export const IBM_CLASSIC_MODEL_NOTE = ${q(raw.classic.modelNote)}

export const IBM_CLASSIC_CATEGORIES: IbmClassicCategory[] = [
${raw.classic.categories.map((c) => `  { id: ${q(c.id)}, name: ${q(c.name)}, description: ${q(c.description)} },`).join('\n')}
]

export const IBM_CLASSIC_NOTES: string[] = [
${raw.classic.notes.map((n) => `  ${q(n)},`).join('\n')}
]

/** false = a lista enumerada de permissões clássicas ainda não foi coletada. */
export const IBM_CLASSIC_PERMISSIONS_AVAILABLE = ${raw.classic.permissionsAvailable}

export const IBM_CLASSIC_PERMISSIONS_NOTE = ${q(raw.classic.permissionsNote)}

/**
 * As permissões individuais, verbatim da IBM.
 *
 * Não são roles e não devem virar roles: é isso que a página /ibm-cloud/classic
 * existe para deixar claro. Ordem = a das tabelas do doc oficial.
 */
export const IBM_CLASSIC_PERMISSIONS: IbmClassicPermission[] = [
${permissoes.map((p) => `  { category: ${q(p.category)}, name: ${q(p.name)}, description: ${q(p.description)} },`).join('\n')}
]

export const IBM_CLASSIC_PERMISSIONS_COUNT = ${permissoes.length}
`

console.log(`Roles IAM            : ${roles.length}`)
console.log(`  plataforma         : ${roles.filter((r) => r.kind === 'platform').length}`)
console.log(`  serviço            : ${roles.filter((r) => r.kind === 'service').length}`)
console.log(`  privilegiadas      : ${roles.filter((r) => r.isPrivileged).length}`)
console.log(`Categorias clássicas : ${raw.classic.categories.length}`)
console.log(`Permissões clássicas : ${raw.classic.permissionsAvailable ? permissoes.length : 'LACUNA DECLARADA'}`)
for (const c of raw.classic.categories) {
  console.log(`  ${c.name.padEnd(18)} ${permissoes.filter((p) => p.category === c.id).length}`)
}

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

fs.writeFileSync(OUT, ts)
console.log(`\nEscrito: src/data/ibmCloud.ts`)
console.log('Agora rode: node scripts/build-counts.js && node scripts/build-search-index.js')
