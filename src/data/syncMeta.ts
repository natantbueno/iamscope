// ── Metadados de sincronização dos dados ─────────────────────────────────────
// Registra quando cada conjunto de dados foi sincronizado/verificado pela última
// vez contra sua fonte oficial, para dar transparência de frescor ao usuário.
//
// Criado em 2026-06-30 como parte da auditoria de completude/precisão do site.
// Antes dessa data não havia rastreamento de versão/commit por fonte — as datas
// abaixo marcam a primeira verificação registrada (baseline), não necessariamente
// a data original de criação do dado. A partir daqui, atualize `lastSynced` (e
// `sourceRef`, quando aplicável) toda vez que um conjunto de dados for re-sincronizado.

export interface DataSourceSync {
  id: string
  label: string
  platform: string
  lastSynced: string // YYYY-MM-DD
  sourceLabel: string
  sourceUrl: string
  sourceRef?: string // commit, versão ou data de publicação da fonte, quando conhecida
  notes?: string
}

export const DATA_SYNC: DataSourceSync[] = [
  {
    id: 'entra-directory-roles',
    label: 'Entra ID — Directory Roles (144)',
    platform: 'Entra ID',
    lastSynced: '2026-06-30',
    sourceLabel: 'EntraOps / AzurePrivilegedIAM — Classification_EntraIdDirectoryRoles.json',
    sourceUrl: 'https://github.com/Cloud-Architekt/AzurePrivilegedIAM',
    notes: 'Verificado linha a linha contra a tabela oficial do Microsoft Learn em 30/06/2026 — 1 rename e 1 correção de grafia aplicados.',
  },
  {
    id: 'entra-api-permissions-application',
    label: 'Entra ID — API Permissions, Application (692)',
    platform: 'Entra ID',
    lastSynced: '2026-06-30',
    sourceLabel: 'EntraOps / AzurePrivilegedIAM — Classification_MsGraphAppRoles.json',
    sourceUrl: 'https://github.com/Cloud-Architekt/AzurePrivilegedIAM',
  },
  {
    id: 'entra-api-permissions-delegated',
    label: 'Entra ID — API Permissions, Delegated (162)',
    platform: 'Entra ID',
    lastSynced: '2026-06-30',
    sourceLabel: 'Microsoft Graph permissions reference (microsoft-graph-docs-contrib)',
    sourceUrl: 'https://learn.microsoft.com/en-us/graph/permissions-reference',
    notes: 'Cobertura inicial parcial (162 de ~700+ escopos delegados do Graph) — ver cabeçalho de apiPermissions.ts. Tier inferido a partir do sinal AdminConsentRequired quando não há par exato com a Application permission de mesmo nome.',
  },
  {
    id: 'azure-rbac-roles',
    label: 'Azure RBAC — Built-in Roles (926)',
    platform: 'Azure RBAC',
    lastSynced: '2026-07-01',
    sourceLabel: 'MicrosoftDocs/azure-docs — built-in-roles reference (via scripts/fetch-azure-roles.js)',
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
  },
  {
    id: 'aws-policies',
    label: 'AWS IAM — Managed Policies / Service Roles (497)',
    platform: 'AWS IAM',
    lastSynced: '2026-06-30',
    sourceLabel: 'AWS Managed Policy Reference + documentação oficial AWS IAM',
    sourceUrl: 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/about-managed-policy-reference.html',
  },
  {
    id: 'gcp-roles',
    label: 'GCP IAM — Predefined Roles (232)',
    platform: 'GCP IAM',
    lastSynced: '2026-06-30',
    sourceLabel: 'Google Cloud IAM — Understanding roles',
    sourceUrl: 'https://cloud.google.com/iam/docs/understanding-roles',
  },
  {
    id: 'gws-roles',
    label: 'Google Workspace — Admin Roles & OAuth Scopes (40)',
    platform: 'Google Workspace',
    lastSynced: '2026-06-30',
    sourceLabel: 'Google Workspace Admin SDK — Roles & OAuth 2.0 Scopes',
    sourceUrl: 'https://developers.google.com/workspace/admin/roles',
  },
  {
    id: 'oci-policies',
    label: 'OCI IAM — Policy Patterns (126)',
    platform: 'OCI IAM',
    lastSynced: '2026-06-30',
    sourceLabel: 'Oracle Cloud Infrastructure — Identity & Policy Reference',
    sourceUrl: 'https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/policyreference.htm',
    notes: 'Catálogo sintético de padrões de policy — a OCI não publica um catálogo nomeado equivalente ao de managed policies da AWS.',
  },
  {
    id: 'ibm-roles',
    label: 'IBM Cloud IAM — Roles & Access (157)',
    platform: 'IBM Cloud',
    lastSynced: '2026-06-30',
    sourceLabel: 'IBM Cloud Docs — Account, IAM roles & actions',
    sourceUrl: 'https://cloud.ibm.com/docs/account?topic=account-userroles',
  },
]

export function getLatestSync(): string {
  return DATA_SYNC.reduce((latest, d) => (d.lastSynced > latest ? d.lastSynced : latest), DATA_SYNC[0].lastSynced)
}
