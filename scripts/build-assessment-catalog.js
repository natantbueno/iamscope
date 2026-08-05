#!/usr/bin/env node
/**
 * Gera public/iamscope-catalog.json — o que o script de assessment precisa
 * saber sobre roles para classificar o tenant do usuário.
 *
 * POR QUE UM CATÁLOGO ÚNICO
 *   O .ps1 roda na máquina de terceiro e não lê TypeScript. Precisa, para cada
 *   role encontrada no tenant: o tier, se é privilegiada e o nome oficial.
 *   Publicar isso como JSON evita uma segunda cópia dos dados dentro do script,
 *   que sairia de sincronia com o site na primeira atualização de dataset.
 *
 *   Inclui também as regras de SoD, porque o assessment absorveu essa análise
 *   (antes num script separado) e não faz sentido baixar dois arquivos.
 *
 * MAPEAMENTO DE TIER
 *   O site classifica Entra por eamTier e Azure por tier, com vocabulários
 *   diferentes. O assessment precisa de uma escala comum, então ambos são
 *   normalizados para o nível 0/1/2 do Enterprise Access Model — o mesmo
 *   modelo usado na página de comparação.
 *
 *   ATENÇÃO: tier é classificação editorial do IAM Scope, não da Microsoft.
 *   O relatório precisa dizer isso.
 *
 * Uso: node scripts/build-assessment-catalog.js [--dry-run]
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'iamscope-catalog.json')
const DRY = process.argv.includes('--dry-run')

const { ROLES } = loadTs('src/data/roles.ts')
const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')
const { SOD_RULES, SOD_CATEGORY_META } = loadTs('src/data/sod/rules.ts')

/** eamTier do Entra -> nível EAM 0/1/2 */
const ENTRA_TIER_LEVEL = {
  ControlPlane: 0,
  ManagementPlane: 1,
  UserAccess: 2,
}

/**
 * tier do Azure -> nível EAM 0/1/2.
 * FullControl e AccessManagement mexem em quem tem acesso, então são Tier 0.
 * Contributor cria e destrói recurso sem mexer em acesso: Tier 1.
 * Reader e DataPlane ficam no plano de workload.
 */
const AZURE_TIER_LEVEL = {
  FullControl: 0,
  AccessManagement: 0,
  Contributor: 1,
  Specialized: 1,
  DataPlane: 2,
  Reader: 2,
}

const entra = ROLES.map((r) => ({
  templateId: r.id,
  name: r.name,
  slug: r.slug,
  category: r.category,
  eamTier: r.eamTier,
  tierLevel: ENTRA_TIER_LEVEL[r.eamTier] ?? 2,
  isPrivileged: !!r.isPrivileged,
  permissionCount: r.permissionCount ?? (r.permissions?.length ?? 0),
}))

const azure = AZURE_ROLES.map((r) => ({
  roleDefinitionId: r.id,
  name: r.name,
  slug: r.slug,
  category: r.category,
  tier: r.tier,
  tierLevel: AZURE_TIER_LEVEL[r.tier] ?? 2,
  isPrivileged: !!r.isPrivileged,
  permissionCount: r.permissionCount ?? 0,
}))

// Regras de SoD com os GUIDs resolvidos (mesma lógica de build-sod-rules-json)
const entraBySlug = new Map(ROLES.map((r) => [r.slug, r]))
const azureBySlug = new Map(AZURE_ROLES.map((r) => [r.slug, r]))
const naoResolvidas = []

function refRole(ref) {
  if (ref.cloud === 'entra-id') {
    const r = entraBySlug.get(ref.id)
    if (!r) { naoResolvidas.push(`entra-id:${ref.id}`); return null }
    return { cloud: 'entra-id', name: r.name, templateId: r.id, slug: r.slug }
  }
  const r = azureBySlug.get(ref.id)
  if (!r) { naoResolvidas.push(`azure-rbac:${ref.id}`); return null }
  return { cloud: 'azure-rbac', name: r.name, roleDefinitionId: r.id, slug: r.slug }
}

const sod = SOD_RULES.map((rule) => ({
  id: rule.id,
  name: rule.name,
  severity: rule.severity,
  category: SOD_CATEGORY_META?.[rule.category]?.label ?? rule.category,
  roleA: refRole(rule.roleA),
  roleB: refRole(rule.roleB),
  risk: rule.risk,
  mitigation: rule.mitigation,
}))

if (naoResolvidas.length) {
  console.error(`\n${naoResolvidas.length} referência(s) de role não resolvida(s):`)
  for (const u of [...new Set(naoResolvidas)]) console.error(`  - ${u}`)
  process.exitCode = 1
  return
}

const catalogo = {
  generatedAt: new Date().toISOString(),
  source: 'IAM Scope',
  /** Aviso que o relatório deve reproduzir. */
  disclaimer: 'Tier e classificacao de privilegio sao editoriais do IAM Scope, '
    + 'derivados das permissoes oficiais de cada role. Nao sao classificacao '
    + 'da Microsoft.',
  entraRoles: entra,
  azureRoles: azure,
  sodRules: sod,
}

const porNivel = (arr) => arr.reduce((a, r) => { a[r.tierLevel] = (a[r.tierLevel] ?? 0) + 1; return a }, {})

console.log(`Entra roles       : ${entra.length}  (${entra.filter((r) => r.isPrivileged).length} privilegiadas)`)
console.log(`  por tier level  : ${JSON.stringify(porNivel(entra))}`)
console.log(`Azure roles       : ${azure.length}  (${azure.filter((r) => r.isPrivileged).length} privilegiadas)`)
console.log(`  por tier level  : ${JSON.stringify(porNivel(azure))}`)
console.log(`Regras de SoD     : ${sod.length}`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

fs.writeFileSync(OUT, JSON.stringify(catalogo))
console.log(`\nEscrito: public/iamscope-catalog.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
