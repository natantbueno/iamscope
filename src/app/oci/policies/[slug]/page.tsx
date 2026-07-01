import { OCI_POLICIES } from '@/data/oci'
import OciPolicyClient from '@/components/OciPolicyClient'

export function generateStaticParams() {
  return OCI_POLICIES.map((p) => ({ slug: p.slug }))
}

export default async function OciPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <OciPolicyClient slug={slug} />
}
