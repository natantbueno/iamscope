import { Metadata } from 'next'
import TierPageClient from './TierPageClient'

type Props = { params: Promise<{ tier: string }> }

export async function generateStaticParams() {
  return [{ tier: 'tier0' }, { tier: 'tier1' }, { tier: 'tier2' }]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tier } = await params
  const names: Record<string, string> = { tier0: 'Tier 0 — Control Plane', tier1: 'Tier 1 — Management Plane', tier2: 'Tier 2 — Data/Workload Plane' }
  return { title: `Multi-Cloud Compare · ${names[tier] ?? tier}`, description: 'IAM equivalences by tier, compared across cloud platforms.' }
}

export default async function TierPage({ params }: Props) {
  const { tier } = await params
  return <TierPageClient tier={tier} />
}
