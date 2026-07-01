import { AZURE_ROLES } from '@/data/azureRbac'
import AzureRbacRoleClient from '@/components/AzureRbacRoleClient'

export function generateStaticParams() {
  return AZURE_ROLES.map((r) => ({ slug: r.slug }))
}

export default async function AzureRbacRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AzureRbacRoleClient slug={slug} />
}
