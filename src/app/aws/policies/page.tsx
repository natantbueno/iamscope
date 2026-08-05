'use client'

import { Suspense, useState, useEffect } from 'react'
import ClassificationBadge from '@/components/ClassificationBadge'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { AWS_POLICIES, AWS_TIER_META, AwsTier, AwsCategory, AwsPolicyType } from '@/data/aws'
import { ShieldAlert, ChevronRight, Search } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import Link from 'next/link'
import { useColumnResize } from '@/hooks/useColumnResize'
import ExportButton from '@/components/ExportButton'
import DeprecatedBadge from '@/components/DeprecatedBadge'
import { useT } from '@/i18n/LanguageProvider'

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
  const t = useT()
  const searchParams = useSearchParams()
  const router = useRouter()

  const initFilter = searchParams.get('filter') ?? 'all'
  const initCategory = searchParams.get('category') ?? ''
  const initQ = searchParams.get('q') ?? ''

  const [activeTier, setActiveTier] = useState<string>(initFilter)
  const [activeCategory, setActiveCategory] = useState<string>(initCategory)
  const [activeType, setActiveType] = useState<string>('all')
  // Termo de busca — vem da barra global (?q=), não há mais campo nesta página.
  // O filtro continua aqui porque é ele que faz a busca global significar algo
  // ao cair em /aws/policies.
  const [query, setQuery] = useState(initQ)

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

  // 7 colunas: Policy, Descrição, Tier, Categoria, Tipo, Priv., chevron
  const { widths: colWidths, onMouseDown: startResize } = useColumnResize([240, 300, 110, 110, 110, 60, 44])

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtered)


  return (
    <AppShell headerTitle="AWS IAM Policies" headerSub={`${AWS_POLICIES.length} policies — Managed, Service Roles e Permission Sets`}
      headerActions={<ExportButton filename="aws-policies" data={filtered.map((p) => ({
        name: p.name, arn: p.arn, tier: p.tier, category: p.category, type: p.type,
        isPrivileged: p.isPrivileged, description: p.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-2">
          {/* Tier pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <ClassificationBadge size="sm" className="mr-1" />
            {['all', 'privileged', ...TIERS].map(t => {
              const meta = t !== 'all' && t !== 'privileged' ? AWS_TIER_META[t as AwsTier] : null
              const label = t === 'all' ? 'Todos' : t === 'privileged' ? 'Privileged' : meta!.label
              const color = t === 'all' ? '#6b7280' : t === 'privileged' ? '#dc2626' : meta!.color
              const active = activeTier === t
              return (
                <button key={t} onClick={() => setActiveTier(active ? 'all' : t)}
                  className="text-3xs px-2.5 py-0.5 rounded-full border transition-colors font-medium"
                  style={active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: '#d1d5db', color: '#6b7280' }}>
                  {label}
                </button>
              )
            })}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mr-1">Tipo:</span>
            {['all', ...TYPES].map(t => {
              const active = activeType === t
              const color = t === 'all' ? '#6b7280' : TYPE_COLORS[t]
              return (
                <button key={t} onClick={() => setActiveType(active && t !== 'all' ? 'all' : t)}
                  className="text-3xs px-2.5 py-0.5 rounded-full border transition-colors"
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
                  className="text-2xs px-2 py-0.5 rounded-full border transition-colors"
                  style={active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color + '60', color: color }}>
                  {cat}
                </button>
              )
            })}
          </div>

          <p className="text-3xs text-fg-muted">{filtered.length} policies</p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-body border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
              <tr>
                {['Policy', t('table.description'), t('table.tier'), t('table.category'), t('table.type'), t('table.priv'), ''].map((h, i) => (
                  <th key={h || 'chevron'} className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 border-b border-surface-border dark:border-gray-800 relative select-none"
                    style={{ width: colWidths[i], minWidth: colWidths[i] }}>
                    {h}
                    {i < 6 && (
                      <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-csp-aws/40"
                        onMouseDown={startResize(i)} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const tier = AWS_TIER_META[p.tier]
                const typeColor = TYPE_COLORS[p.type]
                return (
                  <tr key={p.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[0], minWidth: colWidths[0] }}>
                      {/*
                        O ícone de privilegiada saiu daqui e virou coluna própria
                        ("Priv."), como nas tabelas de GCP e Azure. Antes ele
                        empurrava o nome para a direita só em algumas linhas, o
                        que desalinhava a coluna inteira e atrapalhava a leitura.
                      */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href={`/aws/policies/${p.slug}`} className="font-medium text-csp-aws-onLight dark:text-csp-aws-onDark truncate text-body group-hover:underline transition-colors">{p.name}</Link>
                        {p.deprecated && <DeprecatedBadge compact />}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-fg-muted" style={{ width: colWidths[1], minWidth: colWidths[1] }}>
                      <span className="line-clamp-2">{p.description}</span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[2], minWidth: colWidths[2] }}>
                      <span className="text-2xs px-2 py-0.5 rounded-full font-semibold" style={{ background: tier.bg, color: tier.color }}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[3], minWidth: colWidths[3] }}>
                      <span className="text-2xs px-2 py-0.5 rounded-full border" style={{ borderColor: (CAT_COLORS[p.category] ?? '#6b7280') + '60', color: CAT_COLORS[p.category] ?? '#6b7280' }}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[4], minWidth: colWidths[4] }}>
                      <span className="text-2xs px-2 py-0.5 rounded-full" style={{ background: typeColor + '18', color: typeColor }}>
                        {TYPE_LABELS[p.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[5], minWidth: colWidths[5] }}>
                      {p.isPrivileged ? (
                        <ShieldAlert size={13} className="text-red-500" />
                      ) : (
                        <span className="text-tiny text-fg-muted dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: colWidths[6], minWidth: colWidths[6] }}>
                      <Link href={`/aws/policies/${p.slug}`} className="text-fg-subtle hover:text-csp-aws transition-colors">
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-subtle">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-body">{t('empty.policies')}</p>
            </div>
          )}
        </div>
        <Pagination
          total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize}
          accent="#ff9900" noun="noun.policies"
        />
      </div>
    </AppShell>
  )
}

export default function AwsPoliciesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <AwsPoliciesContent />
    </Suspense>
  )
}
