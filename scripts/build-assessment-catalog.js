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

// ── Regras de SoD ───────────────────────────────────────────────────────────
//
// O CORTE, E POR QUE ELE É DECLARADO EM VEZ DE SILENCIOSO
//   Os dois .ps1 de assessment falam com o Microsoft Graph e com o Azure
//   Resource Manager. Eles não enumeram conta AWS, projeto GCP nem tenant do
//   Google Workspace — então exportar regra dessas plataformas faria o
//   relatório dizer "0 conflitos" sobre o que o script sequer visitou, que é
//   pior do que dizer que não cobre. É a mesma decisão, e o mesmo campo
//   `scope`, de build-sod-rules-json.js.
//
//   Mudar de ideia é mudar ESTA lista; o resto do arquivo se ajusta sozinho.
const EXPORTADAS = ['entra-id', 'azure-rbac']

const entraBySlug = new Map(ROLES.map((r) => [r.slug, r]))
const azureBySlug = new Map(AZURE_ROLES.map((r) => [r.slug, r]))

/**
 * Uma entrada por plataforma que o SoD pode citar — inclusive as que este
 * catálogo não exporta, que resolvem para `null` de propósito.
 *
 * ISTO EXISTE POR CAUSA DE UM BUG REAL. A versão anterior tratava 'entra-id'
 * e mandava TODO o resto para o mapa do Azure, num `else`. Quando o SoD virou
 * multi-cloud em 07/08/2026 (190 regras, 5 plataformas), as 133 referências de
 * AWS, GCP e Workspace passaram a ser procuradas entre roles do Azure e, é
 * claro, não resolviam — e como referência não resolvida aborta o script,
 * `public/iamscope-catalog.json` PAROU DE SER GERADO. Ficou congelado em
 * 01/08/2026, com tier e privilégio de datasets que já foram recoletados
 * desde então. O sintoma anunciado era "faltam regras de SoD"; o efeito real
 * era o arquivo inteiro parado.
 *
 * Por isso plataforma sem entrada aqui é ERRO ALTO, e não um `else` que chuta:
 * foi exatamente o `else` que escondeu o problema por dezoito dias.
 */
const RESOLVEDORES = {
  'entra-id':   (id) => {
    const r = entraBySlug.get(id)
    return r ? { cloud: 'entra-id', name: r.name, templateId: r.id, slug: r.slug } : null
  },
  'azure-rbac': (id) => {
    const r = azureBySlug.get(id)
    return r ? { cloud: 'azure-rbac', name: r.name, roleDefinitionId: r.id, slug: r.slug } : null
  },
  // Fora do escopo dos .ps1 — conhecidas, e por isso silenciosas em vez de erro.
  'aws':              () => null,
  'gcp':              () => null,
  'google-workspace': () => null,
}

/**
 * Plataforma nova em SoDPlatform tem de PARAR este script.
 *
 * A checagem roda sobre as 190 regras, antes e independente do filtro de
 * escopo — se dependesse dele, uma plataforma nova simplesmente cairia fora de
 * EXPORTADAS e sumiria em silêncio, que é o mesmo desfecho do `else` que
 * causou o bug original. Aqui a pergunta é outra: "este script SABE que esta
 * plataforma existe?". Ele precisa saber de todas, inclusive das que não
 * exporta.
 */
const plataformasDesconhecidas = [...new Set(
  SOD_RULES.flatMap((r) => [r.roleA.cloud, r.roleB.cloud]).filter((c) => !(c in RESOLVEDORES)),
)]
if (plataformasDesconhecidas.length) {
  console.error(`\nPlataforma de SoD que este script não conhece: ${plataformasDesconhecidas.join(', ')}`)
  console.error('Acrescente uma entrada em RESOLVEDORES — e decida se ela entra em EXPORTADAS.')
  process.exitCode = 1
  return
}

const naoResolvidas = []

function refRole(ref) {
  const resolver = RESOLVEDORES[ref.cloud]
  if (!resolver) {
    // SoDPlatform ganhou um valor novo e ninguém avisou este script.
    naoResolvidas.push(`plataforma desconhecida "${ref.cloud}" (${ref.id}) — acrescente-a em RESOLVEDORES`)
    return null
  }
  const r = resolver(ref.id)
  // O prefixo vem da própria referência. Era 'azure-rbac:' cravado, o que
  // fazia a lista de erro anunciar slug de GCP como se fosse do Azure.
  if (!r && EXPORTADAS.includes(ref.cloud)) naoResolvidas.push(`${ref.cloud}:${ref.id}`)
  return r
}

/** A regra inteira entra só se as DUAS pontas estiverem no escopo exportado. */
const noEscopo = (rule) =>
  EXPORTADAS.includes(rule.roleA.cloud) && EXPORTADAS.includes(rule.roleB.cloud)

const foraDoEscopo = SOD_RULES.filter((rule) => !noEscopo(rule))

const sod = SOD_RULES.filter(noEscopo).map((rule) => ({
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
  console.error(`\n${naoResolvidas.length} referência(s) de role não resolvida(s) DENTRO do escopo:`)
  for (const u of [...new Set(naoResolvidas)]) console.error(`  - ${u}`)
  console.error('\nIsto é erro de dado, não de escopo: a plataforma é exportada e o slug não existe.')
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
  /**
   * O corte, dito no arquivo — o mesmo contrato de build-sod-rules-json.js.
   * Sem isto o consumidor não tem como distinguir "nenhum conflito" de
   * "plataforma não coberta".
   */
  sodScope: {
    platforms: EXPORTADAS,
    exportedRules: sod.length,
    catalogRules: SOD_RULES.length,
    skippedRules: foraDoEscopo.length,
    note: 'Os .ps1 enumeram apenas Microsoft Entra ID e Azure RBAC. Regras de AWS, '
      + 'GCP e Google Workspace existem no catalogo do site e ficam fora daqui de '
      + 'proposito: relatar "0 conflitos" sobre plataforma nao visitada seria falso.',
  },
}

const porNivel = (arr) => arr.reduce((a, r) => { a[r.tierLevel] = (a[r.tierLevel] ?? 0) + 1; return a }, {})

console.log(`Entra roles       : ${entra.length}  (${entra.filter((r) => r.isPrivileged).length} privilegiadas)`)
console.log(`  por tier level  : ${JSON.stringify(porNivel(entra))}`)
console.log(`Azure roles       : ${azure.length}  (${azure.filter((r) => r.isPrivileged).length} privilegiadas)`)
console.log(`  por tier level  : ${JSON.stringify(porNivel(azure))}`)
console.log(`Regras de SoD     : ${sod.length} de ${SOD_RULES.length} do catálogo`)
console.log(`  escopo          : ${EXPORTADAS.join(', ')}`)
console.log(`  fora do escopo  : ${foraDoEscopo.length} regra(s) — declarado em sodScope`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

fs.writeFileSync(OUT, JSON.stringify(catalogo))
console.log(`\nEscrito: public/iamscope-catalog.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
