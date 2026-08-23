'use client'

import Link from 'next/link'
import { useT } from '@/i18n/LanguageProvider'
import { ArrowLeft, Shield, ExternalLink } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { Equivalence, CLOUD_META, CLOUD_ORDER, RISK_META, CloudId, getCloudUrl } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'
import tiersData from '@/data/compare/tiers.json'

const equivalences = equivalencesData as Equivalence[]

export default function FunctionPageClient({ tier, funcId }: { tier: string; funcId: string }) {
  const t = useT()
  const eq = equivalences.find(e => e.id === funcId)
  const tierMeta = tiersData.find(t => t.id === tier)

  if (!eq || !tierMeta) {
    return (
      <AppShell headerTitle={t('empty.functionNotFound')} headerSub="Compare">
        <div className="flex items-center justify-center flex-1 text-fg-subtle">{t('empty.equivalenceNotFound')}</div>
      </AppShell>
    )
  }

  const clouds = CLOUD_ORDER.filter(c => eq.clouds[c])
  // "N/A" é a cloud não ter função equivalente, não dado faltando. O subtítulo
  // dizia "6 plataformas" mesmo quando metade era N/A.
  const comEquivalente = clouds.filter(c => eq.clouds[c]!.role !== 'N/A').length

  return (
    <AppShell
      headerTitle={eq.name}
      headerSub={`${comEquivalente} de ${clouds.length} plataformas · ${tierMeta.label} risk`}
      headerBack={
        <Link href={`/compare/${tier}`} className="flex items-center gap-1 text-body text-fg-muted hover:text-blue-500 transition-colors">
          <ArrowLeft size={14} /> {tierMeta.shortName}
        </Link>
      }
    >
      <div className="flex flex-col flex-1 overflow-auto">
        {/* Header card */}
        <div className="px-4 py-4 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: tierMeta.color }}>
              {tierMeta.label}
            </span>
            <span className="text-3xs text-fg-subtle font-mono">{eq.id}</span>
          </div>
          <p className="text-body text-fg-muted mt-1">{eq.description}</p>
        </div>

        {/* Cloud cards grid */}
        <div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clouds.map(cloudId => {
            const entry = eq.clouds[cloudId]!
            const meta = CLOUD_META[cloudId]
            const risk = RISK_META[entry.risk]
            const url = entry.slug ? getCloudUrl(cloudId, entry.slug) : null
            // Cartão de N/A fica visualmente mais leve e sem badge de risco: a
            // ausência de função equivalente não tem risco a qualificar.
            const semEquivalente = entry.role === 'N/A'

            return (
              <div key={cloudId} className={`bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3${semEquivalente ? ' border-dashed' : ''}`}>
                {/* Cloud header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0${semEquivalente ? ' opacity-40' : ''}`} style={{ background: meta.color }} />
                    <span className="text-tiny font-semibold text-gray-700 dark:text-gray-200">{meta.shortLabel}</span>
                  </div>
                  {!semEquivalente && (
                    <span className="text-2xs font-bold px-1.5 py-0.5 rounded" style={{ color: risk.color, background: risk.bg }}>
                      {risk.label}
                    </span>
                  )}
                </div>

                {/* Role name */}
                <div>
                  {semEquivalente ? (
                    <span className="text-tiny italic text-fg-subtle">{t('cmp.noEquivalent')}</span>
                  ) : url ? (
                    <Link href={url} className="text-tiny font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      {entry.role} <ExternalLink size={10} />
                    </Link>
                  ) : (
                    <span className="text-tiny font-mono text-gray-700 dark:text-gray-300">{entry.role}</span>
                  )}
                  {entry.notes && (
                    <p className="text-3xs text-fg-subtle mt-0.5">{entry.notes}</p>
                  )}
                </div>

                {/* Key permissions */}
                {entry.keyPermissions.length > 0 && (
                  <div>
                    <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wide mb-1">{t('table.permissions')}</p>
                    <ul className="flex flex-col gap-0.5">
                      {entry.keyPermissions.map((perm, i) => (
                        <li key={i} className="text-3xs font-mono text-fg-muted flex items-start gap-1">
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
                    <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wide mb-1">{t('section.mitigations')}</p>
                    <ul className="flex flex-col gap-0.5">
                      {entry.mitigations.map((m, i) => (
                        <li key={i} className="text-3xs text-fg-muted flex items-start gap-1">
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
