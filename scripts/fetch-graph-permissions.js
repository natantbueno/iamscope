#!/usr/bin/env node
/**
 * Regenera src/data/apiPermissions.ts a partir do inventário real de permissions
 * do Microsoft Graph.
 *
 * POR QUE ESTA RECOLETA ACONTECEU
 *   O dataset tinha 854 permissions: 692 Application (snapshot do EntraOps) e
 *   162 Delegated (coleta parcial de 30/06, feita parseando permissions-reference.md).
 *   A auditoria de 04/08 mediu contra o service principal real do Graph:
 *
 *     Application : 692 de 707  → 97,9%
 *     Delegated   : 162 de 797  → 20,3%
 *     Total       : 854 de 1.504 → 56,8%
 *
 *   Ou seja: as Application estavam quase completas, e 635 escopos delegados
 *   simplesmente não existiam no site. Entre eles famílias inteiras de
 *   ControlPlane — Policy (29), RoleManagement (9), PrivilegedAccess (6).
 *
 *   O que já existia estava correto: 0 órfãos (nenhuma permission renomeada ou
 *   removida arrastada do snapshot antigo), 0 IDs divergentes nos 854 GUIDs,
 *   0 duplicatas. O problema era só de cobertura. Ver
 *   docs/AUDITORIA-api-permissions-2026-08-04.md.
 *
 * POR QUE A FONTE É O merill/microsoft-info E NÃO A DOC
 *   A permissions-reference.md é prosa: para tirar dela o GUID e o tipo de
 *   consentimento é preciso heurística de markdown, e foi assim que a coleta de
 *   30/06 parou em 162. O microsoft-info publica um dump diário e automatizado
 *   do service principal do próprio Graph (appId 00000003-0000-0000-c000-000000000000),
 *   com appRoles e oauth2PermissionScopes estruturados — Id, Value, Type de
 *   consentimento e as descrições oficiais.
 *
 *   Cuidado ao comparar o total deste dataset com contagem de terceiro: as
 *   listagens que circulam por aí costumam somar VÁRIAS resource APIs, e este
 *   dataset é 100% Microsoft Graph. Os dois números medem coisas diferentes.
 *
 * O QUE É OFICIAL E O QUE É NOSSO
 *   Oficial  : name, id, type, description, consentType, isEnabled
 *   Editorial: category e eamTier — o modelo Enterprise Access do EntraOps.
 *              Nenhum dos dois é classificação da Microsoft.
 *
 *   Cada linha carrega `tierSource`, dizendo de onde veio a classificação:
 *     'curated'   — já estava no dataset; preservada verbatim
 *     'inherited' — Delegated que herdou da Application de mesmo nome
 *     'declared'  — veio da tabela PREFIX_CLASSIFICATION abaixo
 *
 * Uso:
 *   node scripts/fetch-graph-permissions.js --dry-run
 *   node scripts/fetch-graph-permissions.js
 *   node scripts/fetch-graph-permissions.js --refresh     (rebaixa o snapshot da web)
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const SNAP = path.join(__dirname, 'graph-permissions-source.json')
const OUT = path.join(ROOT, 'src', 'data', 'apiPermissions.ts')
const DRY = process.argv.includes('--dry-run')
const REFRESH = process.argv.includes('--refresh')

const FEED = {
  appRoles: 'https://raw.githubusercontent.com/merill/microsoft-info/main/_info/GraphAppRoles.json',
  delegated: 'https://raw.githubusercontent.com/merill/microsoft-info/main/_info/GraphDelegateRoles.json',
}

/**
 * Tabela de classificação por família de permission (o prefixo antes do primeiro ponto).
 *
 * POR QUE UMA TABELA E NÃO UMA HEURÍSTICA
 *   A tentativa óbvia — inferir a categoria pela moda do prefixo nas Application
 *   permissions — foi validada contra as 40 delegated que tinham sido
 *   classificadas à mão em 30/06 e acertou 4 de 40. O tier saiu bem melhor
 *   (33/40), mas categoria por adivinhação não presta. Então é tabela, no mesmo
 *   espírito das tabelas TIER/CATEGORY de fetch-gws-roles.js: explícita,
 *   revisável e versionada.
 *
 *   A tabela só é consultada para permission que não existia no dataset E não
 *   tem Application de mesmo nome para herdar. Mexer aqui não reclassifica nada
 *   que já esteja no site.
 *
 * REGRA DE TIER PARA DELEGATED
 *   Escopo com consentType 'User' cai em UserAccess, ignorando o tier da tabela:
 *   se o próprio usuário consente sem admin, não há elevação. É a mesma regra
 *   que a coleta de 30/06 aplicou (17 de 17 casos), agora escrita em vez de
 *   implícita. O tier da tabela vale para Application e para delegated de
 *   consentimento Admin.
 *
 * Categorias saem do vocabulário do EntraOps já em uso no dataset — nada de
 * inventar rótulo novo ('Teams' quando já existe 'Microsoft Teams' etc.).
 */
const PREFIX_CLASSIFICATION = {
  // ── Exchange Online ───────────────────────────────────────────────────────
  // EAS/EWS/IMAP/POP/SMTP são os protocolos legados: acessam a caixa inteira
  // como o usuário. Ficam em ManagementPlane; com consentimento User a regra
  // acima os rebaixa para UserAccess, que é o caso de todos eles hoje.
  Calendars: ['Exchange Online', 'ManagementPlane'],
  EAS: ['Exchange Online', 'ManagementPlane'],
  EWS: ['Exchange Online', 'ManagementPlane'],
  IMAP: ['Exchange Online', 'ManagementPlane'],
  Mail: ['Exchange Online', 'ManagementPlane'],
  'Mail-Advanced': ['Exchange Online', 'ManagementPlane'],
  MailTips: ['Exchange Online', 'ManagementPlane'],
  MailboxFolder: ['Exchange Online', 'ManagementPlane'],
  MailboxItem: ['Exchange Online', 'ManagementPlane'],
  POP: ['Exchange Online', 'ManagementPlane'],
  SMTP: ['Exchange Online', 'ManagementPlane'],

  // ── Teams / Teamwork ──────────────────────────────────────────────────────
  Calls: ['Microsoft Teams', 'ManagementPlane'],
  OnlineMeetings: ['Microsoft Teams', 'ManagementPlane'],
  Presence: ['Microsoft Teams', 'ManagementPlane'],
  // RSC: ler quais permissões específicas de recurso um app recebeu em chat/team.
  // É leitura de concessão de acesso, não configuração de Teams.
  ResourceSpecificPermissionGrant: ['Application and Workload Identity', 'ControlPlane'],
  // Adicionado em 24/08/2026 para destravar a coleta do Entra ID, que estava
  // parada em 1.504 de 1.505 permissões por falta desta entrada.
  //
  // Mesma classificação do vizinho direto acima, e pelo mesmo motivo: os dois
  // leem QUE CONCESSÃO DE ACESSO um app recebeu. Pré-autorização é o mecanismo
  // que dispensa consentimento para um cliente chamar uma API — enumerar quem
  // está pré-autorizado é reconhecimento do plano de controle de identidade de
  // aplicação, não leitura de recurso.
  //
  // ControlPlane apesar de ser permissão só de leitura: a escada do EAM
  // classifica por PLANO, não por verbo. RoleManagement.Read.Directory também
  // é leitura e também é ControlPlane — quem enumera o caminho para o
  // privilégio já está no plano de controle.
  PreAuthorizationGrant: ['Application and Workload Identity', 'ControlPlane'],
  // Adicionadas em 27/08/2026: a coleta rodou, PreAuthorizationGrant entrou
  // sem problema, mas o feed do Graph cresceu para 1.536 (de 1.505 esperado) e
  // trouxe mais 4 famílias novas sem entrada aqui — a feature de Agent ID
  // (identidade de agente) é dona de duas delas.
  //
  // AgentCommunicationConfiguration configura COMO um agente se comunica, não
  // decide se ele existe ou quem pode chamá-lo — por isso ManagementPlane,
  // apesar de estar na mesma categoria dos vizinhos acima.
  AgentCommunicationConfiguration: ['Application and Workload Identity', 'ManagementPlane'],
  // LifecyclePolicies-AgentId governa a POLÍTICA que cria/apaga identidades de
  // agente na org inteira — mesmo peso de PreAuthorizationGrant e
  // ResourceSpecificPermissionGrant acima, não o de LifecyclePolicies-Guests
  // (Entitlement Management/ManagementPlane, mais abaixo), apesar do nome
  // parecido: ali é ciclo de vida de conta de convidado, aqui é ciclo de vida
  // de identidade de aplicação/workload.
  'LifecyclePolicies-AgentId': ['Application and Workload Identity', 'ControlPlane'],
  TeamTemplates: ['Microsoft Teams', 'ManagementPlane'],
  TeamsActivity: ['Microsoft Teams', 'ManagementPlane'],
  TeamsAppInstallation: ['Microsoft Teams', 'ManagementPlane'],
  TeamsTab: ['Microsoft Teams', 'ManagementPlane'],
  TeamworkCustomEmoji: ['Microsoft Teams', 'ManagementPlane'],
  TeamworkSection: ['Microsoft Teams', 'ManagementPlane'],
  TeamworkTag: ['Microsoft Teams', 'ManagementPlane'],
  TeamworkTargetedMessage: ['Microsoft Teams', 'ManagementPlane'],
  TeamworkUserInteraction: ['Microsoft Teams', 'ManagementPlane'],
  UserTeamwork: ['Microsoft Teams', 'ManagementPlane'],
  VirtualAppointment: ['Microsoft Teams', 'ManagementPlane'],
  VirtualEvent: ['Microsoft Teams', 'ManagementPlane'],

  // ── SharePoint / arquivos ─────────────────────────────────────────────────
  FileStorageContainer: ['Microsoft SharePoint', 'ManagementPlane'],
  FileStorageContainerType: ['Microsoft SharePoint', 'ManagementPlane'],
  FileStorageContainerTypeReg: ['Microsoft SharePoint', 'ManagementPlane'],
  Files: ['Microsoft SharePoint', 'ManagementPlane'],

  // ── Segurança e conformidade ──────────────────────────────────────────────
  CaseManagement: ['Microsoft Purview', 'ManagementPlane'],
  InformationProtectionConfig: ['Security and Compliance', 'ManagementPlane'],
  InformationProtectionPolicy: ['Security and Compliance', 'ManagementPlane'],
  SecurityAlert: ['Global Security and Compliance Management', 'ControlPlane'],
  SecurityCopilotWorkspaces: ['Copilot', 'ManagementPlane'],
  ThreatAssessment: ['Security and Compliance', 'ManagementPlane'],
  ThreatSubmission: ['Global Security and Compliance Management', 'ControlPlane'],

  // ── Identidade e tenant ───────────────────────────────────────────────────
  // Directory.AccessAsUser.All é a permission mais perigosa desta leva: dá ao
  // app tudo o que o usuário assinado pode fazer no diretório. ControlPlane.
  Directory: ['Tenant Management', 'ControlPlane'],
  Policy: ['Tenant Policy Management', 'ControlPlane'],
  User: ['Global User Management', 'ControlPlane'],
  // ManageProtection governa a proteção contra exclusão de grupo — operação de
  // administração de grupo, não de controle do tenant.
  Group: ['Group Management', 'ManagementPlane'],
  UnifiedGroupMember: ['Group Management', 'ManagementPlane'],
  CrossTenantUserProfileSharing: ['Cross Tenant Partner Management', 'ControlPlane'],
  ManagedTenants: ['Multi Tenant Management', 'ControlPlane'],
  RemoteTenantGroups: ['Multi Tenant Management', 'ManagementPlane'],
  Subscription: ['License Management', 'ManagementPlane'],
  'TenantGovernance-Invitation': ['Tenant Configuration (Reader)', 'ManagementPlane'],
  'TenantGovernance-PolicyTemplate': ['Tenant Configuration (Reader)', 'ManagementPlane'],
  'TenantGovernance-RelatedTenant': ['Tenant Configuration (Reader)', 'ManagementPlane'],
  'TenantGovernance-Relationship': ['Tenant Configuration (Reader)', 'ManagementPlane'],
  'TenantGovernance-Request': ['Tenant Configuration (Reader)', 'ManagementPlane'],
  'TenantGovernance-Setting': ['Tenant Configuration (Reader)', 'ManagementPlane'],

  // ── Autenticação ──────────────────────────────────────────────────────────
  // Método de autenticação é caminho direto de tomada de conta: ControlPlane em
  // consentimento Admin. Os de autosserviço (Password, Phone) têm consentimento
  // User e caem em UserAccess pela regra, que é o comportamento certo.
  SubjectNameRegistration: ['Authentication', 'ManagementPlane'],
  UserAuthenticationMethod: ['Authentication', 'ControlPlane'],
  'UserAuthMethod-Email': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-External': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-HardwareOATH': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-MicrosoftAuthApp': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-Passkey': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-Password': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-Phone': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-PlatformCred': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-QR': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-ResourceKey': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-SoftwareOATH': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-TAP': ['Authentication', 'ControlPlane'],
  'UserAuthMethod-WindowsHello': ['Authentication', 'ControlPlane'],
  'VerifiedId-Profile': ['Authentication', 'ManagementPlane'],

  // ── Dispositivo e experiência do usuário ──────────────────────────────────
  // DeviceManagementDeploymentPlans (Intune, 27/08/2026): planos/anéis de
  // rollout. Mesmo par de DeviceManagementApps.Read.All, que já está
  // curated/ManagementPlane — agendar quem recebe o quê primeiro é
  // configuração, não controle direto do dispositivo (esse já é o Device
  // abaixo, ControlPlane).
  DeviceManagementDeploymentPlans: ['Microsoft 365 Platform Management', 'ManagementPlane'],
  Device: ['Global Endpoint Management', 'ControlPlane'],
  UserActivity: ['Default Member', 'UserAccess'],
  UserCloudClipboard: ['Default Member', 'UserAccess'],
  UserTimelineActivity: ['Default Member', 'UserAccess'],
  UserWindowsSettings: ['Global Endpoint Management', 'ManagementPlane'],

  // ── Education ─────────────────────────────────────────────────────────────
  EduAdministration: ['Education', 'ManagementPlane'],
  EduAssignments: ['Education', 'ManagementPlane'],
  EduCurricula: ['Education', 'ManagementPlane'],
  EduRoster: ['Education', 'ManagementPlane'],

  // ── Impressão ─────────────────────────────────────────────────────────────
  PrintConnector: ['Printer Management', 'ManagementPlane'],
  PrintJob: ['Printer Management', 'ManagementPlane'],
  PrintSettings: ['Printer Management', 'ManagementPlane'],
  Printer: ['Printer Management', 'ManagementPlane'],
  PrinterShare: ['Printer Management', 'ManagementPlane'],
  // PullPrintPrinter (27/08/2026): pull-print/Universal Print — mesmo recurso
  // de impressão dos vizinhos acima, sem ambiguidade de tier.
  PullPrintPrinter: ['Printer Management', 'ManagementPlane'],

  // ── Viva e Learning ───────────────────────────────────────────────────────
  EngagementRole: ['Microsoft Viva', 'ManagementPlane'],
  'Goals-Export': ['Microsoft Viva', 'ManagementPlane'],
  LearningAssignedCourse: ['Learning', 'ManagementPlane'],
  LearningProvider: ['Learning', 'ManagementPlane'],
  LearningSelfInitiatedCourse: ['Learning', 'ManagementPlane'],
  Topic: ['Microsoft Viva', 'ManagementPlane'],

  // ── Entitlement / ciclo de vida ───────────────────────────────────────────
  'EntitlementMgmt-SubjectAccess': ['Entitlement Management', 'ManagementPlane'],
  'LifecyclePolicies-Guests': ['Entitlement Management', 'ManagementPlane'],

  // ── Produtividade e resto ─────────────────────────────────────────────────
  EntraBackup: ['Backup and Restore', 'ManagementPlane'],
  Family: ['Default Member', 'UserAccess'],
  Financials: ['Business Scenarios', 'ManagementPlane'],
  Notes: ['Microsoft OneNote', 'ManagementPlane'],
  Notifications: ['Default Member', 'UserAccess'],
  People: ['People', 'ManagementPlane'],
  ServiceMessageViewpoint: ['Support and Service Health', 'ManagementPlane'],
  ShortNotes: ['Microsoft OneNote', 'ManagementPlane'],
  Tasks: ['Tasks and Planner', 'ManagementPlane'],

  // ── Escopos OIDC ──────────────────────────────────────────────────────────
  // Não têm ponto no nome; o prefixo é o nome inteiro.
  email: ['Default Member', 'UserAccess'],
  offline_access: ['Default Member', 'UserAccess'],
  openid: ['Default Member', 'UserAccess'],
  profile: ['Default Member', 'UserAccess'],
}

const TIER_ORDER = { ControlPlane: 0, ManagementPlane: 1, WorkloadPlane: 2, UserAccess: 3, Unclassified: 4 }

const familia = (name) => name.split('.')[0]

// ── Snapshot ────────────────────────────────────────────────────────────────

async function refreshSnapshot() {
  console.log('Baixando o inventário do Microsoft Graph...')
  const [app, del] = await Promise.all(
    [FEED.appRoles, FEED.delegated].map(async (url) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`${url} respondeu ${r.status}`)
      return r.json()
    })
  )
  if (!Array.isArray(app) || !app.length) throw new Error('feed de appRoles veio vazio')
  if (!Array.isArray(del) || !del.length) throw new Error('feed de delegated veio vazio')

  const anterior = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : null
  if (anterior) {
    // Encolhimento é sinal de feed quebrado, não de a Microsoft ter removido 200
    // permissions de um dia para o outro. Aborta antes de gravar.
    const antes = anterior.appRoles.length + anterior.delegatedScopes.length
    const agora = app.length + del.length
    if (agora < antes * 0.95) {
      throw new Error(`feed encolheu de ${antes} para ${agora} — abortando para não truncar o dataset`)
    }
  }

  const snap = {
    fetchedAt: new Date().toISOString().slice(0, 10),
    servicePrincipal: { appId: '00000003-0000-0000-c000-000000000000', displayName: 'Microsoft Graph' },
    sources: [
      { title: 'merill/microsoft-info — _info/GraphAppRoles.json', url: FEED.appRoles },
      { title: 'merill/microsoft-info — _info/GraphDelegateRoles.json', url: FEED.delegated },
      { title: 'Microsoft Graph permissions reference (conferência editorial)', url: 'https://learn.microsoft.com/en-us/graph/permissions-reference' },
    ],
    appRoles: app
      .slice()
      .sort((a, b) => a.Value.localeCompare(b.Value))
      .map((x) => ({ value: x.Value, id: x.Id, displayName: x.DisplayName, description: x.Description, isEnabled: x.IsEnabled })),
    delegatedScopes: del
      .slice()
      .sort((a, b) => a.Value.localeCompare(b.Value))
      .map((x) => ({
        value: x.Value, id: x.Id, consentType: x.Type,
        adminDisplayName: x.AdminConsentDisplayName, adminDescription: x.AdminConsentDescription,
        userDisplayName: x.UserConsentDisplayName, userDescription: x.UserConsentDescription,
        isEnabled: x.IsEnabled,
      })),
  }
  fs.writeFileSync(SNAP, JSON.stringify(snap, null, 1))
  console.log(`Snapshot atualizado: ${snap.appRoles.length} app roles + ${snap.delegatedScopes.length} delegated\n`)
  return snap
}

// ── Geração ─────────────────────────────────────────────────────────────────

function gerar(raw) {
  const problemas = []

  // Classificação que já existe no site, chaveada por nome+tipo.
  const { API_PERMISSIONS: atual } = loadTs('src/data/apiPermissions.ts')
  const curada = new Map(atual.map((p) => [`${p.type}|${p.name}`, p]))

  // Permission que sumiu da fonte: não é para acontecer, e se acontecer é notícia.
  const naFonte = new Set([
    ...raw.appRoles.map((x) => `Application|${x.value}`),
    ...raw.delegatedScopes.map((x) => `Delegated|${x.value}`),
  ])
  const orfas = [...curada.keys()].filter((k) => !naFonte.has(k))

  const saida = []

  // Passo 1 — Application. Preserva o que existe; tabela para o resto.
  const appPorNome = new Map()
  for (const r of raw.appRoles) {
    const prev = curada.get(`Application|${r.value}`)
    let category, eamTier, tierSource
    if (prev) {
      // tierSource vem junto: sem isso, a segunda execução marcaria tudo como
      // 'curated' — inclusive o que a tabela classificou — e a proveniência
      // sumiria em silêncio. Arquivo de antes deste campo existir cai em 'curated'.
      ;[category, eamTier, tierSource] = [prev.category, prev.eamTier, prev.tierSource ?? 'curated']
    } else {
      const decl = PREFIX_CLASSIFICATION[familia(r.value)]
      if (!decl) { problemas.push(`sem entrada em PREFIX_CLASSIFICATION: ${familia(r.value)} (Application ${r.value})`); continue }
      ;[category, eamTier] = decl
      tierSource = 'declared'
    }
    const item = { name: r.value, id: r.id, type: 'Application', category, eamTier, resource: 'Microsoft Graph', description: r.description, tierSource }
    appPorNome.set(r.value, item)
    saida.push(item)
  }

  // Passo 2 — Delegated. Preserva; senão herda da Application de mesmo nome;
  // senão tabela. A herança roda depois do passo 1 de propósito: assim uma
  // Application nova classificada pela tabela já serve de par para a delegated.
  for (const r of raw.delegatedScopes) {
    const prev = curada.get(`Delegated|${r.value}`)
    let category, eamTier, tierSource
    if (prev) {
      ;[category, eamTier, tierSource] = [prev.category, prev.eamTier, prev.tierSource ?? 'curated']
    } else if (appPorNome.has(r.value)) {
      const par = appPorNome.get(r.value)
      ;[category, eamTier, tierSource] = [par.category, par.eamTier, 'inherited']
    } else {
      const decl = PREFIX_CLASSIFICATION[familia(r.value)]
      if (!decl) { problemas.push(`sem entrada em PREFIX_CLASSIFICATION: ${familia(r.value)} (Delegated ${r.value})`); continue }
      // Consentimento do próprio usuário não eleva privilégio.
      ;[category, eamTier] = [decl[0], r.consentType === 'User' ? 'UserAccess' : decl[1]]
      tierSource = 'declared'
    }
    saida.push({
      name: r.value, id: r.id, type: 'Delegated', category, eamTier,
      resource: 'Microsoft Graph', description: r.adminDescription || r.userDescription,
      consentType: r.consentType, tierSource,
    })
  }

  // ── Consistência ──────────────────────────────────────────────────────────
  const TIERS = new Set(Object.keys(TIER_ORDER))
  for (const p of saida) {
    if (!TIERS.has(p.eamTier)) problemas.push(`tier inválido em ${p.type} ${p.name}: ${p.eamTier}`)
    if (!p.category) problemas.push(`sem categoria: ${p.type} ${p.name}`)
    if (!p.id) problemas.push(`sem id: ${p.type} ${p.name}`)
    if (!p.description) problemas.push(`sem descrição oficial: ${p.type} ${p.name}`)
  }
  const chaves = saida.map((p) => `${p.type}|${p.name}`)
  const dup = chaves.filter((k, i) => chaves.indexOf(k) !== i)
  if (dup.length) problemas.push(`duplicado: ${[...new Set(dup)].join(', ')}`)

  // Entrada de tabela que não corresponde a nenhuma família do inventário =
  // família que a Microsoft aposentou, ou erro de digitação no prefixo. Aviso,
  // não erro.
  //
  // A comparação é contra as famílias da FONTE, não contra as linhas que a
  // tabela classificou nesta execução: depois da primeira rodada essas linhas
  // já estão no dataset e voltam como 'curated', o que faria a tabela inteira
  // parecer ociosa toda vez.
  const familiasDaFonte = new Set(saida.map((p) => familia(p.name)))
  const ociosas = Object.keys(PREFIX_CLASSIFICATION).filter((p) => !familiasDaFonte.has(p))

  saida.sort((a, b) =>
    TIER_ORDER[a.eamTier] - TIER_ORDER[b.eamTier] ||
    a.name.localeCompare(b.name) ||
    a.type.localeCompare(b.type)
  )

  return { saida, problemas, orfas, ociosas }
}

// ── Emissão ─────────────────────────────────────────────────────────────────

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function emitir(saida, raw) {
  const app = saida.filter((p) => p.type === 'Application').length
  const del = saida.length - app

  const cabecalho = `import { EamTier } from './roles'

export type PermissionType = 'Application' | 'Delegated'

/** De onde veio a classificação de category/eamTier desta linha. */
export type TierSource =
  | 'curated'    // classificada à mão (EntraOps / auditorias nossas)
  | 'inherited'  // Delegated que herdou da Application de mesmo nome
  | 'declared'   // PREFIX_CLASSIFICATION de scripts/fetch-graph-permissions.js

export interface ApiPermission {
  name: string
  id: string
  type: PermissionType
  category: string
  eamTier: EamTier
  resource: string
  /** Texto oficial da Microsoft. Não derivar do nome. */
  description: string
  /** Só Delegated: quem precisa consentir. */
  consentType?: 'Admin' | 'User'
  tierSource: TierSource
}

// AUTO-GERADO por scripts/fetch-graph-permissions.js a partir de
// scripts/graph-permissions-source.json. Não editar à mão.
//
// FONTES
${raw.sources.map((s) => `//   ${s.title}\n//     ${s.url}`).join('\n')}
//
// Snapshot de ${raw.fetchedAt}, do service principal ${raw.servicePrincipal.appId}
// (${raw.servicePrincipal.displayName}).
//
// COBERTURA
//   Application : ${app} de ${raw.appRoles.length}
//   Delegated   : ${del} de ${raw.delegatedScopes.length}
//   Total       : ${saida.length}
//
// name, id, type, description, consentType são OFICIAIS.
// category e eamTier são CLASSIFICAÇÃO EDITORIAL do IAM Scope, no modelo
// Enterprise Access do EntraOps — não são classificação da Microsoft. O campo
// tierSource diz, linha a linha, se veio de curadoria, de herança ou da tabela.
//
// Este arquivo substituiu a coleta de 30/06/2026, que tinha 692 Application e
// só 162 dos 797 escopos delegados. Ver docs/AUDITORIA-api-permissions-2026-08-04.md.
`

  const linhas = saida.map((p) => `  {
    name: ${q(p.name)},
    id: ${q(p.id)},
    type: ${q(p.type)},
    category: ${q(p.category)},
    eamTier: ${q(p.eamTier)},
    resource: 'Microsoft Graph',
    description: ${q(p.description)},${p.consentType ? `\n    consentType: ${q(p.consentType)},` : ''}
    tierSource: ${q(p.tierSource)},
  }`)

  // POR QUE O ARRAY VEM PARTIDO EM BLOCOS
  //   Um único literal com as 1.504 linhas estoura o compilador:
  //     apiPermissions.ts:54 - error TS2590: Expression produces a union type
  //     that is too complex to represent.
  //   O tsc monta uma união com o tipo de cada elemento para checar o literal, e
  //   com 1.504 objetos — cada um com name/id/description como tipo literal de
  //   string, mais type, eamTier, tierSource e o consentType opcional — a união
  //   passa do limite. Com 854 linhas e sem tierSource ainda cabia; com 1.504 e
  //   os campos novos, não.
  //
  //   Blocos de 400 resolvem e ainda sobra folga: medido no tsc 5.x, 1.000 por
  //   bloco ainda passa e 1.504 não. 400 dá ~3,7x de margem antes que o
  //   crescimento natural do Graph reencoste no limite.
  const TAMANHO_BLOCO = 400
  const blocos = []
  for (let i = 0; i < linhas.length; i += TAMANHO_BLOCO) blocos.push(linhas.slice(i, i + TAMANHO_BLOCO))

  const corpo = blocos
    .map((b, i) => `const BLOCO_${i + 1}: ApiPermission[] = [\n${b.join(',\n')},\n]`)
    .join('\n\n')

  return `${cabecalho}
export const API_PERMISSIONS_FETCHED_AT = ${q(raw.fetchedAt)}

${corpo}

export const API_PERMISSIONS: ApiPermission[] = [
${blocos.map((_, i) => `  ...BLOCO_${i + 1},`).join('\n')}
]
`
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  let raw
  if (REFRESH) {
    raw = await refreshSnapshot()
  } else {
    if (!fs.existsSync(SNAP)) {
      console.error(`Snapshot não encontrado: ${path.relative(ROOT, SNAP)}`)
      console.error('Rode com --refresh para baixá-lo.')
      process.exitCode = 1
      return
    }
    raw = JSON.parse(fs.readFileSync(SNAP, 'utf8'))
    console.log(`Snapshot de ${raw.fetchedAt} (use --refresh para rebaixar)\n`)
  }

  const { saida, problemas, orfas, ociosas } = gerar(raw)

  const por = (campo) => saida.reduce((a, p) => ((a[p[campo]] = (a[p[campo]] ?? 0) + 1), a), {})
  const tipos = por('type')
  const fontes = por('tierSource')
  const tiers = por('eamTier')

  console.log(`Total                : ${saida.length}`)
  console.log(`  Application        : ${tipos.Application ?? 0} de ${raw.appRoles.length}`)
  console.log(`  Delegated          : ${tipos.Delegated ?? 0} de ${raw.delegatedScopes.length}`)
  console.log('')
  console.log(`Origem da classificação`)
  console.log(`  curated            : ${fontes.curated ?? 0}`)
  console.log(`  inherited          : ${fontes.inherited ?? 0}`)
  console.log(`  declared           : ${fontes.declared ?? 0}`)
  console.log('')
  for (const [t, n] of Object.entries(tiers).sort((a, b) => TIER_ORDER[a[0]] - TIER_ORDER[b[0]])) {
    console.log(`  ${t.padEnd(19)}: ${n}`)
  }

  if (orfas.length) {
    console.log(`\nSaíram da fonte (${orfas.length}) — conferir se foi rename ou remoção da Microsoft:`)
    for (const o of orfas) console.log(`  - ${o.replace('|', ' ')}`)
  }
  if (ociosas.length) {
    console.log(`\nEntradas de PREFIX_CLASSIFICATION sem uso (${ociosas.length}):`)
    console.log(`  ${ociosas.join(', ')}`)
  }

  if (problemas.length) {
    console.error(`\nProblemas (${problemas.length}) — nada foi escrito:`)
    for (const p of problemas.slice(0, 40)) console.error(`  - ${p}`)
    if (problemas.length > 40) console.error(`  ... e mais ${problemas.length - 40}`)
    process.exitCode = 1
    return
  }

  const ts = emitir(saida, raw)

  if (DRY) { console.log(`\n--dry-run: nada escrito (${(ts.length / 1024).toFixed(0)} kB gerados).`); return }

  fs.writeFileSync(OUT, ts)
  console.log(`\nEscrito: src/data/apiPermissions.ts  (${(ts.length / 1024).toFixed(0)} kB)`)
  console.log('Agora rode: node scripts/build-counts.js && node scripts/build-search-index.js')
}

main().catch((e) => { console.error(`\nFalhou: ${e.message}`); process.exitCode = 1 })
