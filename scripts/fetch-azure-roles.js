#!/usr/bin/env node
/**
 * fetch-azure-roles.js
 *
 * Busca TODAS as Azure Built-in Roles da documentação pública da Microsoft
 * (GitHub público, sem autenticação, sem conta Azure).
 *
 * Gera: src/data/azureRbac.ts
 *
 * COMO USAR (sem conta Azure):
 *   node scripts/fetch-azure-roles.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'azureRbac.ts')

// Categorias da documentação Microsoft (arquivos markdown no GitHub)
const DOCS_CATEGORIES = [
  { file: 'general',             cat: 'General' },
  { file: 'compute',             cat: 'Compute' },
  { file: 'networking',          cat: 'Networking' },
  { file: 'storage',             cat: 'Storage' },
  { file: 'containers',          cat: 'Containers' },
  { file: 'databases',           cat: 'Database' },
  { file: 'analytics',           cat: 'Monitoring' },
  { file: 'ai-machine-learning', cat: 'AI' },
  { file: 'internet-of-things',  cat: 'Integration' },
  { file: 'integration',         cat: 'Integration' },
  { file: 'identity',            cat: 'Identity' },
  { file: 'security',            cat: 'Security' },
  { file: 'devops',              cat: 'Management' },
  { file: 'monitor',             cat: 'Monitoring' },
  { file: 'management-governance', cat: 'Management' },
  { file: 'hybrid-multicloud',   cat: 'Management' },
  { file: 'mixed-reality',       cat: 'AppService' },
  { file: 'media',               cat: 'AppService' },
  { file: 'blockchain',          cat: 'General' },
  { file: 'other',               cat: 'General' },
  { file: 'web-and-mobile',      cat: 'AppService' },
  { file: 'developer-tools',     cat: 'Management' },
  { file: 'migration',           cat: 'Management' },
  { file: 'industry',            cat: 'General' },
]

const BASE_URL = 'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/role-based-access-control/built-in-roles'

// ── HTTP fetch ────────────────────────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 node-script' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode === 404) { resolve(null); return }
      if (res.statusCode !== 200) { resolve(null); return }
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(data))
    })
    req.on('error', () => resolve(null))
    req.setTimeout(15000, () => { req.destroy(); resolve(null) })
  })
}

// ── Markdown parser ───────────────────────────────────────────────────────────
// Formato dos docs Microsoft:
//
// ## Role Name
//
// Description text...
//
// > [!div class="mx-tableFixed"]
// > | | |
// > |---|---|
// > | **Actions** | Microsoft.Something/*/read |
// > | **NotActions** |  |
// > | **DataActions** |  |
// > | **NotDataActions** |  |
//
// > [!div class="mx-tableFixed"]
// > | Detail | Value |
// > |---|---|
// > | **Id** | guid-here |

function parseMarkdown(markdown, defaultCategory) {
  const roles = []
  if (!markdown) return roles

  // Split por seções de role (## Título)
  const sections = markdown.split(/\n(?=## )/)

  for (const section of sections) {
    if (!section.startsWith('## ')) continue

    // Nome da role (primeira linha, após "## ")
    const nameMatch = section.match(/^## (.+)/)
    if (!nameMatch) continue
    const name = nameMatch[1].trim().replace(/\[!\[.*?\]\(.*?\)\].*/, '').trim()
    if (!name || name.length < 2) continue

    // Pular cabeçalhos de seção (ex: "## General", "## Compute")
    // Esses são titulos de seção, não roles
    if (/^(General|Compute|Networking|Storage|Containers|Database|Analytics|AI|Integration|Identity|Security|DevOps|Monitor|Management|Hybrid|Mixed|Media|Blockchain|Other|Web|Developer|Migration|Industry|Monitoring|AppService)s?$/i.test(name)) continue

    // ID da role
    const idMatch = section.match(/\|\s*\*?\*?Id\*?\*?\s*\|\s*([0-9a-f-]{36})\s*\|/i)
    const id = idMatch ? idMatch[1].trim() : ''

    // Descrição (texto entre o título e a primeira tabela)
    const descMatch = section.match(/^## .+\n+([^>][^]*?)(?=\n>|\n##|$)/)
    let description = descMatch ? descMatch[1].trim() : ''
    // Remover markdown
    description = description
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#+\s*/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (description.length > 500) description = description.substring(0, 500).trim()

    // Permissões — extrair das tabelas de permissão
    const permissions = []

    // Padrão de tabela de permissões:
    // | **Actions** | perm1 |
    // Mas pode ser multi-linha com <br> ou vírgulas
    const permTypes = ['Actions', 'NotActions', 'DataActions', 'NotDataActions']
    for (const ptype of permTypes) {
      // Procura linhas com | **Actions** | ... |
      const re = new RegExp(`\\|\\s*\\*{0,2}${ptype}\\*{0,2}\\s*\\|([^|\\n]+(?:\\n>[^|\\n]+)*)\\|`, 'gi')
      let m
      while ((m = re.exec(section)) !== null) {
        const raw = m[1]
        // Limpar e dividir por <br>, vírgula ou nova linha
        const entries = raw
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/>\s*/g, '')   // remove > de blockquote
          .split(/[\n,]/)
          .map(s => s.trim())
          .filter(s => s && s !== '\\' && s !== '-')
        for (const entry of entries) {
          const cleaned = entry.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
          if (cleaned && cleaned.length > 1) {
            permissions.push({ action: cleaned, type: ptype })
          }
        }
      }
    }

    // Ignorar roles sem ID e sem permissões
    if (!id && permissions.length === 0) continue

    roles.push({
      name,
      id,
      description: description || `${name} built-in role.`,
      category: defaultCategory,
      permissions,
    })
  }

  return roles
}

// ── Classification ────────────────────────────────────────────────────────────

function deriveTier(role) {
  const allActions = role.permissions.filter(p => p.type === 'Actions').map(p => p.action)
  const notActions = role.permissions.filter(p => p.type === 'NotActions').map(p => p.action)
  const dataActions = role.permissions.filter(p => p.type === 'DataActions').map(p => p.action)

  const hasWildcard = allActions.includes('*')
  const blocksAuthWrite = notActions.some(a =>
    /Microsoft\.Authorization\/(roleAssignments|roleDefinitions|\*)\/?(write|delete|\*)/i.test(a) ||
    /Microsoft\.Authorization\/elevateAccess/i.test(a)
  )
  const hasAuthWrite = allActions.some(a =>
    a === '*' ||
    /Microsoft\.Authorization\/(roleAssignments|\*)\/?(write|\*)/i.test(a) ||
    /Microsoft\.Authorization\/elevateAccess/i.test(a)
  )
  const onlyRead = allActions.length > 0 && allActions.every(a => /\/read$/i.test(a) || a === '*/read') && dataActions.length === 0
  const onlyData = allActions.length === 0 && dataActions.length > 0

  if (hasWildcard && !blocksAuthWrite) return 'FullControl'
  if (hasAuthWrite) return 'AccessManagement'
  if (/security admin|rbac admin|policy contributor|key vault admin/i.test(role.name)) return 'AccessManagement'
  if (onlyRead) return 'Reader'
  if (onlyData) return 'DataPlane'
  if (hasWildcard && blocksAuthWrite) return 'Contributor'
  if (allActions.some(a => /\/\*$/i.test(a))) return 'Contributor'
  return 'Specialized'
}

const PRIVILEGED_PATTERNS = [
  /^owner$/i,
  /user access administrator/i,
  /role based access control administrator/i,
  /security admin/i,
  /security manager/i,
  /key vault administrator/i,
  /resource policy contributor/i,
  /virtual machine administrator login/i,
  /azure kubernetes service cluster admin/i,
  /management group contributor/i,
  /sql security manager/i,
  /storage blob data owner/i,
  /blueprint contributor/i,
]

function isPrivileged(role) {
  if (PRIVILEGED_PATTERNS.some(p => p.test(role.name))) return true
  const allActions = role.permissions.filter(p => p.type === 'Actions').map(p => p.action)
  if (allActions.includes('*') && !role.permissions.filter(p => p.type === 'NotActions').some(a => a.action.includes('Authorization'))) return true
  if (allActions.some(a => /roleAssignments\/write/i.test(a))) return true
  return false
}

function toSlug(name, seen) {
  const base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
  if (!seen[base]) { seen[base] = 1; return base }
  seen[base]++
  return `${base}-${seen[base]}`
}

// ── TypeScript generator ──────────────────────────────────────────────────────

function escapeStr(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function generateTs(roles) {
  const lines = []
  lines.push(`// Azure RBAC Built-in Roles — AUTO-GENERATED`)
  lines.push(`// Source: MicrosoftDocs/azure-docs (public GitHub)`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// Total: ${roles.length} roles`)
  lines.push(``)
  lines.push(`export type AzureRbacCategory =`)
  lines.push(`  | 'General' | 'Security' | 'Compute' | 'Storage' | 'Networking'`)
  lines.push(`  | 'Database' | 'Identity' | 'Monitoring' | 'Containers'`)
  lines.push(`  | 'AppService' | 'Integration' | 'Management' | 'AI'`)
  lines.push(``)
  lines.push(`export type AzureRbacTier =`)
  lines.push(`  | 'FullControl' | 'AccessManagement' | 'Contributor'`)
  lines.push(`  | 'DataPlane' | 'Reader' | 'Specialized'`)
  lines.push(``)
  lines.push(`export type AzurePermType = 'Actions' | 'NotActions' | 'DataActions' | 'NotDataActions'`)
  lines.push(``)
  lines.push(`export interface AzureRbacPermission {`)
  lines.push(`  action: string`)
  lines.push(`  type: AzurePermType`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`export interface AzureRbacRole {`)
  lines.push(`  name: string`)
  lines.push(`  slug: string`)
  lines.push(`  id: string`)
  lines.push(`  description: string`)
  lines.push(`  category: AzureRbacCategory`)
  lines.push(`  tier: AzureRbacTier`)
  lines.push(`  isPrivileged: boolean`)
  lines.push(`  permissionCount: number`)
  lines.push(`  assignableScopes: string[]`)
  lines.push(`  permissions: AzureRbacPermission[]`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`export const AZURE_TIER_META: Record<AzureRbacTier, {`)
  lines.push(`  label: string; short: string; description: string`)
  lines.push(`  bgColor: string; textColor: string; darkBg: string; darkText: string`)
  lines.push(`}> = {`)
  lines.push(`  FullControl:      { label: 'Full Control',      short: 'FC',  description: 'Grants unrestricted access to all resources including the ability to assign roles. Highest risk tier.',                      bgColor: '#fef2f2', textColor: '#dc2626', darkBg: '#450a0a', darkText: '#fca5a5' },`)
  lines.push(`  AccessManagement: { label: 'Access Management', short: 'AM',  description: 'Grants the ability to manage security configurations, role assignments, or identity services without full resource control.', bgColor: '#fff7ed', textColor: '#ea580c', darkBg: '#431407', darkText: '#fdba74' },`)
  lines.push(`  Contributor:      { label: 'Contributor',       short: 'CTB', description: 'Grants full write access to create and manage all resources but cannot assign roles or manage access to others.',            bgColor: '#fefce8', textColor: '#ca8a04', darkBg: '#422006', darkText: '#fde047' },`)
  lines.push(`  DataPlane:        { label: 'Data Plane',        short: 'DP',  description: 'Grants access to data stored within services (blobs, queues, secrets, keys) without management plane control.',                bgColor: '#f0f9ff', textColor: '#0284c7', darkBg: '#082f49', darkText: '#7dd3fc' },`)
  lines.push(`  Reader:           { label: 'Reader',            short: 'RDR', description: 'Grants read-only access to view existing resources. Cannot make changes or access sensitive data.',                           bgColor: '#f0fdf4', textColor: '#16a34a', darkBg: '#052e16', darkText: '#86efac' },`)
  lines.push(`  Specialized:      { label: 'Specialized',       short: 'SPZ', description: 'Service-specific operational role with a narrow, well-defined scope. Risk level varies by role.',                            bgColor: '#f5f3ff', textColor: '#7c3aed', darkBg: '#2e1065', darkText: '#c4b5fd' },`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`export const AZURE_ROLES: AzureRbacRole[] = [`)

  for (const role of roles) {
    lines.push(`  {`)
    lines.push(`    name: '${escapeStr(role.name)}',`)
    lines.push(`    slug: '${role.slug}',`)
    lines.push(`    id: '${role.id}',`)
    lines.push(`    description: '${escapeStr(role.description)}',`)
    lines.push(`    category: '${role.category}',`)
    lines.push(`    tier: '${role.tier}',`)
    lines.push(`    isPrivileged: ${role.isPrivileged},`)
    lines.push(`    permissionCount: ${role.permissions.length},`)
    lines.push(`    assignableScopes: ['/'],`)
    lines.push(`    permissions: [`)
    for (const p of role.permissions) {
      lines.push(`      { action: '${escapeStr(p.action)}', type: '${p.type}' },`)
    }
    lines.push(`    ],`)
    lines.push(`  },`)
  }

  lines.push(`]`)
  lines.push(``)
  return lines.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Buscando Azure Built-in Roles da documentação pública Microsoft...\n')

  const allRoles = []
  const seenNames = new Set()
  const seenSlugs = {}

  for (const { file, cat } of DOCS_CATEGORIES) {
    const url = `${BASE_URL}/${file}.md`
    process.stdout.write(`  ⬇  ${file.padEnd(30)}`)
    const markdown = await fetchUrl(url)
    if (!markdown) {
      console.log(`— não encontrado`)
      continue
    }
    const parsed = parseMarkdown(markdown, cat)
    let added = 0
    for (const role of parsed) {
      if (seenNames.has(role.name.toLowerCase())) continue
      seenNames.add(role.name.toLowerCase())
      const slug = toSlug(role.name, seenSlugs)
      const tier = deriveTier(role)
      const priv = isPrivileged(role)
      allRoles.push({ ...role, slug, tier, isPrivileged: priv })
      added++
    }
    console.log(`${parsed.length} encontradas, ${added} novas → total ${allRoles.length}`)
  }

  if (allRoles.length === 0) {
    console.error('\n❌ Nenhuma role encontrada. Verifique sua conexão com a internet.')
    process.exit(1)
  }

  // Sort by name
  allRoles.sort((a, b) => a.name.localeCompare(b.name))

  // Write TypeScript file
  const ts = generateTs(allRoles)
  fs.writeFileSync(OUTPUT_FILE, ts, 'utf-8')

  // Summary
  const byTier = {}
  const byCat = {}
  for (const r of allRoles) {
    byTier[r.tier] = (byTier[r.tier] || 0) + 1
    byCat[r.category] = (byCat[r.category] || 0) + 1
  }

  console.log(`\n✅ Gerado: src/data/azureRbac.ts`)
  console.log(`   Total: ${allRoles.length} roles\n`)
  console.log('Por Risk Tier:')
  for (const [t, c] of Object.entries(byTier).sort((a,b) => b[1]-a[1])) console.log(`  ${t.padEnd(20)} ${c}`)
  console.log('\nPor Categoria:')
  for (const [c, n] of Object.entries(byCat).sort((a,b) => b[1]-a[1])) console.log(`  ${c.padEnd(20)} ${n}`)
  console.log('\n🚀 Pronto! Rode: npm run dev\n')
}

main().catch(console.error)
