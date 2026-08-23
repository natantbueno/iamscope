import { AZURE_ROLES } from '@/data/azureRbac'
import AzureRbacRoleClient from '@/components/AzureRbacRoleClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const r = AZURE_ROLES.find((r) => r.slug === slug)
  return { title: r ? `${r.name} · Azure RBAC` : 'Azure RBAC' }
}

export function generateStaticParams() {
  return AZURE_ROLES.map((r) => ({ slug: r.slug }))
}

export default async function AzureRbacRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AzureRbacRoleClient slug={slug} />
}
