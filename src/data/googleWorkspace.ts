// Google Workspace — Admin Roles, Privilégios e OAuth Scopes
//
// AUTO-GERADO por scripts/fetch-gws-roles.js a partir de
// scripts/gws-official-source.json. Não editar as roles e privilégios à mão.
//
// FONTES OFICIAIS
//   Prebuilt administrator roles
//     https://support.google.com/a/answer/2405986  (doc de 2026-07-22)
//   Administrator privilege definitions
//     https://knowledge.workspace.google.com/admin/users/administrator-privilege-definitions  (doc de 2026-07-23)
//   Manage roles — Directory API
//     https://developers.google.com/workspace/admin/directory/v1/guides/manage-roles  (doc de 2026-04-20)
//
// Extraído em 2026-08-03.
//
// COBERTURA DE apiPrivileges
//   O Google só publica os nomes de privilégio da API (privilegeName) para duas
//   roles: _SEED_ADMIN_ROLE (Super Admin, truncada na doc) e _GROUPS_ADMIN_ROLE
//   (Groups Admin, completa). Para as outras 12 a lista só existe via
//   privileges.list do Admin SDK, que exige OAuth no tenant.
//   Por isso apiPrivileges vem vazio nelas — é lacuna declarada, não erro.
//   A interface precisa dizer isso em vez de mostrar lista vazia.
//
// tier, category e isPrivileged são CLASSIFICAÇÃO EDITORIAL do IAM Scope,
// derivadas das capacidades oficiais. Não são classificação do Google.

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
  /** Capacidades, no texto oficial do Google. */
  privileges: string[]
  /** privilegeName do Admin SDK. Vazio quando o Google não publica. */
  apiPrivileges?: string[]
  /** false = o Google publica só parte da lista, ou nenhuma. */
  apiPrivilegesComplete?: boolean
  /** Ressalva oficial de escopo, quando existe. */
  scopeNote?: string
}

/** Privilégio do Admin console, como o Google o nomeia. */
export interface GwsPrivilege {
  slug: string
  name: string
  group: string
  section: string
  description: string
  isChild: boolean
}

export interface GwsOAuthScope {
  scope: string
  name: string
  description: string
  service: GwsService
  sensitivity: GwsScopeSensitivity
}

/** URLs das fontes, para a página de referência citar. */
export const GWS_SOURCES = [
  {
    "id": "prebuilt-roles",
    "url": "https://support.google.com/a/answer/2405986",
    "canonical": "https://knowledge.workspace.google.com/admin/users/prebuilt-administrator-roles",
    "title": "Prebuilt administrator roles",
    "docLastUpdated": "2026-07-22"
  },
  {
    "id": "privilege-definitions",
    "url": "https://knowledge.workspace.google.com/admin/users/administrator-privilege-definitions",
    "title": "Administrator privilege definitions",
    "docLastUpdated": "2026-07-23"
  },
  {
    "id": "admin-sdk-manage-roles",
    "url": "https://developers.google.com/workspace/admin/directory/v1/guides/manage-roles",
    "title": "Manage roles — Directory API",
    "docLastUpdated": "2026-04-20",
    "note": "Única fonte pública com nomes de privilégio da API (privilegeName) associados a roles pré-construídas."
  }
] as const

export const GWS_EXTRACTED_AT = '2026-08-03'

export { GWS_TIER_META } from './tierMeta'

export const GWS_ROLES: GwsAdminRole[] = [
  {
    slug: 'super-admin',
    name: 'Super Admin',
    description: 'Has access to all features in the Google Admin console and Admin API and can manage every aspect of your organization\'s account. Super admins also have full access to all users\' calendars and event details.',
    tier: 'SuperAdmin', category: 'Identity', isPrivileged: true,
    privileges: ['Create and assign administrator roles', 'Manage other admins, including changing passwords', 'Transfer ownership of files during the user deletion process', 'Accept the Terms of Service for a product', 'Invite unmanaged user accounts to become Google Workspace managed user accounts', 'Restore deleted users', 'Turn Multi-party approval settings on or off', 'Allow users to turn on 2-Step Verification', 'Install Google Workspace Marketplace apps', 'Manage Google Calendar resource access-level controls', 'Use the data migration service', 'Grant domain-wide delegation and manage API client access', 'Set up Google as a SAML identity provider and add or modify SAML apps'],
    apiPrivileges: ['SUPER_ADMIN', 'ROOT_APP_ADMIN', 'ADMIN_APIS_ALL'],
    apiPrivilegesComplete: false,
  },
  {
    slug: 'groups-admin',
    name: 'Groups Admin',
    description: 'Has full control over Google Groups\' tasks in your Admin console. This administrator can perform the following tasks both from the Admin console and using the Admin API.',
    tier: 'DelegatedAdmin', category: 'Identity', isPrivileged: false,
    privileges: ['View user profiles and your organizational structure', 'Create new groups in the Admin console', 'Manage members of groups created in the Admin console', 'Manage group access settings', 'Delete groups using the Admin console', 'View organizational units', 'Add a security label to a group'],
    apiPrivileges: ['CHANGE_USER_GROUP_MEMBERSHIP', 'USERS_RETRIEVE', 'GROUPS_ALL', 'ADMIN_DASHBOARD', 'ORGANIZATION_UNITS_RETRIEVE'],
    apiPrivilegesComplete: true,
  },
  {
    slug: 'groups-reader',
    name: 'Groups Reader',
    description: 'Can read Groups information, but can\'t change or update it.',
    tier: 'ReadOnly', category: 'Identity', isPrivileged: false,
    privileges: ['Read Groups information', 'Privileges can be scoped to all groups, only security groups, or only non-security groups'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
  },
  {
    slug: 'groups-editor',
    name: 'Groups Editor',
    description: 'Has the permissions of a Groups admin, except for the privilege required to add or remove a security label on a groups resource.',
    tier: 'DelegatedAdmin', category: 'Identity', isPrivileged: false,
    privileges: ['All Groups Admin permissions except adding or removing a security label', 'Privileges can be scoped to all groups, only security groups, or only non-security groups', 'Can be granted locked groups privileges, for all groups or only locked groups'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
  },
  {
    slug: 'user-management-admin',
    name: 'User Management Admin',
    description: 'Can perform all actions on users who aren\'t administrators. This administrator can perform the following tasks both from the Admin console and using the Admin API.',
    tier: 'DelegatedAdmin', category: 'Identity', isPrivileged: true,
    privileges: ['View user profiles and your organizational structure', 'View organizational units', 'Create and delete user accounts', 'Rename users and change passwords', 'Manage a user\'s individual security settings', 'Perform other user management tasks'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
    scopeNote: 'Applies only to users who aren\'t administrators. Can be limited to specific organizational units.',
  },
  {
    slug: 'help-desk-admin',
    name: 'Help Desk Admin',
    description: 'Can reset passwords for users who aren\'t administrators, both in the Admin console and using the Admin API.',
    tier: 'DelegatedAdmin', category: 'Identity', isPrivileged: true,
    privileges: ['Reset passwords for users who aren\'t administrators', 'View user profiles and your organizational structure', 'View organizational units'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
    scopeNote: 'Can be limited to specific organizational units.',
  },
  {
    slug: 'services-admin',
    name: 'Services Admin',
    description: 'Can manage certain service settings and devices in the Admin console, including Google Calendar, Drive, and Docs.',
    tier: 'ServiceAdmin', category: 'Productivity', isPrivileged: false,
    privileges: ['Turn services on or off', 'Change service settings and permissions', 'Create, edit, and delete Calendar resources', 'Manage Chrome and mobile devices listed in the Admin console', 'Manage settings for Google Takeout', 'Manage Google AppSheet settings, including governance policies and team management', 'Manage classification labels and default classification rules', 'View organizational units', 'Use the alert center (full access)'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
    scopeNote: 'Some products and services, such as Google Vault and Google Cloud Print, can\'t be managed by the Services Admin role.',
  },
  {
    slug: 'multi-party-approval-admin',
    name: 'Multi-party approval Admin',
    description: 'Can manage multi-party approval requests for other admins to complete sensitive actions, such as turning 2-Step Verification (2SV) on or off.',
    tier: 'SpecializedAdmin', category: 'Security', isPrivileged: true,
    privileges: ['Review requests to perform sensitive actions', 'Approve or deny requests'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
    scopeNote: 'Available to customers with a Google Workspace edition that supports Multi-party approval.',
  },
  {
    slug: 'mobile-admin',
    name: 'Mobile Admin',
    description: 'Can manage mobile devices and endpoints using Google endpoint management.',
    tier: 'ServiceAdmin', category: 'Device', isPrivileged: false,
    privileges: ['Provision and approve devices', 'Manage apps', 'Block or wipe devices and accounts', 'Set device policies', 'See groups and users in the domain'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
    scopeNote: 'Available only to customers who signed up for Google Workspace after February 2018.',
  },
  {
    slug: 'storage-admin',
    name: 'Storage Admin',
    description: 'Can use the Storage settings in the Admin console. This role also grants full access to Reports and Drive settings.',
    tier: 'ServiceAdmin', category: 'Storage', isPrivileged: false,
    privileges: ['View their organization\'s storage use', 'View the users and shared drives that use the most storage', 'Set storage limits', 'Open the Accounts report, the directory of users, and the list of shared drives'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
  },
  {
    slug: 'google-voice-admin',
    name: 'Google Voice Admin',
    description: 'Can manage all Google Voice settings and provisioning.',
    tier: 'SpecializedAdmin', category: 'Communication', isPrivileged: false,
    privileges: ['Add locations', 'Assign numbers to users', 'Port numbers', 'Change service addresses', 'Set up desk phones', 'Set up an auto attendant', 'Manage user licenses'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
  },
  {
    slug: 'directory-sync-admin',
    name: 'Directory Sync Admin',
    description: 'Can manage the sync process using Directory Sync.',
    tier: 'SpecializedAdmin', category: 'Identity', isPrivileged: false,
    privileges: ['Set up and run a sync using Directory Sync', 'Update sync settings'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
  },
  {
    slug: 'reseller-admin',
    name: 'Reseller Admin',
    description: 'Assigned to a Google Workspace authorized reseller or distributor. Reseller admins can access all of the features and permissions included with the Manage Reseller Tools privilege.',
    tier: 'SpecializedAdmin', category: 'Billing', isPrivileged: false,
    privileges: ['Place orders for Google Workspace and other services that use the Admin console', 'Add, view, edit, and transfer resold customers', 'Access settings in the Partner Sales Console to view and edit support information', 'View billing invoices and change payment methods', 'Access and manage a customer\'s Admin console, Google Workspace Admin SDK, and support cases', 'Manage Google Groups of resold customers using the Groups web UI'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
  },
  {
    slug: 'indirect-reseller-admin',
    name: 'Indirect Reseller Admin',
    description: 'Assigned to a reseller working with a Google Workspace authorized distributor.',
    tier: 'SpecializedAdmin', category: 'Billing', isPrivileged: false,
    privileges: ['Add, view, edit, and transfer resold customers'],
    apiPrivileges: [],
    apiPrivilegesComplete: false,
  },
]

export const GWS_PRIVILEGES: GwsPrivilege[] = [
  { slug: 'admin-settings-billing-management', name: 'Billing Management', group: 'Billing Management', section: 'Admin settings', description: 'Admins with this privilege can perform billing tasks, such as setting up a billing account or changing a payment method. This privilege works only in the Admin console.', isChild: false },
  { slug: 'admin-settings-data-transfer', name: 'Data Transfer', group: 'Data Transfer', section: 'Admin settings', description: 'Super admins or Services admins with this privilege can transfer ownership of users\' Google Drive files using the Admin console. This privilege\'s actions can\'t be limited to specific organizational units.', isChild: false },
  { slug: 'admin-settings-domains', name: 'Domains', group: 'Domains', section: 'Admin settings', description: 'Manage domains, domain aliases and organization-level settings.', isChild: false },
  { slug: 'admin-settings-domains-domain-settings', name: 'Domains > Domain Settings', group: 'Domains', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-domains-domain-management', name: 'Domains > Domain Management', group: 'Domains', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-domains-domain-allowlist-management', name: 'Domains > Domain Allowlist Management', group: 'Domains', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-domains-domain-allowlist-read', name: 'Domains > Domain Allowlist Read', group: 'Domains', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-groups', name: 'Groups', group: 'Groups', section: 'Admin settings', description: 'Admins with the Groups privilege have full control over groups created in your Admin console. These actions can\'t be limited to specific organizational units.', isChild: false },
  { slug: 'admin-settings-groups-manage-locked-label-on-groups-resources', name: 'Groups > Manage locked label on groups resources', group: 'Groups', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-groups-add-a-security-label-to-a-group', name: 'Groups > Add a security label to a group', group: 'Groups', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-inbound-scim-directory-sync', name: 'Inbound SCIM Directory Sync', group: 'Inbound SCIM Directory Sync', section: 'Admin settings', description: 'Manage Inbound SCIM connections and authentication mechanisms.', isChild: false },
  { slug: 'admin-settings-inbound-scim-directory-sync-inbound-scim-directory-sync-settings-management', name: 'Inbound SCIM Directory Sync > Inbound SCIM Directory Sync Settings Management', group: 'Inbound SCIM Directory Sync', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-inbound-scim-directory-sync-inbound-scim-directory-sync-settings-read', name: 'Inbound SCIM Directory Sync > Inbound SCIM Directory Sync Settings Read', group: 'Inbound SCIM Directory Sync', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-license-management', name: 'License Management', group: 'License Management', section: 'Admin settings', description: 'Super admins and admins with this privilege can assign and manage Google Workspace licenses for the organization, an organizational unit, a group of users, or an individual user.', isChild: false },
  { slug: 'admin-settings-organizational-units', name: 'Organizational Units', group: 'Organizational Units', section: 'Admin settings', description: 'Admins with this privilege can manage your account\'s organizational structure from the Users page in their Admin console. The Create, Update, or Delete privileges automatically grant the Read privilege.', isChild: false },
  { slug: 'admin-settings-organizational-units-read', name: 'Organizational Units > Read', group: 'Organizational Units', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-organizational-units-create', name: 'Organizational Units > Create', group: 'Organizational Units', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-organizational-units-update', name: 'Organizational Units > Update', group: 'Organizational Units', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-organizational-units-delete', name: 'Organizational Units > Delete', group: 'Organizational Units', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-reports', name: 'Reports', group: 'Reports', section: 'Admin settings', description: 'Admins have access to usage reports and audit logs. These actions can\'t be limited to specific organizational units.', isChild: false },
  { slug: 'admin-settings-schema-management', name: 'Schema Management', group: 'Schema Management', section: 'Admin settings', description: 'Super admins or services admins with this privilege can create schemas to define custom fields for their domain, such as user projects, locations, or hire dates.', isChild: false },
  { slug: 'admin-settings-security', name: 'Security', group: 'Security', section: 'Admin settings', description: 'Manage security settings for individual users and organization-wide authentication.', isChild: false },
  { slug: 'admin-settings-security-user-security-management', name: 'Security > User Security Management', group: 'Security', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-security-security-settings', name: 'Security > Security Settings', group: 'Security', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-support', name: 'Support', group: 'Support', section: 'Admin settings', description: 'Admins with the Support privilege can use phone, chat, and email options to contact Google Workspace support. They can also file cases in the Google Cloud Support Portal.', isChild: false },
  { slug: 'admin-settings-users', name: 'Users', group: 'Users', section: 'Admin settings', description: 'Admins with the Users privilege can perform actions on users. Only super admins can change another admin\'s settings. The Create privilege automatically grants Read and Update privileges.', isChild: false },
  { slug: 'admin-settings-users-create', name: 'Users > Create', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-read', name: 'Users > Read', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-update', name: 'Users > Update', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-move-users', name: 'Users > Move users', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-suspend-users', name: 'Users > Suspend users', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-rename-users', name: 'Users > Rename users', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-reset-password', name: 'Users > Reset password', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-force-password-change', name: 'Users > Force password change', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-add-remove-aliases', name: 'Users > Add/remove aliases', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'admin-settings-users-delete', name: 'Users > Delete', group: 'Users', section: 'Admin settings', description: '', isChild: true },
  { slug: 'services-service-settings', name: 'Service Settings', group: 'Service Settings', section: 'Services', description: 'Admins with the Service Settings privilege can turn services on or off and change service settings. Does not automatically grant privileges to some services, for example data regions, Data Security, Google Vault, and Security Center.', isChild: false },
  { slug: 'services-alert-center', name: 'Alert Center', group: 'Alert Center', section: 'Services', description: 'Access to the alert center. This privilege is automatically selected with the Service Settings privilege.', isChild: false },
  { slug: 'services-appsheet', name: 'AppSheet', group: 'AppSheet', section: 'Services', description: 'Admins with this privilege can manage Google AppSheet settings, including governance policies and team management.', isChild: false },
  { slug: 'services-calendar', name: 'Calendar', group: 'Calendar', section: 'Services', description: 'Admins with the Calendar privilege can create, edit, and delete resources, but they can\'t limit the actions to specific organizational units.', isChild: false },
  { slug: 'services-calendar-all-settings', name: 'Calendar > All Settings', group: 'Calendar', section: 'Services', description: '', isChild: true },
  { slug: 'services-calendar-buildings-and-resources', name: 'Calendar > Buildings and Resources', group: 'Calendar', section: 'Services', description: '', isChild: true },
  { slug: 'services-calendar-manage-resources', name: 'Calendar > Manage Resources', group: 'Calendar', section: 'Services', description: '', isChild: true },
  { slug: 'services-calendar-view-resources', name: 'Calendar > View Resources', group: 'Calendar', section: 'Services', description: '', isChild: true },
  { slug: 'services-calendar-room-insights', name: 'Calendar > Room Insights', group: 'Calendar', section: 'Services', description: '', isChild: true },
  { slug: 'services-calendar-view-settings', name: 'Calendar > View Settings', group: 'Calendar', section: 'Services', description: '', isChild: true },
  { slug: 'services-calendar-manage-calendars', name: 'Calendar > Manage Calendars', group: 'Calendar', section: 'Services', description: '', isChild: true },
  { slug: 'services-chrome-management', name: 'Chrome Management', group: 'Chrome Management', section: 'Services', description: 'Admins can manage your organization\'s Chrome devices and policies, including user settings, device settings, and Chrome and Managed Google Play apps and extensions on Chrome devices. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-classroom', name: 'Classroom', group: 'Classroom', section: 'Services', description: 'Admins with the Classroom privilege can turn this service on or off for users, set teacher permissions and guardian access, and control how users access their Classroom data.', isChild: false },
  { slug: 'services-classroom-manage-classes', name: 'Classroom > Manage Classes', group: 'Classroom', section: 'Services', description: '', isChild: true },
  { slug: 'services-classroom-view-analytics-data-for-users-and-their-classes', name: 'Classroom > View analytics data for users and their classes', group: 'Classroom', section: 'Services', description: '', isChild: true },
  { slug: 'services-cloud-search', name: 'Cloud Search', group: 'Cloud Search', section: 'Services', description: 'Grant user access to Google Cloud Search, turn the service on or off, view usage reports and manage settings for third-party repositories.', isChild: false },
  { slug: 'services-contacts', name: 'Contacts', group: 'Contacts', section: 'Services', description: 'Admins with the Contacts privilege can view, create, or delete contact delegates for a given user using the Contact Delegation API.', isChild: false },
  { slug: 'services-contacts-delegates-read', name: 'Contacts > Delegates Read', group: 'Contacts', section: 'Services', description: '', isChild: true },
  { slug: 'services-contacts-delegates-write', name: 'Contacts > Delegates Write', group: 'Contacts', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-classification', name: 'Data classification', group: 'Data classification', section: 'Services', description: 'Admins with the Manage Classification Labels privilege can create labels for Drive files and Gmail messages, and view all labels. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-data-classification-manage-classification-labels', name: 'Data classification > Manage Classification Labels', group: 'Data classification', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-loss-prevention-dlp', name: 'Data loss prevention (DLP)', group: 'Data loss prevention (DLP)', section: 'Services', description: 'View and manage DLP rules. Only the View DLP rule privilege is automatically selected with the Service Settings privilege.', isChild: false },
  { slug: 'services-data-loss-prevention-dlp-view-dlp-rule', name: 'Data loss prevention (DLP) > View DLP rule', group: 'Data loss prevention (DLP)', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-loss-prevention-dlp-manage-dlp-rule', name: 'Data loss prevention (DLP) > Manage DLP rule', group: 'Data loss prevention (DLP)', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-regions', name: 'Data regions', group: 'Data regions', section: 'Services', description: 'Choose a geographic location for data covered by a data region policy, and follow the progress as data moves between regions. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-data-regions-data-regions-settings', name: 'Data regions > Data Regions Settings', group: 'Data regions', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-regions-data-regions-reporting', name: 'Data regions > Data Regions Reporting', group: 'Data regions', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-security', name: 'Data Security', group: 'Data Security', section: 'Services', description: 'Admins with this privilege can manage the organization\'s context-aware access policies. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-data-security-access-level-management', name: 'Data Security > Access level management', group: 'Data Security', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-security-rule-management', name: 'Data Security > Rule management', group: 'Data Security', section: 'Services', description: '', isChild: true },
  { slug: 'services-data-studio', name: 'Data Studio', group: 'Data Studio', section: 'Services', description: 'Admins with this privilege can manage Data Studio settings, including viewing, sharing, and customizing dashboards and reports.', isChild: false },
  { slug: 'services-directory-settings', name: 'Directory settings', group: 'Directory settings', section: 'Services', description: 'Admins can manage settings and control Directory profile changes to let users make changes to their profile, including their name, photo, gender, and birthday.', isChild: false },
  { slug: 'services-directory-sync', name: 'Directory Sync', group: 'Directory Sync', section: 'Services', description: 'Add, update and manage Directory Sync settings. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-directory-sync-manage-directory-sync-settings', name: 'Directory Sync > Manage Directory Sync Settings', group: 'Directory Sync', section: 'Services', description: '', isChild: true },
  { slug: 'services-directory-sync-read-directory-sync-settings', name: 'Directory Sync > Read Directory Sync Settings', group: 'Directory Sync', section: 'Services', description: '', isChild: true },
  { slug: 'services-drive-and-docs', name: 'Drive and Docs', group: 'Drive and Docs', section: 'Services', description: 'Google Drive and Docs management rights, including settings, templates and shared drive moves.', isChild: false },
  { slug: 'services-drive-and-docs-settings', name: 'Drive and Docs > Settings', group: 'Drive and Docs', section: 'Services', description: '', isChild: true },
  { slug: 'services-drive-and-docs-docs-templates', name: 'Drive and Docs > Docs Templates', group: 'Drive and Docs', section: 'Services', description: '', isChild: true },
  { slug: 'services-drive-and-docs-move-any-file-or-folder-into-shared-drives', name: 'Drive and Docs > Move any file or folder into shared drives', group: 'Drive and Docs', section: 'Services', description: '', isChild: true },
  { slug: 'services-drive-and-docs-manage-labels', name: 'Drive and Docs > Manage labels', group: 'Drive and Docs', section: 'Services', description: '', isChild: true },
  { slug: 'services-drive-and-docs-view-details-of-google-sites', name: 'Drive and Docs > View details of Google Sites', group: 'Drive and Docs', section: 'Services', description: '', isChild: true },
  { slug: 'services-gemini', name: 'Gemini', group: 'Gemini', section: 'Services', description: 'Control who uses the Gemini app in your organization, and turn the Gemini app on or off.', isChild: false },
  { slug: 'services-gmail', name: 'Gmail', group: 'Gmail', section: 'Services', description: 'Gmail management rights. Only the Settings privilege is automatically selected with the Service Settings privilege.', isChild: false },
  { slug: 'services-gmail-settings', name: 'Gmail > Settings', group: 'Gmail', section: 'Services', description: '', isChild: true },
  { slug: 'services-gmail-email-log-search', name: 'Gmail > Email Log Search', group: 'Gmail', section: 'Services', description: '', isChild: true },
  { slug: 'services-gmail-access-admin-quarantine', name: 'Gmail > Access Admin Quarantine', group: 'Gmail', section: 'Services', description: '', isChild: true },
  { slug: 'services-gmail-access-restricted-quarantines', name: 'Gmail > Access restricted quarantines', group: 'Gmail', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-chat', name: 'Google Chat', group: 'Google Chat', section: 'Services', description: 'Chat management rights. Only the Settings privilege is automatically selected with the Service Settings privilege.', isChild: false },
  { slug: 'services-google-chat-settings', name: 'Google Chat > Settings', group: 'Google Chat', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-chat-manage-chat-and-spaces-conversation', name: 'Google Chat > Manage Chat and Spaces conversation', group: 'Google Chat', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-chat-moderate-chat-content-report', name: 'Google Chat > Moderate Chat content report', group: 'Google Chat', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-cloud-print', name: 'Google Cloud Print', group: 'Google Cloud Print', section: 'Services', description: 'Admins with this privilege can set up and manage Google Cloud Print services for their organization. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-google-meet', name: 'Google Meet', group: 'Google Meet', section: 'Services', description: 'Manage settings and access the quality dashboard for Google Meet.', isChild: false },
  { slug: 'services-google-meet-hardware', name: 'Google Meet hardware', group: 'Google Meet hardware', section: 'Services', description: 'View and manage Google Meet hardware devices. Not available unless your account has at least one Google Meet hardware license or enrolled device.', isChild: false },
  { slug: 'services-google-meet-hardware-manage-google-meet-hardware-and-calendars', name: 'Google Meet hardware > Manage Google Meet hardware and calendars', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-manage-google-meet-hardware', name: 'Google Meet hardware > Manage Google Meet hardware', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-manage-devices', name: 'Google Meet hardware > Manage devices', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-view-devices', name: 'Google Meet hardware > View devices', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-manage-organizational-unit-settings', name: 'Google Meet hardware > Manage organizational unit settings', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-view-organizational-unit-settings', name: 'Google Meet hardware > View organizational unit settings', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-perform-actions', name: 'Google Meet hardware > Perform actions', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-perform-device-commands', name: 'Google Meet hardware > Perform device commands', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-manage-device-meetings', name: 'Google Meet hardware > Manage device meetings', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-deprovision-google-meet-hardware', name: 'Google Meet hardware > Deprovision Google Meet hardware', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-manage-calendar-assignment', name: 'Google Meet hardware > Manage calendar assignment', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-meet-hardware-enroll-google-meet-hardware', name: 'Google Meet hardware > Enroll Google Meet hardware', group: 'Google Meet hardware', section: 'Services', description: '', isChild: true },
  { slug: 'services-google-vault', name: 'Google Vault', group: 'Google Vault', section: 'Services', description: 'Admins can view all matters and manage matters, holds, searches, exports, retention policies, and audits. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-google-workspace-marketplace', name: 'Google Workspace Marketplace', group: 'Google Workspace Marketplace', section: 'Services', description: 'Admins with this privilege can control which third-party or internal apps users can install from the Marketplace.', isChild: false },
  { slug: 'services-groups-for-business', name: 'Groups for Business', group: 'Groups for Business', section: 'Services', description: 'Read and modify settings for Groups for Business, including who can create groups and external visibility.', isChild: false },
  { slug: 'services-managed-google-play', name: 'Managed Google Play', group: 'Managed Google Play', section: 'Services', description: 'Distribute Android apps internally, upload private apps to the Google Play store, and use Android app packages hosted outside of Google Play. Also listed as Google Managed Play. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-manage-on-off-settings', name: 'Manage On/Off Settings', group: 'Manage On/Off Settings', section: 'Services', description: 'Admins with the Manage On/Off Settings privilege can turn services on or off.', isChild: false },
  { slug: 'services-mobile-device-management', name: 'Mobile Device Management', group: 'Mobile Device Management', section: 'Services', description: 'Full control over devices listed in your Admin console: manage settings and policies, approve, block, delete and wipe devices, and publish mobile apps.', isChild: false },
  { slug: 'services-password-vault', name: 'Password Vault', group: 'Password Vault', section: 'Services', description: 'Admins with this privilege can set up and manage password vaulted apps. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-pinpoint', name: 'Pinpoint', group: 'Pinpoint', section: 'Services', description: 'Turn Pinpoint on or off for users, and set whether users can copy files from Google Drive to Pinpoint.', isChild: false },
  { slug: 'services-secure-ldap', name: 'Secure LDAP', group: 'Secure LDAP', section: 'Services', description: 'Manage the Secure LDAP service and add or delete LDAP clients. Available only for administrators with Super Admin privileges. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-security-center', name: 'Security Center', group: 'Security Center', section: 'Services', description: 'Access to advanced security information and analytics, including the security dashboard, the security health page, and the investigation tool. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-shared-device-settings', name: 'Shared device settings', group: 'Shared device settings', section: 'Services', description: 'Manage all common device configurations, including VPN, Wi-Fi, and Ethernet networks for mobile, Chrome, and Chromebox for meetings devices. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-sites', name: 'Sites', group: 'Sites', section: 'Services', description: 'Read and modify settings for Sites, such as whether users can create and edit sites, and whether sites can be shared outside your organization.', isChild: false },
  { slug: 'services-storage', name: 'Storage', group: 'Storage', section: 'Services', description: 'Open the Storage page in the Admin console and set storage limits. Viewing storage data requires additional privileges.', isChild: false },
  { slug: 'services-trust-rules', name: 'Trust Rules', group: 'Trust Rules', section: 'Services', description: 'Trust rules rights for managing Drive sharing.', isChild: false },
  { slug: 'services-trust-rules-view-trust-rules', name: 'Trust Rules > View Trust Rules', group: 'Trust Rules', section: 'Services', description: '', isChild: true },
  { slug: 'services-trust-rules-manage-trust-rules', name: 'Trust Rules > Manage Trust Rules', group: 'Trust Rules', section: 'Services', description: '', isChild: true },
  { slug: 'services-work-insights', name: 'Work Insights', group: 'Work Insights', section: 'Services', description: 'Access data on the Work Insights dashboard. Data is available only for teams that have Work Insights turned on. NOT automatically selected with Service Settings.', isChild: false },
  { slug: 'services-youtube', name: 'YouTube', group: 'YouTube', section: 'Services', description: 'Restrict the YouTube videos that are viewable within your organization and set different YouTube access levels for different organizational units.', isChild: false },
]

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
