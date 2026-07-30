#!/usr/bin/env node
/**
 * Gera public/sod-rules.json a partir de src/data/sod/rules.ts.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *   O script PowerShell que o usuário roda no tenant precisa das 96 regras de
 *   SoD. Ele não pode ler TypeScript, e reescrever as regras dentro do .ps1
 *   criaria uma segunda cópia que sairia de sincronia com o site na primeira
 *   alteração. Então o site publica as regras como JSON e o script baixa (ou
 *   lê de um arquivo local).
 *
 *   O JSON acrescenta o que o TypeScript não tem e o script precisa: o GUID de
 *   cada role. As regras referenciam roles por SLUG (para linkar as páginas do
 *   site); no tenant, o que existe são roleTemplateId (Entra) e
 *   roleDefinitionId (Azure RBAC). A resolução slug -> GUID acontece aqui.
 *
 * O TS é transpilado com sucrase e carregado de verdade, em vez de parseado com
 * regex: assim uma vírgula fora do lugar vira erro em vez de dado faltando em
 * silêncio.
 *
 * Uso:
 *   node scripts/build-sod-rules-json.js
 *   node scripts/build-sod-rules-json.js --dry-run
 */
const fs = require('fs')
const path = require('path')
const Module = require('module')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'sod-rules.json')
const DRY = process.argv.includes('--dry-run')

let transform
try {
  ({ transform } = require(path.join(ROOT, 'node_modules', 'sucrase')))
} catch {
  console.error('sucrase não encontrado em node_modules. Rode `npm install` primeiro.')
  process.exitCode = 1
  return
}

/** Carrega um módulo .ts transpilando na hora, resolvendo o alias @/ */
function loadTs(relPath) {
  const abs = path.join(ROOT, relPath)
  const src = fs.readFileSync(abs, 'utf8')
  const { code } = transform(src, { transforms: ['typescript', 'imports'], filePath: abs })
  const m = new Module(abs, null)
  m.filename = abs
  m.paths = Module._nodeModulePaths(path.dirname(abs))
  m._compile(code, abs)
  return m.exports
}

const { SOD_RULES, SOD_CATEGORY_META, SOD_SEVERITY_META } = loadTs('src/data/sod/rules.ts')
const { ROLES } = loadTs('src/data/roles.ts')
const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')

const entraBySlug = new Map(ROLES.map((r) => [r.slug, r]))
const azureBySlug = new Map(AZURE_ROLES.map((r) => [r.slug, r]))

const unresolved = []

function resolveRole(ref) {
  if (ref.cloud === 'entra-id') {
    const r = entraBySlug.get(ref.id)
    if (!r) { unresolved.push(`entra-id:${ref.id}`); return null }
    return {
      cloud: 'entra-id',
      slug: r.slug,
      name: r.name,
      // roleTemplateId — é isso que aparece em directoryRoles do Graph
      templateId: r.id,
      isPrivileged: r.isPrivileged ?? null,
      tier: r.eamTier ?? null,
    }
  }
  const r = azureBySlug.get(ref.id)
  if (!r) { unresolved.push(`azure-rbac:${ref.id}`); return null }
  return {
    cloud: 'azure-rbac',
    slug: r.slug,
    name: r.name,
    // GUID do roleDefinition — o roleDefinitionId do assignment termina nele
    roleDefinitionId: r.id,
    isPrivileged: r.isPrivileged ?? null,
    tier: r.tier ?? null,
  }
}

const rules = SOD_RULES.map((rule) => ({
  id: rule.id,
  name: rule.name,
  description: rule.description,
  severity: rule.severity,
  category: rule.category,
  categoryLabel: SOD_CATEGORY_META?.[rule.category]?.label ?? rule.category,
  cloud: rule.cloud,
  roleA: resolveRole(rule.roleA),
  roleB: resolveRole(rule.roleB),
  rationale: rule.rationale,
  risk: rule.risk,
  mitigation: rule.mitigation,
  references: rule.references,
  frameworks: rule.frameworks,
}))

if (unresolved.length) {
  console.error(`\n${unresolved.length} referência(s) de role não resolvida(s):`)
  for (const u of [...new Set(unresolved)]) console.error(`  - ${u}`)
  console.error('\nUma regra apontando para um slug inexistente nunca dispararia no tenant.')
  process.exitCode = 1
  return
}

const bySeverity = {}
for (const r of rules) bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1
const byCloud = {}
for (const r of rules) byCloud[r.cloud] = (byCloud[r.cloud] ?? 0) + 1

console.log(`Regras            : ${rules.length}`)
console.log(`Por severidade    : ${JSON.stringify(bySeverity)}`)
console.log(`Por cloud         : ${JSON.stringify(byCloud)}`)
console.log(`Roles Entra únicas: ${new Set(rules.flatMap((r) => [r.roleA, r.roleB]).filter((r) => r.cloud === 'entra-id').map((r) => r.templateId)).size}`)
console.log(`Roles Azure únicas: ${new Set(rules.flatMap((r) => [r.roleA, r.roleB]).filter((r) => r.cloud === 'azure-rbac').map((r) => r.roleDefinitionId)).size}`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'IAM Scope — SoD Analyzer',
  ruleCount: rules.length,
  severityMeta: SOD_SEVERITY_META ?? null,
  rules,
}, null, 2))

console.log(`\nEscrito: public/sod-rules.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
