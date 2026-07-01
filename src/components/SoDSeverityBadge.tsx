'use client'

import { SoDSeverity, SOD_SEVERITY_META } from '@/data/sod/rules'

export default function SoDSeverityBadge({ severity }: { severity: SoDSeverity }) {
  const meta = SOD_SEVERITY_META[severity]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  )
}
