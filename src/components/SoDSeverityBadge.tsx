'use client'

import { themedText } from '@/lib/readableColor'
import { SoDSeverity, SOD_SEVERITY_META } from '@/data/sod/rules'

export default function SoDSeverityBadge({ severity }: { severity: SoDSeverity }) {
  const meta = SOD_SEVERITY_META[severity]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider whitespace-nowrap themed-color"
      style={{ background: meta.bg, ...themedText(meta.color, meta.bg) }}
    >
      {meta.label}
    </span>
  )
}
