import { AWS_POLICIES } from '@/data/aws'
import AwsPolicyClient from '@/components/AwsPolicyClient'

export function generateStaticParams() {
  return AWS_POLICIES.map((p) => ({ slug: p.slug }))
}

export default async function AwsPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AwsPolicyClient slug={slug} />
}
