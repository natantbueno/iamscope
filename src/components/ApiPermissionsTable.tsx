'use client'

import { useState, useMemo, useCallback } from 'react'
import { Copy, CheckCheck, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { EamTier } from '@/data/roles'
import EamTierBadge from './EamTierBadge'

type ApiFilter = 'all' | EamTier
type PermType = 'all' | 'Application' | 'Delegated'
type SortCol = 'name' | 'type' | 'action' | 'scope' | 'category' | 'tier' | 'resource'
type SortDir = 'asc' | 'desc'

const TIER_FILTERS: { label: string; value: ApiFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Control Plane', value: 'ControlPlane' },
  { label: 'Management Plane', value: 'ManagementPlane' },
  { label: 'User Access', value: 'UserAccess' },
  { label: 'Unclassified', value: 'Unclassified' },
]

const TIER_ORDER: Record<EamTier, number> = {
  ControlPlane: 0, ManagementPlane: 1, UserAccess: 2, Unclassified: 3,
}

/** Analisa o nome da permissão: "Users.ReadWrite.All" → { root, action, scope } */
function parsePermName(name: string): { root: string; action: string; scope: string } {
  const parts = name.split('.')
  if (parts.length === 1) return { root: name, action: '', scope: '' }
  if (parts.length === 2) return { root: parts[0], action: parts[1], scope: '' }
  return {
    root: parts.slice(0, -2).join('.'),
    action: parts[parts.length - 2],
    scope: parts[parts.length - 1],
  }
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  Read:         { bg: '#e6f4ea', text: '#1a5c28' },
  ReadBasic:    { bg: '#e6f4ea', text: '#1a5c28' },
  ReadAll:      { bg: '#e6f4ea', text: '#1a5c28' },
  Write:        { bg: '#fef3e2', text: '#7a4a00' },
  ReadWrite:    { bg: '#fef3e2', text: '#7a4a00' },
  Manage:       { bg: '#fde8e8', text: '#9a2020' },
  FullControl:  { bg: '#fde8e8', text: '#9a2020' },
  Send:         { bg: '#e8f1fb', text: '#0a4f8c' },
  Create:       { bg: '#e8f1fb', text: '#0a4f8c' },
}

const PAGE_SIZE = 100

export default function ApiPermissionsTable({ search, initialTier = 'all' }: { search: string; initialTier?: string }) {
  const [tier, setTier] = useState<ApiFilter>(
    ['ControlPlane', 'ManagementPlane', 'UserAccess', 'Unclassified'].includes(initialTier)
      ? (initialTier as ApiFilter) : 'all'
  )
  const [permType, setPermType] = useState<PermType>('all')
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const toggleSort = useCallback((col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }, [sortCol])

  // estatísticas
  const stats = useMemo(() => {
    const app = API_PERMISSIONS.filter((p) => p.type === 'Application').length
    const del = API_PERMISSIONS.filter((p) => p.type === 'Delegated').length
    return { total: API_PERMISSIONS.length, app, del }
  }, [])

  // unique categories para filtro
  const categories = useMemo(() =>
    [...new Set(API_PERMISSIONS.map((p) => p.category).filter(Boolean))].sort(), [])

  const [category, setCategory] = useState('all')

  const enriched = useMemo(() => API_PERMISSIONS.map((p) => ({
    ...p,
    ...parsePermName(p.name),
  })), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.root.toLowerCase().includes(q)
      const matchTier = tier === 'all' || p.eamTier === tier
      const matchType = permType === 'all' || p.type === permType
      const matchCat = category === 'all' || p.category === category
      return matchSearch && matchTier && matchType && matchCat
    })
  }, [enriched, search, tier, permType, category])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortCol === 'type') cmp = a.type.localeCompare(b.type)
      else if (sortCol === 'action') cmp = a.action.localeCompare(b.action)
      else if (sortCol === 'scope') cmp = a.scope.localeCompare(b.scope)
      else if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
      else if (sortCol === 'tier') cmp = (TIER_ORDER[a.eamTier] ?? 99) - (TIER_ORDER[b.eamTier] ?? 99)
      else if (sortCol === 'resource') cmp = a.resource.localeCompare(b.resource)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  const visible = sorted.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < sorted.length

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Stats bar */}
      <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4 bg-gray-50/60 dark:bg-gray-900/40">
        <StatPill label="Total" value={stats.total} />
        <span className="text-gray-200 dark:text-gray-700">|</span>
        <StatPill label="Application" value={stats.app} color="purple" onClick={() => { setPermType('Application'); setPage(1) }} active={permType === 'Application'} />
        <StatPill label="Delegated" value={stats.del} color="blue" onClick={() => { setPermType('Delegated'); setPage(1) }} active={permType === 'Delegated'} />
        {permType !== 'all' && (
          <button onClick={() => setPermType('all')} className="text-[11px] text-gray-400 hover:text-[#0078d4] dark:hover:text-[#85b7eb] ml-1">
            × limpar
          </button>
        )}
        <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">
          {filtered.length.toLocaleString()} de {stats.total}
        </span>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-wrap">
        {/* Tier chips */}
        {TIER_FILTERS.map((f) => (
          <button key={f.value} onClick={() => { setTier(f.value); setPage(1) }}
            className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
              tier === f.value
                ? 'bg-[#e8f1fb] dark:bg-[#0c2a47] text-[#0078d4] dark:text-[#85b7eb] border-[#9dc3e8] dark:border-[#185fa5] font-medium'
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {f.label}
          </button>
        ))}

        {/* Category dropdown */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">Categoria:</span>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="text-[11px] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0078d4] max-w-[180px]">
            <option value="all">Todas ({categories.length})</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-[14px]">
            Nenhuma permissão encontrada.
          </div>
        ) : (
          <>
            <table className="w-full text-[12px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <SortTh col="name" active={sortCol} dir={sortDir} onSort={toggleSort} className="min-w-[220px]">Permissão</SortTh>
                  <SortTh col="type" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-28">Tipo</SortTh>
                  <SortTh col="action" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-28">Ação</SortTh>
                  <SortTh col="scope" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-24">Escopo</SortTh>
                  <SortTh col="category" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-40">Categoria</SortTh>
                  <SortTh col="tier" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-36">EAM Tier</SortTh>
                  <SortTh col="resource" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-36">Recurso</SortTh>
                </tr>
              </thead>
              <tbody>
                {visible.map((perm) => (
                  <tr key={perm.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    {/* Nome + ID */}
                    <td className="px-4 py-2.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-[11px] text-[#0078d4] dark:text-[#85b7eb] font-medium break-all">{perm.name}</code>
                        <button onClick={() => copyId(perm.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 transition-opacity"
                          title="Copiar ID">
                          {copiedId === perm.id ? <CheckCheck size={11} className="text-green-600 opacity-100" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="text-[9px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{perm.id.substring(0, 8)}…</div>
                    </td>
                    {/* Tipo */}
                    <td className="px-4 py-2.5 align-middle">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        perm.type === 'Application'
                          ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {perm.type === 'Application' ? 'AppRole' : 'Delegated'}
                      </span>
                    </td>
                    {/* Ação (verbo) */}
                    <td className="px-4 py-2.5 align-middle">
                      <ActionBadge action={perm.action} />
                    </td>
                    {/* Escopo */}
                    <td className="px-4 py-2.5 align-middle">
                      {perm.scope ? (
                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {perm.scope}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    {/* Categoria */}
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{perm.category || '—'}</span>
                    </td>
                    {/* EAM Tier */}
                    <td className="px-4 py-2.5 align-middle">
                      <EamTierBadge tier={perm.eamTier} />
                    </td>
                    {/* Recurso */}
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{perm.resource}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasMore && (
              <div className="flex justify-center py-4">
                <button onClick={() => setPage((p) => p + 1)}
                  className="text-[12px] px-4 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Carregar mais ({sorted.length - visible.length} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────── */

function StatPill({ label, value, color, onClick, active }: {
  label: string; value: number; color?: string; onClick?: () => void; active?: boolean
}) {
  const base = 'text-[11px] flex items-center gap-1'
  const interactive = onClick ? 'cursor-pointer hover:underline' : ''
  const c = active ? 'font-semibold text-[#0078d4] dark:text-[#85b7eb]' : 'text-gray-500 dark:text-gray-400'
  return (
    <span className={`${base} ${interactive} ${c}`} onClick={onClick}>
      {label}:
      <span className={`font-semibold ${
        color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
        color === 'blue'   ? 'text-blue-600 dark:text-blue-400' :
        'text-gray-700 dark:text-gray-200'
      }`}>{value.toLocaleString()}</span>
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  if (!action) return <span className="text-gray-300 dark:text-gray-600">—</span>
  const c = ACTION_COLORS[action] ?? { bg: '#f1f0f0', text: '#444' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {action}
    </span>
  )
}

function SortTh({ col, active, dir, onSort, children, className = '' }: {
  col: SortCol; active: SortCol; dir: SortDir
  onSort: (col: SortCol) => void
  children: React.ReactNode; className?: string
}) {
  const isActive = active === col
  return (
    <th onClick={() => onSort(col)}
      className={`text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive
          ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
          : <ChevronsUpDown size={11} className="opacity-30" />
        }
      </span>
    </th>
  )
}
