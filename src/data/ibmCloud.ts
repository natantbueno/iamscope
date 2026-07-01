// ── IBM Cloud IAM — Roles & Access ───────────────────────────────────────────
// Sources:
//   https://cloud.ibm.com/docs/account?topic=account-userroles
//   https://cloud.ibm.com/docs/account?topic=account-mngclassicinfra
//   https://cloud.ibm.com/docs/account?topic=account-iam-service-roles-actions

export type IbmTier =
  | 'AccountAdmin'      // Account Owner / IAM Administrator — controle total da conta
  | 'PlatformAdmin'     // Administrator em serviços — pode conceder acesso a outros
  | 'PlatformOperator'  // Editor / Operator — cria e modifica recursos
  | 'ServiceManager'    // Manager em serviços específicos
  | 'ReadOnly'          // Viewer / Reader / Auditor — acesso somente leitura

export type IbmCategory =
  | 'Identity'
  | 'AccountManagement'
  | 'Platform'
  | 'Infrastructure'
  | 'Compute'
  | 'Data'
  | 'Security'
  | 'Observability'
  | 'Networking'
  | 'Classic'
  | 'ClassicAdministrative'
  | 'ClassicDevice'
  | 'ClassicNetwork'
  | 'ClassicSales'
  | 'ClassicSecurity'
  | 'ClassicSoftware'
  | 'CloudFoundry'

export type IbmAccessModel = 'iam' | 'classic' | 'cloud-foundry'

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
  isPrivileged: boolean
  scope: 'account' | 'resource-group' | 'service' | 'classic' | 'org' | 'space'
  privileges: string[]
  actions?: string[]
}

// ── Tier Metadata ─────────────────────────────────────────────────────────────

export const IBM_TIER_META: Record<IbmTier, IbmTierMeta> = {
  AccountAdmin: {
    label: 'Account Admin',
    color: '#dc2626',
    bg: '#fef2f2',
    description: 'Controle total da conta IBM Cloud, incluindo IAM, faturamento e todos os serviços. Tier de maior privilégio.',
  },
  PlatformAdmin: {
    label: 'Platform Admin',
    color: '#ea580c',
    bg: '#fff7ed',
    description: 'Função Administrator em serviços IBM Cloud. Pode gerenciar recursos e conceder acesso a outros usuários.',
  },
  PlatformOperator: {
    label: 'Platform Operator',
    color: '#ca8a04',
    bg: '#fefce8',
    description: 'Funções Editor ou Operator em serviços. Pode criar, modificar e excluir recursos, mas não gerenciar acesso.',
  },
  ServiceManager: {
    label: 'Service Manager',
    color: '#7c3aed',
    bg: '#f5f3ff',
    description: 'Função Manager dentro de um serviço específico IBM Cloud. Inclui todas as ações de Writer mais administração do serviço.',
  },
  ReadOnly: {
    label: 'Read Only',
    color: '#16a34a',
    bg: '#f0fdf4',
    description: 'Viewer, Reader ou Auditor. Pode visualizar recursos e configurações mas não pode fazer alterações.',
  },
}

// ── IBM Cloud Roles ───────────────────────────────────────────────────────────

export const IBM_ROLES: IbmRole[] = [

  // ── Account & IAM ──────────────────────────────────────────────────────────
  {
    slug: 'account-owner',
    name: 'Account Owner',
    description: 'Função implícita concedida ao criador da conta IBM Cloud. Possui acesso total e irrestrito a todos os recursos, serviços e configurações IAM da conta. Não pode ser removido ou alterado.',
    tier: 'AccountAdmin', category: 'Identity', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Acesso completo a todos os recursos',
      'Gerenciar todas as políticas IAM',
      'Gerenciar faturamento e pagamentos',
      'Convidar e remover usuários',
      'Habilitar e desabilitar todos os serviços',
      'Acessar todos os recursos de suporte',
      'Fechar a conta',
    ],
    actions: ['iam-identity.account.update', 'iam-identity.user.create', 'iam-identity.user.delete', 'iam-identity.policy.create', 'iam-identity.policy.delete', 'billing.account.update', 'billing.invoice.read', 'iam-groups.group.create', 'iam-groups.group.delete', 'iam-identity.serviceid.create', 'iam-identity.apikey.create', 'iam-identity.profile.create', 'support.case.create'],
  },
  {
    slug: 'iam-administrator',
    name: 'IAM Administrator',
    description: 'Administra todas as configurações de Identity and Access Management (IAM) da conta. Gerencia usuários, grupos de acesso, IDs de serviço, perfis confiáveis e políticas de acesso. Atribuído via serviço "All Account Management Services" ou individualmente.',
    tier: 'AccountAdmin', category: 'Identity', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Criar, atualizar e excluir IDs de serviço e chaves de API',
      'Designar políticas de acesso aos IDs de serviço',
      'Visualizar, criar, atualizar e excluir IdPs',
      'Atualizar configuração de conta IAM para IDs de serviço e criação de chave de API',
      'Criar perfis confiáveis (Trusted Profiles)',
      'Exibir, criar, editar e excluir funções personalizadas',
      'Exibir e atualizar configurações do IAM',
      'Exibir, criar, editar e excluir políticas de acesso',
      'Visualizar, criar, editar e excluir grupos de acesso',
      'Adicionar ou remover usuários de grupos, incluindo outros administradores',
      'Atribuir acesso a um grupo',
      'Convidar e remover usuários da conta',
    ],
    actions: ['iam-identity.serviceid.create', 'iam-identity.serviceid.delete', 'iam-identity.serviceid.update', 'iam-identity.apikey.create', 'iam-identity.apikey.delete', 'iam-identity.policy.create', 'iam-identity.policy.update', 'iam-identity.policy.delete', 'iam-groups.group.create', 'iam-groups.group.delete', 'iam-groups.member.add', 'iam-groups.member.remove', 'iam-identity.profile.create', 'iam-identity.profile.update', 'iam-identity.role.create'],
  },
  {
    slug: 'iam-editor',
    name: 'IAM Editor',
    description: 'Edita configurações IAM e grupos de acesso, mas não pode criar ou excluir políticas IAM de nível superior. Útil para delegação de gerenciamento IAM dentro de limites definidos.',
    tier: 'PlatformAdmin', category: 'Identity', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Editar grupos de acesso',
      'Editar IDs de serviço',
      'Editar perfis confiáveis',
      'Visualizar políticas IAM',
      'Não pode criar políticas de nível de conta',
    ],
    actions: ['iam-groups.group.update', 'iam-identity.serviceid.update', 'iam-identity.profile.update', 'iam-identity.policy.read', 'iam-groups.group.read', 'iam-identity.serviceid.read', 'iam-identity.profile.read', 'iam-identity.account-settings.read'],
  },
  {
    slug: 'iam-operator',
    name: 'IAM Operator',
    description: 'Visualiza recursos IAM e realiza ações operacionais limitadas, como bloquear/desbloquear chaves de API de IDs de serviço.',
    tier: 'PlatformOperator', category: 'Identity', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar políticas IAM',
      'Bloquear/desbloquear chaves de API de IDs de serviço',
      'Visualizar grupos de acesso',
      'Visualizar perfis confiáveis',
    ],
    actions: ['iam-identity.policy.read', 'iam-identity.apikey.lock', 'iam-identity.apikey.unlock', 'iam-groups.group.read', 'iam-identity.serviceid.read', 'iam-identity.profile.read', 'iam-identity.account-settings.read', 'iam-identity.user.read'],
  },
  {
    slug: 'iam-viewer',
    name: 'IAM Viewer',
    description: 'Acesso somente leitura a recursos IAM, incluindo usuários, grupos de acesso, IDs de serviço e políticas.',
    tier: 'ReadOnly', category: 'Identity', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar políticas IAM',
      'Visualizar lista de usuários',
      'Visualizar grupos de acesso',
      'Visualizar IDs de serviço',
      'Visualizar perfis confiáveis',
    ],
    actions: ['iam-identity.policy.read', 'iam-identity.user.read', 'iam-groups.group.read', 'iam-identity.serviceid.read', 'iam-identity.profile.read', 'iam-identity.account-settings.read', 'iam-groups.member.read', 'iam-identity.apikey.read'],
  },

  // ── Account Management Services ────────────────────────────────────────────
  {
    slug: 'all-account-management-admin',
    name: 'All Account Management Services — Administrator',
    description: 'Concede acesso de Administrator a todos os serviços de gerenciamento de conta simultaneamente: IAM Identity, User Management, Billing, Support Center, Global Catalog, Enterprise e mais. A forma mais ampla de delegar controle administrativo da conta.',
    tier: 'AccountAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Administrator em todos os serviços de conta',
      'Gerenciar usuários e acesso IAM',
      'Gerenciar faturamento e uso',
      'Gerenciar casos de suporte',
      'Gerenciar catálogo global',
      'Gerenciar contas Enterprise',
    ],
    actions: ['iam-identity.account.update', 'iam-identity.user.create', 'iam-identity.user.delete', 'billing.account.update', 'billing.invoice.read', 'support.case.create', 'support.case.update', 'enterprise.account.create', 'global-catalog.entry.update', 'iam-identity.policy.create'],
  },
  {
    slug: 'user-management-administrator',
    name: 'User Management — Administrator',
    description: 'Gerencia usuários na conta IBM Cloud: convidar, remover e atualizar configurações de visibilidade do perfil de usuários. Pode ver todos os usuários da conta independente da configuração "Usuários podem ver outros usuários".',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Convidar usuários para a conta',
      'Remover usuários da conta',
      'Visualizar todos os usuários',
      'Atualizar configurações de visibilidade de usuários',
      'Gerenciar atribuições de acesso de usuários',
    ],
    actions: ['iam-identity.user.create', 'iam-identity.user.delete', 'iam-identity.user.update', 'iam-identity.user.read', 'iam-identity.user.invite', 'user-management.user.state-update', 'user-management.user.list', 'user-management.preference.update'],
  },
  {
    slug: 'user-management-viewer',
    name: 'User Management — Viewer',
    description: 'Visualiza todos os usuários da conta independente da configuração de visibilidade. Permite listar membros da conta sem poder convidar ou remover.',
    tier: 'ReadOnly', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar todos os usuários da conta',
      'Visualizar informações de perfil de usuários',
    ],
    actions: ['iam-identity.user.read', 'user-management.user.list', 'user-management.preference.read'],
  },
  {
    slug: 'billing-administrator',
    name: 'Billing — Administrator',
    description: 'Gerencia todas as configurações de faturamento: métodos de pagamento, faturas, informações de uso e limites de gastos. Pode atualizar configurações da conta e aplicar códigos de assinatura e funcionalidade.',
    tier: 'AccountAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Visualizar e gerenciar informações de faturamento',
      'Adicionar/atualizar métodos de pagamento',
      'Visualizar faturas',
      'Definir limites de gastos',
      'Gerenciar tags de alocação de custos',
      'Visualizar dashboard de uso',
      'Aplicar códigos de assinatura e funcionalidade',
    ],
    actions: ['billing.account.update', 'billing.invoice.read', 'billing.payment-method.create', 'billing.payment-method.update', 'billing.spending-limit.update', 'billing.usage.read', 'billing.subscription.apply', 'billing.cost-tag.manage'],
  },
  {
    slug: 'billing-editor',
    name: 'Billing — Editor',
    description: 'Visualiza e edita informações de faturamento, mas não pode atualizar métodos de pagamento nem fechar a conta.',
    tier: 'PlatformOperator', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar faturas',
      'Visualizar relatórios de uso',
      'Gerenciar tags de alocação de custos',
      'Visualizar limites de gastos',
    ],
    actions: ['billing.invoice.read', 'billing.usage.read', 'billing.cost-tag.manage', 'billing.spending-limit.read'],
  },
  {
    slug: 'billing-viewer',
    name: 'Billing — Viewer',
    description: 'Acesso somente leitura a informações de faturamento, uso e faturas da conta.',
    tier: 'ReadOnly', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar faturas',
      'Visualizar relatórios de uso',
      'Visualizar cobranças atuais',
    ],
    actions: ['billing.invoice.read', 'billing.usage.read', 'billing.charge.read'],
  },
  {
    slug: 'global-catalog-administrator',
    name: 'Global Catalog — Administrator',
    description: 'Gerencia a visibilidade de serviços no Catálogo Global IBM Cloud para a conta. Pode ocultar ou tornar visíveis serviços do catálogo público para usuários da conta.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Ocultar serviços do catálogo para usuários da conta',
      'Tornar serviços visíveis no catálogo',
      'Gerenciar visibilidade de planos de serviço',
      'Visualizar todos os serviços do catálogo',
    ],
    actions: ['global-catalog.entry.read', 'global-catalog.entry.update', 'global-catalog.entry.visibility-set', 'global-catalog.plan.read', 'global-catalog.plan.update'],
  },
  {
    slug: 'enterprise-administrator',
    name: 'Enterprise — Administrator',
    description: 'Gerencia contas Enterprise IBM Cloud: criar e organizar contas-filhas, mover contas entre grupos e visualizar uso consolidado. Necessário para estruturas de multi-conta corporativa.',
    tier: 'AccountAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Criar e gerenciar contas-filhas',
      'Organizar contas em grupos de conta',
      'Visualizar uso consolidado da Enterprise',
      'Aplicar assinaturas entre contas',
      'Convidar contas existentes para a Enterprise',
      'Importar contas para a hierarquia',
    ],
    actions: ['enterprise.account.create', 'enterprise.account.update', 'enterprise.account-group.create', 'enterprise.account-group.update', 'enterprise.account.move', 'enterprise.usage-report.read', 'enterprise.account.import', 'enterprise.subscription.apply'],
  },
  {
    slug: 'support-administrator',
    name: 'Support Center — Administrator',
    description: 'Abre, visualiza e gerencia casos de suporte da conta IBM Cloud. Pode adicionar comentários, anexos e escalar casos.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Abrir casos de suporte',
      'Visualizar todos os casos de suporte da conta',
      'Adicionar atualizações e comentários',
      'Escalar casos',
      'Visualizar planos de suporte disponíveis',
    ],
    actions: ['support.case.create', 'support.case.read', 'support.case.update', 'support.case.escalate', 'support.case.comment-add', 'support.plan.read'],
  },

  // ── Platform Roles (IAM-enabled services) ──────────────────────────────────
  {
    slug: 'platform-administrator',
    name: 'Platform Administrator',
    description: 'Função de plataforma mais elevada para serviços IAM-habilitados. Gerenciamento completo de recursos mais capacidade de atribuir políticas de acesso a outros usuários para o serviço. Inclui todas as ações de Editor e Operator.',
    tier: 'PlatformAdmin', category: 'Platform', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Criar e excluir instâncias de serviço',
      'Visualizar todos os recursos',
      'Atribuir acesso a outros usuários (única função com esta capacidade)',
      'Gerenciar configuração do serviço',
      'Visualizar credenciais do serviço',
      'Inclui todas as ações de Editor e Operator',
    ],
    actions: ['is.instance.instance.create', 'is.instance.instance.delete', 'is.instance.instance.read', 'is.instance.instance.update', 'iam-identity.policy.create', 'iam-identity.policy.delete', 'resource-controller.instance.create', 'resource-controller.instance.delete', 'resource-controller.instance.update', 'resource-controller.instance.read'],
  },
  {
    slug: 'platform-editor',
    name: 'Platform Editor',
    description: 'Cria, modifica e exclui instâncias e recursos de serviço. Não pode atribuir políticas IAM a outros usuários. Inclui todas as ações de Operator.',
    tier: 'PlatformOperator', category: 'Platform', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Criar instâncias de serviço',
      'Modificar recursos',
      'Excluir recursos',
      'Vincular serviços a aplicações',
      'Visualizar detalhes do serviço',
      'Não pode atribuir acesso a outros usuários',
    ],
  },
  {
    slug: 'platform-operator',
    name: 'Platform Operator',
    description: 'Visualiza instâncias de serviço e realiza ações operacionais. Não pode criar ou excluir recursos. Usado para operações do dia a dia como reiniciar e escalar sem risco de exclusão.',
    tier: 'PlatformOperator', category: 'Platform', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar instâncias de serviço',
      'Executar ações operacionais (reiniciar, escalar)',
      'Visualizar credenciais do serviço',
      'Visualizar logs',
      'Não pode criar ou excluir instâncias',
    ],
  },
  {
    slug: 'platform-viewer',
    name: 'Platform Viewer',
    description: 'Acesso somente leitura a instâncias e propriedades de serviço. Nenhuma modificação permitida. Função padrão para auditoria e visibilidade.',
    tier: 'ReadOnly', category: 'Platform', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar instâncias de serviço',
      'Visualizar detalhes de recursos',
      'Visualizar planos de serviço',
    ],
  },
  {
    slug: 'service-config-reader',
    name: 'Service Configuration Reader',
    description: 'Lê metadados de configuração do serviço. Mais restrito que Viewer — expõe apenas detalhes de configuração, não dados operacionais. Útil para ferramentas de compliance e auditoria de configuração.',
    tier: 'ReadOnly', category: 'Platform', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Ler configuração do serviço',
      'Visualizar metadados do serviço',
      'Visualizar detalhes de conformidade',
    ],
  },

  // ── Service Access Roles ────────────────────────────────────────────────────
  {
    slug: 'service-manager',
    name: 'Service Manager',
    description: 'Acesso de gerenciamento completo dentro de um serviço IBM Cloud específico. Inclui todas as ações de Writer mais administração do serviço. O nível de ações exatas varia por serviço.',
    tier: 'ServiceManager', category: 'Platform', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Inclui todas as ações de Writer',
      'Gerenciar configuração do serviço',
      'Criar e gerenciar credenciais',
      'Gerenciar instâncias do serviço',
      'Visualizar todos os dados do serviço',
    ],
  },
  {
    slug: 'service-writer',
    name: 'Service Writer',
    description: 'Acesso de leitura e escrita dentro de um serviço específico. Inclui todas as ações de Reader mais a capacidade de criar e modificar recursos específicos do serviço.',
    tier: 'PlatformOperator', category: 'Platform', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Inclui todas as ações de Reader',
      'Criar recursos dentro do serviço',
      'Modificar dados do serviço',
      'Excluir recursos do serviço',
    ],
  },
  {
    slug: 'service-reader',
    name: 'Service Reader',
    description: 'Acesso somente leitura a dados e recursos dentro de um serviço IBM Cloud específico.',
    tier: 'ReadOnly', category: 'Platform', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar recursos do serviço',
      'Ler dados do serviço',
      'Visualizar configurações',
    ],
  },

  // ── Security ───────────────────────────────────────────────────────────────
  {
    slug: 'key-protect-manager',
    name: 'Key Protect Manager',
    description: 'Gerenciamento completo de chaves de criptografia no IBM Key Protect. Cria, rotaciona, desabilita, restaura e exclui chaves raiz e padrão. Pode importar material de chave.',
    tier: 'ServiceManager', category: 'Security', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Criar chaves raiz e padrão',
      'Rotacionar chaves',
      'Excluir chaves',
      'Restaurar chaves excluídas',
      'Habilitar/desabilitar chaves',
      'Visualizar todos os metadados de chaves',
      'Importar material de chave',
      'Fazer wrap e unwrap de chaves',
    ],
  },
  {
    slug: 'key-protect-writer',
    name: 'Key Protect Writer',
    description: 'Cria e gerencia chaves padrão no Key Protect e utiliza chaves raiz para operações de wrap/unwrap. Não pode excluir ou desabilitar chaves raiz.',
    tier: 'PlatformOperator', category: 'Security', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Criar chaves padrão',
      'Fazer wrap e unwrap de dados com chaves raiz',
      'Visualizar metadados de chaves',
      'Rotacionar chaves padrão',
    ],
  },
  {
    slug: 'key-protect-reader',
    name: 'Key Protect Reader',
    description: 'Acesso somente leitura a metadados de chaves no Key Protect. Não pode visualizar material de chave ou realizar operações criptográficas.',
    tier: 'ReadOnly', category: 'Security', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar metadados de chaves',
      'Listar chaves',
      'Não pode acessar material de chave',
    ],
  },
  {
    slug: 'secrets-manager-manager',
    name: 'Secrets Manager Manager',
    description: 'Gerenciamento completo de segredos no IBM Secrets Manager. Cria, atualiza, rotaciona e exclui segredos e grupos de segredos. Configura engines de segredos e integrações.',
    tier: 'ServiceManager', category: 'Security', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Criar e gerenciar grupos de segredos',
      'Criar e gerenciar segredos de todos os tipos',
      'Configurar engines de segredos',
      'Rotacionar segredos',
      'Excluir segredos e grupos',
      'Gerenciar notificações',
      'Configurar credenciais IAM',
    ],
  },
  {
    slug: 'secrets-manager-writer',
    name: 'Secrets Manager Writer',
    description: 'Cria e gerencia segredos dentro de grupos de segredos existentes. Não pode excluir grupos de segredos nem configurar engines.',
    tier: 'PlatformOperator', category: 'Security', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Criar segredos',
      'Atualizar segredos',
      'Rotacionar segredos',
      'Visualizar grupos de segredos',
    ],
  },
  {
    slug: 'secrets-manager-reader',
    name: 'Secrets Manager Reader',
    description: 'Lista e visualiza metadados de segredos. Não pode ler os valores reais dos segredos.',
    tier: 'ReadOnly', category: 'Security', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Listar segredos',
      'Visualizar metadados de segredos',
      'Visualizar grupos de segredos',
      'Não pode ler valores dos segredos',
    ],
  },
  {
    slug: 'scc-administrator',
    name: 'Security & Compliance Center — Administrator',
    description: 'Gerencia perfis de conformidade, controles, escopos e varreduras de postura de segurança no Security and Compliance Center para toda a conta.',
    tier: 'PlatformAdmin', category: 'Security', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Criar e gerenciar perfis de conformidade',
      'Definir controles e objetivos',
      'Criar e executar varreduras (scans)',
      'Gerenciar escopos',
      'Visualizar todos os resultados de conformidade',
      'Configurar notificações de conformidade',
    ],
  },
  {
    slug: 'scc-viewer',
    name: 'Security & Compliance Center — Viewer',
    description: 'Acesso somente leitura a resultados de conformidade, perfis e relatórios de varredura no Security and Compliance Center.',
    tier: 'ReadOnly', category: 'Security', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar resultados de conformidade',
      'Visualizar perfis de controle',
      'Visualizar relatórios de varredura',
      'Visualizar controles',
    ],
  },

  // ── Compute ────────────────────────────────────────────────────────────────
  {
    slug: 'kubernetes-administrator',
    name: 'Kubernetes Service — Administrator',
    description: 'Gerenciamento completo de clusters IBM Cloud Kubernetes Service. Cria, configura e exclui clusters e gerencia todos os recursos. Atribui acesso de cluster a outros usuários.',
    tier: 'PlatformAdmin', category: 'Compute', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Criar e excluir clusters',
      'Configurar rede do cluster',
      'Gerenciar worker nodes',
      'Configurar logging e monitoramento',
      'Atribuir acesso de cluster a usuários',
      'Gerenciar Ingress e storage',
      'Acessar dashboard do Kubernetes',
    ],
  },
  {
    slug: 'kubernetes-manager',
    name: 'Kubernetes Service — Manager',
    description: 'Gerencia namespaces, deployments e workloads dentro de clusters Kubernetes. Corresponde ao RBAC cluster-admin do Kubernetes dentro do cluster.',
    tier: 'ServiceManager', category: 'Compute', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Fazer deploy e gerenciar workloads',
      'Gerenciar namespaces Kubernetes',
      'Configurar RBAC dentro do cluster',
      'Visualizar recursos do cluster',
      'Gerenciar volumes persistentes',
    ],
  },
  {
    slug: 'kubernetes-writer',
    name: 'Kubernetes Service — Writer',
    description: 'Faz deploy e gerencia workloads em namespaces não-padrão. Corresponde ao RBAC edit do Kubernetes.',
    tier: 'PlatformOperator', category: 'Compute', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Fazer deploy de aplicações',
      'Gerenciar pods e services',
      'Criar ConfigMaps e Secrets',
      'Acessar logs',
      'Não pode gerenciar namespaces',
    ],
  },
  {
    slug: 'kubernetes-reader',
    name: 'Kubernetes Service — Reader',
    description: 'Visualiza recursos Kubernetes sem modificá-los. Corresponde ao RBAC view do Kubernetes.',
    tier: 'ReadOnly', category: 'Compute', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar pods e deployments',
      'Visualizar services e endpoints',
      'Visualizar ConfigMaps',
      'Visualizar logs',
    ],
  },
  {
    slug: 'code-engine-operator',
    name: 'Code Engine — Operator',
    description: 'Visualiza e opera projetos IBM Code Engine. Acessa logs e métricas de aplicação, aciona builds e atualiza variáveis de ambiente.',
    tier: 'PlatformOperator', category: 'Compute', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar projetos Code Engine',
      'Acionar builds de aplicação',
      'Visualizar logs e métricas',
      'Gerenciar revisões',
      'Atualizar variáveis de ambiente',
    ],
  },

  // ── Data ───────────────────────────────────────────────────────────────────
  {
    slug: 'cos-manager',
    name: 'Cloud Object Storage — Manager',
    description: 'Gerenciamento completo de buckets e objetos no IBM Cloud Object Storage. Cria e exclui buckets, define políticas e gerencia todos os objetos.',
    tier: 'ServiceManager', category: 'Data', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Criar e excluir buckets',
      'Fazer upload e excluir objetos',
      'Definir políticas de bucket',
      'Gerenciar criptografia de bucket',
      'Configurar regras de ciclo de vida',
      'Definir acesso público',
    ],
  },
  {
    slug: 'cos-content-reader',
    name: 'Cloud Object Storage — Content Reader',
    description: 'Lê e faz download de objetos de buckets do Cloud Object Storage.',
    tier: 'ReadOnly', category: 'Data', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Listar buckets',
      'Fazer download de objetos',
      'Visualizar metadados de objetos',
    ],
  },
  {
    slug: 'cos-object-writer',
    name: 'Cloud Object Storage — Object Writer',
    description: 'Escreve e exclui objetos no Cloud Object Storage, mas não pode gerenciar buckets ou políticas.',
    tier: 'PlatformOperator', category: 'Data', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Fazer upload de objetos',
      'Excluir objetos',
      'Sobrescrever objetos',
      'Não pode gerenciar buckets',
    ],
  },
  {
    slug: 'databases-administrator',
    name: 'Databases — Administrator',
    description: 'Administração completa dos IBM Cloud Databases (PostgreSQL, Redis, MongoDB, Elasticsearch etc.). Gerencia deployments, escalabilidade, backups e credenciais.',
    tier: 'PlatformAdmin', category: 'Data', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Criar e excluir deployments',
      'Escalar recursos (CPU, memória, disco)',
      'Gerenciar backups e restaurações',
      'Rotacionar credenciais',
      'Configurar allowlists de IP',
      'Visualizar strings de conexão',
      'Gerenciar réplicas de leitura',
    ],
  },
  {
    slug: 'databases-viewer',
    name: 'Databases — Viewer',
    description: 'Visualiza deployments IBM Cloud Databases, configuração e dados de monitoramento sem fazer alterações.',
    tier: 'ReadOnly', category: 'Data', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar deployments',
      'Visualizar configuração',
      'Visualizar dados de monitoramento',
      'Visualizar histórico de backups',
    ],
  },

  // ── Infrastructure (VPC) ───────────────────────────────────────────────────
  {
    slug: 'vpc-administrator',
    name: 'VPC Infrastructure — Administrator',
    description: 'Gerenciamento completo de recursos VPC IBM Cloud: instâncias de servidor virtual, redes, load balancers e storage. Pode atribuir acesso a outros usuários para recursos VPC.',
    tier: 'PlatformAdmin', category: 'Infrastructure', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Criar e gerenciar VPCs e subnets',
      'Gerenciar grupos de segurança',
      'Criar instâncias de servidor virtual (VSIs)',
      'Gerenciar block storage',
      'Configurar load balancers',
      'Gerenciar gateways VPN',
      'Gerenciar floating IPs e IPs públicos',
    ],
  },
  {
    slug: 'vpc-operator',
    name: 'VPC Infrastructure — Operator',
    description: 'Inicia, para e reinicia VSIs na VPC. Visualiza detalhes da infraestrutura mas não pode criar ou excluir recursos.',
    tier: 'PlatformOperator', category: 'Infrastructure', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Iniciar/parar/reiniciar instâncias',
      'Visualizar recursos VPC',
      'Criar snapshots',
      'Anexar/desanexar volumes',
      'Não pode criar ou excluir VPCs',
    ],
  },
  {
    slug: 'vpc-viewer',
    name: 'VPC Infrastructure — Viewer',
    description: 'Visão somente leitura de recursos de infraestrutura VPC, incluindo instâncias, redes e storage.',
    tier: 'ReadOnly', category: 'Infrastructure', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar instâncias VSIs',
      'Visualizar redes VPC',
      'Visualizar grupos de segurança',
      'Visualizar recursos de storage',
    ],
  },

  // ── Observability ──────────────────────────────────────────────────────────
  {
    slug: 'activity-tracker-administrator',
    name: 'Activity Tracker — Administrator',
    description: 'Gerencia instâncias IBM Cloud Activity Tracker, configura arquivamento e visualiza todos os eventos de auditoria da conta. Ferramenta essencial para compliance e investigações de segurança.',
    tier: 'PlatformAdmin', category: 'Observability', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Gerenciar instâncias do Activity Tracker',
      'Configurar arquivamento de eventos',
      'Visualizar todos os eventos de auditoria',
      'Configurar alertas de atividade',
      'Gerenciar streaming de eventos',
      'Exportar dados de eventos',
    ],
  },
  {
    slug: 'activity-tracker-viewer',
    name: 'Activity Tracker — Viewer',
    description: 'Visualiza eventos de auditoria capturados pelo IBM Cloud Activity Tracker. Acesso somente leitura ao log de eventos de atividade da conta.',
    tier: 'ReadOnly', category: 'Observability', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar eventos de auditoria',
      'Pesquisar e filtrar eventos',
      'Visualizar detalhes de eventos',
    ],
  },
  {
    slug: 'monitoring-manager',
    name: 'IBM Cloud Monitoring — Manager',
    description: 'Configura dashboards, alertas e coleta de métricas no IBM Cloud Monitoring (baseado em Sysdig). Gerencia canais de notificação e exportação de dados.',
    tier: 'ServiceManager', category: 'Observability', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Criar e gerenciar dashboards',
      'Configurar alertas',
      'Configurar coleta de métricas',
      'Gerenciar canais de notificação',
      'Visualizar todas as métricas',
      'Exportar dados de métricas',
    ],
  },
  {
    slug: 'log-analysis-manager',
    name: 'Log Analysis — Manager',
    description: 'Configura instâncias IBM Log Analysis: gerencia regras de parsing, configura arquivamento e visualiza todos os dados de log.',
    tier: 'ServiceManager', category: 'Observability', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Gerenciar fontes de log',
      'Configurar regras de parsing',
      'Configurar arquivamento de logs',
      'Criar views e dashboards',
      'Configurar alertas de log',
      'Exportar logs',
    ],
  },

  // ── Networking ─────────────────────────────────────────────────────────────
  {
    slug: 'dns-administrator',
    name: 'DNS Services — Administrator',
    description: 'Gerencia IBM Cloud DNS Services incluindo zonas DNS, registros de recursos e load balancers globais.',
    tier: 'PlatformAdmin', category: 'Networking', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Criar e excluir zonas DNS',
      'Gerenciar registros de recursos',
      'Configurar load balancers globais',
      'Configurar health checks',
      'Gerenciar redes permitidas',
    ],
  },
  {
    slug: 'transit-gateway-administrator',
    name: 'Transit Gateway — Administrator',
    description: 'Gerencia IBM Cloud Transit Gateway para conectar VPCs, infraestrutura clássica e redes on-premises.',
    tier: 'PlatformAdmin', category: 'Networking', accessModel: 'iam', isPrivileged: true, scope: 'service',
    privileges: [
      'Criar e excluir transit gateways',
      'Gerenciar conexões de rede',
      'Configurar políticas de roteamento',
      'Visualizar topologia de rede',
      'Conectar infraestrutura clássica a VPC',
    ],
  },


  // ── Special IAM Identity Roles ────────────────────────────────────────────
  {
    slug: 'iam-identity-user-api-key-creator',
    name: 'IAM Identity — User API Key Creator',
    description: 'Permite criar chaves de API quando a configuração de restrição de criação de chave de API do usuário estiver ativada na conta. Função especial do serviço IAM Identity que bypassa a restrição de conta para o usuário designado.',
    tier: 'PlatformOperator', category: 'Identity', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Criar chaves de API quando a restrição de conta estiver ativada',
    ],
  },
  {
    slug: 'iam-identity-service-id-creator',
    name: 'IAM Identity — Service ID Creator',
    description: 'Permite criar IDs de serviço quando a configuração de restrição de criação de ID de serviço estiver ativada na conta. Função especial do serviço IAM Identity que bypassa a restrição de conta para o usuário designado.',
    tier: 'PlatformOperator', category: 'Identity', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Criar IDs de serviço quando a restrição de conta estiver ativada',
    ],
  },
  {
    slug: 'iam-identity-template-admin',
    name: 'IAM Identity — Template Administrator',
    description: 'Cria modelos de IAM corporativos para grupos de acesso, perfis confiáveis, configurações de conta e políticas. Disponível somente na conta corporativa raiz IBM Cloud Enterprise.',
    tier: 'AccountAdmin', category: 'Identity', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Criar modelos IAM corporativos para grupos de acesso',
      'Criar modelos para perfis confiáveis',
      'Criar modelos para configurações de conta e políticas',
      'Disponível somente na conta corporativa raiz',
    ],
  },
  {
    slug: 'iam-identity-template-assignment-admin',
    name: 'IAM Identity — Template Assignment Administrator',
    description: 'Atribui modelos de IAM corporativo a contas secundárias dentro de uma hierarquia IBM Cloud Enterprise. Disponível somente na conta corporativa raiz.',
    tier: 'PlatformAdmin', category: 'Identity', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Atribuir modelos IAM corporativos a contas secundárias',
      'Gerenciar atribuições de modelos em contas da empresa',
      'Disponível somente na conta corporativa raiz',
    ],
  },
  {
    slug: 'catalog-publisher',
    name: 'Catalog Management — Publisher',
    description: 'Publica produtos aprovados pela IBM por meio de um catálogo privado na conta IBM Cloud. Função especial focada exclusivamente em publicação, sem permissão para gerenciar filtros ou estrutura do catálogo.',
    tier: 'PlatformOperator', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Publicar produtos aprovados pela IBM em catálogos privados',
    ],
  },
  {
    slug: 'enterprise-usage-report-viewer',
    name: 'Enterprise — Usage Report Viewer',
    description: 'Visualiza a empresa, as contas e os grupos de contas, e acessa relatórios de uso para todas as contas dentro de uma hierarquia IBM Cloud Enterprise. Função especializada de somente leitura para análise de uso.',
    tier: 'ReadOnly', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar a empresa, contas e grupos de contas',
      'Visualizar relatórios de uso para todas as contas na empresa',
    ],
  },
  {
    slug: 'cloud-shell-cloud-operator',
    name: 'IBM Cloud Shell — Cloud Operator',
    description: 'Cria ambientes do Cloud Shell para gerenciar recursos da IBM Cloud via terminal interativo baseado em navegador. Acesso sem recursos de desenvolvimento web avançados.',
    tier: 'PlatformOperator', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Criar ambientes Cloud Shell para gerenciar recursos IBM Cloud',
    ],
  },
  {
    slug: 'cloud-shell-cloud-developer',
    name: 'IBM Cloud Shell — Cloud Developer',
    description: 'Cria ambientes do Cloud Shell para gerenciar recursos da IBM Cloud e desenvolver aplicativos com Visualização da Web ativada. Inclui acesso ao ambiente de desenvolvimento web integrado.',
    tier: 'PlatformOperator', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Criar ambientes Cloud Shell para gerenciar recursos IBM Cloud',
      'Desenvolver aplicativos para IBM Cloud com Visualização da Web ativada',
    ],
  },
  {
    slug: 'cloud-shell-file-manager',
    name: 'IBM Cloud Shell — File Manager',
    description: 'Cria ambientes do Cloud Shell para gerenciar recursos IBM Cloud e gerenciar arquivos na área de trabalho, com upload e download de arquivos ativados.',
    tier: 'PlatformOperator', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Criar ambientes Cloud Shell para gerenciar recursos IBM Cloud',
      'Upload de arquivos para a área de trabalho Cloud Shell',
      'Download de arquivos da área de trabalho Cloud Shell',
    ],
  },
  {
    slug: 'projects-administrator',
    name: 'IBM Cloud Projects — Administrator',
    description: 'Gerenciamento completo de projetos de Infraestrutura como Código (IaC) no IBM Cloud Projects. Pode criar, editar, implementar, destruir recursos e forçar aprovação de alterações que não passaram na validação.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Exibir detalhes sobre projetos, configurações e implementações',
      'Criar, editar e excluir projetos',
      'Criar e editar configurações',
      'Validar uma configuração',
      'Implementar alterações na configuração',
      'Destruir recursos provisionados',
      'Forçar aprovação de alterações que não passaram na validação',
    ],
  },
  {
    slug: 'support-center-editor',
    name: 'Support Center — Editor',
    description: 'Cria, atualiza e visualiza casos de suporte no IBM Cloud Support Center. Função principal para equipes de suporte e operações que precisam gerenciar tickets.',
    tier: 'PlatformOperator', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar casos de suporte',
      'Pesquisar casos de suporte',
      'Atualizar casos existentes',
      'Criar novos casos de suporte',
    ],
  },
  {
    slug: 'activity-tracker-routing-viewer',
    name: 'Activity Tracker Event Routing — Viewer',
    description: 'Visualiza recursos de configuração do Activity Tracker Event Routing, incluindo rotas e alvos de destino de eventos. Acesso somente leitura ao serviço de roteamento de auditoria.',
    tier: 'ReadOnly', category: 'Observability', accessModel: 'iam', isPrivileged: false, scope: 'service',
    privileges: [
      'Visualizar recursos de configuração do Activity Tracker Event Routing',
      'Consultar rotas e alvos configurados',
    ],
  },

  // ── Classic Infrastructure ─────────────────────────────────────────────────
  {
    slug: 'classic-superuser',
    name: 'Classic Infrastructure — Super User',
    description: 'Acesso total a todos os recursos de infraestrutura clássica IBM Cloud. Gerencia permissões de outros usuários e tem acesso irrestrito a dispositivos, rede e serviços da infraestrutura clássica. Equivalente ao Account Owner para o ambiente clássico.',
    tier: 'AccountAdmin', category: 'Classic', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Acesso total a todos os recursos clássicos',
      'Gerenciar permissões de outros usuários',
      'Criar e cancelar bare metal servers',
      'Gerenciar VLANs e subnets',
      'Gerenciar storage clássico',
      'Acesso a todos os dispositivos',
      'Gerenciar todas as categorias: Account, Devices, Network, Services',
    ],
  },
  {
    slug: 'classic-devices-admin',
    name: 'Classic Infrastructure — Devices Admin',
    description: 'Gerencia dispositivos (bare metal, virtual servers, dedicated hosts) na infraestrutura clássica. Permissões da categoria "Devices": reboot, KVM console, IPMI, add/upgrade, OS reload.',
    tier: 'PlatformAdmin', category: 'Classic', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Reiniciar e fazer KVM console de dispositivos',
      'Adicionar e atualizar dispositivos',
      'Realizar OS reload em dispositivos',
      'Acessar console IPMI remoto',
      'Gerenciar bare metal servers',
      'Gerenciar virtual servers',
      'Cancelar dispositivos',
    ],
  },
  {
    slug: 'classic-network-admin',
    name: 'Classic Infrastructure — Network Admin',
    description: 'Gerencia componentes de rede da infraestrutura clássica IBM Cloud. Permissões da categoria "Network": adicionar/editar DNS, gerenciar subnets, configurar firewall e VPN.',
    tier: 'PlatformAdmin', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Adicionar e editar registros DNS',
      'Gerenciar subnets e IPs',
      'Configurar regras de firewall',
      'Gerenciar VPN',
      'Gerenciar load balancers clássicos',
      'Configurar CDN',
      'Gerenciar VLANs',
    ],
  },
  {
    slug: 'classic-services-admin',
    name: 'Classic Infrastructure — Services Admin',
    description: 'Gerencia serviços de suporte na infraestrutura clássica. Permissões da categoria "Services": gerenciar storage, CDN, licenças de software e serviços complementares.',
    tier: 'PlatformOperator', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Gerenciar File e Block Storage clássico',
      'Adicionar e atualizar storage',
      'Gerenciar licenças de software',
      'Gerenciar certificados SSL',
      'Gerenciar serviços complementares',
    ],
  },
  {
    slug: 'classic-account-admin',
    name: 'Classic Infrastructure — Account Admin',
    description: 'Gerencia configurações da conta de infraestrutura clássica. Permissões da categoria "Account": atualizar perfil, gerenciar notificações, controlar acesso a casos de suporte.',
    tier: 'PlatformOperator', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Atualizar perfil da conta clássica',
      'Gerenciar notificações por email',
      'Adicionar e atualizar usuários clássicos',
      'Ver histórico de eventos da conta',
      'Gerenciar casos de suporte clássico',
    ],
  },
  {
    slug: 'classic-view-only',
    name: 'Classic Infrastructure — View Only',
    description: 'Acesso somente leitura a recursos de infraestrutura clássica: dispositivos, rede e storage. Não pode modificar nenhum recurso.',
    tier: 'ReadOnly', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar dispositivos',
      'Visualizar componentes de rede',
      'Visualizar storage',
      'Visualizar faturas clássicas',
    ],
  },


  // ── Account Management Services (remaining) ────────────────────────────────
  {
    slug: 'context-based-restrictions-admin',
    name: 'Context-based Restrictions — Administrator',
    description: 'Cria e gerencia regras de restrição baseadas em contexto (CBR) que limitam o acesso a recursos IBM Cloud com base em critérios como endereço IP, VPC ou hora do dia.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Visualizar zonas de rede',
      'Criar zonas de rede',
      'Atualizar zonas de rede',
      'Remover zonas de rede',
      'Criar e gerenciar regras de restrição baseadas em contexto',
      'Associar regras a serviços específicos (requer função Administrator no serviço alvo)',
    ],
  },
  {
    slug: 'catalog-management-administrator',
    name: 'Catalog Management — Administrator',
    description: 'Gerencia catálogos privados de software e produtos no IBM Cloud. Cria, publica e gerencia versões de produtos em catálogos corporativos privados.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Configurar filtros de nível de conta para o catálogo IBM Cloud',
      'Criar, atualizar e excluir catálogos privados',
      'Incluir e atualizar software em catálogos privados',
      'Configurar filtros para catálogos privados',
      'Publicar produtos aprovados pela IBM',
      'Designar políticas de acesso',
    ],
  },
  {
    slug: 'license-entitlement-administrator',
    name: 'License and Entitlement — Administrator',
    description: 'Gerencia licenças e direitos (entitlements) de software no IBM Cloud, incluindo licenças IBM Passport Advantage.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Adicionar e gerenciar licenças de software',
      'Atribuir direitos a usuários',
      'Visualizar uso de licenças',
      'Gerenciar licenças Passport Advantage',
      'Gerenciar software instances',
    ],
  },
  {
    slug: 'platform-analytics-administrator',
    name: 'Platform Analytics — Administrator',
    description: 'Acessa e gerencia dados de Analytics da plataforma IBM Cloud, incluindo métricas de uso de recursos e análises de conta.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Visualizar análises da plataforma',
      'Exportar dados de uso',
      'Configurar dashboards de analytics',
      'Gerenciar relatórios de uso da conta',
    ],
  },
  {
    slug: 'cloud-shell-administrator',
    name: 'IBM Cloud Shell — Administrator',
    description: 'Gerencia as configurações do IBM Cloud Shell para a conta, incluindo quais ferramentas e recursos estão disponíveis para usuários no shell baseado em navegador.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Habilitar/desabilitar Cloud Shell para a conta',
      'Configurar features disponíveis no Cloud Shell',
      'Gerenciar acesso de arquivos e upload',
      'Configurar ferramentas disponíveis (kubectl, terraform etc.)',
    ],
  },
  {
    slug: 'schematics-administrator',
    name: 'IBM Schematics — Administrator',
    description: 'Gerencia workspaces, actions e blueprints no IBM Schematics (infraestrutura como código). Executa planos Terraform e Ansible no IBM Cloud.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: true, scope: 'account',
    privileges: [
      'Criar e gerenciar workspaces Terraform',
      'Aplicar e destruir planos de infraestrutura',
      'Gerenciar Schematics Actions (Ansible)',
      'Criar e gerenciar Blueprints',
      'Visualizar logs de execução',
      'Gerenciar variáveis e segredos de workspace',
    ],
  },
  {
    slug: 'resource-group-administrator',
    name: 'Resource Group — Administrator',
    description: 'Cria e gerencia grupos de recursos na conta IBM Cloud. Grupos de recursos são o mecanismo de organização e faturamento para recursos IAM-habilitados.',
    tier: 'PlatformAdmin', category: 'AccountManagement', accessModel: 'iam', isPrivileged: false, scope: 'account',
    privileges: [
      'Criar grupos de recursos',
      'Atualizar nome e configurações de grupos',
      'Gerenciar acesso a grupos de recursos',
      'Definir grupo de recursos padrão',
      'Visualizar uso por grupo de recursos',
    ],
  },

  // ── Classic Infrastructure — granular ─────────────────────────────────────
  {
    slug: 'classic-bare-metal-admin',
    name: 'Classic — Bare Metal Server Admin',
    description: 'Permissões completas para gerenciar bare metal servers na infraestrutura clássica IBM Cloud: provisionamento, OS reload, acesso KVM/IPMI remoto e cancelamento.',
    tier: 'PlatformAdmin', category: 'Classic', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Provisionar e cancelar bare metal servers',
      'Executar OS reload',
      'Acessar console KVM e IPMI remoto',
      'Gerenciar hardware RAID',
      'Adicionar e gerenciar IPs de bare metal',
      'Monitorar hardware e componentes',
    ],
  },
  {
    slug: 'classic-virtual-server-admin',
    name: 'Classic — Virtual Server Admin',
    description: 'Gerencia virtual servers (VSIs) na infraestrutura clássica: provisionamento, reboot, reclaim e acesso ao console.',
    tier: 'PlatformAdmin', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Provisionar e cancelar virtual servers',
      'Reiniciar (reboot) VSIs',
      'Acessar console de VSIs',
      'Capturar imagem de VSI',
      'Gerenciar configuração de VSI',
      'Visualizar detalhes de hardware virtual',
    ],
  },
  {
    slug: 'classic-storage-admin',
    name: 'Classic — Storage Admin',
    description: 'Gerencia File Storage, Block Storage e Object Storage na infraestrutura clássica IBM Cloud. Adiciona e cancela volumes, gerencia snapshots e replicação.',
    tier: 'ServiceManager', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Adicionar e cancelar File Storage',
      'Adicionar e cancelar Block Storage',
      'Gerenciar snapshots de storage',
      'Configurar replicação de storage',
      'Autorizar hosts para acesso a storage',
      'Gerenciar volumes Object Storage clássico',
    ],
  },
  {
    slug: 'classic-firewall-admin',
    name: 'Classic — Firewall Admin',
    description: 'Gerencia firewalls de hardware (Fortigate, Juniper vSRX) e firewalls de servidor na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'Classic', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Provisionar firewalls de hardware',
      'Gerenciar regras de firewall',
      'Configurar bypass de firewall',
      'Gerenciar firewall por servidor',
      'Visualizar logs de tráfego',
    ],
  },
  {
    slug: 'classic-load-balancer-admin',
    name: 'Classic — Load Balancer Admin',
    description: 'Gerencia load balancers da infraestrutura clássica IBM Cloud (IBM Cloud Load Balancer for VPC não incluído).',
    tier: 'ServiceManager', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar e cancelar load balancers clássicos',
      'Adicionar e remover servidores do pool',
      'Configurar health checks',
      'Gerenciar certificados SSL para LB',
      'Visualizar métricas de tráfego',
    ],
  },
  {
    slug: 'classic-dns-admin',
    name: 'Classic — DNS Admin',
    description: 'Gerencia zonas DNS e registros no DNS gerenciado da infraestrutura clássica IBM Cloud (SoftLayer DNS).',
    tier: 'ServiceManager', category: 'Classic', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Adicionar e gerenciar zonas DNS',
      'Criar e editar registros DNS (A, CNAME, MX, TXT etc.)',
      'Gerenciar DNS reverso',
      'Configurar secondary DNS',
    ],
  },

  // ── Classic Infrastructure — Administrative Permissions ────────────────────
  {
    slug: 'classic-adm-activate-partner-account',
    name: 'Classic: Administrative — Activate Partner Customer Account',
    description: 'Habilita contas de parceiros para que possam começar a gerenciar recursos e faturamento de clientes. Usado em hierarquias de parceiros e revendedores.',
    tier: 'AccountAdmin', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Ativar conta de parceiro para gerenciar clientes',
      'Conceder acesso de gerenciamento a contas de clientes',
    ],
  },
  {
    slug: 'classic-adm-add-brand-account',
    name: 'Classic: Administrative — Add Brand Account',
    description: 'Cria contas de sub-marca para hierarquias organizacionais de revendedores ou parceiros na infraestrutura clássica IBM Cloud.',
    tier: 'AccountAdmin', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Criar contas de sub-marca',
      'Definir hierarquias de parceiros e revendedores',
    ],
  },
  {
    slug: 'classic-adm-add-customer-account',
    name: 'Classic: Administrative — Add Customer Account',
    description: 'Cria novas contas de cliente dentro da estrutura de contas da infraestrutura clássica IBM Cloud.',
    tier: 'AccountAdmin', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Criar novas contas de cliente',
      'Definir estrutura de contas na infraestrutura clássica',
    ],
  },
  {
    slug: 'classic-adm-manage-account-notes',
    name: 'Classic: Administrative — Manage Account Notes',
    description: 'Adiciona, edita e exclui notas internas da conta para documentação e rastreamento de informações relevantes.',
    tier: 'PlatformOperator', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Adicionar notas à conta clássica',
      'Editar e excluir notas existentes',
    ],
  },
  {
    slug: 'classic-adm-manage-email-delivery',
    name: 'Classic: Administrative — Manage E-mail Delivery Service',
    description: 'Configura contas do serviço de entrega de e-mail para notificações do sistema na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Configurar serviço de entrega de e-mail',
      'Gerenciar contas de notificação do sistema',
    ],
  },
  {
    slug: 'classic-adm-manage-notification-subscribers',
    name: 'Classic: Administrative — Manage Notification Subscribers',
    description: 'Cria e gerencia assinantes de notificações para alertas de uso e excedentes de cota na conta de infraestrutura clássica.',
    tier: 'PlatformOperator', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar assinantes de notificação',
      'Gerenciar alertas de uso e excedentes',
    ],
  },
  {
    slug: 'classic-adm-manage-users',
    name: 'Classic: Administrative — Manage Users',
    description: 'Adiciona, remove e modifica o acesso e as permissões de infraestrutura clássica de outros usuários. Função altamente privilegiada com impacto direto na segurança da conta.',
    tier: 'PlatformAdmin', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Adicionar e remover usuários da conta clássica',
      'Modificar permissões de usuários',
      'Gerenciar acesso à infraestrutura clássica',
    ],
  },
  {
    slug: 'classic-adm-physically-access-colo-cage',
    name: "Classic: Administrative — Physically Access a Customer's Colo Cage",
    description: 'Autoriza entrada física em gaiolas de colocalização de clientes em data centers IBM Cloud. Permissão de acesso físico restrita e altamente privilegiada.',
    tier: 'AccountAdmin', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Solicitar acesso físico a gaiolas de colocalização',
      'Autorizar entrada em colo cages de clientes',
    ],
  },
  {
    slug: 'classic-adm-physically-access-datacenter',
    name: 'Classic: Administrative — Physically Access a Datacenter',
    description: 'Autoriza entrada física em instalações de data center IBM Cloud. Permissão de acesso físico restrita a pessoal autorizado.',
    tier: 'AccountAdmin', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Solicitar acesso físico a data centers IBM Cloud',
      'Autorizar visitas a instalações IBM',
    ],
  },
  {
    slug: 'classic-adm-view-event-log',
    name: 'Classic: Administrative — View Event Log',
    description: 'Acessa o histórico completo de log de eventos da conta para fins de auditoria e solução de problemas na infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicAdministrative', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar log de eventos da conta clássica',
      'Consultar histórico de ações para auditoria',
      'Diagnosticar problemas via trilha de auditoria',
    ],
  },

  // ── Classic Infrastructure — Device Permissions ──────────────────────────────
  {
    slug: 'classic-dev-add-ip-addresses',
    name: 'Classic: Devices — Add IP Addresses',
    description: 'Atribui endereços IP adicionais a servidores para configuração de rede na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Solicitar IPs adicionais para servidores',
      'Atribuir IPs públicos e privados a dispositivos',
    ],
  },
  {
    slug: 'classic-dev-edit-hostname-domain',
    name: 'Classic: Devices — Edit Hostname/Domain',
    description: 'Modifica o hostname e o nome de domínio de dispositivos (bare metal e VSIs) na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Modificar hostname de dispositivos',
      'Modificar domínio de dispositivos',
    ],
  },
  {
    slug: 'classic-dev-host-ids',
    name: 'Classic: Devices — Host IDS',
    description: 'Acessa logs do sistema de detecção de intrusão de host (Host IDS) para monitoramento de segurança em dispositivos da infraestrutura clássica.',
    tier: 'ReadOnly', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Acessar logs de IDS de host',
      'Monitorar alertas de segurança de host',
    ],
  },
  {
    slug: 'classic-dev-ipmi-remote-management',
    name: 'Classic: Devices — IPMI Remote Management',
    description: 'Acessa a interface IPMI para visualizar detalhes de hardware e emitir comandos de reboot remoto em servidores bare metal através do portal.',
    tier: 'PlatformAdmin', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Acessar interface IPMI de servidores',
      'Visualizar detalhes de hardware via IPMI',
      'Emitir comandos de reboot remoto via portal',
    ],
  },
  {
    slug: 'classic-dev-manage-configuration-template',
    name: 'Classic: Devices — Manage Configuration Template',
    description: 'Cria, edita e exclui templates de configuração para configuração automatizada de dispositivos na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar templates de configuração de dispositivos',
      'Editar e excluir templates existentes',
      'Aplicar templates durante provisionamento',
    ],
  },
  {
    slug: 'classic-dev-manage-customer-hardware',
    name: 'Classic: Devices — Manage Customer Hardware',
    description: 'Executa ações administrativas em servidores bare metal e dispositivos de hardware na infraestrutura clássica, incluindo gerenciamento completo do ciclo de vida.',
    tier: 'PlatformAdmin', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Executar ações administrativas em bare metal',
      'Gerenciar ciclo de vida de hardware',
      'Acessar e modificar configurações de hardware',
    ],
  },
  {
    slug: 'classic-dev-manage-device-monitoring',
    name: 'Classic: Devices — Manage Device Monitoring',
    description: 'Configura definições de monitoramento e visualiza métricas de desempenho de dispositivos na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Configurar monitores de dispositivos (ping, HTTP)',
      'Visualizar métricas de desempenho',
      'Gerenciar alertas de monitoramento',
    ],
  },
  {
    slug: 'classic-dev-manage-provisioning-scripts',
    name: 'Classic: Devices — Manage Provisioning Scripts',
    description: 'Cria e modifica scripts de pós-provisionamento que são executados automaticamente após a implantação de dispositivos na infraestrutura clássica.',
    tier: 'PlatformAdmin', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar scripts de pós-provisionamento',
      'Editar e excluir scripts existentes',
      'Associar scripts a perfis de provisionamento',
    ],
  },
  {
    slug: 'classic-dev-manage-public-images',
    name: 'Classic: Devices — Manage Public Images',
    description: 'Cria, edita e exclui templates de imagem pública disponíveis em toda a conta para provisionamento de VSIs na infraestrutura clássica.',
    tier: 'PlatformAdmin', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar templates de imagem pública',
      'Editar metadados de imagens públicas',
      'Excluir imagens públicas da conta',
    ],
  },
  {
    slug: 'classic-dev-os-reloads-rescue-kernel',
    name: 'Classic: Devices — OS Reloads and Rescue Kernel',
    description: 'Inicia o recarregamento do sistema operacional e inicializa dispositivos no rescue kernel para recuperação de emergência na infraestrutura clássica.',
    tier: 'PlatformAdmin', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Iniciar OS Reload em dispositivos clássicos',
      'Inicializar servidor no rescue kernel',
      'Selecionar imagem de OS para reload',
    ],
  },
  {
    slug: 'classic-dev-storage-manage',
    name: 'Classic: Devices — Storage Manage',
    description: 'Acessa detalhes de volumes de armazenamento e modifica credenciais de acesso ao storage na infraestrutura clássica IBM Cloud.',
    tier: 'ServiceManager', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Acessar detalhes de volumes de storage',
      'Modificar credenciais de acesso ao storage',
      'Gerenciar autorizações de host em volumes',
    ],
  },
  {
    slug: 'classic-dev-view-hardware-details',
    name: 'Classic: Devices — View Hardware Details',
    description: 'Acessa especificações de hardware, endereços IP, tipo de SO e senhas. Inclui a capacidade de atualizar senhas de hardware no portal.',
    tier: 'ReadOnly', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Visualizar especificações de hardware',
      'Acessar endereços IP de dispositivos',
      'Visualizar e atualizar senhas de hardware',
      'Consultar tipo de sistema operacional',
    ],
  },
  {
    slug: 'classic-dev-view-location-reservation',
    name: 'Classic: Devices — View Location Reservation',
    description: 'Acessa informações sobre localizações de data center reservadas e capacidade disponível na infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar reservas de data center',
      'Consultar capacidade disponível por localização',
    ],
  },
  {
    slug: 'classic-dev-view-virtual-dedicated-host-details',
    name: 'Classic: Devices — View Virtual Dedicated Host Details',
    description: 'Acessa especificações de dedicated hosts virtuais e migra instâncias entre hosts na infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar especificações de dedicated hosts',
      'Migrar instâncias entre dedicated hosts',
    ],
  },
  {
    slug: 'classic-dev-view-virtual-server-details',
    name: 'Classic: Devices — View Virtual Server Details',
    description: 'Acessa especificações de servidor virtual, endereços IP, tipo de SO e senhas. Inclui a capacidade de atualizar senhas de servidor virtual no portal.',
    tier: 'ReadOnly', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Visualizar especificações de VSIs',
      'Acessar endereços IP de servidores virtuais',
      'Visualizar e atualizar senhas de VSI',
      'Consultar tipo de sistema operacional',
    ],
  },
  {
    slug: 'classic-dev-view-edit-dedicated-host',
    name: 'Classic: Devices — View and Edit Dedicated Host',
    description: 'Acessa e modifica configurações e definições de dedicated hosts na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar configurações de dedicated hosts',
      'Editar definições de dedicated hosts',
    ],
  },
  {
    slug: 'classic-dev-view-edit-virtual-guest',
    name: 'Classic: Devices — View and Edit Virtual Guest',
    description: 'Acessa e modifica propriedades e configurações de guests virtuais (VSIs) na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicDevice', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar propriedades de VSIs',
      'Editar configurações de guests virtuais',
    ],
  },

  // ── Classic Infrastructure — Network Permissions ─────────────────────────────
  {
    slug: 'classic-net-add-compute-public-port',
    name: 'Classic: Network — Add Compute with Public Network Port',
    description: 'Provisiona servidores ou instâncias de nuvem com conectividade de rede pública e velocidades de porta na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Provisionar recursos com porta de rede pública',
      'Selecionar velocidades de porta pública',
    ],
  },
  {
    slug: 'classic-net-manage-cdn-account',
    name: 'Classic: Network — Manage CDN Account',
    description: 'Configura e mantém as configurações de conta de rede de entrega de conteúdo (CDN) na infraestrutura clássica IBM Cloud.',
    tier: 'ServiceManager', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Configurar definições de conta CDN',
      'Gerenciar origens e regras de cache',
      'Monitorar desempenho do CDN',
    ],
  },
  {
    slug: 'classic-net-manage-cdn-file-transfers',
    name: 'Classic: Network — Manage CDN File Transfers',
    description: 'Faz upload, download e gerencia arquivos distribuídos pela rede de entrega de conteúdo (CDN) na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Fazer upload de arquivos via CDN',
      'Fazer download de arquivos distribuídos',
      'Gerenciar conteúdo na CDN',
    ],
  },
  {
    slug: 'classic-net-manage-dns',
    name: 'Classic: Network — Manage DNS',
    description: 'Cria, modifica e exclui registros DNS para domínios gerenciados pelo SoftLayer DNS na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar e excluir zonas DNS',
      'Adicionar e editar registros DNS (A, CNAME, MX, TXT)',
      'Gerenciar DNS reverso',
    ],
  },
  {
    slug: 'classic-net-manage-firewall-rules',
    name: 'Classic: Network — Manage Firewall Rules',
    description: 'Cria, modifica e exclui regras de firewall em todos os dispositivos de rede da infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Criar regras de firewall (ingress/egress)',
      'Modificar regras existentes de firewall',
      'Excluir regras de firewall em dispositivos de rede',
    ],
  },
  {
    slug: 'classic-net-manage-firewalls',
    name: 'Classic: Network — Manage Firewalls',
    description: 'Configura definições de firewall e revisa logs de firewall para análise de segurança na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Configurar definições globais de firewall',
      'Revisar logs de firewall para análise de segurança',
      'Gerenciar políticas de firewall na conta',
    ],
  },
  {
    slug: 'classic-net-manage-load-balancers',
    name: 'Classic: Network — Manage Load Balancers',
    description: 'Configura, monitora e mantém serviços de load balancer na infraestrutura clássica IBM Cloud, incluindo configuração de pools e health checks.',
    tier: 'ServiceManager', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar e cancelar load balancers clássicos',
      'Adicionar e remover servidores do pool',
      'Configurar health checks e algoritmos de balanceamento',
      'Gerenciar certificados SSL para load balancers',
    ],
  },
  {
    slug: 'classic-net-manage-network-gateways',
    name: 'Classic: Network — Manage Network Gateways',
    description: 'Configura e mantém appliances de gateway de rede (Vyatta/VRA, Juniper vSRX) para roteamento e segurança na infraestrutura clássica.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Provisionar e configurar gateway appliances',
      'Associar VLANs a gateways',
      'Configurar roteamento e NAT no gateway',
      'Gerenciar bypass de gateway por VLAN',
    ],
  },
  {
    slug: 'classic-net-manage-subnet-routes',
    name: 'Classic: Network — Manage Network Subnet Routes',
    description: 'Define e modifica regras de roteamento para subnets de rede na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Definir rotas estáticas para subnets',
      'Modificar regras de roteamento existentes',
      'Gerenciar políticas de roteamento entre VLANs',
    ],
  },
  {
    slug: 'classic-net-manage-vlan-spanning',
    name: 'Classic: Network — Manage Network VLAN Spanning',
    description: 'Controla se VLANs de rede privada podem se comunicar entre si em toda a conta. Configuração que impacta toda a topologia de rede da conta.',
    tier: 'AccountAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Habilitar/desabilitar VLAN spanning na conta',
      'Controlar comunicação entre VLANs privadas',
    ],
  },
  {
    slug: 'classic-net-manage-port-control',
    name: 'Classic: Network — Manage Port Control',
    description: 'Configura o status de portas de rede e velocidades de conexão para dispositivos na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Habilitar e desabilitar portas de rede',
      'Modificar velocidades de porta (10/100/1000 Mbps)',
    ],
  },
  {
    slug: 'classic-net-manage-private-endpoint',
    name: 'Classic: Network — Manage Private Endpoint Service',
    description: 'Habilita ou desabilita conectividade de endpoint privado para acesso seguro a serviços na infraestrutura clássica IBM Cloud sem tráfego pela internet pública.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Habilitar conectividade de endpoint privado',
      'Desabilitar serviço de endpoint privado',
    ],
  },
  {
    slug: 'classic-net-manage-security-groups',
    name: 'Classic: Network — Manage Security Groups',
    description: 'Cria, modifica e exclui security groups e suas regras associadas para controle de tráfego de rede em VSIs da infraestrutura clássica.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar e excluir security groups',
      'Adicionar e remover regras de security groups',
      'Associar security groups a interfaces de rede',
    ],
  },
  {
    slug: 'classic-net-vpn-administration',
    name: 'Classic: Network — VPN Administration',
    description: 'Configura as definições de acesso VPN e gerencia permissões VPN para todos os usuários da conta na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Configurar definições de acesso VPN SSL',
      'Gerenciar permissões VPN de usuários da conta',
      'Definir subnets acessíveis via VPN',
    ],
  },
  {
    slug: 'classic-net-view-bandwidth-statistics',
    name: 'Classic: Network — View Bandwidth Statistics',
    description: 'Acessa dados e gráficos de uso de largura de banda para dispositivos de hardware na infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar gráficos de uso de bandwidth por dispositivo',
      'Consultar tráfego inbound e outbound',
      'Ver projeções de uso mensal de bandwidth',
    ],
  },
  {
    slug: 'classic-net-view-cdn-bandwidth-statistics',
    name: 'Classic: Network — View CDN Bandwidth Statistics',
    description: 'Acessa dados de uso de largura de banda para serviços de rede de entrega de conteúdo (CDN) na infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicNetwork', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar uso de bandwidth do CDN',
      'Consultar estatísticas de entrega de conteúdo',
    ],
  },

  // ── Classic Infrastructure — Sales Permissions ───────────────────────────────
  {
    slug: 'classic-sales-add-server',
    name: 'Classic: Sales — Add Server',
    description: 'Solicita e provisiona novos servidores bare metal ou virtuais na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Provisionar novos servidores bare metal',
      'Provisionar novas VSIs (servidores virtuais)',
      'Selecionar configurações e localização',
    ],
  },
  {
    slug: 'classic-sales-add-upgrade-cloud-instances',
    name: 'Classic: Sales — Add/Upgrade Cloud Instances',
    description: 'Solicita novas instâncias de nuvem e faz upgrade de configurações de instâncias existentes na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Solicitar novas instâncias de nuvem',
      'Fazer upgrade de configurações de instâncias existentes',
    ],
  },
  {
    slug: 'classic-sales-add-upgrade-services',
    name: 'Classic: Sales — Add/Upgrade Services',
    description: 'Solicita novos serviços e faz upgrade de planos de serviços existentes na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Adicionar novos serviços à conta',
      'Fazer upgrade de planos de serviços existentes',
    ],
  },
  {
    slug: 'classic-sales-add-upgrade-storage',
    name: 'Classic: Sales — Add/Upgrade Storage (StorageLayer)',
    description: 'Solicita novos volumes de armazenamento e faz upgrade de capacidade de storage existente (File, Block, NAS) na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Solicitar novos volumes de File e Block Storage',
      'Fazer upgrade de capacidade de storage',
      'Adicionar IOPS e snapshots',
    ],
  },
  {
    slug: 'classic-sales-cancel-server',
    name: 'Classic: Sales — Cancel Server',
    description: 'Encerra instâncias de servidor e as remove do faturamento na infraestrutura clássica IBM Cloud. Ação irreversível que resulta em perda de dados.',
    tier: 'PlatformAdmin', category: 'ClassicSales', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Cancelar servidores bare metal',
      'Cancelar VSIs e remover do faturamento',
    ],
  },
  {
    slug: 'classic-sales-cancel-services',
    name: 'Classic: Sales — Cancel Services',
    description: 'Encerra serviços específicos e os remove do faturamento na conta de infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Cancelar serviços da infraestrutura clássica',
      'Remover serviços do faturamento',
    ],
  },
  {
    slug: 'classic-sales-upgrade-server',
    name: 'Classic: Sales — Upgrade Server',
    description: 'Modifica especificações de servidores existentes como CPU, RAM ou capacidade de disco na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Fazer upgrade de CPU e RAM em servidores',
      'Aumentar capacidade de disco',
      'Modificar velocidade de porta de rede',
    ],
  },
  {
    slug: 'classic-sales-upgrade-services',
    name: 'Classic: Sales — Upgrade Services',
    description: 'Modifica planos e configurações de serviços existentes na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Modificar planos de serviços existentes',
      'Atualizar configurações de serviços',
    ],
  },
  {
    slug: 'classic-sales-view-billing-ach',
    name: 'Classic: Sales — View Billing ACH Information',
    description: 'Acessa detalhes de pagamento ACH (Automated Clearing House) para transações de faturamento na conta de infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicSales', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Visualizar detalhes de pagamento ACH',
      'Consultar informações bancárias de débito automático',
    ],
  },
  {
    slug: 'classic-sales-view-reseller-pricing',
    name: 'Classic: Sales — View Reseller Order Pricing',
    description: 'Acessa informações de preços especiais disponíveis para contas de revendedores na infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicSales', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar preços especiais de revendedor',
      'Consultar descontos de parceiro por pedido',
    ],
  },

  // ── Classic Infrastructure — Security Permissions ─────────────────────────────
  {
    slug: 'classic-sec-manage-certificates-ssl',
    name: 'Classic: Security — Manage Certificates (SSL)',
    description: 'Faz upload, modifica e exclui certificados SSL/TLS, incluindo chaves privadas, na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicSecurity', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Fazer upload de certificados SSL/TLS e chaves privadas',
      'Modificar e excluir certificados existentes',
      'Gerenciar CSRs (Certificate Signing Requests)',
    ],
  },
  {
    slug: 'classic-sec-manage-saml-authentication',
    name: 'Classic: Security — Manage SAML Authentication',
    description: 'Configura as definições do provedor de identidade SAML para autenticação federada na conta de infraestrutura clássica IBM Cloud.',
    tier: 'AccountAdmin', category: 'ClassicSecurity', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Configurar provedor de identidade SAML (IdP)',
      'Gerenciar metadados de federação SAML',
      'Habilitar/desabilitar autenticação federada',
    ],
  },
  {
    slug: 'classic-sec-manage-ssh-keys',
    name: 'Classic: Security — Manage SSH Keys',
    description: 'Faz upload, modifica e exclui chaves públicas SSH para acesso seguro a servidores na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSecurity', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Adicionar chaves SSH públicas à conta',
      'Modificar e excluir chaves SSH existentes',
      'Associar chaves SSH a dispositivos durante provisionamento',
    ],
  },
  {
    slug: 'classic-sec-view-certificates-ssl',
    name: 'Classic: Security — View Certificates (SSL)',
    description: 'Acessa detalhes de certificados SSL/TLS, incluindo chaves privadas, na infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicSecurity', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Visualizar certificados SSL/TLS e chaves privadas',
      'Consultar datas de expiração de certificados',
    ],
  },

  // ── Classic Infrastructure — Software Permissions ─────────────────────────────
  {
    slug: 'classic-sw-manage-antivirus',
    name: 'Classic: Software — Manage Antivirus/Spyware',
    description: 'Configura as definições de proteção antivírus e antispyware e revisa logs de segurança em dispositivos da infraestrutura clássica IBM Cloud.',
    tier: 'ServiceManager', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Configurar proteção antivírus em dispositivos',
      'Gerenciar definições de antispyware',
      'Revisar logs e alertas de segurança de endpoint',
    ],
  },
  {
    slug: 'classic-sw-manage-firewall-software',
    name: 'Classic: Software — Manage Firewall Software',
    description: 'Configura e mantém aplicações de firewall baseadas em software em dispositivos da infraestrutura clássica IBM Cloud.',
    tier: 'ServiceManager', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Configurar regras de firewall de software',
      'Gerenciar políticas de filtragem de pacotes',
      'Manter aplicações de firewall baseadas em SO',
    ],
  },
  {
    slug: 'classic-sw-openstack-link',
    name: 'Classic: Software — OpenStack Link',
    description: 'Estabelece ou remove a integração OpenStack para conectividade híbrida com a infraestrutura clássica IBM Cloud.',
    tier: 'PlatformAdmin', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Criar link de integração OpenStack',
      'Remover integração OpenStack existente',
    ],
  },
  {
    slug: 'classic-sw-view-customer-software-password',
    name: 'Classic: Software — View Customer Software Password',
    description: 'Acessa senhas de aplicações de software instaladas pelo cliente em dispositivos da infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: true, scope: 'classic',
    privileges: [
      'Visualizar senhas de software instalado pelo cliente',
      'Acessar credenciais armazenadas de aplicações',
    ],
  },
  {
    slug: 'classic-sw-view-helm',
    name: 'Classic: Software — View Helm',
    description: 'Acessa as credenciais de login do Helm (gerenciador de pacotes Kubernetes) instalado em dispositivos da infraestrutura clássica.',
    tier: 'ReadOnly', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar credenciais de login do Helm',
    ],
  },
  {
    slug: 'classic-sw-view-plesk',
    name: 'Classic: Software — View Plesk',
    description: 'Acessa as credenciais de login do Plesk (painel de controle de hospedagem web) instalado em servidores da infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar credenciais de acesso ao Plesk',
      'Acessar URL e login do painel Plesk',
    ],
  },
  {
    slug: 'classic-sw-view-quantastor',
    name: 'Classic: Software — View QuantaStor',
    description: 'Acessa as credenciais de login do QuantaStor (sistema de gerenciamento de storage) instalado em dispositivos da infraestrutura clássica.',
    tier: 'ReadOnly', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar credenciais de acesso ao QuantaStor',
    ],
  },
  {
    slug: 'classic-sw-view-urchin',
    name: 'Classic: Software — View Urchin',
    description: 'Acessa as credenciais de login do Urchin (software de análise web legado) instalado em servidores da infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar credenciais de acesso ao Urchin',
    ],
  },
  {
    slug: 'classic-sw-view-edit-disk-image',
    name: 'Classic: Software — View and Edit Disk Image',
    description: 'Acessa e modifica arquivos de imagem de disco e seus metadados em dispositivos da infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar imagens de disco em dispositivos',
      'Editar metadados e configurações de imagens de disco',
    ],
  },
  {
    slug: 'classic-sw-view-edit-image-template',
    name: 'Classic: Software — View and Edit Image Template',
    description: 'Acessa e modifica templates de imagem usados para provisionamento de dispositivos na infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar templates de imagem da conta',
      'Editar metadados de image templates',
      'Importar e exportar image templates',
    ],
  },
  {
    slug: 'classic-sw-view-edit-software-component',
    name: 'Classic: Software — View and Edit Software Component',
    description: 'Acessa e modifica as configurações de componentes de software instalados em dispositivos da infraestrutura clássica IBM Cloud.',
    tier: 'PlatformOperator', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar componentes de software instalados',
      'Editar configurações de software components',
    ],
  },
  {
    slug: 'classic-sw-view-cpanel',
    name: 'Classic: Software — View cPanel',
    description: 'Acessa as credenciais de login do cPanel (painel de controle de hospedagem web) instalado em servidores da infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar credenciais de acesso ao cPanel',
      'Acessar URL e login do painel cPanel',
    ],
  },
  {
    slug: 'classic-sw-view-licenses',
    name: 'Classic: Software — View Licenses',
    description: 'Acessa informações de licenças de software e chaves de produto instaladas em dispositivos da infraestrutura clássica IBM Cloud.',
    tier: 'ReadOnly', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar licenças de software em dispositivos',
      'Consultar chaves de produto e datas de expiração',
    ],
  },
  {
    slug: 'classic-sw-view-software-account-license',
    name: 'Classic: Software — View Software Account License',
    description: 'Acessa detalhes de licenciamento de software no nível da conta na infraestrutura clássica IBM Cloud, incluindo entitlements contratados.',
    tier: 'ReadOnly', category: 'ClassicSoftware', accessModel: 'classic', isPrivileged: false, scope: 'classic',
    privileges: [
      'Visualizar licenças de software no nível da conta',
      'Consultar entitlements de software contratados',
      'Ver uso atual vs. licenças disponíveis',
    ],
  },

  // ── Cloud Foundry ──────────────────────────────────────────────────────────
  {
    slug: 'cf-org-manager',
    name: 'Cloud Foundry — Org Manager',
    description: 'Gerencia a organização Cloud Foundry: adiciona e remove spaces, gerencia acesso de usuários na org e nos spaces, e visualiza cotas e uso. Controle total da organização CF.',
    tier: 'PlatformAdmin', category: 'CloudFoundry', accessModel: 'cloud-foundry', isPrivileged: true, scope: 'org',
    privileges: [
      'Adicionar, excluir e modificar spaces',
      'Gerenciar acesso de usuários na org e spaces',
      'Visualizar uso e informações de cota',
      'Convidar usuários para a organização',
      'Atribuir funções de org e space a usuários',
    ],
  },
  {
    slug: 'cf-org-billing-manager',
    name: 'Cloud Foundry — Org Billing Manager',
    description: 'Visualiza informações de uso e faturamento de runtime e serviços da organização Cloud Foundry na página de Uso. Acesso somente leitura aos dados de consumo.',
    tier: 'ReadOnly', category: 'CloudFoundry', accessModel: 'cloud-foundry', isPrivileged: false, scope: 'org',
    privileges: [
      'Visualizar uso de runtime da organização',
      'Visualizar uso de serviços da organização',
      'Visualizar informações de faturamento CF',
    ],
  },
  {
    slug: 'cf-org-auditor',
    name: 'Cloud Foundry — Org Auditor',
    description: 'Acesso somente leitura (auditor) a todos os serviços, usuários e permissões da organização Cloud Foundry.',
    tier: 'ReadOnly', category: 'CloudFoundry', accessModel: 'cloud-foundry', isPrivileged: false, scope: 'org',
    privileges: [
      'Visualizar serviços da organização',
      'Visualizar usuários e permissões',
      'Auditar configurações da organização',
    ],
  },
  {
    slug: 'cf-space-manager',
    name: 'Cloud Foundry — Space Manager',
    description: 'Gerencia acesso de usuários e suas funções dentro de um space Cloud Foundry. Visualiza instâncias, service bindings e recursos de cada aplicação no space.',
    tier: 'PlatformAdmin', category: 'CloudFoundry', accessModel: 'cloud-foundry', isPrivileged: false, scope: 'space',
    privileges: [
      'Gerenciar acesso de usuários no space',
      'Atribuir funções de space',
      'Visualizar instâncias de aplicação',
      'Visualizar service bindings',
      'Visualizar recursos do space',
    ],
  },
  {
    slug: 'cf-space-developer',
    name: 'Cloud Foundry — Space Developer',
    description: 'Cria, exclui e gerencia serviços e aplicações dentro de um space Cloud Foundry. Pode associar URLs internas/externas a aplicações. Função principal para equipes de desenvolvimento.',
    tier: 'PlatformOperator', category: 'CloudFoundry', accessModel: 'cloud-foundry', isPrivileged: false, scope: 'space',
    privileges: [
      'Criar e excluir aplicações CF',
      'Criar e excluir serviços CF',
      'Gerenciar service bindings',
      'Associar URLs internas/externas a apps',
      'Visualizar logs e métricas de apps',
      'Fazer deploy de aplicações',
    ],
  },
  {
    slug: 'cf-space-auditor',
    name: 'Cloud Foundry — Space Auditor',
    description: 'Acesso somente leitura a todas as aplicações, recursos, service bindings, usuários e permissões de um space Cloud Foundry.',
    tier: 'ReadOnly', category: 'CloudFoundry', accessModel: 'cloud-foundry', isPrivileged: false, scope: 'space',
    privileges: [
      'Visualizar aplicações no space',
      'Visualizar service bindings',
      'Visualizar usuários e permissões do space',
      'Visualizar recursos do space',
    ],
  },
]
