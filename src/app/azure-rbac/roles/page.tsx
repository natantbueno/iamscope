'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { AZURE_ROLES, AZURE_TIER_META, AzureRbacTier, AzureRbacCategory } from '@/data/azureRbac'
import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown, ShieldAlert, ChevronRight } from 'lucide-react'
import ExportMenu from '@/components/ExportMenu'
import { useColumnResize } from '@/hooks/useColumnResize'
import StatsBar from '@/components/StatsBar'

type SortCol = 'name' | 'category' | 'tier' | 'permissionCount'
type SortDir = 'asc' | 'desc'

const TIER_ORDER: Record<AzureRbacTier, number> = {
  FullControl: 0, AccessManagement: 1, Contributor: 2, DataPlane: 3, Reader: 4, Specialized: 5,
}
const TIERS: AzureRbacTier[] = ['FullControl', 'AccessManagement', 'Contributor', 'DataPlane', 'Reader', 'Specialized']
const ALL_CATEGORIES: AzureRbacCategory[] = [
  'General', 'Security', 'Compute', 'Storage', 'Networking', 'Database',
  'Identity', 'Monitoring', 'Containers', 'AppService', 'Integration', 'Management', 'AI',
]


const CATEGORY_COLORS: Record<AzureRbacCategory, { bg: string; text: string; border: string }> = {
  General:     { bg: '#1f2937', text: '#9ca3af', border: '#374151' },
  Security:    { bg: '#3b1a1a', text: '#f87171', border: '#7f1d1d' },
  Compute:     { bg: '#1a2f4a', text: '#60a5fa', border: '#1d4ed8' },
  Storage:     { bg: '#162a22', text: '#34d399', border: '#065f46' },
  Networking:  { bg: '#251a40', text: '#a78bfa', border: '#5b21b6' },
  Database:    { bg: '#1a2e1a', text: '#86efac', border: '#15803d' },
  Identity:    { bg: '#1a2340', text: '#93c5fd', border: '#1e40af' },
  Monitoring:  { bg: '#302010', text: '#fbbf24', border: '#b45309' },
  Containers:  { bg: '#0f2a2e', text: '#22d3ee', border: '#0e7490' },
  AppService:  { bg: '#301a0a', text: '#fb923c', border: '#c2410c' },
  Integration: { bg: '#2a1a30', text: '#e879f9', border: '#a21caf' },
  Management:  { bg: '#1e2a20', text: '#6ee7b7', border: '#047857' },
  AI:          { bg: '#1a1a35', text: '#818cf8', border: '#3730a3' },
}

function AzureRbacRolesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [search, setSearch]           = useState('')
  const [activeTier, setActiveTier]   = useState<AzureRbacTier | 'all'>('all')
  const [activeCat, setActiveCat]     = useState<AzureRbacCategory | 'all'>('all')
  const [privilegedOnly, setPriv]     = useState(false)
  const [sortCol, setSortCol]         = useState<SortCol>('name')
  const [sortDir, setSortDir]         = useState<SortDir>('asc')

  const { widths, onMouseDown } = useColumnResize([200, 240, 100, 150, 80, 60])

  // Sync state from URL params — fires on every navigation (sidebar clicks)
  useEffect(() => {
    const q      = searchParams.get('q') ?? ''
    const tier   = searchParams.get('tier') ?? 'all'
    const cat    = searchParams.get('category') ?? 'all'
    const filter = searchParams.get('filter') ?? ''
    setSearch(q)
    setActiveTier(TIERS.includes(tier as AzureRbacTier) ? (tier as AzureRbacTier) : 'all')
    setActiveCat(ALL_CATEGORIES.includes(cat as AzureRbacCategory) ? (cat as AzureRbacCategory) : 'all')
    setPriv(filter === 'privileged')
  }, [searchParams])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return AZURE_ROLES.filter((r) => {
      const matchSearch  = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
      const matchTier    = activeTier === 'all' || r.tier === activeTier
      const matchCat     = activeCat  === 'all' || r.category === activeCat
      const matchPriv    = !privilegedOnly || r.isPrivileged
      return matchSearch && matchTier && matchCat && matchPriv
    })
  }, [search, activeTier, activeCat, privilegedOnly])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0
    if      (sortCol === 'name')            cmp = a.name.localeCompare(b.name)
    else if (sortCol === 'category')        cmp = a.category.localeCompare(b.category)
    else if (sortCol === 'tier')            cmp = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99)
    else if (sortCol === 'permissionCount') cmp = a.permissionCount - b.permissionCount
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortCol, sortDir])

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Update URL and local state together
  const pushTier = (tier: AzureRbacTier | 'all') => {
    setActiveTier(tier)
    const p = new URLSearchParams(searchParams.toString())
    if (tier === 'all') p.delete('tier'); else p.set('tier', tier)
    router.replace(`/azure-rbac/roles?${p.toString()}`, { scroll: false })
  }
  const pushCat = (cat: AzureRbacCategory | 'all') => {
    setActiveCat(cat)
    const p = new URLSearchParams(searchParams.toString())
    if (cat === 'all') p.delete('category'); else p.set('category', cat)
    router.replace(`/azure-rbac/roles?${p.toString()}`, { scroll: false })
  }

  return (
    <AppShell
      headerTitle="Azure RBAC — Built-in Roles"
      headerSub={`${AZURE_ROLES.length} roles · ${ALL_CATEGORIES.length} categorias · 6 risk tiers`}
      headerActions={<ExportMenu mode="azureRbac" azureRoles={sorted} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: 'Total', value: AZURE_ROLES.length, color: 'blue', href: '/azure-rbac/roles' },
          { label: 'Full Control', value: AZURE_ROLES.filter((r) => r.tier === 'FullControl').length, color: 'red', href: '/azure-rbac/roles?tier=FullControl' },
          { label: 'Access Mgmt', value: AZURE_ROLES.filter((r) => r.tier === 'AccessManagement').length, color: 'orange', href: '/azure-rbac/roles?tier=AccessManagement' },
          { label: 'Contributor', value: AZURE_ROLES.filter((r) => r.tier === 'Contributor').length, color: 'gray', href: '/azure-rbac/roles?tier=Contributor' },
          { label: 'Data Plane', value: AZURE_ROLES.filter((r) => r.tier === 'DataPlane').length, color: 'purple', href: '/azure-rbac/roles?tier=DataPlane' },
          { label: 'Reader', value: AZURE_ROLES.filter((r) => r.tier === 'Reader').length, color: 'green', href: '/azure-rbac/roles?tier=Reader' },
          { label: 'Privilegiadas', value: AZURE_ROLES.filter((r) => r.isPrivileged).length, color: 'red', href: '/azure-rbac/roles?filter=privileged' },
        ]} />

        {/* Filter bar — row 1: search + tier chips */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {/* Tier chips */}
            <button
              onClick={() => pushTier('all')}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium whitespace-nowrap ${
                activeTier === 'all'
                  ? 'bg-gray-700 text-gray-100 border-gray-500'
                  : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}>
              Todos
            </button>
            {TIERS.map((tier) => {
              const meta = AZURE_TIER_META[tier]
              const active = activeTier === tier
              return (
                <button key={tier}
                  onClick={() => pushTier(active ? 'all' : tier)}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium whitespace-nowrap"
                  style={active
                    ? { backgroundColor: meta.textColor + '30', color: meta.darkText, borderColor: meta.textColor + '80' }
                    : { color: '#6b7280', borderColor: '#374151' }
                  }>
                  {meta.label}
                </button>
              )
            })}

            <button
              onClick={() => setPriv((v) => !v)}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ml-auto ${
                privilegedOnly
                  ? 'bg-red-950 text-red-400 border-red-700 font-medium'
                  : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}>
              <ShieldAlert size={11} /> Privilegiadas
            </button>
            <span className="text-[12px] text-gray-500">{sorted.length}</span>
          </div>

          {/* Row 2: Category chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => pushCat('all')}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                activeCat === 'all'
                  ? 'bg-[#0078d4] text-white border-[#0078d4]'
                  : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}>
              Todas
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => pushCat(activeCat === cat ? 'all' : cat)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                  activeCat === cat
                    ? 'bg-[#0078d4] text-white border-[#0078d4]'
                    : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="text-[12px] border-collapse w-full" style={{ tableLayout: 'fixed' }}>
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
              <tr className="bg-gray-800 border-b border-gray-700">
                <RszTh col="name"            active={sortCol} dir={sortDir} onSort={toggleSort} idx={0} onMD={onMouseDown}>Role</RszTh>
                <th className="relative px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider overflow-hidden select-none">
                  Descrição
                  <div onMouseDown={onMouseDown(1)} onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
                </th>
                <RszTh col="category"        active={sortCol} dir={sortDir} onSort={toggleSort} idx={2} onMD={onMouseDown}>Categoria</RszTh>
                <RszTh col="tier"            active={sortCol} dir={sortDir} onSort={toggleSort} idx={3} onMD={onMouseDown}>Risk Tier</RszTh>
                <RszTh col="permissionCount" active={sortCol} dir={sortDir} onSort={toggleSort} idx={4} onMD={onMouseDown} right>Permissões</RszTh>
                <RszTh col="tier"            active={sortCol} dir={sortDir} onSort={toggleSort} idx={5} onMD={onMouseDown}>Priv.</RszTh>
                <th className="px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((role) => {
                const meta = AZURE_TIER_META[role.tier]
                return (
                  <tr key={role.slug} className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors group">
                    <td className="px-4 py-2.5 align-middle overflow-hidden">
                      <Link href={`/azure-rbac/roles/${role.slug}`}
                        className="text-[13px] font-medium text-[#85b7eb] hover:text-[#0078d4] hover:underline truncate block">
                        {role.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 align-middle overflow-hidden">
                      <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">{role.description}</p>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      {(() => {
                        const cc = CATEGORY_COLORS[role.category]
                        return (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                            style={{ backgroundColor: cc.bg, color: cc.text, borderColor: cc.border }}>
                            {role.category}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        style={{ backgroundColor: meta.textColor + '20', color: meta.darkText, borderColor: meta.textColor + '50' }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-middle text-right">
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color: meta.darkText }}>{role.permissionCount}</span>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      {role.isPrivileged
                        ? <ShieldAlert size={13} className="text-red-400" />
                        : <span className="text-[12px] text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <Link href={`/azure-rbac/roles/${role.slug}`}
                        className="text-gray-600 group-hover:text-[#85b7eb] transition-colors">
                        <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="flex items-center justify-center h-48 text-gray-500 text-[14px]">
              Nenhuma role encontrada.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function AzureRbacRolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Carregando...</div>}>
      <AzureRbacRolesContent />
    </Suspense>
  )
}

function RszTh({ col, active, dir, onSort, idx, onMD, children, right }: {
  col: SortCol; active: SortCol; dir: SortDir; onSort: (c: SortCol) => void
  idx: number; onMD: (i: number) => (e: React.MouseEvent) => void
  children: React.ReactNode; right?: boolean
}) {
  return (
    <th className={`relative ${right ? 'text-right' : 'text-left'} text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 select-none overflow-hidden`}>
      <button onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-gray-300">
        {children}
        {active === col ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronsUpDown size={11} className="opacity-30" />}
      </button>
      <div onMouseDown={onMD(idx)} onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10"
      />
    </th>
  )
}
