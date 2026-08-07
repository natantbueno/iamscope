// SoD Analyzer — Catálogo de regras de Segregation of Duties
// 100% client-side, dados curados manualmente a partir de riscos reais documentados
// pela documentação oficial de cada provedor, NIST, CIS e frameworks de compliance
// (SOX, ISO 27001, LGPD/GDPR, PCI-DSS).
//
// ESCOPO: cinco plataformas, três provedores.
//
//   Microsoft — Entra ID, Azure RBAC
//   AWS       — AWS IAM (managed policies)
//   Google    — GCP IAM, Google Workspace
//
// IBM Cloud está FORA por decisão de produto (07/08/2026): o IAM da IBM tem sete
// roles genéricas (Viewer/Operator/Editor/Administrator + Reader/Writer/Manager) e
// o SoD real da IBM vive nas 71 permissões da infraestrutura clássica, que não são
// roles — o modelo "regra = par de roles" não as representa sem distorcer o dado,
// que foi exatamente o erro do dataset IBM anterior (ver src/data/ibmCloud.ts).
//
// UMA REGRA NUNCA CRUZA PROVEDORES.
//   Acumular AdministratorAccess na AWS e Global Administrator no Entra ID é um
//   fato de governança, não um conflito de segregação: não existe caminho técnico
//   entre os dois, e as mitigações não se encontram. O que existe é cruzamento
//   DENTRO do provedor, onde os planos realmente se tocam — Entra ID ↔ Azure RBAC
//   (mesmo tenant) e GCP ↔ Google Workspace (mesmo Cloud Identity). Só esses dois
//   cruzamentos são modelados.
//
// roleA.id / roleB.id armazenam o SLUG da role/policy no dataset da plataforma
// (ver SOD_PLATFORM_META), permitindo linkar direto para a página de detalhe no
// site. A resolução acontece em src/lib/sod.ts, contra src/data/sod/roleIndex.ts.

export type SoDSeverity = 'critical' | 'high' | 'medium' | 'low'

/** Plataforma de uma referência individual de role/policy. */
export type SoDPlatform = 'entra-id' | 'azure-rbac' | 'aws' | 'gcp' | 'google-workspace'

/** Provedor. Agrupa as plataformas que compartilham um plano de identidade. */
export type SoDProvider = 'microsoft' | 'aws' | 'google'

/**
 * Escopo de uma regra: uma plataforma, ou o cruzamento entre duas plataformas do
 * MESMO provedor. `microsoft-cross` era `both` até 07/08/2026, quando o catálogo
 * deixou de ter só um provedor e o nome parou de dizer qual cruzamento era.
 */
export type SoDCloud = SoDPlatform | 'microsoft-cross' | 'google-cross'

export const SOD_PLATFORM_META: Record<SoDPlatform, {
  label: string
  provider: SoDProvider
  /** Base da URL de detalhe no site. O slug de SoDRoleRef.id completa o caminho. */
  urlBase: string
  /** Como o provedor chama a unidade de acesso. A AWS não tem "role" gerenciada: tem policy. */
  unit: string
}> = {
  'entra-id':         { label: 'Entra ID',         provider: 'microsoft', urlBase: '/entraid/roles',          unit: 'directory role' },
  'azure-rbac':       { label: 'Azure RBAC',       provider: 'microsoft', urlBase: '/azure-rbac/roles',       unit: 'built-in role' },
  'aws':              { label: 'AWS IAM',          provider: 'aws',       urlBase: '/aws/policies',           unit: 'managed policy' },
  'gcp':              { label: 'GCP IAM',          provider: 'google',    urlBase: '/gcp/roles',              unit: 'predefined role' },
  'google-workspace': { label: 'Google Workspace', provider: 'google',    urlBase: '/google-workspace/roles', unit: 'admin role' },
}

export const SOD_PROVIDER_META: Record<SoDProvider, {
  label: string
  platforms: SoDPlatform[]
  /** Valor de `cloud` das regras que cruzam plataformas deste provedor. */
  crossCloud: SoDCloud | null
}> = {
  microsoft: { label: 'Microsoft', platforms: ['entra-id', 'azure-rbac'],       crossCloud: 'microsoft-cross' },
  aws:       { label: 'AWS',       platforms: ['aws'],                          crossCloud: null },
  google:    { label: 'Google',    platforms: ['gcp', 'google-workspace'],      crossCloud: 'google-cross' },
}

export const SOD_PLATFORMS = Object.keys(SOD_PLATFORM_META) as SoDPlatform[]
export const SOD_PROVIDERS = Object.keys(SOD_PROVIDER_META) as SoDProvider[]

export type SoDCategory =
  | 'identity-management'      // criar usuários + resetar senhas
  | 'access-provisioning'      // aprovar + provisionar acesso
  | 'privileged-access'        // admin + auditoria
  | 'financial-control'        // billing + aprovação de gastos
  | 'security-operations'      // configurar segurança + investigar incidentes
  | 'compliance-audit'         // executar + auditar
  | 'application-management'   // desenvolver + aprovar para produção
  | 'data-access'              // acessar dados + gerenciar permissões

export type SoDFramework =
  | 'SOX'
  | 'ISO27001'
  | 'NIST-CSF'
  | 'CIS'
  | 'LGPD'
  | 'GDPR'
  | 'PCI-DSS'

export interface SoDRoleRef {
  /** slug da role/policy no dataset da plataforma. */
  id: string
  name: string
  /**
   * Nome histórico do campo: guarda a PLATAFORMA, não o provedor. Não foi
   * renomeado para `platform` porque são 246 referências em 123 regras já
   * revisadas — o custo do rename é alto e o ganho é cosmético.
   */
  cloud: SoDPlatform
}

export interface SoDRule {
  id: string
  name: string
  description: string
  severity: SoDSeverity
  category: SoDCategory
  cloud: SoDCloud
  roleA: SoDRoleRef
  roleB: SoDRoleRef
  rationale: string
  risk: string
  mitigation: string[]
  references: string[]
  frameworks: SoDFramework[]
}

// ── Derivações ──────────────────────────────────────────────────────────────
// A UI nunca compara `rule.cloud` com um literal: pergunta ao helper. Foi assim
// que o valor `both` conseguiu virar `microsoft-cross` sem quebrar as telas.

export function platformProvider(platform: SoDPlatform): SoDProvider {
  return SOD_PLATFORM_META[platform].provider
}

/** Provedor da regra. Deriva de roleA porque as duas pontas são sempre do mesmo. */
export function ruleProvider(rule: SoDRule): SoDProvider {
  return platformProvider(rule.roleA.cloud)
}

/** Plataformas tocadas pela regra — uma, ou duas quando é cruzamento. */
export function rulePlatforms(rule: SoDRule): SoDPlatform[] {
  return rule.roleA.cloud === rule.roleB.cloud ? [rule.roleA.cloud] : [rule.roleA.cloud, rule.roleB.cloud]
}

export function isCrossPlatform(rule: SoDRule): boolean {
  return rule.roleA.cloud !== rule.roleB.cloud
}

/** URL da página de detalhe da role/policy referenciada. */
export function roleRefUrl(ref: SoDRoleRef): string {
  return `${SOD_PLATFORM_META[ref.cloud].urlBase}/${ref.id}`
}

// ── Metadados de apresentação ───────────────────────────────────────────────

export const SOD_CATEGORY_META: Record<SoDCategory, { label: string; description: string }> = {
  'identity-management':    { label: 'Identity Management',    description: 'Criação de identidades e controle de credenciais/autenticação' },
  'access-provisioning':    { label: 'Access Provisioning',    description: 'Definição, aprovação e provisionamento de acesso' },
  'privileged-access':      { label: 'Privileged Access',      description: 'Atribuição e uso de acesso privilegiado (Tier 0/1)' },
  'financial-control':      { label: 'Financial Control',      description: 'Billing, custos e aprovação financeira de recursos cloud' },
  'security-operations':    { label: 'Security Operations',    description: 'Configuração de segurança e resposta a incidentes' },
  'compliance-audit':       { label: 'Compliance & Audit',     description: 'Execução de ações vs. auditoria/verificação de conformidade' },
  'application-management': { label: 'Application Management', description: 'Desenvolvimento e aprovação/promoção de aplicações' },
  'data-access':            { label: 'Data Access',            description: 'Acesso a dados e gerenciamento das permissões sobre eles' },
}

export const SOD_SEVERITY_META: Record<SoDSeverity, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#dc2626', bg: '#dc262618' },
  high:     { label: 'High',     color: '#ea580c', bg: '#ea580c18' },
  medium:   { label: 'Medium',   color: '#ca8a04', bg: '#ca8a0418' },
  low:      { label: 'Low',      color: '#16a34a', bg: '#16a34a18' },
}

export const SOD_SEVERITY_ORDER: Record<SoDSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export const SOD_FRAMEWORK_META: Record<SoDFramework, { label: string }> = {
  SOX: { label: 'SOX' }, ISO27001: { label: 'ISO 27001' }, 'NIST-CSF': { label: 'NIST CSF' },
  CIS: { label: 'CIS' }, LGPD: { label: 'LGPD' }, GDPR: { label: 'GDPR' }, 'PCI-DSS': { label: 'PCI-DSS' },
}

export const SOD_CLOUD_META: Record<SoDCloud, { label: string }> = {
  'entra-id':         { label: 'Entra ID' },
  'azure-rbac':       { label: 'Azure RBAC' },
  'aws':              { label: 'AWS IAM' },
  'gcp':              { label: 'GCP IAM' },
  'google-workspace': { label: 'Google Workspace' },
  'microsoft-cross':  { label: 'Entra ID + Azure RBAC' },
  'google-cross':     { label: 'GCP + Google Workspace' },
}

// ── Regras SoD ───────────────────────────────────────────────────────────────

export const SOD_RULES: SoDRule[] = [

  // ═══ identity-management ═══════════════════════════════════════════════
  {
    id: 'ga-security-reader',
    name: 'Global Administrator + Security Reader',
    description: 'Controle total do tenant combinado com a mesma pessoa auditando os próprios sinais de segurança.',
    severity: 'critical', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-reader', name: 'Security Reader', cloud: 'entra-id' },
    rationale: 'Global Administrator pode alterar qualquer configuração do tenant (incluindo trilhas de auditoria, políticas de segurança e configuração de logging), enquanto Security Reader permite visualizar alertas, políticas e relatórios de segurança. Quando a mesma identidade acumula os dois papéis, ela pode alterar o ambiente e, em seguida, revisar os próprios logs sem qualquer segregação entre "quem age" e "quem verifica".',
    risk: 'Um administrador comprometido ou malicioso pode desabilitar/alterar controles de segurança e, na sequência, usar o acesso de leitura para confirmar que a própria ação não gerou alertas visíveis, atrasando a detecção do incidente.',
    mitigation: [
      'Atribuir Security Reader a uma equipe de SOC/Blue Team distinta da equipe de administração do tenant.',
      'Exigir PIM (Privileged Identity Management) com aprovação de terceiros para ativação de Global Administrator.',
      'Encaminhar logs de auditoria para um SIEM externo com acesso restrito à própria equipe de administração.',
      'Revisar periodicamente atribuições combinadas via Access Reviews do Entra ID.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'ua-auth-admin',
    name: 'User Administrator + Authentication Administrator',
    description: 'Criar/gerenciar contas de usuário e, ao mesmo tempo, controlar os métodos de autenticação desses mesmos usuários.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'user-administrator', name: 'User Administrator', cloud: 'entra-id' },
    roleB: { id: 'authentication-administrator', name: 'Authentication Administrator', cloud: 'entra-id' },
    rationale: 'User Administrator cria e gerencia contas de usuários não-admin; Authentication Administrator define/reseta métodos de autenticação (incluindo forçar re-registro de MFA) para usuários não-privilegiados. Combinados, uma única identidade pode criar uma conta e imediatamente configurar (ou remover) os fatores de autenticação dela, sem segunda validação.',
    risk: 'Criação de uma conta "fantasma" com MFA fraco ou controlado pelo próprio atacante/insider, usada posteriormente como ponto de persistência.',
    mitigation: [
      'Segregar as duas roles entre equipes de RH/onboarding e equipe de segurança de identidade.',
      'Ativar Conditional Access exigindo MFA forte para qualquer conta recém-criada.',
      'Auditar via Access Reviews trimestralmente quem acumula ambas as roles.',
      'Alertar (via Microsoft Sentinel ou similar) sempre que a mesma identidade criar um usuário e alterar métodos de autenticação dele na mesma sessão.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'ga-global-reader',
    name: 'Global Administrator + Global Reader',
    description: 'Acesso de escrita irrestrito somado a leitura irrestrita — nenhuma separação de funções real.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'global-reader', name: 'Global Reader', cloud: 'entra-id' },
    rationale: 'Global Reader foi desenhado como o par "somente leitura" do Global Administrator, para permitir que auditores/observadores vejam tudo sem poder alterar nada. Atribuir os dois à mesma identidade anula o propósito de Global Reader como role de supervisão independente.',
    risk: 'Times de auditoria interna que também possuem Global Administrator perdem a independência necessária para reportar achados de forma imparcial.',
    mitigation: [
      'Nunca atribuir Global Reader a quem já possui Global Administrator ativo — usar contas administrativas e de auditoria completamente separadas.',
      'Aplicar PIM com expiração automática em Global Administrator.',
      'Revisar trimestralmente sobreposição de roles via relatório de Access Reviews.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'pra-security-admin',
    name: 'Privileged Role Administrator + Security Administrator',
    description: 'Atribuir quem tem acesso privilegiado e, ao mesmo tempo, definir as políticas de segurança que deveriam controlar esse acesso.',
    severity: 'critical', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    rationale: 'Privileged Role Administrator controla ativação de PIM e atribuição de roles privilegiadas para outros usuários (inclusive a si mesmo, em muitos tenants). Security Administrator configura políticas de segurança (Conditional Access, políticas de identidade, alertas). Uma mesma identidade com ambas pode se auto-atribuir acesso privilegiado e, na sequência, enfraquecer as políticas de segurança que deveriam restringi-lo.',
    risk: 'Escalonamento de privilégio self-service: a pessoa se atribui um role Tier 0/1 e desativa ou afrouxa a política de Conditional Access que exigiria aprovação/MFA extra para essa ativação.',
    mitigation: [
      'Exigir aprovação multi-party (Multi-party Approval Admin) para ativação de Privileged Role Administrator.',
      'Bloquear alterações em políticas críticas de Conditional Access por quem também tem Privileged Role Administrator ativo.',
      'Monitorar via log de auditoria qualquer atribuição de role seguida de alteração de política de segurança na mesma janela de tempo.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-approval-workflow',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'ua-password-admin',
    name: 'User Administrator + Password Administrator',
    description: 'Criar contas de usuário e resetar credenciais sem supervisão de uma segunda pessoa.',
    severity: 'medium', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'user-administrator', name: 'User Administrator', cloud: 'entra-id' },
    roleB: { id: 'password-administrator', name: 'Password Administrator', cloud: 'entra-id' },
    rationale: 'User Administrator já inclui a capacidade de resetar senhas de usuários não-admin; somar explicitamente Password Administrator amplia essa capacidade e reforça a concentração de controle sobre o ciclo de vida completo de uma conta (criação + reset de credencial) numa única identidade.',
    risk: 'Um insider pode criar uma conta de serviço/teste e resetar sua senha repetidamente para uso indevido sem que outra pessoa perceba o padrão.',
    mitigation: [
      'Registrar e alertar sobre resets de senha em contas criadas nas últimas 24-48h pela mesma identidade.',
      'Restringir Password Administrator a administrative units específicas via Entra ID Administrative Units.',
      'Revisão periódica de contas criadas e resetadas pelo mesmo operador.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'aa-cloud-app-admin',
    name: 'Application Administrator + Cloud Application Administrator',
    description: 'Registrar aplicações e, ao mesmo tempo, gerenciar todas as aplicações já registradas em nuvem, incluindo credenciais de app.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'application-administrator', name: 'Application Administrator', cloud: 'entra-id' },
    roleB: { id: 'cloud-application-administrator', name: 'Cloud Application Administrator', cloud: 'entra-id' },
    rationale: 'As duas roles se sobrepõem quase totalmente (Cloud Application Administrator é o subconjunto de Application Administrator sem gerenciar Application Proxy). Atribuí-las juntas não amplia funcionalidade real, mas indica falta de rigor na atribuição de roles — um sinal de que a governança de app registration/consent não está segregada de quem opera credenciais de aplicações em produção.',
    risk: 'Uma identidade pode registrar um app malicioso e imediatamente conceder a ele credenciais/segredos com escopo amplo, sem revisão por outra pessoa.',
    mitigation: [
      'Consolidar em uma única role (a mais restrita necessária) em vez de atribuir as duas.',
      'Exigir admin consent workflow para qualquer permissão de alto impacto solicitada por apps novos.',
      'Auditar criação de app secrets/certificates correlacionada com registro de app na mesma sessão.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'pra-identity-governance-admin',
    name: 'Privileged Role Administrator + Identity Governance Administrator',
    description: 'Controlar quem recebe acesso privilegiado e, ao mesmo tempo, definir as políticas de governança de identidade (access reviews, entitlement management) que deveriam supervisionar esse acesso.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    roleB: { id: 'identity-governance-administrator', name: 'Identity Governance Administrator', cloud: 'entra-id' },
    rationale: 'Identity Governance Administrator configura Access Reviews, Entitlement Management e Lifecycle Workflows — os mecanismos que existem justamente para revisar periodicamente quem tem acesso privilegiado. Se a mesma identidade também controla a atribuição de roles privilegiadas (Privileged Role Administrator), ela pode tanto se auto-atribuir acesso quanto desenhar/enfraquecer a revisão que deveria detectar isso.',
    risk: 'Access Reviews configurados de forma permissiva (ex.: auto-aprovação, escopo reduzido) especificamente para esconder atribuições indevidas feitas pela mesma pessoa.',
    mitigation: [
      'Segregar quem desenha políticas de Access Review de quem tem poder de atribuição de roles privilegiadas.',
      'Exigir que Access Reviews de roles Tier 0/1 tenham revisores independentes da equipe de identidade.',
      'Auditar alterações em políticas de Entitlement Management/Lifecycle Workflows com a mesma granularidade de mudanças de role privilegiada.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/id-governance/identity-governance-overview',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'ga-privileged-auth-admin',
    name: 'Global Administrator + Privileged Authentication Administrator',
    description: 'Controle total do tenant combinado com a capacidade de redefinir métodos de autenticação de outros administradores.',
    severity: 'critical', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'privileged-authentication-administrator', name: 'Privileged Authentication Administrator', cloud: 'entra-id' },
    rationale: 'Privileged Authentication Administrator pode redefinir métodos de autenticação de QUALQUER usuário, incluindo outros Global Administrators — um poder normalmente usado como controle de emergência independente da administração geral. Concentrar isso com Global Administrator elimina a separação entre "quem administra o tenant" e "quem pode sequestrar a autenticação de outros admins".',
    risk: 'Uma conta comprometida com ambas as roles pode redefinir o MFA de outro Global Administrator e assumir a identidade dele, contornando qualquer controle individual de conta.',
    mitigation: [
      'Restringir Privileged Authentication Administrator a contas de break-glass fortemente monitoradas, nunca combinadas com Global Administrator do dia a dia.',
      'Exigir aprovação multi-party para ativação via PIM.',
      'Alertar imediatamente (SIEM) qualquer reset de método de autenticação de uma conta com role Tier 0.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'hybrid-identity-admin-domain-name-admin',
    name: 'Hybrid Identity Administrator + Domain Name Administrator',
    description: 'Gerenciar sincronização/federação híbrida e, ao mesmo tempo, controlar os domínios confiáveis do tenant.',
    severity: 'critical', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'hybrid-identity-administrator', name: 'Hybrid Identity Administrator', cloud: 'entra-id' },
    roleB: { id: 'domain-name-administrator', name: 'Domain Name Administrator', cloud: 'entra-id' },
    rationale: 'Hybrid Identity Administrator configura Azure AD Connect e a federação com provedores externos; Domain Name Administrator gerencia domínios verificados e configuração de federação de domínio. Juntas, essas roles permitem alterar a fronteira de confiança de autenticação do tenant (ex.: adicionar um domínio federado controlado externamente) de ponta a ponta, sem segunda pessoa envolvida.',
    risk: 'Configuração de um domínio federado malicioso que permite autenticação externa não controlada, abrindo caminho para ataques do tipo "Golden SAML" ou bypass completo do Entra ID como IdP.',
    mitigation: [
      'Segregar gestão de federação híbrida (identity sync) de gestão de domínios verificados.',
      'Alertar sobre qualquer alteração de configuração de federação de domínio via Microsoft Sentinel/Defender for Identity.',
      'Exigir change management formal e dupla aprovação para qualquer mudança de domínio federado.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-hybrid-identity',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'ga-owner-cross',
    name: 'Global Administrator (Entra ID) + Owner (Azure subscription)',
    description: 'Controle total de identidades no Entra ID combinado com controle total de recursos em uma subscription Azure — elimina a fronteira entre identidade e infraestrutura.',
    severity: 'critical', category: 'identity-management', cloud: 'microsoft-cross',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    rationale: 'Global Administrator pode elevar-se a acesso a todas as subscriptions Azure do tenant via "Access management for Azure resources" no Entra ID. Combinado com Owner atribuído diretamente em uma subscription, a mesma identidade controla tanto o plano de identidade quanto o plano de recursos, sem qualquer camada de aprovação entre os dois mundos.',
    risk: 'Comprometimento de uma única conta resulta em takeover completo do tenant Entra ID E de toda a infraestrutura Azure associada — o cenário de "blast radius total" mais crítico do modelo EAM.',
    mitigation: [
      'Nunca atribuir Owner de subscription de forma permanente a quem tem Global Administrator — usar PIM para Azure Resources com ativação just-in-time.',
      'Manter a opção "Access management for Azure resources" desativada por padrão, habilitando apenas durante breach recovery documentado.',
      'Usar contas de emergência (break-glass) segregadas para cada plano (identidade vs. recursos).',
    ],
    references: [
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/elevate-access-global-admin',
      'https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'pra-uaa-cross',
    name: 'Privileged Role Administrator (Entra ID) + User Access Administrator (Azure RBAC)',
    description: 'Atribuir roles privilegiadas no Entra ID e, separadamente, atribuir permissões RBAC no Azure — controle completo da camada de autorização em ambas as clouds.',
    severity: 'critical', category: 'identity-management', cloud: 'microsoft-cross',
    roleA: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Privileged Role Administrator controla quem recebe roles de directory no Entra ID; User Access Administrator controla quem recebe roles RBAC em recursos Azure. Juntas, a mesma identidade decide sozinha "quem pode fazer o quê" em ambas as camadas de autorização da organização, sem checagem cruzada.',
    risk: 'Auto-atribuição de acesso privilegiado simultaneamente no Entra ID e no Azure, criando um caminho de escalonamento que nenhuma das duas equipes (identidade / infraestrutura) consegue detectar isoladamente.',
    mitigation: [
      'Segregar a equipe responsável por atribuição de roles Entra ID da equipe responsável por atribuição de roles Azure RBAC.',
      'Consolidar logs de atribuição de role de ambas as camadas em um único SIEM para correlação.',
      'Exigir Access Reviews cruzados (identidade + recursos) para qualquer identidade com poder de atribuição em ambos os planos.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },

  // ═══ access-provisioning ════════════════════════════════════════════════
  {
    id: 'ga-compliance-admin',
    name: 'Global Administrator + Compliance Administrator',
    description: 'Executar qualquer ação no tenant e também ser responsável por auditar a conformidade dessas mesmas ações.',
    severity: 'high', category: 'access-provisioning', cloud: 'entra-id',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'compliance-administrator', name: 'Compliance Administrator', cloud: 'entra-id' },
    rationale: 'Compliance Administrator gerencia rótulos de retenção, políticas de DLP e configurações de conformidade no Microsoft Purview — controles desenhados para constranger o que administradores podem fazer com dados sensíveis. Quando a mesma pessoa também é Global Administrator, ela pode alterar a política de conformidade antes de executar a ação que essa política deveria restringir.',
    risk: 'Desativação temporária de uma política de DLP/retenção pela mesma identidade que em seguida realiza uma exportação de dados que a política impediria.',
    mitigation: [
      'Atribuir Compliance Administrator a uma equipe de GRC (Governance, Risk & Compliance) independente da administração de TI.',
      'Registrar e alertar sobre qualquer alteração de política de compliance seguida de ação de alto impacto na mesma sessão.',
      'Revisar via Access Reviews trimestral quem acumula as duas roles.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'aa-app-developer',
    name: 'Application Administrator + Application Developer',
    description: 'Aprovar/gerenciar o ciclo de vida de aplicações e, simultaneamente, poder desenvolver/registrar novas aplicações.',
    severity: 'medium', category: 'access-provisioning', cloud: 'entra-id',
    roleA: { id: 'application-administrator', name: 'Application Administrator', cloud: 'entra-id' },
    roleB: { id: 'application-developer', name: 'Application Developer', cloud: 'entra-id' },
    rationale: 'Application Developer permite criar app registrations e gerenciar suas próprias aplicações; Application Administrator permite gerenciar TODAS as aplicações do tenant, incluindo consent de permissões. A combinação elimina a separação entre "quem desenvolve/registra um app" e "quem aprova/governa apps em produção" — um princípio básico de change management seguro.',
    risk: 'Um desenvolvedor registra um app com permissões excessivas e, usando o papel de Application Administrator, aprova o próprio consent sem revisão externa.',
    mitigation: [
      'Segregar desenvolvimento (Application Developer) de aprovação/governança (Application Administrator) entre times diferentes.',
      'Exigir admin consent workflow com aprovador distinto do solicitante para qualquer permissão de alto impacto.',
      'Auditar apps registrados e aprovados pela mesma identidade em curto intervalo de tempo.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'groups-admin-license-admin',
    name: 'Groups Administrator + License Administrator',
    description: 'Gerenciar grupos usados para atribuição de acesso e, ao mesmo tempo, atribuir licenças (e permissões associadas) por grupo.',
    severity: 'medium', category: 'access-provisioning', cloud: 'entra-id',
    roleA: { id: 'groups-administrator', name: 'Groups Administrator', cloud: 'entra-id' },
    roleB: { id: 'license-administrator', name: 'License Administrator', cloud: 'entra-id' },
    rationale: 'Muitas organizações usam group-based licensing e group-based access provisioning simultaneamente. Se a mesma identidade pode criar/alterar a composição de um grupo E também controlar a atribuição de licenças (que frequentemente concedem acesso a serviços com funcionalidades administrativas, ex.: licenças com Copilot/Power Platform embutido), ela pode provisionar acesso de forma end-to-end sem segunda validação.',
    risk: 'Adição de uma conta a um grupo estratégico seguida de atribuição de licença que concede acesso privilegiado a um serviço downstream, sem revisão de um segundo aprovador.',
    mitigation: [
      'Segregar administração de grupos críticos (usados para acesso) de administração de licenciamento.',
      'Revisar periodicamente grupos que concedem tanto acesso a recursos quanto licenças via Access Reviews.',
      'Documentar quais grupos são "sensíveis" (usados para autorização) e restringir sua administração a Privileged Access Groups com PIM.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'identity-governance-admin-user-admin',
    name: 'Identity Governance Administrator + User Administrator',
    description: 'Definir as políticas de acesso/entitlement (quem pode solicitar o quê) e, ao mesmo tempo, ter controle direto sobre as próprias contas de usuário.',
    severity: 'high', category: 'access-provisioning', cloud: 'entra-id',
    roleA: { id: 'identity-governance-administrator', name: 'Identity Governance Administrator', cloud: 'entra-id' },
    roleB: { id: 'user-administrator', name: 'User Administrator', cloud: 'entra-id' },
    rationale: 'Identity Governance Administrator configura Entitlement Management (access packages, políticas de aprovação de solicitação de acesso) e Access Reviews. User Administrator gerencia diretamente contas, grupos e a atribuição de membros. Combinadas, a mesma pessoa define as regras de "quem pode solicitar/aprovar acesso" e também pode simplesmente adicionar usuários a grupos/roles diretamente, contornando o fluxo de aprovação formal que ela mesma configurou.',
    risk: 'Provisionamento de acesso por fora do fluxo de Entitlement Management (que geraria trilha de aprovação), usando a via direta de User Administrator para adicionar contas a grupos sensíveis.',
    mitigation: [
      'Desabilitar/monitorar caminhos alternativos de provisionamento direto para grupos que fazem parte de fluxos de Entitlement Management.',
      'Segregar quem desenha políticas de acesso (Identity Governance Administrator) de quem executa provisionamento operacional (User Administrator).',
      'Auditar toda adição de membro a grupo sensível que não tenha passado por uma solicitação de access package aprovada.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-overview'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },

  // ═══ privileged-access (Entra ID) ═══════════════════════════════════════
  {
    id: 'pra-security-reader',
    name: 'Privileged Role Administrator + Security Reader',
    description: 'Atribuir roles privilegiadas e, ao mesmo tempo, ser quem audita os logs/relatórios de segurança dessas atribuições.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-reader', name: 'Security Reader', cloud: 'entra-id' },
    rationale: 'Security Reader tem acesso de leitura a relatórios de segurança, incluindo sinais de risco de identidade (Identity Protection) que deveriam sinalizar atribuições de role anômalas. Concentrar essa visibilidade com quem efetivamente atribui roles privilegiadas remove a independência necessária para que a auditoria de segurança seja confiável.',
    risk: 'Atribuições de role privilegiada feitas fora do padrão não são reportadas/escaladas porque a única pessoa com visibilidade sobre os sinais de risco é também quem as executou.',
    mitigation: [
      'Atribuir Security Reader a uma equipe de auditoria/SOC independente da equipe de gestão de identidade privilegiada.',
      'Integrar Identity Protection e Access Reviews com um SIEM monitorado por terceiros.',
      'Auditar atribuições de role privilegiada com revisão obrigatória por um segundo aprovador (PIM approval workflow).',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'ga-exchange-admin',
    name: 'Global Administrator + Exchange Administrator',
    description: 'Controle total do tenant somado a acesso direto a e-mails corporativos via administração do Exchange Online.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'exchange-administrator', name: 'Exchange Administrator', cloud: 'entra-id' },
    rationale: 'Exchange Administrator já é acessível via Global Administrator por herança de permissões, mas atribuí-lo explicitamente reforça a concentração de um vetor de acesso especialmente sensível: correspondência corporativa, incluindo comunicações executivas e jurídicas, sem segregação entre administração de plataforma e administração de conteúdo de e-mail.',
    risk: 'Acesso a e-mails de executivos/jurídico para fins de espionagem interna, insider trading ou vazamento de informação privilegiada, sem trilha de aprovação específica para acesso a mailbox.',
    mitigation: [
      'Restringir Exchange Administrator a uma equipe de mensageria distinta da administração geral do tenant.',
      'Habilitar Customer Lockbox e auditoria detalhada de acesso a mailbox para contas executivas.',
      'Exigir justificativa registrada (ticket) para qualquer acesso administrativo a uma caixa de e-mail específica.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'ga-sharepoint-admin',
    name: 'Global Administrator + SharePoint Administrator',
    description: 'Controle total do tenant somado a acesso administrativo a todos os documentos armazenados em SharePoint/OneDrive.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'sharepoint-administrator', name: 'SharePoint Administrator', cloud: 'entra-id' },
    rationale: 'SharePoint Administrator pode acessar qualquer site, biblioteca de documentos e, via recursos de administração, o conteúdo de OneDrive de qualquer usuário. Somado a Global Administrator, concentra tanto o controle da plataforma quanto o acesso irrestrito a todo o conteúdo documental da organização em uma única identidade.',
    risk: 'Acesso não autorizado a documentos confidenciais (contratos, dados financeiros, PII) sem necessidade de solicitar acesso específico, deixando rastro mínimo.',
    mitigation: [
      'Segregar administração de conteúdo (SharePoint Administrator) da administração geral do tenant.',
      'Habilitar auditoria unificada (Microsoft Purview Audit) para qualquer acesso administrativo a sites/bibliotecas sensíveis.',
      'Aplicar sensitivity labels e DLP para restringir acesso mesmo a contas administrativas em sites classificados como confidenciais.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'auth-policy-admin-auth-admin',
    name: 'Authentication Policy Administrator + Authentication Administrator',
    description: 'Definir as políticas de autenticação do tenant e, ao mesmo tempo, executar operações individuais de autenticação sobre usuários.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'authentication-policy-administrator', name: 'Authentication Policy Administrator', cloud: 'entra-id' },
    roleB: { id: 'authentication-administrator', name: 'Authentication Administrator', cloud: 'entra-id' },
    rationale: 'Authentication Policy Administrator configura políticas globais (ex.: métodos de autenticação permitidos, políticas de FIDO2/Passkey, configuração de autenticação sem senha). Authentication Administrator executa ações individuais (resetar MFA, exigir re-registro). Juntas, a mesma identidade pode enfraquecer a política global (ex.: permitir SMS como fallback) e depois forçar um usuário específico a reautenticar sob a política enfraquecida.',
    risk: 'Downgrade direcionado do método de autenticação de uma conta específica (ex.: de FIDO2 para SMS) para viabilizar um ataque de SIM swapping ou phishing de MFA.',
    mitigation: [
      'Segregar definição de política de autenticação (nível tenant) de operações individuais sobre contas de usuário.',
      'Alertar sobre qualquer alteração de política de autenticação seguida de reset de método em conta específica na mesma janela de tempo.',
      'Restringir métodos de fallback fracos (SMS, e-mail) via Authentication Methods Policy independente de quem opera o suporte.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },

  // ═══ security-operations ════════════════════════════════════════════════
  {
    id: 'security-admin-security-reader-entra',
    name: 'Security Administrator + Security Reader',
    description: 'Configurar políticas de segurança e, ao mesmo tempo, ser responsável por auditar as próprias configurações.',
    severity: 'high', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-reader', name: 'Security Reader', cloud: 'entra-id' },
    rationale: 'Security Administrator configura políticas de Conditional Access, Identity Protection e outras defesas; Security Reader audita esses mesmos controles. Sem segregação, a mesma pessoa configura e "aprova" (via leitura sem escalar problemas) as próprias mudanças.',
    risk: 'Enfraquecimento gradual de controles de segurança sem detecção, pois quem deveria reportar desvios é a mesma pessoa que os introduziu.',
    mitigation: [
      'Atribuir Security Reader a uma função de auditoria/GRC independente da equipe operacional de segurança.',
      'Revisar mudanças de política de segurança via change management com aprovação de um segundo administrador.',
      'Auditar histórico de alterações de política de Conditional Access/Identity Protection periodicamente por terceiros.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'ca-admin-security-admin',
    name: 'Conditional Access Administrator + Security Administrator',
    description: 'Criar/alterar políticas de acesso condicional e também administrar a postura geral de segurança — sobreposição de controle sobre o principal mecanismo de defesa do Entra ID.',
    severity: 'critical', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'conditional-access-administrator', name: 'Conditional Access Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    rationale: 'Conditional Access é o principal controle preventivo do Entra ID (MFA, restrição de localização/dispositivo, sign-in risk). Security Administrator já tem amplos poderes de segurança; somar Conditional Access Administrator explicitamente concentra o controle do "portão de entrada" de todo o tenant em uma única identidade sem revisão de terceiros.',
    risk: 'Criação de uma política de exclusão (ex.: isentar uma conta específica de MFA) para facilitar acesso não autorizado posterior, sem segunda aprovação.',
    mitigation: [
      'Exigir dupla aprovação (via PIM approval ou change management) para qualquer alteração em políticas de Conditional Access que envolvam exclusões.',
      'Monitorar e alertar sobre exclusões de usuário/grupo em políticas críticas de Conditional Access.',
      'Revisar politicas de exclusão trimestralmente via Access Reviews e relatórios de "what if" do Conditional Access.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'security-admin-compliance-admin',
    name: 'Security Administrator + Compliance Administrator',
    description: 'Administrar segurança e, ao mesmo tempo, auditar a conformidade das próprias configurações de segurança.',
    severity: 'medium', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    roleB: { id: 'compliance-administrator', name: 'Compliance Administrator', cloud: 'entra-id' },
    rationale: 'Compliance Administrator gerencia políticas de retenção, DLP e configurações regulatórias, que deveriam servir de checagem independente sobre como dados são protegidos pela equipe de segurança. Sobrepor as duas roles remove essa checagem cruzada.',
    risk: 'Configurações de segurança fora de compliance regulatório (ex.: retenção insuficiente para requisitos legais) não são identificadas porque quem audita compliance é a mesma pessoa que configura segurança.',
    mitigation: [
      'Atribuir Compliance Administrator a uma função de GRC/jurídico, independente da equipe técnica de segurança.',
      'Revisar politicas de DLP/retenção em conjunto com auditoria externa periódica.',
      'Documentar e versionar todas as alterações de política de compliance com aprovação de um segundo revisor.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'attack-sim-admin-security-admin',
    name: 'Attack Simulation Administrator + Security Administrator',
    description: 'Executar simulações de ataque (phishing) e, ao mesmo tempo, administrar as defesas que essas simulações deveriam testar de forma independente.',
    severity: 'medium', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'attack-simulation-administrator', name: 'Attack Simulation Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    rationale: 'Attack Simulation Administrator cria campanhas de phishing simulado para medir a maturidade de segurança da organização. Se a mesma pessoa também configura as defesas testadas (Security Administrator), os resultados dos testes podem ser manipulados ou os testes ajustados para não expor gaps reais.',
    risk: 'Simulações de ataque desenhadas de forma tendenciosa (ex.: excluindo determinados grupos/cenários) para inflar artificialmente a métrica de maturidade de segurança reportada à liderança.',
    mitigation: [
      'Atribuir Attack Simulation Administrator a uma equipe de red team/awareness independente da equipe de configuração de defesas.',
      'Revisar o escopo e os resultados de campanhas de simulação com um terceiro (auditoria interna ou CISO).',
      'Publicar métricas de simulação de forma consistente ao longo do tempo para detectar padrões de manipulação.',
    ],
    references: ['https://learn.microsoft.com/en-us/defender-office-365/attack-simulation-training-get-started'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'global-secure-access-admin-log-reader',
    name: 'Global Secure Access Administrator + Global Secure Access Log Reader',
    description: 'Configurar as políticas de acesso seguro (SSE) e, ao mesmo tempo, ser quem revisa os logs dessas mesmas políticas.',
    severity: 'medium', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'global-secure-access-administrator', name: 'Global Secure Access Administrator', cloud: 'entra-id' },
    roleB: { id: 'global-secure-access-log-reader', name: 'Global Secure Access Log Reader', cloud: 'entra-id' },
    rationale: 'Global Secure Access Administrator configura perfis de acesso, forwarding profiles e políticas de rede segura (Microsoft Entra Internet/Private Access). Global Secure Access Log Reader visualiza os logs de tráfego gerados por essas políticas. Sem segregação, a pessoa que define a política é a mesma que verifica se ela está sendo respeitada ou contornada.',
    risk: 'Criação de uma regra de bypass em uma política de rede segura, sem que o desvio de tráfego correspondente seja escalado por um revisor independente de logs.',
    mitigation: [
      'Segregar administração de políticas de rede segura da revisão de logs de tráfego.',
      'Exportar logs do Global Secure Access para um SIEM monitorado por uma equipe de SOC independente.',
      'Auditar periodicamente regras de exceção/bypass configuradas nos perfis de acesso.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },

  // ═══ financial-control (Azure RBAC) ═════════════════════════════════════
  {
    id: 'owner-cost-mgmt-contributor',
    name: 'Owner + Cost Management Contributor',
    description: 'Controle total dos recursos de uma subscription somado ao controle de orçamentos e configuração de custos dessa mesma subscription.',
    severity: 'high', category: 'financial-control', cloud: 'azure-rbac',
    roleA: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    roleB: { id: 'cost-management-contributor', name: 'Cost Management Contributor', cloud: 'azure-rbac' },
    rationale: 'Cost Management Contributor permite configurar budgets, alertas de gasto e exports de custo — controles pensados para dar visibilidade financeira independente sobre o consumo de recursos. Se a mesma identidade também é Owner (pode provisionar qualquer recurso), ela pode desativar/ajustar alertas de orçamento antes de provisionar recursos caros sem que a área financeira perceba a tempo.',
    risk: 'Provisionamento de recursos de alto custo (ex.: VMs GPU, serviços premium) com supressão simultânea dos alertas de budget que deveriam sinalizar o gasto anômalo.',
    mitigation: [
      'Segregar controle de orçamento/custos (FinOps) do time de provisionamento de infraestrutura.',
      'Configurar budgets com Action Groups que notificam um time financeiro independente, não editável pelo Owner de recursos.',
      'Revisar mensalmente alterações em configurações de budget/alerta versus picos de gasto.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/assign-access-acm-data'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'billing-reader-cost-mgmt-contributor',
    name: 'Billing Reader + Cost Management Contributor',
    description: 'Visualizar dados de faturamento e, ao mesmo tempo, poder alterar a configuração de custos (budgets, exports) que gera esses relatórios.',
    severity: 'medium', category: 'financial-control', cloud: 'azure-rbac',
    roleA: { id: 'billing-reader', name: 'Billing Reader', cloud: 'azure-rbac' },
    roleB: { id: 'cost-management-contributor', name: 'Cost Management Contributor', cloud: 'azure-rbac' },
    rationale: 'Billing Reader deveria ser uma role puramente de leitura de dados financeiros — o contraponto independente de quem gerencia custos operacionalmente. Somar Cost Management Contributor à mesma identidade permite alterar exports e configurações que alimentam os próprios relatórios que ela "audita" como leitora.',
    risk: 'Alteração de um export de custo (ex.: excluir uma categoria de recursos) antes de gerar um relatório de faturamento, distorcendo a visão apresentada à liderança.',
    mitigation: [
      'Manter Billing Reader restrito a stakeholders (finanças, gestores) sem nenhuma role de escrita sobre configuração de custos.',
      'Versionar configurações de export/budget e alertar sobre qualquer alteração antes de fechamentos mensais.',
      'Auditar quem tem ambas as roles simultaneamente via Access Reviews.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/assign-access-acm-data'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'owner-billing-reader',
    name: 'Owner + Billing Reader',
    description: 'Aprovar/provisionar qualquer recurso e visualizar a fatura resultante sem nenhum controle financeiro externo.',
    severity: 'medium', category: 'financial-control', cloud: 'azure-rbac',
    roleA: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    roleB: { id: 'billing-reader', name: 'Billing Reader', cloud: 'azure-rbac' },
    rationale: 'Embora Billing Reader seja uma role de leitura, tê-la somada a Owner permite que a mesma pessoa que decide o que provisionar também acompanhe diretamente o impacto financeiro sem qualquer camada de aprovação/revisão externa antes do gasto ser comprometido.',
    risk: 'Decisões de provisionamento tomadas unilateralmente sem checagem orçamentária prévia por uma segunda pessoa/área financeira.',
    mitigation: [
      'Estabelecer processo de aprovação de orçamento prévio para provisionamento de recursos acima de um limiar de custo.',
      'Compartilhar visibilidade de billing com a área financeira via Cost Management sem depender apenas do Owner técnico.',
      'Configurar Azure Policy para bloquear a criação de SKUs/recursos de alto custo sem tag de aprovação orçamentária.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/assign-access-acm-data'],
    frameworks: ['SOX'],
  },
  {
    id: 'cost-mgmt-contributor-user-access-admin',
    name: 'Cost Management Contributor + User Access Administrator',
    description: 'Controlar a configuração de custos/orçamento e, ao mesmo tempo, poder conceder a si mesmo ou a outros as permissões necessárias para contornar controles financeiros.',
    severity: 'high', category: 'financial-control', cloud: 'azure-rbac',
    roleA: { id: 'cost-management-contributor', name: 'Cost Management Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'User Access Administrator permite atribuir qualquer role RBAC, incluindo a si mesmo. Combinado com Cost Management Contributor, uma identidade pode se auto-atribuir roles adicionais (ex.: Owner ou Contributor) especificamente para provisionar recursos, enquanto simultaneamente controla os alertas/budgets que deveriam sinalizar esse gasto.',
    risk: 'Escalonamento de privilégio para provisionar recursos de alto custo combinado com supressão dos controles financeiros que detectariam o gasto.',
    mitigation: [
      'Nunca atribuir User Access Administrator à mesma identidade responsável por configuração de custos/orçamento.',
      'Auditar toda atribuição de role feita por identidades com Cost Management Contributor ativo.',
      'Aplicar Azure Policy com deny assignments para bloquear auto-atribuição de roles de alto privilégio.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['SOX', 'ISO27001'],
  },

  // ═══ privileged-access (Azure RBAC) ═════════════════════════════════════
  {
    id: 'owner-user-access-admin',
    name: 'Owner + User Access Administrator',
    description: 'Controle total de recursos somado à capacidade de atribuir permissões a si mesmo e a outros — combinação que praticamente elimina qualquer limite de RBAC.',
    severity: 'critical', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Owner já inclui a capacidade de atribuir roles (User Access Administrator é, na prática, um subconjunto de Owner). Atribuir explicitamente as duas juntas normalmente indica erro de governança de RBAC e reforça visualmente a ausência de qualquer segregação entre controle de recursos e controle de acesso.',
    risk: 'Nenhuma segregação real entre "quem usa recursos" e "quem decide quem pode usar recursos" — vetor clássico de escalonamento de privilégio e de dificuldade de rastreamento de responsabilidade.',
    mitigation: [
      'Atribuir apenas Owner OU User Access Administrator + Contributor separadamente, nunca as duas de forma redundante.',
      'Usar PIM para Azure Resources com ativação just-in-time e aprovação para qualquer uma das duas roles.',
      'Revisar Access Reviews trimestrais para identidades com Owner permanente.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'owner-rbac-admin',
    name: 'Owner + Role Based Access Control Administrator',
    description: 'Controle total dos recursos combinado com controle total de atribuição de roles RBAC — duplica o poder de autorização na mesma identidade.',
    severity: 'critical', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    roleB: { id: 'role-based-access-control-administrator', name: 'Role Based Access Control Administrator', cloud: 'azure-rbac' },
    rationale: 'Role Based Access Control Administrator foi criada como uma alternativa mais restrita a User Access Administrator (permite gerenciar apenas atribuições de role via Azure RBAC, sem outras formas de gestão de acesso como Blueprints). Ainda assim, somada a Owner, recria o mesmo problema de concentração: uma única identidade decide o que existe E quem pode acessar o que existe.',
    risk: 'Mesmo risco de escalonamento de privilégio self-service do par Owner + User Access Administrator, com a única diferença sendo o escopo ligeiramente mais restrito da segunda role.',
    mitigation: [
      'Escolher apenas uma das duas roles conforme a necessidade real (gestão de recursos vs. gestão de acesso), nunca ambas.',
      'Aplicar PIM com aprovação de terceiros para ativação de qualquer uma das roles.',
      'Auditar atribuições de role feitas por identidades que também são Owner do mesmo escopo.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'contributor-user-access-admin',
    name: 'Contributor + User Access Administrator',
    description: 'Criar/modificar todos os recursos de um escopo e, separadamente, conceder acesso a esses mesmos recursos para si ou para outros.',
    severity: 'high', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Contributor por si só NÃO permite atribuir roles — essa é justamente a limitação que a Microsoft documenta como intencional para separar "quem opera recursos" de "quem controla acesso a recursos". Somar User Access Administrator anula essa proteção de design, permitindo que quem cria/modifica recursos também decida quem mais pode acessá-los.',
    risk: 'Um operador com Contributor pode se auto-conceder (ou conceder a terceiros) Owner sobre um recurso que ele mesmo criou, escalando silenciosamente seu próprio nível de acesso.',
    mitigation: [
      'Nunca atribuir User Access Administrator à mesma identidade que já possui Contributor no mesmo escopo.',
      'Delegar atribuição de acesso a uma equipe de IAM/governança separada da equipe de operações de infraestrutura.',
      'Configurar deny assignments ou Azure Policy para bloquear atribuições de role feitas por contas de serviço/operação.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['SOX', 'ISO27001', 'CIS'],
  },
  {
    id: 'security-admin-security-reader-azure',
    name: 'Security Admin + Security Reader (Azure RBAC)',
    description: 'Configurar políticas de segurança de recursos Azure e, ao mesmo tempo, ser quem audita essas mesmas configurações.',
    severity: 'medium', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'security-admin', name: 'Security Admin', cloud: 'azure-rbac' },
    roleB: { id: 'security-reader', name: 'Security Reader', cloud: 'azure-rbac' },
    rationale: 'No Azure RBAC, Security Admin (ligado ao Microsoft Defender for Cloud) permite alterar políticas de segurança e descartar recomendações; Security Reader visualiza o mesmo conjunto de dados sem poder alterá-los. Concentrar as duas roles remove a checagem independente sobre a postura de segurança reportada pelo Defender for Cloud.',
    risk: 'Recomendações de segurança críticas descartadas (dismissed) pela mesma pessoa que deveria reportar de forma independente o score de segurança da subscription.',
    mitigation: [
      'Atribuir Security Reader a uma equipe de auditoria/GRC, independente de quem opera o Defender for Cloud no dia a dia.',
      'Registrar e justificar formalmente qualquer dismissal de recomendação de segurança crítica.',
      'Revisar o Secure Score do Defender for Cloud periodicamente com um terceiro independente da equipe operacional.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },

  // ═══ data-access (Azure RBAC) ═══════════════════════════════════════════
  {
    id: 'storage-account-contributor-blob-data-owner',
    name: 'Storage Account Contributor + Storage Blob Data Owner',
    description: 'Gerenciar a configuração de contas de storage (incluindo chaves de acesso) e também ter acesso irrestrito aos dados dentro delas.',
    severity: 'high', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'storage-account-contributor', name: 'Storage Account Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'storage-blob-data-owner', name: 'Storage Blob Data Owner', cloud: 'azure-rbac' },
    rationale: 'Storage Account Contributor já permite ler as chaves de acesso da conta (que concedem acesso total aos dados independentemente de RBAC), e Storage Blob Data Owner concede controle de dados via Azure RBAC/POSIX ACLs diretamente. As duas juntas eliminam qualquer segregação entre "quem administra a infraestrutura de armazenamento" e "quem acessa os dados armazenados".',
    risk: 'Exfiltração de dados sensíveis armazenados em blobs usando chaves de acesso obtidas via a role de infraestrutura, sem necessidade de solicitar acesso de dados formalmente.',
    mitigation: [
      'Desabilitar autenticação por chave de acesso (Shared Key) nas contas de storage, forçando Azure AD/RBAC para acesso a dados.',
      'Segregar administração de infraestrutura de storage (contas, redes, replicação) de acesso aos dados armazenados.',
      'Rotacionar chaves de acesso regularmente e monitorar seu uso via Azure Monitor/Defender for Storage.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR', 'PCI-DSS'],
  },
  {
    id: 'key-vault-admin-secrets-officer',
    name: 'Key Vault Administrator + Key Vault Secrets Officer',
    description: 'Administrar a configuração/políticas de acesso do Key Vault e, ao mesmo tempo, poder ler e modificar todos os secrets armazenados.',
    severity: 'critical', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'key-vault-administrator', name: 'Key Vault Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'key-vault-secrets-officer', name: 'Key Vault Secrets Officer', cloud: 'azure-rbac' },
    rationale: 'Key Vault Administrator já pode gerenciar as políticas de acesso do cofre (incluindo conceder a si mesmo qualquer role de dados via Azure RBAC), tornando Key Vault Secrets Officer redundante em termos de poder real e reforçando a concentração de controle sobre credenciais/segredos críticos (connection strings, API keys, certificados) em uma única identidade.',
    risk: 'Acesso irrestrito a segredos de produção (strings de conexão de banco de dados, chaves de API de terceiros) sem qualquer segregação entre quem administra o cofre e quem deveria apenas consumir segredos específicos.',
    mitigation: [
      'Conceder Key Vault Secrets Officer apenas para aplicações/identidades gerenciadas específicas, nunca para administradores humanos com Key Vault Administrator.',
      'Habilitar Private Link e logging detalhado de todo acesso a secrets via Azure Monitor.',
      'Usar cofres separados por sensibilidade/ambiente (produção vs. desenvolvimento) com atribuições de role independentes.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide'],
    frameworks: ['SOX', 'ISO27001', 'PCI-DSS', 'NIST-CSF'],
  },
  {
    id: 'key-vault-admin-crypto-officer',
    name: 'Key Vault Administrator + Key Vault Crypto Officer',
    description: 'Administrar o Key Vault e, ao mesmo tempo, ter controle total sobre as chaves criptográficas armazenadas nele.',
    severity: 'critical', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'key-vault-administrator', name: 'Key Vault Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'key-vault-crypto-officer', name: 'Key Vault Crypto Officer', cloud: 'azure-rbac' },
    rationale: 'Chaves criptográficas geridas no Key Vault frequentemente protegem dados em repouso de múltiplos serviços (discos gerenciados, storage, bancos de dados). Key Vault Administrator já controla o acesso a essas chaves via políticas RBAC; somar Key Vault Crypto Officer concentra tanto o controle administrativo do cofre quanto a operação direta das chaves (criar, rotacionar, excluir) na mesma identidade.',
    risk: 'Exclusão ou rotação maliciosa de chaves de criptografia usadas para proteger dados críticos, causando perda de acesso a dados (ransomware interno) sem segunda validação.',
    mitigation: [
      'Habilitar soft-delete e purge protection obrigatórios em todos os Key Vaults com chaves de produção.',
      'Segregar operação de chaves criptográficas (Key Vault Crypto Officer) da administração do cofre.',
      'Exigir aprovação dupla (via change management) para qualquer operação destrutiva sobre chaves (delete/purge).',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide'],
    frameworks: ['SOX', 'ISO27001', 'PCI-DSS', 'NIST-CSF'],
  },
  {
    id: 'key-vault-admin-user-access-admin',
    name: 'Key Vault Administrator + User Access Administrator',
    description: 'Administrar as políticas de acesso de um Key Vault específico e, ao mesmo tempo, poder conceder a si mesmo roles adicionais em toda a subscription.',
    severity: 'critical', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'key-vault-administrator', name: 'Key Vault Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Key Vault Administrator já concentra controle total sobre um cofre específico. Se a mesma identidade também é User Access Administrator no escopo da subscription, ela pode se auto-atribuir acesso a outros Key Vaults ou recursos além do escopo original, ampliando o blast radius de um cofre isolado para toda a subscription.',
    risk: 'Escalonamento lateral: comprometer o acesso a um Key Vault de baixo valor e usá-lo como trampolim para se auto-atribuir acesso a Key Vaults de produção via User Access Administrator.',
    mitigation: [
      'Nunca atribuir User Access Administrator no nível de subscription a quem administra Key Vaults específicos — usar escopo de resource group ou do próprio recurso.',
      'Segregar completamente a gestão de acesso a segredos (Key Vault) da gestão de acesso RBAC geral.',
      'Auditar toda atribuição de role feita por identidades com Key Vault Administrator ativo em qualquer cofre.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide'],
    frameworks: ['SOX', 'ISO27001', 'PCI-DSS'],
  },

  // ═══ application-management (Azure RBAC) ═══════════════════════════════
  {
    id: 'contributor-devtest-labs-user',
    name: 'Contributor + DevTest Labs User',
    description: 'Criar/modificar recursos de produção e, ao mesmo tempo, gerenciar ambientes de desenvolvimento/teste — mistura de responsabilidades entre ambientes.',
    severity: 'low', category: 'application-management', cloud: 'azure-rbac',
    roleA: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'devtest-labs-user', name: 'DevTest Labs User', cloud: 'azure-rbac' },
    rationale: 'Uma boa prática de segregação de ambientes é impedir que a mesma identidade opere tanto produção (via Contributor em uma subscription de produção) quanto ambientes de DevTest, para reduzir o risco de configurações de teste vazarem para produção ou de dados de produção serem copiados para ambientes menos protegidos de DevTest Labs.',
    risk: 'Cópia inadvertida (ou deliberada) de dados/configurações de produção para um ambiente de DevTest Labs com controles de segurança mais fracos.',
    mitigation: [
      'Usar subscriptions/management groups separados para produção e DevTest, com atribuições de role independentes.',
      'Aplicar Azure Policy para impedir a criação de recursos de DevTest Labs em subscriptions de produção.',
      'Revisar periodicamente quem tem acesso simultâneo a ambientes de produção e de desenvolvimento/teste.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'app-config-data-owner-contributor',
    name: 'App Configuration Data Owner + Contributor',
    description: 'Controlar as configurações de aplicação em runtime (feature flags, key-values) e, ao mesmo tempo, poder modificar a infraestrutura que executa essa aplicação.',
    severity: 'medium', category: 'application-management', cloud: 'azure-rbac',
    roleA: { id: 'app-configuration-data-owner', name: 'App Configuration Data Owner', cloud: 'azure-rbac' },
    roleB: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    rationale: 'App Configuration Data Owner permite alterar feature flags e configurações de runtime de uma aplicação — mudanças que idealmente deveriam passar por um processo de release/aprovação separado da infraestrutura. Somado a Contributor (que permite alterar a infraestrutura subjacente), a mesma identidade controla tanto o comportamento da aplicação em runtime quanto a infraestrutura que a sustenta, sem segregação entre "config change" e "infra change".',
    risk: 'Ativação de uma feature flag não aprovada em produção combinada com alteração simultânea de infraestrutura para mascarar o comportamento resultante.',
    mitigation: [
      'Segregar gestão de feature flags/configuração de aplicação (App Configuration) da gestão de infraestrutura (Contributor).',
      'Exigir pull request/aprovação para qualquer alteração de configuração que afete produção, com trilha de auditoria no App Configuration.',
      'Auditar alterações de feature flag correlacionadas com deployments de infraestrutura na mesma janela de tempo.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-enable-rbac'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'api-mgmt-service-contributor-workspace-product-manager',
    name: 'API Management Service Contributor + API Management Workspace API Product Manager',
    description: 'Gerenciar a infraestrutura do serviço API Management e, ao mesmo tempo, poder publicar/promover APIs para produtos consumidos externamente.',
    severity: 'medium', category: 'application-management', cloud: 'azure-rbac',
    roleA: { id: 'api-management-service-contributor', name: 'API Management Service Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'api-management-workspace-api-product-manager', name: 'API Management Workspace API Product Manager', cloud: 'azure-rbac' },
    rationale: 'API Management Service Contributor administra a infraestrutura do gateway de APIs; API Management Workspace API Product Manager decide quais APIs são publicadas em quais produtos (afetando quem pode consumi-las externamente, incluindo parceiros). Combinadas, a mesma identidade pode alterar a infraestrutura do gateway E aprovar/publicar uma API para consumo externo sem revisão de um segundo responsável por governança de API.',
    risk: 'Publicação de uma API com configuração de segurança fraca (ex.: sem rate limiting ou validação de policy) diretamente para um produto de consumo externo, sem revisão por um dono de produto independente.',
    mitigation: [
      'Segregar administração de infraestrutura do gateway (Service Contributor) da governança de publicação de produtos de API.',
      'Exigir revisão de segurança (policies de rate limiting, autenticação) antes de qualquer API ser promovida a um produto público.',
      'Auditar publicações de API para produtos externos com aprovação obrigatória de um API Product Owner dedicado.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/api-management/api-management-role-based-access-control'],
    frameworks: ['ISO27001', 'CIS'],
  },

  // ═══ compliance-audit ═══════════════════════════════════════════════════
  {
    id: 'ga-app-compliance-automation-admin',
    name: 'Global Administrator (Entra ID) + App Compliance Automation Administrator (Azure RBAC)',
    description: 'Controle total do tenant de identidade combinado com a administração da ferramenta que audita automaticamente a conformidade das aplicações da organização.',
    severity: 'high', category: 'compliance-audit', cloud: 'microsoft-cross',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'app-compliance-automation-administrator', name: 'App Compliance Automation Administrator', cloud: 'azure-rbac' },
    rationale: 'App Compliance Automation Tool avalia continuamente a postura de conformidade de aplicações Microsoft 365 contra frameworks regulatórios. Se a mesma identidade que administra todo o tenant (Global Administrator) também controla essa ferramenta de avaliação automática, ela pode ajustar o escopo/configuração da avaliação para evitar que suas próprias mudanças administrativas apareçam como não-conformes.',
    risk: 'Configurações administrativas fora de compliance (ex.: MFA não aplicado universalmente) não aparecem em relatórios de conformidade porque o escopo de avaliação foi ajustado pela mesma pessoa responsável pela configuração.',
    mitigation: [
      'Atribuir a administração de ferramentas de compliance automation a uma equipe de GRC, nunca à administração geral de identidade.',
      'Auditar alterações de escopo/configuração da App Compliance Automation Tool com trilha de aprovação independente.',
      'Validar periodicamente os resultados de conformidade reportados contra uma auditoria externa independente.',
    ],
    references: ['https://learn.microsoft.com/en-us/microsoft-365-app-certification/docs/appcomplianceautomationtool'],
    frameworks: ['SOX', 'ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'owner-app-compliance-automation-admin',
    name: 'Owner + App Compliance Automation Administrator',
    description: 'Controle total dos recursos de uma subscription somado à administração da ferramenta que auto-avalia a conformidade dessa mesma subscription.',
    severity: 'medium', category: 'compliance-audit', cloud: 'azure-rbac',
    roleA: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    roleB: { id: 'app-compliance-automation-administrator', name: 'App Compliance Automation Administrator', cloud: 'azure-rbac' },
    rationale: 'Um Owner de subscription que também controla a ferramenta de automação de compliance pode ajustar o que é avaliado/reportado sobre os próprios recursos que ele provisiona e configura — eliminando a independência que um processo de auto-avaliação de conformidade deveria ter em relação a quem opera os recursos avaliados.',
    risk: 'Recursos fora de conformidade regulatória continuam em produção porque a ferramenta de avaliação foi configurada (ou seu escopo reduzido) pela mesma pessoa responsável por esses recursos.',
    mitigation: [
      'Segregar a administração de ferramentas de auto-avaliação de compliance da administração operacional de recursos (Owner).',
      'Agendar auditorias externas periódicas que não dependam exclusivamente da automação interna.',
      'Revisar o escopo de avaliação da ferramenta de compliance automation trimestralmente com um responsável de GRC.',
    ],
    references: ['https://learn.microsoft.com/en-us/microsoft-365-app-certification/docs/appcomplianceautomationtool'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'security-admin-compliance-data-admin',
    name: 'Security Administrator + Compliance Data Administrator',
    description: 'Configurar segurança e, ao mesmo tempo, administrar os dados de compliance (relatórios, insights) usados para verificar essa mesma segurança.',
    severity: 'medium', category: 'compliance-audit', cloud: 'entra-id',
    roleA: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    roleB: { id: 'compliance-data-administrator', name: 'Compliance Data Administrator', cloud: 'entra-id' },
    rationale: 'Compliance Data Administrator monitora dados relacionados a compliance no Microsoft Purview (ex.: insights de proteção de dados, alertas de DLP). Combinado com Security Administrator, a mesma pessoa configura os controles de segurança e também gerencia os dados/relatórios que deveriam expor de forma independente se esses controles estão funcionando.',
    risk: 'Alertas de DLP ou insights de proteção de dados relacionados a uma configuração de segurança falha não são escalados porque a mesma pessoa que configurou a falha também gerencia a visibilidade desses alertas.',
    mitigation: [
      'Atribuir Compliance Data Administrator a uma função de GRC/privacidade, independente da equipe de segurança operacional.',
      'Integrar alertas de DLP/compliance a um SIEM monitorado por uma equipe terceira.',
      'Revisar mensalmente a correlação entre mudanças de política de segurança e alertas de compliance suprimidos ou não escalados.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 2 — Expansão de cobertura (auditoria de implantação: Azure RBAC 13%,
  // Entra ID 31%). Todas as roles abaixo foram verificadas via grep exato
  // contra src/data/roles.ts / src/data/azureRbac.ts antes de escrever a
  // regra — nenhum nome aproximado ou inventado.
  // ═══════════════════════════════════════════════════════════════════════

  // ── Azure RBAC — financial-control ──────────────────────────────────────
  {
    id: 'contributor-cost-mgmt-contributor',
    name: 'Contributor + Cost Management Contributor',
    description: 'Criar/modificar todos os recursos de uma subscription e, ao mesmo tempo, controlar a configuração de orçamento/custos desses mesmos recursos.',
    severity: 'medium', category: 'financial-control', cloud: 'azure-rbac',
    roleA: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'cost-management-contributor', name: 'Cost Management Contributor', cloud: 'azure-rbac' },
    rationale: 'Cost Management Contributor deveria funcionar como um controle financeiro independente sobre o que a equipe de infraestrutura (Contributor) provisiona. Concentrar as duas roles permite que a mesma identidade crie recursos de alto custo e ajuste os budgets/alertas que deveriam sinalizar esse gasto para a área financeira.',
    risk: 'Provisionamento de recursos caros com ajuste simultâneo de budgets para evitar que o gasto ultrapasse o limite que dispararia um alerta.',
    mitigation: [
      'Segregar FinOps (Cost Management Contributor) da equipe operacional de infraestrutura (Contributor).',
      'Configurar Action Groups de budget que notificam a área financeira, não editáveis por quem provisiona recursos.',
      'Revisar mensalmente alterações em budgets versus picos de gasto por subscription.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/assign-access-acm-data'],
    frameworks: ['SOX'],
  },

  // ── Azure RBAC — privileged-access ──────────────────────────────────────
  {
    id: 'security-admin-user-access-admin',
    name: 'User Access Administrator + Security Admin',
    description: 'Atribuir qualquer permissão RBAC e, ao mesmo tempo, administrar as políticas de segurança de recursos — sem qualquer supervisão externa.',
    severity: 'critical', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'security-admin', name: 'Security Admin', cloud: 'azure-rbac' },
    rationale: 'User Access Administrator pode se auto-atribuir qualquer role, incluindo Owner. Combinado com Security Admin (que administra o Microsoft Defender for Cloud, incluindo descarte de recomendações), a mesma identidade pode escalar seu próprio acesso e, em seguida, silenciar quaisquer alertas de segurança que a escalada geraria.',
    risk: 'Auto-atribuição de Owner seguida de dismissal das recomendações de segurança do Defender for Cloud que sinalizariam a role excessivamente permissiva recém-criada.',
    mitigation: [
      'Nunca atribuir User Access Administrator e Security Admin à mesma identidade.',
      'Auditar toda atribuição de role feita por identidades com Security Admin ativo.',
      'Alertar via Microsoft Sentinel sobre dismissals de recomendações críticas do Defender for Cloud.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'rbac-admin-contributor',
    name: 'Role Based Access Control Administrator + Contributor',
    description: 'Gerenciar quem tem acesso a um escopo e, ao mesmo tempo, poder modificar todos os recursos desse escopo — um ciclo fechado de autorização e execução.',
    severity: 'high', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'role-based-access-control-administrator', name: 'Role Based Access Control Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    rationale: 'Role Based Access Control Administrator foi desenhada para permitir gestão de acesso sem conceder Owner completo. Somada a Contributor, recria o mesmo problema que a role tentava evitar: a mesma identidade decide quem acessa o quê E modifica os recursos diretamente.',
    risk: 'Atribuição de acesso adicional a si mesmo especificamente para viabilizar uma modificação de recurso que o escopo original de Contributor não permitiria sozinho.',
    mitigation: [
      'Atribuir Role Based Access Control Administrator a uma equipe de IAM segregada da equipe operacional (Contributor).',
      'Auditar atribuições de role feitas por identidades que também possuem Contributor no mesmo escopo.',
      'Usar PIM para Azure Resources com ativação just-in-time para qualquer uma das duas roles.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'owner-automation-contributor',
    name: 'Owner + Automation Contributor',
    description: 'Controle total de recursos combinado com a administração de runbooks de automação, que tipicamente rodam com identidades gerenciadas privilegiadas.',
    severity: 'medium', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    roleB: { id: 'automation-contributor', name: 'Automation Contributor', cloud: 'azure-rbac' },
    rationale: 'Azure Automation frequentemente executa runbooks com uma identidade gerenciada de alto privilégio para orquestrar tarefas entre recursos. Um Owner que também controla a Automation Account pode criar/alterar runbooks maliciosos que rodam com essa identidade privilegiada, sem revisão de um segundo operador.',
    risk: 'Criação de um runbook que usa a identidade gerenciada da Automation Account para executar ações que o próprio Owner não gostaria de realizar diretamente sob sua própria identidade auditável.',
    mitigation: [
      'Segregar administração de Automation Accounts da atribuição geral de Owner em subscriptions de produção.',
      'Revisar/aprovar runbooks novos ou alterados antes de publicação, com um segundo aprovador.',
      'Auditar execuções de runbook e a identidade gerenciada associada via Azure Monitor.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'vm-contributor-network-contributor',
    name: 'Virtual Machine Contributor + Network Contributor',
    description: 'Modificar máquinas virtuais e, ao mesmo tempo, modificar a rede que as conecta — combinação que facilita movimentação lateral.',
    severity: 'high', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'virtual-machine-contributor', name: 'Virtual Machine Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'network-contributor', name: 'Network Contributor', cloud: 'azure-rbac' },
    rationale: 'Cada role isoladamente é intencionalmente limitada (VM Contributor não gerencia rede; Network Contributor não gerencia VMs) — um design que existe justamente para dificultar que uma única identidade reconfigure tanto o host quanto o caminho de rede ao mesmo tempo. Combinadas, essa segregação por design é anulada.',
    risk: 'Abertura de uma regra de NSG para expor uma VM comprometida à internet, ou redirecionamento de tráfego de uma VM sensível para uma rede controlada pelo atacante.',
    mitigation: [
      'Manter VM Contributor e Network Contributor em equipes/times distintos (compute vs. networking).',
      'Auditar alterações de NSG/rota correlacionadas com alterações de configuração de VM na mesma janela de tempo.',
      'Usar Azure Firewall/Network Security Groups centralizados geridos por uma equipe de rede independente.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'automation-contributor-user-access-admin',
    name: 'Automation Contributor + User Access Administrator',
    description: 'Administrar runbooks com identidades gerenciadas privilegiadas e, ao mesmo tempo, poder atribuir acesso adicional a essas mesmas identidades.',
    severity: 'high', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'automation-contributor', name: 'Automation Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Uma identidade gerenciada de Automation Account com escopo amplo já é um vetor de escalonamento conhecido. Se a mesma pessoa que administra os runbooks também pode atribuir RBAC (User Access Administrator), ela pode ampliar deliberadamente o escopo de acesso da identidade gerenciada e depois orquestrar ações através dela.',
    risk: 'Concessão de Owner à identidade gerenciada de uma Automation Account e uso de um runbook para executar ações privilegiadas "em nome" da automação, dificultando a atribuição de responsabilidade.',
    mitigation: [
      'Nunca atribuir User Access Administrator a quem administra Automation Accounts.',
      'Aplicar o princípio de menor privilégio às identidades gerenciadas de Automation Accounts, com revisão periódica de suas atribuições RBAC.',
      'Alertar sobre qualquer atribuição de role a identidades gerenciadas de serviço (service principals).',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'key-vault-secrets-officer-user-access-admin',
    name: 'Key Vault Secrets Officer + User Access Administrator',
    description: 'Ler/gerenciar todos os secrets de um cofre específico e, ao mesmo tempo, poder se auto-atribuir acesso a outros cofres/recursos da subscription.',
    severity: 'critical', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'key-vault-secrets-officer', name: 'Key Vault Secrets Officer', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Key Vault Secrets Officer já concentra acesso a credenciais sensíveis (connection strings, API keys). Se a mesma identidade também é User Access Administrator no escopo da subscription, o acesso inicialmente restrito a um cofre pode ser ampliado para outros Key Vaults ou recursos, multiplicando o blast radius de um comprometimento inicial isolado.',
    risk: 'Escalonamento lateral: comprometer o acesso de secrets de um cofre de baixo valor e usá-lo para se auto-atribuir acesso a Key Vaults de produção via User Access Administrator.',
    mitigation: [
      'Nunca atribuir User Access Administrator no nível de subscription a quem tem Key Vault Secrets Officer em qualquer cofre.',
      'Escopar Key Vault Secrets Officer estritamente ao(s) cofre(s) necessário(s), nunca no nível de subscription.',
      'Auditar toda atribuição de role feita por identidades com acesso a secrets de produção.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide'],
    frameworks: ['SOX', 'ISO27001', 'PCI-DSS'],
  },
  {
    id: 'key-vault-crypto-officer-user-access-admin',
    name: 'Key Vault Crypto Officer + User Access Administrator',
    description: 'Controlar as chaves criptográficas de um cofre e, ao mesmo tempo, poder se auto-atribuir acesso a outros cofres/recursos.',
    severity: 'critical', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'key-vault-crypto-officer', name: 'Key Vault Crypto Officer', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Key Vault Crypto Officer pode rotacionar/excluir chaves que protegem dados em repouso de múltiplos serviços. Combinado com User Access Administrator, a mesma identidade pode ampliar seu alcance para outros cofres além do escopo original, escalando de "controla chaves de um cofre" para "controla chaves de toda a subscription".',
    risk: 'Exclusão ou rotação maliciosa de chaves de criptografia em múltiplos Key Vaults após auto-atribuição de acesso adicional via User Access Administrator.',
    mitigation: [
      'Nunca atribuir User Access Administrator no nível de subscription a quem tem Key Vault Crypto Officer em qualquer cofre.',
      'Habilitar soft-delete e purge protection obrigatórios em todos os Key Vaults com chaves de produção.',
      'Auditar toda atribuição de role feita por identidades com acesso a operações criptográficas de produção.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide'],
    frameworks: ['SOX', 'ISO27001', 'PCI-DSS'],
  },
  {
    id: 'reader-user-access-admin',
    name: 'Reader + User Access Administrator',
    description: 'Acesso somente-leitura a recursos combinado com o poder de atribuir permissões a terceiros — uma identidade nominalmente "read-only" pode construir uma cadeia de acesso para outros.',
    severity: 'low', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'reader', name: 'Reader', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Reader por si só é considerada uma role de baixíssimo risco. Mas User Access Administrator não exige nenhuma outra permissão de escrita sobre recursos para ser perigosa — ela concede a capacidade de atribuir qualquer role RBAC. A combinação permite que uma identidade que nunca aparece como "editora" de recursos ainda assim construa silenciosamente uma teia de acessos para terceiros.',
    risk: 'Uma conta de baixo perfil (aparentemente apenas leitura) usada para provisionar acesso privilegiado a outras identidades, evitando escrutínio por não realizar mudanças diretas em recursos.',
    mitigation: [
      'Nunca atribuir User Access Administrator a contas cujo propósito declarado é somente leitura/monitoramento.',
      'Revisar periodicamente todas as identidades com User Access Administrator, independentemente de outras roles que possuam.',
      'Registrar e alertar sobre qualquer atribuição de role feita por uma identidade sem histórico de modificação de recursos.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001'],
  },

  // ── Azure RBAC — security-operations ────────────────────────────────────
  {
    id: 'security-admin-log-analytics-contributor',
    name: 'Security Admin + Log Analytics Contributor',
    description: 'Configurar políticas de segurança de recursos e, ao mesmo tempo, poder modificar os workspaces de log que registram essas mesmas configurações.',
    severity: 'high', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'security-admin', name: 'Security Admin', cloud: 'azure-rbac' },
    roleB: { id: 'log-analytics-contributor', name: 'Log Analytics Contributor', cloud: 'azure-rbac' },
    rationale: 'Log Analytics Contributor pode alterar a retenção, coleta e configuração de workspaces do Azure Monitor/Sentinel. Se a mesma identidade também administra políticas de segurança (Security Admin), ela pode reduzir a janela de retenção de logs ou desabilitar coletas específicas exatamente nas áreas onde fez alterações de segurança questionáveis.',
    risk: 'Redução da retenção de logs de auditoria em um workspace específico logo após uma alteração de política de segurança que a pessoa não quer que seja rastreável posteriormente.',
    mitigation: [
      'Segregar administração de workspaces de log (Log Analytics Contributor) da administração de políticas de segurança (Security Admin).',
      'Exportar logs críticos para um workspace/storage account imutável (WORM) fora do controle da equipe de segurança operacional.',
      'Alertar sobre qualquer redução de política de retenção de log via Azure Policy.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'security-admin-monitoring-contributor',
    name: 'Security Admin + Monitoring Contributor',
    description: 'Configurar alertas de segurança e, ao mesmo tempo, poder modificar a configuração geral de monitoramento que dispara esses alertas.',
    severity: 'medium', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'security-admin', name: 'Security Admin', cloud: 'azure-rbac' },
    roleB: { id: 'monitoring-contributor', name: 'Monitoring Contributor', cloud: 'azure-rbac' },
    rationale: 'Monitoring Contributor pode ler e atualizar toda a configuração de monitoramento (alertas, action groups, diagnostic settings). Combinado com Security Admin, a mesma pessoa configura o que é considerado uma ameaça E controla se/como isso dispara um alerta visível para outros.',
    risk: 'Desativação silenciosa de um action group de notificação de incidentes de segurança logo após introduzir uma configuração de risco.',
    mitigation: [
      'Segregar administração de monitoramento geral (Monitoring Contributor) da administração de segurança (Security Admin).',
      'Auditar alterações em action groups e diagnostic settings via Azure Policy/Activity Log.',
      'Replicar alertas críticos de segurança para um canal externo não editável pela equipe de segurança operacional.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'monitoring-contributor-security-reader-azure',
    name: 'Monitoring Contributor + Security Reader (Azure RBAC)',
    description: 'Modificar configurações de monitoramento e, ao mesmo tempo, ser quem audita passivamente a postura de segurança — pouca segregação entre observabilidade e verificação.',
    severity: 'low', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'monitoring-contributor', name: 'Monitoring Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'security-reader', name: 'Security Reader', cloud: 'azure-rbac' },
    rationale: 'Ainda que Security Reader seja somente leitura, ter Monitoring Contributor na mesma identidade permite ajustar o que é monitorado antes de "auditar" a postura de segurança via Security Reader, resultando em uma revisão que não é verdadeiramente independente da configuração observada.',
    risk: 'Ajuste de escopo de monitoramento para omitir recursos específicos, seguido de uma revisão de segurança que naturalmente não encontra problemas nesses recursos.',
    mitigation: [
      'Atribuir Security Reader a uma função de auditoria independente de quem configura monitoramento operacional.',
      'Revisar periodicamente o escopo de monitoramento (quais recursos/assinaturas estão cobertos) com um segundo revisor.',
      'Comparar o inventário de recursos ativos com o escopo efetivamente monitorado, sinalizando lacunas.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions'],
    frameworks: ['ISO27001'],
  },
  {
    id: 'network-contributor-security-admin',
    name: 'Network Contributor + Security Admin',
    description: 'Modificar regras de rede (NSGs, rotas, gateways) e, ao mesmo tempo, administrar as políticas de segurança que deveriam avaliar essas regras.',
    severity: 'high', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'network-contributor', name: 'Network Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'security-admin', name: 'Security Admin', cloud: 'azure-rbac' },
    rationale: 'O Microsoft Defender for Cloud avalia continuamente a exposição de rede (ex.: portas abertas para a internet) e gera recomendações de segurança. Se a mesma identidade pode tanto alterar a rede quanto administrar essas recomendações (Security Admin, incluindo dismissal), ela pode abrir exposições de rede e suprimir o alerta correspondente.',
    risk: 'Abertura de uma porta de gestão (ex.: RDP/SSH) para a internet, seguida de dismissal da recomendação de segurança que sinalizaria essa exposição no Secure Score.',
    mitigation: [
      'Segregar administração de rede (Network Contributor) da administração de segurança (Security Admin).',
      'Bloquear via Azure Policy a criação de regras de NSG que exponham portas de gestão diretamente à internet.',
      'Exigir justificativa registrada e aprovação para qualquer dismissal de recomendação de exposição de rede.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },

  // ── Azure RBAC — data-access ─────────────────────────────────────────────
  {
    id: 'sql-server-contributor-storage-blob-data-reader',
    name: 'SQL Server Contributor + Storage Blob Data Reader',
    description: 'Modificar configuração de servidores/bancos SQL e, ao mesmo tempo, ler dados armazenados em blobs — combinação que facilita exfiltração de dados via export.',
    severity: 'medium', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'sql-server-contributor', name: 'SQL Server Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'storage-blob-data-reader', name: 'Storage Blob Data Reader', cloud: 'azure-rbac' },
    rationale: 'SQL Server Contributor não inclui acesso aos dados dentro do banco, mas permite configurar exports/auditing para storage accounts. Combinado com Storage Blob Data Reader, a mesma identidade pode configurar um export de dados do SQL para um blob e depois ler esse blob diretamente, contornando controles de acesso a dados do próprio banco.',
    risk: 'Configuração de auditoria/export do SQL Server para uma conta de storage específica, seguida de leitura direta desses dados exportados via Storage Blob Data Reader — um caminho de exfiltração que nenhuma das duas roles isoladamente permitiria.',
    mitigation: [
      'Segregar administração de infraestrutura SQL (SQL Server Contributor) do acesso a dados de storage (Storage Blob Data Reader).',
      'Restringir contas de storage usadas para exports/auditing de SQL a um conjunto de identidades dedicado e monitorado.',
      'Habilitar Private Link e logging detalhado de acesso para qualquer storage account usada como destino de export de dados de banco.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR', 'PCI-DSS'],
  },
  {
    id: 'storage-account-contributor-storage-blob-data-reader',
    name: 'Storage Account Contributor + Storage Blob Data Reader',
    description: 'Gerenciar a configuração de contas de storage (incluindo chaves de acesso) e também poder ler os dados armazenados nelas — versão de menor impacto do par com Data Owner.',
    severity: 'low', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'storage-account-contributor', name: 'Storage Account Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'storage-blob-data-reader', name: 'Storage Blob Data Reader', cloud: 'azure-rbac' },
    rationale: 'Storage Account Contributor já permite obter as chaves de acesso da conta (que concedem leitura total independentemente de RBAC), tornando Storage Blob Data Reader redundante em termos de poder real. Embora o risco seja menor do que o par equivalente com Storage Blob Data Owner (sem capacidade de escrita/exclusão de dados), ainda representa concentração de acesso administrativo e de leitura de dados na mesma identidade.',
    risk: 'Leitura de dados sensíveis armazenados em blobs usando chaves de acesso obtidas via a role de infraestrutura, sem necessidade de solicitar acesso de dados formalmente.',
    mitigation: [
      'Desabilitar autenticação por chave de acesso (Shared Key) nas contas de storage, forçando Azure AD/RBAC para acesso a dados.',
      'Segregar administração de infraestrutura de storage do acesso de leitura aos dados armazenados.',
      'Monitorar uso de chaves de acesso via Azure Monitor/Defender for Storage.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'LGPD'],
  },

  // ── Azure RBAC — application-management ─────────────────────────────────
  {
    id: 'aks-cluster-admin-contributor',
    name: 'Azure Kubernetes Service Cluster Admin Role + Contributor',
    description: 'Administrar credenciais de admin de um cluster AKS e, ao mesmo tempo, poder modificar toda a infraestrutura de rede/storage ao redor do cluster.',
    severity: 'high', category: 'application-management', cloud: 'azure-rbac',
    roleA: { id: 'azure-kubernetes-service-cluster-admin-role', name: 'Azure Kubernetes Service Cluster Admin Role', cloud: 'azure-rbac' },
    roleB: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    rationale: 'AKS Cluster Admin Role concede as credenciais de administrador do cluster Kubernetes (controle total sobre workloads/orquestração). Contributor concede controle total sobre a infraestrutura Azure ao redor (rede, discos, load balancers). Juntas, a mesma identidade controla tanto o que roda dentro do cluster quanto a infraestrutura que o cluster usa, sem segregação entre times de plataforma e de infraestrutura.',
    risk: 'Implantação de um workload malicioso no cluster combinada com reconfiguração da infraestrutura de rede ao redor (ex.: expor um serviço interno publicamente) sem revisão por um segundo time.',
    mitigation: [
      'Segregar administração de cluster AKS (times de plataforma/DevOps) da administração de infraestrutura Azure geral (Contributor).',
      'Usar Azure RBAC para Kubernetes Authorization em vez das credenciais de cluster admin sempre que possível, para granularidade e auditoria melhores.',
      'Auditar deployments no cluster correlacionados com mudanças de infraestrutura de rede na mesma janela de tempo.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/azure/aks/concepts-identity'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'vm-contributor-storage-account-contributor',
    name: 'Virtual Machine Contributor + Storage Account Contributor',
    description: 'Controlar máquinas virtuais e, ao mesmo tempo, ter acesso à conta de storage (incluindo chaves) usada pelos discos/dados dessas VMs.',
    severity: 'medium', category: 'application-management', cloud: 'azure-rbac',
    roleA: { id: 'virtual-machine-contributor', name: 'Virtual Machine Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'storage-account-contributor', name: 'Storage Account Contributor', cloud: 'azure-rbac' },
    rationale: 'VM Contributor não inclui acesso à conta de storage subjacente (por desenho, para separar controle de compute de controle de dados). Storage Account Contributor concede as chaves de acesso da conta de storage, que podem conter VHDs, dados de aplicação ou backups das mesmas VMs. Combinadas, a segregação por desenho entre "quem opera a VM" e "quem acessa os dados dela" é eliminada.',
    risk: 'Acesso não autorizado a discos/dados de VMs de produção via chaves de storage, contornando a separação intencional entre administração de compute e de dados.',
    mitigation: [
      'Manter Virtual Machine Contributor e Storage Account Contributor em equipes distintas.',
      'Usar Azure Disk Encryption e Managed Disks com Azure RBAC específico em vez de contas de storage compartilhadas para discos de VM.',
      'Desabilitar Shared Key authentication nas contas de storage associadas a workloads de produção.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'contributor-sql-server-contributor',
    name: 'Contributor + SQL Server Contributor',
    description: 'Controlar toda a infraestrutura de uma subscription e, especificamente, também administrar a configuração de servidores/bancos SQL.',
    severity: 'low', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'sql-server-contributor', name: 'SQL Server Contributor', cloud: 'azure-rbac' },
    rationale: 'Contributor já inclui, na prática, a capacidade de gerenciar recursos SQL Server (SQL Server Contributor é um subconjunto funcional de Contributor). Atribuir explicitamente as duas juntas normalmente indica falta de rigor na atribuição de RBAC — um sinal de escopo mais amplo do que o necessário para quem só precisaria administrar bancos de dados.',
    risk: 'Ausência de segregação entre administração geral de infraestrutura e administração específica de bancos de dados, dificultando auditoria de responsabilidade em caso de incidente envolvendo dados.',
    mitigation: [
      'Atribuir apenas SQL Server Contributor (escopo mais restrito) quando a necessidade for exclusivamente administrar bancos de dados.',
      'Revisar atribuições redundantes de Contributor + roles mais específicas via Access Reviews.',
      'Aplicar Azure Policy para restringir Contributor a escopos de resource group específicos por workload.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001'],
  },

  // ── Azure RBAC — compliance-audit ───────────────────────────────────────
  {
    id: 'owner-resource-policy-contributor',
    name: 'Owner + Resource Policy Contributor',
    description: 'Definir as políticas de governança (Azure Policy) e, ao mesmo tempo, ter controle total dos recursos que essas políticas deveriam restringir.',
    severity: 'medium', category: 'compliance-audit', cloud: 'azure-rbac',
    roleA: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    roleB: { id: 'resource-policy-contributor', name: 'Resource Policy Contributor', cloud: 'azure-rbac' },
    rationale: 'Resource Policy Contributor gerencia atribuições de Azure Policy — o mecanismo usado para impor governança e compliance sobre recursos (ex.: bloquear criação de recursos fora de compliance). Se a mesma identidade também é Owner, ela pode criar uma isenção (policy exemption) para si mesma antes de provisionar um recurso que a política bloquearia.',
    risk: 'Criação de uma exceção/isenção de Azure Policy especificamente para permitir o provisionamento de um recurso fora do padrão de compliance da organização, sem aprovação de um segundo revisor de governança.',
    mitigation: [
      'Segregar administração de Azure Policy (Resource Policy Contributor) da administração operacional de recursos (Owner).',
      'Exigir aprovação de um time de governança/GRC para qualquer policy exemption antes de sua criação.',
      'Auditar exemptions de Azure Policy criadas por identidades com Owner no mesmo escopo.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/governance/policy/overview'],
    frameworks: ['SOX', 'ISO27001'],
  },

  // ── Entra ID — identity-management ──────────────────────────────────────
  {
    id: 'exchange-admin-global-reader',
    name: 'Exchange Administrator + Global Reader',
    description: 'Acesso administrativo a e-mails corporativos combinado com leitura irrestrita de todo o restante do tenant.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'exchange-administrator', name: 'Exchange Administrator', cloud: 'entra-id' },
    roleB: { id: 'global-reader', name: 'Global Reader', cloud: 'entra-id' },
    rationale: 'Exchange Administrator já concentra um vetor de acesso sensível (correspondência corporativa). Somar Global Reader (leitura de tudo no tenant: configurações de segurança, usuários, aplicações) permite que a mesma identidade combine acesso de conteúdo com visibilidade total de contexto — útil para planejar acessos indevidos direcionados com base no que é lido via Global Reader.',
    risk: 'Uso do Global Reader para identificar contas/executivos de interesse e do Exchange Administrator para acessar diretamente as caixas de e-mail correspondentes.',
    mitigation: [
      'Segregar Exchange Administrator (equipe de mensageria) de Global Reader (normalmente atribuído a auditoria/observabilidade).',
      'Habilitar Customer Lockbox e auditoria detalhada de acesso a mailbox para contas executivas.',
      'Revisar trimestralmente quem acumula acesso de conteúdo (Exchange) com visibilidade ampla (Global Reader).',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'sharepoint-admin-global-reader',
    name: 'SharePoint Administrator + Global Reader',
    description: 'Acesso administrativo a todos os documentos do tenant combinado com leitura irrestrita do restante da configuração.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'sharepoint-administrator', name: 'SharePoint Administrator', cloud: 'entra-id' },
    roleB: { id: 'global-reader', name: 'Global Reader', cloud: 'entra-id' },
    rationale: 'SharePoint Administrator concede acesso administrativo a sites e OneDrive de qualquer usuário. Combinado com Global Reader, a mesma identidade pode usar a visibilidade ampla para identificar onde estão os documentos mais sensíveis (ex.: via grupos/aplicações de alto valor) e então acessá-los diretamente via SharePoint Administrator.',
    risk: 'Acesso direcionado a documentos confidenciais (contratos, dados financeiros) identificados previamente através da visibilidade de Global Reader sobre a estrutura organizacional.',
    mitigation: [
      'Segregar administração de conteúdo (SharePoint Administrator) de funções de auditoria/observabilidade (Global Reader).',
      'Aplicar sensitivity labels e DLP para restringir acesso mesmo a contas administrativas em sites classificados como confidenciais.',
      'Habilitar Microsoft Purview Audit para todo acesso administrativo a sites/bibliotecas sensíveis.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'teams-admin-global-reader',
    name: 'Teams Administrator + Global Reader',
    description: 'Acesso administrativo a políticas e configurações do Microsoft Teams combinado com leitura irrestrita do restante do tenant.',
    severity: 'medium', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'teams-administrator', name: 'Teams Administrator', cloud: 'entra-id' },
    roleB: { id: 'global-reader', name: 'Global Reader', cloud: 'entra-id' },
    rationale: 'Teams Administrator gerencia políticas de reunião, gravação e mensagens do Microsoft Teams — uma plataforma que carrega comunicações internas sensíveis. Global Reader amplia o contexto disponível sobre a organização, permitindo direcionar melhor onde configurar políticas menos restritivas (ex.: permitir gravação/exportação em um grupo específico de interesse).',
    risk: 'Alteração de políticas de gravação/retenção do Teams para um grupo ou canal específico de interesse, usando a visibilidade do Global Reader para identificar o alvo.',
    mitigation: [
      'Segregar administração de Teams de funções de auditoria/observabilidade (Global Reader).',
      'Auditar alterações de política de gravação/retenção do Teams com trilha de aprovação.',
      'Revisar periodicamente políticas de Teams aplicadas a grupos/canais de alta sensibilidade.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD'],
  },
  {
    id: 'directory-writers-user-admin',
    name: 'Directory Writers + User Administrator',
    description: 'Escrever amplamente em objetos do diretório e, ao mesmo tempo, administrar diretamente contas de usuário — sobreposição redundante de escrita no diretório.',
    severity: 'low', category: 'access-provisioning', cloud: 'entra-id',
    roleA: { id: 'directory-writers', name: 'Directory Writers', cloud: 'entra-id' },
    roleB: { id: 'user-administrator', name: 'User Administrator', cloud: 'entra-id' },
    rationale: 'Directory Writers é uma role pouco conhecida que concede escrita a um conjunto amplo de objetos de diretório, sobrepondo-se parcialmente ao que User Administrator já cobre para contas de usuário. A combinação normalmente indica falta de rigor na atribuição de roles e dificulta auditoria de responsabilidade (qual role foi usada para uma alteração específica).',
    risk: 'Alterações em objetos de diretório realizadas via Directory Writers sem trilha de auditoria tão clara quanto a de User Administrator, dificultando investigações.',
    mitigation: [
      'Preferir User Administrator (mais específica e melhor documentada) a Directory Writers sempre que possível.',
      'Revisar atribuições de Directory Writers via Access Reviews, questionando a necessidade real.',
      'Documentar claramente o propósito de qualquer atribuição de Directory Writers.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001'],
  },
  {
    id: 'external-idp-admin-privileged-role-admin',
    name: 'External Identity Provider Administrator + Privileged Role Administrator',
    description: 'Configurar provedores de identidade externos (B2B/B2C) e, ao mesmo tempo, atribuir roles privilegiadas — combinação que pode permitir elevar uma identidade externa federada.',
    severity: 'high', category: 'access-provisioning', cloud: 'entra-id',
    roleA: { id: 'external-identity-provider-administrator', name: 'External Identity Provider Administrator', cloud: 'entra-id' },
    roleB: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    rationale: 'External Identity Provider Administrator configura a federação com provedores de identidade externos, incluindo quais IdPs são confiáveis para autenticação B2B. Combinado com Privileged Role Administrator, a mesma identidade pode configurar/confiar em um IdP externo controlado por ela e então atribuir uma role privilegiada à identidade federada resultante.',
    risk: 'Confiança em um provedor de identidade externo comprometido/controlado pelo atacante, seguida de atribuição de uma role Tier 0/1 a uma conta federada por esse IdP.',
    mitigation: [
      'Segregar configuração de federação externa (External Identity Provider Administrator) da atribuição de roles privilegiadas.',
      'Restringir quais domínios/IdPs externos podem ser configurados via política organizacional e aprovação formal.',
      'Auditar atribuições de role privilegiada a identidades provenientes de federação externa/B2B.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference', 'https://learn.microsoft.com/en-us/entra/external-id/identity-providers'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },

  // ── Entra ID — privileged-access ─────────────────────────────────────────
  {
    id: 'hybrid-identity-admin-privileged-role-admin',
    name: 'Hybrid Identity Administrator + Privileged Role Administrator',
    description: 'Controlar a sincronização/federação híbrida e, ao mesmo tempo, atribuir roles privilegiadas no Entra ID — combinação que pode permitir elevar uma identidade sincronizada do on-premises.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'hybrid-identity-administrator', name: 'Hybrid Identity Administrator', cloud: 'entra-id' },
    roleB: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    rationale: 'Hybrid Identity Administrator configura o Azure AD Connect/Cloud Sync, controlando quais atributos e contas do on-premises são sincronizados para o Entra ID. Combinado com Privileged Role Administrator, a mesma identidade pode manipular a sincronização para criar/alterar uma conta e então atribuir uma role privilegiada a ela — um caminho de escalonamento que cruza a fronteira on-premises/cloud.',
    risk: 'Manipulação da sincronização híbrida para introduzir uma conta controlada pelo atacante no Entra ID, seguida de atribuição direta de role privilegiada via Privileged Role Administrator.',
    mitigation: [
      'Segregar administração de sincronização híbrida da atribuição de roles privilegiadas no cloud.',
      'Monitorar o Azure AD Connect Health e alertar sobre alterações inesperadas em atributos sincronizados de contas privilegiadas.',
      'Aplicar Conditional Access exigindo verificação adicional para atribuições de role a contas recém-sincronizadas.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-hybrid-identity', 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'domain-name-admin-global-admin',
    name: 'Domain Name Administrator + Global Administrator',
    description: 'Controlar domínios verificados do tenant somado ao controle administrativo total — atribuição redundante que concentra ainda mais um vetor sensível.',
    severity: 'medium', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'domain-name-administrator', name: 'Domain Name Administrator', cloud: 'entra-id' },
    roleB: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    rationale: 'Global Administrator já herda a capacidade de gerenciar domínios verificados. Atribuir Domain Name Administrator explicitamente à mesma identidade não amplia poder real, mas reforça a prática de acumular roles redundantes na conta administrativa mais crítica do tenant, dificultando a governança de "least privilege" e a clareza de quem é responsável por qual função.',
    risk: 'Dificuldade de auditoria e de aplicar least privilege quando contas de Global Administrator acumulam roles adicionais redundantes, tornando revisões de acesso menos eficazes.',
    mitigation: [
      'Evitar atribuir roles redundantes a contas que já possuem Global Administrator.',
      'Revisar periodicamente roles adicionais atribuídas a contas de Global Administrator via Access Reviews.',
      'Documentar claramente a justificativa de qualquer role adicional sobre uma conta de Global Administrator.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001'],
  },
  {
    id: 'cloud-device-admin-intune-admin',
    name: 'Cloud Device Administrator + Intune Administrator',
    description: 'Administrar dispositivos no Entra ID e, ao mesmo tempo, gerenciar as políticas de MDM/Intune que controlam a conformidade desses dispositivos.',
    severity: 'medium', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'cloud-device-administrator', name: 'Cloud Device Administrator', cloud: 'entra-id' },
    roleB: { id: 'intune-administrator', name: 'Intune Administrator', cloud: 'entra-id' },
    rationale: 'Cloud Device Administrator gerencia dispositivos registrados no Entra ID (habilitar/desabilitar, excluir); Intune Administrator define as políticas de conformidade e configuração que esses dispositivos devem seguir. Combinadas, a mesma identidade pode enfraquecer a política de conformidade e, em seguida, garantir que um dispositivo específico (potencialmente comprometido) permaneça registrado e "em conformidade".',
    risk: 'Enfraquecimento de uma política de conformidade de dispositivo (ex.: permitir dispositivos jailbroken) combinado com a manutenção do registro de um dispositivo específico que não deveria ter acesso.',
    mitigation: [
      'Segregar administração de identidade de dispositivo (Cloud Device Administrator) da administração de políticas de MDM (Intune Administrator).',
      'Auditar alterações em políticas de conformidade correlacionadas com o registro de dispositivos específicos.',
      'Aplicar Conditional Access exigindo conformidade de dispositivo validada de forma independente da equipe de Intune.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'global-secure-access-admin-security-admin',
    name: 'Global Secure Access Administrator + Security Administrator',
    description: 'Configurar as políticas de acesso seguro (SSE) e, ao mesmo tempo, administrar a postura geral de segurança do tenant.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'global-secure-access-administrator', name: 'Global Secure Access Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    rationale: 'Global Secure Access Administrator controla perfis de acesso e políticas de rede segura (Entra Internet/Private Access) — um controle preventivo similar em importância ao Conditional Access. Combinado com Security Administrator, concentra tanto o novo perímetro de rede quanto a postura geral de segurança de identidade em uma única identidade, sem revisão cruzada.',
    risk: 'Criação de uma regra de bypass em um perfil de acesso seguro combinada com o enfraquecimento simultâneo de outra política de segurança que detectaria o desvio.',
    mitigation: [
      'Segregar administração de Global Secure Access da administração geral de segurança (Security Administrator).',
      'Auditar regras de exceção/bypass em perfis de acesso seguro com aprovação de um segundo administrador.',
      'Consolidar logs do Global Secure Access com os demais sinais de segurança em um SIEM monitorado por terceiros.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'cloud-device-admin-entra-joined-device-local-admin',
    name: 'Cloud Device Administrator + Microsoft Entra Joined Device Local Administrator',
    description: 'Administrar dispositivos centralmente e, ao mesmo tempo, ter direitos de administrador local nesses mesmos dispositivos — combina controle central e local sem segregação.',
    severity: 'low', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'cloud-device-administrator', name: 'Cloud Device Administrator', cloud: 'entra-id' },
    roleB: { id: 'microsoft-entra-joined-device-local-administrator', name: 'Microsoft Entra Joined Device Local Administrator', cloud: 'entra-id' },
    rationale: 'Microsoft Entra Joined Device Local Administrator concede direitos de administrador local em dispositivos Entra-joined (tipicamente para suporte de helpdesk). Combinado com Cloud Device Administrator (controle central do registro do dispositivo no diretório), a mesma identidade tem tanto o acesso local de baixo nível quanto o controle central do ciclo de vida do dispositivo, ampliando o que pode ser feito sem segregação entre suporte local e administração central.',
    risk: 'Uso do acesso de administrador local para instalar software não autorizado em um dispositivo, combinado com o controle central para ocultar ou re-registrar o dispositivo, dificultando detecção.',
    mitigation: [
      'Segregar direitos de administrador local (tipicamente helpdesk) da administração central de dispositivos (Cloud Device Administrator).',
      'Auditar instalações de software/alterações locais em dispositivos correlacionadas com ações de administração central.',
      'Aplicar Endpoint Detection and Response (EDR) para monitorar atividade de administrador local independentemente da equipe de device management.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001'],
  },

  // ── Entra ID — security-operations ──────────────────────────────────────
  {
    id: 'lifecycle-workflows-admin-user-admin',
    name: 'Lifecycle Workflows Administrator + User Administrator',
    description: 'Automatizar o ciclo de vida de identidades (onboarding/offboarding) e, ao mesmo tempo, administrar contas de usuário manualmente — permite contornar a automação quando conveniente.',
    severity: 'medium', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'lifecycle-workflows-administrator', name: 'Lifecycle Workflows Administrator', cloud: 'entra-id' },
    roleB: { id: 'user-administrator', name: 'User Administrator', cloud: 'entra-id' },
    rationale: 'Lifecycle Workflows automatiza tarefas de onboarding/offboarding (ex.: desabilitar contas automaticamente na saída de um funcionário) — um controle preventivo contra offboarding esquecido/atrasado. Se a mesma identidade que administra esses workflows também pode operar diretamente contas de usuário (User Administrator), ela pode excluir uma conta específica dos workflows automatizados e geri-la manualmente fora do processo padrão.',
    risk: 'Exclusão de uma conta específica do escopo de um workflow de offboarding automatizado, mantendo-a ativa manualmente além do período que a política organizacional permitiria.',
    mitigation: [
      'Segregar administração de Lifecycle Workflows da administração operacional direta de contas (User Administrator).',
      'Auditar exclusões de escopo em workflows de lifecycle com aprovação de um segundo administrador de RH/segurança.',
      'Comparar periodicamente contas ativas com o que os workflows automatizados deveriam ter processado.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/id-governance/what-are-lifecycle-workflows'],
    frameworks: ['ISO27001', 'SOX'],
  },
  {
    id: 'compliance-admin-intune-admin',
    name: 'Intune Administrator + Compliance Administrator',
    description: 'Configurar políticas de conformidade de dispositivo e, ao mesmo tempo, auditar a própria conformidade reportada.',
    severity: 'medium', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'intune-administrator', name: 'Intune Administrator', cloud: 'entra-id' },
    roleB: { id: 'compliance-administrator', name: 'Compliance Administrator', cloud: 'entra-id' },
    rationale: 'Intune Administrator define o que conta como um dispositivo "em conformidade". Compliance Administrator gerencia políticas de retenção/DLP no Microsoft Purview, que deveriam servir de checagem independente sobre a postura real de conformidade da organização. Concentrar as duas roles permite que a mesma pessoa ajuste critérios de conformidade de dispositivo de forma a sempre "passar" na auditoria que ela mesma administra.',
    risk: 'Relaxamento de critérios de conformidade de dispositivo (ex.: permitir versões de SO desatualizadas) sem que isso seja identificado, pois a mesma pessoa administra as políticas de auditoria de compliance.',
    mitigation: [
      'Atribuir Compliance Administrator a uma função de GRC independente da equipe de gestão de dispositivos (Intune Administrator).',
      'Auditar alterações em políticas de conformidade de dispositivo com aprovação de um segundo revisor.',
      'Validar periodicamente critérios de conformidade contra padrões externos (ex.: CIS Benchmarks) por um terceiro.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'auth-admin-cloud-device-admin',
    name: 'Authentication Administrator + Cloud Device Administrator',
    description: 'Controlar métodos de autenticação de usuários e, ao mesmo tempo, administrar os dispositivos registrados que originam essas autenticações.',
    severity: 'medium', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'authentication-administrator', name: 'Authentication Administrator', cloud: 'entra-id' },
    roleB: { id: 'cloud-device-administrator', name: 'Cloud Device Administrator', cloud: 'entra-id' },
    rationale: 'Authentication Administrator pode resetar/exigir novo registro de métodos de autenticação de usuários não-admin. Cloud Device Administrator controla o registro de dispositivos no diretório (que frequentemente satisfaz Conditional Access baseado em dispositivo). Combinadas, a mesma identidade pode forçar um usuário a reautenticar E controlar se o dispositivo usado nesse processo é considerado confiável, facilitando o registro de um dispositivo não autorizado como "confiável".',
    risk: 'Registro de um dispositivo controlado pelo atacante como gerenciado, combinado com a força de reautenticação de um usuário-alvo nesse dispositivo.',
    mitigation: [
      'Segregar administração de dispositivos (Cloud Device Administrator) da administração de métodos de autenticação (Authentication Administrator).',
      'Exigir aprovação de administrador para registro de novos dispositivos gerenciados em contas de usuários sensíveis.',
      'Alertar sobre registro de dispositivo seguido de reset de método de autenticação da mesma conta na mesma janela de tempo.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'security-operator-security-admin',
    name: 'Security Administrator + Security Operator',
    description: 'Configurar políticas de segurança e, ao mesmo tempo, ser quem responde/triagem os incidentes que essas políticas deveriam prevenir — sem segregação entre prevenção e resposta.',
    severity: 'medium', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-operator', name: 'Security Operator', cloud: 'entra-id' },
    rationale: 'Security Operator gerencia alertas e a resposta a incidentes de segurança (ex.: Microsoft Defender). Security Administrator configura as políticas preventivas que geram esses alertas. Ainda que seja comum times de segurança acumularem ambas as funções operacionalmente, concentrá-las na mesma identidade sem segregação remove a possibilidade de uma revisão independente de "a política configurada estava correta" quando um incidente ocorre.',
    risk: 'Um incidente causado por uma configuração de política falha (feita pela mesma pessoa) é triado/fechado sem investigação aprofundada sobre a causa raiz na própria configuração.',
    mitigation: [
      'Quando o porte da equipe permitir, segregar function de configuração de políticas (Security Administrator) da função de resposta a incidentes (Security Operator).',
      'Exigir post-mortem com um segundo revisor para incidentes relacionados a políticas de segurança configuradas recentemente.',
      'Auditar alterações de política de segurança que precedem incidentes fechados pela mesma identidade.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'compliance-admin-teams-admin',
    name: 'Teams Administrator + Compliance Administrator',
    description: 'Administrar políticas do Microsoft Teams e, ao mesmo tempo, auditar a conformidade (retenção/DLP) das comunicações nessa mesma plataforma.',
    severity: 'low', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'teams-administrator', name: 'Teams Administrator', cloud: 'entra-id' },
    roleB: { id: 'compliance-administrator', name: 'Compliance Administrator', cloud: 'entra-id' },
    rationale: 'Compliance Administrator gerencia políticas de retenção e DLP que também se aplicam a comunicações do Microsoft Teams. Se a mesma identidade também administra o Teams operacionalmente, ela pode ajustar configurações da plataforma (ex.: políticas de mensagens/gravação) de forma coordenada com as políticas de compliance que ela mesma audita, reduzindo a independência da checagem.',
    risk: 'Configuração de políticas de retenção de Teams mais permissivas do que o exigido por requisitos regulatórios, sem detecção porque a mesma pessoa audita e configura a plataforma.',
    mitigation: [
      'Atribuir Compliance Administrator a uma função de GRC independente da administração operacional do Teams.',
      'Revisar periodicamente políticas de retenção/DLP do Teams contra requisitos regulatórios com um auditor externo.',
      'Documentar e aprovar formalmente qualquer alteração de política de retenção específica do Teams.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },

  // ── Cross-Cloud (Entra ID + Azure RBAC) ─────────────────────────────────
  {
    id: 'security-admin-security-administrator-cross',
    name: 'Security Administrator (Entra ID) + Security Admin (Azure RBAC)',
    description: 'Administrar segurança de identidade e, separadamente, administrar segurança de recursos Azure — controle total sobre a postura de segurança em ambas as camadas.',
    severity: 'high', category: 'security-operations', cloud: 'microsoft-cross',
    roleA: { id: 'security-administrator', name: 'Security Administrator', cloud: 'entra-id' },
    roleB: { id: 'security-admin', name: 'Security Admin', cloud: 'azure-rbac' },
    rationale: 'Security Administrator (Entra ID) controla Conditional Access, Identity Protection e políticas de identidade; Security Admin (Azure RBAC) controla o Microsoft Defender for Cloud e a postura de segurança de recursos. Juntas, a mesma identidade decide e audita a segurança de ambas as camadas (identidade e recursos), sem qualquer checagem cruzada entre times.',
    risk: 'Enfraquecimento coordenado de controles de segurança em ambas as camadas (ex.: política de identidade permissiva + dismissal de recomendações de recursos) sem que nenhuma equipe detecte o padrão isoladamente.',
    mitigation: [
      'Segregar administração de segurança de identidade (Entra ID) da administração de segurança de recursos (Azure RBAC) entre equipes diferentes.',
      'Consolidar logs de ambas as camadas em um SIEM único para correlação cruzada.',
      'Revisar Access Reviews de segurança cruzados (identidade + recursos) trimestralmente.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'ga-rbac-admin-cross',
    name: 'Global Administrator (Entra ID) + Role Based Access Control Administrator (Azure RBAC)',
    description: 'Controle total do tenant de identidade combinado com controle total de atribuição de permissões RBAC no Azure.',
    severity: 'critical', category: 'privileged-access', cloud: 'microsoft-cross',
    roleA: { id: 'global-administrator', name: 'Global Administrator', cloud: 'entra-id' },
    roleB: { id: 'role-based-access-control-administrator', name: 'Role Based Access Control Administrator', cloud: 'azure-rbac' },
    rationale: 'Global Administrator já pode elevar-se a "Access management for Azure resources". Somado a uma atribuição direta e permanente de Role Based Access Control Administrator em uma subscription, a mesma identidade tem um caminho direto e persistente (sem precisar da elevação temporária) para controlar toda a autorização de recursos Azure, além do controle total de identidade.',
    risk: 'Controle persistente e não auditável (via elevação temporária) sobre a atribuição de acesso a recursos Azure, somado ao controle total de identidade — elimina a fronteira entre os dois planos de forma permanente.',
    mitigation: [
      'Nunca atribuir Role Based Access Control Administrator de forma permanente a contas de Global Administrator — usar PIM para Azure Resources com ativação just-in-time.',
      'Manter "Access management for Azure resources" desativado por padrão.',
      'Auditar atribuições diretas de roles Azure a contas de Global Administrator.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/elevate-access-global-admin',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'auth-policy-admin-network-contributor-cross',
    name: 'Authentication Policy Administrator (Entra ID) + Network Contributor (Azure RBAC)',
    description: 'Definir políticas de autenticação do tenant e, separadamente, controlar a infraestrutura de rede Azure que pode originar tráfego de autenticação confiável.',
    severity: 'medium', category: 'privileged-access', cloud: 'microsoft-cross',
    roleA: { id: 'authentication-policy-administrator', name: 'Authentication Policy Administrator', cloud: 'entra-id' },
    roleB: { id: 'network-contributor', name: 'Network Contributor', cloud: 'azure-rbac' },
    rationale: 'Network Contributor pode provisionar/alterar gateways, NAT e endereços IP públicos usados por infraestrutura Azure. Quando políticas de autenticação ou Conditional Access dependem de faixas de IP/rede como sinal de confiança, uma identidade que controla tanto a política de autenticação quanto a infraestrutura de rede pode criar um caminho de rede que "parece" confiável para a política que ela mesma administra.',
    risk: 'Provisionamento de um recurso de rede com IP público específico combinado com ajuste da política de autenticação para tratar esse intervalo como confiável, criando um bypass indireto de controles de MFA/localização.',
    mitigation: [
      'Segregar administração de políticas de autenticação (Entra ID) da administração de infraestrutura de rede (Azure RBAC).',
      'Revisar periodicamente faixas de IP/localizações confiáveis usadas em políticas de autenticação contra a infraestrutura de rede real.',
      'Auditar criação de recursos de rede com IP público correlacionada com alterações de política de autenticação.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'ca-admin-network-contributor-cross',
    name: 'Conditional Access Administrator (Entra ID) + Network Contributor (Azure RBAC)',
    description: 'Criar políticas de acesso condicional baseadas em localização/rede e, separadamente, controlar a infraestrutura de rede Azure que define essas localizações.',
    severity: 'medium', category: 'privileged-access', cloud: 'microsoft-cross',
    roleA: { id: 'conditional-access-administrator', name: 'Conditional Access Administrator', cloud: 'entra-id' },
    roleB: { id: 'network-contributor', name: 'Network Contributor', cloud: 'azure-rbac' },
    rationale: 'Conditional Access Administrator gerencia "named locations" e políticas baseadas em rede confiável. Network Contributor controla a infraestrutura Azure (VPN Gateways, ExpressRoute, IPs públicos) que frequentemente define os limites reais dessas localizações nomeadas. Combinadas, a mesma identidade pode tanto definir o que é "confiável" quanto controlar a infraestrutura que origina esse tráfego.',
    risk: 'Provisionamento de um gateway/rede específico e cadastro simultâneo dessa rede como "trusted location" na política de Conditional Access, criando um caminho de bypass documentado apenas por quem o criou.',
    mitigation: [
      'Segregar administração de Conditional Access (Entra ID) da administração de infraestrutura de rede (Azure RBAC).',
      'Auditar alterações em named locations correlacionadas com provisionamento de infraestrutura de rede.',
      'Revisar named locations trimestralmente contra o inventário real de infraestrutura de rede da organização.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/conditional-access/location-condition',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'user-admin-vm-contributor-cross',
    name: 'User Administrator (Entra ID) + Virtual Machine Contributor (Azure RBAC)',
    description: 'Criar/modificar contas de usuário no Entra ID e, separadamente, controlar máquinas virtuais no Azure — combinação que facilita movimentação lateral entre identidade e workload.',
    severity: 'medium', category: 'privileged-access', cloud: 'microsoft-cross',
    roleA: { id: 'user-administrator', name: 'User Administrator', cloud: 'entra-id' },
    roleB: { id: 'virtual-machine-contributor', name: 'Virtual Machine Contributor', cloud: 'azure-rbac' },
    rationale: 'Muitas VMs Azure usam Microsoft Entra ID para login (Azure AD Login for VMs) ou têm identidades gerenciadas associadas a contas de serviço. Uma identidade que pode tanto criar/alterar contas de usuário quanto controlar VMs pode criar uma conta específica e imediatamente provisionar acesso a ela em uma VM de interesse, sem envolvimento de uma segunda pessoa em nenhuma das duas etapas.',
    risk: 'Criação de uma conta de usuário e concessão de acesso de login a uma VM sensível na mesma sessão, sem revisão por um segundo administrador em nenhuma das duas ações.',
    mitigation: [
      'Segregar administração de identidade (User Administrator) da administração de compute (Virtual Machine Contributor).',
      'Auditar criação de conta de usuário correlacionada com concessão de acesso a VM na mesma janela de tempo.',
      'Aplicar Just-In-Time VM Access (Defender for Cloud) para reduzir acesso permanente a VMs sensíveis.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'app-admin-contributor-cross',
    name: 'Application Administrator (Entra ID) + Contributor (Azure RBAC)',
    description: 'Registrar/gerenciar aplicações no Entra ID e, separadamente, criar/modificar toda a infraestrutura Azure que essas aplicações consomem.',
    severity: 'medium', category: 'application-management', cloud: 'microsoft-cross',
    roleA: { id: 'application-administrator', name: 'Application Administrator', cloud: 'entra-id' },
    roleB: { id: 'contributor', name: 'Contributor', cloud: 'azure-rbac' },
    rationale: 'Application Administrator controla o registro e as credenciais de aplicações (incluindo consentimento de permissões). Contributor controla a infraestrutura Azure que muitas dessas aplicações usam para funcionar. Combinadas, a mesma identidade pode registrar uma aplicação com permissões amplas E provisionar a infraestrutura que a hospeda, sem segregação entre governança de identidade de aplicação e infraestrutura.',
    risk: 'Registro de uma aplicação com permissões de alto impacto e provisionamento simultâneo de infraestrutura Azure dedicada a ela, sem revisão de um segundo time em nenhuma das duas etapas.',
    mitigation: [
      'Segregar governança de aplicações (Application Administrator) de provisionamento de infraestrutura (Contributor).',
      'Exigir admin consent workflow com aprovador independente para permissões de alto impacto.',
      'Auditar registros de aplicação correlacionados com provisionamento de infraestrutura na mesma janela de tempo.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'identity-governance-admin-uaa-cross',
    name: 'Identity Governance Administrator (Entra ID) + User Access Administrator (Azure RBAC)',
    description: 'Governar políticas de acesso/entitlement no Entra ID e, separadamente, atribuir diretamente permissões RBAC no Azure — contorna o fluxo de aprovação formal.',
    severity: 'medium', category: 'access-provisioning', cloud: 'microsoft-cross',
    roleA: { id: 'identity-governance-administrator', name: 'Identity Governance Administrator', cloud: 'entra-id' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Identity Governance Administrator define access packages e políticas de aprovação para solicitação de acesso a recursos, incluindo recursos Azure. Se a mesma identidade também é User Access Administrator, ela pode simplesmente atribuir a role RBAC diretamente, contornando por completo o fluxo de solicitação/aprovação formal que ela mesma configurou no Entitlement Management.',
    risk: 'Concessão de acesso a um recurso Azure por atribuição RBAC direta, sem passar pelo fluxo de access package/aprovação que geraria trilha de auditoria formal.',
    mitigation: [
      'Segregar quem desenha políticas de acesso/entitlement (Identity Governance Administrator) de quem pode atribuir RBAC diretamente (User Access Administrator).',
      'Auditar atribuições diretas de RBAC a recursos que também são gerenciados via access packages.',
      'Revisar Access Reviews cruzados entre atribuições formais (Entitlement Management) e diretas (RBAC).',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-overview',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'compliance-admin-app-compliance-cross',
    name: 'Compliance Administrator (Entra ID) + App Compliance Automation Administrator (Azure RBAC)',
    description: 'Gerenciar políticas de conformidade/retenção do tenant e, separadamente, administrar a ferramenta que auto-avalia a conformidade de aplicações.',
    severity: 'medium', category: 'compliance-audit', cloud: 'microsoft-cross',
    roleA: { id: 'compliance-administrator', name: 'Compliance Administrator', cloud: 'entra-id' },
    roleB: { id: 'app-compliance-automation-administrator', name: 'App Compliance Automation Administrator', cloud: 'azure-rbac' },
    rationale: 'Compliance Administrator já deveria funcionar como a função responsável por verificar de forma independente a conformidade regulatória da organização. Se a mesma identidade também controla a ferramenta de auto-avaliação de compliance de aplicações, ela pode ajustar ambos os lados (política de retenção/DLP e escopo de avaliação automática) para que se validem mutuamente sem checagem externa real.',
    risk: 'Relatórios de conformidade favoráveis gerados por uma ferramenta cujo escopo foi configurado pela mesma pessoa responsável por definir os requisitos de conformidade que ela avalia.',
    mitigation: [
      'Segregar a administração da App Compliance Automation Tool da administração geral de compliance (Compliance Administrator).',
      'Validar periodicamente resultados de conformidade reportados contra uma auditoria externa independente.',
      'Auditar alterações de escopo da ferramenta de automação correlacionadas com alterações de política de compliance.',
    ],
    references: ['https://learn.microsoft.com/en-us/microsoft-365-app-certification/docs/appcomplianceautomationtool'],
    frameworks: ['SOX', 'ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'hybrid-identity-admin-owner-cross',
    name: 'Hybrid Identity Administrator (Entra ID) + Owner (Azure RBAC)',
    description: 'Controlar a fronteira de confiança híbrida (on-premises/cloud) e, separadamente, ter controle total dos recursos Azure — combina manipulação de trust com controle direto de infraestrutura.',
    severity: 'high', category: 'identity-management', cloud: 'microsoft-cross',
    roleA: { id: 'hybrid-identity-administrator', name: 'Hybrid Identity Administrator', cloud: 'entra-id' },
    roleB: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    rationale: 'Hybrid Identity Administrator controla a configuração de Azure AD Connect/federação, que estabelece a fronteira de confiança entre o Active Directory on-premises e o Entra ID. Combinado com Owner em uma subscription Azure, a mesma identidade pode manipular essa fronteira de confiança E controlar diretamente todos os recursos que dependem dela, sem qualquer camada intermediária de revisão.',
    risk: 'Manipulação da configuração de federação híbrida para introduzir uma identidade não autorizada, combinada com o uso de Owner para provisionar/acessar recursos Azure diretamente com essa identidade.',
    mitigation: [
      'Segregar administração de identidade híbrida (Entra ID) do controle direto de recursos Azure (Owner).',
      'Monitorar Azure AD Connect Health e alertar sobre alterações de configuração de federação.',
      'Usar PIM para Azure Resources com aprovação de terceiros para ativação de Owner por identidades com Hybrid Identity Administrator.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-hybrid-identity',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'app-admin-key-vault-admin-cross',
    name: 'Application Administrator (Entra ID) + Key Vault Administrator (Azure RBAC)',
    description: 'Registrar/gerenciar aplicações e suas credenciais no Entra ID e, separadamente, controlar os Key Vaults onde muitas dessas credenciais/segredos são armazenados.',
    severity: 'medium', category: 'data-access', cloud: 'microsoft-cross',
    roleA: { id: 'application-administrator', name: 'Application Administrator', cloud: 'entra-id' },
    roleB: { id: 'key-vault-administrator', name: 'Key Vault Administrator', cloud: 'azure-rbac' },
    rationale: 'Application Administrator pode registrar aplicações e gerar credenciais (client secrets/certificados). Muitas organizações armazenam esses segredos em Key Vaults para consumo por outras aplicações. Uma identidade com ambas as roles pode registrar um app malicioso E acessar diretamente os Key Vaults onde segredos de aplicações legítimas estão armazenados, sem segregação entre gestão de identidade de aplicação e gestão de segredos.',
    risk: 'Registro de uma aplicação maliciosa combinado com acesso direto a segredos de aplicações legítimas armazenados em Key Vault, permitindo personificação ou movimento lateral entre aplicações.',
    mitigation: [
      'Segregar governança de aplicações (Application Administrator) da administração de Key Vaults (Key Vault Administrator).',
      'Escopar o acesso de cada aplicação a Key Vaults específicos via managed identities, nunca via credenciais compartilhadas.',
      'Auditar registros de aplicação correlacionados com acesso a Key Vault na mesma janela de tempo.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide',
    ],
    frameworks: ['ISO27001', 'PCI-DSS'],
  },
  {
    id: 'log-analytics-contributor-monitoring-contributor',
    name: 'Log Analytics Contributor + Monitoring Contributor',
    description: 'Modificar workspaces de log e, ao mesmo tempo, modificar a configuração geral de monitoramento — pouca segregação entre observabilidade e resposta a incidentes.',
    severity: 'low', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'log-analytics-contributor', name: 'Log Analytics Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'monitoring-contributor', name: 'Monitoring Contributor', cloud: 'azure-rbac' },
    rationale: 'Log Analytics Contributor administra workspaces de log (retenção, coleta, queries salvas); Monitoring Contributor administra alertas e action groups que consomem esses logs. Embora ambas sejam roles operacionais de baixo risco individualmente, juntas concentram todo o pipeline de observabilidade — da coleta ao alerta — em uma única identidade, sem segregação entre quem retém os dados e quem decide o que vira alerta.',
    risk: 'Ajuste silencioso de uma regra de alerta (ex.: aumentar o threshold) combinado com redução da retenção de logs no mesmo workspace, reduzindo a capacidade de detectar e investigar um evento retroativamente.',
    mitigation: [
      'Revisar periodicamente alterações em regras de alerta e políticas de retenção do mesmo workspace.',
      'Exportar cópias de logs críticos para um destino imutável (WORM) fora do controle operacional do dia a dia.',
      'Documentar e aprovar formalmente qualquer alteração de threshold em alertas de segurança/disponibilidade críticos.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001'],
  },
  {
    id: 'storage-blob-data-reader-reader',
    name: 'Reader + Storage Blob Data Reader',
    description: 'Acesso somente-leitura a metadados de recursos combinado com leitura direta dos dados armazenados em blobs — sobreposição de escopos de leitura que vale revisar por princípio de menor privilégio.',
    severity: 'low', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'reader', name: 'Reader', cloud: 'azure-rbac' },
    roleB: { id: 'storage-blob-data-reader', name: 'Storage Blob Data Reader', cloud: 'azure-rbac' },
    rationale: 'Reader concede visibilidade de metadados de todos os recursos de um escopo; Storage Blob Data Reader concede leitura do conteúdo real dos dados. Nenhuma das duas permite escrita, então o risco técnico direto é baixo — mas a combinação amplia o que uma única identidade "somente leitura" pode efetivamente acessar (dados, não só metadados), o que é relevante para revisões de conformidade que tratam qualquer leitura de dados sensíveis como um escopo a ser justificado individualmente.',
    risk: 'Leitura de dados sensíveis armazenados em blobs por uma identidade cujo propósito declarado era apenas visibilidade de inventário/metadados de recursos (Reader), sem justificativa registrada para o acesso a dados.',
    mitigation: [
      'Atribuir Storage Blob Data Reader apenas quando houver necessidade explícita de ler conteúdo de dados, nunca por padrão junto com Reader.',
      'Revisar periodicamente quais identidades com Reader também acumulam roles de acesso a dados (Storage, SQL, Key Vault etc.).',
      'Registrar a justificativa de negócio para cada atribuição de role de acesso a dados, mesmo as de somente leitura.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'LGPD'],
  },
  {
    id: 'key-vault-admin-data-access-admin',
    name: 'Key Vault Administrator + Key Vault Data Access Administrator',
    description: 'Controle total do plano de gerenciamento do Key Vault (políticas de acesso, RBAC do cofre) combinado com a atribuição direta de permissões de acesso a dados (segredos, chaves, certificados) — uma única identidade pode conceder a si mesma acesso aos dados e depois efetivamente lê-los.',
    severity: 'critical', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'key-vault-administrator', name: 'Key Vault Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'key-vault-data-access-administrator', name: 'Key Vault Data Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Key Vault Administrator controla a configuração e as políticas de acesso do cofre; Key Vault Data Access Administrator concede/revoga RBAC de dados (segredos, chaves, certificados) sem necessariamente poder ler o conteúdo. Combinadas na mesma identidade, essa distinção de segregação desaparece — a mesma pessoa configura o cofre, concede a si mesma acesso aos dados via RBAC e passa a poder ler segredos/chaves diretamente.',
    risk: 'Uma identidade comprometida ou mal-intencionada com ambas as roles pode se auto-conceder Key Vault Secrets User/Officer e extrair credenciais, chaves de criptografia ou certificados armazenados no cofre, sem qualquer segunda aprovação.',
    mitigation: [
      'Nunca atribuir as duas roles à mesma identidade — separar quem administra o cofre de quem concede acesso a dados.',
      'Exigir aprovação via PIM para qualquer atribuição de Key Vault Data Access Administrator.',
      'Auditar logs do Key Vault para atribuições de acesso a dados feitas fora de um fluxo de change management aprovado.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide'],
    frameworks: ['ISO27001', 'NIST-CSF', 'PCI-DSS'],
  },
  {
    id: 'reservations-admin-owner',
    name: 'Reservations Administrator + Owner',
    description: 'Controle total de assinaturas/recursos (Owner) combinado com administração de reservas de capacidade e savings plans em nível de tenant — permite manipular compromissos financeiros de longo prazo sem segregação entre operação técnica e gestão de custos.',
    severity: 'medium', category: 'financial-control', cloud: 'azure-rbac',
    roleA: { id: 'reservations-administrator', name: 'Reservations Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'owner', name: 'Owner', cloud: 'azure-rbac' },
    rationale: 'Reservations Administrator gerencia reservas de capacidade e compromissos de gasto (Reserved Instances, Savings Plans) em nível de diretório, normalmente reservado a times de FinOps; Owner concede controle técnico total sobre assinaturas e recursos. A combinação permite que uma mesma identidade tanto provisione recursos quanto manipule os compromissos financeiros associados a eles, sem revisão independente.',
    risk: 'Compra, troca ou cancelamento indevido de reservas de capacidade de alto valor financeiro por uma identidade que também controla tecnicamente os recursos que consomem essas reservas, dificultando a detecção de desalinhamento entre uso técnico e gasto comprometido.',
    mitigation: [
      'Restringir Reservations Administrator a um grupo FinOps dedicado, separado de quem administra recursos técnicos.',
      'Exigir aprovação de um segundo aprovador para compra/troca de reservas acima de um limite de valor definido.',
      'Revisar periodicamente o uso efetivo das reservas versus o consumo de recursos das assinaturas sob Owner.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/manage-reserved-vm-instance'],
    frameworks: ['SOX', 'ISO27001'],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 5 — Expansão adicional Azure RBAC (pares reais, verificados contra
  // src/data/azureRbac.ts antes de escrever cada regra).
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'managed-identity-contributor-user-access-admin',
    name: 'Managed Identity Contributor + User Access Administrator',
    description: 'Criar/gerenciar identidades gerenciadas (User Assigned Identity) e, ao mesmo tempo, conceder atribuições de RBAC — permite criar uma identidade e imediatamente atribuir a ela acesso privilegiado a qualquer recurso.',
    severity: 'high', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'managed-identity-contributor', name: 'Managed Identity Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Managed Identity Contributor cria e gerencia identidades gerenciadas atribuídas pelo usuário; User Access Administrator concede/revoga atribuições de RBAC. Combinadas, uma identidade pode criar uma nova managed identity e imediatamente conceder a ela Owner ou Contributor sobre qualquer recurso, criando um caminho de persistência difícil de rastrear até um usuário humano específico.',
    risk: 'Criação de uma managed identity "backdoor" com acesso privilegiado atribuído silenciosamente, usada posteriormente para acessar recursos sem que a ação apareça associada a uma conta de usuário nomeada.',
    mitigation: [
      'Nunca atribuir as duas roles à mesma identidade — separar criação de identidades gerenciadas da concessão de RBAC.',
      'Auditar periodicamente todas as managed identities e as atribuições de role concedidas a elas.',
      'Exigir justificativa registrada para cada nova managed identity criada com acesso privilegiado.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'website-contributor-managed-identity-contributor',
    name: 'Website Contributor + Managed Identity Contributor',
    description: 'Implantar/modificar código de aplicações web (App Service) e, ao mesmo tempo, criar/gerenciar identidades gerenciadas — permite anexar uma identidade privilegiada a uma aplicação web para persistência.',
    severity: 'high', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'website-contributor', name: 'Website Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'managed-identity-contributor', name: 'Managed Identity Contributor', cloud: 'azure-rbac' },
    rationale: 'Website Contributor permite implantar código e configurar aplicações App Service; Managed Identity Contributor permite criar identidades gerenciadas. Uma identidade com ambas pode criar uma managed identity com acesso privilegiado a outros recursos e anexá-la a uma aplicação web comprometida, dando ao código da aplicação — e a quem o controla — acesso indireto e persistente a esses recursos.',
    risk: 'Uso de uma aplicação web como ponto de pivô para acessar recursos protegidos via uma managed identity anexada, contornando controles de acesso baseados em usuário e dificultando a atribuição da ação a um operador humano.',
    mitigation: [
      'Restringir quem pode anexar managed identities a aplicações web a um processo de change management revisado.',
      'Auditar quais identidades gerenciadas estão anexadas a cada App Service e o escopo de acesso de cada uma.',
      'Aplicar least privilege nas managed identities anexadas — nunca Owner/Contributor amplo por padrão.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'site-recovery-contributor-backup-contributor',
    name: 'Site Recovery Contributor + Backup Contributor',
    description: 'Controlar simultaneamente a replicação de disaster recovery (Site Recovery) e as políticas de backup dos mesmos recursos — uma única identidade pode sabotar os dois mecanismos de continuidade de negócio ao mesmo tempo.',
    severity: 'medium', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'site-recovery-contributor', name: 'Site Recovery Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'backup-contributor', name: 'Backup Contributor', cloud: 'azure-rbac' },
    rationale: 'Site Recovery Contributor gerencia a replicação e o failover de disaster recovery; Backup Contributor gerencia políticas e execuções de backup. São os dois principais mecanismos independentes de resiliência de uma carga de trabalho — combiná-los na mesma identidade remove a segregação que garante que, se um mecanismo for comprometido ou desabilitado, o outro ainda protege os dados.',
    risk: 'Desabilitação coordenada de backups e replicação de disaster recovery por uma identidade comprometida, eliminando toda via de recuperação de dados antes de um ataque destrutivo (ex.: ransomware).',
    mitigation: [
      'Segregar quem administra backup de quem administra disaster recovery, mesmo que ambos reportem à mesma equipe de infraestrutura.',
      'Habilitar soft-delete e imutabilidade nos vaults de backup para resistir a exclusões maliciosas.',
      'Alertar sobre qualquer desabilitação de política de backup ou de replicação de Site Recovery.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview'],
    frameworks: ['ISO27001', 'NIST-CSF'],
  },
  {
    id: 'cdn-profile-contributor-traffic-manager-contributor',
    name: 'CDN Profile Contributor + Traffic Manager Contributor',
    description: 'Controlar simultaneamente perfis de CDN/Front Door e perfis de Traffic Manager — permite redirecionar ou interceptar tráfego de borda e de DNS-based routing de uma aplicação.',
    severity: 'medium', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'cdn-profile-contributor', name: 'CDN Profile Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'traffic-manager-contributor', name: 'Traffic Manager Contributor', cloud: 'azure-rbac' },
    rationale: 'CDN Profile Contributor controla endpoints de CDN/Azure Front Door; Traffic Manager Contributor controla perfis de roteamento de tráfego baseado em DNS. Juntas, essas roles cobrem as duas principais camadas de roteamento de borda de uma aplicação — uma identidade com ambas pode redirecionar tráfego de produção para um destino malicioso sem tocar nos recursos de aplicação em si.',
    risk: 'Redirecionamento de tráfego de usuários finais para um endpoint controlado por um atacante (phishing, captura de credenciais ou interceptação de dados) sem alterar a aplicação original, dificultando a detecção.',
    mitigation: [
      'Segregar controle de CDN/Front Door do controle de Traffic Manager quando possível.',
      'Alertar sobre qualquer mudança de endpoint ou de regra de roteamento fora de uma janela de deploy aprovada.',
      'Revisar configurações de CDN e Traffic Manager como parte de auditorias de mudança de infraestrutura.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001'],
  },
  {
    id: 'dns-zone-contributor-private-dns-zone-contributor',
    name: 'DNS Zone Contributor + Private DNS Zone Contributor',
    description: 'Controlar simultaneamente zonas DNS públicas e privadas do Azure — sobreposição de escopo de controle de resolução de nomes que vale revisar por princípio de menor privilégio.',
    severity: 'low', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'dns-zone-contributor', name: 'DNS Zone Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'private-dns-zone-contributor', name: 'Private DNS Zone Contributor', cloud: 'azure-rbac' },
    rationale: 'DNS Zone Contributor gerencia zonas e registros DNS públicos; Private DNS Zone Contributor gerencia zonas DNS privadas usadas por redes virtuais internas. Nenhuma das duas concede acesso a outros recursos, mas a combinação permite manipular a resolução de nomes tanto externa quanto interna a partir de uma única identidade, ampliando o raio de alcance de um eventual sequestro de DNS.',
    risk: 'Redirecionamento de tráfego interno (via DNS privado) e externo (via DNS público) simultaneamente, facilitando ataques de man-in-the-middle ou exfiltração de tráfego sem detecção imediata.',
    mitigation: [
      'Atribuir DNS público e DNS privado a times distintos quando a organização tiver escala suficiente para isso.',
      'Registrar alertas para qualquer alteração de registro DNS crítico (MX, apex, registros usados para SSO/federação).',
      'Revisar periodicamente todas as zonas DNS privadas vinculadas a redes virtuais de produção.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/azure/dns/private-dns-overview'],
    frameworks: ['ISO27001'],
  },
  {
    id: 'search-service-contributor-storage-blob-data-reader',
    name: 'Search Service Contributor + Storage Blob Data Reader',
    description: 'Gerenciar a configuração de um serviço Azure AI Search (incluindo fontes de dados de indexação) e, ao mesmo tempo, ler diretamente o conteúdo de blobs armazenados — amplia a superfície de acesso a dados sensíveis.',
    severity: 'medium', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'search-service-contributor', name: 'Search Service Contributor', cloud: 'azure-rbac' },
    roleB: { id: 'storage-blob-data-reader', name: 'Storage Blob Data Reader', cloud: 'azure-rbac' },
    rationale: 'Search Service Contributor administra a configuração do serviço de busca — incluindo indexadores e fontes de dados que frequentemente apontam para Storage Blob — enquanto Storage Blob Data Reader concede leitura direta do conteúdo dos blobs. Combinadas, uma identidade pode tanto reconfigurar o que é indexado/exposto via busca quanto ler diretamente os dados brutos, dobrando as vias de acesso ao mesmo conjunto de dados sensíveis.',
    risk: 'Exfiltração de dados sensíveis armazenados em blobs através de duas vias independentes — leitura direta do storage e reconfiguração do índice de busca para expor campos adicionais — dificultando a detecção via monitoramento de uma via isolada.',
    mitigation: [
      'Segregar quem administra a configuração do serviço de busca de quem tem leitura direta aos dados de origem.',
      'Revisar periodicamente quais fontes de dados estão conectadas ao serviço de busca e o escopo de campos indexados.',
      'Auditar mudanças em indexadores e skillsets do Azure AI Search como parte de revisões de acesso a dados.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles', 'https://learn.microsoft.com/en-us/azure/search/search-security-overview'],
    frameworks: ['ISO27001', 'LGPD'],
  },
  // ═══════════════════════════════════════════════════════════════════════
  // Lote 2026-08-07 — cobertura das roles privilegiadas que estavam fora do
  // catálogo. Origem: auditoria de cobertura contra roles.ts (144 Entra) e
  // azureRbac.ts (504 Azure), que encontrou 38 roles ControlPlane do Entra e
  // 8 AccessManagement do Azure sem nenhuma regra. Escopo mantido em
  // Entra ID + Azure RBAC (Microsoft) — nenhuma outra CSP entra aqui.
  // ═══════════════════════════════════════════════════════════════════════

  // ── Entra ID: credencial e ciclo de vida da conta ──────────────────────
  {
    id: 'helpdesk-admin-user-admin',
    name: 'Helpdesk Administrator + User Administrator',
    description: 'Criar a conta e, sozinho, resetar a senha dela e derrubar todas as sessões ativas.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'helpdesk-administrator', name: 'Helpdesk Administrator', cloud: 'entra-id' },
    roleB: { id: 'user-administrator', name: 'User Administrator', cloud: 'entra-id' },
    rationale: 'User Administrator cria e gerencia contas de usuário e grupos. Helpdesk Administrator concentra as três operações de credencial que fecham um takeover: microsoft.directory/users/password/update, microsoft.directory/users/invalidateAllRefreshTokens (força novo sign-in em todos os dispositivos da vítima) e microsoft.directory/bitlockerKeys/key/read. A Microsoft ainda documenta que Helpdesk Administrator reseta senha de outros Helpdesk Administrators — o que torna o próprio grupo auto-sustentável. Com as duas roles, a mesma identidade abre a conta, define a credencial e expulsa qualquer sessão legítima, sem nenhuma segunda pessoa no caminho.',
    risk: 'Insider cria uma conta de aparência legítima, assume a credencial e invalida os tokens do titular real para mascarar a troca — o titular interpreta a re-autenticação como manutenção de rotina.',
    mitigation: [
      'Restringir Helpdesk Administrator por Administrative Unit, nunca no escopo do tenant inteiro.',
      'Alertar no SIEM quando a mesma identidade criar um usuário e resetar a senha dele dentro da mesma janela de 24h.',
      'Manter a criação de contas no fluxo de RH/onboarding e o reset de credencial no helpdesk, com equipes distintas.',
      'Auditar trimestralmente quem tem Helpdesk Administrator ativo — é uma role Tier 0 apesar do nome operacional.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'helpdesk-admin-auth-admin',
    name: 'Helpdesk Administrator + Authentication Administrator',
    description: 'Resetar a senha e resetar o MFA da mesma conta — os dois fatores caem com uma pessoa só.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'helpdesk-administrator', name: 'Helpdesk Administrator', cloud: 'entra-id' },
    roleB: { id: 'authentication-administrator', name: 'Authentication Administrator', cloud: 'entra-id' },
    rationale: 'MFA só protege enquanto quem troca a senha não é a mesma pessoa que troca o método de autenticação. Helpdesk Administrator define a senha e invalida os refresh tokens; Authentication Administrator remove e re-registra métodos de autenticação de usuários não-admin. Somadas, a barreira de segundo fator vira uma formalidade: a mesma identidade zera senha e MFA em sequência e entra como a vítima.',
    risk: 'Account takeover completo de qualquer usuário não-privilegiado sem passar por nenhum controle compensatório — e, se a vítima tiver acesso a dados regulados, o incidente vira notificação obrigatória.',
    mitigation: [
      'Separar reset de senha (helpdesk N1) de reset de método de autenticação (equipe de identidade), inclusive no processo de chamado.',
      'Exigir verificação de identidade fora de banda antes de qualquer reset de MFA, com registro no ticket.',
      'Alertar sobre reset de senha seguido de alteração de método de autenticação do mesmo usuário em menos de 1h.',
      'Aplicar Conditional Access exigindo re-registro de MFA a partir de rede confiável.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },

  // ── Entra ID: extensibilidade de autenticação ──────────────────────────
  {
    id: 'auth-ext-admin-app-admin',
    name: 'Authentication Extensibility Administrator + Application Administrator',
    description: 'Injetar claims no token que está sendo emitido e, ao mesmo tempo, controlar a aplicação que recebe esse token.',
    severity: 'critical', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'authentication-extensibility-administrator', name: 'Authentication Extensibility Administrator', cloud: 'entra-id' },
    roleB: { id: 'application-administrator', name: 'Application Administrator', cloud: 'entra-id' },
    rationale: 'Authentication Extensibility Administrator tem microsoft.directory/customAuthenticationExtensions/allProperties/allTasks — controle total das custom authentication extensions, que incluem o evento OnTokenIssuanceStart do custom claims provider: uma API externa chamada no momento em que o token é emitido, capaz de mapear claims vindas de fora para dentro do token. Application Administrator gerencia registros de aplicação, credenciais e a atribuição do claims provider às aplicações. Combinadas numa identidade só, ela escolhe o endpoint que fabrica as claims e escolhe quem confia nelas.',
    risk: 'Emissão de tokens com claims fabricadas (grupo, papel, atributo de autorização) para uma aplicação sob controle do mesmo operador — escalonamento de privilégio que não aparece como atribuição de role no diretório e escapa de revisões de acesso convencionais.',
    mitigation: [
      'Tratar Authentication Extensibility Administrator como Tier 0 e mantê-la fora de qualquer perfil que também administre aplicações.',
      'Exigir aprovação de mudança para criação/alteração de custom authentication extension, com revisão do endpoint REST de destino.',
      'Monitorar alterações em customAuthenticationExtensions no log de auditoria e correlacionar com alterações de aplicação da mesma identidade.',
      'Restringir os endpoints das extensões a domínios corporativos aprovados e exigir autenticação do próprio endpoint.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-overview',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'auth-ext-admin-ca-admin',
    name: 'Authentication Extensibility Administrator + Conditional Access Administrator',
    description: 'Customizar o fluxo de sign-in e escrever a política de acesso condicional que deveria avaliá-lo.',
    severity: 'high', category: 'security-operations', cloud: 'entra-id',
    roleA: { id: 'authentication-extensibility-administrator', name: 'Authentication Extensibility Administrator', cloud: 'entra-id' },
    roleB: { id: 'conditional-access-administrator', name: 'Conditional Access Administrator', cloud: 'entra-id' },
    rationale: 'As custom authentication extensions se inserem dentro do fluxo de autenticação; o Conditional Access é o controle que decide se aquele fluxo resulta em acesso. Quem escreve os dois lados define ao mesmo tempo o comportamento a ser avaliado e o critério de avaliação — a política deixa de ser um controle independente e vira parte do mesmo artefato.',
    risk: 'Uma extensão maliciosa ou mal configurada passa despercebida porque a mesma pessoa ajusta a política de Conditional Access para não bloquear o cenário que ela produz.',
    mitigation: [
      'Manter a autoria das políticas de Conditional Access numa equipe de segurança separada de quem constrói extensões de autenticação.',
      'Versionar e revisar políticas de Conditional Access como código, com aprovação de segundo revisor.',
      'Usar o modo somente-relatório antes de promover qualquer política tocada por quem também administra extensões.',
      'Alertar sobre alteração de custom authentication extension e de política de CA pela mesma identidade na mesma janela.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-overview',
      'https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'auth-ext-admin-auth-ext-password-admin',
    name: 'Authentication Extensibility Administrator + Authentication Extensibility Password Administrator',
    description: 'Criar a extensão que recebe o evento de submissão de senha e também controlar o disparo desse evento.',
    severity: 'high', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'authentication-extensibility-administrator', name: 'Authentication Extensibility Administrator', cloud: 'entra-id' },
    roleB: { id: 'authentication-extensibility-password-administrator', name: 'Authentication Extensibility Password Administrator', cloud: 'entra-id' },
    rationale: 'A Microsoft separou deliberadamente estas duas roles: Authentication Extensibility Administrator administra customAuthenticationExtensions em geral, e Authentication Extensibility Password Administrator administra especificamente onPasswordSubmitCustomAuthenticationExtension — a extensão que participa do momento em que a senha é submetida. A separação existe porque o evento de senha é o mais sensível de todos; juntar as duas numa identidade desfaz exatamente a barreira que a Microsoft desenhou.',
    risk: 'Uma extensão sob controle único no caminho da submissão de senha é um ponto de interceptação de credencial em texto claro no fluxo de sign-in, sem que nenhuma outra role precise ser tocada.',
    mitigation: [
      'Nunca atribuir as duas roles à mesma identidade — se o cenário parece exigir isso, o desenho da extensão precisa ser revisto.',
      'Exigir aprovação multi-party para atribuição de Authentication Extensibility Password Administrator.',
      'Revisar o código e o endpoint de destino de qualquer extensão ligada ao evento de submissão de senha.',
      'Alertar sobre qualquer criação ou alteração de onPasswordSubmitCustomAuthenticationExtension.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-overview',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'b2c-keyset-admin-b2c-policy-admin',
    name: 'B2C IEF Keyset Administrator + B2C IEF Policy Administrator',
    description: 'Controlar as chaves de assinatura do Identity Experience Framework e as políticas que as usam — os dois lados da emissão de token B2C.',
    severity: 'critical', category: 'identity-management', cloud: 'entra-id',
    roleA: { id: 'b2c-ief-keyset-administrator', name: 'B2C IEF Keyset Administrator', cloud: 'entra-id' },
    roleB: { id: 'b2c-ief-policy-administrator', name: 'B2C IEF Policy Administrator', cloud: 'entra-id' },
    rationale: 'B2C IEF Keyset Administrator tem microsoft.directory/b2cTrustFrameworkKeySet/allProperties/allTasks — os segredos de federação e as chaves de assinatura/criptografia do Identity Experience Framework. B2C IEF Policy Administrator tem microsoft.directory/b2cTrustFrameworkPolicy/allProperties/allTasks — as trust framework policies que definem a jornada do usuário e o conteúdo do token. Chave mais política é a cadeia inteira de emissão: uma identidade com as duas pode escrever uma jornada que emite o token que quiser e assiná-lo com uma chave que ela mesma introduziu.',
    risk: 'Forja de tokens aceitos por todas as aplicações relying party do tenant B2C — inclusive aplicações voltadas ao cliente final, com impacto direto de fraude e de dados pessoais.',
    mitigation: [
      'Separar a custódia das policy keys da autoria das custom policies, em equipes e processos distintos.',
      'Promover custom policies do B2C por pipeline versionado, com revisão obrigatória de segundo par.',
      'Inventariar as policy keys periodicamente e alertar sobre qualquer keyset criado fora do processo aprovado.',
      'Manter tenants B2C de desenvolvimento e produção separados, com atribuições independentes.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/azure/active-directory-b2c/custom-policy-overview',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'PCI-DSS', 'LGPD', 'GDPR'],
  },

  // ── Entra ID: identidades agênticas (Agent ID) ─────────────────────────
  {
    id: 'agent-id-admin-app-admin',
    name: 'Agent ID Administrator + Application Administrator',
    description: 'Criar a identidade do agente e, na mesma pessoa, conceder a ela as permissões de aplicação que quiser.',
    severity: 'critical', category: 'application-management', cloud: 'entra-id',
    roleA: { id: 'agent-id-administrator', name: 'Agent ID Administrator', cloud: 'entra-id' },
    roleB: { id: 'application-administrator', name: 'Application Administrator', cloud: 'entra-id' },
    rationale: 'Agent ID Administrator gerencia o ciclo de vida completo das identidades agênticas do tenant — blueprints, service principals de agente, agent identities e agentic users. Application Administrator gerencia registros de aplicação, credenciais e concessões de permissão. Uma identidade agêntica é um principal não-humano que age sozinho: quem a cria não deveria ser quem decide o que ela pode fazer, exatamente como já se separa criar conta de conceder acesso.',
    risk: 'Provisionamento de um agente com permissões amplas sobre o Microsoft Graph sem nenhuma aprovação independente — e o agente executa sem interação humana, então a janela entre a concessão e o uso indevido é mínima.',
    mitigation: [
      'Segregar o provisionamento de identidades de agente da concessão de permissões a elas.',
      'Exigir revisão de segurança para qualquer agent blueprint que solicite permissão de aplicação de alto privilégio.',
      'Incluir agent service principals e agentic users no escopo das Access Reviews, como qualquer identidade humana.',
      'Monitorar criação de agent identity seguida de concessão de permissão pela mesma identidade.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'agent-id-admin-privileged-role-admin',
    name: 'Agent ID Administrator + Privileged Role Administrator',
    description: 'Criar uma identidade de agente e atribuir a ela uma role privilegiada do diretório.',
    severity: 'critical', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'agent-id-administrator', name: 'Agent ID Administrator', cloud: 'entra-id' },
    roleB: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    rationale: 'Privileged Role Administrator atribui roles do diretório e controla o PIM. Agent ID Administrator cria principals agênticos. Juntas, produzem um caminho de persistência de ponta a ponta que não passa por nenhuma conta humana: cria-se um agente, atribui-se a ele uma role Tier 0, e o agente continua ativo mesmo depois de a conta do operador ser desativada.',
    risk: 'Backdoor não-humana com privilégio de diretório, invisível para revisões de acesso focadas em usuários e sobrevivente ao offboarding do operador que a criou.',
    mitigation: [
      'Nunca combinar as duas roles; se necessário, usar contas administrativas separadas com PIM em ambas.',
      'Exigir aprovação multi-party para atribuição de qualquer role de diretório a um principal de agente.',
      'Inventariar mensalmente principals não-humanos com role de diretório atribuída.',
      'Alertar sobre atribuição de role privilegiada cujo destinatário seja um agent service principal.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'agent-id-developer-agent-id-admin',
    name: 'Agent ID Developer + Agent ID Administrator',
    description: 'Desenhar o blueprint do agente e também aprovar e promover esse mesmo blueprint no tenant.',
    severity: 'medium', category: 'application-management', cloud: 'entra-id',
    roleA: { id: 'agent-id-developer', name: 'Agent ID Developer', cloud: 'entra-id' },
    roleB: { id: 'agent-id-administrator', name: 'Agent ID Administrator', cloud: 'entra-id' },
    rationale: 'Agent ID Developer cria agent identity blueprints e vira owner deles (microsoft.directory/agentIdentityBlueprints/createAsOwner); Agent ID Administrator administra todos os agentes do tenant, incluindo os blueprints de terceiros. É o padrão clássico de desenvolvedor que também aprova a própria entrega, transposto para identidades agênticas.',
    risk: 'Um blueprint com comportamento não revisado chega a produção porque autor e aprovador são a mesma pessoa — e o artefato promovido é uma identidade que age sozinha.',
    mitigation: [
      'Separar autoria de blueprint de sua promoção, como já se faz com deploy de aplicação.',
      'Registrar a aprovação de cada blueprint num sistema de mudança fora do próprio Entra.',
      'Revisar periodicamente os owners de agent identity blueprints.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'CIS'],
  },

  // ── Entra ID: sincronização híbrida ────────────────────────────────────
  {
    id: 'dirsync-accounts-hybrid-identity-admin',
    name: 'Directory Synchronization Accounts + Hybrid Identity Administrator',
    description: 'Uma role reservada ao serviço do Entra Connect nas mãos de quem configura o próprio Entra Connect.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'directory-synchronization-accounts', name: 'Directory Synchronization Accounts', cloud: 'entra-id' },
    roleB: { id: 'hybrid-identity-administrator', name: 'Hybrid Identity Administrator', cloud: 'entra-id' },
    rationale: 'A Microsoft documenta Directory Synchronization Accounts como uma role especial, atribuída pelo assistente do Entra Connect à conta do conector e não destinada a uso humano. Hybrid Identity Administrator configura password hash sync, pass-through authentication, seamless SSO e federação — ou seja, define o que o canal de sincronização faz. Se a mesma identidade detém a role do canal e a configuração do canal, não sobra ninguém independente para perceber que o canal foi reapontado ou que uma opção de autenticação foi trocada.',
    risk: 'A sincronização entre AD on-premises e Entra ID é uma das rotas de comprometimento mais exploradas do ecossistema Microsoft; concentrar canal e configuração numa identidade só remove o último ponto de verificação antes que uma alteração de PHS ou de federação passe a valer para o tenant inteiro.',
    mitigation: [
      'Auditar se algum principal humano detém Directory Synchronization Accounts — a expectativa é que só a conta de serviço do Entra Connect a tenha.',
      'Alertar sobre qualquer atribuição nova de Directory Synchronization Accounts ou de On Premises Directory Sync Account.',
      'Manter a operação do servidor de sincronização separada da administração de identidade híbrida no portal.',
      'Excluir as contas de sincronização de políticas que permitam sign-in interativo.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-accounts-permissions',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },

  // ── Entra ID: acesso delegado de parceiro (GDAP) ───────────────────────
  {
    id: 'partner-tier2-support-cdar-admin',
    name: 'Partner Tier2 Support + Customer Delegated Admin Relationship Administrator',
    description: 'Definir a relação de administração delegada e, ao mesmo tempo, exercer o acesso privilegiado que ela concede.',
    severity: 'high', category: 'access-provisioning', cloud: 'entra-id',
    roleA: { id: 'partner-tier2-support', name: 'Partner Tier2 Support', cloud: 'entra-id' },
    roleB: { id: 'customer-delegated-admin-relationship-administrator', name: 'Customer Delegated Admin Relationship Administrator', cloud: 'entra-id' },
    rationale: 'Customer Delegated Admin Relationship Administrator administra as relações GDAP — quem pode administrar o tenant do cliente e com quais roles. Partner Tier2 Support é uma role ControlPlane de 46 permissões que a própria Microsoft marca como "Do not use - not intended for general use", usada no caminho de suporte de parceiro. Quem define o escopo da delegação não deve ser quem opera dentro dela: é a separação entre aprovar o acesso e usar o acesso, aplicada à cadeia de parceiros.',
    risk: 'Ampliação silenciosa do escopo de administração delegada seguida de uso imediato desse escopo — um caminho de acesso que se origina fora do tenant e que revisões de acesso internas frequentemente não cobrem.',
    mitigation: [
      'Revisar todas as relações GDAP ativas e o conjunto de roles concedido em cada uma, com validade curta.',
      'Não atribuir Partner Tier1 Support nem Partner Tier2 Support a nenhuma identidade — a Microsoft desaconselha o uso geral das duas.',
      'Exigir aprovação do cliente registrada fora do Entra para qualquer alteração de relação GDAP.',
      'Alertar sobre alteração de customerDelegatedAdminPrivileges e sobre sign-in de identidades de parceiro no tenant.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },

  // ── Entra ID: financeiro e licenciamento ───────────────────────────────
  {
    id: 'billing-admin-license-admin',
    name: 'Billing Administrator + License Administrator',
    description: 'Comprar as assinaturas e distribuir as licenças compradas, sem uma segunda pessoa entre a despesa e o benefício.',
    severity: 'medium', category: 'financial-control', cloud: 'entra-id',
    roleA: { id: 'billing-administrator', name: 'Billing Administrator', cloud: 'entra-id' },
    roleB: { id: 'license-administrator', name: 'License Administrator', cloud: 'entra-id' },
    rationale: 'Billing Administrator tem microsoft.commerce.billing/allEntities/allProperties/allTasks — meios de pagamento, assinaturas e compras — além de poder alterar dados básicos da organização. License Administrator atribui licenças a usuários e grupos. O ciclo comprar → atribuir é o mesmo ciclo requisitar → aprovar que o controle financeiro clássico separa; concentrado numa identidade, não há quem confronte a despesa contra o consumo real.',
    risk: 'Compra de assinaturas não justificadas com atribuição imediata a contas controladas pelo próprio operador, produzindo despesa recorrente que só aparece na conciliação contábil, meses depois.',
    mitigation: [
      'Manter a compra de assinaturas no processo de suprimentos e a atribuição de licenças na operação de identidade.',
      'Conciliar mensalmente licenças compradas contra licenças atribuídas e usuários ativos.',
      'Exigir aprovação orçamentária fora do portal para qualquer aumento de assinatura.',
      'Revisar quem detém Billing Administrator — é ControlPlane no modelo EAM, apesar do nome administrativo.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001'],
  },

  // ── Entra ID: backup, IA e supervisão ──────────────────────────────────
  {
    id: 'entra-backup-admin-privileged-role-admin',
    name: 'Entra Backup Administrator + Privileged Role Administrator',
    description: 'Remover uma atribuição de role privilegiada e poder restaurá-la depois a partir de um snapshot, sem passar por aprovação.',
    severity: 'high', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'entra-backup-administrator', name: 'Entra Backup Administrator', cloud: 'entra-id' },
    roleB: { id: 'privileged-role-administrator', name: 'Privileged Role Administrator', cloud: 'entra-id' },
    rationale: 'Entra Backup Administrator cria snapshots e dispara jobs de recuperação (microsoft.directory/backup/recovery/create). Privileged Role Administrator controla atribuições de role e o PIM. O restore é um caminho de escrita no diretório que não se parece com uma atribuição de role: reintroduzir um estado anterior pode reintroduzir objetos e atribuições que uma revisão de acesso havia removido, e o registro fica como "recuperação", não como "concessão".',
    risk: 'Reversão de decisões de governança sob a aparência de operação de continuidade — o privilégio removido volta sem passar pelo fluxo de aprovação que o removeu.',
    mitigation: [
      'Atribuir a operação de backup/restore do Entra a uma equipe de continuidade separada da administração de roles.',
      'Exigir autorização registrada para cada job de recuperação, com escopo declarado antes da execução.',
      'Comparar o estado pós-restore contra o resultado da última Access Review e reaplicar as remoções.',
      'Alertar sobre qualquer microsoft.directory/backup/recovery/create no log de auditoria.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'ai-admin-compliance-admin',
    name: 'AI Administrator + Compliance Administrator',
    description: 'Configurar o alcance do Copilot sobre os dados da organização e escrever as políticas de conformidade que limitariam esse alcance.',
    severity: 'medium', category: 'compliance-audit', cloud: 'entra-id',
    roleA: { id: 'ai-administrator', name: 'AI Administrator', cloud: 'entra-id' },
    roleB: { id: 'compliance-administrator', name: 'Compliance Administrator', cloud: 'entra-id' },
    rationale: 'AI Administrator administra o Microsoft 365 Copilot e os serviços de IA corporativos — o que inclui decidir quais fontes de dados alimentam as respostas. Compliance Administrator define DLP, retenção e rotulagem, que são justamente os controles que deveriam restringir esse alcance. Quem configura o consumo de dados e quem escreve a política de proteção desses dados precisam ser pessoas diferentes, ou a política deixa de ser um limite externo.',
    risk: 'Ampliação do escopo de dados acessível pelo Copilot sem que nenhum controle de conformidade seja acionado, porque a mesma pessoa ajusta os dois lados — com exposição de conteúdo regulado a usuários que não teriam acesso direto a ele.',
    mitigation: [
      'Separar a administração dos serviços de IA da definição das políticas de conformidade que os governam.',
      'Revisar o escopo de grounding do Copilot como item recorrente do comitê de privacidade.',
      'Alertar sobre alteração de configuração de IA acompanhada de alteração de política de DLP ou retenção.',
      'Usar AI Reader para quem só precisa auditar a configuração, sem poder alterá-la.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'ai-admin-ai-reader',
    name: 'AI Administrator + AI Reader',
    description: 'A role de supervisão dos serviços de IA nas mãos de quem os administra — o mesmo problema de Global Administrator + Global Reader.',
    severity: 'low', category: 'compliance-audit', cloud: 'entra-id',
    roleA: { id: 'ai-administrator', name: 'AI Administrator', cloud: 'entra-id' },
    roleB: { id: 'ai-reader', name: 'AI Reader', cloud: 'entra-id' },
    rationale: 'AI Reader existe para que auditores e áreas de risco vejam toda a configuração de Copilot e dos serviços de IA sem poder alterá-la. Atribuí-la a quem já tem AI Administrator não adiciona nenhum acesso — o administrador já enxerga tudo — e anula o propósito da role como ponto de observação independente.',
    risk: 'A organização acredita ter supervisão independente sobre a configuração de IA quando, na prática, administrador e revisor são a mesma pessoa.',
    mitigation: [
      'Reservar AI Reader para auditoria interna, privacidade e risco, sem sobreposição com AI Administrator.',
      'Incluir a sobreposição das duas roles no relatório periódico de Access Reviews.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'attribute-provisioning-admin-app-admin',
    name: 'Attribute Provisioning Administrator + Application Administrator',
    description: 'Definir como os atributos de segurança customizados chegam à aplicação e controlar a própria aplicação que decide com base neles.',
    severity: 'medium', category: 'data-access', cloud: 'entra-id',
    roleA: { id: 'attribute-provisioning-administrator', name: 'Attribute Provisioning Administrator', cloud: 'entra-id' },
    roleB: { id: 'application-administrator', name: 'Application Administrator', cloud: 'entra-id' },
    rationale: 'Attribute Provisioning Administrator lê e edita a configuração de provisionamento dos custom security attributes de uma aplicação (servicePrincipals/synchronization.customSecurityAttributes/schema). Esses atributos alimentam decisões de autorização baseadas em atributo, inclusive condições de atribuição de role. Application Administrator controla o service principal que consome esses atributos. Uma identidade com as duas define tanto o dado de autorização quanto quem confia nele.',
    risk: 'Alteração do schema de atributos de segurança para produzir a decisão de acesso desejada, sem que nenhuma atribuição de role visível mude — difícil de detectar em revisão de acesso convencional.',
    mitigation: [
      'Tratar o schema de custom security attributes como configuração de segurança, com controle de mudança próprio.',
      'Separar a curadoria dos atributos de segurança da administração das aplicações que os consomem.',
      'Auditar alterações no schema de provisionamento como parte da revisão de acesso a dados.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001', 'LGPD'],
  },

  // ── Azure RBAC: as roles AccessManagement sem cobertura ────────────────
  {
    id: 'vm-data-access-admin-vm-contributor',
    name: 'Virtual Machine Data Access Administrator (preview) + Virtual Machine Contributor',
    description: 'Criar a máquina virtual e conceder a si mesmo o login administrativo dentro dela.',
    severity: 'high', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'virtual-machine-data-access-administrator-preview', name: 'Virtual Machine Data Access Administrator (preview)', cloud: 'azure-rbac' },
    roleB: { id: 'virtual-machine-contributor', name: 'Virtual Machine Contributor', cloud: 'azure-rbac' },
    rationale: 'Virtual Machine Contributor gerencia as máquinas virtuais no plano de controle, mas não concede acesso ao sistema operacional. Virtual Machine Data Access Administrator (preview) faz exatamente isso: atribui Virtual Machine Administrator Login e Virtual Machine User Login. A separação entre administrar a VM e administrar quem entra na VM é o que impede que a operação de infraestrutura se transforme em acesso ao dado que roda dentro dela.',
    risk: 'Uma identidade de operação de infraestrutura obtém sessão administrativa no sistema operacional de qualquer VM do escopo — incluindo VMs de produção com dados regulados — sem passar por concessão de acesso revisada.',
    mitigation: [
      'Manter a concessão de login em VM fora do perfil de operação de infraestrutura.',
      'Usar a condição ABAC da role para restringir quais roles podem ser atribuídas e a quais principals.',
      'Exigir Azure Bastion e acesso Just-in-Time para qualquer sessão administrativa em VM de produção.',
      'Alertar sobre atribuição de Virtual Machine Administrator Login feita por quem também tem Virtual Machine Contributor.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'azure-file-sync-admin-storage-account-contributor',
    name: 'Azure File Sync Administrator + Storage Account Contributor',
    description: 'Controlar para onde os arquivos sincronizam e também as contas de armazenamento de destino.',
    severity: 'high', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'azure-file-sync-administrator', name: 'Azure File Sync Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'storage-account-contributor', name: 'Storage Account Contributor', cloud: 'azure-rbac' },
    rationale: 'Azure File Sync Administrator tem acesso total aos recursos do Storage Sync Service — server endpoints, sync groups e cloud endpoints, ou seja, o mapeamento entre servidores de arquivo e shares na nuvem. Storage Account Contributor administra as contas de armazenamento, inclusive chaves de acesso. Juntas, uma identidade redireciona a sincronização e controla o destino: o dado sai do servidor de origem e chega a um lugar sob o mesmo controle.',
    risk: 'Exfiltração de compartilhamentos de arquivo corporativos por meio de um cloud endpoint apontado para uma conta de armazenamento controlada pelo operador — o tráfego parece sincronização legítima.',
    mitigation: [
      'Separar a administração do Azure File Sync da administração das contas de armazenamento de destino.',
      'Restringir as contas de armazenamento a redes virtuais aprovadas e desabilitar acesso por chave onde possível.',
      'Revisar periodicamente todos os cloud endpoints e a qual conta de armazenamento apontam.',
      'Alertar sobre criação ou alteração de cloud endpoint fora de janela de mudança.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
      'https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-planning',
    ],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'foundry-owner-storage-blob-data-owner',
    name: 'Foundry Owner + Storage Blob Data Owner',
    description: 'Administrar os projetos de IA e ainda ter posse total dos dados que os alimentam.',
    severity: 'high', category: 'data-access', cloud: 'azure-rbac',
    roleA: { id: 'foundry-owner', name: 'Foundry Owner', cloud: 'azure-rbac' },
    roleB: { id: 'storage-blob-data-owner', name: 'Storage Blob Data Owner', cloud: 'azure-rbac' },
    rationale: 'Foundry Owner administra contas e projetos do Microsoft Foundry, publica agentes, gerencia modelos e faz atribuições condicionais de role. Storage Blob Data Owner dá acesso total aos contêineres de blob, incluindo controle de acesso POSIX — normalmente onde ficam os dados de treinamento, fine-tuning e grounding. A combinação junta quem define o que o modelo consome e quem controla o dado consumido, sem nenhuma barreira entre os dois.',
    risk: 'Dados sensíveis entram num projeto de IA ou num agente publicado sem revisão de privacidade, e a saída do modelo passa a expor conteúdo que a mesma pessoa disponibilizou — um caminho de vazamento que não aparece como acesso direto ao storage.',
    mitigation: [
      'Separar a posse dos dados da administração da plataforma de IA.',
      'Exigir aprovação de privacidade registrada antes de conectar uma fonte de dados a um projeto do Foundry.',
      'Inventariar quais contêineres estão ligados a projetos e agentes, e revisar periodicamente.',
      'Registrar e revisar as atribuições de role feitas por Foundry Owner, que são condicionais mas reais.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'foundry-account-owner-foundry-project-manager',
    name: 'Foundry Account Owner + Foundry Project Manager',
    description: 'Criar as contas e projetos do Foundry e também construir e publicar dentro deles.',
    severity: 'medium', category: 'application-management', cloud: 'azure-rbac',
    roleA: { id: 'foundry-account-owner', name: 'Foundry Account Owner', cloud: 'azure-rbac' },
    roleB: { id: 'foundry-project-manager', name: 'Foundry Project Manager', cloud: 'azure-rbac' },
    rationale: 'A Microsoft separou as duas de propósito: Foundry Account Owner cria contas e projetos e faz atribuições de role, mas não constrói dentro dos projetos; Foundry Project Manager constrói, publica agentes e atribui a role Foundry User. Somadas, a mesma identidade cria o ambiente, desenvolve o agente, publica e concede acesso — não sobra nenhum ponto de aprovação entre desenvolver e liberar.',
    risk: 'Um agente vai a produção sem revisão independente, com as permissões que o próprio autor concedeu, num serviço que interage com dados corporativos.',
    mitigation: [
      'Manter a criação de contas/projetos do Foundry na plataforma e o desenvolvimento nas equipes de produto.',
      'Exigir aprovação de segundo revisor para publicação de agente em ambiente produtivo.',
      'Revisar as atribuições de Foundry User feitas por cada Project Manager.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'azure-stack-hci-admin-monitoring-contributor',
    name: 'Azure Stack HCI Administrator + Monitoring Contributor',
    description: 'Acesso total ao cluster e controle do que é monitorado nele.',
    severity: 'medium', category: 'compliance-audit', cloud: 'azure-rbac',
    roleA: { id: 'azure-stack-hci-administrator', name: 'Azure Stack HCI Administrator', cloud: 'azure-rbac' },
    roleB: { id: 'monitoring-contributor', name: 'Monitoring Contributor', cloud: 'azure-rbac' },
    rationale: 'Azure Stack HCI Administrator concede acesso total ao cluster e aos seus recursos, incluindo registrar o cluster e atribuir Azure Arc HCI VM Contributor ou Reader a terceiros — são 103 permissões. Monitoring Contributor controla configurações de diagnóstico, regras de alerta e coleta. Quem administra a infraestrutura e também define o que é observado dela pode desligar a própria trilha.',
    risk: 'Alterações no cluster deixam de gerar sinal porque a regra de alerta ou a configuração de diagnóstico foi ajustada pela mesma identidade — detecção atrasada num ambiente que hospeda cargas de produção.',
    mitigation: [
      'Manter a configuração de monitoramento sob a equipe de observabilidade, não sob a operação do cluster.',
      'Enviar logs de diagnóstico para um workspace em assinatura separada, com acesso restrito.',
      'Alertar sobre remoção ou desativação de regra de alerta e de configuração de diagnóstico.',
      'Revisar quem detém Azure Stack HCI Administrator — é uma role de gestão de acesso, não só de operação.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'devcenter-owner-user-access-admin',
    name: 'DevCenter Owner + User Access Administrator',
    description: 'Dois caminhos independentes de concessão sobre os mesmos ambientes de desenvolvimento.',
    severity: 'medium', category: 'privileged-access', cloud: 'azure-rbac',
    roleA: { id: 'devcenter-owner', name: 'DevCenter Owner', cloud: 'azure-rbac' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'DevCenter Owner administra os recursos Microsoft.DevCenter e já concede acesso adicionando ou removendo as roles DevCenter Project Admin e DevCenter Dev Box — uma capacidade de concessão limitada e auditável por escopo. User Access Administrator concede qualquer role em qualquer escopo. Somadas, a concessão delimitada perde sentido: o operador contorna o limite do DevCenter pelo caminho genérico, e a revisão que olha só as atribuições de DevCenter não enxerga isso.',
    risk: 'Provisionamento de Dev Boxes e ambientes com acesso concedido fora do modelo previsto do DevCenter, com privilégio que não aparece na revisão específica da plataforma.',
    mitigation: [
      'Não combinar User Access Administrator com roles que já têm concessão delimitada por serviço.',
      'Restringir User Access Administrator a escopos mínimos e ativá-la via PIM com justificativa.',
      'Revisar as atribuições de DevCenter Project Admin e Dev Box separadamente das atribuições genéricas do escopo.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'iot-operations-onboarding-network-contributor',
    name: 'Azure IoT Operations Onboarding + Network Contributor',
    description: 'Conectar clusters ao Azure Arc e controlar a rede pela qual eles se conectam.',
    severity: 'medium', category: 'security-operations', cloud: 'azure-rbac',
    roleA: { id: 'azure-iot-operations-onboarding', name: 'Azure IoT Operations Onboarding', cloud: 'azure-rbac' },
    roleB: { id: 'network-contributor', name: 'Network Contributor', cloud: 'azure-rbac' },
    rationale: 'Azure IoT Operations Onboarding permite conectar clusters via Azure Arc e implantar o IoT Operations — é o ponto em que um recurso externo passa a ser gerenciado pelo tenant. Network Contributor controla redes virtuais, NSGs e rotas, ou seja, o caminho por onde esse recurso se comunica. Quem admite o dispositivo e quem define a fronteira de rede dele precisam ser papéis distintos, ou o controle de rede deixa de ser um limite para o onboarding.',
    risk: 'Um cluster não homologado entra no ambiente com a rota e as regras de rede ajustadas para não disparar controle nenhum, criando uma ponte entre a rede operacional e a rede corporativa.',
    mitigation: [
      'Segregar o onboarding de recursos Arc da administração de rede.',
      'Exigir aprovação de arquitetura de rede para cada novo cluster IoT conectado.',
      'Revisar NSGs e rotas associadas a sub-redes de cargas IoT como parte da revisão de mudança.',
      'Alertar sobre criação de recurso Arc acompanhada de alteração de NSG pela mesma identidade.',
    ],
    references: ['https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },

  // ── Cross-cloud Entra ID ↔ Azure RBAC ──────────────────────────────────
  {
    id: 'agent-id-admin-uaa-cross',
    name: 'Agent ID Administrator + User Access Administrator',
    description: 'Criar a identidade agêntica no Entra ID e colocá-la em qualquer escopo do Azure.',
    severity: 'critical', category: 'privileged-access', cloud: 'microsoft-cross',
    roleA: { id: 'agent-id-administrator', name: 'Agent ID Administrator', cloud: 'entra-id' },
    roleB: { id: 'user-access-administrator', name: 'User Access Administrator', cloud: 'azure-rbac' },
    rationale: 'Agent ID Administrator cria e administra identidades agênticas no diretório; User Access Administrator atribui qualquer role do Azure em qualquer escopo. É a versão agêntica do par clássico Privileged Role Administrator + User Access Administrator: uma identidade só produz o principal não-humano e o instala com privilégio sobre assinaturas inteiras, atravessando a fronteira entre o plano de identidade e o plano de recursos.',
    risk: 'Um agente criado no Entra ID recebe Contributor ou Owner em produção sem que nenhuma aprovação de identidade nem de plataforma tenha ocorrido — e continua ativo após o offboarding de quem o criou, porque não é uma conta de usuário.',
    mitigation: [
      'Separar quem cria identidades de agente de quem concede acesso a recursos do Azure.',
      'Ativar User Access Administrator apenas via PIM, com aprovação e escopo mínimo.',
      'Usar Azure Policy ou deny assignments para impedir atribuição de Owner/Contributor a principals de agente fora do processo aprovado.',
      'Inventariar mensalmente principals não-humanos com atribuição de role no Azure e correlacionar com o inventário de agentes do Entra.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'ai-admin-foundry-owner-cross',
    name: 'AI Administrator + Foundry Owner',
    description: 'Administrar a IA do lado do Microsoft 365 e a plataforma de IA do lado do Azure — governança de IA sem contrapeso.',
    severity: 'high', category: 'application-management', cloud: 'microsoft-cross',
    roleA: { id: 'ai-administrator', name: 'AI Administrator', cloud: 'entra-id' },
    roleB: { id: 'foundry-owner', name: 'Foundry Owner', cloud: 'azure-rbac' },
    rationale: 'AI Administrator governa o Microsoft 365 Copilot e os serviços de IA corporativos — onde estão os dados de produtividade da organização. Foundry Owner administra contas e projetos do Microsoft Foundry, publica agentes e faz atribuições condicionais de role — onde os modelos e agentes são construídos. Uma identidade com as duas controla toda a superfície de IA da empresa nos dois lados da fronteira Microsoft 365 / Azure, sem que nenhuma equipe enxergue o quadro completo além dela.',
    risk: 'Um agente construído no Foundry é conectado a dados do Microsoft 365 pela mesma pessoa que definiu o alcance do Copilot — o fluxo de dados atravessa as duas plataformas sem revisão em nenhum ponto.',
    mitigation: [
      'Distribuir a administração de IA entre a equipe de Microsoft 365 e a equipe de plataforma Azure.',
      'Manter um inventário único de agentes e dos dados a que cada um tem acesso, revisado pelo comitê de privacidade.',
      'Exigir aprovação conjunta para qualquer integração entre um projeto do Foundry e fontes de dados do Microsoft 365.',
      'Usar AI Reader e roles de leitura do Foundry para auditoria, sem sobreposição com as roles administrativas.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    ],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'partner-tier1-support-privileged-auth-admin',
    name: 'Partner Tier1 Support + Privileged Authentication Administrator',
    description: 'Uma role que já cria contas, troca UPN e reseta senha, somada à role que reseta o MFA de qualquer administrador.',
    severity: 'critical', category: 'privileged-access', cloud: 'entra-id',
    roleA: { id: 'partner-tier1-support', name: 'Partner Tier1 Support', cloud: 'entra-id' },
    roleB: { id: 'privileged-authentication-administrator', name: 'Privileged Authentication Administrator', cloud: 'entra-id' },
    rationale: 'Partner Tier1 Support é uma das roles mais densas do diretório: cria, apaga, habilita e restaura usuários, altera userPrincipalName, atualiza senha, invalida todos os refresh tokens, atualiza credenciais de aplicação e administra oAuth2PermissionGrants. A Microsoft a marca como "Do not use - not intended for general use". Privileged Authentication Administrator reseta métodos de autenticação de qualquer usuário, inclusive Global Administrators. Somadas, uma identidade só percorre o caminho completo até uma conta administrativa: assume o controle da credencial e remove o segundo fator que a protegia.',
    risk: 'Takeover de uma conta Global Administrator a partir de uma role de suporte de parceiro, sem tocar em nenhuma atribuição de role — o evento aparece como manutenção de credencial, não como escalonamento de privilégio.',
    mitigation: [
      'Não atribuir Partner Tier1 Support nem Partner Tier2 Support a nenhuma identidade: a Microsoft desaconselha o uso geral das duas.',
      'Restringir Privileged Authentication Administrator a contas administrativas dedicadas, ativadas por PIM com aprovação.',
      'Alertar sobre qualquer reset de método de autenticação cujo alvo detenha uma role de diretório.',
      'Auditar mensalmente os detentores das duas roles — ambas são ControlPlane no modelo EAM.',
    ],
    references: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'attribute-provisioning-admin-attribute-provisioning-reader',
    name: 'Attribute Provisioning Administrator + Attribute Provisioning Reader',
    description: 'A role de leitura dos atributos de segurança customizados nas mãos de quem os edita.',
    severity: 'low', category: 'compliance-audit', cloud: 'entra-id',
    roleA: { id: 'attribute-provisioning-administrator', name: 'Attribute Provisioning Administrator', cloud: 'entra-id' },
    roleB: { id: 'attribute-provisioning-reader', name: 'Attribute Provisioning Reader', cloud: 'entra-id' },
    rationale: 'Attribute Provisioning Reader existe para que auditoria e áreas de risco leiam a configuração de provisionamento dos custom security attributes sem poder alterá-la. Atribuí-la a quem já tem Attribute Provisioning Administrator não acrescenta acesso — o administrador já lê tudo — e apaga a distinção entre quem configura e quem verifica num dado que alimenta decisões de autorização.',
    risk: 'A organização supõe que a configuração de atributos de segurança tem revisão independente quando configurador e revisor são a mesma pessoa.',
    mitigation: [
      'Reservar Attribute Provisioning Reader para auditoria e governança de dados, sem sobreposição com a role administrativa.',
      'Incluir a sobreposição das duas roles no relatório periódico de Access Reviews.',
    ],
    references: ['https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference'],
    frameworks: ['ISO27001'],
  },
  // ═══════════════════════════════════════════════════════════════════════
  // AWS IAM — managed policies
  //
  // A unidade da AWS não é role: é POLICY GERENCIADA. Uma role da AWS é um
  // contêiner que recebe policies, e é a policy que carrega a permissão. Por
  // isso as referências abaixo apontam para /aws/policies/<slug>, e o par de
  // uma regra é um par de policies anexadas à mesma identidade — usuário,
  // grupo, role ou permission set do Identity Center.
  //
  // Uma ressalva que vale para todo este bloco: a AWS avalia permissão pela
  // UNIÃO das policies, limitada por SCP e permission boundary. Uma regra
  // aponta acúmulo de policies conflitantes; se existe SCP ou boundary
  // cortando o efeito, o conflito pode não se materializar. Isso é ambiente,
  // não catálogo.
  // ═══════════════════════════════════════════════════════════════════════

  // ── AWS: IAM e escalonamento ───────────────────────────────────────────
  {
    id: 'aws-poweruser-iamfullaccess',
    name: 'PowerUserAccess + IAMFullAccess',
    description: 'A policy desenhada como "tudo menos IAM" somada à que é só IAM — AdministratorAccess reconstruído por acúmulo.',
    severity: 'critical', category: 'privileged-access', cloud: 'aws',
    roleA: { id: 'poweruseraccess', name: 'PowerUserAccess', cloud: 'aws' },
    roleB: { id: 'iamfullaccess', name: 'IAMFullAccess', cloud: 'aws' },
    rationale: 'PowerUserAccess existe por causa de uma única exclusão: dá acesso amplo aos serviços e nega justamente a gestão de identidade e acesso. É essa exclusão que a torna atribuível a quem opera sem ser administrador da conta. IAMFullAccess devolve exatamente o que foi tirado. A união das duas é funcionalmente AdministratorAccess, mas nenhum inventário que procure por "quem tem AdministratorAccess" vai encontrá-la.',
    risk: 'Privilégio de administrador de conta invisível para a revisão que procura pelo nome da policy de administrador — e a pessoa pode se auto-conceder qualquer permissão restante, tornando qualquer limite subsequente inócuo.',
    mitigation: [
      'Não anexar IAMFullAccess a nenhuma identidade que já tenha PowerUserAccess; se o cenário exige as duas, o que se está descrevendo é AdministratorAccess.',
      'Inventariar por PERMISSÃO EFETIVA, não por nome de policy — o IAM Access Analyzer e o simulador de policy respondem essa pergunta.',
      'Aplicar permission boundary que negue iam:* às identidades de operação.',
      'Usar SCP na organização para exigir MFA em qualquer chamada iam:Create*/iam:Attach*/iam:Put*.',
    ],
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html',
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'aws-iamfullaccess-cloudtrail-fullaccess',
    name: 'IAMFullAccess + AWSCloudTrail_FullAccess',
    description: 'Conceder a si mesmo qualquer permissão e poder parar ou apagar a trilha que registraria isso.',
    severity: 'critical', category: 'privileged-access', cloud: 'aws',
    roleA: { id: 'iamfullaccess', name: 'IAMFullAccess', cloud: 'aws' },
    roleB: { id: 'awscloudtrail-fullaccess', name: 'AWSCloudTrail_FullAccess', cloud: 'aws' },
    rationale: 'IAMFullAccess permite criar usuários, roles e policies e anexá-las — inclusive a si mesmo. AWSCloudTrail_FullAccess inclui cloudtrail:StopLogging, cloudtrail:DeleteTrail e cloudtrail:UpdateTrail, ou seja, o poder de interromper, redirecionar ou remover a trilha de auditoria da conta. A ordem importa pouco: com as duas, dá para desligar o registro, escalar e religar.',
    risk: 'Escalonamento de privilégio sem rastro recuperável. A investigação posterior encontra uma lacuna na trilha, não o evento — e sem CloudTrail a maior parte dos controles de detecção da AWS fica cega, porque é dele que se alimentam.',
    mitigation: [
      'Usar trilha de organização criada na conta de gestão: contas-membro não conseguem pará-la nem apagá-la.',
      'Aplicar SCP negando cloudtrail:StopLogging, cloudtrail:DeleteTrail e cloudtrail:UpdateTrail em todas as contas-membro.',
      'Entregar os logs num bucket S3 de conta separada, com Object Lock e política que negue exclusão.',
      'Alertar sobre qualquer evento StopLogging ou DeleteTrail, tratando-o como incidente e não como mudança.',
    ],
    references: [
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html',
      'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'aws-organizations-iamfullaccess',
    name: 'AWSOrganizationsFullAccess + IAMFullAccess',
    description: 'Remover o teto de permissão da organização e depois se conceder o que estava acima dele.',
    severity: 'critical', category: 'privileged-access', cloud: 'aws',
    roleA: { id: 'awsorganizationsfullaccess', name: 'AWSOrganizationsFullAccess', cloud: 'aws' },
    roleB: { id: 'iamfullaccess', name: 'IAMFullAccess', cloud: 'aws' },
    rationale: 'A Service Control Policy é o único controle da AWS que limita o que um administrador de conta pode fazer — o teto acima do IAM. AWSOrganizationsFullAccess permite criar, alterar e desanexar SCPs, criar contas novas e mover contas entre OUs. IAMFullAccess concede permissão dentro da conta. Com as duas, o teto deixa de ser um limite externo: quem esbarra nele o remove.',
    risk: 'Todo o modelo de contenção da organização vira decisão de uma pessoa só. Uma conta pode ser movida para uma OU sem SCP, ou receber permissão que a política corporativa proíbe, sem que nenhuma outra equipe participe.',
    mitigation: [
      'Restringir AWSOrganizationsFullAccess à conta de gestão e a um número mínimo de identidades, com MFA obrigatório.',
      'Segregar quem administra a organização de quem administra IAM nas contas-membro.',
      'Alertar sobre DetachPolicy, UpdatePolicy, MoveAccount e CreateAccount no CloudTrail da conta de gestão.',
      'Revisar periodicamente a estrutura de OUs e quais SCPs estão de fato anexadas a cada uma.',
    ],
    references: [
      'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html',
      'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'aws-cloudformation-iamfullaccess',
    name: 'AWSCloudFormationFullAccess + IAMFullAccess',
    description: 'Criar a role privilegiada e criar a stack que a assume — escalonamento por infraestrutura como código.',
    severity: 'critical', category: 'privileged-access', cloud: 'aws',
    roleA: { id: 'awscloudformationfullaccess', name: 'AWSCloudFormationFullAccess', cloud: 'aws' },
    roleB: { id: 'iamfullaccess', name: 'IAMFullAccess', cloud: 'aws' },
    rationale: 'O CloudFormation executa com a role de serviço que a stack indica. IAMFullAccess permite criar uma role com a permissão desejada e uma trust policy que aceite o CloudFormation; AWSCloudFormationFullAccess permite criar a stack que a usa. O resultado é execução com privilégio arbitrário através de um serviço legítimo, e o evento no CloudTrail aparece como implantação de stack, não como escalonamento.',
    risk: 'Escalonamento que atravessa a revisão de mudança: o template é o artefato revisado, mas quem tem as duas policies pode criar a stack fora do pipeline, com uma role que ninguém aprovou.',
    mitigation: [
      'Usar service roles fixas e aprovadas para CloudFormation, e negar iam:PassRole para roles fora dessa lista.',
      'Segregar quem cria roles de quem implanta stacks — na prática, tirar IAMFullAccess de quem opera implantação.',
      'Exigir que stacks de produção venham de um pipeline com revisão do template, e negar CreateStack fora dele por SCP.',
      'Monitorar CreateRole seguido de CreateStack pela mesma identidade.',
    ],
    references: [
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-iam-servicerole.html',
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'aws-ssm-fullaccess-ec2-fullaccess',
    name: 'AmazonSSMFullAccess + AmazonEC2FullAccess',
    description: 'Criar a instância com um instance profile privilegiado e executar comando dentro dela.',
    severity: 'high', category: 'privileged-access', cloud: 'aws',
    roleA: { id: 'amazonssmfullaccess', name: 'AmazonSSMFullAccess', cloud: 'aws' },
    roleB: { id: 'amazonec2fullaccess', name: 'AmazonEC2FullAccess', cloud: 'aws' },
    rationale: 'AmazonEC2FullAccess permite lançar instâncias e associar instance profiles a elas. AmazonSSMFullAccess permite executar comandos nas instâncias gerenciadas via Run Command, com o privilégio do agente — normalmente root ou SYSTEM. Juntas, a identidade lança uma instância com o instance profile mais forte a que tem acesso e passa a executar código com aquele privilégio, colhendo as credenciais temporárias do metadata service.',
    risk: 'Escalonamento lateral clássico da AWS: a permissão efetiva deixa de ser a das policies anexadas à pessoa e passa a ser a da role mais privilegiada que ela consegue anexar a uma instância.',
    mitigation: [
      'Restringir iam:PassRole por condição, listando explicitamente quais roles cada perfil pode passar para o EC2.',
      'Segregar provisionamento de instância de operação remota (Run Command / Session Manager).',
      'Exigir IMDSv2 e limitar o hop de resposta do metadata service.',
      'Registrar sessões do Session Manager e comandos do Run Command em log imutável, com revisão.',
    ],
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html',
      'https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-auditing.html',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },

  // ── AWS: Identity Center e provisionamento ─────────────────────────────
  {
    id: 'aws-sso-master-admin-iamfullaccess',
    name: 'AWSSSOMasterAccountAdministrator + IAMFullAccess',
    description: 'Dois caminhos independentes de concessão sobre a mesma conta — o federado e o local.',
    severity: 'critical', category: 'access-provisioning', cloud: 'aws',
    roleA: { id: 'awsssomasteraccountadministrator', name: 'AWSSSOMasterAccountAdministrator', cloud: 'aws' },
    roleB: { id: 'iamfullaccess', name: 'IAMFullAccess', cloud: 'aws' },
    rationale: 'O IAM Identity Center existe para que o acesso às contas venha de um lugar só, com permission sets revisáveis e credencial temporária. AWSSSOMasterAccountAdministrator administra esse plano: quem entra em qual conta, com qual permission set. IAMFullAccess concede dentro da conta, por baixo dele, inclusive criando usuário IAM com chave de acesso permanente. Ter os dois significa poder conceder pelo caminho auditado e, quando ele incomodar, pelo caminho que ninguém revisa.',
    risk: 'Acesso persistente por chave de longa duração criada ao lado do modelo federado — sobrevive à remoção do usuário no Identity Center e não aparece na revisão de permission sets.',
    mitigation: [
      'Bloquear a criação de usuários e access keys IAM por SCP nas contas-membro, deixando o Identity Center como único caminho.',
      'Segregar a administração do Identity Center da administração de IAM das contas.',
      'Revisar periodicamente usuários IAM com credencial permanente — a expectativa em uma conta federada é zero.',
      'Alertar sobre CreateUser e CreateAccessKey em qualquer conta-membro.',
    ],
    references: [
      'https://docs.aws.amazon.com/singlesignon/latest/userguide/security-best-practices.html',
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'aws-ssodirectoryadmin-ssomasteradmin',
    name: 'AWSSSODirectoryAdministrator + AWSSSOMasterAccountAdministrator',
    description: 'Criar a identidade no diretório e atribuí-la às contas — sem ninguém entre uma coisa e outra.',
    severity: 'high', category: 'identity-management', cloud: 'aws',
    roleA: { id: 'awsssodirectoryadministrator', name: 'AWSSSODirectoryAdministrator', cloud: 'aws' },
    roleB: { id: 'awsssomasteraccountadministrator', name: 'AWSSSOMasterAccountAdministrator', cloud: 'aws' },
    rationale: 'AWSSSODirectoryAdministrator administra o diretório do Identity Center — criar usuários e grupos, alterar associação. AWSSSOMasterAccountAdministrator atribui grupos e usuários a contas com permission sets. É o par criar-a-identidade / conceder-o-acesso, que toda a literatura de SoD separa: o ciclo inteiro de uma identidade fica numa pessoa, e a associação de grupo é o que carrega o privilégio.',
    risk: 'Uma conta criada e imediatamente colocada num grupo com permission set administrativo. Se a criação e a atribuição são o mesmo ato operacional, não existe momento em que alguém possa recusar.',
    mitigation: [
      'Alimentar o diretório do Identity Center por SCIM a partir do IdP corporativo, tirando a criação manual da mesa de quem atribui acesso.',
      'Segregar administração de diretório de atribuição de conta/permission set.',
      'Alertar sobre criação de usuário seguida de atribuição de permission set pela mesma identidade.',
      'Revisar trimestralmente a associação dos grupos ligados a permission sets administrativos.',
    ],
    references: ['https://docs.aws.amazon.com/singlesignon/latest/userguide/security-best-practices.html'],
    frameworks: ['SOX', 'ISO27001', 'CIS'],
  },
  {
    id: 'aws-servicecatalog-admin-enduser',
    name: 'AWSServiceCatalogAdminFullAccess + AWSServiceCatalogEndUserFullAccess',
    description: 'Publicar o produto no catálogo e provisioná-lo — autor e consumidor na mesma pessoa.',
    severity: 'medium', category: 'application-management', cloud: 'aws',
    roleA: { id: 'awsservicecatalogadminfullaccess', name: 'AWSServiceCatalogAdminFullAccess', cloud: 'aws' },
    roleB: { id: 'awsservicecatalogenduserfullaccess', name: 'AWSServiceCatalogEndUserFullAccess', cloud: 'aws' },
    rationale: 'O Service Catalog existe para separar quem aprova uma configuração de infraestrutura de quem a usa: o administrador publica produtos revisados com uma launch role definida, e o usuário final só provisiona o que está no portfólio. Acumular os dois papéis desfaz a separação — a pessoa publica o produto que quiser, com a launch role que quiser, e o provisiona em seguida.',
    risk: 'Provisionamento de infraestrutura com permissões elevadas via launch role definida pelo próprio solicitante, sob a aparência de uso normal do catálogo aprovado.',
    mitigation: [
      'Manter a curadoria do portfólio numa equipe de plataforma e o consumo nas equipes de produto.',
      'Revisar as launch roles associadas a cada produto — é ali que o privilégio real do catálogo está.',
      'Exigir aprovação registrada para inclusão ou alteração de produto no portfólio.',
    ],
    references: ['https://docs.aws.amazon.com/servicecatalog/latest/adminguide/controlling_access.html'],
    frameworks: ['ISO27001', 'CIS'],
  },

  // ── AWS: auditoria e detecção ──────────────────────────────────────────
  {
    id: 'aws-iamfullaccess-securityaudit',
    name: 'IAMFullAccess + SecurityAudit',
    description: 'Quem concede o acesso também é quem revisa se o acesso concedido está correto.',
    severity: 'high', category: 'compliance-audit', cloud: 'aws',
    roleA: { id: 'iamfullaccess', name: 'IAMFullAccess', cloud: 'aws' },
    roleB: { id: 'securityaudit', name: 'SecurityAudit', cloud: 'aws' },
    rationale: 'SecurityAudit é a policy de job function que a AWS publica para auditores: leitura ampla de configuração de segurança, sem escrita. Ela só cumpre esse papel se quem a detém for independente de quem configura. Somada a IAMFullAccess, a pessoa que decide quem tem acesso é a mesma que produz o relatório de quem tem acesso.',
    risk: 'Achados de revisão de acesso perdem valor como evidência de controle: são gerados por quem seria o objeto da revisão, e uma concessão indevida pode simplesmente não ser reportada.',
    mitigation: [
      'Atribuir SecurityAudit a auditoria interna ou a uma conta de segurança separada, com acesso de leitura entre contas.',
      'Rodar a revisão de acesso a partir do IAM Access Analyzer numa conta delegada, fora do alcance de quem administra IAM.',
      'Exigir que o relatório de acesso seja assinado por alguém sem permissão de escrita em IAM.',
    ],
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html',
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'aws-administratoraccess-securityaudit',
    name: 'AdministratorAccess + SecurityAudit',
    description: 'A policy de auditoria anexada a quem já pode tudo — supervisão que não supervisiona nada.',
    severity: 'high', category: 'compliance-audit', cloud: 'aws',
    roleA: { id: 'administratoraccess', name: 'AdministratorAccess', cloud: 'aws' },
    roleB: { id: 'securityaudit', name: 'SecurityAudit', cloud: 'aws' },
    rationale: 'AdministratorAccess já concede leitura de tudo, então anexar SecurityAudit por cima não adiciona nenhuma permissão. O que ela adiciona é a APARÊNCIA de um papel de auditoria: um inventário que procure "quem audita esta conta" encontra alguém que, na verdade, é o administrador dela. É o mesmo defeito de Global Administrator somado a Global Reader no Entra ID.',
    risk: 'A organização acredita ter revisão independente da conta quando administrador e auditor são a mesma pessoa — e é justamente essa crença que faz ninguém procurar por um revisor de verdade.',
    mitigation: [
      'Nunca anexar SecurityAudit a uma identidade com AdministratorAccess: se ela já vê tudo, a policy só existe para enganar o inventário.',
      'Manter a auditoria numa conta separada, acessando por role cross-account de leitura.',
      'Revisar quem tem AdministratorAccess como item recorrente — a expectativa é um punhado de identidades quebra-vidro, com MFA.',
    ],
    references: ['https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'aws-securityaudit-auditmanager',
    name: 'SecurityAudit + AWSAuditManagerAdministratorAccess',
    description: 'Coletar a evidência de conformidade e administrar — inclusive apagar — o repositório dela.',
    severity: 'medium', category: 'compliance-audit', cloud: 'aws',
    roleA: { id: 'securityaudit', name: 'SecurityAudit', cloud: 'aws' },
    roleB: { id: 'awsauditmanageradministratoraccess', name: 'AWSAuditManagerAdministratorAccess', cloud: 'aws' },
    rationale: 'O Audit Manager coleta evidência automaticamente e a organiza em avaliações vinculadas a um framework. AWSAuditManagerAdministratorAccess administra essas avaliações: criar, alterar o escopo, atualizar controles e apagar. Quem produz a leitura de conformidade não deveria ser quem decide o que entra na avaliação e o que sai dela.',
    risk: 'Evidência desfavorável removida do escopo antes do relatório, sem que a alteração apareça no artefato entregue ao auditor externo.',
    mitigation: [
      'Segregar a operação do Audit Manager da produção da evidência técnica.',
      'Exportar as evidências para um bucket S3 com versionamento e Object Lock, fora do alcance de quem administra as avaliações.',
      'Alertar sobre DeleteAssessment e UpdateAssessment em avaliações que suportam relatório regulatório.',
    ],
    references: ['https://docs.aws.amazon.com/audit-manager/latest/userguide/security.html'],
    frameworks: ['SOX', 'ISO27001', 'PCI-DSS'],
  },
  {
    id: 'aws-guardduty-cloudtrail',
    name: 'AmazonGuardDutyFullAccess + AWSCloudTrail_FullAccess',
    description: 'Administrar o detector e a fonte que o alimenta — as duas metades do mesmo sinal.',
    severity: 'high', category: 'security-operations', cloud: 'aws',
    roleA: { id: 'amazonguarddutyfullaccess', name: 'AmazonGuardDutyFullAccess', cloud: 'aws' },
    roleB: { id: 'awscloudtrail-fullaccess', name: 'AWSCloudTrail_FullAccess', cloud: 'aws' },
    rationale: 'O GuardDuty analisa eventos do CloudTrail, logs de DNS e de fluxo de VPC. AmazonGuardDutyFullAccess permite desabilitar o detector, criar filtros de supressão e arquivar achados; AWSCloudTrail_FullAccess permite parar a trilha que o alimenta. Concentrar as duas numa identidade dá dois modos independentes de silenciar a detecção, e o segundo não deixa nem o achado arquivado como pista.',
    risk: 'Atividade maliciosa que não gera achado, ou gera um achado imediatamente suprimido — a lacuna só aparece numa revisão de configuração, não no fluxo de alertas que a equipe acompanha.',
    mitigation: [
      'Administrar o GuardDuty por conta delegada de segurança, com as contas-membro sem permissão de desabilitar o detector.',
      'Aplicar SCP negando guardduty:DeleteDetector, guardduty:UpdateDetector e cloudtrail:StopLogging nas contas-membro.',
      'Alertar sobre criação de filtro de supressão e sobre arquivamento em massa de achados.',
      'Revisar mensalmente os filtros de supressão ativos — eles são a forma silenciosa de desligar a detecção.',
    ],
    references: [
      'https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_cloudtrail.html',
      'https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'aws-securityhub-guardduty',
    name: 'AWSSecurityHubFullAccess + AmazonGuardDutyFullAccess',
    description: 'Definir os padrões de conformidade e controlar a fonte que os alimenta com achados.',
    severity: 'medium', category: 'security-operations', cloud: 'aws',
    roleA: { id: 'awssecurityhubfullaccess', name: 'AWSSecurityHubFullAccess', cloud: 'aws' },
    roleB: { id: 'amazonguarddutyfullaccess', name: 'AmazonGuardDutyFullAccess', cloud: 'aws' },
    rationale: 'O Security Hub agrega achados e mede a conta contra padrões como o CIS AWS Foundations Benchmark; o GuardDuty é uma das fontes que ele agrega. AWSSecurityHubFullAccess permite desabilitar controles e padrões inteiros e alterar o estado de fluxo de trabalho dos achados. Somada ao controle da fonte, uma identidade pode melhorar o score de conformidade sem melhorar nada no ambiente.',
    risk: 'O score de segurança da conta deixa de refletir o ambiente e passa a refletir a configuração escolhida por quem é medido — e o score é justamente o que a diretoria acompanha.',
    mitigation: [
      'Habilitar Security Hub e GuardDuty por administrador delegado, com configuração central e contas-membro sem poder alterá-la.',
      'Alertar sobre BatchDisableStandards, UpdateStandardsControl e mudanças em massa de workflow status.',
      'Revisar quais controles estão desabilitados e por quê, com justificativa registrada e validade.',
    ],
    references: ['https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-central-configuration-intro.html'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'aws-cloudtrail-cloudwatchlogs',
    name: 'AWSCloudTrail_FullAccess + CloudWatchLogsFullAccess',
    description: 'Controlar a trilha e o destino dela — parar o registro e apagar o que já foi registrado.',
    severity: 'high', category: 'compliance-audit', cloud: 'aws',
    roleA: { id: 'awscloudtrail-fullaccess', name: 'AWSCloudTrail_FullAccess', cloud: 'aws' },
    roleB: { id: 'cloudwatchlogsfullaccess', name: 'CloudWatchLogsFullAccess', cloud: 'aws' },
    rationale: 'Quando o CloudTrail entrega eventos ao CloudWatch Logs, é ali que ficam os alarmes de segurança da conta. AWSCloudTrail_FullAccess controla a origem; CloudWatchLogsFullAccess inclui logs:DeleteLogGroup e logs:DeleteLogStream, ou seja, o destino. A trilha e o repositório sob a mesma identidade removem a redundância que tornaria a supressão detectável.',
    risk: 'Perda de evidência em duas camadas ao mesmo tempo, deixando apenas o bucket S3 da trilha — que muitas contas não configuram com Object Lock, e que pode estar na mesma conta.',
    mitigation: [
      'Entregar CloudTrail a um bucket S3 em conta separada, com Object Lock em modo compliance.',
      'Aplicar SCP negando logs:DeleteLogGroup nos log groups de auditoria.',
      'Definir retenção explícita nos log groups de segurança e alertar sobre qualquer redução dela.',
      'Segregar a operação de observabilidade da administração da trilha de auditoria.',
    ],
    references: [
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html',
      'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'PCI-DSS'],
  },

  // ── AWS: dados e credenciais ───────────────────────────────────────────
  {
    id: 'aws-secretsmanager-kms-poweruser',
    name: 'SecretsManagerReadWrite + AWSKeyManagementServicePowerUser',
    description: 'Ler e escrever os segredos e operar as chaves que os cifram — custódia única.',
    severity: 'high', category: 'data-access', cloud: 'aws',
    roleA: { id: 'secretsmanagerreadwrite', name: 'SecretsManagerReadWrite', cloud: 'aws' },
    roleB: { id: 'awskeymanagementservicepoweruser', name: 'AWSKeyManagementServicePowerUser', cloud: 'aws' },
    rationale: 'A proteção de um segredo no Secrets Manager depende de duas autorizações distintas: acesso ao segredo e acesso à chave KMS que o cifra. É por isso que a AWS permite que a key policy seja gerida por um time diferente do que gere o segredo. Quando a mesma identidade tem as duas, a cifra deixa de ser um controle de acesso e vira só armazenamento.',
    risk: 'Extração de credenciais de banco, chaves de API e tokens de integração por uma única identidade, sem que nenhuma segunda autorização precise ser obtida ou registrada.',
    mitigation: [
      'Manter a key policy do KMS sob custódia de uma equipe de segurança, separada de quem opera os segredos.',
      'Usar chaves gerenciadas pelo cliente com key policy explícita, em vez da chave padrão do serviço.',
      'Ativar rotação de segredo e alertar sobre GetSecretValue em volume atípico ou fora de horário.',
      'Auditar Decrypt no CloudTrail para as chaves que cifram segredos de produção.',
    ],
    references: [
      'https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-best-practices.html',
      'https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'PCI-DSS', 'LGPD'],
  },
  {
    id: 'aws-macie-s3-fullaccess',
    name: 'AmazonMacieFullAccess + AmazonS3FullAccess',
    description: 'Controlar os buckets e também a ferramenta que descobre o que há de sensível neles.',
    severity: 'medium', category: 'data-access', cloud: 'aws',
    roleA: { id: 'amazonmaciefullaccess', name: 'AmazonMacieFullAccess', cloud: 'aws' },
    roleB: { id: 'amazons3fullaccess', name: 'AmazonS3FullAccess', cloud: 'aws' },
    rationale: 'O Macie existe para dizer, de fora, quais buckets contêm dado pessoal ou sensível — é um controle de descoberta, não de operação. AmazonMacieFullAccess permite desabilitar o Macie, alterar o escopo dos jobs de descoberta e suprimir achados. AmazonS3FullAccess controla os buckets. Quem tem as duas decide simultaneamente onde o dado fica e se alguém vai saber disso.',
    risk: 'Dado regulado num bucket fora do escopo de descoberta — o inventário de dados pessoais fica incompleto sem que nada apareça como falha, o que é problema direto de LGPD e GDPR.',
    mitigation: [
      'Administrar o Macie por conta delegada de segurança, com escopo de descoberta definido fora das equipes que operam storage.',
      'Revisar periodicamente quais buckets estão excluídos dos jobs de classificação e por quê.',
      'Alertar sobre criação de bucket sem as tags de classificação de dado exigidas pela política interna.',
      'Ativar S3 Block Public Access no nível da conta, por SCP.',
    ],
    references: [
      'https://docs.aws.amazon.com/macie/latest/user/security-best-practices.html',
      'https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html',
    ],
    frameworks: ['ISO27001', 'LGPD', 'GDPR', 'PCI-DSS'],
  },
  {
    id: 'aws-backup-fullaccess-s3-fullaccess',
    name: 'AWSBackupFullAccess + AmazonS3FullAccess',
    description: 'Restaurar um ponto de recuperação e escolher o destino da restauração.',
    severity: 'medium', category: 'data-access', cloud: 'aws',
    roleA: { id: 'awsbackupfullaccess', name: 'AWSBackupFullAccess', cloud: 'aws' },
    roleB: { id: 'amazons3fullaccess', name: 'AmazonS3FullAccess', cloud: 'aws' },
    rationale: 'O backup é uma cópia integral do dado de produção, e a operação de restore é um caminho de leitura que não passa pelos controles de acesso do recurso original. AWSBackupFullAccess permite iniciar restores e apagar recovery points; AmazonS3FullAccess controla o destino. A combinação transforma continuidade em via de acesso a dado.',
    risk: 'Exfiltração por restore para um bucket sob controle do operador — o evento aparece no CloudTrail como operação de recuperação, que costuma estar fora da lista de alertas.',
    mitigation: [
      'Segregar a operação de backup/restore da administração de storage.',
      'Usar cofre de backup com Vault Lock em contas separadas, e restore apenas mediante chamado aprovado.',
      'Alertar sobre StartRestoreJob e DeleteRecoveryPoint, com revisão do destino declarado.',
      'Cifrar os cofres com chave gerenciada pelo cliente cuja key policy esteja fora do alcance do operador de backup.',
    ],
    references: ['https://docs.aws.amazon.com/aws-backup/latest/devguide/security-considerations.html'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'aws-datascientist-s3-fullaccess',
    name: 'DataScientist + AmazonS3FullAccess',
    description: 'Consultar os dados com Athena e Glue e também controlar os buckets de onde eles vêm.',
    severity: 'medium', category: 'data-access', cloud: 'aws',
    roleA: { id: 'datascientist', name: 'DataScientist', cloud: 'aws' },
    roleB: { id: 'amazons3fullaccess', name: 'AmazonS3FullAccess', cloud: 'aws' },
    rationale: 'DataScientist é a policy de job function que a AWS publica para quem consome dado analítico: Athena, Glue, SageMaker, EMR. Ela pressupõe que o acesso ao dado bruto seja concedido separadamente, por bucket, para que a curadoria fique com quem é dono do dado. AmazonS3FullAccess remove essa curadoria: o consumidor passa a poder ler e alterar qualquer bucket da conta, inclusive os que ninguém liberou para análise.',
    risk: 'Uso de dado pessoal ou regulado em análise sem passar por aprovação de privacidade, porque não há um dono de dado no caminho — e a política de retenção do bucket original deixa de valer para as cópias derivadas.',
    mitigation: [
      'Conceder acesso a dado analítico por bucket e prefixo, nunca por AmazonS3FullAccess.',
      'Usar Lake Formation ou S3 Access Grants para que a autorização de dado seja um artefato revisável.',
      'Registrar acesso a dados no S3 e revisar quem lê buckets classificados como sensíveis.',
      'Exigir aprovação de privacidade registrada antes de conectar uma fonte a um ambiente analítico.',
    ],
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html',
      'https://docs.aws.amazon.com/lake-formation/latest/dg/security-data-access.html',
    ],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'aws-rds-fullaccess-s3-fullaccess',
    name: 'AmazonRDSFullAccess + AmazonS3FullAccess',
    description: 'Exportar um snapshot de banco e controlar o bucket para onde ele vai.',
    severity: 'medium', category: 'data-access', cloud: 'aws',
    roleA: { id: 'amazonrdsfullaccess', name: 'AmazonRDSFullAccess', cloud: 'aws' },
    roleB: { id: 'amazons3fullaccess', name: 'AmazonS3FullAccess', cloud: 'aws' },
    rationale: 'AmazonRDSFullAccess permite criar snapshots, exportá-los para o S3 e restaurar instâncias a partir deles. A exportação é um caminho de leitura do conteúdo do banco que não passa por nenhuma credencial de banco de dados nem pelas permissões definidas dentro dele. AmazonS3FullAccess controla o destino. Juntas, produzem acesso completo ao dado sem nenhum login no banco.',
    risk: 'Cópia integral de base de produção — com dados pessoais — para um bucket sob controle do operador, sem que qualquer controle do lado do banco seja acionado.',
    mitigation: [
      'Restringir a exportação de snapshot por condição de IAM, limitando os buckets de destino permitidos.',
      'Cifrar snapshots com chave gerenciada pelo cliente cuja key policy exclua o operador de banco.',
      'Alertar sobre StartExportTask, CopyDBSnapshot para outra conta e ModifyDBSnapshotAttribute tornando o snapshot público.',
      'Segregar operação de banco de administração de storage.',
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html',
      'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.Security.html',
    ],
    frameworks: ['ISO27001', 'PCI-DSS', 'LGPD', 'GDPR'],
  },

  // ── AWS: financeiro ────────────────────────────────────────────────────
  {
    id: 'aws-billing-organizations',
    name: 'Billing + AWSOrganizationsFullAccess',
    description: 'Criar contas novas e gerenciar a fatura delas, sem passar por suprimentos.',
    severity: 'high', category: 'financial-control', cloud: 'aws',
    roleA: { id: 'billing', name: 'Billing', cloud: 'aws' },
    roleB: { id: 'awsorganizationsfullaccess', name: 'AWSOrganizationsFullAccess', cloud: 'aws' },
    rationale: 'AWSOrganizationsFullAccess permite criar contas AWS sob a organização — cada uma passa a consumir e a gerar despesa consolidada. A policy Billing dá acesso à faturação, métodos de pagamento e relatórios de custo. O ciclo criar-o-que-gasta e administrar-a-conta-que-paga é o mesmo ciclo requisitar/aprovar que o controle financeiro separa por princípio.',
    risk: 'Despesa recorrente criada e conciliada pela mesma pessoa — a divergência só aparece no fechamento contábil, quando a conta já rodou por meses.',
    mitigation: [
      'Manter a criação de contas num processo de plataforma com aprovação de suprimentos, idealmente via Control Tower Account Factory.',
      'Segregar quem administra a organização de quem administra faturamento na conta de gestão.',
      'Definir budgets com alerta por OU e revisar contas novas no fechamento mensal.',
      'Alertar sobre CreateAccount e sobre alteração de método de pagamento.',
    ],
    references: [
      'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html',
      'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/control-access-billing.html',
    ],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'aws-billing-marketplace',
    name: 'Billing + AWSMarketplaceFullAccess',
    description: 'Assinar produtos pagos de terceiros e administrar a fatura em que eles aparecem.',
    severity: 'medium', category: 'financial-control', cloud: 'aws',
    roleA: { id: 'billing', name: 'Billing', cloud: 'aws' },
    roleB: { id: 'awsmarketplacefullaccess', name: 'AWSMarketplaceFullAccess', cloud: 'aws' },
    rationale: 'AWSMarketplaceFullAccess permite assinar, aceitar termos e lançar produtos de terceiros, gerando compromisso financeiro imediato e, muitas vezes, contratos de vários anos. A policy Billing administra a fatura em que essa despesa aparece. Comprar e conciliar na mesma pessoa é a definição do conflito que o controle de compras existe para evitar.',
    risk: 'Contratação de software de terceiro sem passar por suprimentos nem por avaliação de risco de fornecedor, com a despesa diluída na fatura consolidada da AWS.',
    mitigation: [
      'Usar Private Marketplace, restringindo o que pode ser assinado a um catálogo aprovado.',
      'Segregar a assinatura de produtos da administração de faturamento.',
      'Exigir avaliação de fornecedor registrada antes de qualquer nova assinatura do Marketplace.',
      'Revisar as assinaturas ativas no fechamento mensal, contra a lista aprovada.',
    ],
    references: ['https://docs.aws.amazon.com/marketplace/latest/buyerguide/private-marketplace.html'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'aws-billing-accountmanagement',
    name: 'Billing + AWSAccountManagementFullAccess',
    description: 'Alterar quem recebe o alerta de cobrança e alterar a própria cobrança.',
    severity: 'medium', category: 'financial-control', cloud: 'aws',
    roleA: { id: 'billing', name: 'Billing', cloud: 'aws' },
    roleB: { id: 'awsaccountmanagementfullaccess', name: 'AWSAccountManagementFullAccess', cloud: 'aws' },
    rationale: 'AWSAccountManagementFullAccess permite alterar os contatos alternativos da conta — inclusive o contato de faturamento e o de segurança, que são para onde a AWS envia notificação quando algo relevante acontece. A policy Billing administra pagamento e relatórios. Quem controla os dois pode redirecionar a notificação para longe de quem deveria conferi-la.',
    risk: 'A notificação de cobrança ou de incidente deixa de chegar a quem tem a obrigação de revisá-la, e a alteração do contato não costuma estar em nenhuma lista de alertas.',
    mitigation: [
      'Definir os contatos alternativos por Organizations, a partir da conta de gestão, e bloquear alteração local por SCP.',
      'Usar caixas de e-mail de grupo, nunca endereços pessoais, nos contatos de faturamento e segurança.',
      'Alertar sobre PutAlternateContact e revisar os contatos de todas as contas trimestralmente.',
    ],
    references: ['https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-update-contact-alternate.html'],
    frameworks: ['SOX', 'ISO27001'],
  },

  // ── AWS: infraestrutura e entrega ──────────────────────────────────────
  {
    id: 'aws-systemadministrator-networkadministrator',
    name: 'SystemAdministrator + NetworkAdministrator',
    description: 'Operar a carga e também definir a fronteira de rede que a contém.',
    severity: 'high', category: 'security-operations', cloud: 'aws',
    roleA: { id: 'systemadministrator', name: 'SystemAdministrator', cloud: 'aws' },
    roleB: { id: 'networkadministrator', name: 'NetworkAdministrator', cloud: 'aws' },
    rationale: 'A AWS publica as duas como job functions distintas de propósito: SystemAdministrator opera instâncias, automação e implantação; NetworkAdministrator define VPC, sub-redes, rotas, security groups e gateways. A separação é o que garante que expor um serviço à internet exija duas pessoas. Acumuladas, quem sobe a carga também abre a porta para ela.',
    risk: 'Exposição de serviço interno à internet, ou criação de rota de saída para exfiltração, sem que nenhuma equipe de rede participe da decisão — e mudanças de security group raramente passam por revisão de mudança.',
    mitigation: [
      'Manter a separação de job functions que a AWS já publica, alocando as duas policies a equipes diferentes.',
      'Definir a topologia de rede como código, com revisão obrigatória, e negar alteração manual por SCP.',
      'Alertar sobre AuthorizeSecurityGroupIngress com 0.0.0.0/0 e sobre criação de internet gateway ou peering.',
      'Rodar IAM Access Analyzer e Network Access Analyzer para detectar caminhos de acesso não intencionais.',
    ],
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html',
      'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'aws-codepipeline-lambda-fullaccess',
    name: 'AWSCodePipeline_FullAccess + AWSLambda_FullAccess',
    description: 'Definir a esteira de entrega e também publicar código direto em produção, contornando-a.',
    severity: 'high', category: 'application-management', cloud: 'aws',
    roleA: { id: 'awscodepipeline-fullaccess', name: 'AWSCodePipeline_FullAccess', cloud: 'aws' },
    roleB: { id: 'awslambda-fullaccess', name: 'AWSLambda_FullAccess', cloud: 'aws' },
    rationale: 'A esteira existe para que código só chegue a produção depois de teste, aprovação e registro. AWSCodePipeline_FullAccess permite criar e alterar pipelines, inclusive remover estágios de aprovação manual. AWSLambda_FullAccess permite publicar o código da função diretamente, sem pipeline nenhum. Com as duas, a esteira deixa de ser um controle e vira uma convenção: quem não quiser passar por ela, não passa.',
    risk: 'Código não revisado em produção, ou alteração do pipeline para remover a aprovação — nos dois casos o artefato em execução deixa de corresponder ao que foi aprovado.',
    mitigation: [
      'Negar lambda:UpdateFunctionCode em produção para qualquer principal que não seja a role da esteira.',
      'Segregar quem administra o pipeline de quem desenvolve a função.',
      'Exigir aprovação manual no pipeline de produção e alertar sobre alteração da definição do pipeline.',
      'Comparar periodicamente o hash do código publicado com o artefato do último build aprovado.',
    ],
    references: [
      'https://docs.aws.amazon.com/codepipeline/latest/userguide/security-iam.html',
      'https://docs.aws.amazon.com/lambda/latest/dg/security-iam.html',
    ],
    frameworks: ['SOX', 'ISO27001', 'CIS'],
  },
  {
    id: 'aws-codebuild-codedeploy',
    name: 'AWSCodeBuildAdminAccess + AWSCodeDeployFullAccess',
    description: 'Construir o artefato e implantá-lo — sem ninguém entre o build e a produção.',
    severity: 'medium', category: 'application-management', cloud: 'aws',
    roleA: { id: 'awscodebuildadminaccess', name: 'AWSCodeBuildAdminAccess', cloud: 'aws' },
    roleB: { id: 'awscodedeployfullaccess', name: 'AWSCodeDeployFullAccess', cloud: 'aws' },
    rationale: 'AWSCodeBuildAdminAccess permite criar e alterar projetos de build — inclusive o buildspec, que é o script executado com a service role do projeto. AWSCodeDeployFullAccess permite criar deployments e alterar grupos de implantação. Quem controla o que é construído e onde é implantado fecha o ciclo de entrega numa única pessoa, e o buildspec é um vetor de execução arbitrária com o privilégio da service role.',
    risk: 'Artefato alterado no build e implantado em produção sem que a mudança apareça no repositório de código — a revisão de código não vê o buildspec, e a revisão de implantação não vê o conteúdo do artefato.',
    mitigation: [
      'Versionar o buildspec no repositório e negar sua definição inline no projeto de build.',
      'Restringir a service role do CodeBuild ao mínimo, sem permissão de implantação.',
      'Segregar a administração de build da administração de implantação.',
      'Exigir aprovação para deployment em grupo de produção e registrar quem aprovou.',
    ],
    references: ['https://docs.aws.amazon.com/codebuild/latest/userguide/security.html'],
    frameworks: ['SOX', 'ISO27001', 'CIS'],
  },
  // ═══════════════════════════════════════════════════════════════════════
  // GCP IAM — predefined roles
  //
  // No GCP a concessão é (principal, role, recurso) numa allow policy, e a
  // herança desce pela hierarquia organização → pasta → projeto → recurso.
  // Uma regra abaixo trata do acúmulo de duas roles pelo MESMO principal;
  // se as duas foram concedidas em escopos diferentes e o recurso de risco
  // está sob apenas um deles, o conflito pode não se materializar. Escopo é
  // ambiente, não catálogo.
  //
  // Duas particularidades do GCP aparecem várias vezes aqui e valem dito uma
  // vez: (1) a service account é ao mesmo tempo identidade e recurso, então
  // "quem pode usá-la" é uma concessão de IAM como outra qualquer — e é o
  // principal caminho de escalonamento da plataforma; (2) as basic roles
  // (Owner/Editor/Viewer) são anteriores ao IAM granular e o próprio Google
  // desaconselha seu uso em produção.
  // ═══════════════════════════════════════════════════════════════════════

  // ── GCP: service accounts e escalonamento ──────────────────────────────
  {
    id: 'gcp-serviceaccountadmin-serviceaccountkeyadmin',
    name: 'Service Account Admin + Service Account Key Admin',
    description: 'Criar a service account e emitir para ela uma chave JSON de longa duração.',
    severity: 'critical', category: 'identity-management', cloud: 'gcp',
    roleA: { id: 'iam-serviceaccountadmin', name: 'Service Account Admin', cloud: 'gcp' },
    roleB: { id: 'iam-serviceaccountkeyadmin', name: 'Service Account Key Admin', cloud: 'gcp' },
    rationale: 'Uma chave de service account é uma credencial que não expira, não tem MFA e vale fora do perímetro do Google. O Google separa as duas roles justamente porque criar a identidade e emitir a credencial dela são decisões distintas: a primeira é organização, a segunda é risco. Acumuladas, uma identidade produz do zero uma credencial permanente e a leva para onde quiser.',
    risk: 'Persistência que sobrevive ao offboarding de quem a criou. A chave não aparece em revisão de acesso de usuários, não expira, e o uso dela nos logs é indistinguível do uso legítimo da service account.',
    mitigation: [
      'Aplicar a constraint de organização iam.disableServiceAccountKeyCreation e abrir exceção por projeto, com justificativa e validade.',
      'Preferir Workload Identity Federation e impersonation de curta duração à chave JSON.',
      'Segregar a criação de service accounts da emissão de chaves.',
      'Inventariar chaves existentes e sua idade; alertar sobre CreateServiceAccountKey.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/best-practices-service-accounts',
      'https://cloud.google.com/resource-manager/docs/organization-policy/restricting-service-accounts',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-serviceaccountadmin-serviceaccountuser',
    name: 'Service Account Admin + Service Account User',
    description: 'Criar uma service account privilegiada e poder agir como ela.',
    severity: 'critical', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'iam-serviceaccountadmin', name: 'Service Account Admin', cloud: 'gcp' },
    roleB: { id: 'iam-serviceaccountuser', name: 'Service Account User', cloud: 'gcp' },
    rationale: 'Service Account User concede iam.serviceAccounts.actAs — anexar a service account a um recurso e, com isso, executar código com o privilégio dela. Service Account Admin permite criar service accounts e gerir a política delas. Somadas, o privilégio efetivo da pessoa deixa de ser o das roles concedidas a ela: passa a ser o da service account mais forte que ela consiga criar ou alcançar.',
    risk: 'Escalonamento sem alteração visível na allow policy do próprio usuário — a revisão de acesso continua mostrando um perfil modesto enquanto a execução acontece com privilégio de service account.',
    mitigation: [
      'Conceder Service Account User no escopo da service account específica, nunca no projeto inteiro.',
      'Segregar quem cria service accounts de quem pode agir como elas.',
      'Auditar com Policy Analyzer quem tem actAs sobre service accounts com role de Editor ou Owner.',
      'Alertar sobre SetIamPolicy em service accounts adicionando roles/iam.serviceAccountUser.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/service-account-permissions',
      'https://cloud.google.com/iam/docs/best-practices-service-accounts',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-securityadmin-serviceaccounttokencreator',
    name: 'Security Admin + Service Account Token Creator',
    description: 'Conceder a si mesmo o direito de personificar uma service account e depois gerar o token.',
    severity: 'critical', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'iam-securityadmin', name: 'Security Admin', cloud: 'gcp' },
    roleB: { id: 'iam-serviceaccounttokencreator', name: 'Service Account Token Creator', cloud: 'gcp' },
    rationale: 'Security Admin concede setIamPolicy — pode alterar a allow policy de qualquer recurso do escopo, inclusive a de uma service account. Service Account Token Creator gera tokens de acesso e OpenID em nome da service account. O caminho fecha em duas chamadas: conceder a si mesmo Token Creator sobre a service account mais privilegiada, e emitir o token.',
    risk: 'Privilégio de Owner obtido por impersonation, sem que nenhuma role privilegiada tenha sido concedida ao usuário — o log registra geração de token, não escalonamento.',
    mitigation: [
      'Restringir Security Admin a um escopo mínimo e usar Privileged Access Manager para concessão temporária.',
      'Alertar sobre SetIamPolicy que adiciona serviceAccountTokenCreator ou serviceAccountUser.',
      'Monitorar generateAccessToken nos Data Access logs, correlacionando com o principal de origem.',
      'Segregar quem administra política de IAM de quem opera cargas que precisam de impersonation.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/service-account-impersonation',
      'https://cloud.google.com/iam/docs/audit-logging',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-roleadmin-securityadmin',
    name: 'Role Administrator + Security Admin',
    description: 'Escrever o conteúdo da custom role e também concedê-la.',
    severity: 'critical', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'iam-roleadmin', name: 'Role Administrator', cloud: 'gcp' },
    roleB: { id: 'iam-securityadmin', name: 'Security Admin', cloud: 'gcp' },
    rationale: 'Role Administrator define quais permissões uma custom role contém; Security Admin decide quem a recebe. A separação é o que faz uma revisão de acesso significar alguma coisa: o revisor olha o nome da role concedida e confia que o conteúdo dela foi definido por outra pessoa. Quem tem as duas pode adicionar uma permissão sensível a uma custom role de nome inocente e concedê-la sem que o nome mude.',
    risk: 'Escalonamento que não aparece no diff da allow policy — a concessão é a mesma de sempre; o que mudou foi o que a role faz.',
    mitigation: [
      'Segregar a autoria de custom roles da concessão de acesso.',
      'Versionar as definições de custom role fora do console e alertar sobre UpdateRole.',
      'Preferir predefined roles; tratar cada custom role como artefato com dono e revisão.',
      'Revisar periodicamente o conteúdo das custom roles, não só quem as tem.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/creating-custom-roles',
      'https://cloud.google.com/iam/docs/roles-overview',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-orgpolicyadmin-securityadmin',
    name: 'Organization Policy Administrator + Security Admin',
    description: 'Remover a restrição de organização que limita a concessão e, em seguida, conceder.',
    severity: 'critical', category: 'security-operations', cloud: 'gcp',
    roleA: { id: 'orgpolicy-policyadmin', name: 'Organization Policy Administrator', cloud: 'gcp' },
    roleB: { id: 'iam-securityadmin', name: 'Security Admin', cloud: 'gcp' },
    rationale: 'As organization policies são o teto acima do IAM no GCP: constraints como iam.allowedPolicyMemberDomains (que impede conceder acesso a fora do domínio), iam.disableServiceAccountKeyCreation e as de rede. Organization Policy Administrator pode alterá-las; Security Admin concede o acesso que elas limitariam. Com as duas, o teto deixa de ser externo — quem esbarra nele o remove.',
    risk: 'Concessão a um principal de fora do domínio corporativo, ou criação de chave de service account onde a política proibia — a violação some porque a política foi ajustada antes.',
    mitigation: [
      'Manter Organization Policy Administrator no nível da organização, com um punhado de identidades e MFA obrigatório.',
      'Segregar a administração de organization policies da administração de IAM.',
      'Alertar sobre qualquer alteração de organization policy, tratando-a como mudança de controle e não de configuração.',
      'Revisar mensalmente as exceções (policies sobrescritas em pastas e projetos).',
    ],
    references: [
      'https://cloud.google.com/resource-manager/docs/organization-policy/overview',
      'https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-privilegedaccessmanager-securityadmin',
    name: 'Privileged Access Manager Admin + Security Admin',
    description: 'Definir as concessões elegíveis e os aprovadores — e poder conceder direto, contornando o próprio PAM.',
    severity: 'critical', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'privilegedaccessmanager-admin', name: 'Privileged Access Manager Admin', cloud: 'gcp' },
    roleB: { id: 'iam-securityadmin', name: 'Security Admin', cloud: 'gcp' },
    rationale: 'O Privileged Access Manager existe para que acesso privilegiado seja temporário, justificado e aprovado por outra pessoa. PAM Admin define os direitos elegíveis, a duração e quem aprova. Security Admin concede acesso permanente direto na allow policy. Ter as duas anula o PAM duas vezes: dá para se colocar como aprovador e, se isso incomodar, dá para pular o PAM inteiro.',
    risk: 'A organização acredita que o acesso privilegiado é just-in-time e aprovado, enquanto existe um caminho permanente ao lado — e o relatório do PAM não mostra o que foi concedido fora dele.',
    mitigation: [
      'Segregar quem administra o PAM de quem tem setIamPolicy no mesmo escopo.',
      'Restringir Security Admin a escopos onde o PAM não seja o controle principal.',
      'Reconciliar periodicamente as concessões da allow policy contra as concessões registradas no PAM.',
      'Exigir que aprovadores do PAM sejam de área distinta do solicitante.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/pam-overview',
      'https://cloud.google.com/iam/docs/roles-overview',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-workloadidentitypooladmin-serviceaccountadmin',
    name: 'IAM Workload Identity Pool Admin + Service Account Admin',
    description: 'Federar uma identidade externa e criar a service account que ela vai assumir.',
    severity: 'critical', category: 'identity-management', cloud: 'gcp',
    roleA: { id: 'iam-workloadidentitypooladmin', name: 'IAM Workload Identity Pool Admin Beta', cloud: 'gcp' },
    roleB: { id: 'iam-serviceaccountadmin', name: 'Service Account Admin', cloud: 'gcp' },
    rationale: 'O Workload Identity Federation permite que uma carga de fora do Google — outra cloud, um runner de CI, um cluster — troque um token do provedor dela por credencial do GCP. Quem administra o pool define qual provedor é confiável e como os atributos externos são mapeados; quem administra service accounts define o que a identidade resultante pode fazer. Juntas, uma pessoa estabelece confiança num emissor externo e cria o destino privilegiado dessa confiança.',
    risk: 'Uma identidade de fora da organização — inclusive de uma conta pessoal em outra cloud — obtém acesso ao GCP por um caminho que nenhuma revisão de usuários cobre, porque não existe usuário.',
    mitigation: [
      'Exigir condição de atributo restritiva em todo provedor de workload identity; nunca mapear o principal inteiro sem filtro.',
      'Segregar a administração de federação da administração de service accounts.',
      'Revisar periodicamente os pools e provedores existentes, e qual emissor externo cada um confia.',
      'Alertar sobre CreateWorkloadIdentityPoolProvider e sobre alteração de attribute mapping.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/workload-identity-federation',
      'https://cloud.google.com/iam/docs/best-practices-service-accounts',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },

  // ── GCP: hierarquia, faturamento e supervisão ──────────────────────────
  {
    id: 'gcp-orgadmin-billingadmin',
    name: 'Organization Administrator + Billing Account Administrator',
    description: 'Criar projetos e vinculá-los a uma conta de faturamento — despesa aprovada por quem a cria.',
    severity: 'critical', category: 'financial-control', cloud: 'gcp',
    roleA: { id: 'resourcemanager-organizationadmin', name: 'Organization Administrator', cloud: 'gcp' },
    roleB: { id: 'billing-admin', name: 'Billing Account Administrator', cloud: 'gcp' },
    rationale: 'O Google separa a hierarquia de recursos da conta de faturamento justamente para que criar um projeto e fazê-lo gerar despesa sejam decisões de pessoas diferentes — é por isso que vincular projeto a billing account exige permissão nos dois lados. Organization Administrator administra a hierarquia inteira; Billing Account Administrator administra a conta que paga. Acumuladas, o freio financeiro deixa de existir.',
    risk: 'Projetos criados e faturados sem passar por nenhuma aprovação — e, no limite, um projeto fora da hierarquia governada, com as organization policies não aplicadas.',
    mitigation: [
      'Manter a administração de faturamento numa equipe financeira, separada da administração da organização.',
      'Usar Project Creator com escopo de pasta em vez de Organization Administrator para criação rotineira.',
      'Definir budgets com alerta por pasta e revisar projetos novos no fechamento mensal.',
      'Alertar sobre UpdateProjectBillingInfo e sobre criação de projeto fora das pastas aprovadas.',
    ],
    references: [
      'https://cloud.google.com/billing/docs/how-to/billing-access',
      'https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy',
    ],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'gcp-projectcreator-billingadmin',
    name: 'Project Creator + Billing Account Administrator',
    description: 'Criar o projeto e ligá-lo ao faturamento no mesmo ato.',
    severity: 'high', category: 'financial-control', cloud: 'gcp',
    roleA: { id: 'resourcemanager-projectcreator', name: 'Project Creator', cloud: 'gcp' },
    roleB: { id: 'billing-admin', name: 'Billing Account Administrator', cloud: 'gcp' },
    rationale: 'Project Creator é a role de rotina para quem abre projetos; ela deliberadamente não inclui vincular faturamento. Billing Account Administrator inclui. A soma cria o ciclo requisitar/aprovar dentro de uma pessoa: o projeto nasce, é vinculado e começa a consumir sem que ninguém tenha autorizado a despesa.',
    risk: 'Consumo não orçado que só aparece na fatura consolidada, e projetos sem dono financeiro claro — o padrão mais comum de desperdício em GCP.',
    mitigation: [
      'Conceder Billing Account User (que permite vincular a uma conta específica) em vez de Billing Account Administrator para o fluxo de criação.',
      'Exigir label de centro de custo em todo projeto novo, validado por organization policy.',
      'Segregar criação de projeto de administração de faturamento.',
      'Revisar mensalmente projetos criados e seu consumo contra o orçamento aprovado.',
    ],
    references: ['https://cloud.google.com/billing/docs/how-to/billing-access'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'gcp-owner-securityreviewer',
    name: 'Owner + Security Reviewer',
    description: 'A role de revisão de acesso nas mãos de quem detém a basic role mais ampla do projeto.',
    severity: 'high', category: 'compliance-audit', cloud: 'gcp',
    roleA: { id: 'owner', name: 'Owner', cloud: 'gcp' },
    roleB: { id: 'iam-securityreviewer', name: 'Security Reviewer', cloud: 'gcp' },
    rationale: 'Security Reviewer existe para dar a auditores a leitura de todas as allow policies do escopo, sem poder alterá-las — é a role desenhada para revisão de acesso independente. Owner já lê tudo e ainda concede, então somá-la não adiciona permissão: adiciona apenas a aparência de um revisor. Um inventário que pergunte "quem revisa o IAM deste projeto" encontra o dono dele.',
    risk: 'A revisão de acesso perde a independência que a torna evidência de controle — e a organização não procura por um revisor de verdade porque acredita já ter um.',
    mitigation: [
      'Reservar Security Reviewer para auditoria interna e times de risco, sem sobreposição com Owner ou Security Admin.',
      'Abandonar as basic roles em produção: o próprio Google desaconselha Owner/Editor/Viewer fora de ambiente de teste.',
      'Rodar a revisão com Policy Analyzer a partir de um principal sem permissão de escrita.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/roles-overview',
      'https://cloud.google.com/policy-intelligence/docs/policy-analyzer-overview',
    ],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'gcp-securityadmin-logging-admin',
    name: 'Security Admin + Logging Admin',
    description: 'Alterar quem tem acesso e poder apagar o registro dessa alteração.',
    severity: 'critical', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'iam-securityadmin', name: 'Security Admin', cloud: 'gcp' },
    roleB: { id: 'logging-admin', name: 'Logging Admin', cloud: 'gcp' },
    rationale: 'Security Admin altera allow policies. Logging Admin administra sinks, exclusões e buckets de log — inclusive o _Required, que guarda os Admin Activity audit logs, e as exclusion rules, que descartam entradas antes de serem gravadas. Concentrar as duas dá o par completo: conceder e descartar o registro da concessão.',
    risk: 'Escalonamento sem trilha recuperável. A exclusion rule é o caminho mais silencioso: nada é apagado, as entradas simplesmente nunca chegam — e a configuração dela raramente está sob monitoramento.',
    mitigation: [
      'Exportar audit logs para um projeto de log dedicado, com sink no nível da organização e acesso restrito.',
      'Alertar sobre criação e alteração de exclusion rules e sobre DeleteSink e DeleteBucket em logging.',
      'Segregar a administração de IAM da administração de observabilidade.',
      'Ativar Data Access logs para os serviços críticos e proteger a configuração deles por organization policy.',
    ],
    references: [
      'https://cloud.google.com/logging/docs/audit',
      'https://cloud.google.com/logging/docs/routing/overview',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'gcp-securitycenter-logging-admin',
    name: 'Security Center Admin + Logging Admin',
    description: 'Silenciar o achado e apagar a fonte que o gerou.',
    severity: 'high', category: 'security-operations', cloud: 'gcp',
    roleA: { id: 'securitycenter-admin', name: 'Security Center Admin', cloud: 'gcp' },
    roleB: { id: 'logging-admin', name: 'Logging Admin', cloud: 'gcp' },
    rationale: 'O Security Command Center agrega achados de configuração e ameaça; Security Center Admin pode criar regras de silenciamento, marcar achados como resolvidos e alterar módulos de detecção. Logging Admin controla o log que alimenta boa parte dessas detecções. Duas formas independentes de fazer o mesmo sinal desaparecer, nas mãos de uma pessoa.',
    risk: 'Postura de segurança reportada que não corresponde ao ambiente: achados silenciados na camada de apresentação e a fonte descartada na camada de coleta.',
    mitigation: [
      'Administrar o SCC no nível da organização, com as equipes de projeto sem permissão de silenciar achados.',
      'Revisar mensalmente as mute rules ativas, com justificativa e validade em cada uma.',
      'Segregar operação de segurança de administração de logging.',
      'Alertar sobre criação de mute rule e sobre desativação de módulo de detecção.',
    ],
    references: [
      'https://cloud.google.com/security-command-center/docs/how-to-mute-findings',
      'https://cloud.google.com/logging/docs/audit',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-logging-admin-privatelogviewer',
    name: 'Logging Admin + Private Logs Viewer',
    description: 'Administrar a retenção dos logs e ler o conteúdo dos Data Access logs.',
    severity: 'medium', category: 'compliance-audit', cloud: 'gcp',
    roleA: { id: 'logging-admin', name: 'Logging Admin', cloud: 'gcp' },
    roleB: { id: 'logging-privatelogviewer', name: 'Private Logs Viewer', cloud: 'gcp' },
    rationale: 'Private Logs Viewer é a role que dá acesso aos Data Access logs — o registro de quem leu qual dado, que costuma conter identificadores e é tratado à parte justamente por isso. Logging Admin decide a retenção, os sinks e as exclusões. Quem administra o repositório e também lê o conteúdo sensível dele concentra a leitura mais delicada da plataforma sem nenhum contrapeso.',
    risk: 'Consulta a quem acessou o quê sem supervisão, e possibilidade de encurtar a retenção depois — a evidência de acesso indevido some junto com o rastro de quem a consultou.',
    mitigation: [
      'Restringir Private Logs Viewer a investigação formal, com concessão temporária via PAM.',
      'Manter a retenção dos buckets de audit log definida por organization policy, fora do alcance do operador.',
      'Segregar leitura de Data Access logs da administração de logging.',
      'Registrar e revisar quem consultou Data Access logs — a meta-auditoria vale.',
    ],
    references: ['https://cloud.google.com/logging/docs/audit#data-access'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },

  // ── GCP: dados e criptografia ──────────────────────────────────────────
  {
    id: 'gcp-cloudkms-secretmanager-admin',
    name: 'Cloud KMS Admin + Secret Manager Admin',
    description: 'Administrar os segredos e as chaves que os protegem — custódia única.',
    severity: 'high', category: 'data-access', cloud: 'gcp',
    roleA: { id: 'cloudkms-admin', name: 'Cloud KMS Admin', cloud: 'gcp' },
    roleB: { id: 'secretmanager-admin', name: 'Secret Manager Admin', cloud: 'gcp' },
    rationale: 'O Secret Manager pode usar CMEK do Cloud KMS, e é essa separação que faz a cifra ser um controle de acesso e não só armazenamento: o segredo é de um time, a chave é de outro, e ler exige as duas autorizações. Cloud KMS Admin administra chaves e políticas de chave; Secret Manager Admin administra segredos e quem os acessa. Juntas, a segunda autorização vira formalidade.',
    risk: 'Extração de credenciais de produção por uma única identidade, sem que nenhuma outra equipe seja envolvida ou notificada.',
    mitigation: [
      'Manter as chaves KMS num projeto separado, com administração de chave fora da equipe que opera segredos.',
      'Usar CMEK explícita nos segredos de produção, em vez da chave gerenciada pelo Google.',
      'Ativar Data Access logs para Cloud KMS e Secret Manager e alertar sobre AccessSecretVersion atípico.',
      'Alertar sobre DestroyCryptoKeyVersion e sobre alteração da IAM policy da chave.',
    ],
    references: [
      'https://cloud.google.com/secret-manager/docs/cmek',
      'https://cloud.google.com/kms/docs/separation-of-duties',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'PCI-DSS', 'LGPD'],
  },
  {
    id: 'gcp-cloudkms-storage-admin',
    name: 'Cloud KMS Admin + Storage Admin',
    description: 'Controlar a chave CMEK e o bucket que ela cifra.',
    severity: 'high', category: 'data-access', cloud: 'gcp',
    roleA: { id: 'cloudkms-admin', name: 'Cloud KMS Admin', cloud: 'gcp' },
    roleB: { id: 'storage-admin', name: 'Storage Admin', cloud: 'gcp' },
    rationale: 'A separação de funções é o motivo explícito pelo qual o Google recomenda manter as chaves KMS num projeto distinto do dado que elas protegem: quem administra o bucket não deveria administrar a chave. Cloud KMS Admin controla a chave, incluindo destruí-la; Storage Admin controla o bucket e sua IAM policy. Com as duas, cifra e dado ficam sob a mesma decisão.',
    risk: 'Acesso irrestrito a dado cifrado, e a possibilidade oposta — destruir a versão da chave e tornar o dado irrecuperável, que é um vetor de negação de serviço destrutivo e permanente.',
    mitigation: [
      'Manter chaves KMS em projeto próprio, com administração numa equipe de segurança.',
      'Ativar a proteção contra destruição de chave e exigir aprovação de dois para desabilitar versão.',
      'Segregar administração de storage de administração de chave.',
      'Alertar sobre DestroyCryptoKeyVersion, UpdateCryptoKey e alteração de IAM policy de bucket com CMEK.',
    ],
    references: [
      'https://cloud.google.com/kms/docs/separation-of-duties',
      'https://cloud.google.com/storage/docs/encryption/customer-managed-keys',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'PCI-DSS', 'LGPD', 'GDPR'],
  },
  {
    id: 'gcp-bigquery-admin-storage-admin',
    name: 'BigQuery Admin + Storage Admin',
    description: 'Administrar os datasets e também o storage para onde eles podem ser exportados.',
    severity: 'medium', category: 'data-access', cloud: 'gcp',
    roleA: { id: 'bigquery-admin', name: 'BigQuery Admin', cloud: 'gcp' },
    roleB: { id: 'storage-admin', name: 'Storage Admin', cloud: 'gcp' },
    rationale: 'BigQuery Admin administra datasets, tabelas e jobs, incluindo export jobs para o Cloud Storage. Storage Admin controla os buckets de destino e a política de acesso deles. A exportação é um caminho de saída de dado que não passa pelos controles de coluna e linha definidos dentro do BigQuery — e o destino, sob a mesma pessoa, pode ser aberto a quem ela quiser.',
    risk: 'Cópia de dado analítico regulado para um bucket com política própria, escapando do mascaramento de coluna e das políticas de acesso a linha definidas no dataset de origem.',
    mitigation: [
      'Segregar administração de BigQuery de administração de storage.',
      'Restringir buckets de destino de export por organization policy e por VPC Service Controls.',
      'Ativar Data Access logs no BigQuery e alertar sobre export jobs de datasets classificados.',
      'Usar column-level e row-level security e revisar quem consegue contorná-las por export.',
    ],
    references: [
      'https://cloud.google.com/bigquery/docs/access-control',
      'https://cloud.google.com/vpc-service-controls/docs/overview',
    ],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'gcp-dataproc-admin-storage-admin',
    name: 'Dataproc Administrator + Storage Admin',
    description: 'Rodar processamento distribuído com a service account do cluster e controlar o storage que ele lê e escreve.',
    severity: 'medium', category: 'data-access', cloud: 'gcp',
    roleA: { id: 'dataproc-admin', name: 'Dataproc Administrator', cloud: 'gcp' },
    roleB: { id: 'storage-admin', name: 'Storage Admin', cloud: 'gcp' },
    rationale: 'Dataproc Administrator cria clusters e submete jobs que executam com a service account do cluster — normalmente a service account padrão do Compute Engine, que costuma ter permissão ampla no projeto. Storage Admin controla os buckets. A combinação dá execução de código arbitrário com o privilégio da service account do cluster e controle sobre a origem e o destino do dado processado.',
    risk: 'Leitura e cópia de dado em escala com o privilégio de uma service account, sob a aparência de um job analítico legítimo.',
    mitigation: [
      'Usar service account dedicada e mínima para os clusters, nunca a padrão do Compute Engine.',
      'Segregar a operação de clusters de processamento da administração de storage.',
      'Aplicar VPC Service Controls para conter a saída de dado do perímetro analítico.',
      'Alertar sobre criação de cluster com service account de alto privilégio.',
    ],
    references: [
      'https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/service-accounts',
      'https://cloud.google.com/compute/docs/access/service-accounts',
    ],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },

  // ── GCP: infraestrutura, rede e entrega ────────────────────────────────
  {
    id: 'gcp-compute-admin-osadminlogin',
    name: 'Compute Admin + Compute OS Admin Login',
    description: 'Criar a VM com uma service account anexada e entrar nela como root.',
    severity: 'high', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'compute-admin', name: 'Compute Admin', cloud: 'gcp' },
    roleB: { id: 'compute-osadminlogin', name: 'Compute OS Admin Login', cloud: 'gcp' },
    rationale: 'Compute Admin cria instâncias e define qual service account fica anexada a elas. Compute OS Admin Login dá acesso administrativo ao sistema operacional via OS Login. Dentro da VM, o metadata server entrega token da service account anexada sem pedir mais nada. Portanto as duas roles juntas equivalem ao privilégio da service account mais forte que a pessoa consiga anexar.',
    risk: 'Escalonamento pela via da service account anexada: o privilégio efetivo deixa de ser o das roles do usuário e passa a ser o da identidade que ele consegue colocar numa máquina onde tem root.',
    mitigation: [
      'Restringir actAs por service account, controlando quais podem ser anexadas por quem.',
      'Separar quem provisiona instâncias de quem tem acesso administrativo ao sistema operacional.',
      'Não usar a service account padrão do Compute Engine; criar service accounts mínimas por carga.',
      'Ativar OS Login com 2FA e registrar as sessões.',
    ],
    references: [
      'https://cloud.google.com/compute/docs/access/service-accounts',
      'https://cloud.google.com/compute/docs/oslogin',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'gcp-compute-networkadmin-securityadmin',
    name: 'Compute Network Admin + Compute Security Admin',
    description: 'Definir a topologia da rede e as regras de firewall que a protegem.',
    severity: 'high', category: 'security-operations', cloud: 'gcp',
    roleA: { id: 'compute-networkadmin', name: 'Compute Network Admin', cloud: 'gcp' },
    roleB: { id: 'compute-securityadmin', name: 'Compute Security Admin', cloud: 'gcp' },
    rationale: 'O Google separa as duas de propósito: Compute Network Admin cria redes, sub-redes, rotas e VPN, mas não pode alterar regras de firewall; Compute Security Admin faz o oposto. É essa separação que garante que abrir um caminho de rede e permitir tráfego nele exija duas pessoas. Acumuladas, a fronteira de rede vira decisão unilateral.',
    risk: 'Rota de saída ou peering criado junto com a regra de firewall que o libera — um caminho de exfiltração completo, montado sem que nenhuma outra equipe veja qualquer das metades.',
    mitigation: [
      'Manter a separação que o Google já publica entre as duas roles.',
      'Definir rede e firewall como código, com revisão obrigatória, e negar alteração manual em produção.',
      'Aplicar VPC Service Controls como perímetro independente das regras de firewall.',
      'Alertar sobre regra de firewall com origem 0.0.0.0/0 e sobre criação de peering ou rota customizada.',
    ],
    references: [
      'https://cloud.google.com/vpc/docs/firewalls',
      'https://cloud.google.com/iam/docs/roles-permissions/compute',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS', 'PCI-DSS'],
  },
  {
    id: 'gcp-binaryauthorization-attestor-policy',
    name: 'Binary Authorization Attestor Admin + Binary Authorization Policy Editor',
    description: 'Emitir a atestação que libera a imagem e escrever a política que exige a atestação.',
    severity: 'critical', category: 'application-management', cloud: 'gcp',
    roleA: { id: 'binaryauthorization-attestorsadmin', name: 'Binary Authorization Attestor Admin', cloud: 'gcp' },
    roleB: { id: 'binaryauthorization-policyeditor', name: 'Binary Authorization Policy Editor', cloud: 'gcp' },
    rationale: 'O Binary Authorization só significa alguma coisa porque a política e a atestação vêm de origens distintas: a política diz "só implante imagem atestada por X" e o atestador X é uma autoridade separada. Attestor Admin administra os atestadores e suas chaves; Policy Editor escreve a política, inclusive adicionar exceções e mudar o modo de enforcement. Quem tem os dois pode atestar o que quiser — ou simplesmente dispensar a exigência.',
    risk: 'Imagem não revisada em produção com o controle de cadeia de suprimentos formalmente ativo — o painel mostra Binary Authorization habilitado, e ele está: só não impede nada.',
    mitigation: [
      'Manter os atestadores sob custódia de uma equipe de segurança de aplicação, separada de quem edita a política.',
      'Assinar atestações com chaves em Cloud KMS cuja IAM policy exclua o editor da política.',
      'Alertar sobre alteração da política do Binary Authorization, especialmente inclusão de exceção por imagem.',
      'Reconciliar periodicamente as imagens em execução contra as atestações emitidas.',
    ],
    references: [
      'https://cloud.google.com/binary-authorization/docs/overview',
      'https://cloud.google.com/binary-authorization/docs/creating-attestors-cli',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-container-admin-artifactregistry-admin',
    name: 'Kubernetes Engine Admin + Artifact Registry Administrator',
    description: 'Publicar a imagem no registro e implantá-la no cluster.',
    severity: 'high', category: 'application-management', cloud: 'gcp',
    roleA: { id: 'container-admin', name: 'Kubernetes Engine Admin', cloud: 'gcp' },
    roleB: { id: 'artifactregistry-admin', name: 'Artifact Registry Administrator', cloud: 'gcp' },
    rationale: 'Artifact Registry Administrator publica e sobrescreve imagens, inclusive reapontando uma tag existente para outro digest. Kubernetes Engine Admin administra os clusters e os workloads. Juntas, uma identidade pode substituir o conteúdo por trás de uma tag em uso e forçar a reimplantação — sem que o manifesto do cluster mude uma linha.',
    risk: 'Código não revisado em produção com o manifesto intacto: a auditoria de configuração do cluster não acusa nada porque a tag é a mesma; só a comparação por digest revelaria a troca.',
    mitigation: [
      'Referenciar imagens por digest, não por tag, nos manifestos de produção.',
      'Ativar tags imutáveis nos repositórios de produção do Artifact Registry.',
      'Segregar quem publica imagem de quem opera cluster.',
      'Exigir Binary Authorization com atestação de build para os clusters de produção.',
    ],
    references: [
      'https://cloud.google.com/artifact-registry/docs/repositories/immutable-tags',
      'https://cloud.google.com/kubernetes-engine/docs/concepts/access-control',
    ],
    frameworks: ['SOX', 'ISO27001', 'CIS'],
  },
  {
    id: 'gcp-cloudbuild-editor-serviceaccountuser',
    name: 'Cloud Build Editor + Service Account User',
    description: 'Escrever o passo de build e escolher a service account com que ele roda.',
    severity: 'high', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'cloudbuild-editor', name: 'Cloud Build Editor', cloud: 'gcp' },
    roleB: { id: 'iam-serviceaccountuser', name: 'Service Account User', cloud: 'gcp' },
    rationale: 'Um build do Cloud Build é código arbitrário executando com a service account indicada. Cloud Build Editor permite criar e disparar builds com definição inline; Service Account User permite anexar a service account. A esteira de CI vira, então, um interpretador de comandos rodando com o privilégio de uma identidade que a pessoa escolhe.',
    risk: 'Execução com privilégio de service account por um caminho que a revisão de acesso não cobre — o registro mostra um build, não uma sessão administrativa.',
    mitigation: [
      'Restringir quais service accounts podem ser usadas pelo Cloud Build, por condição em actAs.',
      'Exigir que builds de produção venham de configuração versionada no repositório, não de definição inline.',
      'Usar service accounts de build mínimas, sem permissão de implantação nem de IAM.',
      'Auditar builds cuja service account tenha role de Editor ou superior.',
    ],
    references: [
      'https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts',
      'https://cloud.google.com/iam/docs/service-account-permissions',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-cloudfunctions-admin-serviceaccountuser',
    name: 'Cloud Functions Admin + Service Account User',
    description: 'Publicar a função e escolher a identidade com que ela executa.',
    severity: 'high', category: 'privileged-access', cloud: 'gcp',
    roleA: { id: 'cloudfunctions-admin', name: 'Cloud Functions Admin', cloud: 'gcp' },
    roleB: { id: 'iam-serviceaccountuser', name: 'Service Account User', cloud: 'gcp' },
    rationale: 'Cloud Functions Admin implanta funções, define o gatilho e o código. Service Account User permite anexar a service account de runtime. O par produz o mesmo efeito do Cloud Build com actAs: código sob controle da pessoa executando com o privilégio de uma identidade escolhida por ela, sem que nenhuma role privilegiada tenha sido concedida ao usuário.',
    risk: 'Persistência silenciosa — uma função com gatilho HTTP e service account privilegiada continua ativa e alcançável muito depois de o operador ter saído.',
    mitigation: [
      'Restringir actAs por service account e não conceder Service Account User no escopo do projeto.',
      'Exigir que funções de produção venham do pipeline, negando deploy manual.',
      'Inventariar funções com gatilho HTTP não autenticado e revisar a service account de cada uma.',
      'Segregar implantação de função da permissão de escolher a identidade de runtime.',
    ],
    references: [
      'https://cloud.google.com/functions/docs/securing/function-identity',
      'https://cloud.google.com/iam/docs/service-account-permissions',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-iap-admin-accesscontextmanager',
    name: 'IAP Policy Admin + Access Context Manager Admin',
    description: 'Definir quem entra na aplicação e também o nível de acesso que a condição avalia.',
    severity: 'high', category: 'security-operations', cloud: 'gcp',
    roleA: { id: 'iap-admin', name: 'IAP Policy Admin', cloud: 'gcp' },
    roleB: { id: 'accesscontextmanager-policyadmin', name: 'Access Context Manager Admin', cloud: 'gcp' },
    rationale: 'O acesso contextual do GCP tem duas metades: o IAP decide quem alcança a aplicação, e o Access Context Manager define os access levels — dispositivo gerenciado, faixa de IP, região — que a decisão consulta. Somadas numa identidade, a condição deixa de ser um limite externo: quem não satisfaz o nível de acesso reescreve o nível de acesso.',
    risk: 'Acesso a aplicação interna a partir de dispositivo ou rede não confiável, com o controle de acesso contextual formalmente ativo e sem nenhum alerta.',
    mitigation: [
      'Manter a definição dos access levels numa equipe de segurança corporativa, separada de quem administra o IAP das aplicações.',
      'Versionar os access levels e exigir revisão de segundo par para qualquer alteração.',
      'Alertar sobre alteração de access level e de perímetro do VPC Service Controls.',
      'Revisar periodicamente quais aplicações estão atrás do IAP e com qual nível exigido.',
    ],
    references: [
      'https://cloud.google.com/iap/docs/concepts-overview',
      'https://cloud.google.com/access-context-manager/docs/overview',
    ],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gcp-billing-admin-costsmanager',
    name: 'Billing Account Administrator + Billing Account Costs Manager',
    description: 'Administrar a conta de faturamento e também os orçamentos e alertas que a vigiam.',
    severity: 'low', category: 'financial-control', cloud: 'gcp',
    roleA: { id: 'billing-admin', name: 'Billing Account Administrator', cloud: 'gcp' },
    roleB: { id: 'billing-costsmanager', name: 'Billing Account Costs Manager', cloud: 'gcp' },
    rationale: 'Billing Account Costs Manager existe para que orçamentos, alertas e exportação de custo sejam geridos por quem acompanha a despesa, não necessariamente por quem administra a conta de faturamento. Somar as duas não amplia permissão relevante — Billing Account Administrator já cobre —, mas apaga a distinção: o orçamento deixa de ser um controle e vira um parâmetro de quem gasta.',
    risk: 'Limite de orçamento ajustado para acomodar o consumo em vez de sinalizá-lo, sem que ninguém em finanças participe da decisão.',
    mitigation: [
      'Atribuir Billing Account Costs Manager a finanças ou FinOps, sem sobreposição com a administração da conta.',
      'Exportar dados de faturamento para BigQuery num projeto sob controle de finanças.',
      'Alertar sobre alteração de valor de budget e sobre remoção de destinatário de alerta.',
    ],
    references: ['https://cloud.google.com/billing/docs/how-to/billing-access'],
    frameworks: ['SOX', 'ISO27001'],
  },
  // ═══════════════════════════════════════════════════════════════════════
  // Google Workspace — admin roles
  //
  // São catorze roles pré-construídas, e Super Admin abrange todas as outras.
  // Isso muda o que uma regra pode dizer: no Workspace, quase nenhum par
  // "acrescenta" permissão sobre Super Admin. O que os pares abaixo apontam é
  // acúmulo de FUNÇÕES que deveriam ficar em pessoas diferentes — e, em dois
  // casos (Multi-party approval, Directory Sync), a anulação de um controle
  // que o Google desenhou exatamente para exigir uma segunda pessoa.
  //
  // O catálogo é proporcionalmente menor que o de GCP e AWS porque o conjunto
  // de roles é menor. Inflá-lo com pares redundantes daria a impressão de
  // cobertura sem acrescentar sinal.
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'gws-superadmin-multipartyapproval',
    name: 'Super Admin + Multi-party approval Admin',
    description: 'Executar a ação sensível e aprovar a si mesmo — o controle de dupla pessoa anulado.',
    severity: 'critical', category: 'privileged-access', cloud: 'google-workspace',
    roleA: { id: 'super-admin', name: 'Super Admin', cloud: 'google-workspace' },
    roleB: { id: 'multi-party-approval-admin', name: 'Multi-party approval Admin', cloud: 'google-workspace' },
    rationale: 'A aprovação multi-party do Workspace existe por um motivo só: obrigar que ações sensíveis de um administrador — desligar a verificação em duas etapas, alterar configurações críticas — sejam aprovadas por outro. Super Admin é quem executa essas ações; Multi-party approval Admin é quem revisa e aprova ou nega os pedidos. Numa identidade só, o controle deixa de ser um segundo par de olhos e vira uma etapa de confirmação.',
    risk: 'Desativação da 2SV ou de outra proteção do domínio inteiro, com o registro mostrando pedido aprovado e o processo aparentemente respeitado.',
    mitigation: [
      'Atribuir Multi-party approval Admin exclusivamente a administradores que não tenham Super Admin.',
      'Manter no mínimo duas pessoas com o papel de aprovação, em áreas diferentes.',
      'Revisar o log de auditoria de aprovações procurando pedido e aprovação do mesmo ator.',
      'Alertar quando qualquer ação sensível for aprovada sem intervalo humano plausível entre pedido e aprovação.',
    ],
    references: [
      'https://support.google.com/a/answer/13790448',
      'https://support.google.com/a/answer/2405986',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gws-multipartyapproval-usermanagement',
    name: 'Multi-party approval Admin + User Management Admin',
    description: 'Aprovar ações sensíveis de outros admins e, ao mesmo tempo, controlar as contas deles.',
    severity: 'high', category: 'privileged-access', cloud: 'google-workspace',
    roleA: { id: 'multi-party-approval-admin', name: 'Multi-party approval Admin', cloud: 'google-workspace' },
    roleB: { id: 'user-management-admin', name: 'User Management Admin', cloud: 'google-workspace' },
    rationale: 'O aprovador multi-party precisa ser independente de quem pede — é a única propriedade que faz o controle funcionar. User Management Admin cria contas e altera credenciais de usuários não-administradores. Com as duas, a pessoa pode criar a conta que faz o pedido e aprová-lo, produzindo um par de atores formalmente distintos que, na prática, é uma pessoa.',
    risk: 'O log de aprovação mostra dois participantes e satisfaz a exigência de dupla custódia, enquanto os dois estão sob o mesmo controle — é uma falha que a evidência de auditoria não revela por si.',
    mitigation: [
      'Reservar o papel de aprovação a administradores sem qualquer permissão de gestão de usuários.',
      'Revisar as contas criadas nos dias anteriores a cada aprovação sensível.',
      'Exigir que aprovador e solicitante estejam em unidades organizacionais e áreas distintas.',
    ],
    references: ['https://support.google.com/a/answer/13790448'],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF'],
  },
  {
    id: 'gws-directorysync-superadmin',
    name: 'Directory Sync Admin + Super Admin',
    description: 'Controlar a sincronização que é a fonte de verdade das contas e também o destino dela.',
    severity: 'critical', category: 'identity-management', cloud: 'google-workspace',
    roleA: { id: 'directory-sync-admin', name: 'Directory Sync Admin', cloud: 'google-workspace' },
    roleB: { id: 'super-admin', name: 'Super Admin', cloud: 'google-workspace' },
    rationale: 'Quando o Workspace sincroniza com um diretório externo, a sincronização passa a ser a origem das contas — criar, suspender e remover deixam de ser atos no console e viram consequência do que existe do outro lado. Directory Sync Admin configura esse processo: qual origem, qual escopo, quais regras de mapeamento. Super Admin administra o destino. Uma identidade com as duas controla a fonte e o resultado, e não sobra nenhuma reconciliação independente.',
    risk: 'Conta injetada pela sincronização com aparência de provisionamento legítimo, ou remoção em massa disfarçada de correção de escopo — nos dois casos o console mostra apenas o efeito, e a causa está numa configuração que ninguém mais lê.',
    mitigation: [
      'Segregar a configuração da sincronização da administração do tenant.',
      'Alertar sobre alteração de escopo ou de regra de mapeamento do Directory Sync.',
      'Reconciliar periodicamente o conjunto de contas do Workspace contra o diretório de origem, por um terceiro.',
      'Exigir aprovação registrada para qualquer mudança na configuração de sincronização.',
    ],
    references: [
      'https://support.google.com/a/answer/13718656',
      'https://support.google.com/a/answer/2405986',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gws-directorysync-usermanagement',
    name: 'Directory Sync Admin + User Management Admin',
    description: 'Alterar contas pelo console e pela sincronização — dois caminhos, nenhuma reconciliação.',
    severity: 'high', category: 'identity-management', cloud: 'google-workspace',
    roleA: { id: 'directory-sync-admin', name: 'Directory Sync Admin', cloud: 'google-workspace' },
    roleB: { id: 'user-management-admin', name: 'User Management Admin', cloud: 'google-workspace' },
    rationale: 'User Management Admin cria contas, renomeia usuários e altera senhas diretamente. Directory Sync Admin controla o processo que faz a mesma coisa em massa, a partir de outra fonte. Ter os dois significa poder produzir o mesmo resultado por duas vias e escolher, para cada caso, a que gera menos rastro — e nenhuma equipe fica com a visão completa do ciclo de vida das contas.',
    risk: 'Divergência entre o diretório de origem e o Workspace que ninguém detecta, porque quem faria a comparação é quem controla os dois lados.',
    mitigation: [
      'Definir uma única via autoritativa para o ciclo de vida das contas e desabilitar a criação manual onde a sincronização é a fonte.',
      'Segregar a configuração da sincronização da operação de usuários.',
      'Rodar reconciliação periódica origem-destino por uma equipe que não opera nenhum dos dois.',
      'Alertar sobre criação manual de conta em unidades organizacionais cobertas pela sincronização.',
    ],
    references: ['https://support.google.com/a/answer/13718656'],
    frameworks: ['SOX', 'ISO27001', 'CIS'],
  },
  {
    id: 'gws-usermanagement-groupsadmin',
    name: 'User Management Admin + Groups Admin',
    description: 'Criar a conta e colocá-la no grupo que carrega o acesso.',
    severity: 'high', category: 'access-provisioning', cloud: 'google-workspace',
    roleA: { id: 'user-management-admin', name: 'User Management Admin', cloud: 'google-workspace' },
    roleB: { id: 'groups-admin', name: 'Groups Admin', cloud: 'google-workspace' },
    rationale: 'No Workspace o grupo é o veículo do acesso: compartilhamento de Drive, listas de distribuição, associação usada por aplicações e — quando há Cloud Identity — concessões de IAM no GCP. User Management Admin cria a conta; Groups Admin decide de que grupos ela participa e ainda gere o rótulo de segurança dos grupos. É o par criar-identidade / conceder-acesso, que separar é o caso de uso original de SoD.',
    risk: 'Uma conta nova entra num grupo com acesso a dado sensível sem que ninguém além de quem a criou participe da decisão — e a associação de grupo não costuma estar sob revisão de acesso formal.',
    mitigation: [
      'Manter a criação de contas no fluxo de RH e a curadoria de grupos nos donos de cada grupo.',
      'Usar rótulo de segurança nos grupos que carregam acesso e restringir quem pode alterá-lo.',
      'Revisar periodicamente a associação dos grupos com acesso a dado sensível.',
      'Alertar sobre criação de usuário seguida de inclusão em grupo rotulado como de segurança.',
    ],
    references: [
      'https://support.google.com/a/answer/2405986',
      'https://support.google.com/a/answer/13556234',
    ],
    frameworks: ['SOX', 'ISO27001', 'CIS'],
  },
  {
    id: 'gws-usermanagement-helpdesk',
    name: 'User Management Admin + Help Desk Admin',
    description: 'Concentrar todo o ciclo da credencial de um usuário numa pessoa só.',
    severity: 'medium', category: 'identity-management', cloud: 'google-workspace',
    roleA: { id: 'user-management-admin', name: 'User Management Admin', cloud: 'google-workspace' },
    roleB: { id: 'help-desk-admin', name: 'Help Desk Admin', cloud: 'google-workspace' },
    rationale: 'Help Desk Admin é, por desenho, um recorte estreito de User Management Admin: só reset de senha de não-administradores. Existe para que a operação de mesa de ajuda não precise da role ampla. Acumular as duas na mesma pessoa não acrescenta permissão, mas indica que o recorte não está sendo usado — e concentra criação de conta e reset de credencial onde a organização pretendia separar.',
    risk: 'Uma conta criada e tida sob controle de credencial pela mesma pessoa, sem que exista um segundo operador capaz de notar o padrão.',
    mitigation: [
      'Atribuir Help Desk Admin à operação de suporte e User Management Admin à equipe de identidade, sem sobreposição.',
      'Delimitar as duas por unidade organizacional, em vez de conceder no domínio inteiro.',
      'Alertar sobre reset de senha em contas criadas nas últimas 48h pelo mesmo administrador.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['ISO27001', 'CIS'],
  },
  {
    id: 'gws-helpdesk-mobileadmin',
    name: 'Help Desk Admin + Mobile Admin',
    description: 'Resetar a senha e controlar o dispositivo em que o segundo fator vive.',
    severity: 'medium', category: 'identity-management', cloud: 'google-workspace',
    roleA: { id: 'help-desk-admin', name: 'Help Desk Admin', cloud: 'google-workspace' },
    roleB: { id: 'mobile-admin', name: 'Mobile Admin', cloud: 'google-workspace' },
    rationale: 'Help Desk Admin reseta senhas de não-administradores. Mobile Admin provisiona e aprova dispositivos, define políticas e pode bloquear ou apagar aparelhos. Numa organização onde a verificação em duas etapas depende do celular gerenciado, quem controla a senha e quem controla o aparelho controla os dois fatores — a segunda barreira deixa de ser independente da primeira.',
    risk: 'Takeover de conta de usuário final passando pelos dois fatores, com os eventos parecendo operações rotineiras de suporte.',
    mitigation: [
      'Separar a operação de credencial da operação de dispositivos.',
      'Preferir chaves de segurança físicas às aprovações no celular para contas de maior risco.',
      'Alertar sobre aprovação de dispositivo novo em seguida a um reset de senha do mesmo usuário.',
      'Registrar e revisar bloqueios e limpezas remotas de dispositivo.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gws-groupsadmin-servicesadmin',
    name: 'Groups Admin + Services Admin',
    description: 'Criar o grupo que dá acesso e ligar o serviço a que ele dá acesso.',
    severity: 'high', category: 'access-provisioning', cloud: 'google-workspace',
    roleA: { id: 'groups-admin', name: 'Groups Admin', cloud: 'google-workspace' },
    roleB: { id: 'services-admin', name: 'Services Admin', cloud: 'google-workspace' },
    rationale: 'Services Admin liga e desliga serviços, altera suas configurações e permissões — inclusive as regras de compartilhamento do Drive e as políticas de classificação. Groups Admin decide quem está nos grupos que essas configurações usam como público-alvo. Juntas, uma identidade define tanto o que o serviço permite quanto quem se beneficia disso, sem que nenhum dono de serviço participe.',
    risk: 'Compartilhamento externo habilitado para um grupo criado pela mesma pessoa — um caminho de saída de dado montado inteiramente dentro do console de administração, sem nenhuma etapa de aprovação.',
    mitigation: [
      'Segregar a curadoria de grupos da administração de serviços.',
      'Delimitar Services Admin por unidade organizacional, e revisar as exceções de compartilhamento externo.',
      'Alertar sobre alteração de política de compartilhamento do Drive e sobre habilitação de serviço para grupo.',
      'Revisar trimestralmente os grupos usados como alvo de configuração de serviço.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR', 'CIS'],
  },
  {
    id: 'gws-servicesadmin-storageadmin',
    name: 'Services Admin + Storage Admin',
    description: 'Definir as regras de compartilhamento do Drive e administrar o storage que elas governam.',
    severity: 'medium', category: 'data-access', cloud: 'google-workspace',
    roleA: { id: 'services-admin', name: 'Services Admin', cloud: 'google-workspace' },
    roleB: { id: 'storage-admin', name: 'Storage Admin', cloud: 'google-workspace' },
    rationale: 'Storage Admin dá acesso total às configurações de Drive e aos relatórios de uso, incluindo a lista de drives compartilhados e quem mais consome espaço. Services Admin define as regras de compartilhamento e as políticas de classificação. Concentradas, a pessoa que enxerga onde estão os dados é a mesma que decide quem pode compartilhá-los para fora.',
    risk: 'Alteração de política de compartilhamento aplicada exatamente aos drives que a pessoa identificou como relevantes, sem que nenhum dono de dado participe.',
    mitigation: [
      'Segregar a administração de configuração de serviço da administração de storage e relatórios.',
      'Definir a política de compartilhamento externo no nível do domínio e exigir aprovação para exceções por unidade organizacional.',
      'Revisar os drives compartilhados com acesso externo como item recorrente.',
      'Alertar sobre mudanças na política de compartilhamento do Drive.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['ISO27001', 'LGPD', 'GDPR'],
  },
  {
    id: 'gws-servicesadmin-mobileadmin',
    name: 'Services Admin + Mobile Admin',
    description: 'Configurar os serviços e também as políticas dos dispositivos que os acessam.',
    severity: 'medium', category: 'security-operations', cloud: 'google-workspace',
    roleA: { id: 'services-admin', name: 'Services Admin', cloud: 'google-workspace' },
    roleB: { id: 'mobile-admin', name: 'Mobile Admin', cloud: 'google-workspace' },
    rationale: 'A postura de acesso móvel do Workspace tem duas camadas: o que o serviço permite (Services Admin) e em que dispositivos ele pode ser usado (Mobile Admin — política de tela de bloqueio, criptografia, aprovação de aparelho). Quem administra as duas pode afrouxar a exigência de dispositivo e ampliar o acesso ao serviço na mesma decisão, sem nenhum contrapeso.',
    risk: 'Acesso a dado corporativo em aparelho não gerenciado ou sem criptografia, com a política de gerenciamento formalmente ativa mas relaxada para o caso.',
    mitigation: [
      'Separar a administração de endpoint da administração de serviços.',
      'Definir o gerenciamento avançado de dispositivos no nível do domínio, com exceções aprovadas e temporárias.',
      'Alertar sobre alteração de política de dispositivo e sobre aprovação de aparelho fora de conformidade.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gws-groupsadmin-groupseditor',
    name: 'Groups Admin + Groups Editor',
    description: 'As duas roles de grupo na mesma pessoa — a distinção que o Google criou some.',
    severity: 'low', category: 'access-provisioning', cloud: 'google-workspace',
    roleA: { id: 'groups-admin', name: 'Groups Admin', cloud: 'google-workspace' },
    roleB: { id: 'groups-editor', name: 'Groups Editor', cloud: 'google-workspace' },
    rationale: 'Groups Editor é Groups Admin menos uma coisa: o privilégio de adicionar ou remover o rótulo de segurança de um grupo. Essa exclusão é o ponto da role — o rótulo de segurança é o que marca um grupo como veículo de acesso, e alterá-lo muda o regime de controle. Ter as duas na mesma identidade devolve o privilégio excluído e apaga a distinção.',
    risk: 'Remoção do rótulo de segurança de um grupo que concede acesso, tirando-o do escopo dos controles que dependem do rótulo — sem que nenhuma permissão apareça como alterada.',
    mitigation: [
      'Escolher uma das duas roles por pessoa; se o rótulo de segurança precisa ser gerido, é Groups Admin, e ela deve ser rara.',
      'Alertar sobre remoção de rótulo de segurança de qualquer grupo.',
      'Revisar periodicamente os grupos com acesso sensível e confirmar que estão rotulados.',
    ],
    references: [
      'https://support.google.com/a/answer/13556234',
      'https://support.google.com/a/answer/2405986',
    ],
    frameworks: ['ISO27001'],
  },
  {
    id: 'gws-groupsadmin-groupsreader',
    name: 'Groups Admin + Groups Reader',
    description: 'A role de leitura dos grupos nas mãos de quem os edita.',
    severity: 'low', category: 'compliance-audit', cloud: 'google-workspace',
    roleA: { id: 'groups-admin', name: 'Groups Admin', cloud: 'google-workspace' },
    roleB: { id: 'groups-reader', name: 'Groups Reader', cloud: 'google-workspace' },
    rationale: 'Groups Reader existe para que auditoria e áreas de risco leiam a composição dos grupos sem poder alterá-la — é o ponto de observação sobre o principal veículo de acesso do Workspace. Somada a Groups Admin não acrescenta nenhuma permissão, e faz um inventário de "quem revisa os grupos" apontar para quem os administra.',
    risk: 'A revisão de associação de grupo deixa de ser independente, e a organização não procura por um revisor real porque acredita já ter um.',
    mitigation: [
      'Reservar Groups Reader para auditoria interna, sem sobreposição com Groups Admin ou Groups Editor.',
      'Incluir a sobreposição das duas roles no relatório periódico de revisão de acesso.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'gws-resselleradmin-superadmin',
    name: 'Reseller Admin + Super Admin',
    description: 'Fazer os pedidos e administrar o tenant que os consome.',
    severity: 'high', category: 'financial-control', cloud: 'google-workspace',
    roleA: { id: 'reseller-admin', name: 'Reseller Admin', cloud: 'google-workspace' },
    roleB: { id: 'super-admin', name: 'Super Admin', cloud: 'google-workspace' },
    rationale: 'Reseller Admin coloca pedidos de Workspace e de outros serviços, transfere clientes revendidos, acessa faturas e altera métodos de pagamento — e ainda acessa o console de administração dos clientes. Super Admin administra o tenant. Concentradas, a compra e o consumo ficam na mesma pessoa, e o acesso administrativo que a relação de revenda concede não tem nenhum contrapeso do lado do cliente.',
    risk: 'Licenças e serviços contratados sem passar por suprimentos, com a despesa e o acesso administrativo controlados pelo mesmo ator — e a relação de revenda é um caminho de acesso que vem de fora do tenant.',
    mitigation: [
      'Não acumular papel de revenda com administração do tenant; se o parceiro precisa de acesso, use conta nominal com validade.',
      'Exigir aprovação de suprimentos registrada para qualquer pedido novo.',
      'Revisar periodicamente quais parceiros têm acesso ao console e com qual escopo.',
      'Conciliar mensalmente licenças contratadas contra licenças atribuídas e usuários ativos.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'gws-resselleradmin-googlevoiceadmin',
    name: 'Reseller Admin + Google Voice Admin',
    description: 'Provisionar números e licenças e também colocar o pedido que os paga.',
    severity: 'low', category: 'financial-control', cloud: 'google-workspace',
    roleA: { id: 'reseller-admin', name: 'Reseller Admin', cloud: 'google-workspace' },
    roleB: { id: 'google-voice-admin', name: 'Google Voice Admin', cloud: 'google-workspace' },
    rationale: 'Google Voice Admin provisiona números, atribui licenças a usuários e gere portabilidade — cada operação com custo recorrente por licença. Reseller Admin coloca os pedidos e vê a fatura. Comprar e distribuir na mesma pessoa é o mesmo padrão de Billing somado a License Administrator no Entra ID: não há quem confronte a despesa contra o consumo real.',
    risk: 'Licenças de voz provisionadas acima da necessidade, com o custo aparecendo diluído na fatura consolidada do parceiro.',
    mitigation: [
      'Segregar o provisionamento de licenças da colocação de pedidos.',
      'Conciliar mensalmente números e licenças de Voice ativos contra usuários que de fato os usam.',
      'Exigir aprovação para aumento de licenças acima de um limite definido.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['SOX', 'ISO27001'],
  },
  {
    id: 'gws-resselleradmin-indirectresselleradmin',
    name: 'Reseller Admin + Indirect Reseller Admin',
    description: 'Os dois papéis da cadeia de revenda na mesma identidade.',
    severity: 'low', category: 'financial-control', cloud: 'google-workspace',
    roleA: { id: 'reseller-admin', name: 'Reseller Admin', cloud: 'google-workspace' },
    roleB: { id: 'indirect-reseller-admin', name: 'Indirect Reseller Admin', cloud: 'google-workspace' },
    rationale: 'O Google distingue o revendedor autorizado do revendedor indireto que trabalha sob um distribuidor, e as duas roles refletem posições diferentes na cadeia comercial. Acumulá-las numa identidade significa que a mesma pessoa opera os dois lados de uma transferência de cliente — a operação que move um tenant de uma carteira para outra.',
    risk: 'Transferência de cliente entre carteiras sem contraparte independente, alterando quem fatura e quem tem acesso ao console do tenant.',
    mitigation: [
      'Separar os papéis conforme a posição real na cadeia; acumulação normalmente indica configuração legada.',
      'Exigir confirmação do cliente, fora do console, para qualquer transferência.',
      'Revisar periodicamente as relações de revenda ativas.',
    ],
    references: ['https://support.google.com/a/answer/2405986'],
    frameworks: ['SOX'],
  },

  // ── Cruzamento Google: GCP ↔ Workspace ─────────────────────────────────
  // O Cloud Identity é o mesmo dos dois lados: a conta que entra no Admin
  // console do Workspace é a conta que aparece na allow policy do GCP. Por
  // isso estes dois cruzamentos existem, e por isso não há equivalente entre
  // provedores diferentes — lá não há plano de identidade compartilhado.
  {
    id: 'gws-superadmin-gcp-orgadmin-cross',
    name: 'Super Admin + Organization Administrator',
    description: 'Controlar a fonte de identidade da organização e a hierarquia inteira do GCP que confia nela.',
    severity: 'critical', category: 'privileged-access', cloud: 'google-cross',
    roleA: { id: 'super-admin', name: 'Super Admin', cloud: 'google-workspace' },
    roleB: { id: 'resourcemanager-organizationadmin', name: 'Organization Administrator', cloud: 'gcp' },
    rationale: 'A organização do GCP é ancorada no domínio do Cloud Identity ou do Workspace: os principals das allow policies são as contas administradas naquele console. Super Admin pode redefinir a senha e os métodos de recuperação de qualquer usuário do domínio — inclusive dos que detêm roles privilegiadas no GCP — e criar contas novas. Organization Administrator administra a hierarquia e as políticas do GCP. Somadas, a pessoa controla quem existe e o que essa existência pode fazer, dos dois lados da fronteira.',
    risk: 'Assumir a conta de qualquer administrador do GCP a partir do console do Workspace, sem tocar em nenhuma allow policy — o log do GCP registra ação do titular legítimo, e a investigação começa pela pessoa errada.',
    mitigation: [
      'Manter as contas Super Admin do Workspace separadas das identidades com roles privilegiadas no GCP.',
      'Exigir chave de segurança física em todas as contas Super Admin, e mantê-las em número mínimo.',
      'Alertar no SIEM sobre reset de senha ou de método de recuperação de contas que detenham roles privilegiadas no GCP.',
      'Usar Privileged Access Manager no GCP para que o privilégio seja temporário e aprovado, reduzindo a janela útil de um takeover.',
    ],
    references: [
      'https://cloud.google.com/architecture/identity/overview-google-authentication',
      'https://support.google.com/a/answer/9011373',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
  {
    id: 'gws-usermanagement-gcp-securityadmin-cross',
    name: 'User Management Admin + Security Admin',
    description: 'Criar a identidade no Workspace e conceder acesso a ela no GCP.',
    severity: 'high', category: 'identity-management', cloud: 'google-cross',
    roleA: { id: 'user-management-admin', name: 'User Management Admin', cloud: 'google-workspace' },
    roleB: { id: 'iam-securityadmin', name: 'Security Admin', cloud: 'gcp' },
    rationale: 'User Management Admin cria e administra contas no domínio — inclusive renomear e trocar credencial. Security Admin altera as allow policies do GCP, decidindo quais principals têm quais roles. É o par criar-identidade / conceder-acesso atravessando a fronteira entre o plano de identidade e o plano de recursos: a mesma pessoa produz o principal e o privilégio dele.',
    risk: 'Uma conta criada no Workspace e imediatamente concedida em projetos do GCP, sem que nenhuma equipe de plataforma participe — e revisões de acesso que olham só um dos lados não veem o ciclo completo.',
    mitigation: [
      'Segregar a operação de identidade no Workspace da concessão de IAM no GCP.',
      'Restringir concessões a grupos, e manter a curadoria dos grupos privilegiados fora da equipe de identidade.',
      'Aplicar a constraint iam.allowedPolicyMemberDomains para limitar quem pode ser concedido.',
      'Correlacionar criação de conta no Workspace com SetIamPolicy no GCP na mesma janela de tempo.',
    ],
    references: [
      'https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys',
      'https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains',
    ],
    frameworks: ['SOX', 'ISO27001', 'NIST-CSF', 'CIS'],
  },
]

export function getSoDRuleById(id: string): SoDRule | undefined {
  return SOD_RULES.find((r) => r.id === id)
}

/**
 * Busca uma regra SoD para um par de roles (nome + plataforma), em qualquer ordem.
 *
 * Um par de plataformas de provedores diferentes nunca casa — não porque haja
 * um teste explícito aqui, mas porque nenhuma regra do catálogo tem as duas
 * pontas em provedores distintos. Ver o cabeçalho deste arquivo.
 */
export function findSoDRuleForPair(
  nameA: string, cloudA: SoDPlatform,
  nameB: string, cloudB: SoDPlatform,
): SoDRule | undefined {
  const an = nameA.trim().toLowerCase()
  const bn = nameB.trim().toLowerCase()
  return SOD_RULES.find((r) => {
    const ra = r.roleA, rb = r.roleB
    const direct = ra.name.toLowerCase() === an && ra.cloud === cloudA && rb.name.toLowerCase() === bn && rb.cloud === cloudB
    const swapped = ra.name.toLowerCase() === bn && ra.cloud === cloudB && rb.name.toLowerCase() === an && rb.cloud === cloudA
    return direct || swapped
  })
}
