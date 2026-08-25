#!/usr/bin/env node
/**
 * Gera src/data/counts.ts — só números, nenhum dado.
 *
 * POR QUE ISTO EXISTE
 *   Sidebar e AppShell envolvem TODAS as páginas do site e importavam os
 *   datasets inteiros apenas para exibir `.length` num badge. Como são
 *   componentes compartilhados, os 2,5 MB de src/data/*.ts caíam no chunk
 *   comum: o build acusava ~436 kB de First Load JS em quase toda rota.
 *
 *   Um badge com "2381" não precisa das 2.381 roles no bundle. Este arquivo
 *   materializa as contagens em constantes, e os componentes de navegação
 *   passam a importar daqui.
 *
 * Rode depois de qualquer coletor que altere src/data/.
 *
 * Uso: node scripts/build-counts.js [--dry-run]
 */
const fs = require('fs')
const path = require('path')
const Module = require('module')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'src', 'data', 'counts.ts')
const DRY = process.argv.includes('--dry-run')


const { ROLES } = loadTs('src/data/roles.ts')
const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')
const { AWS_POLICIES, AWS_ACTION_COUNT, AWS_SERVICE_COUNT } = loadTs('src/data/aws.ts')
const { GCP_ROLES, GCP_PERMISSION_COUNT, GCP_SERVICE_COUNT } = loadTs('src/data/gcp.ts')
const { GWS_ROLES, GWS_SCOPES } = loadTs('src/data/googleWorkspace.ts')
const { IBM_ROLES, IBM_CLASSIC_PERMISSIONS } = loadTs('src/data/ibmCloud.ts')
// IBM não tem contagem de action: a IBM não publica action por role — cada
// serviço mapeia as próprias ações para as 7 roles do IAM. O número anterior
// (557) vinha de 'actions' que eram prosa escrita por nós.
const { IBM_ACCESS_PRIMITIVES } = loadTs('src/data/ibmAccessPrimitives.ts')
const { API_PERMISSIONS } = loadTs('src/data/apiPermissions.ts')
const { SOD_RULES } = loadTs('src/data/sod/rules.ts')

const entraActions = new Set(ROLES.flatMap((r) => (r.permissions ?? []).map((p) => p.action)))
// Privilégios do GWS vêm do catálogo oficial, não das roles: o Google não
// publica o mapa role->privilégio (só via privileges.list, com OAuth), então
// derivar daqui daria um número que reflete a lacuna, não o catálogo.
const { GWS_PRIVILEGES } = loadTs('src/data/googleWorkspace.ts')

// Providers do Azure: não sai de src/data — vem do _meta do índice gerado por
// scripts/build-azure-providers.js. É o número DISTINTO (case-insensitive),
// que é o que vira rota; o cru (158) fica só no _meta.
let azureProviders = 0
try {
  azureProviders = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public', 'azure-providers', 'index.json'), 'utf8'),
  )._meta.providers
} catch { /* rode scripts/build-azure-providers.js antes */ }

const counts = {
  ENTRA_ROLES_COUNT: ROLES.length,
  ENTRA_ACTIONS_COUNT: entraActions.size,
  ENTRA_API_PERMISSIONS_COUNT: API_PERMISSIONS.length,
  AZURE_ROLES_COUNT: AZURE_ROLES.length,
  AZURE_PROVIDERS_COUNT: azureProviders,
  AWS_POLICIES_COUNT: AWS_POLICIES.length,
  AWS_ACTIONS_COUNT: AWS_ACTION_COUNT ?? 0,
  AWS_SERVICES_COUNT: AWS_SERVICE_COUNT ?? 0,
  GCP_ROLES_COUNT: GCP_ROLES.length,
  GCP_PERMISSIONS_COUNT: GCP_PERMISSION_COUNT ?? 0,
  GCP_SERVICES_COUNT: GCP_SERVICE_COUNT ?? 0,
  GWS_ROLES_COUNT: GWS_ROLES.length,
  GWS_SCOPES_COUNT: GWS_SCOPES.length,
  GWS_PRIVILEGES_COUNT: GWS_PRIVILEGES.length,
  IBM_ROLES_COUNT: IBM_ROLES.length,
  IBM_ACCESS_PRIMITIVES_COUNT: IBM_ACCESS_PRIMITIVES.length,
  IBM_CLASSIC_PERMISSIONS_COUNT: IBM_CLASSIC_PERMISSIONS.length,
  SOD_RULES_COUNT: SOD_RULES.length,
}

for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(30)} ${v}`)

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

const body = Object.entries(counts)
  .map(([k, v]) => `export const ${k} = ${v}`)
  .join('\n')

fs.writeFileSync(OUT, `// AUTO-GERADO por scripts/build-counts.js — não editar à mão.
// Gerado em: ${new Date().toISOString()}
//
// Só contagens. Existe para que Sidebar e AppShell — que envolvem todas as
// páginas — possam exibir badges sem arrastar os 2,5 MB de src/data/*.ts para
// o chunk compartilhado do cliente.
//
// Rode este script novamente depois de qualquer coleta que altere os datasets.

${body}
`)
console.log(`\nEscrito: src/data/counts.ts`)
