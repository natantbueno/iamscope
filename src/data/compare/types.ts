export type CloudId     = 'entraId' | 'azureRbac' | 'aws' | 'gcp' | 'oci' | 'ibmCloud' | 'googleWorkspace'
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

export const CLOUD_META: Record<CloudId, { label: string; shortLabel: string; color: string }> = {
  entraId:         { label: 'Entra ID',        shortLabel: 'Entra',  color: '#0078d4' },
  azureRbac:       { label: 'Azure RBAC',      shortLabel: 'Azure',  color: '#008ad7' },
  aws:             { label: 'AWS IAM',          shortLabel: 'AWS',    color: '#ff9900' },
  gcp:             { label: 'GCP IAM',          shortLabel: 'GCP',    color: '#4285f4' },
  oci:             { label: 'OCI IAM',          shortLabel: 'OCI',    color: '#C74634' },
  ibmCloud:        { label: 'IBM Cloud',        shortLabel: 'IBM',    color: '#0f62fe' },
  googleWorkspace: { label: 'Google Workspace', shortLabel: 'GWS',    color: '#34a853' },
}

export const CLOUD_ORDER: CloudId[] = ['entraId', 'azureRbac', 'aws', 'gcp', 'oci', 'ibmCloud', 'googleWorkspace']

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
    oci:             `/oci/policies/${slug}`,
    ibmCloud:        `/ibm-cloud/roles/${slug}`,
    googleWorkspace: `/google-workspace/roles/${slug}`,
  }
  return routes[cloud]
}
