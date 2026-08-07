// Metadados de apresentação dos tiers (rótulo, cor, descrição) das 6 clouds.
//
// POR QUE ESTES OBJETOS NÃO FICAM MAIS NOS ARQUIVOS DE DADOS
//   Sidebar e AppShell envolvem todas as páginas e precisam só dos TIER_META.
//   Enquanto eles moravam em gcp.ts / aws.ts / roles.ts, importá-los arrastava
//   o módulo inteiro — 2,5 MB de datasets — para o chunk compartilhado do
//   cliente. Aqui a navegação importa daqui e nunca toca nos arrays.
//
//   Os arquivos de dados re-exportam cada objeto, então
//   `import { GCP_TIER_META } from '@/data/gcp'` continua funcionando.
//
//   Os tipos são importados com `import type` de propósito: são apagados na
//   compilação, então não há ciclo de imports em runtime.
//
// ATENÇÃO: classificação de tier é editorial do IAM Scope, não do provedor.

// COR DOS TIERS — NÍVEL 3 (06/08/2026)
//   Só o tier de topo de cada plataforma é vermelho. Todos os outros usam a
//   mesma neutra. A escada cromática saiu por dois motivos medidos:
//
//   1. Ela não era consistente. `#7c3aed` significava "Specialized" em AWS,
//      Azure e Workspace — e "Developer" no GCP. E "Specialized", roxo nessas
//      quatro, era cinza no GCP. A mesma cor com dois sentidos.
//   2. Ela não podia funcionar. Uma rampa de cinco degraus precisa de 3:1 entre
//      cada degrau e o trilho da barra; do quarto em diante isso cai para
//      2.4:1 e 1.4:1. Cinco tons nunca foram legíveis como ordem — a ordem
//      sempre veio da posição na lista e do rótulo.
//
//   A severidade de SoD (`SOD_SEVERITY_META`, em data/sod/rules.ts) segue
//   colorida de propósito: ali a escala inteira é a informação.

import type { GcpTier, GcpTierMeta } from './gcp'
import type { AwsTier, AwsTierMeta } from './aws'
import type { AzureRbacTier } from './azureRbac'
import type { GwsTier } from './googleWorkspace'
import type { IbmTier, IbmTierMeta } from './ibmCloud'
import type { EamTier } from './roles'

export const GCP_TIER_META: Record<GcpTier, GcpTierMeta> = {
  ProjectOwner: { label: 'Project Owner', color: '#dc2626', bg: '#dc262618', description: 'Full control over the project and all resources' },
  Admin:        { label: 'Admin',         color: '#6b7280', bg: '#6b728018', description: 'Administrative control over a service, may include IAM' },
  Editor:       { label: 'Editor',        color: '#6b7280', bg: '#6b728018', description: 'Read and write access to all resources in a service' },
  Operator:     { label: 'Operator',      color: '#6b7280', bg: '#6b728018', description: 'Operational access to manage and run workloads' },
  Developer:    { label: 'Developer',     color: '#6b7280', bg: '#6b728018', description: 'Deploy and manage code and workloads' },
  Viewer:       { label: 'Viewer',        color: '#6b7280', bg: '#6b728018', description: 'Read-only access to resources' },
  Specialized:  { label: 'Specialized',   color: '#6b7280', bg: '#6b728018', description: 'Narrow-scope role for a specific action or use case' },
}


export const AWS_TIER_META: Record<AwsTier, AwsTierMeta> = {
  FullAccess:  { label: 'Full Access',  color: '#dc2626', bg: '#dc262618', description: 'Unrestricted access to a service or the entire account — treat as privileged' },
  PowerUser:   { label: 'Power User',   color: '#6b7280', bg: '#6b728018', description: 'Broad service access without IAM management capabilities' },
  ReadOnly:    { label: 'Read Only',    color: '#6b7280', bg: '#6b728018', description: 'List and describe resources only — no write or delete actions' },
  Operator:    { label: 'Operator',     color: '#6b7280', bg: '#6b728018', description: 'Operational tasks: start/stop, deploy, patch — limited create/delete' },
  Specialized: { label: 'Specialized',  color: '#6b7280', bg: '#6b728018', description: 'Narrow-purpose policies for specific use cases or service integrations' },
}


export const AZURE_TIER_META: Record<AzureRbacTier, {
  label: string; short: string; description: string
  bgColor: string; textColor: string; darkBg: string; darkText: string
}> = {
  FullControl:      { label: 'Full Control',      short: 'FC',  description: 'Grants unrestricted access to all resources including the ability to assign roles. Highest risk tier.',                      bgColor: '#fef2f2', textColor: '#dc2626', darkBg: '#450a0a', darkText: '#fca5a5' },
  AccessManagement: { label: 'Access Management', short: 'AM',  description: 'Grants the ability to manage security configurations, role assignments, or identity services without full resource control.', bgColor: '#f2f4f7', textColor: '#5a6370', darkBg: '#232c3a', darkText: '#b0b7c2' },
  Contributor:      { label: 'Contributor',       short: 'CTB', description: 'Grants full write access to create and manage all resources but cannot assign roles or manage access to others.',            bgColor: '#f2f4f7', textColor: '#5a6370', darkBg: '#232c3a', darkText: '#b0b7c2' },
  DataPlane:        { label: 'Data Plane',        short: 'DP',  description: 'Grants access to data stored within services (blobs, queues, secrets, keys) without management plane control.',                bgColor: '#f2f4f7', textColor: '#5a6370', darkBg: '#232c3a', darkText: '#b0b7c2' },
  Reader:           { label: 'Reader',            short: 'RDR', description: 'Grants read-only access to view existing resources. Cannot make changes or access sensitive data.',                           bgColor: '#f2f4f7', textColor: '#5a6370', darkBg: '#232c3a', darkText: '#b0b7c2' },
  Specialized:      { label: 'Specialized',       short: 'SPZ', description: 'Service-specific operational role with a narrow, well-defined scope. Risk level varies by role.',                            bgColor: '#f2f4f7', textColor: '#5a6370', darkBg: '#232c3a', darkText: '#b0b7c2' },
}


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
    textColor: '#5a6370', darkText: '#b0b7c2', darkBg: '#232c3a',
    description: 'Broad administrative permissions delegated from Super Admin. Can manage users, groups, or services across the whole organization.',
  },
  ServiceAdmin: {
    label: 'Service Admin', short: 'SvcA',
    textColor: '#5a6370', darkText: '#b0b7c2', darkBg: '#232c3a',
    description: 'Administrative access scoped to a specific Google Workspace service such as Gmail, Drive, Calendar, or Chrome.',
  },
  SpecializedAdmin: {
    label: 'Specialized Admin', short: 'SpA',
    textColor: '#5a6370', darkText: '#b0b7c2', darkBg: '#232c3a',
    description: 'Specialized administrative functions with a limited but potentially sensitive scope, such as reseller management or data protection.',
  },
  ReadOnly: {
    label: 'Read Only', short: 'RO',
    textColor: '#5a6370', darkText: '#b0b7c2', darkBg: '#232c3a',
    description: 'View-only access to specific reports, audit logs, or organizational data. Cannot modify any settings.',
  },
}


export const IBM_TIER_META: Record<IbmTier, IbmTierMeta> = {
  AccountAdmin: {
    label: 'Account Admin',
    color: '#dc2626',
    bg: '#dc262618',
    description: 'Controle total da conta IBM Cloud, incluindo IAM, faturamento e todos os serviços. Tier de maior privilégio.',
  },
  PlatformAdmin: {
    label: 'Platform Admin',
    color: '#6b7280',
    bg: '#6b728018',
    description: 'Função Administrator em serviços IBM Cloud. Pode gerenciar recursos e conceder acesso a outros usuários.',
  },
  PlatformOperator: {
    label: 'Platform Operator',
    color: '#6b7280',
    bg: '#6b728018',
    description: 'Funções Editor ou Operator em serviços. Pode criar, modificar e excluir recursos, mas não gerenciar acesso.',
  },
  ServiceManager: {
    label: 'Service Manager',
    color: '#6b7280',
    bg: '#6b728018',
    description: 'Função Manager dentro de um serviço específico IBM Cloud. Inclui todas as ações de Writer mais administração do serviço.',
  },
  ReadOnly: {
    label: 'Read Only',
    color: '#6b7280',
    bg: '#6b728018',
    description: 'Viewer, Reader ou Auditor. Pode visualizar recursos e configurações mas não pode fazer alterações.',
  },
}


export const EAM_META: Record<
  EamTier,
  { label: string; short: string; description: string; textColor: string; bgColor: string; darkText: string; darkBg: string; order: number }
> = {
  ControlPlane: {
    label: 'Control Plane',
    short: 'Tier 0',
    description: 'Controle total do tenant. Comprometimento leva a takeover completo. Isole de planos inferiores.',
    textColor: '#9a2020', bgColor: '#fde8e8', darkText: '#f09595', darkBg: '#3a1414', order: 0,
  },
  ManagementPlane: {
    label: 'Management Plane',
    short: 'Tier 1',
    description: 'Funcoes de gestao de TI enterprise-wide. Alto impacto, mas sem controle total do tenant.',
    textColor: '#5a6370', bgColor: '#f2f4f7', darkText: '#b0b7c2', darkBg: '#232c3a', order: 1,
  },
  UserAccess: {
    label: 'User Access',
    short: 'Tier 2',
    description: 'Acesso de usuario e leitura basica. Menor impacto de seguranca.',
    textColor: '#5a6370', bgColor: '#f2f4f7', darkText: '#b0b7c2', darkBg: '#232c3a', order: 3,
  },
  Unclassified: {
    label: 'Nao classificada',
    short: '-',
    description: 'Sem classificacao de tier definida.',
    textColor: '#5a6370', bgColor: '#f2f4f7', darkText: '#b0b7c2', darkBg: '#232c3a', order: 4,
  },
}

