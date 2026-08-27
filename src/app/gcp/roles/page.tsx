'use client'

import { themedText } from '@/lib/readableColor'
import ClassificationBadge from '@/components/ClassificationBadge'
import { Suspense, useState, useMemo, useEffect } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import AppShell from '@/components/AppShell'
import { GCP_ROLES, GCP_TIER_META, GcpTier, GcpCategory } from '@/data/gcp'
import { useColumnResize } from '@/hooks/useColumnResize'
import ExportButton from '@/components/ExportButton'
import StatsBar from '@/components/StatsBar'
import DeprecatedBadge from '@/components/DeprecatedBadge'
import InlineListFilter from '@/components/InlineListFilter'
import { useInlineQuery } from '@/hooks/useInlineQuery'

const TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']

function GcpRolesContent() {
  const t = useT()
  const params = useSearchParams()
  const [query, setQuery]               = useInlineQuery('/gcp/roles')
  const [activeTier, setActiveTier]     = useState<GcpTier | 'all' | 'privileged'>('all')
  const [activeCategory, setActiveCat]  = useState<GcpCategory | null>(null)
  const { widths, onMouseDown } = useColumnResize([200, 260, 120, 120, 110, 60])

  // Sincroniza a partir da URL nos DOIS sentidos. Antes o filtro só era lido
  // quando o parâmetro existia, então um link para /gcp/roles — o "Total" da
  // legenda — não limpava o tier escolhido: a lista voltava cheia e o chip
  // continuava aceso. A busca (`q`) não entra mais aqui — vem direto de
  // useInlineQuery, que já lê a URL a cada render.
  useEffect(() => {
    const filter = params.get('filter')
    const cat    = params.get('category')
    setActiveTier(filter === 'privileged' ? 'privileged'
      : filter && filter !== 'all' ? (filter as GcpTier)
      : 'all')
    setActiveCat(cat ? (cat as GcpCategory) : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])

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

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtered)


  return (
    <AppShell
      headerTitle="GCP IAM Roles"
      headerSub={t('sub.gcpRoles')}
      headerActions={<ExportButton filename="gcp-roles" data={filtered.map((r) => ({
        name: r.name, roleId: r.roleId, tier: r.tier, category: r.category,
        isPrivileged: r.isPrivileged, description: r.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {/* Legenda de contagem — mesmo componente e mesma leitura do Entra e do
            Azure. Total do dataset, não do filtro atual. */}
        <StatsBar stats={[
          { label: t('count.total'),      value: GCP_ROLES.length,                                            color: 'blue',   href: '/gcp/roles' },
          { label: 'Project Owner',       value: GCP_ROLES.filter((r) => r.tier === 'ProjectOwner').length,   color: 'red',    href: '/gcp/roles?filter=ProjectOwner' },
          { label: 'Admin',               value: GCP_ROLES.filter((r) => r.tier === 'Admin').length,          color: 'orange', href: '/gcp/roles?filter=Admin' },
          { label: 'Editor',              value: GCP_ROLES.filter((r) => r.tier === 'Editor').length,         color: 'gray',   href: '/gcp/roles?filter=Editor' },
          { label: 'Operator',            value: GCP_ROLES.filter((r) => r.tier === 'Operator').length,       color: 'gray',   href: '/gcp/roles?filter=Operator' },
          { label: 'Developer',           value: GCP_ROLES.filter((r) => r.tier === 'Developer').length,      color: 'purple', href: '/gcp/roles?filter=Developer' },
          { label: 'Specialized',         value: GCP_ROLES.filter((r) => r.tier === 'Specialized').length,    color: 'purple', href: '/gcp/roles?filter=Specialized' },
          { label: 'Viewer',              value: GCP_ROLES.filter((r) => r.tier === 'Viewer').length,         color: 'green',  href: '/gcp/roles?filter=Viewer' },
          { label: t('count.privileged'), value: GCP_ROLES.filter((r) => r.isPrivileged).length,              color: 'red',    href: '/gcp/roles?filter=privileged' },
        ]} />

        {/* Tier filter bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-surface-border dark:border-gray-800 flex items-center gap-2 flex-wrap rolagem-chips shrink-0">
          <ClassificationBadge size="sm" className="mr-1" />
          {activeCategory && (
            <button onClick={() => setActiveCat(null)}
              className="inline-flex items-center gap-1 text-tiny px-3 py-1 rounded-full border font-medium bg-surface-alt text-fg border-line-strong font-medium">
              {activeCategory} ×
            </button>
          )}
          {(['all', ...TIERS, 'privileged'] as const).map(tier => (
            <button key={tier} onClick={() => setActiveTier(tier)}
              className={`text-tiny px-3 py-1 rounded-full border transition-colors ${
                activeTier === tier
                  ? 'bg-csp-gcp/10 dark:bg-csp-gcp/20 text-csp-gcp-onLight dark:text-csp-gcp-onDark border-csp-gcp/40 font-medium'
                  : 'bg-white dark:bg-gray-900 text-fg-muted border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {tier === 'all' ? t('filter.allFem') : tier === 'privileged' ? t('count.privileged') : GCP_TIER_META[tier].label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-tiny text-fg-muted whitespace-nowrap">{filtered.length} roles</span>
            <InlineListFilter value={query} onChange={setQuery} placeholder={t('action.search')} />
          </div>
        </div>

        {/* Category chips */}
        <div className="px-4 sm:px-6 py-2 border-b border-surface-border dark:border-gray-800 flex items-center gap-1.5 flex-wrap rolagem-chips shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCat(activeCategory === cat ? null : cat)}
              className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${
                activeCategory === cat ? 'bg-surface-alt text-fg border-line-strong font-medium' : 'text-fg-muted border-line hover:bg-surface-hover'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto table-scroll-x">
          <table className="w-full text-body border-collapse" style={{ tableLayout: 'fixed', minWidth: widths.reduce((a, b) => a + b, 0) }}>
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
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
                <RszTh idx={0} onMD={onMouseDown}>Role</RszTh>
                <RszTh idx={1} onMD={onMouseDown}>{t('table.description')}</RszTh>
                <RszTh idx={2} onMD={onMouseDown}>Tier</RszTh>
                <RszTh idx={3} onMD={onMouseDown}>{t('table.category')}</RszTh>
                <RszTh idx={4} onMD={onMouseDown}>Role ID</RszTh>
                <RszTh idx={5} onMD={onMouseDown}>Priv.</RszTh>
                <th className="w-8 overflow-hidden" />
              </tr>
            </thead>
            <tbody>
              {paginated.map(role => {
                const tier = GCP_TIER_META[role.tier]
                return (
                  <tr key={role.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <Link href={`/gcp/roles/${role.slug}`} className="block">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="font-medium text-accent text-body group-hover:underline truncate">{role.name}</div>
                          {role.deprecated && <DeprecatedBadge compact />}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <p className="text-fg-muted text-tiny leading-relaxed line-clamp-2">{role.description}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center text-3xs px-2 py-0.5 rounded-full font-medium themed-color"
                        style={{ background: tier.bg, ...themedText(tier.color, tier.bg) }}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button onClick={() => setActiveCat(activeCategory === role.category ? null : role.category)}>
                        <span className="inline-flex items-center text-3xs px-2 py-0.5 rounded-full font-medium border bg-surface-alt text-fg-muted border-line">
                          {role.category}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <span className="text-3xs font-mono text-fg-muted truncate block">{role.roleId}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {role.isPrivileged ? (
                        <ShieldAlert size={13} className="text-red-500" />
                      ) : (
                        <span className="text-tiny text-fg-muted dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/gcp/roles/${role.slug}`} className="text-fg-muted dark:text-gray-600 group-hover:text-csp-gcp transition-colors">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.roles"
        />
      </div>
    </AppShell>
  )
}

export default function GcpRolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <GcpRolesContent />
    </Suspense>
  )
}

function RszTh({ idx, onMD, children }: { idx: number; onMD: (i: number) => (e: React.MouseEvent) => void; children?: React.ReactNode }) {
  return (
    <th className="relative text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 overflow-hidden select-none">
      {children}
      <div onMouseDown={onMD(idx)} onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
    </th>
  )
}
