'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { EntraRole, RoleCategory, EamTier } from '@/data/roles'
import CategoryBadge from './CategoryBadge'
import EamTierBadge from './EamTierBadge'
import { useColumnResize } from '@/hooks/useColumnResize'

export type FilterType = 'all' | 'privileged' | EamTier

type SortCol = 'name' | 'tier' | 'category' | 'count' | 'privileged'
type SortDir = 'asc' | 'desc'

interface RolesTableProps {
  roles: EntraRole[]
  activeTier: FilterType
  activeCategory: RoleCategory | null
  onTierChange: (f: FilterType) => void
  onCategoryChange: (c: RoleCategory | null) => void
}

const TIER_FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Control Plane', value: 'ControlPlane' },
  { label: 'Management Plane', value: 'ManagementPlane' },
  { label: 'User Access', value: 'UserAccess' },
  { label: 'Privilegiadas', value: 'privileged' },
]

const TIER_ORDER: Record<EamTier, number> = {
  ControlPlane: 0, ManagementPlane: 1, UserAccess: 2, Unclassified: 3,
}

export default function RolesTable({ roles, activeTier, activeCategory, onTierChange, onCategoryChange }: RolesTableProps) {
  const [sortCol, setSortCol] = useState<SortCol>('tier')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { widths, onMouseDown } = useColumnResize([200, 280, 80, 130, 110, 60])

  const toggleSort = useCallback((col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }, [sortCol])

  const sorted = useMemo(() => {
    return [...roles].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortCol === 'tier') cmp = (TIER_ORDER[a.eamTier] ?? 99) - (TIER_ORDER[b.eamTier] ?? 99)
      else if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
      else if (sortCol === 'count') cmp = a.permissionCount - b.permissionCount
      else if (sortCol === 'privileged') cmp = Number(b.isPrivileged) - Number(a.isPrivileged)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [roles, sortCol, sortDir])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 py-3 border-b border-[#dde3ec] dark:border-gray-800 flex items-center gap-2 flex-wrap">
        {/* Categoria ativa como chip removível */}
        {activeCategory && (
          <button
            onClick={() => onCategoryChange(null)}
            className="inline-flex items-center gap-1 text-[12px] px-3 py-1 rounded-full border bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-medium">
            {activeCategory}
            <X size={11} className="opacity-70" />
          </button>
        )}

        {activeCategory && (
          <span className="text-gray-300 dark:text-gray-700 text-[12px]">·</span>
        )}

        {/* Filtros de tier */}
        {TIER_FILTERS.map((f) => (
          <button key={f.value} onClick={() => onTierChange(f.value)}
            className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
              activeTier === f.value
                ? 'bg-[#e8f1fb] dark:bg-[#0c2a47] text-[#0078d4] dark:text-[#85b7eb] border-[#9dc3e8] dark:border-[#185fa5] font-medium'
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-[#dde3ec] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">{roles.length} roles</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <p className="text-[14px]">Nenhuma role encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-[13px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: widths[0] }} />
              <col style={{ width: widths[1] }} />
              <col style={{ width: widths[2] }} />
              <col style={{ width: widths[3] }} />
              <col style={{ width: widths[4] }} />
              <col style={{ width: widths[5] }} />
              <col />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-[#dde3ec] dark:border-gray-700">
                <RszTh col="name"      active={sortCol} dir={sortDir} onSort={toggleSort} idx={0} onMD={onMouseDown}>Role</RszTh>
                <th className="relative text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5 overflow-hidden select-none">
                  Descrição
                  <div onMouseDown={onMouseDown(1)} onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10"
                  />
                </th>
                <RszTh col="count"     active={sortCol} dir={sortDir} onSort={toggleSort} idx={2} onMD={onMouseDown}>Ações</RszTh>
                <RszTh col="tier"      active={sortCol} dir={sortDir} onSort={toggleSort} idx={3} onMD={onMouseDown}>EAM Tier</RszTh>
                <RszTh col="category"  active={sortCol} dir={sortDir} onSort={toggleSort} idx={4} onMD={onMouseDown}>Categoria</RszTh>
                <RszTh col="privileged" active={sortCol} dir={sortDir} onSort={toggleSort} idx={5} onMD={onMouseDown}>Priv.</RszTh>
                <th className="w-8 overflow-hidden"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((role) => (
                <tr key={role.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <td className="px-4 py-3 align-top overflow-hidden">
                    <Link href={`/roles/${role.slug}`} className="block">
                      <div className="font-medium text-[#0078d4] dark:text-[#85b7eb] text-[13px] group-hover:underline truncate">{role.name}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">{role.id}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top overflow-hidden">
                    <p className="text-gray-500 dark:text-gray-400 text-[12px] leading-relaxed line-clamp-2">{role.description}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">{role.permissionCount}</span>
                  </td>
                  <td className="px-4 py-3 align-top"><EamTierBadge tier={role.eamTier} /></td>
                  <td className="px-4 py-3 align-top">
                    <button onClick={() => onCategoryChange(role.category)} aria-label={`Filtrar por categoria ${role.category}`} className="text-left rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]">
                      <CategoryBadge category={role.category} />
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {role.isPrivileged ? (
                      <AlertTriangle size={13} className="text-red-500" />
                    ) : (
                      <span className="text-[12px] text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/roles/${role.slug}`} className="text-gray-300 dark:text-gray-600 group-hover:text-[#0078d4] dark:group-hover:text-[#85b7eb] transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function RszTh({ col, active, dir, onSort, idx, onMD, children }: {
  col: SortCol; active: SortCol; dir: SortDir; onSort: (col: SortCol) => void
  idx: number; onMD: (i: number) => (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <th
      aria-sort={active === col ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="relative text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2.5 select-none overflow-hidden">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] rounded-sm"
      >
        {children}
        {active === col
          ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
          : <ChevronsUpDown size={11} className="opacity-30" />
        }
      </button>
      <div onMouseDown={onMD(idx)} onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10"
      />
    </th>
  )
}
