import { AWS_POLICIES } from '@/data/aws'
import AwsPolicyClient from '@/components/AwsPolicyClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = AWS_POLICIES.find((p) => p.slug === slug)
  return { title: p ? `${p.name} · AWS IAM` : 'AWS IAM' }
}

export function generateStaticParams() {
  return AWS_POLICIES.map((p) => ({ slug: p.slug }))
}

export default async function AwsPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AwsPolicyClient slug={slug} />
}
