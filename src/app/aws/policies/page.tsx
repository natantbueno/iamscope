'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { AWS_POLICIES, AWS_TIER_META, AwsTier, AwsCategory, AwsPolicyType } from '@/data/aws'
import { ShieldAlert, ChevronRight, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useColumnResize } from '@/hooks/useColumnResize'
import ExportButton from '@/components/ExportButton'

const TIERS: AwsTier[] = ['FullAccess', 'PowerUser', 'ReadOnly', 'Operator', 'Specialized']
const TYPES: AwsPolicyType[] = ['managed', 'service-role', 'permission-set', 'permission-boundary']

const CAT_COLORS: Record<string, string> = {
  IAM: '#dc2626', Compute: '#0891b2', Storage: '#16a34a', Database: '#7c3aed',
  Networking: '#0369a1', Security: '#b91c1c', DevOps: '#ea580c', Serverless: '#f59e0b',
  Containers: '#326ce5', AI: '#8b5cf6', Analytics: '#14b8a6', Management: '#6b7280',
  IoT: '#059669', Billing: '#475569', Messaging: '#d97706',
}

const TYPE_LABELS: Record<string, string> = {
  'managed': 'Managed', 'service-role': 'Service Role', 'permission-set': 'Permission Set', 'permission-boundary': 'Permission Boundary',
}
const TYPE_COLORS: Record<string, string> = {
  'managed': '#0891b2', 'service-role': '#7c3aed', 'permission-set': '#16a34a', 'permission-boundary': '#dc2626',
}

function AwsPoliciesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initFilter = searchParams.get('filter') ?? 'all'
  const initCategory = searchParams.get('category') ?? ''
  const initQ = searchParams.get('q') ?? ''

  const [activeTier, setActiveTier] = useState<string>(initFilter)
  const [activeCategory, setActiveCategory] = useState<string>(initCategory)
  const [activeType, setActiveType] = useState<string>('all')
  const [query, setQuery] = useState(initQ)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''; setQuery(q)
    const f = searchParams.get('filter') ?? 'all'; setActiveTier(f)
    const c = searchParams.get('category') ?? ''; setActiveCategory(c)
  }, [searchParams])

  const filtered = AWS_POLICIES.filter(p => {
    if (activeTier === 'privileged' && !p.isPrivileged) return false
    if (activeTier !== 'all' && activeTier !== 'privileged' && p.tier !== activeTier) return false
    if (activeCategory && p.category !== activeCategory) return false
    if (activeType !== 'all' && p.type !== activeType) return false
    if (query) {
      const q = query.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.arn.toLowerCase().includes(q)
    }
    return true
  })

  const categories = Array.from(new Set(AWS_POLICIES.map(p => p.category))).sort()

  const { widths: colWidths, onMouseDown: startResize } = useColumnResize([220, 280, 110, 110, 100, 60])

  return (
    <AppShell headerTitle="AWS IAM Policies" headerSub={`${AWS_POLICIES.length} policies — Managed, Service Roles e Permission Sets`}
      headerActions={<ExportButton filename="aws-policies" data={filtered.map((p) => ({
        name: p.name, arn: p.arn, tier: p.tier, category: p.category, type: p.type,
        isPrivileged: p.isPrivileged, description: p.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar policy, ARN, descrição..."
              className="w-full pl-8 pr-8 py-1.5 text-[12px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#ff9900]" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Tier pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'privileged', ...TIERS].map(t => {
              const meta = t !== 'all' && t !== 'privileged' ? AWS_TIER_META[t as AwsTier] : null
              const label = t === 'all' ? 'Todos' : t === 'privileged' ? 'Privileged' : meta!.label
              const color = t === 'all' ? '#6b7280' : t === 'privileged' ? '#dc2626' : meta!.color
              const active = activeTier === t
              return (
                <button key={t} onClick={() => setActiveTier(active ? 'all' : t)}
                  className="text-[11px] px-2.5 py-0.5 rounded-full border transition-colors font-medium"
                  style={active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: '#d1d5db', color: '#6b7280' }}>
                  {label}
                </button>
              )
            })}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mr-1">Tipo:</span>
            {['all', ...TYPES].map(t => {
              const active = activeType === t
              const color = t === 'all' ? '#6b7280' : TYPE_COLORS[t]
              return (
                <button key={t} onClick={() => setActiveType(active && t !== 'all' ? 'all' : t)}
                  className="text-[11px] px-2.5 py-0.5 rounded-full border transition-colors"
                  style={active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: '#d1d5db', color: '#6b7280' }}>
                  {t === 'all' ? 'Todos' : TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-1 flex-wrap">
            {categories.map(cat => {
              const active = activeCategory === cat
              const color = CAT_COLORS[cat] ?? '#6b7280'
              return (
                <button key={cat} onClick={() => setActiveCategory(active ? '' : cat)}
                  className="text-[10px] px-2 py-0.5 rounded-full border transition-colors"
                  style={active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color + '60', color: color }}>
                  {cat}
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500">{filtered.length} policies</p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
              <tr>
                {['Policy', 'Descrição', 'Tier', 'Categoria', 'Tipo', ''].map((h, i) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2.5 border-b border-[#dde3ec] dark:border-gray-800 relative select-none"
                    style={{ width: colWidths[i], minWidth: colWidths[i] }}>
                    {h}
                    {i < 5 && (
                      <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#ff9900]/40"
                        onMouseDown={startResize(i)} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const tier = AWS_TIER_META[p.tier]
                const typeColor = TYPE_COLORS[p.type]
                return (
                  <tr key={p.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[0], minWidth: colWidths[0] }}>
                      <div className="flex items-center gap-1.5">
                        {p.isPrivileged && <ShieldAlert size={11} className="text-red-500 shrink-0" />}
                        <Link href={`/aws/policies/${p.slug}`} className="font-medium text-[#ff9900] truncate text-[13px] group-hover:underline transition-colors">{p.name}</Link>
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: typeColor + '18', color: typeColor }}>
                        {TYPE_LABELS[p.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[5], minWidth: colWidths[5] }}>
                      <Link href={`/aws/policies/${p.slug}`} className="text-gray-400 hover:text-[#ff9900] transition-colors">
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

export default function AwsPoliciesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <AwsPoliciesContent />
    </Suspense>
  )
}
