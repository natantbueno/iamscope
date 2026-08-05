'use client'

import { Shield } from 'lucide-react'

interface MitigationListProps {
  items: string[]
  color?: string
}

export default function MitigationList({ items, color = '#6b7280' }: MitigationListProps) {
  if (!items || items.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <Shield size={12} className="shrink-0 mt-0.5" style={{ color }} />
          <span className="text-3xs text-fg-subtle dark:text-gray-400 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}
