'use client'

import { useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { CloudId, CloudEntry, CLOUD_META, RISK_META, getCloudUrl } from '@/data/compare/types'
import MitigationList from './MitigationList'

interface CloudEquivalenceCardProps {
  cloud: CloudId
  entry: CloudEntry
}

export default function CloudEquivalenceCard({ cloud, entry }: CloudEquivalenceCardProps) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const meta     = CLOUD_META[cloud]
  const riskMeta = RISK_META[entry.risk]
  const href     = entry.slug ? getCloudUrl(cloud, entry.slug) : null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-surface-border dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800"
        style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}>
        <span className="text-2xs font-bold px-1.5 py-0.5 rounded text-white shrink-0"
          style={{ background: meta.color }}>{meta.shortLabel}</span>
        <span className="text-tiny font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">
          {meta.label}
        </span>
        <span className="text-2xs px-1.5 py-0.5 rounded-full font-semibold shrink-0"
          style={{ background: riskMeta.bg, color: riskMeta.color }}>{riskMeta.label}</span>
      </div>

      {/* Role name */}
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {href ? (
              <Link href={href}
                className="text-tiny font-semibold hover:underline flex items-center gap-1 flex-wrap"
               >
                {entry.role}
                <ExternalLink size={10} className="shrink-0 opacity-60" />
              </Link>
            ) : (
              <p className="text-tiny font-semibold text-gray-800 dark:text-gray-200">{entry.role}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            {entry.keyPermissions.length > 0 && (
              <div>
                <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wider mb-1.5">{t('label.keyPermissions')}</p>
                <ul className="space-y-1">
                  {entry.keyPermissions.map((p, i) => (
                    <li key={i} className="text-3xs text-fg-muted flex items-start gap-1.5">
                      <span className="text-fg-muted dark:text-gray-600 mt-0.5 shrink-0">▸</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {entry.mitigations.length > 0 && (
              <div>
                <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wider mb-1.5">{t('section.mitigations')}</p>
                <MitigationList items={entry.mitigations} color={meta.color} />
              </div>
            )}
            {entry.notes && (
              <div className="text-2xs text-fg-muted italic bg-gray-50 dark:bg-gray-800 rounded p-2">
                {entry.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
