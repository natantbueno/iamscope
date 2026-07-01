import { GWS_ROLES } from '@/data/googleWorkspace'
import GwsRoleClient from '@/components/GwsRoleClient'

export function generateStaticParams() {
  return GWS_ROLES.map((r) => ({ slug: r.slug }))
}

export default async function GwsRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <GwsRoleClient slug={slug} />
}
