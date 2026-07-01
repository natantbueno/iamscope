// Google Workspace — Admin Roles & OAuth Scopes
// Tiers: SuperAdmin > DelegatedAdmin > ServiceAdmin > SpecializedAdmin > ReadOnly

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
  privileges: string[]
  apiPrivileges?: string[]
}

export interface GwsOAuthScope {
  scope: string
  name: string
  description: string
  service: GwsService
  sensitivity: GwsScopeSensitivity
}

// ── Tier Metadata ─────────────────────────────────────────────────────────────

export const GWS_TIER_META: Record<GwsTier, {
  label: string; short: string; textColor: string; darkText: string; darkBg: string; description: string
}> = {
  SuperAdmin: {
    label: 'Super Admin', short: 'SA',
    textColor: '#dc2626', darkText: '#f87171', darkBg: '#3b1a1a',
    description: 'Full organizational control. Can manage all users, settings, services and billing. Equivalent to a Global Administrator — highest risk role.',
  },
  DelegatedAdmin: {
    label: 'Delegated Admin', short: 'DA',
    textColor: '#ea580c', darkText: '#fb923c', darkBg: '#2a1510',
    description: 'Broad administrative permissions delegated from Super Admin. Can manage users, groups, or services across the whole organization.',
  },
  ServiceAdmin: {
    label: 'Service Admin', short: 'SvcA',
    textColor: '#ca8a04', darkText: '#fbbf24', darkBg: '#1f1600',
    description: 'Administrative access scoped to a specific Google Workspace service such as Gmail, Drive, Calendar, or Chrome.',
  },
  SpecializedAdmin: {
    label: 'Specialized Admin', short: 'SpA',
    textColor: '#7c3aed', darkText: '#a78bfa', darkBg: '#1e1040',
    description: 'Specialized administrative functions with a limited but potentially sensitive scope, such as reseller management or data protection.',
  },
  ReadOnly: {
    label: 'Read Only', short: 'RO',
    textColor: '#16a34a', darkText: '#4ade80', darkBg: '#0a2010',
    description: 'View-only access to specific reports, audit logs, or organizational data. Cannot modify any settings.',
  },
}

// ── Scope Sensitivity Metadata ────────────────────────────────────────────────

export const GWS_SCOPE_META: Record<GwsScopeSensitivity, {
  label: string; textColor: string; darkText: string; darkBg: string; description: string
}> = {
  restricted: {
    label: 'Restricted', textColor: '#dc2626', darkText: '#f87171', darkBg: '#3b1a1a',
    description: 'Highest risk. Grants access to sensitive personal data. Requires a Google security review before use in published apps.',
  },
  sensitive: {
    label: 'Sensitive', textColor: '#ea580c', darkText: '#fb923c', darkBg: '#2a1510',
    description: 'Moderate risk. Shown prominently on the OAuth consent screen. May require verification for apps published to broad audiences.',
  },
  standard: {
    label: 'Standard', textColor: '#16a34a', darkText: '#4ade80', darkBg: '#0a2010',
    description: 'Lower risk. Basic data access. Generally available without additional Google review.',
  },
}

// ── Admin Roles ───────────────────────────────────────────────────────────────

export const GWS_ROLES: GwsAdminRole[] = [
  {
    slug: 'super-admin',
    name: 'Super Admin',
    description: 'Full administrative access to all Google Workspace services, settings, users, billing and security for the entire organization.',
    tier: 'SuperAdmin', category: 'Identity', isPrivileged: true,
    privileges: ['All Admin Console privileges', 'Manage users and admins', 'Manage all services', 'View all reports', 'Manage billing', 'Manage security settings', 'Access all data'],
    apiPrivileges: ['SUPER_ADMIN', 'USERS_RETRIEVE', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE', 'GROUPS_RETRIEVE', 'GROUPS_CREATE', 'GROUPS_UPDATE', 'GROUPS_DELETE', 'ADMIN_AUDIT_LOG_READ', 'SECURITY_SETTINGS_UPDATE', 'BILLING_MANAGE'],
  },
  {
    slug: 'groups-admin',
    name: 'Groups Admin',
    description: 'Create, manage, and delete groups and group memberships across the organization. Can configure group settings and moderation.',
    tier: 'DelegatedAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Create and manage groups', 'Manage group members', 'Configure group settings', 'Manage group moderation', 'View groups directory'],
    apiPrivileges: ['GROUPS_RETRIEVE', 'GROUPS_CREATE', 'GROUPS_UPDATE', 'GROUPS_DELETE', 'GROUPS_MEMBER_ADD', 'GROUPS_MEMBER_REMOVE', 'GROUPS_SETTINGS_UPDATE', 'GROUPS_MEMBER_RETRIEVE'],
  },
  {
    slug: 'user-management-admin',
    name: 'User Management Admin',
    description: 'Create, edit, and delete user accounts. Manage user profiles, aliases, and organizational unit membership. Cannot manage Super Admins.',
    tier: 'DelegatedAdmin', category: 'Identity', isPrivileged: true,
    privileges: ['Create and manage users', 'Reset user passwords', 'Manage user aliases', 'Move users between OUs', 'Suspend and restore users', 'Manage user licenses'],
    apiPrivileges: ['USERS_RETRIEVE', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE', 'USERS_ALIAS_CREATE', 'USERS_ALIAS_DELETE', 'USERS_MOVE_OU', 'USERS_SUSPEND', 'USERS_PASSWORD_RESET', 'USERS_LICENSE_MANAGE'],
  },
  {
    slug: 'help-desk-admin',
    name: 'Help Desk Admin',
    description: 'Provide frontline IT support. Can reset passwords, view user info, unlock accounts, and manage devices for non-admin users.',
    tier: 'ServiceAdmin', category: 'Identity', isPrivileged: false,
    privileges: ['Reset passwords (non-admins)', 'View user information', 'Unlock user accounts', 'Manage user devices', 'View user security info'],
    apiPrivileges: ['USERS_RETRIEVE', 'USERS_PASSWORD_RESET', 'USERS_SECURITY_RETRIEVE', 'DEVICES_RETRIEVE', 'USERS_UNLOCK', 'USERS_SUSPEND'],
  },
  {
    slug: 'services-admin',
    name: 'Services Admin',
    description: 'Enable, disable, and configure Google Workspace services and marketplace applications for the organization.',
    tier: 'DelegatedAdmin', category: 'Infrastructure', isPrivileged: false,
    privileges: ['Enable and disable services', 'Configure service settings', 'Manage Marketplace apps', 'Manage service access per OU', 'Configure data regions'],
    apiPrivileges: ['SERVICES_ENABLE', 'SERVICES_DISABLE', 'SERVICES_SETTINGS_UPDATE', 'MARKETPLACE_APPS_MANAGE', 'OU_SERVICES_CONFIGURE', 'DATA_REGIONS_CONFIGURE'],
  },
  {
    slug: 'mobile-admin',
    name: 'Mobile Admin',
    description: 'Manage mobile and endpoint devices enrolled in the organization. Apply policies, remotely wipe devices, and view device inventory.',
    tier: 'ServiceAdmin', category: 'Device', isPrivileged: false,
    privileges: ['Manage mobile devices', 'Apply device policies', 'Remote wipe devices', 'View device inventory', 'Approve and block devices', 'Manage endpoint compliance'],
    apiPrivileges: ['DEVICES_RETRIEVE', 'DEVICES_UPDATE', 'DEVICES_DELETE', 'DEVICES_WIPE', 'DEVICES_APPROVE', 'DEVICES_BLOCK', 'DEVICES_POLICY_UPDATE', 'DEVICES_COMPLIANCE_MANAGE'],
  },
  {
    slug: 'google-voice-admin',
    name: 'Google Voice Admin',
    description: 'Manage Google Voice licenses, phone numbers, call routing, auto attendants, and ring groups for the organization.',
    tier: 'ServiceAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Assign Voice licenses', 'Manage phone numbers', 'Configure call routing', 'Set up auto attendants', 'Manage ring groups', 'View call logs'],
    apiPrivileges: ['VOICE_LICENSE_ASSIGN', 'VOICE_NUMBER_MANAGE', 'VOICE_ROUTING_CONFIGURE', 'VOICE_AUTO_ATTENDANT_MANAGE', 'VOICE_RING_GROUP_MANAGE', 'VOICE_CALL_LOG_READ'],
  },
  {
    slug: 'storage-admin',
    name: 'Storage Admin',
    description: 'Monitor and manage organizational storage quotas across Google Drive, Gmail, and Google Photos.',
    tier: 'ServiceAdmin', category: 'Storage', isPrivileged: false,
    privileges: ['View storage usage', 'Manage storage pools', 'Configure storage policies', 'Set per-user quotas', 'View storage reports'],
    apiPrivileges: ['STORAGE_USAGE_READ', 'STORAGE_POOL_MANAGE', 'STORAGE_POLICY_UPDATE', 'STORAGE_QUOTA_SET', 'STORAGE_REPORT_READ'],
  },
  {
    slug: 'directory-sync-admin',
    name: 'Directory Sync Admin',
    description: 'Configure and manage Google Cloud Directory Sync (GCDS) to synchronize users and groups from an on-premises LDAP or Active Directory.',
    tier: 'SpecializedAdmin', category: 'Infrastructure', isPrivileged: false,
    privileges: ['Configure GCDS settings', 'Manage sync rules', 'View sync logs', 'Manage directory connectors'],
    apiPrivileges: ['DIRECTORY_SYNC_CONFIGURE', 'DIRECTORY_SYNC_RULES_MANAGE', 'DIRECTORY_SYNC_LOG_READ', 'DIRECTORY_CONNECTOR_MANAGE'],
  },
  {
    slug: 'reports-admin',
    name: 'Reports Admin',
    description: 'View audit and activity reports for all users and services. Read-only access to usage dashboards and security reports.',
    tier: 'ReadOnly', category: 'Analytics', isPrivileged: false,
    privileges: ['View audit logs', 'View usage reports', 'Access security dashboard', 'View alert center', 'Export report data'],
    apiPrivileges: ['ADMIN_AUDIT_LOG_READ', 'USAGE_REPORT_READ', 'SECURITY_DASHBOARD_READ', 'ALERT_CENTER_READ', 'REPORT_EXPORT'],
  },
  {
    slug: 'billing-admin',
    name: 'Billing Admin',
    description: 'Manage subscriptions, payment methods, and billing accounts. Can add or remove licenses and view invoices.',
    tier: 'DelegatedAdmin', category: 'Billing', isPrivileged: true,
    privileges: ['Manage subscriptions', 'Update payment methods', 'View invoices', 'Add and remove licenses', 'Manage billing accounts', 'Set up budget alerts'],
    apiPrivileges: ['BILLING_MANAGE', 'BILLING_SUBSCRIPTION_UPDATE', 'BILLING_PAYMENT_UPDATE', 'BILLING_INVOICE_READ', 'BILLING_LICENSE_ADD', 'BILLING_LICENSE_REMOVE', 'BILLING_BUDGET_ALERT_SET'],
  },
  {
    slug: 'reseller-admin',
    name: 'Reseller Admin',
    description: 'Manage customer accounts on behalf of a Google Workspace reseller or partner. Used in multi-tenant reseller scenarios.',
    tier: 'SpecializedAdmin', category: 'Infrastructure', isPrivileged: true,
    privileges: ['Manage customer accounts', 'Provision customer domains', 'Manage customer subscriptions', 'View customer reports'],
    apiPrivileges: ['RESELLER_CUSTOMER_MANAGE', 'RESELLER_DOMAIN_PROVISION', 'RESELLER_SUBSCRIPTION_MANAGE', 'RESELLER_REPORT_READ'],
  },
  {
    slug: 'chrome-management-admin',
    name: 'Chrome Management Admin',
    description: 'Manage Chrome browser, ChromeOS devices, policies, extensions, and apps via the Admin Console.',
    tier: 'ServiceAdmin', category: 'Device', isPrivileged: false,
    privileges: ['Manage ChromeOS devices', 'Set Chrome browser policies', 'Manage Chrome extensions', 'Configure app deployment', 'View device telemetry', 'Manage kiosk apps'],
    apiPrivileges: ['CHROME_DEVICE_MANAGE', 'CHROME_POLICY_UPDATE', 'CHROME_EXTENSION_MANAGE', 'CHROME_APP_DEPLOY', 'CHROME_TELEMETRY_READ', 'CHROME_KIOSK_MANAGE'],
  },
  {
    slug: 'security-admin',
    name: 'Security Admin',
    description: 'Manage security settings including 2-step verification enforcement, OAuth app trust, data loss prevention, and security alerts.',
    tier: 'DelegatedAdmin', category: 'Security', isPrivileged: true,
    privileges: ['Manage 2SV policies', 'Configure DLP rules', 'Manage OAuth app trust', 'View security dashboard', 'Manage security alerts', 'Configure context-aware access', 'Manage security keys'],
    apiPrivileges: ['SECURITY_2SV_MANAGE', 'SECURITY_DLP_CONFIGURE', 'SECURITY_OAUTH_TRUST_MANAGE', 'SECURITY_DASHBOARD_READ', 'SECURITY_ALERT_MANAGE', 'SECURITY_CONTEXT_ACCESS_CONFIGURE', 'SECURITY_KEY_MANAGE'],
  },
  {
    slug: 'calendar-admin',
    name: 'Calendar Admin',
    description: 'Manage Calendar resources (rooms, equipment), sharing settings, and calendar interoperability for the organization.',
    tier: 'ServiceAdmin', category: 'Productivity', isPrivileged: false,
    privileges: ['Manage calendar resources', 'Configure sharing settings', 'Manage calendar delegation', 'Set up calendar interop', 'View calendar logs'],
    apiPrivileges: ['CALENDAR_RESOURCE_MANAGE', 'CALENDAR_SHARING_CONFIGURE', 'CALENDAR_DELEGATION_MANAGE', 'CALENDAR_INTEROP_CONFIGURE', 'CALENDAR_LOG_READ'],
  },
  {
    slug: 'drive-docs-admin',
    name: 'Drive and Docs Admin',
    description: 'Manage Google Drive settings, shared drives, document sharing policies, and audit Drive activity across the organization.',
    tier: 'ServiceAdmin', category: 'Storage', isPrivileged: false,
    privileges: ['Manage shared drives', 'Configure Drive policies', 'Set sharing settings', 'Manage Drive labels', 'View Drive audit logs', 'Transfer file ownership'],
  },
  {
    slug: 'gmail-admin',
    name: 'Gmail Admin',
    description: 'Manage Gmail settings including routing, compliance, spam filtering, email authentication (SPF/DKIM/DMARC), and mail delegation.',
    tier: 'ServiceAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Configure mail routing', 'Manage compliance filters', 'Set spam policies', 'Configure email auth', 'Manage mail delegation', 'View mail logs', 'Set up Send As'],
  },
  {
    slug: 'meet-hardware-admin',
    name: 'Google Meet Hardware Admin',
    description: 'Manage Google Meet hardware devices (Series One, Chromebox for Meetings), room accounts, and video conferencing settings.',
    tier: 'ServiceAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Manage Meet hardware', 'Configure room accounts', 'Set hardware policies', 'View hardware diagnostics', 'Manage firmware updates'],
  },
  {
    slug: 'analytics-admin',
    name: 'Analytics Admin',
    description: 'Manage Google Analytics accounts and properties linked to the organization. Configure data collection and reporting.',
    tier: 'ServiceAdmin', category: 'Analytics', isPrivileged: false,
    privileges: ['Manage Analytics accounts', 'Configure data streams', 'Set data retention', 'Manage user permissions', 'View all reports'],
  },
  {
    slug: 'chat-admin',
    name: 'Google Chat Admin',
    description: 'Manage Google Chat settings, spaces, bots, and policies including external Chat access and message retention rules.',
    tier: 'ServiceAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Manage Chat settings', 'Configure space policies', 'Manage Chat apps', 'Set retention rules', 'Control external access', 'View Chat audit logs'],
  },
  {
    slug: 'classroom-admin',
    name: 'Google Classroom Admin',
    description: 'Manage Google Classroom settings for education environments. Control class creation, guardian access, and roster sync.',
    tier: 'ServiceAdmin', category: 'Productivity', isPrivileged: false,
    privileges: ['Manage Classroom settings', 'Configure guardian access', 'Manage class creation', 'Set up roster sync', 'View Classroom reports'],
  },
  {
    slug: 'tenant-admin',
    name: 'Tenant Admin',
    description: 'Manage top-level organizational settings including domain management, organizational units, and company profile.',
    tier: 'DelegatedAdmin', category: 'Identity', isPrivileged: true,
    privileges: ['Manage domains', 'Manage organizational units', 'Configure company profile', 'Manage admin roles', 'View all admin settings'],
  },
  {
    slug: 'organization-admin',
    name: 'Organization Admin',
    description: 'Manage the organizational structure including departments, cost centers, and hierarchical unit settings.',
    tier: 'SpecializedAdmin', category: 'Identity', isPrivileged: false,
    privileges: ['Manage organizational units', 'Configure OU policies', 'Move users between OUs', 'Set OU-level settings'],
  },
  {
    slug: 'data-protection-officer',
    name: 'Data Protection Officer',
    description: 'Access and manage data governance settings, data processing agreements, and privacy controls for GDPR and other compliance frameworks.',
    tier: 'SpecializedAdmin', category: 'Security', isPrivileged: false,
    privileges: ['View data processing agreements', 'Configure privacy settings', 'Manage data export', 'View audit logs', 'Configure retention policies'],
  },
  {
    slug: 'support-admin',
    name: 'Support Admin',
    description: 'Contact Google Workspace support on behalf of the organization. View case history but cannot change any settings.',
    tier: 'ReadOnly', category: 'Identity', isPrivileged: false,
    privileges: ['Contact Google support', 'View support cases', 'View known issues'],
  },
  {
    slug: 'vault-admin',
    name: 'Google Vault Admin',
    description: 'Manage Google Vault for eDiscovery. Create retention policies, manage legal holds, search and export organizational data.',
    tier: 'DelegatedAdmin', category: 'Security', isPrivileged: true,
    privileges: ['Create retention policies', 'Manage legal holds', 'Search all user data', 'Export data for litigation', 'Manage Vault matters'],
  },
  {
    slug: 'endpoint-management-admin',
    name: 'Endpoint Management Admin',
    description: 'Manage all endpoint devices including Android, iOS, Windows, macOS, and Linux enrolled in Endpoint Management.',
    tier: 'ServiceAdmin', category: 'Device', isPrivileged: false,
    privileges: ['Manage all device types', 'Apply device policies', 'Wipe and block devices', 'Manage device inventory', 'Configure compliance rules', 'View device reports'],
  },
  {
    slug: 'marketplace-admin',
    name: 'Workspace Marketplace Admin',
    description: 'Control which third-party apps users can install from the Google Workspace Marketplace. Manage app allowlists and blocklists.',
    tier: 'ServiceAdmin', category: 'Infrastructure', isPrivileged: false,
    privileges: ['Manage app allowlist', 'Block Marketplace apps', 'Configure app permissions', 'View installed apps', 'Deploy apps to OUs'],
  },
  {
    slug: 'cloud-search-admin',
    name: 'Cloud Search Admin',
    description: 'Configure and manage Google Cloud Search, the enterprise search solution that unifies search across Google Workspace and third-party sources.',
    tier: 'ServiceAdmin', category: 'Infrastructure', isPrivileged: false,
    privileges: ['Configure search sources', 'Manage data sources', 'Set search quality settings', 'View search analytics', 'Manage connectors'],
  },
  {
    slug: 'context-aware-access-admin',
    name: 'Context-Aware Access Admin',
    description: 'Create and manage context-aware access levels that restrict access to Google Workspace based on device posture, network, or geographic location.',
    tier: 'DelegatedAdmin', category: 'Security', isPrivileged: true,
    privileges: ['Create access levels', 'Assign access policies', 'Configure device requirements', 'Manage IP allowlists', 'Set geo-restrictions'],
  },
  {
    slug: 'alert-center-admin',
    name: 'Alert Center Admin',
    description: 'View and manage security alerts from Google Workspace services. Configure alert rules and notification channels for security events.',
    tier: 'ServiceAdmin', category: 'Security', isPrivileged: false,
    privileges: ['View all alerts', 'Manage alert rules', 'Configure notifications', 'Mark alerts as resolved', 'Export alert data'],
  },
  {
    slug: 'meet-admin',
    name: 'Google Meet Admin',
    description: 'Manage Google Meet video conferencing settings, streaming policies, recording storage, and meeting safety features.',
    tier: 'ServiceAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Configure Meet settings', 'Manage recording policies', 'Set streaming limits', 'Configure safety features', 'View Meet usage reports', 'Manage live streaming'],
  },
  {
    slug: 'work-insights-admin',
    name: 'Work Insights Admin',
    description: 'Access Work Insights dashboards showing collaboration patterns, tool adoption, and workforce productivity trends across the organization.',
    tier: 'ReadOnly', category: 'Analytics', isPrivileged: false,
    privileges: ['View work insights dashboards', 'Access collaboration metrics', 'View tool adoption data', 'Export insights reports'],
  },
  {
    slug: 'jamboard-admin',
    name: 'Jamboard Admin',
    description: 'Manage Jamboard hardware devices, firmware updates, and Jamboard sessions within the organization.',
    tier: 'ServiceAdmin', category: 'Device', isPrivileged: false,
    privileges: ['Manage Jamboard devices', 'Configure device settings', 'Manage firmware updates', 'View device inventory', 'Control Jam session policies'],
  },
  {
    slug: 'appsheet-admin',
    name: 'AppSheet Admin',
    description: 'Manage AppSheet no-code/low-code applications deployed within the organization. Configure governance policies for app creation and sharing.',
    tier: 'ServiceAdmin', category: 'Productivity', isPrivileged: false,
    privileges: ['Manage AppSheet apps', 'Configure governance policies', 'Manage user access', 'View app usage', 'Control data connections'],
  },
  {
    slug: 'dlp-admin',
    name: 'Data Loss Prevention Admin',
    description: 'Create and manage DLP (Data Loss Prevention) rules for Gmail, Drive, and Chat to prevent unauthorized sharing of sensitive data.',
    tier: 'DelegatedAdmin', category: 'Security', isPrivileged: true,
    privileges: ['Create DLP rules', 'Manage content detectors', 'Configure rule actions', 'View DLP audit logs', 'Manage DLP reports'],
  },
  {
    slug: 'looker-studio-admin',
    name: 'Looker Studio Admin',
    description: 'Manage Looker Studio (formerly Data Studio) settings, including organization-wide report policies, connector access, and data governance.',
    tier: 'ServiceAdmin', category: 'Analytics', isPrivileged: false,
    privileges: ['Manage Looker Studio settings', 'Configure connector access', 'Set sharing policies', 'View usage reports'],
  },
  {
    slug: 'sites-admin',
    name: 'Google Sites Admin',
    description: 'Manage Google Sites settings including creation permissions, sharing policies, and content governance for the organization.',
    tier: 'ServiceAdmin', category: 'Productivity', isPrivileged: false,
    privileges: ['Manage Sites settings', 'Configure sharing policies', 'Control creation permissions', 'View Sites activity'],
  },
  {
    slug: 'guardian-admin',
    name: 'Guardian Admin',
    description: 'Manage guardian email notifications for student accounts in Google Workspace for Education. Control guardian invitations and account linking.',
    tier: 'SpecializedAdmin', category: 'Identity', isPrivileged: false,
    privileges: ['Manage guardian invitations', 'Link guardian accounts', 'Send guardian notifications', 'View guardian summaries'],
  },
  {
    slug: 'keep-admin',
    name: 'Google Keep Admin',
    description: 'Manage Google Keep note-taking settings for the organization, including sharing policies and access controls.',
    tier: 'ServiceAdmin', category: 'Productivity', isPrivileged: false,
    privileges: ['Manage Keep settings', 'Configure sharing policies', 'Set access controls', 'View Keep usage'],
  },
  // ── ETAPA 4 — Adições confirmadas via knowledge.workspace.google.com/admin/users/prebuilt-administrator-roles (fetch oficial, 2026) ──
  {
    slug: 'multi-party-approval-admin',
    name: 'Multi-party Approval Admin',
    description: 'Revisa e aprova ou nega solicitações de outros administradores para realizar ações sensíveis (ex.: ativar/desativar verificação em duas etapas) que exigem aprovação multi-party. Disponível apenas em edições Google Workspace com suporte a Multi-party approval.',
    tier: 'SpecializedAdmin', category: 'Security', isPrivileged: false,
    privileges: ['Revisar solicitações de ações sensíveis de outros admins', 'Aprovar ou negar solicitações pendentes', 'Não executa a ação sensível diretamente, apenas aprova/nega'],
  },
  {
    slug: 'groups-reader',
    name: 'Groups Reader',
    description: 'Acesso somente leitura às informações de Google Groups no Admin console e via Admin API — não pode alterar ou atualizar grupos.',
    tier: 'ReadOnly', category: 'Communication', isPrivileged: false,
    privileges: ['Visualizar informações de grupos', 'Visualizar estrutura organizacional', 'Não pode criar, editar ou excluir grupos'],
  },
  {
    slug: 'groups-editor',
    name: 'Groups Editor',
    description: 'Possui as permissões de um Groups Admin no Admin console e via Admin API, exceto o privilégio de adicionar ou remover um security label em um recurso de grupo.',
    tier: 'DelegatedAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Criar, gerenciar e excluir grupos', 'Gerenciar membros e configurações de acesso', 'Não pode adicionar/remover security label de um grupo'],
  },
  {
    slug: 'indirect-reseller-admin',
    name: 'Indirect Reseller Admin',
    description: 'Atribuído a um reseller que trabalha com um distribuidor autorizado Google Workspace (em vez de diretamente com a Google). Pode adicionar, visualizar, editar e transferir clientes revendidos.',
    tier: 'SpecializedAdmin', category: 'Infrastructure', isPrivileged: true,
    privileges: ['Adicionar, visualizar, editar e transferir clientes revendidos', 'Atribuído a resellers que operam via distribuidor autorizado (não diretamente com a Google)'],
  },
]

// ── OAuth Scopes ──────────────────────────────────────────────────────────────

export const GWS_SCOPES: GwsOAuthScope[] = [
  // Gmail
  { scope: 'https://mail.google.com/', name: 'Gmail Full Access', description: 'Read, compose, send, and permanently delete all emails from Gmail.', service: 'Gmail', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/gmail.modify', name: 'Gmail Modify', description: 'Read, compose, and send emails. Create and delete labels, drafts, and threads.', service: 'Gmail', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/gmail.readonly', name: 'Gmail Read Only', description: 'View emails and settings but cannot make any changes.', service: 'Gmail', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/gmail.send', name: 'Gmail Send', description: 'Send email on behalf of the user. Cannot read existing messages.', service: 'Gmail', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/gmail.compose', name: 'Gmail Compose', description: 'Create, read, update, and delete drafts. Send messages and drafts.', service: 'Gmail', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/gmail.insert', name: 'Gmail Insert', description: 'Insert email messages into the mailbox directly, bypassing standard delivery.', service: 'Gmail', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/gmail.labels', name: 'Gmail Labels', description: 'Create, read, update, and delete labels in Gmail.', service: 'Gmail', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/gmail.metadata', name: 'Gmail Metadata', description: 'View email metadata such as labels and headers but not the email body.', service: 'Gmail', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/gmail.settings.basic', name: 'Gmail Settings Basic', description: 'Manage basic email settings like language and display density.', service: 'Gmail', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/gmail.settings.sharing', name: 'Gmail Settings Sharing', description: 'Manage sensitive email settings including forwarding rules and IMAP/POP access.', service: 'Gmail', sensitivity: 'restricted' },

  // Drive
  { scope: 'https://www.googleapis.com/auth/drive', name: 'Drive Full Access', description: 'See, edit, create, and delete all files in Google Drive.', service: 'Drive', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/drive.readonly', name: 'Drive Read Only', description: 'See and download all files in Google Drive.', service: 'Drive', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/drive.file', name: 'Drive File', description: 'Access only the files that the app created or opened. No access to other files.', service: 'Drive', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/drive.appdata', name: 'Drive App Data', description: 'Access app-specific hidden folder in Drive. Not visible to the user.', service: 'Drive', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/drive.metadata', name: 'Drive Metadata', description: 'View and manage metadata of files but not their content.', service: 'Drive', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/drive.metadata.readonly', name: 'Drive Metadata Read Only', description: 'View metadata of files in Drive without accessing their content.', service: 'Drive', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/drive.scripts', name: 'Drive Scripts', description: 'Modify Apps Script files in Drive associated with the application.', service: 'Drive', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/drive.activity', name: 'Drive Activity', description: 'View the activity record of files in Google Drive.', service: 'Drive', sensitivity: 'sensitive' },

  // Calendar
  { scope: 'https://www.googleapis.com/auth/calendar', name: 'Calendar Full Access', description: 'See, edit, share, and permanently delete all calendars and events.', service: 'Calendar', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/calendar.readonly', name: 'Calendar Read Only', description: 'View all calendars and events but cannot make changes.', service: 'Calendar', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/calendar.events', name: 'Calendar Events', description: 'View and edit events on all calendars.', service: 'Calendar', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/calendar.events.readonly', name: 'Calendar Events Read Only', description: 'View events on all calendars but cannot edit them.', service: 'Calendar', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/calendar.settings.readonly', name: 'Calendar Settings Read Only', description: 'View calendar settings such as time zone and notification preferences.', service: 'Calendar', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/calendar.addons.execute', name: 'Calendar Add-ons Execute', description: 'Run Calendar add-ons when a user opens an event.', service: 'Calendar', sensitivity: 'standard' },

  // Admin SDK
  { scope: 'https://www.googleapis.com/auth/admin.directory.user', name: 'Admin Directory Users', description: 'View and manage user accounts in the Google Workspace directory.', service: 'Admin SDK', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly', name: 'Admin Directory Users Read Only', description: 'View user accounts in the Google Workspace directory.', service: 'Admin SDK', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.group', name: 'Admin Directory Groups', description: 'View and manage groups in the Google Workspace directory.', service: 'Admin SDK', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.group.readonly', name: 'Admin Directory Groups Read Only', description: 'View groups in the Google Workspace directory.', service: 'Admin SDK', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.orgunit', name: 'Admin Directory Org Units', description: 'View and manage organizational units in the directory.', service: 'Admin SDK', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.device.chromeos', name: 'Admin Directory ChromeOS Devices', description: 'View and manage ChromeOS devices in the organization.', service: 'Admin SDK', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.device.mobile', name: 'Admin Directory Mobile Devices', description: 'Manage mobile devices enrolled in the organization.', service: 'Admin SDK', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.domain', name: 'Admin Directory Domains', description: 'View and manage domains associated with the Google Workspace account.', service: 'Admin SDK', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.customer', name: 'Admin Directory Customer', description: 'View and manage customer information for the Google Workspace account.', service: 'Admin SDK', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.rolemanagement', name: 'Admin Directory Role Management', description: 'Manage admin roles and role assignments in the organization.', service: 'Admin SDK', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/admin.directory.userschema', name: 'Admin Directory User Schemas', description: 'View and manage custom user attribute schemas in the directory.', service: 'Admin SDK', sensitivity: 'sensitive' },

  // Reports
  { scope: 'https://www.googleapis.com/auth/admin.reports.audit.readonly', name: 'Admin Audit Reports', description: 'View audit reports for all users and services in the organization.', service: 'Reports', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/admin.reports.usage.readonly', name: 'Admin Usage Reports', description: 'View usage summary reports for users in the organization.', service: 'Reports', sensitivity: 'sensitive' },

  // Contacts
  { scope: 'https://www.googleapis.com/auth/contacts', name: 'Contacts Full Access', description: 'See, edit, download and permanently delete contacts.', service: 'Contacts', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/contacts.readonly', name: 'Contacts Read Only', description: 'See and download contacts.', service: 'Contacts', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/contacts.other.readonly', name: 'Other Contacts Read Only', description: 'See and download contact info automatically saved in Other Contacts.', service: 'Contacts', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/directory.readonly', name: 'Directory Read Only', description: 'See the organizational directory of Google Workspace users.', service: 'People', sensitivity: 'sensitive' },

  // Chat
  { scope: 'https://www.googleapis.com/auth/chat.messages', name: 'Chat Messages', description: 'View, compose, send, update, and delete messages in Google Chat.', service: 'Chat', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/chat.messages.readonly', name: 'Chat Messages Read Only', description: 'View messages in Google Chat but not send or delete.', service: 'Chat', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/chat.spaces', name: 'Chat Spaces', description: 'Create, view, update, and delete spaces in Google Chat.', service: 'Chat', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/chat.spaces.readonly', name: 'Chat Spaces Read Only', description: 'View spaces in Google Chat.', service: 'Chat', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/chat.memberships', name: 'Chat Memberships', description: 'View, add, update, and remove members from Google Chat spaces.', service: 'Chat', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/chat.bot', name: 'Chat Bot', description: 'Run as a Google Chat app and interact with users.', service: 'Chat', sensitivity: 'standard' },

  // Docs / Sheets / Slides
  { scope: 'https://www.googleapis.com/auth/documents', name: 'Google Docs Full Access', description: 'See, edit, create, and delete all Google Docs documents.', service: 'Docs', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/documents.readonly', name: 'Google Docs Read Only', description: 'View Google Docs documents.', service: 'Docs', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/spreadsheets', name: 'Google Sheets Full Access', description: 'See, edit, create, and delete all Google Sheets spreadsheets.', service: 'Sheets', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', name: 'Google Sheets Read Only', description: 'View Google Sheets spreadsheets.', service: 'Sheets', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/presentations', name: 'Google Slides Full Access', description: 'See, edit, create, and delete all Google Slides presentations.', service: 'Slides', sensitivity: 'restricted' },
  { scope: 'https://www.googleapis.com/auth/presentations.readonly', name: 'Google Slides Read Only', description: 'View Google Slides presentations.', service: 'Slides', sensitivity: 'sensitive' },

  // Meet
  { scope: 'https://www.googleapis.com/auth/meetings.space.created', name: 'Meet Spaces Created', description: 'Create and manage Google Meet meeting spaces and sessions.', service: 'Meet', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/meetings.space.readonly', name: 'Meet Spaces Read Only', description: 'View Google Meet meeting spaces and session details.', service: 'Meet', sensitivity: 'standard' },

  // Cloud Identity
  { scope: 'https://www.googleapis.com/auth/cloud-identity.groups', name: 'Cloud Identity Groups', description: 'See, edit, create and delete Cloud Identity groups.', service: 'Cloud Identity', sensitivity: 'sensitive' },
  { scope: 'https://www.googleapis.com/auth/cloud-identity.groups.readonly', name: 'Cloud Identity Groups Read Only', description: 'View Cloud Identity groups.', service: 'Cloud Identity', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/cloud-identity.devices', name: 'Cloud Identity Devices', description: 'Manage devices enrolled in Cloud Identity.', service: 'Cloud Identity', sensitivity: 'sensitive' },

  // Tasks
  { scope: 'https://www.googleapis.com/auth/tasks', name: 'Google Tasks Full Access', description: 'Create, edit, organize, and delete all tasks in Google Tasks.', service: 'Tasks', sensitivity: 'standard' },
  { scope: 'https://www.googleapis.com/auth/tasks.readonly', name: 'Google Tasks Read Only', description: 'View tasks in Google Tasks.', service: 'Tasks', sensitivity: 'standard' },
]
