'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, ExternalLink } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { Equivalence, CLOUD_META, CLOUD_ORDER, RISK_META, CloudId, getCloudUrl } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'
import tiersData from '@/data/compare/tiers.json'

const equivalences = equivalencesData as Equivalence[]

export default function FunctionPageClient({ tier, funcId }: { tier: string; funcId: string }) {
  const eq = equivalences.find(e => e.id === funcId)
  const tierMeta = tiersData.find(t => t.id === tier)

  if (!eq || !tierMeta) {
    return (
      <AppShell headerTitle="Função não encontrada" headerSub="Compare">
        <div className="flex items-center justify-center flex-1 text-gray-400">Equivalência não encontrada.</div>
      </AppShell>
    )
  }

  const clouds = CLOUD_ORDER.filter(c => eq.clouds[c])

  return (
    <AppShell
      headerTitle={eq.name}
      headerSub={`${clouds.length} plataformas · ${tierMeta.label} risk`}
      headerBack={
        <Link href={`/compare/${tier}`} className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-blue-500 transition-colors">
          <ArrowLeft size={14} /> {tierMeta.shortName}
        </Link>
      }
    >
      <div className="flex flex-col flex-1 overflow-auto">
        {/* Header card */}
        <div className="px-4 py-4 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: tierMeta.color }}>
              {tierMeta.label}
            </span>
            <span className="text-[11px] text-gray-400 font-mono">{eq.id}</span>
          </div>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{eq.description}</p>
        </div>

        {/* Cloud cards grid */}
        <div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clouds.map(cloudId => {
            const entry = eq.clouds[cloudId]!
            const meta = CLOUD_META[cloudId]
            const risk = RISK_META[entry.risk]
            const url = entry.slug ? getCloudUrl(cloudId, entry.slug) : null

            return (
              <div key={cloudId} className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3">
                {/* Cloud header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                    <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{meta.shortLabel}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: risk.color, background: risk.bg }}>
                    {risk.label}
                  </span>
                </div>

                {/* Role name */}
                <div>
                  {url ? (
                    <Link href={url} className="text-[12px] font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      {entry.role} <ExternalLink size={10} />
                    </Link>
                  ) : (
                    <span className="text-[12px] font-mono text-gray-700 dark:text-gray-300">{entry.role}</span>
                  )}
                  {entry.notes && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{entry.notes}</p>
                  )}
                </div>

                {/* Key permissions */}
                {entry.keyPermissions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Permissões</p>
                    <ul className="flex flex-col gap-0.5">
                      {entry.keyPermissions.map((perm, i) => (
                        <li key={i} className="text-[11px] font-mono text-gray-600 dark:text-gray-400 flex items-start gap-1">
                          <span className="mt-[3px] shrink-0 w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mitigations */}
                {entry.mitigations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Mitigações</p>
                    <ul className="flex flex-col gap-0.5">
                      {entry.mitigations.map((m, i) => (
                        <li key={i} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-1">
                          <Shield size={10} className="mt-[2px] shrink-0 text-amber-500" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
