'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'
import { CloudId, CLOUD_META, CLOUD_ORDER } from '@/data/compare/types'
import tiersData from '@/data/compare/tiers.json'
import functionsData from '@/data/compare/functions.json'
import { useT } from '@/i18n/LanguageProvider'

interface CompareFiltersProps {
  selectedTiers: number[]
  visibleClouds: CloudId[]
  selectedFunction: string
  sortBy: string
}

export default function CompareFilters({ selectedTiers, visibleClouds, selectedFunction, sortBy }: CompareFiltersProps) {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const toggleTier = (level: number) => {
    const next = selectedTiers.includes(level)
      ? selectedTiers.filter(t => t !== level)
      : [...selectedTiers, level]
    update('tiers', next.length === 3 ? '' : next.join(','))
  }

  const toggleCloud = (cloud: CloudId) => {
    const next = visibleClouds.includes(cloud)
      ? visibleClouds.filter(c => c !== cloud)
      : [...visibleClouds, cloud]
    update('clouds', next.length === CLOUD_ORDER.length ? '' : next.join(','))
  }

  const hasFilters =
    selectedTiers.length !== 3 ||
    visibleClouds.length !== CLOUD_ORDER.length ||
    selectedFunction !== 'all' ||
    sortBy !== 'tier'

  const reset = () => router.replace('?', { scroll: false })

  const TIER_COLORS: Record<number, string> = { 0: '#ef4444', 1: '#f97316', 2: '#eab308' }

  return (
    <div className="px-4 py-3 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-3xs font-semibold text-fg-muted uppercase tracking-wider">Filtros</span>
        {hasFilters && (
          <button onClick={reset}
            className="flex items-center gap-1 text-3xs text-fg-subtle hover:text-red-500 transition-colors">
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      {/* Tier filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-3xs text-fg-subtle w-12 shrink-0">Tier</span>
        {tiersData.map(t => {
          const active = selectedTiers.includes(t.level)
          return (
            <button key={t.id} onClick={() => toggleTier(t.level)}
              className={`text-3xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${active ? 'text-white border-transparent' : 'text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              style={active ? { background: TIER_COLORS[t.level], borderColor: TIER_COLORS[t.level] } : {}}>
              {t.shortName} · {t.label}
            </button>
          )
        })}
      </div>

      {/* Function filter */}
      <div className="flex items-center gap-2">
        <span className="text-3xs text-fg-subtle w-12 shrink-0">{t('table.function')}</span>
        <select
          value={selectedFunction}
          onChange={e => update('fn', e.target.value === 'all' ? '' : e.target.value)}
          className="text-tiny px-2 py-1 rounded border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="all">{t('filter.allFunctions')}</option>
          {functionsData.map(fn => (
            <option key={fn.id} value={fn.id}>{fn.name}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => update('sort', e.target.value === 'tier' ? '' : e.target.value)}
          className="text-tiny px-2 py-1 rounded border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="tier">Ordenar: Tier</option>
          <option value="function">{t('filter.sortByFunction')}</option>
        </select>
      </div>

      {/* Cloud toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-3xs text-fg-subtle w-12 shrink-0">Clouds</span>
        {CLOUD_ORDER.map(cloud => {
          const meta   = CLOUD_META[cloud]
          const active = visibleClouds.includes(cloud)
          return (
            <button key={cloud} onClick={() => toggleCloud(cloud)}
              className={`text-3xs px-2 py-0.5 rounded-full border font-medium transition-colors ${active ? 'text-white border-transparent' : 'text-fg-subtle border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 line-through opacity-50'}`}
              style={active ? { background: meta.color, borderColor: meta.color } : {}}>
              {meta.shortLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
