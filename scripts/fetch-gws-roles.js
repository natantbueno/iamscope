#!/usr/bin/env node
/**
 * Regenera as roles e o catálogo de privilégios do Google Workspace em
 * src/data/googleWorkspace.ts a partir de scripts/gws-official-source.json.
 *
 * POR QUE NÃO BUSCA DIRETO DA WEB
 *   As páginas do Help Center do Google são renderizadas no cliente e mudam de
 *   estrutura HTML sem aviso — um parser apontado para elas quebra em silêncio
 *   e, pior, pode gravar um dataset pela metade. A extração fica congelada em
 *   gws-official-source.json, com URL e data, e este script só traduz aquilo
 *   para o formato do site.
 *
 *   Para atualizar quando o Google mudar a documentação:
 *     1. Abra as URLs listadas em `sources` do JSON.
 *     2. Ajuste o JSON (é texto verbatim do provedor).
 *     3. Rode este script.
 *     4. Rode scripts/build-counts.js.
 *
 * O QUE É OFICIAL E O QUE É NOSSO
 *   Oficial : name, description, capabilities, apiPrivileges, privilegeGroups
 *   Editorial: tier, category, isPrivileged — derivados aqui, com regra
 *              explícita e rastreável, nunca digitados um a um.
 *
 * HISTÓRICO
 *   O dataset anterior tinha 44 roles; só 14 constam da lista oficial de
 *   prebuilt roles. As outras 30 (Gmail Admin, Vault Admin, Tenant Admin…) não
 *   existem no Google Workspace — administração por serviço é feita via
 *   Services Admin ou custom role. Dos 84 nomes de privilégio, 79 também eram
 *   inventados. Tudo foi substituído por esta coleta.
 *
 * Uso:
 *   node scripts/fetch-gws-roles.js --dry-run
 *   node scripts/fetch-gws-roles.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(__dirname, 'gws-official-source.json')
const OUT = path.join(ROOT, 'src', 'data', 'googleWorkspace.ts')
const DRY = process.argv.includes('--dry-run')

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'))

/**
 * Classificação editorial de tier.
 *
 * A escala é a mesma ideia das outras clouds: quanto mais perto do controle do
 * tenant, maior o risco. Aqui ela é declarada por role porque são 14 — uma
 * heurística por palavra-chave no nome erraria em casos como "Storage Admin",
 * que parece pequeno mas dá acesso total a Reports e Drive.
 *
 * SuperAdmin        — controla o tenant inteiro, incluindo outros admins
 * DelegatedAdmin    — administra identidades (usuários/grupos), sem tocar admins
 * ServiceAdmin      — administra serviços e dispositivos
 * SpecializedAdmin  — recorte estreito (Voice, Directory Sync, revenda)
 * ReadOnly          — só leitura
 */
const TIER = {
  'Super Admin': 'SuperAdmin',
  'User Management Admin': 'DelegatedAdmin',
  'Groups Admin': 'DelegatedAdmin',
  'Groups Editor': 'DelegatedAdmin',
  'Help Desk Admin': 'DelegatedAdmin',
  'Services Admin': 'ServiceAdmin',
  'Mobile Admin': 'ServiceAdmin',
  'Storage Admin': 'ServiceAdmin',
  'Multi-party approval Admin': 'SpecializedAdmin',
  'Google Voice Admin': 'SpecializedAdmin',
  'Directory Sync Admin': 'SpecializedAdmin',
  'Reseller Admin': 'SpecializedAdmin',
  'Indirect Reseller Admin': 'SpecializedAdmin',
  'Groups Reader': 'ReadOnly',
}

const CATEGORY = {
  'Super Admin': 'Identity',
  'User Management Admin': 'Identity',
  'Groups Admin': 'Identity',
  'Groups Editor': 'Identity',
  'Groups Reader': 'Identity',
  'Help Desk Admin': 'Identity',
  'Directory Sync Admin': 'Identity',
  'Services Admin': 'Productivity',
  'Mobile Admin': 'Device',
  'Storage Admin': 'Storage',
  'Google Voice Admin': 'Communication',
  'Multi-party approval Admin': 'Security',
  'Reseller Admin': 'Billing',
  'Indirect Reseller Admin': 'Billing',
}

/**
 * Privilegiada = pode escalar privilégio ou administrar quem administra.
 *
 * Super Admin é evidente. User Management e Help Desk entram porque resetar
 * senha de usuário é caminho de comprometimento de conta, ainda que a doc
 * ressalve que não alcança administradores. Multi-party approval entra por
 * aprovar ações sensíveis de outros admins.
 */
const PRIVILEGED = new Set([
  'Super Admin',
  'User Management Admin',
  'Help Desk Admin',
  'Multi-party approval Admin',
])

const slugify = (s) => s.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const problemas = []

const roles = raw.roles.map((r) => {
  const tier = TIER[r.name]
  const category = CATEGORY[r.name]
  if (!tier) problemas.push(`sem tier definido: ${r.name}`)
  if (!category) problemas.push(`sem categoria definida: ${r.name}`)
  return {
    slug: slugify(r.name),
    name: r.name,
    description: r.description,
    tier: tier ?? 'SpecializedAdmin',
    category: category ?? 'Identity',
    isPrivileged: PRIVILEGED.has(r.name),
    privileges: r.capabilities ?? [],
    apiPrivileges: r.apiPrivileges ?? [],
    apiPrivilegesComplete: !!r.apiPrivilegesComplete,
    scopeNote: r.scopeNote,
  }
})

// Roles definidas em TIER que não vieram da fonte: sinal de que o JSON encolheu
for (const nome of Object.keys(TIER)) {
  if (!raw.roles.some((r) => r.name === nome)) {
    problemas.push(`classificada mas ausente da fonte: ${nome}`)
  }
}

const slugs = roles.map((r) => r.slug)
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i)
if (dup.length) problemas.push(`slug duplicado: ${[...new Set(dup)].join(', ')}`)

if (problemas.length) {
  console.error('\nProblemas encontrados — nada foi escrito:')
  for (const p of problemas) console.error(`  - ${p}`)
  process.exitCode = 1
  return
}

// ── Catálogo de privilégios ─────────────────────────────────────────────────
// Cada filho vira uma entrada própria, com o pai como grupo: é assim que o
// Admin console apresenta (Users > Create, Calendar > Manage Resources) e é o
// que permite filtrar e buscar na página de privilégios.
const privileges = []
for (const g of raw.privilegeGroups) {
  privileges.push({
    slug: slugify(`${g.section}-${g.name}`),
    name: g.name,
    group: g.name,
    section: g.section,
    description: g.description,
    isChild: false,
  })
  for (const c of g.children) {
    privileges.push({
      slug: slugify(`${g.section}-${g.name}-${c}`),
      name: `${g.name} > ${c}`,
      group: g.name,
      section: g.section,
      description: '',
      isChild: true,
    })
  }
}

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const arr = (a) => `[${a.map(q).join(', ')}]`

const cabecalho = `// Google Workspace — Admin Roles, Privilégios e OAuth Scopes
//
// AUTO-GERADO por scripts/fetch-gws-roles.js a partir de
// scripts/gws-official-source.json. Não editar as roles e privilégios à mão.
//
// FONTES OFICIAIS
${raw.sources.map((s) => `//   ${s.title}\n//     ${s.url}  (doc de ${s.docLastUpdated})`).join('\n')}
//
// Extraído em ${raw.extractedAt}.
//
// COBERTURA DE apiPrivileges
//   O Google só publica os nomes de privilégio da API (privilegeName) para duas
//   roles: _SEED_ADMIN_ROLE (Super Admin, truncada na doc) e _GROUPS_ADMIN_ROLE
//   (Groups Admin, completa). Para as outras 12 a lista só existe via
//   privileges.list do Admin SDK, que exige OAuth no tenant.
//   Por isso apiPrivileges vem vazio nelas — é lacuna declarada, não erro.
//   A interface precisa dizer isso em vez de mostrar lista vazia.
//
// tier, category e isPrivileged são CLASSIFICAÇÃO EDITORIAL do IAM Scope,
// derivadas das capacidades oficiais. Não são classificação do Google.
`

const ts = `${cabecalho}
export type GwsTier = 'SuperAdmin' | 'DelegatedAdmin' | 'ServiceAdmin' | 'SpecializedAdmin' | 'ReadOnly'
export type GwsCategory = 'Identity' | 'Security' | 'Communication' | 'Productivity' | 'Device' | 'Storage' | 'Analytics' | 'Billing' | 'Infrastructure'
export type GwsService = 'Gmail' | 'Drive' | 'Calendar' | 'Admin SDK' | 'Contacts' | 'Chat' | 'Meet' | 'Docs' | 'Sheets' | 'Slides' | 'Cloud Identity' | 'Reports' | 'Tasks' | 'People'
export type GwsScopeSensitivity = 'restricted' | 'sensitive' | 'standard'

export interface GwsAdminRole {
  slug: string
  name: string
  description: string
  tier: GwsTier
  category: GwsCategory
  isPrivileged: boolean
  /** Capacidades, no texto oficial do Google. */
  privileges: string[]
  /** privilegeName do Admin SDK. Vazio quando o Google não publica. */
  apiPrivileges?: string[]
  /** false = o Google publica só parte da lista, ou nenhuma. */
  apiPrivilegesComplete?: boolean
  /** Ressalva oficial de escopo, quando existe. */
  scopeNote?: string
}

/** Privilégio do Admin console, como o Google o nomeia. */
export interface GwsPrivilege {
  slug: string
  name: string
  group: string
  section: string
  description: string
  isChild: boolean
}

export interface GwsOAuthScope {
  scope: string
  name: string
  description: string
  service: GwsService
  sensitivity: GwsScopeSensitivity
}

/** URLs das fontes, para a página de referência citar. */
export const GWS_SOURCES = ${JSON.stringify(raw.sources, null, 2)} as const

export const GWS_EXTRACTED_AT = ${q(raw.extractedAt)}

export { GWS_TIER_META } from './tierMeta'

export const GWS_ROLES: GwsAdminRole[] = [
${roles.map((r) => `  {
    slug: ${q(r.slug)},
    name: ${q(r.name)},
    description: ${q(r.description)},
    tier: ${q(r.tier)}, category: ${q(r.category)}, isPrivileged: ${r.isPrivileged},
    privileges: ${arr(r.privileges)},
    apiPrivileges: ${arr(r.apiPrivileges)},
    apiPrivilegesComplete: ${r.apiPrivilegesComplete},${r.scopeNote ? `\n    scopeNote: ${q(r.scopeNote)},` : ''}
  },`).join('\n')}
]

export const GWS_PRIVILEGES: GwsPrivilege[] = [
${privileges.map((p) => `  { slug: ${q(p.slug)}, name: ${q(p.name)}, group: ${q(p.group)}, section: ${q(p.section)}, description: ${q(p.description)}, isChild: ${p.isChild} },`).join('\n')}
]
`

const comApi = roles.filter((r) => r.apiPrivileges.length).length
console.log(`Roles                : ${roles.length}`)
console.log(`  privilegiadas      : ${roles.filter((r) => r.isPrivileged).length}`)
console.log(`  com capacidades    : ${roles.filter((r) => r.privileges.length).length}/${roles.length}`)
console.log(`  com apiPrivileges  : ${comApi}/${roles.length}  (lacuna declarada: exige OAuth)`)
console.log(`Privilégios oficiais : ${privileges.length}  (${privileges.filter((p) => !p.isChild).length} grupos + ${privileges.filter((p) => p.isChild).length} filhos)`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

// Preserva GWS_SCOPE_META e GWS_SCOPES do arquivo atual: os OAuth scopes têm
// outra fonte (doc de scopes do Google) e não fazem parte desta coleta.
const atual = fs.readFileSync(OUT, 'utf8')
const iMeta = atual.indexOf('export const GWS_SCOPE_META')
const iScopes = atual.indexOf('export const GWS_SCOPES')
if (iMeta === -1 || iScopes === -1) {
  console.error('Não achei GWS_SCOPE_META / GWS_SCOPES no arquivo atual — abortando para não perder os scopes.')
  process.exitCode = 1
  return
}
const blocoMeta = atual.slice(iMeta, atual.indexOf('\n}\n', iMeta) + 3)
const blocoScopes = atual.slice(iScopes)

fs.writeFileSync(OUT, `${ts}\n${blocoMeta}\n${blocoScopes}`)
console.log(`\nEscrito: src/data/googleWorkspace.ts`)
console.log('Agora rode: node scripts/build-counts.js')
