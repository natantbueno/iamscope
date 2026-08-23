#!/usr/bin/env node
/**
 * Gera public/search-index.json — o índice da busca global (/search).
 *
 * POR QUE UM ÍNDICE EM public/ E NÃO IMPORT DIRETO
 *   Importar os 6 datasets numa página levaria 2,5 MB de TypeScript para o
 *   bundle dela. É o que acontece hoje em /evaluate (484 kB de First Load) e
 *   está no roadmap como dívida. A busca global seria pior: é a página que mais
 *   gente vai abrir vinda da home.
 *
 *   Aqui o índice é um JSON buscado sob demanda — mesmo padrão de
 *   azure-perms-index.json. A página começa com ~5 kB e baixa o índice quando
 *   a pessoa realmente busca.
 *
 * FORMATO
 *   Tuplas em vez de objetos. Com 4.753 roles, repetir as chaves ("name",
 *   "slug", "description"...) em cada item custa mais que os dados. A ordem dos
 *   campos está em CAMPOS e a página desestrutura por posição.
 *
 * TIER NORMALIZADO
 *   Os seis TIER_META têm formatos diferentes — uns expõem `color`/`bg`, outros
 *   `textColor`/`darkText`/`darkBg`. Resolver isso aqui evita que a página de
 *   busca precise conhecer seis formatos; ela recebe `{label, color}` e pronto.
 *
 * Uso:
 *   node scripts/build-search-index.js --dry-run
 *   node scripts/build-search-index.js
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'search-index.json')
const DRY = process.argv.includes('--dry-run')

const { ROLES } = loadTs('src/data/roles.ts')
const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')
const { AWS_POLICIES } = loadTs('src/data/aws.ts')
const { GCP_ROLES } = loadTs('src/data/gcp.ts')
const { GWS_ROLES } = loadTs('src/data/googleWorkspace.ts')
const { IBM_ROLES } = loadTs('src/data/ibmCloud.ts')
const TM = loadTs('src/data/tierMeta.ts')
const { CLOUD_COLORS } = loadTs('src/lib/cloudColors.ts')

/** Cor do tier legível sobre superfície escura — o site é permanentemente escuro. */
const corDoTier = (meta) => meta?.darkText ?? meta?.color ?? '#93a3bd'

const CLOUDS = [
  {
    key: 'entraId', label: 'Entra ID', base: '/entraid/roles/',
    lista: ROLES, tierDe: (r) => r.eamTier, meta: TM.EAM_META,
    idDe: (r) => r.id, noun: 'role',
  },
  {
    key: 'azureRbac', label: 'Azure RBAC', base: '/azure-rbac/roles/',
    lista: AZURE_ROLES, tierDe: (r) => r.tier, meta: TM.AZURE_TIER_META,
    idDe: (r) => r.id, noun: 'role',
  },
  {
    key: 'aws', label: 'AWS IAM', base: '/aws/policies/',
    lista: AWS_POLICIES, tierDe: (r) => r.tier, meta: TM.AWS_TIER_META,
    idDe: (r) => r.arn, noun: 'policy',
  },
  {
    key: 'gcp', label: 'GCP IAM', base: '/gcp/roles/',
    lista: GCP_ROLES, tierDe: (r) => r.tier, meta: TM.GCP_TIER_META,
    idDe: (r) => r.roleId, noun: 'role',
  },
  {
    key: 'googleWorkspace', label: 'Google Workspace', base: '/google-workspace/roles/',
    lista: GWS_ROLES, tierDe: (r) => r.tier, meta: TM.GWS_TIER_META,
    idDe: () => '', noun: 'role',
  },
  {
    key: 'ibmCloud', label: 'IBM Cloud', base: '/ibm-cloud/roles/',
    lista: IBM_ROLES, tierDe: (r) => r.tier, meta: TM.IBM_TIER_META,
    idDe: () => '', noun: 'role',
  },
]

/** Ordem das tuplas. A página lê por posição — mudar aqui exige mudar lá. */
const CAMPOS = ['cloud', 'name', 'slug', 'id', 'description', 'tier', 'tierLabel', 'category', 'privileged', 'deprecated']

const itens = []
const problemas = []

for (const c of CLOUDS) {
  for (const r of c.lista) {
    const tier = c.tierDe(r)
    const meta = c.meta?.[tier]
    if (!meta) problemas.push(`${c.key}: tier sem metadados — ${r.slug} (${tier})`)
    if (!r.slug) problemas.push(`${c.key}: role sem slug — ${r.name}`)

    itens.push([
      c.key,
      r.name,
      r.slug,
      c.idDe(r) || '',
      r.description || '',
      tier || '',
      meta?.label || tier || '',
      r.category || '',
      r.isPrivileged ? 1 : 0,
      r.deprecated ? 1 : 0,
    ])
  }
}

// Slug duplicado DENTRO da mesma cloud gera dois resultados apontando para a
// mesma página — sintoma de dataset inconsistente, não de busca.
const porCloud = {}
for (const [cloud, , slug] of itens) {
  porCloud[cloud] ??= new Set()
  if (porCloud[cloud].has(slug)) problemas.push(`${cloud}: slug duplicado — ${slug}`)
  porCloud[cloud].add(slug)
}

if (problemas.length) {
  console.error(`\n${problemas.length} problema(s) — nada foi escrito:`)
  for (const p of problemas.slice(0, 20)) console.error(`  - ${p}`)
  if (problemas.length > 20) console.error(`  ... e mais ${problemas.length - 20}`)
  process.exitCode = 1
  return
}

const indice = {
  generatedAt: new Date().toISOString(),
  campos: CAMPOS,
  clouds: Object.fromEntries(CLOUDS.map((c) => [c.key, {
    label: c.label,
    base: c.base,
    noun: c.noun,
    color: CLOUD_COLORS[c.key].mark,
    text: CLOUD_COLORS[c.key].onDark,
    total: c.lista.length,
  }])),
  // Cores de tier por cloud, para a página não importar tierMeta.
  tiers: Object.fromEntries(CLOUDS.map((c) => [c.key,
    Object.fromEntries(Object.entries(c.meta ?? {}).map(([k, v]) => [k, {
      label: v.label ?? k,
      color: corDoTier(v),
    }])),
  ])),
  itens,
}

const json = JSON.stringify(indice)
const gz = zlib.gzipSync(json).length

for (const c of CLOUDS) {
  const n = itens.filter((i) => i[0] === c.key).length
  console.log(`  ${c.label.padEnd(18)} ${String(n).padStart(5)}`)
}
console.log(`  ${'TOTAL'.padEnd(18)} ${String(itens.length).padStart(5)}`)
console.log(`\nTamanho: ${(json.length / 1024).toFixed(0)} KB  (${(gz / 1024).toFixed(0)} KB gzip)`)
console.log(`Privilegiadas: ${itens.filter((i) => i[8]).length}  ·  Descontinuadas: ${itens.filter((i) => i[9]).length}`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

fs.writeFileSync(OUT, json)
console.log(`\nEscrito: public/search-index.json`)
