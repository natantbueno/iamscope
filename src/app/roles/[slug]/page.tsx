import { getAllSlugsIncludingRedirects, getRoleBySlug, SLUG_REDIRECTS } from '@/lib/roles'
import RolePageClient from './RolePageClient'
import { notFound, redirect } from 'next/navigation'

export function generateStaticParams() {
  return getAllSlugsIncludingRedirects().map((slug) => ({ slug }))
}

export default async function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Slug renomeado (ex.: rebranding Azure AD → Microsoft Entra) — redireciona para o slug atual.
  const newSlug = SLUG_REDIRECTS[slug]
  if (newSlug) redirect(`/roles/${newSlug}/`)

  const role = getRoleBySlug(slug)
  if (!role) notFound()
  return <RolePageClient slug={slug} />
}
