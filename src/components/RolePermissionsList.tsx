'use client'

import { useState, useMemo } from 'react'
import { Search, Copy, CheckCheck } from 'lucide-react'
import { RolePermission, EamTier, EAM_META } from '@/data/roles'
import { useTheme } from './ThemeProvider'
import EamTierBadge from './EamTierBadge'

export default function RolePermissionsList({ permissions }: { permissions: RolePermission[] }) {
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
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar ações..."
            className="w-full text-[12px] pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
          />
        </div>
        {tiers.map((t) => {
          const count = t === 'all' ? permissions.length : (tierCounts[t] || 0)
          if (t !== 'all' && count === 0) return null
          return (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                tierFilter === t
                  ? 'bg-[#e8f1fb] dark:bg-[#0c2a47] text-[#0078d4] dark:text-[#85b7eb] border-[#9dc3e8] font-medium'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {t === 'all' ? 'Todas' : EAM_META[t].label} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">Role Action</th>
              <th className="text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 w-40">Categoria</th>
              <th className="text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 w-36">Tier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-400 text-[13px]">Nenhuma ação encontrada.</td></tr>
            ) : (
              filtered.map((p, i) => (
                <tr key={p.action + i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-start gap-1.5">
                      <code className="font-mono text-[11px] text-gray-600 dark:text-gray-300 break-all leading-relaxed">{p.action}</code>
                      <button onClick={() => copy(p.action)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 mt-0.5 transition-opacity"
                        title="Copiar">
                        {copied === p.action ? <CheckCheck size={11} className="text-green-600 opacity-100" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-gray-500 dark:text-gray-400 text-[11px]">{p.category || '—'}</td>
                  <td className="px-3 py-2 align-top"><EamTierBadge tier={p.tier} showLabel={false} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        {filtered.length} de {permissions.length} role actions
      </p>
    </div>
  )
}
