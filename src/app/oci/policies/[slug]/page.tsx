import { OCI_POLICIES } from '@/data/oci'
import OciPolicyClient from '@/components/OciPolicyClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = OCI_POLICIES.find((p) => p.slug === slug)
  return { title: p ? `${p.name} · OCI IAM` : 'OCI IAM' }
}

export function generateStaticParams() {
  return OCI_POLICIES.map((p) => ({ slug: p.slug }))
}

export default async function OciPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <OciPolicyClient slug={slug} />
}
