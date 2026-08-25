#!/usr/bin/env node
/**
 * Verifica qual item da sidebar acende em CADA rota do site.
 *
 * POR QUE EXISTE
 *   Em 03/08 a página /aws/actions destacava "IAM Policies" na sidebar. A causa
 *   era `trailingSlash: true`: o pathname real é `/aws/actions/`, e a derivação
 *   da view usava `endsWith('/actions')`, que nunca casa com a barra no fim.
 *   Quatro páginas estavam erradas e ninguém tinha percebido, porque conferir
 *   isso à mão exige abrir rota por rota.
 *
 *   O erro é invisível para o build, para o TypeScript e para os outros
 *   verificadores: o site compila, renderiza e navega — só destaca a coisa
 *   errada. É exatamente o tipo de defeito que precisa de teste.
 *
 * COMO FUNCIONA
 *   Reimplementa `platform` e `view` do AppShell e compara com o esperado,
 *   declarado abaixo. Reimplementar é ruim (duas cópias da regra), mas
 *   importar o AppShell exigiria React e um DOM — e a regra é pequena o
 *   bastante para que a duplicação valha o custo. Se divergirem, este arquivo
 *   passa e o site quebra: por isso o teste inclui a lista COMPLETA de rotas,
 *   conferida contra src/app.
 *
 * Uso: node scripts/check-sidebar-focus.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const APP = path.join(ROOT, 'src', 'app')

// ── Cópia da lógica do AppShell ─────────────────────────────────────────────
function derivar(pathname) {
  const isGws = pathname.startsWith('/google-workspace')
  const isAzureRbac = pathname.startsWith('/azure-rbac')
  const isIbm = pathname.startsWith('/ibm-cloud')
  const isGcp = pathname.startsWith('/gcp')
  const isAws = pathname.startsWith('/aws')
  const isHome = pathname === '/'
  // Espelha GLOBAL_HREFS de src/components/Sidebar.tsx.
  const GLOBAIS = ['/permission-scope', '/advisor', '/compare', '/evaluate', '/sod',
    '/assessment', '/tier-comparison', '/stats', '/changelog', '/info', '/search']
  const isGlobal = GLOBAIS.some((href) => pathname === href || pathname.startsWith(`${href}/`))

  const platform = isGlobal ? 'global'
    : isGws ? 'googleWorkspace'
    : isAzureRbac ? 'azureRbac'
    : isIbm ? 'ibmCloud'
    : isGcp ? 'gcp'
    : isAws ? 'aws'
    : isHome ? 'home'
    : 'entraId'

  const rota = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/'

  let view
  if (['/', '/entraid', '/azure-rbac', '/google-workspace', '/ibm-cloud', '/gcp', '/aws'].includes(rota)) view = 'dashboard'
  else if (rota.startsWith('/entraid/api-permissions') || rota.startsWith('/google-workspace/api-permissions') || rota.startsWith('/azure-rbac/permissions')) view = 'apiPermissions'
  else if (rota.startsWith('/azure-rbac/providers')) view = 'providers'
  else if (rota.startsWith('/entraid/role-actions')) view = 'roleActions'
  else if (rota.startsWith('/entraid/pim')) view = 'pim'
  else if (['/entraid/reference', '/azure-rbac/reference', '/google-workspace/reference', '/ibm-cloud/reference', '/gcp/reference', '/aws/reference'].some((p) => rota.startsWith(p))) view = 'reference'
  else if (rota.startsWith('/info')) view = 'info'
  else if (rota.startsWith('/aws/scp-vs-identity-policies')) view = 'scp'
  else if (rota.startsWith('/ibm-cloud/access-groups')) view = 'accessGroups'
  else if (rota.startsWith('/ibm-cloud/classic')) view = 'classic'
  else if (rota.endsWith('/permissions') || rota.endsWith('/actions') || rota.endsWith('/verbs') || rota.endsWith('/privileges')) view = 'actions'
  else view = 'roles'

  return { platform, view }
}

/**
 * Rótulo do item que deve acender, por plataforma e view — espelha os
 * `active={view === '...'}` de Sidebar.tsx.
 */
const ITEM = {
  // Página global não acende item de plataforma nenhum: a sidebar dela só tem
  // a lista de clouds, e a ferramenta ativa é destacada pelo bloco de cima,
  // por pathname — não por `view`.
  global: {},
  entraId: { dashboard: 'Dashboard', roles: 'Built-in Roles', roleActions: 'Role Actions', apiPermissions: 'API Permissions', pim: 'PIM', reference: 'Reference', info: '(nenhum)', actions: '(nenhum)' },
  azureRbac: { dashboard: 'Dashboard', roles: 'Built-in Roles', apiPermissions: 'Permissões', providers: 'Providers', reference: 'Reference', actions: '(nenhum)', info: '(nenhum)', roleActions: '(nenhum)', pim: '(nenhum)' },
  aws: { dashboard: 'Dashboard', roles: 'IAM Policies', actions: 'IAM Actions', reference: 'Reference', scp: 'SCP vs Policies', apiPermissions: '(nenhum)', info: '(nenhum)', roleActions: '(nenhum)', pim: '(nenhum)' },
  gcp: { dashboard: 'Dashboard', roles: 'IAM Roles', actions: 'IAM Permissions', reference: 'Reference', apiPermissions: '(nenhum)', info: '(nenhum)', roleActions: '(nenhum)', pim: '(nenhum)' },
  googleWorkspace: { dashboard: 'Dashboard', roles: 'Admin Roles', apiPermissions: 'OAuth Scopes', actions: 'Admin Privileges', reference: 'Reference', info: '(nenhum)', roleActions: '(nenhum)', pim: '(nenhum)' },
  ibmCloud: { dashboard: 'Dashboard', roles: 'IAM Roles', classic: 'Classic Infrastructure', reference: 'Reference', accessGroups: 'Access Groups & Trusted Profiles', actions: '(nenhum)', apiPermissions: '(nenhum)', info: '(nenhum)', roleActions: '(nenhum)', pim: '(nenhum)' },
  home: { dashboard: '(home)', roles: '(home)', actions: '(home)', reference: '(home)', apiPermissions: '(home)', info: '(home)', roleActions: '(home)', pim: '(home)' },
}

/**
 * O que CADA rota deve destacar. Escrito à mão de propósito: é a especificação,
 * não pode ser derivada da mesma lógica que está sendo testada.
 *
 * As rotas vêm com barra no fim porque é assim que o navegador as entrega com
 * trailingSlash — testar sem a barra esconderia justamente o bug original.
 */
const ESPERADO = [
  ['/', 'home', 'dashboard'],

  ['/entraid/', 'entraId', 'dashboard'],
  ['/entraid/roles/', 'entraId', 'roles'],
  ['/entraid/roles/global-administrator/', 'entraId', 'roles'],
  ['/entraid/role-actions/', 'entraId', 'roleActions'],
  ['/entraid/api-permissions/', 'entraId', 'apiPermissions'],
  ['/entraid/pim/', 'entraId', 'pim'],
  ['/entraid/reference/', 'entraId', 'reference'],

  ['/azure-rbac/', 'azureRbac', 'dashboard'],
  ['/azure-rbac/roles/', 'azureRbac', 'roles'],
  ['/azure-rbac/roles/owner/', 'azureRbac', 'roles'],
  ['/azure-rbac/permissions/', 'azureRbac', 'apiPermissions'],
  ['/azure-rbac/permissions/microsoft-insights-logs-read/', 'azureRbac', 'apiPermissions'],
  ['/azure-rbac/reference/', 'azureRbac', 'reference'],

  ['/aws/', 'aws', 'dashboard'],
  ['/aws/policies/', 'aws', 'roles'],
  ['/aws/policies/administratoraccess/', 'aws', 'roles'],
  ['/aws/actions/', 'aws', 'actions'],            // ← o bug relatado
  ['/aws/reference/', 'aws', 'reference'],
  ['/aws/scp-vs-identity-policies/', 'aws', 'scp'],

  ['/gcp/', 'gcp', 'dashboard'],
  ['/gcp/roles/', 'gcp', 'roles'],
  ['/gcp/roles/storage-admin/', 'gcp', 'roles'],
  ['/gcp/permissions/', 'gcp', 'actions'],
  ['/gcp/reference/', 'gcp', 'reference'],

  ['/google-workspace/', 'googleWorkspace', 'dashboard'],
  ['/google-workspace/roles/', 'googleWorkspace', 'roles'],
  ['/google-workspace/roles/super-admin/', 'googleWorkspace', 'roles'],
  ['/google-workspace/api-permissions/', 'googleWorkspace', 'apiPermissions'],
  ['/google-workspace/privileges/', 'googleWorkspace', 'actions'],
  ['/google-workspace/reference/', 'googleWorkspace', 'reference'],

  ['/ibm-cloud/', 'ibmCloud', 'dashboard'],
  ['/ibm-cloud/roles/', 'ibmCloud', 'roles'],
  ['/ibm-cloud/roles/account-owner/', 'ibmCloud', 'roles'],
  ['/ibm-cloud/classic/', 'ibmCloud', 'classic'],
  ['/ibm-cloud/access-groups/', 'ibmCloud', 'accessGroups'],
  ['/ibm-cloud/reference/', 'ibmCloud', 'reference'],

  // Páginas globais: plataforma `global`, nenhum item de plataforma aceso.
  // (`/reference` não entra: é stub de redirect em (legacy), sem AppShell.)
  ['/permission-scope/', 'global', 'roles'],
  ['/advisor/', 'global', 'roles'],
  ['/compare/', 'global', 'roles'],
  ['/evaluate/', 'global', 'roles'],
  ['/sod/', 'global', 'roles'],
  ['/sod/rules/', 'global', 'roles'],
  ['/assessment/', 'global', 'roles'],
  ['/tier-comparison/', 'global', 'roles'],
  ['/info/', 'global', 'info'],
  ['/search/', 'global', 'roles'],
  // O changelog é multi-cloud: nenhum menu de plataforma se aplica. Sem
  // '/changelog' em GLOBAL_HREFS estas quatro cairiam em 'entraId' e a sidebar
  // mostraria Built-in Roles e PIM do Entra ID ao lado das seis nuvens.
  // /stats e /azure-rbac/providers, entregues em 24/08 pelo P2 e pelo P3.
  ['/stats/', 'global', 'roles'],
  ['/azure-rbac/providers/', 'azureRbac', 'providers'],
  ['/azure-rbac/providers/microsoft-compute/', 'azureRbac', 'providers'],
  ['/changelog/', 'global', 'roles'],
  ['/changelog/gcp/', 'global', 'roles'],
  ['/changelog/azure-rbac/', 'global', 'roles'],
  ['/changelog/ibm-cloud/', 'global', 'roles'],
]

let falhas = 0
console.log('rota                                          plataforma        view            item destacado')
console.log('─'.repeat(104))
for (const [rota, platEsp, viewEsp] of ESPERADO) {
  const r = derivar(rota)
  const ok = r.platform === platEsp && r.view === viewEsp
  // Em página global, NENHUM item de plataforma deve acender — é o resultado
  // esperado, não uma lacuna da tabela. O '???' continua valendo para o resto,
  // que é o sinal de rota nova sem entrada aqui.
  const item = r.platform === 'global' ? '(nenhum)' : (ITEM[r.platform]?.[r.view] ?? '???')
  if (!ok) {
    falhas++
    console.log(`✗ ${rota.padEnd(44)} ${r.platform.padEnd(17)} ${r.view.padEnd(15)} ${item}`)
    console.log(`  ${''.padEnd(44)} esperado: ${platEsp} / ${viewEsp}  → ${ITEM[platEsp]?.[viewEsp]}`)
  } else {
    console.log(`  ${rota.padEnd(44)} ${r.platform.padEnd(17)} ${r.view.padEnd(15)} ${item}`)
  }
}

// ── Toda rota do projeto está coberta? ──────────────────────────────────────
const rotasReais = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === 'page.tsx') {
      let r = path.relative(APP, dir).replace(/\\/g, '/')
      r = r.replace(/\([^)]+\)\/?/g, '')          // route groups não entram na URL
      rotasReais.push('/' + r)
    }
  }
})(APP)

// Rotas fora do AppShell (redirects e ferramentas com layout próprio)
const IGNORAR = ['/roles', '/roles/[slug]', '/role-actions', '/api-permissions', '/pim', '/reference',
                 '/ibm-cloud/actions',   // stub de redirect desde 03/08
                 '/search', '/sod', '/sod/rules', '/sod/rules/[id]', '/assessment', '/permission-scope',
                 '/compare', '/compare/[tier]', '/compare/[tier]/[function]', '/evaluate', '/advisor',
                 '/tier-comparison', '/']
const cobertas = new Set(ESPERADO.map(([r]) => r.replace(/\/$/, '') || '/'))
const semTeste = rotasReais
  .map((r) => r.replace(/\/$/, '') || '/')
  .filter((r) => !IGNORAR.includes(r))
  .filter((r) => !cobertas.has(r) && !cobertas.has(r.replace(/\/\[[^\]]+\]$/, '')))

console.log()
if (semTeste.length) {
  console.log(`${semTeste.length} rota(s) do projeto sem caso de teste:`)
  for (const r of semTeste) console.log(`  - ${r}`)
  falhas += semTeste.length
}

if (falhas === 0) {
  console.log(`OK — ${ESPERADO.length} rota(s) destacam o item correto na sidebar.`)
} else {
  console.error(`\n${falhas} problema(s).`)
  process.exitCode = 1
}
