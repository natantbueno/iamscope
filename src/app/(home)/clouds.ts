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
  dotClass: string      // ponto/ícone (token csp.*)
  hoverBorder: string   // borda no hover (token csp.*)
}

// As contagens são calculadas no build. Os rótulos saem TODOS como chave
// `count.*` — plural, porque vêm depois de um número. Antes metade era texto
// cru em inglês e a outra metade reaproveitava chave de cabeçalho de tabela,
// o que imprimia "13 Categoria" no card do Azure RBAC.
export function buildClouds(): CloudCard[] {
  return [
    {
      name: 'Entra ID', href: '/entraid',
      metrics: [{ n: ROLES.length, label: 'count.roles' }, { n: API_PERMISSIONS.length, label: 'count.apiPermissions' }, { n: getRoleActions().length, label: 'count.roleActions' }],
      dotClass: 'bg-csp-azure', hoverBorder: 'hover:border-csp-azure',
    },
    {
      name: 'Azure RBAC', href: '/azure-rbac',
      metrics: [{ n: AZURE_ROLES.length, label: 'count.roles' }, { n: AZURE_ROLES.filter((r) => r.isPrivileged).length, label: 'count.privileged' }, { n: [...new Set(AZURE_ROLES.map((r) => r.category))].length, label: 'count.categories' }],
      dotClass: 'bg-csp-azure-rbac', hoverBorder: 'hover:border-csp-azure-rbac',
    },
    {
      name: 'AWS IAM', href: '/aws',
      metrics: [{ n: AWS_POLICIES.length, label: 'count.policies' }, { n: AWS_ACTION_COUNT, label: 'count.actions' }, { n: AWS_SERVICE_COUNT, label: 'count.services' }],
      dotClass: 'bg-csp-aws', hoverBorder: 'hover:border-csp-aws',
    },
    {
      name: 'GCP IAM', href: '/gcp',
      metrics: [{ n: GCP_ROLES.length, label: 'count.roles' }, { n: GCP_PERMISSION_COUNT, label: 'count.permissions' }, { n: GCP_SERVICE_COUNT, label: 'count.services' }],
      dotClass: 'bg-csp-gcp', hoverBorder: 'hover:border-csp-gcp',
    },
    {
      name: 'Google Workspace', href: '/google-workspace',
      metrics: [{ n: GWS_ROLES.length, label: 'count.roles' }, { n: GWS_ROLES.filter((r) => r.isPrivileged).length, label: 'count.privileged' }, { n: GWS_SCOPES.length, label: 'count.oauthScopes' }],
      dotClass: 'bg-csp-gws', hoverBorder: 'hover:border-csp-gws',
    },
    {
      name: 'IBM Cloud', href: '/ibm-cloud',
      // Sem Actions/Services: a IBM não publica action por role — cada serviço
      // mapeia as próprias ações para as 7 roles do IAM. Os números antigos
      // vinham de um dataset com 557 actions inventadas.
      metrics: [{ n: IBM_ROLES.length, label: 'count.iamRoles' }, { n: IBM_ROLES.filter((r) => r.isPrivileged).length, label: 'count.privileged' }, { n: IBM_ACCESS_PRIMITIVES.length, label: 'count.accessPrimitives' }],
      dotClass: 'bg-csp-ibm', hoverBorder: 'hover:border-csp-ibm',
    },
  ]
}
