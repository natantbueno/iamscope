import { notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import SoDRuleDetailCard from '@/components/SoDRuleDetailCard'
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

  return (
    <AppShell headerTitle={rule.name} headerSub="Detalhe da regra SoD — Entra ID + Azure RBAC">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-8 py-8">
          <SoDRuleDetailCard rule={rule} />
        </div>
      </div>
    </AppShell>
  )
}
