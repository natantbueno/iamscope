import StatsClient from './StatsClient'

// Metadata em inglês: com `output: 'export'` o HTML é gerado uma vez no build e
// a troca de idioma é client-side, então title/description não trocam junto.
export const metadata = {
  title: 'Statistics',
  description: 'Role, tier, privilege and SoD statistics across Entra ID, Azure RBAC, AWS IAM, GCP IAM, Google Workspace and IBM Cloud.',
}

export default function StatsPage() {
  return <StatsClient />
}
