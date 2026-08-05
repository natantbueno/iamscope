'use client'

import Link from 'next/link'

export interface StatItem {
  label: string
  value: number | string
  color?: 'red' | 'orange' | 'blue' | 'green' | 'gray' | 'purple'
  href?: string
}

const colorMap: Record<string, { val: string }> = {
  red:    { val: 'text-red-600 dark:text-red-400' },
  orange: { val: 'text-amber-700 dark:text-amber-400' },
  blue:   { val: 'text-brand-strong dark:text-brand-onDark' },
  green:  { val: 'text-emerald-600 dark:text-emerald-400' },
  purple: { val: 'text-purple-600 dark:text-purple-400' },
  gray:   { val: 'text-fg-muted' },
}

export default function StatsBar({ stats }: { stats: StatItem[] }) {
  return (
    <div className="px-6 py-2 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-1 flex-wrap">
      {stats.map((s, i) => {
        const c = colorMap[s.color ?? 'gray']
        const content = (
          <span className={`inline-flex items-center gap-1.5 text-tiny ${s.href ? 'hover:underline cursor-pointer' : ''}`}>
            <span className="text-fg-muted">{s.label}</span>
            <span className={`font-semibold tabular-nums ${c.val}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</span>
          </span>
        )
        return (
          <span key={s.label} className="flex items-center gap-1">
            {i > 0 && <span className="text-fg dark:text-gray-700 mx-2 select-none">·</span>}
            {s.href ? <Link href={s.href}>{content}</Link> : content}
          </span>
        )
      })}
    </div>
  )
}
