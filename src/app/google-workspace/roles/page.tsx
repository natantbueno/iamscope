'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { GWS_ROLES, GWS_TIER_META, GwsTier, GwsCategory } from '@/data/googleWorkspace'
import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown, ShieldAlert, ChevronRight } from 'lucide-react'
import { useColumnResize } from '@/hooks/useColumnResize'
import StatsBar from '@/components/StatsBar'
import ExportButton from '@/components/ExportButton'

type SortCol = 'name' | 'category' | 'tier'
type SortDir = 'asc' | 'desc'

const TIER_ORDER: Record<GwsTier, number> = {
  SuperAdmin: 0, DelegatedAdmin: 1, ServiceAdmin: 2, SpecializedAdmin: 3, ReadOnly: 4,
}
const TIERS: GwsTier[] = ['SuperAdmin', 'DelegatedAdmin', 'ServiceAdmin', 'SpecializedAdmin', 'ReadOnly']
const ALL_CATEGORIES: GwsCategory[] = [
  'Identity', 'Security', 'Communication', 'Productivity', 'Device', 'Storage', 'Analytics', 'Billing', 'Infrastructure',
]

const CATEGORY_COLORS: Record<GwsCategory, { bg: string; text: string; border: string }> = {
  Identity:       { bg: '#1a2340', text: '#93c5fd', border: '#1e40af' },
  Security:       { bg: '#3b1a1a', text: '#f87171', border: '#7f1d1d' },
  Communication:  { bg: '#0f2a2e', text: '#22d3ee', border: '#0e7490' },
  Productivity:   { bg: '#162a22', text: '#34d399', border: '#065f46' },
  Device:         { bg: '#251a40', text: '#a78bfa', border: '#5b21b6' },
  Storage:        { bg: '#1a2e1a', text: '#86efac', border: '#15803d' },
  Analytics:      { bg: '#302010', text: '#fbbf24', border: '#b45309' },
  Billing:        { bg: '#2a1a30', text: '#e879f9', border: '#a21caf' },
  Infrastructure: { bg: '#1f2937', text: '#9ca3af', border: '#374151' },
}

function GwsRolesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTier, setActiveTier]   = useState<GwsTier | 'all'>('all')
  const [activeCat, setActiveCat]     = useState<GwsCategory | 'all'>('all')
  const [privilegedOnly, setPriv]     = useState(false)
  const [query, setQuery]             = useState('')
  const [sortCol, setSortCol]         = useState<SortCol>('tier')
  const [sortDir, setSortDir]         = useState<SortDir>('asc')

  const { widths, onMouseDown } = useColumnResize([200, 220, 130, 120, 60])

  useEffect(() => {
    const tier   = searchParams.get('tier') ?? 'all'
    const cat    = searchParams.get('category') ?? 'all'
    const filter = searchParams.get('filter') ?? ''
    const q      = searchParams.get('q') ?? ''
    setActiveTier(TIERS.includes(tier as GwsTier) ? (tier as GwsTier) : 'all')
    setActiveCat(ALL_CATEGORIES.includes(cat as GwsCategory) ? (cat as GwsCategory) : 'all')
    setPriv(filter === 'privileged')
    setQuery(q)
  }, [searchParams])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return GWS_ROLES.filter((r) => {
      const matchTier  = activeTier === 'all' || r.tier === activeTier
      const matchCat   = activeCat  === 'all' || r.category === activeCat
      const matchPriv  = !privilegedOnly || r.isPrivileged
      const matchQuery = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      return matchTier && matchCat && matchPriv && matchQuery
    })
  }, [activeTier, activeCat, privilegedOnly, query])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0
    if      (sortCol === 'name')     cmp = a.name.localeCompare(b.name)
    else if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
    else if (sortCol === 'tier')     cmp = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99)
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortCol, sortDir])

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const pushTier = (tier: GwsTier | 'all') => {
    setActiveTier(tier)
    const p = new URLSearchParams(searchParams.toString())
    if (tier === 'all') p.delete('tier'); else p.set('tier', tier)
    router.replace(`/google-workspace/roles?${p.toString()}`, { scroll: false })
  }

  const pushCat = (cat: GwsCategory | 'all') => {
    setActiveCat(cat)
    const p = new URLSearchParams(searchParams.toString())
    if (cat === 'all') p.delete('category'); else p.set('category', cat)
    router.replace(`/google-workspace/roles?${p.toString()}`, { scroll: false })
  }

  return (
    <AppShell
      headerTitle="Google Workspace — Admin Roles"
      headerSub={`${GWS_ROLES.length} roles · ${ALL_CATEGORIES.length} categorias · 5 admin tiers`}
      headerActions={<ExportButton filename="google-workspace-roles" data={sorted.map((r) => ({
        name: r.name, category: r.category, tier: r.tier, isPrivileged: r.isPrivileged, description: r.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: 'Total',          value: GWS_ROLES.length,                                              color: 'green',  href: '/google-workspace/roles' },
          { label: 'Super Admin',    value: GWS_ROLES.filter((r) => r.tier === 'SuperAdmin').length,       color: 'red',    href: '/google-workspace/roles?tier=SuperAdmin' },
          { label: 'Delegated',      value: GWS_ROLES.filter((r) => r.tier === 'DelegatedAdmin').length,   color: 'orange', href: '/google-workspace/roles?tier=DelegatedAdmin' },
          { label: 'Service',        value: GWS_ROLES.filter((r) => r.tier === 'ServiceAdmin').length,     color: 'gray',   href: '/google-workspace/roles?tier=ServiceAdmin' },
          { label: 'Specialized',    value: GWS_ROLES.filter((r) => r.tier === 'SpecializedAdmin').length, color: 'purple', href: '/google-workspace/roles?tier=SpecializedAdmin' },
          { label: 'Read Only',      value: GWS_ROLES.filter((r) => r.tier === 'ReadOnly').length,         color: 'green',  href: '/google-workspace/roles?tier=ReadOnly' },
          { label: 'Privilegiadas',  value: GWS_ROLES.filter((r) => r.isPrivileged).length,               color: 'red',    href: '/google-workspace/roles?filter=privileged' },
        ]} />

        {/* Search query chip */}
        {query && (
          <div className="px-4 py-2 bg-[#34a853]/10 border-b border-[#34a853]/30 flex items-center gap-2">
            <span className="text-[12px] text-[#4ade80]">Busca: <strong>"{query}"</strong></span>
            <button onClick={() => { setQuery(''); router.replace('/google-workspace/roles', { scroll: false }) }}
              className="text-[11px] text-[#34a853] hover:text-white ml-1">× limpar</button>
            <span className="ml-auto text-[11px] text-gray-400">{sorted.length} resultado(s)</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {/* Tier chips */}
            <button onClick={() => pushTier('all')}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium whitespace-nowrap ${
                activeTier === 'all' ? 'bg-gray-700 text-gray-100 border-gray-500' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}>Todos</button>
            {TIERS.map((tier) => {
              const meta = GWS_TIER_META[tier]
              const active = activeTier === tier
              return (
                <button key={tier} onClick={() => pushTier(active ? 'all' : tier)}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium whitespace-nowrap"
                  style={active
                    ? { backgroundColor: meta.textColor + '30', color: meta.darkText, borderColor: meta.textColor + '80' }
                    : { color: '#6b7280', borderColor: '#374151' }
                  }>{meta.label}</button>
              )
            })}
            <button onClick={() => setPriv((v) => !v)}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ml-auto ${
                privilegedOnly ? 'bg-red-950 text-red-400 border-red-700 font-medium' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}>
              <ShieldAlert size={11} /> Privilegiadas
            </button>
            <span className="text-[12px] text-gray-500">{sorted.length}</span>
          </div>
          {/* Category chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => pushCat('all')}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                activeCat === 'all' ? 'bg-[#34a853] text-white border-[#34a853]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}>Todas</button>
            {ALL_CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => pushCat(activeCat === cat ? 'all' : cat)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                  activeCat === cat ? 'bg-[#34a853] text-white border-[#34a853]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                }`}>{cat}</button>
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
              <col />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 border-b border-gray-700">
                <RszTh col="name"     active={sortCol} dir={sortDir} onSort={toggleSort} idx={0} onMD={onMouseDown}>Role</RszTh>
                <th className="relative px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider overflow-hidden select-none">
                  Descrição
                  <div onMouseDown={onMouseDown(1)} onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
                </th>
                <RszTh col="category" active={sortCol} dir={sortDir} onSort={toggleSort} idx={2} onMD={onMouseDown}>Categoria</RszTh>
                <RszTh col="tier"     active={sortCol} dir={sortDir} onSort={toggleSort} idx={3} onMD={onMouseDown}>Admin Tier</RszTh>
                <th className="relative px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider overflow-hidden select-none">
                  Priv.
                  <div onMouseDown={onMouseDown(4)} onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
                </th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((role) => {
                const meta = GWS_TIER_META[role.tier]
                const cc = CATEGORY_COLORS[role.category]
                return (
                  <tr key={role.slug} className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors group">
                    <td className="px-4 py-2.5 align-middle overflow-hidden">
                      <Link href={`/google-workspace/roles/${role.slug}`}
                        className="text-[13px] font-medium text-[#4ade80] hover:text-[#34a853] hover:underline truncate block">
                        {role.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 align-middle overflow-hidden">
                      <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">{role.description}</p>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        style={{ backgroundColor: cc.bg, color: cc.text, borderColor: cc.border }}>
                        {role.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      {role.isPrivileged
                        ? <ShieldAlert size={13} className="text-red-400" />
                        : <span className="text-[12px] text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <Link href={`/google-workspace/roles/${role.slug}`}
                        className="text-gray-600 group-hover:text-[#4ade80] transition-colors">
                        <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="flex items-center justify-center h-48 text-gray-500 text-[14px]">Nenhuma role encontrada.</div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function GwsRolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Carregando...</div>}>
      <GwsRolesContent />
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
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
    </th>
  )
}
