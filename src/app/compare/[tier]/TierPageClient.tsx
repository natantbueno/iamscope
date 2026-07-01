'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AppShell from '@/components/AppShell'
import CompareTable from '@/components/CompareTable'
import { Equivalence, CLOUD_ORDER, CloudId } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'
import tiersData from '@/data/compare/tiers.json'

const equivalences = equivalencesData as Equivalence[]

const TIER_LEVEL: Record<string, number> = { tier0: 0, tier1: 1, tier2: 2 }

export default function TierPageClient({ tier }: { tier: string }) {
  const level     = TIER_LEVEL[tier] ?? 0
  const tierMeta  = tiersData.find(t => t.id === tier)
  const filtered  = equivalences.filter(eq => eq.tier === level)

  if (!tierMeta) {
    return (
      <AppShell headerTitle="Tier não encontrado" headerSub="Compare">
        <div className="flex items-center justify-center flex-1 text-gray-400">Tier não encontrado.</div>
      </AppShell>
    )
  }

  return (
    <AppShell
      headerTitle={tierMeta.name}
      headerSub={`${filtered.length} equivalências · ${tierMeta.label} risk`}
      headerBack={
        <Link href="/compare" className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-blue-500 transition-colors">
          <ArrowLeft size={14} /> Compare
        </Link>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Tier banner */}
        <div className="px-4 py-3 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: tierMeta.color }}>
              {tierMeta.label}
            </span>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{tierMeta.description}</p>
          </div>
          <div className="flex gap-2 mt-2">
            {(['tier0', 'tier1', 'tier2'] as const).map(t => {
              const m = tiersData.find(x => x.id === t)!
              return (
                <Link key={t} href={`/compare/${t}`}
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${t === tier ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  style={t === tier ? { background: m.color, borderColor: m.color } : {}}>
                  {m.shortName}
                </Link>
              )
            })}
          </div>
        </div>
        <CompareTable equivalences={filtered} visibleClouds={CLOUD_ORDER as CloudId[]} />
      </div>
    </AppShell>
  )
}
