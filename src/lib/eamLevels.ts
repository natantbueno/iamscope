// ── Normalização de tier interno para o nível EAM (0 / 1 / 2) ───────────────
//
// Cada plataforma tem a própria escada de tiers, e o site já traduz todas para
// os três níveis do Enterprise Access Model usados em /compare e
// /tier-comparison:
//
//   0  Control Plane      quem controla a identidade e o acesso
//   1  Management Plane   quem administra recurso
//   2  Workload / Data    quem lê ou opera dentro do recurso
//
// POR QUE ESTE ARQUIVO EXISTE
//   Os seis mapas moravam dentro de evaluateCatalog.ts, ao lado do matching.
//   A avaliação por permissões (evaluateByPermissions.ts) precisa exatamente
//   dos mesmos mapas, e duplicá-los garantiria que um dia os dois divergissem
//   em silêncio — com o site dando dois tiers diferentes para a mesma role
//   dependendo de ela ter casado ou não com o catálogo.
//
//   Só tipos são importados aqui, e `import type` some na compilação: este
//   módulo não arrasta dataset nenhum para o bundle de quem o importa.
//
// A CLASSIFICAÇÃO É EDITORIAL
//   Para o Entra ID a fonte é o `eamTier` do EntraOps. Para as demais é a
//   classificação do próprio IAM Scope, documentada nas páginas /reference.
//   Não é publicada pelos provedores.

import type { EamTier } from '@/data/roles'
import type { AzureRbacTier } from '@/data/azureRbac'
import type { AwsTier } from '@/data/aws'
import type { GcpTier } from '@/data/gcp'
import type { GwsTier } from '@/data/googleWorkspace'
import type { IbmTier } from '@/data/ibmCloud'

export type EamLevel = 0 | 1 | 2

export const ENTRA_TIER_LEVEL: Record<EamTier, EamLevel | null> = {
  ControlPlane: 0, ManagementPlane: 1, UserAccess: 2, Unclassified: null,
}
export const AZURE_TIER_LEVEL: Record<AzureRbacTier, EamLevel> = {
  FullControl: 0, AccessManagement: 0, Contributor: 1, DataPlane: 1, Specialized: 1, Reader: 2,
}
export const AWS_TIER_LEVEL: Record<AwsTier, EamLevel> = {
  FullAccess: 0, PowerUser: 1, Operator: 1, Specialized: 1, ReadOnly: 2,
}
export const GCP_TIER_LEVEL: Record<GcpTier, EamLevel> = {
  ProjectOwner: 0, Admin: 0, Editor: 1, Operator: 1, Developer: 1, Specialized: 1, Viewer: 2,
}
export const GWS_TIER_LEVEL: Record<GwsTier, EamLevel> = {
  SuperAdmin: 0, DelegatedAdmin: 1, ServiceAdmin: 1, SpecializedAdmin: 1, ReadOnly: 2,
}
export const IBM_TIER_LEVEL: Record<IbmTier, EamLevel> = {
  AccountAdmin: 0, PlatformAdmin: 1, PlatformOperator: 1, ServiceManager: 1, ReadOnly: 2,
}
