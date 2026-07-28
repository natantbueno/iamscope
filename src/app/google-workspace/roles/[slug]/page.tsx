import { GWS_ROLES } from '@/data/googleWorkspace'
import GwsRoleClient from '@/components/GwsRoleClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const r = GWS_ROLES.find((r) => r.slug === slug)
  return { title: r ? `${r.name} · Google Workspace` : 'Google Workspace' }
}

export function generateStaticParams() {
  return GWS_ROLES.map((r) => ({ slug: r.slug }))
}

export default async function GwsRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <GwsRoleClient slug={slug} />
}
