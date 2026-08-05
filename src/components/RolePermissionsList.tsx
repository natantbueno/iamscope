'use client'

import { useState, useMemo } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { Search, Copy, CheckCheck } from 'lucide-react'
import { RolePermission, EamTier, EAM_META } from '@/data/roles'
import { useTheme } from './ThemeProvider'
import EamTierBadge from './EamTierBadge'
import ExportButton from './ExportButton'

export default function RolePermissionsList({ permissions }: { permissions: RolePermission[] }) {
  const t = useT()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | EamTier>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const filtered = useMemo(() => {
    return permissions.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch = !q || p.action.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      const matchTier = tierFilter === 'all' || p.tier === tierFilter
      return matchSearch && matchTier
    })
  }, [permissions, search, tierFilter])

  // Conta por tier
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    permissions.forEach((p) => { counts[p.tier] = (counts[p.tier] || 0) + 1 })
    return counts
  }, [permissions])

  const copy = (action: string) => {
    navigator.clipboard.writeText(action)
    setCopied(action)
    setTimeout(() => setCopied(null), 1500)
  }

  const tiers: ('all' | EamTier)[] = ['all', 'ControlPlane', 'ManagementPlane', 'UserAccess']

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ph.filterActions')}
            className="w-full text-tiny pl-8 pr-3 py-1.5 border border-surface-border dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        {tiers.map((t) => {
          const count = t === 'all' ? permissions.length : (tierCounts[t] || 0)
          if (t !== 'all' && count === 0) return null
          return (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`text-3xs px-2.5 py-1 rounded-full border transition-colors ${
                tierFilter === t
                  ? 'bg-brand-soft dark:bg-brand-activeBg text-brand-strong dark:text-brand-onDark border-brand-mid font-medium'
                  : 'bg-white dark:bg-gray-900 text-fg-muted border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {t === 'all' ? 'Todas' : EAM_META[t].label} ({count})
            </button>
          )
        })}
        <ExportButton
          wrapperClassName="ml-auto"
          filename="role-permissions"
          data={filtered.map((p) => ({ action: p.action, category: p.category, tier: p.tier }))}
        />
      </div>

      {/* Table */}
      <div className="border border-surface-border dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-tiny border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
              <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2">Role Action</th>
              <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 w-40">{t('table.category')}</th>
              <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 w-36">Tier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-fg-subtle text-body">{t('empty.actions')}</td></tr>
            ) : (
              filtered.map((p, i) => (
                <tr key={p.action + i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-start gap-1.5">
                      <code className="font-mono text-3xs text-gray-600 dark:text-gray-300 break-all leading-relaxed">{p.action}</code>
                      <button onClick={() => copy(p.action)}
                        className="opacity-0 group-hover:opacity-100 text-fg-muted dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 mt-0.5 transition-opacity"
                        title={t('action.copy')}>
                        {copied === p.action ? <CheckCheck size={11} className="text-green-600 opacity-100" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-fg-muted text-3xs">{p.category || '—'}</td>
                  <td className="px-3 py-2 align-top"><EamTierBadge tier={p.tier} showLabel={false} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-3xs text-fg-muted mt-2">
        {filtered.length} de {permissions.length} role actions
      </p>
    </div>
  )
}
