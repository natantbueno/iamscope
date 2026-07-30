#!/usr/bin/env node
/**
 * Busca TODAS as built-in roles do Azure RBAC direto da documentação oficial e
 * reconcilia com o dataset do site (adiciona novas, remove descontinuadas).
 *
 * Fonte: repositório público MicrosoftDocs/azure-docs, arquivos
 *   articles/role-based-access-control/built-in-roles/<categoria>.md
 * Cada role nessas páginas traz um bloco ```json``` com a definição completa —
 * roleName, id, description, assignableScopes e permissions (actions,
 * notActions, dataActions, notDataActions). É a mesma coisa que a API do ARM
 * devolve, só que pública, versionada e sem exigir credencial.
 *
 * Saídas:
 *   src/data/azureRbac.ts          — metadados das roles
 *   public/azure-perms/<slug>.json — permissões por role
 *   e um relatório de diff no stdout
 *
 * Uso:
 *   node scripts/fetch-azure-roles-official.js --dry-run   # só o relatório
 *   node scripts/fetch-azure-roles-official.js             # aplica
 *
 * Node 18+ (fetch nativo), sem dependências.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DATA = path.join(ROOT, 'src', 'data', 'azureRbac.ts')
const PERMS_DIR = path.join(ROOT, 'public', 'azure-perms')
const DRY = process.argv.includes('--dry-run')

const RAW = 'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/role-based-access-control/built-in-roles'

// Categorias publicadas pela Microsoft -> categoria usada no site.
const PAGES = {
  'privileged': 'General', 'general': 'General', 'compute': 'Compute',
  'networking': 'Networking', 'storage': 'Storage', 'web-and-mobile': 'AppService',
  'containers': 'Containers', 'databases': 'Database', 'analytics': 'Management',
  'ai-machine-learning': 'AI', 'internet-of-things': 'Management',
  'mixed-reality': 'Management', 'integration': 'Integration', 'identity': 'Identity',
  'security': 'Security', 'devops': 'Management', 'monitor': 'Monitoring',
  'management-and-governance': 'Management', 'virtual-desktop-infrastructure': 'Compute',
  'migration': 'Management', 'hybrid-multicloud': 'Management', 'other': 'General',
}

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ').trim()
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// ── Tier: classificação editorial do IAM Scope, NÃO publicada pela Microsoft ──
function classifyTier(def) {
  const p = def.permissions?.[0] ?? {}
  const actions = p.actions ?? []
  const dataActions = p.dataActions ?? []
  const notActions = p.notActions ?? []
  const has = (arr, s) => arr.some((a) => a.toLowerCase() === s)

  if (has(actions, '*') && notActions.length === 0) return 'FullControl'
  const grantsRoleAssign = actions.some((a) =>
    /^microsoft\.authorization\/(\*|roleassignments)/i.test(a) && !/\/read$/i.test(a))
  if (grantsRoleAssign) return 'AccessManagement'
  if (has(actions, '*')) return 'Contributor'
  if (dataActions.length > 0 && actions.every((a) => /\/read$/i.test(a) || a === '*/read')) return 'DataPlane'
  const onlyReads = actions.length > 0 && actions.every((a) => /\/read$/i.test(a) || a === '*/read')
  if (onlyReads && dataActions.length === 0) return 'Reader'
  const writes = actions.some((a) => /\/(write|delete|action)$/i.test(a) || a.endsWith('/*'))
  if (writes) return 'Contributor'
  return 'Specialized'
}

const PRIV_PATTERNS = [
  /^microsoft\.authorization\/.*\/(write|delete)$/i,
  /^microsoft\.authorization\/\*$/i,
  /elevateaccess/i,
  /\/listkeys\/action$/i,
  /\/listcredential/i,
  /\/regeneratekey/i,
]
function isPrivileged(def) {
  const p = def.permissions?.[0] ?? {}
  const all = [...(p.actions ?? []), ...(p.dataActions ?? [])]
  if (all.some((a) => a === '*')) return true
  return all.some((a) => PRIV_PATTERNS.some((rx) => rx.test(a)))
}

/** Extrai os blocos ```json``` de uma página de categoria. */
function parseDefs(md) {
  const out = []
  const rx = /```json\s*\n([\s\S]*?)\n```/g
  let m
  while ((m = rx.exec(md)) !== null) {
    try {
      const def = JSON.parse(m[1])
      if (def && def.roleName && def.name) out.push(def)
    } catch { /* bloco não-JSON, ignora */ }
  }
  return out
}

;(async () => {
  console.log('Baixando páginas oficiais de built-in roles...\n')
  const all = new Map() // guid -> { def, category }
  const failed = []

  for (const [page, category] of Object.entries(PAGES)) {
    const url = `${RAW}/${page}.md`
    try {
      const res = await fetch(url)
      if (!res.ok) { failed.push(`${page} (HTTP ${res.status})`); continue }
      const md = await res.text()
      const defs = parseDefs(md)
      for (const d of defs) {
        // roleType BuiltInRole apenas; ignora custom de exemplo
        if (d.roleType && d.roleType !== 'BuiltInRole') continue
        if (!all.has(d.name)) all.set(d.name, { def: d, category })
      }
      console.log(`  ${page.padEnd(32)} ${String(defs.length).padStart(4)} roles`)
    } catch (e) {
      failed.push(`${page} (${e.message})`)
    }
  }

  if (failed.length) console.log('\nPáginas que falharam:', failed.join(', '))
  console.log(`\nTotal de roles oficiais: ${all.size}`)

  // ── Diff contra o dataset atual ────────────────────────────────────────────
  const cur = fs.readFileSync(DATA, 'utf8')
  const curRows = [...cur.matchAll(/\{ name: '((?:[^'\\]|\\.)*)', slug: '([^']*)', id: '([^']*)'/g)]
    .map((m) => ({ name: m[1].replace(/\\'/g, "'"), slug: m[2], id: m[3].toLowerCase() }))
  const curById = new Map(curRows.map((r) => [r.id, r]))

  const officialIds = new Set([...all.keys()].map((x) => x.toLowerCase()))
  const added = [...all.entries()].filter(([gid]) => !curById.has(gid.toLowerCase()))
  const removed = curRows.filter((r) => !officialIds.has(r.id))

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Dataset atual : ${curRows.length} roles`)
  console.log(`Oficial hoje  : ${all.size} roles`)
  console.log(`NOVAS         : ${added.length}`)
  for (const [gid, { def }] of added) console.log(`   + ${def.roleName}  (${gid})`)
  console.log(`DESCONTINUADAS: ${removed.length}`)
  for (const r of removed) console.log(`   - ${r.name}  (${r.id})`)
  console.log('='.repeat(60))

  // descrições que mudaram
  let descChanged = 0
  for (const [gid, { def }] of all) {
    const c = curById.get(gid.toLowerCase())
    if (!c) continue
    const m = cur.match(new RegExp(`id: '${gid}', description: '((?:[^'\\\\]|\\\\.)*)'`, 'i'))
    if (m && m[1].replace(/\\'/g, "'") !== (def.description ?? '')) descChanged++
  }
  console.log(`Descrições alteradas: ${descChanged}`)

  if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

  // ── Escreve azureRbac.ts ───────────────────────────────────────────────────
  // Preserva os blocos de tipo/metadata do arquivo atual e regrava só a lista.
  const headEnd = cur.indexOf('export const AZURE_ROLES')
  if (headEnd === -1) throw new Error('AZURE_ROLES não encontrado em azureRbac.ts')
  let head = cur.slice(0, headEnd)
  head = head.replace(/\/\/ Total: \d+ roles/, `// Total: ${all.size} roles`)
  head = head.replace(/^\/\/ Azure RBAC Built-in Roles.*$/m,
    `// Azure RBAC Built-in Roles — AUTO-GERADO por scripts/fetch-azure-roles-official.js\n` +
    `// Fonte: MicrosoftDocs/azure-docs → built-in-roles/*.md (blocos JSON oficiais)\n` +
    `// Gerado em: ${new Date().toISOString()}\n` +
    `// name/id/description/assignableScopes/permissões são literais da Microsoft.\n` +
    `// tier/category/isPrivileged são classificação editorial do IAM Scope.`)

  const seen = new Set()
  const rows = [...all.entries()]
    .sort((a, b) => a[1].def.roleName.localeCompare(b[1].def.roleName))
    .map(([gid, { def, category }]) => {
      let slug = slugify(def.roleName)
      while (seen.has(slug)) slug += '-2'
      seen.add(slug)
      const p = def.permissions?.[0] ?? {}
      const count = (p.actions?.length ?? 0) + (p.dataActions?.length ?? 0)
      const scopes = (def.assignableScopes ?? ['/']).map((s) => `'${esc(s)}'`).join(', ')
      return `  { name: '${esc(def.roleName)}', slug: '${slug}', id: '${esc(gid)}', description: '${esc(def.description)}', category: '${category}', tier: '${classifyTier(def)}', isPrivileged: ${isPrivileged(def)}, permissionCount: ${count}, assignableScopes: [${scopes}] },`
    })

  fs.writeFileSync(DATA, `${head}export const AZURE_ROLES: AzureRbacRole[] = [\n${rows.join('\n')}\n]\n`)
  console.log(`\nEscrito: src/data/azureRbac.ts (${rows.length} roles)`)

  // ── Escreve public/azure-perms/*.json ──────────────────────────────────────
  fs.mkdirSync(PERMS_DIR, { recursive: true })
  const validSlugs = new Set()
  let permFiles = 0
  const seen2 = new Set()
  for (const [, { def }] of [...all.entries()].sort((a, b) => a[1].def.roleName.localeCompare(b[1].def.roleName))) {
    let slug = slugify(def.roleName)
    while (seen2.has(slug)) slug += '-2'
    seen2.add(slug)
    validSlugs.add(slug)
    const p = def.permissions?.[0] ?? {}
    const rows2 = [
      ...(p.actions ?? []).map((a) => ({ action: a, type: 'Actions' })),
      ...(p.notActions ?? []).map((a) => ({ action: a, type: 'NotActions' })),
      ...(p.dataActions ?? []).map((a) => ({ action: a, type: 'DataActions' })),
      ...(p.notDataActions ?? []).map((a) => ({ action: a, type: 'NotDataActions' })),
    ]
    fs.writeFileSync(path.join(PERMS_DIR, `${slug}.json`), JSON.stringify(rows2))
    permFiles++
  }
  // remove arquivos de roles que saíram do catálogo
  let orphans = 0
  for (const f of fs.readdirSync(PERMS_DIR)) {
    if (!f.endsWith('.json')) continue
    if (!validSlugs.has(f.slice(0, -5))) { fs.unlinkSync(path.join(PERMS_DIR, f)); orphans++ }
  }
  console.log(`Escrito: public/azure-perms/ (${permFiles} arquivos, ${orphans} órfãos removidos)`)
  console.log('\nAgora rode:  node scripts/build-azure-perms-index.js')
})().catch((e) => {
  // process.exit() com escrita pendente derruba o libuv no Windows
  // ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)").
  // exitCode deixa o Node encerrar sozinho depois de drenar o stdout.
  console.error('\nFALHOU:', e.message)
  process.exitCode = 1
})
