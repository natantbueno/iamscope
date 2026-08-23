// IBM Cloud IAM — Roles, e o modelo de acesso da infraestrutura clássica
//
// AUTO-GERADO por scripts/fetch-ibm-roles.js a partir de
// scripts/ibm-official-source.json. Não editar à mão.
//
// FONTES OFICIAIS
//   Platform and service access roles for permissions
//     https://cloud.ibm.com/docs/iam?topic=iam-userroles
//   Managing classic infrastructure access
//     https://cloud.ibm.com/docs/iam?topic=iam-mngclassicinfra
//   Managing migrated SoftLayer account permissions
//     https://cloud.ibm.com/docs/iam?topic=iam-migrated_permissions
//
// Extraído em 2026-08-05.
//
// O MODELO DA IBM TEM DUAS METADES, E ELAS NÃO SE PARECEM
//
//   IAM      — 7 roles: 4 de plataforma (Viewer, Operator, Editor,
//              Administrator) e 3 de serviço (Reader, Writer, Manager).
//              A IBM não publica lista de action por role: cada SERVIÇO mapeia
//              as próprias ações para essas roles. Por isso `actions` vem
//              vazio — é lacuna declarada, não coleta incompleta.
//
//   Clássico — NÃO tem role. O acesso é por permissão individual, em seis
//              categorias (Administrative, Devices, Network, Sales, Security,
//              Software), atribuídas uma a uma ou em bloco por permission set
//              (View only, Basic user, Super user). Acesso a dispositivo e a
//              VPN subnet são concedidos à parte.
//
// O dataset anterior representava a metade clássica como 83 "roles" que a IBM
// não publica, com 243 "actions" que eram prosa em português escrita por nós.
// Ver ROADMAP.md.
//
// tier e isPrivileged são CLASSIFICAÇÃO EDITORIAL do IAM Scope.

export type IbmTier =
  | 'AccountAdmin'      // reservado — hoje nenhuma role oficial cai aqui
  | 'PlatformAdmin'     // Administrator — único que concede acesso a outros
  | 'PlatformOperator'  // Editor, Operator, Writer
  | 'ServiceManager'    // Manager
  | 'ReadOnly'          // Viewer, Reader

export type IbmCategory = 'Identity' | 'Platform' | 'Classic'

export type IbmAccessModel = 'iam' | 'classic'

/** 'platform' vale para qualquer recurso; 'service' é por instância de serviço. */
export type IbmRoleKind = 'platform' | 'service'

export interface IbmTierMeta {
  label: string
  color: string
  bg: string
  description: string
}

export interface IbmRole {
  slug: string
  name: string
  description: string
  tier: IbmTier
  category: IbmCategory
  accessModel: IbmAccessModel
  kind: IbmRoleKind
  isPrivileged: boolean
  /** Vazio de propósito: a IBM mapeia ações por serviço, não por role. */
  actions: string[]
}

/** Categoria de permissão da infraestrutura clássica. */
export interface IbmClassicCategory {
  id: string
  name: string
  description: string
}

/** Permissão individual da infraestrutura clássica. Nome e descrição verbatim da IBM. */
export interface IbmClassicPermission {
  /** id de IbmClassicCategory. */
  category: string
  name: string
  description: string
}

export { IBM_TIER_META } from './tierMeta'

export const IBM_SOURCES = [
  {
    "id": "iam-roles-overview",
    "url": "https://cloud.ibm.com/docs/iam?topic=iam-userroles",
    "repo": "https://github.com/ibm-cloud-docs/iam/blob/master/iam-roles-overview.md",
    "title": "Platform and service access roles for permissions",
    "note": "Platform roles e service roles, com a descrição oficial de cada uma.",
    "docLastUpdated": "2026-05-06"
  },
  {
    "id": "mngclassicinfra",
    "url": "https://cloud.ibm.com/docs/iam?topic=iam-mngclassicinfra",
    "repo": "https://github.com/ibm-cloud-docs/iam/blob/master/iam-mnginfra.md",
    "title": "Managing classic infrastructure access",
    "note": "Fonte das SEIS categorias e da lista enumerada das 71 permissões clássicas, além de device access, VPN subnet e permission set.",
    "docLastUpdated": "2026-06-04"
  },
  {
    "id": "migrated_permissions",
    "url": "https://cloud.ibm.com/docs/iam?topic=iam-migrated_permissions",
    "repo": "https://github.com/ibm-cloud-docs/iam/blob/master/iam-migrated_permissions.md",
    "title": "Managing migrated SoftLayer account permissions",
    "note": "As permissões clássicas de billing e suporte que viraram access groups do IAM — não aparecem mais nas seis categorias.",
    "docLastUpdated": "2026-05-06"
  }
] as const

export const IBM_EXTRACTED_AT = '2026-08-05'

export const IBM_ROLES: IbmRole[] = [
  {
    slug: 'platform-viewer',
    name: 'Viewer',
    description: 'As a viewer, you can view service instances, but you can\'t modify them.',
    tier: 'ReadOnly', category: 'Platform', accessModel: 'iam',
    kind: 'platform', isPrivileged: false,
    actions: [],
  },
  {
    slug: 'platform-operator',
    name: 'Operator',
    description: 'As an operator, you can perform platform actions required to configure and operate service instances, such as viewing a service\'s dashboard.',
    tier: 'PlatformOperator', category: 'Platform', accessModel: 'iam',
    kind: 'platform', isPrivileged: false,
    actions: [],
  },
  {
    slug: 'platform-editor',
    name: 'Editor',
    description: 'As an editor, you can perform all platform actions except for managing the account and assigning access policies.',
    tier: 'PlatformOperator', category: 'Platform', accessModel: 'iam',
    kind: 'platform', isPrivileged: false,
    actions: [],
  },
  {
    slug: 'platform-administrator',
    name: 'Administrator',
    description: 'As an administrator, you can perform all platform actions based on the resource this role is being assigned, including assigning access policies to other users.',
    tier: 'PlatformAdmin', category: 'Platform', accessModel: 'iam',
    kind: 'platform', isPrivileged: true,
    actions: [],
  },
  {
    slug: 'service-reader',
    name: 'Reader',
    description: 'Service access role. Service access roles define a user or service\'s ability to perform actions on a service instance, such as accessing the console or performing API calls. Each service maps particular actions for working with the service to each of these roles.',
    tier: 'ReadOnly', category: 'Identity', accessModel: 'iam',
    kind: 'service', isPrivileged: false,
    actions: [],
  },
  {
    slug: 'service-writer',
    name: 'Writer',
    description: 'Service access role. Service access roles define a user or service\'s ability to perform actions on a service instance, such as accessing the console or performing API calls. Each service maps particular actions for working with the service to each of these roles.',
    tier: 'PlatformOperator', category: 'Identity', accessModel: 'iam',
    kind: 'service', isPrivileged: false,
    actions: [],
  },
  {
    slug: 'service-manager',
    name: 'Manager',
    description: 'Service access role. Service access roles define a user or service\'s ability to perform actions on a service instance, such as accessing the console or performing API calls. Each service maps particular actions for working with the service to each of these roles.',
    tier: 'ServiceManager', category: 'Identity', accessModel: 'iam',
    kind: 'service', isPrivileged: false,
    actions: [],
  },
]

// ── Infraestrutura clássica ─────────────────────────────────────────────────
//
// Modelo separado de propósito: não são roles, e tratá-las como se fossem foi
// exatamente o erro do dataset anterior.

export const IBM_CLASSIC_MODEL = 'permission'

export const IBM_CLASSIC_MODEL_NOTE = 'A infraestrutura clássica NÃO usa roles pré-construídas. O acesso é concedido por permissões individuais, selecionadas uma a uma ou em bloco por um permission set. Era isso que o dataset anterior representava errado: inventava 83 \'roles\' clássicas que a IBM não publica.'

export const IBM_CLASSIC_CATEGORIES: IbmClassicCategory[] = [
  { id: 'administrative', name: 'Administrative', description: 'Gestão da conta clássica: usuários, notas, notificações, entrega de e-mail, log de eventos e acesso físico a datacenter e colo cage.' },
  { id: 'devices', name: 'Devices', description: 'Permissões sobre dispositivos — hardware, virtual guest e dedicated host. O acesso aos dispositivos ESPECÍFICOS é atribuído à parte, por dispositivo ou por tipo, com opção de acesso automático a dispositivos futuros.' },
  { id: 'network', name: 'Network', description: 'Rede: DNS, firewall, load balancer, gateway, VLAN, security group e administração de VPN. O acesso às VPN subnets é atribuído à parte e pode ser automático conforme o acesso a dispositivos.' },
  { id: 'sales', name: 'Sales', description: 'Pedido, upgrade e cancelamento de servidores, serviços e storage — permissões que geram ou encerram cobrança.' },
  { id: 'security', name: 'Security', description: 'Certificados SSL/TLS (inclusive chave privada), chaves SSH e configuração de autenticação SAML.' },
  { id: 'software', name: 'Software', description: 'Software instalado nos dispositivos: antivírus, firewall de software, imagens, licenças e credenciais de painéis (cPanel, Plesk, Helm, QuantaStor, Urchin).' },
]

export const IBM_CLASSIC_NOTES: string[] = [
  'Para acessar: Manage > Access (IAM) > Users > [usuário] > Classic infrastructure.',
  'No convite ao usuário há três permission sets de atribuição em bloco: View only, Basic user e Super user. O ajuste fino é feito depois, permissão a permissão.',
  'Quem edita precisa da permissão \'Manage Users\' da infraestrutura clássica e ser ancestral do usuário na hierarquia clássica.',
  'Account owners têm acesso total e não veem a página de permissões. Ninguém edita as próprias permissões.',
  'Acesso a dispositivo NÃO vem no convite: é atribuído depois, por dispositivo ou por tipo, com a opção \'Enable future access\' para dispositivos novos.',
  'VPN subnets são atribuídas à parte. Para alterar a de terceiros é preciso a permissão \'VPN Administration\' mais política IAM de Viewer (ou superior) no serviço User Management — ou ser master user.',
  'As permissões de account management e support que existiam na infraestrutura clássica foram MIGRADAS para access groups do IAM e por isso não estão nas seis categorias.',
  'Recomenda-se dar acesso de account management do support center a quem trabalha com recursos clássicos: criar ou excluir uma instância exige poder abrir caso de suporte.',
]

/** false = a lista enumerada de permissões clássicas ainda não foi coletada. */
export const IBM_CLASSIC_PERMISSIONS_AVAILABLE = true

export const IBM_CLASSIC_PERMISSIONS_NOTE = 'Lista enumerada extraída do doc-fonte iam-mnginfra.md (ibm-cloud-docs/iam), atualizado pela IBM em 2026-06-04. Nomes e descrições são verbatim da IBM.'

/**
 * As permissões individuais, verbatim da IBM.
 *
 * Não são roles e não devem virar roles: é isso que a página /ibm-cloud/classic
 * existe para deixar claro. Ordem = a das tabelas do doc oficial.
 */
export const IBM_CLASSIC_PERMISSIONS: IbmClassicPermission[] = [
  { category: 'administrative', name: 'Activate Partner Customer Account', description: 'Enable partner accounts to begin managing customer resources and billing' },
  { category: 'administrative', name: 'Add Brand Account', description: 'Create sub-brand accounts for reseller or partner organizational hierarchies' },
  { category: 'administrative', name: 'Add Customer Account', description: 'Create new customer accounts within the account structure' },
  { category: 'administrative', name: 'Manage Account Notes', description: 'Add, edit, and delete internal notes for account documentation and tracking' },
  { category: 'administrative', name: 'Manage E-mail Delivery Service', description: 'Configure e-mail delivery service accounts for system notifications' },
  { category: 'administrative', name: 'Manage Notification Subscribers', description: 'Create and manage notification subscribers for usage warnings and overages' },
  { category: 'administrative', name: 'Manage Users', description: 'Add, remove, and modify user access and classic infrastructure permissions' },
  { category: 'administrative', name: 'Physically Access a Customer\'s Colo Cage', description: 'Authorize physical entry to customer colocation cages in data centers' },
  { category: 'administrative', name: 'Physically Access a Datacenter', description: 'Authorize physical entry to IBM Cloud data center facilities' },
  { category: 'administrative', name: 'View Event Log', description: 'Access the account-wide event log history for audit and troubleshooting purposes' },
  { category: 'devices', name: 'Add IP Addresses', description: 'Assign additional IP addresses to servers for network configuration' },
  { category: 'devices', name: 'Edit Hostname/Domain', description: 'Modify hostname and domain name settings for devices' },
  { category: 'devices', name: 'Host IDS', description: 'Access Host Intrusion Detection System logs for security monitoring' },
  { category: 'devices', name: 'IPMI Remote Management', description: 'Access IPMI interface to view hardware details and issue remote reboot commands through the portal' },
  { category: 'devices', name: 'Manage Configuration Template', description: 'Create, edit, and delete configuration templates for automated device setup' },
  { category: 'devices', name: 'Manage Customer Hardware', description: 'Perform administrative actions on bare metal servers and hardware devices' },
  { category: 'devices', name: 'Manage Device Monitoring', description: 'Configure monitoring settings and view performance metrics for devices' },
  { category: 'devices', name: 'Manage Provisioning Scripts', description: 'Create and modify post-provisioning scripts that run after device deployment' },
  { category: 'devices', name: 'Manage Public Images', description: 'Create, edit, and delete public image templates available across the account' },
  { category: 'devices', name: 'OS Reloads and Rescue Kernel', description: 'Initiate operating system reloads and boot devices into rescue mode for recovery' },
  { category: 'devices', name: 'Storage Manage', description: 'Access storage volume details and modify storage access credentials' },
  { category: 'devices', name: 'View Hardware Details', description: 'Access hardware specifications, IP addresses, OS type, and passwords; includes ability to update hardware passwords in the portal' },
  { category: 'devices', name: 'View Location Reservation', description: 'Access information about reserved data center locations and capacity' },
  { category: 'devices', name: 'View Virtual Dedicated Host Details', description: 'Access virtual dedicated host specifications and migrate instances between hosts' },
  { category: 'devices', name: 'View Virtual Server Details', description: 'Access virtual server specifications, IP addresses, OS type, and passwords; includes ability to update virtual server passwords in the portal' },
  { category: 'devices', name: 'View and edit dedicated host', description: 'Access and modify dedicated host configurations and settings' },
  { category: 'devices', name: 'View and edit virtual guest', description: 'Access and modify virtual guest properties and configurations' },
  { category: 'network', name: 'Add Compute with Public Network Port', description: 'Provision servers or cloud instances with public network connectivity and port speeds' },
  { category: 'network', name: 'Manage CDN Account', description: 'Configure and maintain content delivery network account settings' },
  { category: 'network', name: 'Manage CDN File Transfers', description: 'Upload, download, and manage files distributed through the content delivery network' },
  { category: 'network', name: 'Manage DNS', description: 'Create, modify, and delete DNS records for domains managed by SoftLayer' },
  { category: 'network', name: 'Manage Firewall Rules', description: 'Create, modify, and delete firewall rules across all network devices' },
  { category: 'network', name: 'Manage Firewalls', description: 'Configure firewall settings and review firewall logs for security analysis' },
  { category: 'network', name: 'Manage Load Balancers', description: 'Configure, monitor, and maintain load balancer services' },
  { category: 'network', name: 'Manage Network Gateways', description: 'Configure and maintain network gateway appliances for routing and security' },
  { category: 'network', name: 'Manage Network Subnet Routes', description: 'Define and modify routing rules for network subnets' },
  { category: 'network', name: 'Manage Network VLAN Spanning', description: 'Control whether private network VLANs can communicate across the account' },
  { category: 'network', name: 'Manage Port Control', description: 'Configure network port status and connection speeds for devices' },
  { category: 'network', name: 'Manage Private Endpoint Service', description: 'Enable or disable private endpoint connectivity for secure service access' },
  { category: 'network', name: 'Manage Security Groups', description: 'Create, modify, and delete security groups and their associated rules' },
  { category: 'network', name: 'VPN Administration', description: 'Configure VPN access settings and manage VPN permissions for all account users' },
  { category: 'network', name: 'View Bandwidth Statistics', description: 'Access bandwidth usage data and graphs for hardware devices' },
  { category: 'network', name: 'View CDN Bandwidth Statistics', description: 'Access bandwidth usage data for content delivery network services' },
  { category: 'sales', name: 'Add Server', description: 'Order and provision new bare metal or virtual servers' },
  { category: 'sales', name: 'Add/Upgrade Cloud Instances', description: 'Order new cloud instances and upgrade existing instance configurations' },
  { category: 'sales', name: 'Add/Upgrade Services', description: 'Order new services and upgrade existing service plans' },
  { category: 'sales', name: 'Add/Upgrade Storage (StorageLayer)', description: 'Order new storage volumes and upgrade existing storage capacity' },
  { category: 'sales', name: 'Cancel Server', description: 'Terminate server instances and remove them from billing' },
  { category: 'sales', name: 'Cancel Services', description: 'Terminate services and remove them from billing' },
  { category: 'sales', name: 'Upgrade Server', description: 'Modify server specifications such as CPU, RAM, or disk capacity' },
  { category: 'sales', name: 'Upgrade Services', description: 'Modify service plans and configurations for existing services' },
  { category: 'sales', name: 'View Billing ACH Information', description: 'Access Automated Clearing House payment details for billing transactions' },
  { category: 'sales', name: 'View reseller order pricing', description: 'Access special pricing information available to reseller accounts' },
  { category: 'security', name: 'Manage Certificates (SSL)', description: 'Upload, modify, and delete SSL/TLS certificates including private keys' },
  { category: 'security', name: 'Manage SAML Authentication', description: 'Configure SAML identity provider settings for federated authentication' },
  { category: 'security', name: 'Manage SSH Keys', description: 'Upload, modify, and delete SSH public keys for secure server access' },
  { category: 'security', name: 'View Certificates (SSL)', description: 'Access SSL/TLS certificate details including private keys' },
  { category: 'software', name: 'Manage Antivirus/Spyware', description: 'Configure antivirus and spyware protection settings and review security logs' },
  { category: 'software', name: 'Manage Firewall Software', description: 'Configure and maintain software-based firewall applications' },
  { category: 'software', name: 'Openstack Link', description: 'Establish or remove OpenStack integration for hybrid cloud connectivity' },
  { category: 'software', name: 'View Customer Software Password', description: 'Access passwords for customer-installed software applications' },
  { category: 'software', name: 'View Helm', description: 'Access login credentials for Helm package manager' },
  { category: 'software', name: 'View Plesk', description: 'Access login credentials for Plesk control panel' },
  { category: 'software', name: 'View QuantaStor', description: 'Access login credentials for QuantaStor storage management system' },
  { category: 'software', name: 'View Urchin', description: 'Access login credentials for Urchin web analytics software' },
  { category: 'software', name: 'View and edit disk image', description: 'Access and modify disk image files and metadata' },
  { category: 'software', name: 'View and edit manage image template', description: 'Access and modify image templates used for device provisioning' },
  { category: 'software', name: 'View and edit software component', description: 'Access and modify software component configurations' },
  { category: 'software', name: 'View cPanel', description: 'Access login credentials for cPanel control panel' },
  { category: 'software', name: 'View licenses', description: 'Access software license information and keys' },
  { category: 'software', name: 'View software account license', description: 'Access account-level software licensing details and entitlements' },
]

export const IBM_CLASSIC_PERMISSIONS_COUNT = 71
