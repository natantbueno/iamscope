import { getAllSlugs, getRoleBySlug } from '@/lib/roles'
import RolePageClient from './RolePageClient'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export default async function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const role = getRoleBySlug(slug)
  if (!role) notFound()
  return <RolePageClient slug={slug} />
}
