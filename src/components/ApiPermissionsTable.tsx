'use client'

import { useState, useMemo, useCallback } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'
import { Copy, CheckCheck, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { EamTier } from '@/data/roles'
import EamTierBadge from './EamTierBadge'
import { deriveApiPermDescription } from '@/lib/descriptions'

type ApiFilter = 'all' | EamTier
type PermType  = 'all' | 'Application' | 'Delegated'
type SortCol   = 'name' | 'type' | 'action' | 'scope' | 'category' | 'tier'
type SortDir   = 'asc' | 'desc'

const TIER_FILTERS: { label: TranslationKey; value: ApiFilter }[] = [
  { label: 'filter.allFem',        value: 'all' },
  { label: 'tier.controlPlane',    value: 'ControlPlane' },
  { label: 'tier.managementPlane', value: 'ManagementPlane' },
  { label: 'tier.userAccess',      value: 'UserAccess' },
  { label: 'tier.unclassified',    value: 'Unclassified' },
]

const TIER_ORDER: Record<EamTier, number> = {
  ControlPlane: 0, ManagementPlane: 1, UserAccess: 2, Unclassified: 3,
}

function parsePermName(name: string): { root: string; action: string; scope: string } {
  const parts = name.split('.')
  if (parts.length === 1) return { root: name, action: '', scope: '' }
  if (parts.length === 2) return { root: parts[0], action: parts[1], scope: '' }
  return {
    root:   parts.slice(0, -2).join('.'),
    action: parts[parts.length - 2],
    scope:  parts[parts.length - 1],
  }
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  Read:        { bg: '#e6f4ea', text: '#1a5c28' },
  ReadBasic:   { bg: '#e6f4ea', text: '#1a5c28' },
  Write:       { bg: '#fef3e2', text: '#7a4a00' },
  ReadWrite:   { bg: '#fef3e2', text: '#7a4a00' },
  Manage:      { bg: '#fde8e8', text: '#9a2020' },
  FullControl: { bg: '#fde8e8', text: '#9a2020' },
  Send:        { bg: '#e8f1fb', text: '#0a4f8c' },
  Create:      { bg: '#e8f1fb', text: '#0a4f8c' },
}


export default function ApiPermissionsTable({ search, initialTier = 'all' }: { search: string; initialTier?: string }) {
  const t = useT()
  const [tier, setTier] = useState<ApiFilter>(
    ['ControlPlane', 'ManagementPlane', 'UserAccess', 'Unclassified'].includes(initialTier)
      ? (initialTier as ApiFilter) : 'all'
  )
  const [permType, setPermType] = useState<PermType>('all')
  const [sortCol, setSortCol]   = useState<SortCol>('name')
  const [sortDir, setSortDir]   = useState<SortDir>('asc')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleSort = useCallback((col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }, [sortCol])

  const categories = useMemo(() =>
    [...new Set(API_PERMISSIONS.map((p) => p.category).filter(Boolean))].sort(), [])

  const [category, setCategory] = useState('all')

  const enriched = useMemo(() => API_PERMISSIONS.map((p) => ({
    ...p,
    ...parsePermName(p.name),
    // Descrição oficial da Microsoft quando existe; a derivada do nome é só
    // fallback para permission que a fonte não descreve.
    description: p.description || deriveApiPermDescription(p.name, p.type),
  })), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.root.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      const matchTier   = tier === 'all' || p.eamTier === tier
      const matchType   = permType === 'all' || p.type === permType
      const matchCat    = category === 'all' || p.category === category
      return matchSearch && matchTier && matchType && matchCat
    })
  }, [enriched, search, tier, permType, category])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'name')     cmp = a.name.localeCompare(b.name)
      else if (sortCol === 'type')     cmp = a.type.localeCompare(b.type)
      else if (sortCol === 'action')   cmp = a.action.localeCompare(b.action)
      else if (sortCol === 'scope')    cmp = a.scope.localeCompare(b.scope)
      else if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
      else if (sortCol === 'tier')     cmp = (TIER_ORDER[a.eamTier] ?? 99) - (TIER_ORDER[b.eamTier] ?? 99)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  const { paginated: visible, page, setPage, pageSize, setPageSize } = usePagination(sorted)

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Filter bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-surface-border dark:border-gray-800 flex items-center gap-2 flex-wrap rolagem-chips">
        {/* Type quick-filter */}
        {(['all', 'Application', 'Delegated'] as PermType[]).map((pt) => (
          <button key={pt} onClick={() => { setPermType(pt); setPage(1) }}
            className={`text-tiny px-3 py-1 rounded-full border transition-colors ${
              permType === pt
                ? pt === 'Application'
                  ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-medium'
                  : pt === 'Delegated'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-medium'
                  : 'bg-brand-soft dark:bg-brand-activeBg text-brand-strong dark:text-brand-onDark border-brand-mid dark:border-brand-activeRing font-medium'
                : 'bg-white dark:bg-gray-900 text-fg-muted border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {pt === 'all' ? t('filter.allFem') : pt}
          </button>
        ))}

        <span className="text-fg dark:text-gray-700 mx-1">|</span>

        {/* Tier chips */}
        {TIER_FILTERS.slice(1).map((f) => (
          <button key={f.value} onClick={() => { setTier(tier === f.value ? 'all' : f.value); setPage(1) }}
            className={`text-tiny px-3 py-1 rounded-full border transition-colors ${
              tier === f.value
                ? 'bg-brand-soft dark:bg-brand-activeBg text-brand-strong dark:text-brand-onDark border-brand-mid dark:border-brand-activeRing font-medium'
                : 'bg-white dark:bg-gray-900 text-fg-muted border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {t(f.label)}
          </button>
        ))}

        {/* Category dropdown */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-3xs text-fg-muted">Categoria:</span>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="text-3xs border border-surface-border dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand max-w-[180px]">
            <option value="all">{t('filter.allFem')} ({categories.length})</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-tiny text-fg-muted ml-2">{filtered.length.toLocaleString()} perm.</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-fg-muted text-note">
            Nenhuma permissão encontrada.
          </div>
        ) : (
          <>
            <table className="w-full text-tiny border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
                  <SortTh col="name"     active={sortCol} dir={sortDir} onSort={toggleSort} className="min-w-[220px]">{t('table.permission')}</SortTh>
                  <SortTh col="action"   active={sortCol} dir={sortDir} onSort={toggleSort} className="w-28">{t('table.action')}</SortTh>
                  <SortTh col="scope"    active={sortCol} dir={sortDir} onSort={toggleSort} className="w-24">{t('table.scope')}</SortTh>
                  <SortTh col="category" active={sortCol} dir={sortDir} onSort={toggleSort} className="w-36">{t('table.category')}</SortTh>
                  <SortTh col="tier"     active={sortCol} dir={sortDir} onSort={toggleSort} className="w-36">EAM Tier</SortTh>
                  <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">{t('table.description')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((perm) => (
                  <tr key={perm.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    {/* Nome + tipo inline + ID */}
                    <td className="px-4 py-2.5 align-middle">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <code className="font-mono text-3xs text-accent font-medium break-all">{perm.name}</code>
                        <TypeBadge type={perm.type} />
                        <button onClick={() => copyId(perm.id)}
                          className="p-2 -m-2 reveal-on-hover text-fg-muted dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 transition-opacity"
                          title={t('action.copyId')}>
                          {copiedId === perm.id ? <CheckCheck size={11} className="text-green-600 opacity-100" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="text-micro text-fg-muted font-mono mt-0.5">{perm.id.substring(0, 8)}…</div>
                    </td>
                    {/* Ação (verbo) */}
                    <td className="px-4 py-2.5 align-middle"><ActionBadge action={perm.action} /></td>
                    {/* Escopo */}
                    <td className="px-4 py-2.5 align-middle">
                      {perm.scope
                        ? <span className="text-2xs font-mono text-fg-muted bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{perm.scope}</span>
                        : <span className="text-fg-muted dark:text-gray-600">—</span>}
                    </td>
                    {/* Categoria */}
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-3xs text-fg-muted">{perm.category || '—'}</span>
                    </td>
                    {/* EAM Tier */}
                    <td className="px-4 py-2.5 align-middle"><EamTierBadge tier={perm.eamTier} /></td>
                    {/* Descrição */}
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-3xs text-fg-muted leading-snug">{perm.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              total={sorted.length} page={page} pageSize={pageSize}
              onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.permissions"
            />
          </>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────── */

function TypeBadge({ type }: { type: 'Application' | 'Delegated' }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-semibold shrink-0 ${
      type === 'Application'
        ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
        : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
    }`}>
      {type === 'Application' ? 'App' : 'Del'}
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  if (!action) return <span className="text-fg-muted dark:text-gray-600">—</span>
  const c = ACTION_COLORS[action] ?? { bg: '#f1f0f0', text: '#444' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold"
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
      className={`text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive
          ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
          : <ChevronsUpDown size={11} className="opacity-30" />}
      </span>
    </th>
  )
}
