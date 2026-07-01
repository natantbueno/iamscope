'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Minus } from 'lucide-react'
import { Equivalence, CloudId, CLOUD_META, RISK_META, getCloudUrl } from '@/data/compare/types'
import MitigationList from './MitigationList'

interface CompareTableProps {
  equivalences: Equivalence[]
  visibleClouds: CloudId[]
  sortBy?: 'tier' | 'function'
}

const TIER_COLORS: Record<number, { color: string; bg: string; label: string }> = {
  0: { color: '#ef4444', bg: '#ef444418', label: 'Tier 0' },
  1: { color: '#f97316', bg: '#f9731618', label: 'Tier 1' },
  2: { color: '#eab308', bg: '#eab30818', label: 'Tier 2' },
}

export default function CompareTable({ equivalences, visibleClouds, sortBy = 'tier' }: CompareTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const sorted = [...equivalences].sort((a, b) =>
    sortBy === 'tier' ? a.tier - b.tier || a.name.localeCompare(b.name)
                      : a.name.localeCompare(b.name)
  )

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Minus size={28} className="mb-2 opacity-40" />
        <p className="text-[13px]">Nenhuma equivalência encontrada com os filtros selecionados</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto flex-1">
      <table className="w-full text-[12px] border-separate border-spacing-0" style={{ minWidth: 700 }}>
        <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
          <tr>
            <th className="text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-[#dde3ec] dark:border-gray-800 w-56 min-w-[180px]">
              Função
            </th>
            <th className="text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-[#dde3ec] dark:border-gray-800 w-20">
              Tier
            </th>
            {visibleClouds.map(cloud => (
              <th key={cloud}
                className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-2 border-b border-[#dde3ec] dark:border-gray-800 min-w-[130px]"
                style={{ color: CLOUD_META[cloud].color }}>
                {CLOUD_META[cloud].shortLabel}
              </th>
            ))}
            <th className="w-8 border-b border-[#dde3ec] dark:border-gray-800" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((eq, idx) => {
            const tierMeta  = TIER_COLORS[eq.tier]
            const isOpen    = expanded.has(eq.id)
            const rowBg     = idx % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-900/40'

            return (
              <>
                <tr key={eq.id}
                  className={`border-b border-gray-50 dark:border-gray-900 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer transition-colors ${rowBg}`}
                  onClick={() => toggle(eq.id)}>

                  {/* Function name */}
                  <td className="px-3 py-2.5 w-56">
                    <p className="font-semibold text-[12px] text-gray-800 dark:text-gray-200 leading-tight">{eq.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{eq.description}</p>
                  </td>

                  {/* Tier badge */}
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{ background: tierMeta.bg, color: tierMeta.color }}>
                      {tierMeta.label}
                    </span>
                  </td>

                  {/* Cloud cells */}
                  {visibleClouds.map(cloud => {
                    const entry = eq.clouds[cloud]
                    if (!entry) {
                      return (
                        <td key={cloud} className="px-3 py-2.5">
                          <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">—</span>
                        </td>
                      )
                    }
                    const riskMeta  = RISK_META[entry.risk]
                    const cloudMeta = CLOUD_META[cloud]
                    const href = entry.slug ? getCloudUrl(cloud, entry.slug) : null
                    return (
                      <td key={cloud} className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-0.5">
                          {href ? (
                            <Link href={href}
                              className="text-[11px] font-medium hover:underline truncate"
                              style={{ color: cloudMeta.color }}>
                              {entry.role}
                            </Link>
                          ) : (
                            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{entry.role}</span>
                          )}
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full w-fit"
                            style={{ background: riskMeta.bg, color: riskMeta.color }}>
                            {riskMeta.label}
                          </span>
                        </div>
                      </td>
                    )
                  })}

                  {/* Expand toggle */}
                  <td className="px-2 py-2.5 text-right">
                    {isOpen
                      ? <ChevronUp size={13} className="text-gray-400" />
                      : <ChevronDown size={13} className="text-gray-300 dark:text-gray-600" />}
                  </td>
                </tr>

                {/* Expanded panel */}
                {isOpen && (
                  <tr key={`${eq.id}-detail`} className={rowBg}>
                    <td colSpan={visibleClouds.length + 3} className="px-0 pb-0 pt-0">
                      <div className="mx-2 mb-3 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                        {/* Description */}
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-[11px] text-gray-600 dark:text-gray-400">{eq.description}</p>
                        </div>
                        {/* Per-cloud details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 divide-x divide-y divide-gray-100 dark:divide-gray-800">
                          {visibleClouds.map(cloud => {
                            const entry = eq.clouds[cloud]
                            const cloudMeta = CLOUD_META[cloud]
                            if (!entry) {
                              return (
                                <div key={cloud} className="p-3 opacity-40">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: cloudMeta.color }}>{cloudMeta.shortLabel}</span>
                                  <p className="text-[11px] text-gray-400 mt-2 italic">Sem mapeamento disponível</p>
                                </div>
                              )
                            }
                            const riskMeta = RISK_META[entry.risk]
                            const href = entry.slug ? getCloudUrl(cloud, entry.slug) : null
                            return (
                              <div key={cloud} className="p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0" style={{ background: cloudMeta.color }}>{cloudMeta.shortLabel}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background: riskMeta.bg, color: riskMeta.color }}>{riskMeta.label}</span>
                                </div>
                                {href ? (
                                  <Link href={href} className="text-[11px] font-semibold hover:underline block" style={{ color: cloudMeta.color }}>{entry.role}</Link>
                                ) : (
                                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{entry.role}</p>
                                )}
                                {entry.keyPermissions.length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Permissões</p>
                                    <ul className="space-y-0.5">
                                      {entry.keyPermissions.slice(0, 3).map((p, i) => (
                                        <li key={i} className="text-[10px] text-gray-500 dark:text-gray-400 flex gap-1">
                                          <span className="text-gray-300 dark:text-gray-600 shrink-0">▸</span>{p}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <MitigationList items={entry.mitigations.slice(0, 3)} color={cloudMeta.color} />
                                {entry.notes && (
                                  <p className="text-[10px] text-gray-400 italic">{entry.notes}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
