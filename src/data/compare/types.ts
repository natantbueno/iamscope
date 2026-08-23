import { CLOUD_COLORS } from '@/lib/cloudColors'

export type CloudId     = 'entraId' | 'azureRbac' | 'aws' | 'gcp' | 'ibmCloud' | 'googleWorkspace'
export type RiskLevel   = 'critical' | 'high' | 'medium' | 'low'
export type TierLevel   = 0 | 1 | 2

export interface Tier {
  id: string
  level: TierLevel
  name: string
  shortName: string
  description: string
  color: string
  bg: string
  risk: RiskLevel
  label: string
}

export interface CloudFunction {
  id: string
  name: string
  tier: TierLevel
  description: string
}

export interface CloudEntry {
  role: string
  slug?: string
  risk: RiskLevel
  keyPermissions: string[]
  mitigations: string[]
  notes?: string
}

export interface Equivalence {
  id: string
  function: string
  tier: TierLevel
  name: string
  description: string
  clouds: Partial<Record<CloudId, CloudEntry>>
}

/**
 * Cores IDÊNTICAS às do menu superior (src/components/CloudNav.tsx).
 *
 * Estavam divergindo — Azure aqui era #008ad7 contra #5c2d91 no menu, GCP
 * #4285f4 contra #0f9d58, IBM #0f62fe contra #08bdba. Numa página cujo trabalho
 * é comparar clouds lado a lado, a mesma cloud aparecia de uma cor no menu e de
 * outra na tabela, o que fazia a página parecer desalinhada do resto do site.
 */
export const CLOUD_META: Record<CloudId, { label: string; shortLabel: string; color: string }> = {
  entraId:         { label: 'Entra ID',        shortLabel: 'Entra',  color: CLOUD_COLORS.entraId.mark },
  azureRbac:       { label: 'Azure RBAC',      shortLabel: 'Azure',  color: CLOUD_COLORS.azureRbac.mark },
  aws:             { label: 'AWS IAM',          shortLabel: 'AWS',    color: CLOUD_COLORS.aws.mark },
  gcp:             { label: 'GCP IAM',          shortLabel: 'GCP',    color: CLOUD_COLORS.gcp.mark },
  ibmCloud:        { label: 'IBM Cloud',        shortLabel: 'IBM',    color: CLOUD_COLORS.ibmCloud.mark },
  googleWorkspace: { label: 'Google Workspace', shortLabel: 'GWS',    color: CLOUD_COLORS.googleWorkspace.mark },
}

export const CLOUD_ORDER: CloudId[] = ['entraId', 'azureRbac', 'aws', 'gcp', 'ibmCloud', 'googleWorkspace']

export const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: '#ef444418' },
  high:     { label: 'High',     color: '#f97316', bg: '#f9731618' },
  medium:   { label: 'Medium',   color: '#eab308', bg: '#eab30818' },
  low:      { label: 'Low',      color: '#22c55e', bg: '#22c55e18' },
}

export function getCloudUrl(cloud: CloudId, slug: string): string {
  const routes: Record<CloudId, string> = {
    entraId:         `/entraid/roles/${slug}`,
    azureRbac:       `/azure-rbac/roles/${slug}`,
    aws:             `/aws/policies/${slug}`,
    gcp:             `/gcp/roles/${slug}`,
    ibmCloud:        `/ibm-cloud/roles/${slug}`,
    googleWorkspace: `/google-workspace/roles/${slug}`,
  }
  return routes[cloud]
}
