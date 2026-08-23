import { notFound } from 'next/navigation'
import SoDRuleDetailClient from './SoDRuleDetailClient'
import { SOD_RULES, getSoDRuleById } from '@/data/sod/rules'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = getSoDRuleById(id)
  return { title: rule ? `${rule.name} · SoD` : 'SoD Analyzer' }
}

export function generateStaticParams() {
  return SOD_RULES.map((rule) => ({ id: rule.id }))
}

export default async function SoDRuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = getSoDRuleById(id)
  if (!rule) notFound()

  return <SoDRuleDetailClient rule={rule} />
}
