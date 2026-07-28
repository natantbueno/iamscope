import { Metadata } from 'next'
import FunctionPageClient from './FunctionPageClient'
import equivalencesData from '@/data/compare/equivalences.json'
import { Equivalence } from '@/data/compare/types'

const equivalences = equivalencesData as Equivalence[]

type Props = { params: Promise<{ tier: string; function: string }> }

export async function generateStaticParams() {
  return equivalences.map(eq => ({
    tier: `tier${eq.tier}`,
    function: eq.id,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const funcId = p['function']
  const eq = equivalences.find(e => e.id === funcId)
  return {
    title: `Multi-Cloud Compare · ${eq?.name ?? funcId}`,
    description: eq?.description ?? 'Comparativo de equivalências IAM por função entre plataformas cloud.',
  }
}

export default async function FunctionPage({ params }: Props) {
  const p = await params
  const funcId = p['function']
  return <FunctionPageClient tier={p.tier} funcId={funcId} />
}
