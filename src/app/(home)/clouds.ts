// Contagens da home, calculadas em build time a partir dos datasets reais.
//
// Vive fora de page.tsx porque o Next proíbe export extra num arquivo de rota:
// exportar `buildClouds` de lá quebra o typecheck do próprio framework.
import { ROLES } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { AZURE_ROLES } from '@/data/azureRbac'
import { AWS_POLICIES, AWS_ACTION_COUNT, AWS_SERVICE_COUNT } from '@/data/aws'
import { GCP_ROLES, GCP_PERMISSION_COUNT, GCP_SERVICE_COUNT } from '@/data/gcp'
import { GWS_ROLES, GWS_SCOPES } from '@/data/googleWorkspace'
import { IBM_ROLES } from '@/data/ibmCloud'
import { IBM_ACCESS_PRIMITIVES } from '@/data/ibmAccessPrimitives'
import { SOD_RULES } from '@/data/sod/rules'
import { getRoleActions } from '@/lib/roleActions'

export interface CloudCard {
  name: string
  href: string
  metrics: { n: number; label: string }[]
  total: number // usado no gráfico de cobertura (itens da listagem principal)
  dotClass: string      // ponto/ícone (token csp.*)
  hoverBorder: string   // borda no hover (token csp.*)
  barClass: string      // barra do gráfico de cobertura
}

// As contagens são calculadas no build. Os rótulos de cada métrica saem como
// chave, não como texto pronto: quem formata o número e traduz o rótulo é o
// HomeClient, que sabe em que idioma a pessoa está.
export function buildClouds(): CloudCard[] {
  return [
    {
      name: 'Entra ID', href: '/entraid',
      metrics: [{ n: ROLES.length, label: 'Roles' }, { n: API_PERMISSIONS.length, label: 'API Permissions' }, { n: getRoleActions().length, label: 'Role Actions' }],
      total: ROLES.length,
      dotClass: 'bg-csp-azure', hoverBorder: 'hover:border-csp-azure', barClass: 'bg-csp-azure',
    },
    {
      name: 'Azure RBAC', href: '/azure-rbac',
      metrics: [{ n: AZURE_ROLES.length, label: 'Roles' }, { n: AZURE_ROLES.filter((r) => r.isPrivileged).length, label: 'filter.privileged' }, { n: [...new Set(AZURE_ROLES.map((r) => r.category))].length, label: 'table.category' }],
      total: AZURE_ROLES.length,
      dotClass: 'bg-csp-azure-rbac', hoverBorder: 'hover:border-csp-azure-rbac', barClass: 'bg-csp-azure-rbac',
    },
    {
      name: 'AWS IAM', href: '/aws',
      metrics: [{ n: AWS_POLICIES.length, label: 'Policies' }, { n: AWS_ACTION_COUNT, label: 'Actions' }, { n: AWS_SERVICE_COUNT, label: 'Services' }],
      total: AWS_POLICIES.length,
      dotClass: 'bg-csp-aws', hoverBorder: 'hover:border-csp-aws', barClass: 'bg-csp-aws',
    },
    {
      name: 'GCP IAM', href: '/gcp',
      metrics: [{ n: GCP_ROLES.length, label: 'Roles' }, { n: GCP_PERMISSION_COUNT, label: 'Permissions' }, { n: GCP_SERVICE_COUNT, label: 'Services' }],
      total: GCP_ROLES.length,
      dotClass: 'bg-csp-gcp', hoverBorder: 'hover:border-csp-gcp', barClass: 'bg-csp-gcp',
    },
    {
      name: 'Google Workspace', href: '/google-workspace',
      metrics: [{ n: GWS_ROLES.length, label: 'Roles' }, { n: GWS_ROLES.filter((r) => r.isPrivileged).length, label: 'filter.privileged' }, { n: GWS_SCOPES.length, label: 'OAuth Scopes' }],
      total: GWS_ROLES.length,
      dotClass: 'bg-csp-gws', hoverBorder: 'hover:border-csp-gws', barClass: 'bg-csp-gws',
    },
    {
      name: 'IBM Cloud', href: '/ibm-cloud',
      // Sem Actions/Services: a IBM não publica action por role — cada serviço
      // mapeia as próprias ações para as 7 roles do IAM. Os números antigos
      // vinham de um dataset com 557 actions inventadas.
      metrics: [{ n: IBM_ROLES.length, label: 'IAM Roles' }, { n: IBM_ROLES.filter((r) => r.isPrivileged).length, label: 'filter.privileged' }, { n: IBM_ACCESS_PRIMITIVES.length, label: 'Access Primitives' }],
      total: IBM_ROLES.length,
      dotClass: 'bg-csp-ibm', hoverBorder: 'hover:border-csp-ibm', barClass: 'bg-csp-ibm',
    },
  ]
}
