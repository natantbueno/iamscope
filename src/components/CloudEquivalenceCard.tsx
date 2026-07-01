'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { CloudId, CloudEntry, CLOUD_META, RISK_META, getCloudUrl } from '@/data/compare/types'
import MitigationList from './MitigationList'

interface CloudEquivalenceCardProps {
  cloud: CloudId
  entry: CloudEntry
}

export default function CloudEquivalenceCard({ cloud, entry }: CloudEquivalenceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const meta     = CLOUD_META[cloud]
  const riskMeta = RISK_META[entry.risk]
  const href     = entry.slug ? getCloudUrl(cloud, entry.slug) : null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800"
        style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
          style={{ background: meta.color }}>{meta.shortLabel}</span>
        <span className="text-[12px] font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">
          {meta.label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
          style={{ background: riskMeta.bg, color: riskMeta.color }}>{riskMeta.label}</span>
      </div>

      {/* Role name */}
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {href ? (
              <Link href={href}
                className="text-[12px] font-semibold hover:underline flex items-center gap-1 flex-wrap"
                style={{ color: meta.color }}>
                {entry.role}
                <ExternalLink size={10} className="shrink-0 opacity-60" />
              </Link>
            ) : (
              <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">{entry.role}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            {entry.keyPermissions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Permissões-chave</p>
                <ul className="space-y-1">
                  {entry.keyPermissions.map((p, i) => (
                    <li key={i} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                      <span className="text-gray-300 dark:text-gray-600 mt-0.5 shrink-0">▸</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {entry.mitigations.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Mitigações</p>
                <MitigationList items={entry.mitigations} color={meta.color} />
              </div>
            )}
            {entry.notes && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800 rounded p-2">
                {entry.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
