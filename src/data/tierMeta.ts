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

import type { GcpTier, GcpTierMeta } from './gcp'
import type { AwsTier, AwsTierMeta } from './aws'
import type { AzureRbacTier } from './azureRbac'
import type { GwsTier } from './googleWorkspace'
import type { IbmTier, IbmTierMeta } from './ibmCloud'
import type { EamTier } from './roles'

export const GCP_TIER_META: Record<GcpTier, GcpTierMeta> = {
  ProjectOwner: { label: 'Project Owner', color: '#dc2626', bg: '#dc262618', description: 'Full control over the project and all resources' },
  Admin:        { label: 'Admin',         color: '#ea580c', bg: '#ea580c18', description: 'Administrative control over a service, may include IAM' },
  Editor:       { label: 'Editor',        color: '#ca8a04', bg: '#ca8a0418', description: 'Read and write access to all resources in a service' },
  Operator:     { label: 'Operator',      color: '#0891b2', bg: '#0891b218', description: 'Operational access to manage and run workloads' },
  Developer:    { label: 'Developer',     color: '#7c3aed', bg: '#7c3aed18', description: 'Deploy and manage code and workloads' },
  Viewer:       { label: 'Viewer',        color: '#16a34a', bg: '#16a34a18', description: 'Read-only access to resources' },
  Specialized:  { label: 'Specialized',   color: '#6b7280', bg: '#6b728018', description: 'Narrow-scope role for a specific action or use case' },
}


export const AWS_TIER_META: Record<AwsTier, AwsTierMeta> = {
  FullAccess:  { label: 'Full Access',  color: '#dc2626', bg: '#dc262618', description: 'Unrestricted access to a service or the entire account — treat as privileged' },
  PowerUser:   { label: 'Power User',   color: '#ea580c', bg: '#ea580c18', description: 'Broad service access without IAM management capabilities' },
  ReadOnly:    { label: 'Read Only',    color: '#16a34a', bg: '#16a34a18', description: 'List and describe resources only — no write or delete actions' },
  Operator:    { label: 'Operator',     color: '#0891b2', bg: '#0891b218', description: 'Operational tasks: start/stop, deploy, patch — limited create/delete' },
  Specialized: { label: 'Specialized',  color: '#7c3aed', bg: '#7c3aed18', description: 'Narrow-purpose policies for specific use cases or service integrations' },
}


export const AZURE_TIER_META: Record<AzureRbacTier, {
  label: string; short: string; description: string
  bgColor: string; textColor: string; darkBg: string; darkText: string
}> = {
  FullControl:      { label: 'Full Control',      short: 'FC',  description: 'Grants unrestricted access to all resources including the ability to assign roles. Highest risk tier.',                      bgColor: '#fef2f2', textColor: '#dc2626', darkBg: '#450a0a', darkText: '#fca5a5' },
  AccessManagement: { label: 'Access Management', short: 'AM',  description: 'Grants the ability to manage security configurations, role assignments, or identity services without full resource control.', bgColor: '#fff7ed', textColor: '#ea580c', darkBg: '#431407', darkText: '#fdba74' },
  Contributor:      { label: 'Contributor',       short: 'CTB', description: 'Grants full write access to create and manage all resources but cannot assign roles or manage access to others.',            bgColor: '#fefce8', textColor: '#ca8a04', darkBg: '#422006', darkText: '#fde047' },
  DataPlane:        { label: 'Data Plane',        short: 'DP',  description: 'Grants access to data stored within services (blobs, queues, secrets, keys) without management plane control.',                bgColor: '#f0f9ff', textColor: '#0284c7', darkBg: '#082f49', darkText: '#7dd3fc' },
  Reader:           { label: 'Reader',            short: 'RDR', description: 'Grants read-only access to view existing resources. Cannot make changes or access sensitive data.',                           bgColor: '#f0fdf4', textColor: '#16a34a', darkBg: '#052e16', darkText: '#86efac' },
  Specialized:      { label: 'Specialized',       short: 'SPZ', description: 'Service-specific operational role with a narrow, well-defined scope. Risk level varies by role.',                            bgColor: '#f5f3ff', textColor: '#7c3aed', darkBg: '#2e1065', darkText: '#c4b5fd' },
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
    textColor: '#7a4a00', bgColor: '#fef3e2', darkText: '#ef9f27', darkBg: '#3a2a0a', order: 1,
  },
  UserAccess: {
    label: 'User Access',
    short: 'Tier 2',
    description: 'Acesso de usuario e leitura basica. Menor impacto de seguranca.',
    textColor: '#1a5c28', bgColor: '#e6f5e8', darkText: '#97c459', darkBg: '#1a2e10', order: 3,
  },
  Unclassified: {
    label: 'Nao classificada',
    short: '-',
    description: 'Sem classificacao de tier definida.',
    textColor: '#444441', bgColor: '#f1f0f0', darkText: '#b4b2a9', darkBg: '#2a2a28', order: 4,
  },
}

