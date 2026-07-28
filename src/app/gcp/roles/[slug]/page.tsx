import { GCP_ROLES } from '@/data/gcp'
import GcpRoleClient from '@/components/GcpRoleClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const r = GCP_ROLES.find((r) => r.slug === slug)
  return { title: r ? `${r.name} · GCP IAM` : 'GCP IAM' }
}

export function generateStaticParams() {
  return GCP_ROLES.map((r) => ({ slug: r.slug }))
}

export default async function GcpRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <GcpRoleClient slug={slug} />
}
