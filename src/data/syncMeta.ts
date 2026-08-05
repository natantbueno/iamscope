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
    id: 'entra-api-permissions',
    label: 'Entra ID \u2014 API Permissions do Microsoft Graph (1.504)',
    platform: 'Entra ID',
    lastSynced: '2026-08-04',
    sourceLabel: 'Service principal do Microsoft Graph, via merill/microsoft-info (scripts/fetch-graph-permissions.js)',
    sourceUrl: 'https://github.com/merill/microsoft-info',
    sourceRef: 'snapshot de 2026-08-04 \u2014 appId 00000003-0000-0000-c000-000000000000',
    notes: 'Recoletado em 04/08. O dataset anterior tinha 854: as 692 Application do snapshot do EntraOps '
      + '(de 707) e s\u00f3 162 dos 797 escopos delegados, porque a coleta de 30/06 parseava a '
      + 'permissions-reference.md em vez de ler o inventário do service principal. Faltavam famílias '
      + 'inteiras de ControlPlane em delegated \u2014 Policy (29), RoleManagement (9), PrivilegedAccess (6). '
      + 'Os 854 antigos foram preservados verbatim: 0 órfãos, 0 IDs divergentes. As descrições agora são '
      + 'o texto oficial da Microsoft, no lugar do derivado do nome. category e eamTier continuam sendo '
      + 'classificação editorial nossa; o campo tierSource diz por linha se veio de curadoria (854), '
      + 'herança da Application de mesmo nome (443) ou da tabela declarada no script (207).',
  },
  {
    id: 'azure-rbac-roles',
    label: 'Azure RBAC — Built-in Roles (504)',
    platform: 'Azure RBAC',
    lastSynced: '2026-07-31',
    sourceLabel: 'MicrosoftDocs/azure-docs — built-in-roles reference (via scripts/fetch-azure-roles-official.js)',
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles',
    notes: 'Recontagem em 31/07: 504 é o número oficial, obtido de 504 blocos "roleName" e 504 GUIDs '
      + 'únicos nos 19 arquivos built-in-roles/*.md. O AzAdvertizer lista 937 porque mantém roles '
      + 'descontinuadas que já saíram da documentação da Microsoft.',
  },
  {
    id: 'azure-rbac-actions',
    label: 'Azure RBAC — Actions (2.697)',
    platform: 'Azure RBAC',
    lastSynced: '2026-08-03',
    sourceLabel: 'Azure resource provider operations (via scripts/fetch-azure-action-descriptions.js)',
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/resource-provider-operations',
    notes: 'Descrição oficial em 95,2% das 1.947 actions concretas. As outras 750 são wildcards '
      + '(Microsoft.Foo/*), que são padrão de correspondência e não operação — a Microsoft não as '
      + 'documenta, e por isso ficam fora do denominador.',
  },
  {
    id: 'aws-policies',
    label: 'AWS IAM — Managed Policies / Service Roles (1.553)',
    platform: 'AWS IAM',
    lastSynced: '2026-07-31',
    sourceLabel: 'AWS Managed Policy Reference (via scripts/fetch-aws-policies-official.js)',
    sourceUrl: 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html',
    notes: 'Recoletado em 31/07 da referência oficial: descrição, tipo, datas de criação/edição, '
      + 'versão e o JSON real do documento de policy. As descrições anteriores eram fabricadas e o '
      + '"Policy Document JSON" exibido era sintético — ambos substituídos pelo texto oficial. '
      + '1.552/1.553 policies com actions.',
  },
  {
    id: 'gcp-roles',
    label: 'GCP IAM — Predefined Roles (2.381)',
    platform: 'GCP IAM',
    lastSynced: '2026-07-31',
    sourceLabel: 'Google Cloud IAM — Roles and permissions (via scripts/fetch-gcp-roles-from-docs.js)',
    sourceUrl: 'https://docs.cloud.google.com/iam/docs/roles-permissions',
    notes: 'Coletado das docs públicas, sem credencial — a IAM API responde 403 sem autenticação, '
      + 'mas as páginas por serviço são renderizadas no servidor. 2.381 roles, batendo exatamente '
      + 'com o gcp.permissions.cloud. Antes o dataset tinha 232 roles com 6% de cobertura de permissões.',
  },
  {
    id: 'gws-roles',
    label: 'Google Workspace — Prebuilt Admin Roles (14) e privilégios (120)',
    platform: 'Google Workspace',
    lastSynced: '2026-08-03',
    sourceLabel: 'Google Workspace Admin Help — Prebuilt administrator roles + Administrator privilege definitions',
    sourceUrl: 'https://support.google.com/a/answer/2405986',
    sourceRef: 'doc de 2026-07-22 (roles) e 2026-07-23 (privilégios)',
    notes: 'Recoletado em 03/08/2026 por scripts/fetch-gws-roles.js. O dataset anterior listava 44 '
      + 'roles, das quais 30 não constam da documentação do Google, e 79 dos 84 nomes de privilégio '
      + 'não existiam na API. Tudo substituído pelo catálogo oficial. O mapa role->privilegeName só '
      + 'é publicado para 2 das 14 roles; para as demais exige OAuth no tenant e fica declarado como lacuna.',
  },
  {
    id: 'ibm-roles',
    label: 'IBM Cloud IAM — Roles (7) + Clássico (71 permissões)',
    platform: 'IBM Cloud',
    lastSynced: '2026-08-05',
    sourceLabel: 'IBM Cloud Docs — IAM roles + Managing classic infrastructure access',
    sourceUrl: 'https://cloud.ibm.com/docs/iam?topic=iam-userroles',
    notes: 'Recoletado em 03/08 por scripts/fetch-ibm-roles.js. O dataset anterior tinha 157 '
      + '"roles" e 619 "actions", das quais 502 eram prosa em português escrita por nós — nas 83 '
      + 'roles clássicas, 243 de 243. O modelo real da IBM tem 7 roles de IAM (4 de plataforma, 3 '
      + 'de serviço); a infraestrutura clássica não tem role, e sim permissão individual. '
      + 'Em 05/08 a lacuna do clássico foi fechada: os docs de IAM saíram do repo '
      + 'ibm-cloud-docs/account e hoje vivem em ibm-cloud-docs/iam, onde iam-mnginfra.md '
      + '(atualizado pela IBM em 04/06/2026) publica as seis tabelas de permissão. Entraram 71 '
      + 'permissões verbatim, e as categorias passaram de quatro declaradas por nós — Account, '
      + 'Devices, Network, Services — para as seis reais: Administrative, Devices, Network, '
      + 'Sales, Security e Software. Lacuna que continua: a IBM não publica ação por role de IAM '
      + '(o mapa por serviço existe em iam-service-roles-actions e ainda não foi coletado).',
  },

]

export function getLatestSync(): string {
  return DATA_SYNC.reduce((latest, d) => (d.lastSynced > latest ? d.lastSynced : latest), DATA_SYNC[0].lastSynced)
}
