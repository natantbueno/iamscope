'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, ChevronRight, Search, X } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { OCI_POLICIES, OCI_TIER_META, OciTier, OciCategory } from '@/data/oci'
import { useColumnResize } from '@/hooks/useColumnResize'
import ExportButton from '@/components/ExportButton'

const TIERS: OciTier[] = ['Manage', 'Use', 'Read', 'Inspect']

const CAT_COLORS: Record<string, string> = {
  Identity: '#6366f1', Compute: '#0891b2', Storage: '#0d9488',
  Networking: '#8b5cf6', Database: '#0ea5e9', Security: '#dc2626',
  DevOps: '#f59e0b', Containers: '#06b6d4', Serverless: '#a855f7',
  Messaging: '#10b981', Analytics: '#f97316', Monitoring: '#64748b',
  AI: '#ec4899', Billing: '#84cc16', Management: '#6b7280',
}

function OciPoliciesContent() {
  const searchParams = useSearchParams()
  const [query, setQuery]         = useState(searchParams.get('q') ?? '')
  const [tier, setTier]           = useState<OciTier | 'all'>('all')
  const [category, setCategory]   = useState<OciCategory | 'all'>((searchParams.get('category') as OciCategory) ?? 'all')
  const [privileged, setPrivileged] = useState(searchParams.get('privileged') === 'true')
  const { widths: colWidths, onMouseDown: startResize } = useColumnResize([220, 300, 100, 110, 60])

  useEffect(() => {
    const q = searchParams.get('q'); if (q) setQuery(q)
    const cat = searchParams.get('category'); if (cat) setCategory(cat as OciCategory)
    const priv = searchParams.get('privileged'); if (priv) setPrivileged(priv === 'true')
  }, [searchParams])

  const categories = useMemo(() =>
    Array.from(new Set(OCI_POLICIES.map(p => p.category))).sort() as OciCategory[]
  , [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return OCI_POLICIES.filter(p => {
      if (tier !== 'all' && p.tier !== tier) return false
      if (category !== 'all' && p.category !== category) return false
      if (privileged && !p.isPrivileged) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) ||
             p.description.toLowerCase().includes(q) ||
             p.resourceTypes.some(r => r.toLowerCase().includes(q)) ||
             p.exampleStatement.toLowerCase().includes(q)
    })
  }, [query, tier, category, privileged])

  return (
    <AppShell headerTitle="OCI IAM Policies" headerSub={`${filtered.length} de ${OCI_POLICIES.length} policy patterns`}
      headerActions={<ExportButton filename="oci-policies" data={filtered.map((p) => ({
        name: p.name, tier: p.tier, category: p.category, isPrivileged: p.isPrivileged, description: p.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar policy, resource type, statement..."
              className="w-full pl-8 pr-8 py-1.5 text-[13px] rounded border border-[#dde3ec] dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#C74634]" />
            {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tier pills */}
            {(['all', ...TIERS] as const).map(t => {
              const meta = t !== 'all' ? OCI_TIER_META[t] : null
              return (
                <button key={t} onClick={() => setTier(t)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${tier === t ? 'text-white border-transparent' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  style={tier === t ? { background: meta?.color ?? '#6b7280', borderColor: meta?.color ?? '#6b7280' } : {}}>
                  {t === 'all' ? 'Todos os Tiers' : t}
                </button>
              )
            })}
            <span className="text-gray-200 dark:text-gray-700">|</span>
            <button onClick={() => setPrivileged(!privileged)}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${privileged ? 'bg-red-600 text-white border-red-600' : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              Privileged only
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setCategory('all')}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${category === 'all' ? 'bg-gray-600 text-white border-gray-600' : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              Todas
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat === category ? 'all' : cat)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${category === cat ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                style={category === cat ? { background: CAT_COLORS[cat] ?? '#6b7280', borderColor: CAT_COLORS[cat] ?? '#6b7280' } : {}}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Policy', 'Descrição', 'Tier', 'Categoria', ''].map((h, i) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2.5 border-b border-[#dde3ec] dark:border-gray-800 relative select-none"
                    style={{ width: colWidths[i], minWidth: colWidths[i] }}>
                    {h}
                    {i < 4 && (
                      <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#C74634]/40"
                        onMouseDown={startResize(i)} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const tier = OCI_TIER_META[p.tier]
                return (
                  <tr key={p.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[0], minWidth: colWidths[0] }}>
                      <div className="flex items-center gap-1.5">
                        {p.isPrivileged && <ShieldAlert size={11} className="text-red-500 shrink-0" />}
                        <Link href={`/oci/policies/${p.slug}`} className="font-medium text-[#C74634] truncate text-[13px] group-hover:underline transition-colors">{p.name}</Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-500 dark:text-gray-400" style={{ width: colWidths[1], minWidth: colWidths[1] }}>
                      <span className="line-clamp-2">{p.description}</span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[2], minWidth: colWidths[2] }}>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: tier.bg, color: tier.color }}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[3], minWidth: colWidths[3] }}>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: (CAT_COLORS[p.category] ?? '#6b7280') + '60', color: CAT_COLORS[p.category] ?? '#6b7280' }}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[4], minWidth: colWidths[4] }}>
                      <Link href={`/oci/policies/${p.slug}`} className="text-gray-400 hover:text-[#C74634] transition-colors">
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-[13px]">Nenhuma policy encontrada</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function OciPoliciesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <OciPoliciesContent />
    </Suspense>
  )
}
