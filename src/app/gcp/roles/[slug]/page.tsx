import { GCP_ROLES } from '@/data/gcp'
import GcpRoleClient from '@/components/GcpRoleClient'

export function generateStaticParams() {
  return GCP_ROLES.map((r) => ({ slug: r.slug }))
}

export default async function GcpRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <GcpRoleClient slug={slug} />
}
