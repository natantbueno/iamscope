import { IBM_ROLES } from '@/data/ibmCloud'
import IbmCloudRoleClient from '@/components/IbmCloudRoleClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const r = IBM_ROLES.find((r) => r.slug === slug)
  return { title: r ? `${r.name} · IBM Cloud IAM` : 'IBM Cloud IAM' }
}

export function generateStaticParams() {
  return IBM_ROLES.map((r) => ({ slug: r.slug }))
}

export default async function IbmRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <IbmCloudRoleClient slug={slug} />
}
