import {
  ENTRA_ROLES_COUNT, ENTRA_ACTIONS_COUNT, ENTRA_API_PERMISSIONS_COUNT,
  AZURE_ROLES_COUNT, AWS_POLICIES_COUNT, AWS_ACTIONS_COUNT, AWS_SERVICES_COUNT,
  GCP_ROLES_COUNT, GCP_PERMISSIONS_COUNT, GCP_SERVICES_COUNT,
  GWS_ROLES_COUNT, GWS_PRIVILEGES_COUNT, GWS_SCOPES_COUNT,
  IBM_ROLES_COUNT, IBM_ACCESS_PRIMITIVES_COUNT, IBM_CLASSIC_PERMISSIONS_COUNT,
  SOD_RULES_COUNT,
} from './counts'
import type { TranslationKey } from '@/i18n/dictionary'

/**
 * Índice de navegação do site, por cloud.
 *
 * POR QUE EXISTE
 *   As páginas de Reference eram só conceituais — tiers, boas práticas, links
 *   para a documentação do provedor. Não diziam o que o PRÓPRIO site tem: quem
 *   chegava em /aws/reference não descobria ali que existem 16.117 actions
 *   catalogadas a um clique.
 *
 *   Este arquivo é a fonte única disso. Ele alimenta o índice no topo de cada
 *   Reference e é verificado por scripts/check-site-index.js, que confere se
 *   toda rota listada existe e se toda rota da cloud está listada — senão o
 *   índice envelhece do mesmo jeito que o /info envelheceu.
 *
 * AS CONTAGENS VÊM DE counts.ts
 *   Nunca escritas à mão. Foi assim que o syncMeta passou meses anunciando
 *   "GCP (232)" com 2.381 roles no dataset.
 *
 * O `-1` em `count` significa "sem número" — usado para páginas conceituais,
 * como a comparação SCP vs Identity Policies.
 */
export interface SiteIndexEntry {
  /** Rota interna, sem barra final — `urlDe`/Link cuidam disso. */
  href: string
  /** Rótulo curto. Fica em inglês nos dois idiomas, como no menu lateral. */
  label: string
  /** Chave da descrição de uma linha. */
  desc: TranslationKey
  /** Quantos itens a página lista. -1 quando não se aplica. */
  count: number
  /** Substantivo do que é contado, para "16.117 actions". */
  noun: TranslationKey
}

export const SITE_INDEX: Record<string, SiteIndexEntry[]> = {
  entraId: [
    { href: '/entraid',                 label: 'Dashboard',       desc: 'idx.dashboard',   count: -1,                          noun: 'noun.items' },
    { href: '/entraid/roles',           label: 'Built-in Roles',  desc: 'idx.entraRoles',  count: ENTRA_ROLES_COUNT,           noun: 'noun.roles' },
    { href: '/entraid/role-actions',    label: 'Role Actions',    desc: 'idx.entraActions',count: ENTRA_ACTIONS_COUNT,         noun: 'noun.actions' },
    { href: '/entraid/api-permissions', label: 'API Permissions', desc: 'idx.entraApi',    count: ENTRA_API_PERMISSIONS_COUNT, noun: 'noun.permissions' },
    { href: '/entraid/pim',             label: 'PIM',             desc: 'idx.entraPim',    count: -1,                          noun: 'noun.items' },
  ],
  azureRbac: [
    { href: '/azure-rbac',             label: 'Dashboard',      desc: 'idx.dashboard',  count: -1,                noun: 'noun.items' },
    { href: '/azure-rbac/roles',       label: 'Built-in Roles', desc: 'idx.azureRoles', count: AZURE_ROLES_COUNT, noun: 'noun.roles' },
    { href: '/azure-rbac/permissions', label: 'Actions',        desc: 'idx.azurePerms', count: 2697,              noun: 'noun.actions' },
  ],
  aws: [
    { href: '/aws',                          label: 'Dashboard',     desc: 'idx.dashboard', count: -1,                noun: 'noun.items' },
    { href: '/aws/policies',                 label: 'IAM Policies',  desc: 'idx.awsPolicies', count: AWS_POLICIES_COUNT, noun: 'noun.policies' },
    { href: '/aws/actions',                  label: 'IAM Actions',   desc: 'idx.awsActions', count: AWS_ACTIONS_COUNT, noun: 'noun.actions' },
    { href: '/aws/scp-vs-identity-policies', label: 'SCP vs Policies', desc: 'idx.awsScp',  count: -1,                noun: 'noun.items' },
  ],
  gcp: [
    { href: '/gcp',             label: 'Dashboard',       desc: 'idx.dashboard', count: -1,                    noun: 'noun.items' },
    { href: '/gcp/roles',       label: 'IAM Roles',       desc: 'idx.gcpRoles',  count: GCP_ROLES_COUNT,       noun: 'noun.roles' },
    { href: '/gcp/permissions', label: 'IAM Permissions', desc: 'idx.gcpPerms',  count: GCP_PERMISSIONS_COUNT, noun: 'noun.permissions' },
  ],
  googleWorkspace: [
    { href: '/google-workspace',                 label: 'Dashboard',        desc: 'idx.dashboard', count: -1,                   noun: 'noun.items' },
    { href: '/google-workspace/roles',           label: 'Admin Roles',      desc: 'idx.gwsRoles',  count: GWS_ROLES_COUNT,      noun: 'noun.roles' },
    { href: '/google-workspace/privileges',      label: 'Admin Privileges', desc: 'idx.gwsPrivs',  count: GWS_PRIVILEGES_COUNT, noun: 'noun.privileges' },
    { href: '/google-workspace/api-permissions', label: 'OAuth Scopes',     desc: 'idx.gwsScopes', count: GWS_SCOPES_COUNT,     noun: 'noun.scopes' },
  ],
  ibmCloud: [
    { href: '/ibm-cloud',               label: 'Dashboard',     desc: 'idx.dashboard',  count: -1,                          noun: 'noun.items' },
    { href: '/ibm-cloud/roles',         label: 'IAM Roles',     desc: 'idx.ibmRoles',   count: IBM_ROLES_COUNT,             noun: 'noun.roles' },
    { href: '/ibm-cloud/classic',       label: 'Classic Infrastructure', desc: 'idx.ibmClassic', count: IBM_CLASSIC_PERMISSIONS_COUNT, noun: 'noun.permissions' },
    { href: '/ibm-cloud/access-groups', label: 'Access Groups', desc: 'idx.ibmGroups',  count: IBM_ACCESS_PRIMITIVES_COUNT, noun: 'noun.items' },
  ],
}

/**
 * Ferramentas multi-cloud. Aparecem em TODAS as Reference porque não pertencem
 * a nenhuma cloud — e porque são o que o site tem de próprio. Quem chega numa
 * página de referência por busca não tem outro caminho para descobri-las.
 */
export const SITE_TOOLS: SiteIndexEntry[] = [
  { href: '/search',           label: 'Busca global',        desc: 'idx.search',    count: 4603, noun: 'noun.roles' },
  { href: '/permission-scope', label: 'Permission Scope',    desc: 'idx.scope',     count: -1,   noun: 'noun.items' },
  { href: '/compare',          label: 'Multi-Cloud Compare', desc: 'idx.compare',   count: -1,   noun: 'noun.items' },
  { href: '/sod',              label: 'SoD Analyzer',        desc: 'idx.sod',       count: SOD_RULES_COUNT,   noun: 'noun.rules' },
  { href: '/assessment',       label: 'Assessment',          desc: 'idx.assessment',count: -1,   noun: 'noun.items' },
  { href: '/evaluate',         label: 'Role Evaluator',      desc: 'idx.evaluate',  count: -1,   noun: 'noun.items' },
  { href: '/advisor',          label: 'Role Advisor',        desc: 'idx.advisor',   count: -1,   noun: 'noun.items' },
  { href: '/tier-comparison',  label: 'Tier 0 Comparison',   desc: 'idx.tierZero',  count: -1,   noun: 'noun.items' },
]

/** Contagem total de serviços, exibida como contexto onde faz sentido. */
export const SERVICOS = {
  aws: AWS_SERVICES_COUNT,
  gcp: GCP_SERVICES_COUNT,
}
