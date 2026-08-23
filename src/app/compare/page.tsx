'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo } from 'react'
import { GitCompare } from 'lucide-react'
import AppShell from '@/components/AppShell'
import CompareFilters from '@/components/CompareFilters'
import CompareTable from '@/components/CompareTable'
import ExportButton from '@/components/ExportButton'
import { CloudId, Equivalence, CLOUD_ORDER } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'

const equivalences = equivalencesData as Equivalence[]

function CompareContent() {
  const searchParams = useSearchParams()

  const selectedTiers = useMemo<number[]>(() => {
    const raw = searchParams.get('tiers')
    if (!raw) return [0, 1, 2]
    return raw.split(',').map(Number).filter(n => [0, 1, 2].includes(n))
  }, [searchParams])

  const visibleClouds = useMemo<CloudId[]>(() => {
    const raw = searchParams.get('clouds')
    if (!raw) return [...CLOUD_ORDER]
    return raw.split(',').filter((c): c is CloudId => CLOUD_ORDER.includes(c as CloudId))
  }, [searchParams])

  const selectedFunction = searchParams.get('fn') ?? 'all'
  const sortBy = (searchParams.get('sort') as 'tier' | 'function') ?? 'tier'

  const filtered = useMemo(() =>
    equivalences.filter(eq => {
      if (!selectedTiers.includes(eq.tier)) return false
      if (selectedFunction !== 'all' && eq.function !== selectedFunction) return false
      return true
    }),
  [selectedTiers, selectedFunction])

  return (
    <AppShell
      headerTitle="Comparativo Multi-Cloud"
      headerSub={`${filtered.length} equivalências · ${visibleClouds.length} clouds visíveis`}
      headerActions={
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-3xs text-fg-muted">
            <GitCompare size={14} />
            <span className="hidden sm:inline">Tier 0 = Control Plane · Tier 1 = Management · Tier 2 = Data/Workload</span>
          </div>
          <ExportButton
            filename="multi-cloud-compare"
            data={filtered.map((eq) => {
              const row: Record<string, unknown> = {
                name: eq.name, function: eq.function, tier: eq.tier, description: eq.description,
              }
              visibleClouds.forEach((c) => { row[c] = eq.clouds[c]?.role ?? '' })
              return row
            })}
          />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        <CompareFilters
          selectedTiers={selectedTiers}
          visibleClouds={visibleClouds}
          selectedFunction={selectedFunction}
          sortBy={sortBy}
        />
        <CompareTable
          equivalences={filtered}
          visibleClouds={visibleClouds}
          sortBy={sortBy}
        />
      </div>
    </AppShell>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <CompareContent />
    </Suspense>
  )
}
