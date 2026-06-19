'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ChevronsUpDown, Copy, CheckCheck, AlertTriangle } from 'lucide-react'
import { RoleActionEntry } from '@/lib/roleActions'
import { EamTier, EAM_META } from '@/data/roles'
import EamTierBadge from './EamTierBadge'

type SortCol = 'action' | 'namespace' | 'verb' | 'tier' | 'category' | 'count'
type SortDir = 'asc' | 'desc'

const TIER_FILTERS: { label: string; value: 'all' | EamTier }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Control Plane', value: 'ControlPlane' },
  { label: 'Management Plane', value: 'ManagementPlane' },
  { label: 'User Access', value: 'UserAccess' },
  { label: 'Unclassified', value: 'Unclassified' },
]

const TIER_ORDER: Record<EamTier, number> = {
  ControlPlane: 0,
  ManagementPlane: 1,
  UserAccess: 2,
  Unclassified: 3,
}

const PAGE_SIZE = 100

interface Props {
  actions: RoleActionEntry[]
  namespaces: string[]
  verbs: string[]
  categories: string[]
  search: string
}

export default function RoleActionsTable({ actions, namespaces, verbs, categories, search }: Props) {
  const [tier, setTier] = useState<'all' | EamTier>('all')
  const [namespace, setNamespace] = useState('all')
  const [verb, setVerb] = useState('all')
  const [category, setCategory] = useState('all')
  const [privilegedOnly, setPrivilegedOnly] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('action')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedAction, setExpandedAction] = useState<string | null>(null)
  const [copiedAction, setCopiedAction] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const toggleSort = useCallback((col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(1)
  }, [sortCol])

  const copyAction = (action: string) => {
    navigator.clipboard.writeText(action)
    setCopiedAction(action)
    setTimeout(() => setCopiedAction(null), 1500)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return actions.filter((a) => {
      const matchSearch = !q || a.action.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.namespace.toLowerCase().includes(q)
      const matchTier = tier === 'all' || a.tier === tier
      const matchNs = namespace === 'all' || a.namespace === namespace
      const matchVerb = verb === 'all' || a.verb === verb
      const matchCat = category === 'all' || a.category === category
      const matchPriv = !privilegedOnly || a.isUsedByPrivileged
      return matchSearch && matchTier && matchNs && matchVerb && matchCat && matchPriv
    })
  }, [actions, search, tier, namespace, verb, category, privilegedOnly])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'action') cmp = a.action.localeCompare(b.action)
      else if (sortCol === 'namespace') cmp = a.namespace.localeCompare(b.namespace)
      else if (sortCol === 'verb') cmp = a.verb.localeCompare(b.verb)
      else if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
      else if (sortCol === 'tier') cmp = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99)
      else if (sortCol === 'count') cmp = a.usedByRoles.length - b.usedByRoles.length
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  const visible = sorted.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < sorted.length

  const resetFilters = () => {
    setTier('all'); setNamespace('all'); setVerb('all')
    setCategory('all'); setPrivilegedOnly(false); setPage(1)
  }

  const hasActiveFilter = tier !== 'all' || namespace !== 'all' || verb !== 'all' || category !== 'all' || privilegedOnly

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
        {/* Tier chips */}
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Privileged only toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer ml-2">
            <input type="checkbox" checked={privilegedOnly} onChange={(e) => { setPrivilegedOnly(e.target.checked); setPage(1) }}
              className="w-3 h-3 accent-red-500" />
            <span className="text-[12px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <AlertTriangle size={11} className="text-red-400" /> Só privilegiadas
            </span>
          </label>

          <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">
            {filtered.length.toLocaleString()} actions
          </span>

          {hasActiveFilter && (
            <button onClick={resetFilters} className="text-[11px] text-[#0078d4] dark:text-[#85b7eb] hover:underline">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Dropdown filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select label="Namespace" value={namespace} onChange={(v) => { setNamespace(v); setPage(1) }}
            options={[{ value: 'all', label: `Todos (${namespaces.length})` }, ...namespaces.map((n) => ({ value: n, label: n }))]} />
          <Select label="Verb" value={verb} onChange={(v) => { setVerb(v); setPage(1) }}
            options={[{ value: 'all', label: 'Todos' }, ...verbs.map((v) => ({ value: v, label: v }))]} />
          <Select label="Categoria" value={category} onChange={(v) => { setCategory(v); setPage(1) }}
            options={[{ value: 'all', label: 'Todas' }, ...categories.map((c) => ({ value: c, label: c }))]} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-[14px]">
            Nenhuma role action encontrada.
          </div>
        ) : (
          <>
            <table className="w-full text-[12px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <SortTh col="action" active={sortCol} dir={sortDir} onSort={toggleSort} className="min-w-[280px]">
                    Role Action
                  </SortTh>
                  <SortTh col="namespace" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-40">
                    Namespace
                  </SortTh>
                  <SortTh col="verb" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-28">
                    Verb
                  </SortTh>
                  <SortTh col="category" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-36">
                    Categoria
                  </SortTh>
                  <SortTh col="tier" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-36">
                    EAM Tier
                  </SortTh>
                  <SortTh col="count" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-20 text-center">
                    # Roles
                  </SortTh>
                  <th className="text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2.5">
                    Usada por
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const isExpanded = expandedAction === entry.action
                  return (
                    <>
                      <tr key={entry.action}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group">
                        {/* Action */}
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-[11px] text-gray-700 dark:text-gray-300 break-all">
                              {entry.action}
                            </code>
                            <button onClick={() => copyAction(entry.action)}
                              className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                              title="Copiar">
                              {copiedAction === entry.action
                                ? <CheckCheck size={11} className="text-green-600 opacity-100" />
                                : <Copy size={11} />}
                            </button>
                          </div>
                        </td>
                        {/* Namespace */}
                        <td className="px-3 py-2 align-middle">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{entry.namespace}</span>
                        </td>
                        {/* Verb */}
                        <td className="px-3 py-2 align-middle">
                          <VerbBadge verb={entry.verb} />
                        </td>
                        {/* Category */}
                        <td className="px-3 py-2 align-middle">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">{entry.category}</span>
                        </td>
                        {/* EAM Tier */}
                        <td className="px-3 py-2 align-middle">
                          <EamTierBadge tier={entry.tier} />
                        </td>
                        {/* Count */}
                        <td className="px-3 py-2 align-middle text-center">
                          <span className="text-[12px] font-medium text-gray-600 dark:text-gray-300">{entry.usedByRoles.length}</span>
                        </td>
                        {/* Used by */}
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {entry.usedByRoles.slice(0, isExpanded ? undefined : 2).map((r) => (
                              <Link key={r.slug} href={`/roles/${r.slug}`}
                                className="inline-flex items-center gap-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 hover:bg-[#e8f1fb] dark:hover:bg-[#0c2a47] text-gray-600 dark:text-gray-300 hover:text-[#0078d4] dark:hover:text-[#85b7eb] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 transition-colors">
                                {r.isPrivileged && <AlertTriangle size={9} className="text-red-400 shrink-0" />}
                                {r.name}
                              </Link>
                            ))}
                            {entry.usedByRoles.length > 2 && (
                              <button onClick={() => setExpandedAction(isExpanded ? null : entry.action)}
                                className="text-[10px] text-[#0078d4] dark:text-[#85b7eb] hover:underline flex items-center gap-0.5">
                                {isExpanded ? (
                                  <><ChevronUp size={10} /> menos</>
                                ) : (
                                  <><ChevronDown size={10} /> +{entry.usedByRoles.length - 2} mais</>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </>
                  )
                })}
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

function Select({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="text-[11px] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0078d4] max-w-[180px]">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
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
      className={`text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none ${className}`}>
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

const VERB_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  read:     { bg: '#e6f4ea', text: '#1a5c28', darkBg: '#1a2e10', darkText: '#97c459' },
  get:      { bg: '#e6f4ea', text: '#1a5c28', darkBg: '#1a2e10', darkText: '#97c459' },
  update:   { bg: '#fef3e2', text: '#7a4a00', darkBg: '#3a2a0a', darkText: '#ef9f27' },
  create:   { bg: '#e8f1fb', text: '#0a4f8c', darkBg: '#0c2a47', darkText: '#85b7eb' },
  delete:   { bg: '#fde8e8', text: '#9a2020', darkBg: '#3a1414', darkText: '#f09595' },
  enable:   { bg: '#e8f1fb', text: '#0a4f8c', darkBg: '#0c2a47', darkText: '#85b7eb' },
  disable:  { bg: '#fde8e8', text: '#9a2020', darkBg: '#3a1414', darkText: '#f09595' },
  allTasks: { bg: '#f5e8fb', text: '#6a1a8c', darkBg: '#2a1447', darkText: '#c485eb' },
  allProperties: { bg: '#f5e8fb', text: '#6a1a8c', darkBg: '#2a1447', darkText: '#c485eb' },
}

function VerbBadge({ verb }: { verb: string }) {
  const c = VERB_COLORS[verb] ?? { bg: '#f1f0f0', text: '#444', darkBg: '#2a2a28', darkText: '#b4b2a9' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {verb || '—'}
    </span>
  )
}
