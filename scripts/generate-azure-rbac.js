#!/usr/bin/env node
/**
 * generate-azure-rbac.js
 *
 * Gera o arquivo src/data/azureRbac.ts com TODAS as roles built-in do Azure RBAC.
 *
 * PRÉ-REQUISITO: Azure CLI autenticado
 *   az login
 *   az account set --subscription <subscription-id>
 *
 * COMO USAR:
 *   1. az role definition list --all > scripts/azure-roles-raw.json
 *   2. node scripts/generate-azure-rbac.js
 *
 * O script irá gerar/sobrescrever src/data/azureRbac.ts automaticamente.
 */

const fs = require('fs')
const path = require('path')

// ── Configurações ────────────────────────────────────────────────────────────

const INPUT_FILE  = path.join(__dirname, 'azure-roles-raw.json')
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'azureRbac.ts')

// ── Classificação de Categoria ───────────────────────────────────────────────

function deriveCategory(role) {
  const name = role.roleName.toLowerCase()
  const actions = role.permissions.flatMap(p => [...(p.actions || []), ...(p.dataActions || [])]).join(' ').toLowerCase()

  if (/key vault|security|defender|sentinel|microsoft\.security/.test(name + actions)) return 'Security'
  if (/cognitive|machine learning|openai|azure ai|azure ml|bot service/.test(name + actions)) return 'AI'
  if (/kubernetes|container registry|acr|aks|container instance/.test(name + actions)) return 'Containers'
  if (/virtual machine|vm |compute|disk snapshot|gallery|avset|vmss|desktop virtualization/.test(name)) return 'Compute'
  if (/storage|blob|queue|table|file share|data lake/.test(name + actions)) return 'Storage'
  if (/sql|cosmos|database|postgresql|mysql|mariadb|redis|data factory|synapse/.test(name + actions)) return 'Database'
  if (/network|dns|load balancer|firewall|vpn|express route|front door|cdn|traffic manager|private endpoint/.test(name + actions)) return 'Networking'
  if (/managed identity|attestation|confidential/.test(name + actions)) return 'Identity'
  if (/monitor|log analytics|application insights|metric|alert|diagnostic/.test(name + actions)) return 'Monitoring'
  if (/web site|web plan|app service|function|static web|api management|app configuration/.test(name + actions)) return 'AppService'
  if (/logic app|service bus|event grid|event hub|relay|integration|signalr|notification hub|iot/.test(name + actions)) return 'Integration'
  if (/management group|policy|blueprint|resource policy|cost|billing|subscription/.test(name + actions)) return 'Management'
  if (/authorization|role|access|user access admin/.test(name)) return 'General'
  return 'General'
}

// ── Classificação de Risk Tier ───────────────────────────────────────────────

function deriveTier(role) {
  const allActions = role.permissions.flatMap(p => p.actions || [])
  const notActions = role.permissions.flatMap(p => p.notActions || [])
  const dataActions = role.permissions.flatMap(p => p.dataActions || [])
  const notDataActions = role.permissions.flatMap(p => p.notDataActions || [])

  const hasWildcard = allActions.includes('*')
  const blocksAuthWrite = notActions.some(a =>
    a.includes('Microsoft.Authorization/*/Write') ||
    a.includes('Microsoft.Authorization/*/write') ||
    a.includes('Microsoft.Authorization/*/Delete') ||
    a.includes('Microsoft.Authorization/*/delete') ||
    a.includes('Microsoft.Authorization/elevateAccess')
  )
  const hasAuthWrite = allActions.some(a =>
    a === '*' ||
    a.toLowerCase().includes('microsoft.authorization/roleassignments/write') ||
    a.toLowerCase().includes('microsoft.authorization/*/write') ||
    a.toLowerCase() === 'microsoft.authorization/elevateaccess/action'
  )
  const hasAuthDelete = allActions.some(a =>
    a.toLowerCase().includes('microsoft.authorization/roleassignments/delete') ||
    a.toLowerCase().includes('microsoft.authorization/*/delete')
  )
  const onlyRead = allActions.every(a => a.endsWith('/read') || a === '*/read') && dataActions.length === 0
  const onlyData = allActions.length === 0 && dataActions.length > 0

  // Full Control: wildcard without blocking auth writes
  if (hasWildcard && !blocksAuthWrite) return 'FullControl'

  // Access Management: can assign roles or manage security configs
  if (hasAuthWrite || (hasAuthDelete && !hasWildcard)) return 'AccessManagement'
  if (/security admin|rbac admin|policy contributor|key vault admin/i.test(role.roleName)) return 'AccessManagement'

  // Reader: only read permissions
  if (onlyRead) return 'Reader'

  // Data Plane: only data actions
  if (onlyData) return 'DataPlane'

  // Contributor: broad write but no auth management
  if (hasWildcard && blocksAuthWrite) return 'Contributor'
  if (allActions.some(a => a.endsWith('/*') && !a.includes('Authorization'))) return 'Contributor'

  return 'Specialized'
}

// ── Privileged flag ──────────────────────────────────────────────────────────

const PRIVILEGED_PATTERNS = [
  /owner/i,
  /user access administrator/i,
  /role based access control administrator/i,
  /security admin/i,
  /security manager/i,
  /key vault administrator/i,
  /global administrator/i,
  /resource policy contributor/i,
  /virtual machine administrator login/i,
  /azure kubernetes service cluster admin/i,
  /management group contributor/i,
  /sql security manager/i,
  /storage blob data owner/i,
  /blueprint contributor/i,
]

function isPrivileged(role) {
  const name = role.roleName
  if (PRIVILEGED_PATTERNS.some(p => p.test(name))) return true
  const allActions = role.permissions.flatMap(p => p.actions || [])
  if (allActions.includes('*') && !role.permissions.flatMap(p => p.notActions || []).some(a => a.includes('Authorization'))) return true
  if (allActions.some(a => a.toLowerCase().includes('microsoft.authorization/roleassignments/write'))) return true
  return false
}

// ── Slug ─────────────────────────────────────────────────────────────────────

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ── Flatten permissions ──────────────────────────────────────────────────────

function flattenPermissions(permissions) {
  const result = []
  for (const perm of permissions) {
    for (const a of (perm.actions || []))        result.push({ action: a, type: 'Actions' })
    for (const a of (perm.notActions || []))     result.push({ action: a, type: 'NotActions' })
    for (const a of (perm.dataActions || []))    result.push({ action: a, type: 'DataActions' })
    for (const a of (perm.notDataActions || [])) result.push({ action: a, type: 'NotDataActions' })
  }
  return result
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`\n❌ Arquivo não encontrado: ${INPUT_FILE}`)
  console.error(`\nRode primeiro:\n  az role definition list --all > scripts/azure-roles-raw.json\n`)
  process.exit(1)
}

console.log('📖 Lendo azure-roles-raw.json...')
const raw = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))

// Filter only built-in roles
const builtIn = raw.filter(r => r.roleType === 'BuiltInRole' || r.isCustom === false)
console.log(`✅ ${builtIn.length} roles built-in encontradas`)

// Track duplicate slugs
const slugCount = {}
function uniqueSlug(name) {
  const base = toSlug(name)
  if (!slugCount[base]) { slugCount[base] = 1; return base }
  slugCount[base]++
  return `${base}-${slugCount[base]}`
}

const roles = builtIn.map(role => {
  const perms = flattenPermissions(role.permissions || [])
  const slug = uniqueSlug(role.roleName)
  // Extract GUID from id or use name field
  const id = role.name || (role.id ? role.id.split('/').pop() : '')

  return {
    name: role.roleName,
    slug,
    id,
    description: (role.description || '').replace(/'/g, "\\'").replace(/\n/g, ' ').trim(),
    category: deriveCategory(role),
    tier: deriveTier(role),
    isPrivileged: isPrivileged(role),
    permissionCount: perms.length,
    assignableScopes: role.assignableScopes || ['/'],
    permissions: perms,
  }
})

// Sort by name
roles.sort((a, b) => a.name.localeCompare(b.name))

// ── Generate TypeScript ──────────────────────────────────────────────────────

function escapeStr(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

const lines = []

lines.push(`// Azure RBAC Built-in Roles — AUTO-GENERATED`)
lines.push(`// Source: az role definition list --all`)
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
  lines.push(`    permissionCount: ${role.permissionCount},`)
  lines.push(`    assignableScopes: ${JSON.stringify(role.assignableScopes)},`)
  lines.push(`    permissions: [`)
  for (const p of role.permissions) {
    lines.push(`      { action: '${escapeStr(p.action)}', type: '${p.type}' },`)
  }
  lines.push(`    ],`)
  lines.push(`  },`)
}

lines.push(`]`)
lines.push(``)

const output = lines.join('\n')
fs.writeFileSync(OUTPUT_FILE, output, 'utf-8')

// Summary
const byTier = {}
const byCategory = {}
for (const r of roles) {
  byTier[r.tier] = (byTier[r.tier] || 0) + 1
  byCategory[r.category] = (byCategory[r.category] || 0) + 1
}

console.log(`\n✅ Arquivo gerado: src/data/azureRbac.ts`)
console.log(`   Total: ${roles.length} roles\n`)
console.log('Por Risk Tier:')
for (const [tier, count] of Object.entries(byTier).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${tier.padEnd(20)} ${count}`)
}
console.log('\nPor Categoria:')
for (const [cat, count] of Object.entries(byCategory).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${cat.padEnd(20)} ${count}`)
}
console.log('\n🚀 Pronto! Rode: npm run dev\n')
