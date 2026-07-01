'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { GCP_ROLES, GCP_TIER_META, GcpTier, GcpCategory } from '@/data/gcp'
import { useColumnResize } from '@/hooks/useColumnResize'

const TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']

const CAT_COLORS: Record<string, string> = {
  IAM: '#dc2626', Compute: '#0891b2', Storage: '#16a34a', BigQuery: '#4285f4',
  Kubernetes: '#326ce5', Database: '#7c3aed', Networking: '#0369a1',
  Security: '#b91c1c', DevOps: '#ea580c', Serverless: '#f59e0b',
  AI: '#8b5cf6', Analytics: '#14b8a6', Observability: '#ca8a04',
  Billing: '#6b7280', Management: '#475569',
}

function GcpRolesContent() {
  const params = useSearchParams()
  const [query, setQuery]               = useState('')
  const [activeTier, setActiveTier]     = useState<GcpTier | 'all' | 'privileged'>('all')
  const [activeCategory, setActiveCat]  = useState<GcpCategory | null>(null)
  const { widths, onMouseDown } = useColumnResize([200, 260, 120, 120, 110, 60])

  useEffect(() => {
    const filter = params.get('filter')
    const cat    = params.get('category')
    if (filter === 'privileged') setActiveTier('privileged')
    else if (filter && filter !== 'all') setActiveTier(filter as GcpTier)
    if (cat) setActiveCat(cat as GcpCategory)
    setQuery(params.get('q') ?? '')
  }, [params])

  const categories = [...new Set(GCP_ROLES.map(r => r.category))].sort() as GcpCategory[]

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return GCP_ROLES.filter(r => {
      if (activeTier === 'privileged' && !r.isPrivileged) return false
      if (activeTier !== 'all' && activeTier !== 'privileged' && r.tier !== activeTier) return false
      if (activeCategory && r.category !== activeCategory) return false
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !r.roleId.toLowerCase().includes(q)) return false
      return true
    })
  }, [activeTier, activeCategory, query])

  return (
    <AppShell
      headerTitle="GCP IAM Roles"
      headerSub={`${filtered.length} de ${GCP_ROLES.length} predefined roles`}
    >
      <div className="flex flex-col flex-1 min-h-0">

        {/* Search chip */}
        {query && (
          <div className="px-6 py-2 bg-[#4285f4]/10 border-b border-[#4285f4]/30 flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-[#4285f4]">Busca: <strong>"{query}"</strong></span>
            <button onClick={() => setQuery('')} className="text-[11px] text-[#4285f4] hover:underline ml-1">× limpar</button>
            <span className="ml-auto text-[11px] text-gray-400">{filtered.length} resultado(s)</span>
          </div>
        )}

        {/* Search input */}
        <div className="px-6 py-3 border-b border-[#dde3ec] dark:border-gray-800 shrink-0">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome, descrição ou roleId..."
            className="w-full max-w-md text-[13px] px-3 py-1.5 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#4285f4] transition-colors"
          />
        </div>

        {/* Tier filter bar */}
        <div className="px-6 py-3 border-b border-[#dde3ec] dark:border-gray-800 flex items-center gap-2 flex-wrap shrink-0">
          {activeCategory && (
            <button onClick={() => setActiveCat(null)}
              className="inline-flex items-center gap-1 text-[12px] px-3 py-1 rounded-full border font-medium"
              style={{ background: (CAT_COLORS[activeCategory] || '#4285f4') + '18', color: CAT_COLORS[activeCategory] || '#4285f4', borderColor: (CAT_COLORS[activeCategory] || '#4285f4') + '60' }}>
              {activeCategory} ×
            </button>
          )}
          {(['all', ...TIERS, 'privileged'] as const).map(t => (
            <button key={t} onClick={() => setActiveTier(t)}
              className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                activeTier === t
                  ? 'bg-[#4285f4]/10 dark:bg-[#4285f4]/20 text-[#4285f4] border-[#4285f4]/40 font-medium'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-[#dde3ec] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {t === 'all' ? 'Todas' : t === 'privileged' ? 'Privilegiadas' : GCP_TIER_META[t].label}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">{filtered.length} roles</span>
        </div>

        {/* Category chips */}
        <div className="px-6 py-2 border-b border-[#dde3ec] dark:border-gray-800 flex items-center gap-1.5 flex-wrap shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCat(activeCategory === cat ? null : cat)}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                activeCategory === cat ? 'font-medium' : 'bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              style={activeCategory === cat ? { background: (CAT_COLORS[cat] || '#4285f4') + '18', color: CAT_COLORS[cat] || '#4285f4', borderColor: (CAT_COLORS[cat] || '#4285f4') + '60' } : {}}>
              {cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
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
                <RszTh idx={0} onMD={onMouseDown}>Role</RszTh>
                <RszTh idx={1} onMD={onMouseDown}>Descrição</RszTh>
                <RszTh idx={2} onMD={onMouseDown}>Tier</RszTh>
                <RszTh idx={3} onMD={onMouseDown}>Categoria</RszTh>
                <RszTh idx={4} onMD={onMouseDown}>Role ID</RszTh>
                <RszTh idx={5} onMD={onMouseDown}>Priv.</RszTh>
                <th className="w-8 overflow-hidden" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(role => {
                const tier = GCP_TIER_META[role.tier]
                const catColor = CAT_COLORS[role.category] || '#4285f4'
                return (
                  <tr key={role.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <Link href={`/gcp/roles/${role.slug}`} className="block">
                        <div className="font-medium text-[#4285f4] text-[13px] group-hover:underline truncate">{role.name}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <p className="text-gray-500 dark:text-gray-400 text-[12px] leading-relaxed line-clamp-2">{role.description}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: tier.bg, color: tier.color }}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button onClick={() => setActiveCat(activeCategory === role.category ? null : role.category)}>
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: catColor + '18', color: catColor }}>
                          {role.category}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate block">{role.roleId}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {role.isPrivileged ? (
                        <ShieldAlert size={13} className="text-red-500" />
                      ) : (
                        <span className="text-[12px] text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/gcp/roles/${role.slug}`} className="text-gray-300 dark:text-gray-600 group-hover:text-[#4285f4] transition-colors">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}

export default function GcpRolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <GcpRolesContent />
    </Suspense>
  )
}

function RszTh({ idx, onMD, children }: { idx: number; onMD: (i: number) => (e: React.MouseEvent) => void; children?: React.ReactNode }) {
  return (
    <th className="relative text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5 overflow-hidden select-none">
      {children}
      <div onMouseDown={onMD(idx)} onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
    </th>
  )
}
