'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import ClassificationBadge from '@/components/ClassificationBadge'
import { useT } from '@/i18n/LanguageProvider'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import AppShell from '@/components/AppShell'
import { IBM_ROLES, IBM_TIER_META, IbmTier, IbmCategory, IbmRoleKind } from '@/data/ibmCloud'
import { useColumnResize } from '@/hooks/useColumnResize'
import ExportButton from '@/components/ExportButton'

const TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

/**
 * O filtro agora é por TIPO de role, não por modelo de acesso.
 *
 * Antes havia IAM / Classic Infra / Cloud Foundry, como se fossem recortes da
 * mesma lista. Só que a IBM só tem role no IAM: o clássico funciona por
 * permissão individual (ver /ibm-cloud/classic) e o Cloud Foundry foi
 * descontinuado. As "roles" daqueles dois modelos no dataset antigo não
 * existiam na documentação da IBM.
 */
const ROLE_KINDS: { value: IbmRoleKind | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todos' },
  { value: 'platform', label: 'Platform' },
  { value: 'service',  label: 'Service' },
]

function IbmRolesContent() {
  const t = useT()
  const params = useSearchParams()
  const [query, setQuery]           = useState('')
  const [activeTier, setActiveTier] = useState<IbmTier | 'all' | 'privileged'>('all')
  const [activeCategory, setActiveCategory] = useState<IbmCategory | null>(null)
  const [activeKind, setActiveKind] = useState<IbmRoleKind | 'all'>('all')
  const { widths, onMouseDown } = useColumnResize([200, 240, 120, 130, 100, 60])

  useEffect(() => {
    const filter = params.get('filter')
    const cat    = params.get('category')
    const kind   = params.get('kind')
    if (filter === 'privileged') setActiveTier('privileged')
    else if (filter && filter !== 'all') setActiveTier(filter as IbmTier)
    if (cat) setActiveCategory(cat as IbmCategory)
    if (kind) setActiveKind(kind as IbmRoleKind)
    setQuery(params.get('q') ?? '')
  }, [params])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return IBM_ROLES.filter(r => {
      if (activeTier === 'privileged' && !r.isPrivileged) return false
      if (activeTier !== 'all' && activeTier !== 'privileged' && r.tier !== activeTier) return false
      if (activeCategory && r.category !== activeCategory) return false
      if (activeKind !== 'all' && r.kind !== activeKind) return false
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [activeTier, activeCategory, activeKind, query])

  const categories = [...new Set(IBM_ROLES.map(r => r.category))].sort() as IbmCategory[]

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtered)


  return (
    <AppShell
      headerTitle="IBM Cloud IAM Roles"
      headerSub={`${filtered.length} de ${IBM_ROLES.length} roles`}
      headerActions={<ExportButton filename="ibm-cloud-roles" data={filtered.map((r) => ({
        name: r.name, tier: r.tier, category: r.category, kind: r.kind,
        isPrivileged: r.isPrivileged, description: r.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">

        {/* Search chip */}
        {query && (
          <div className="px-6 py-2 bg-csp-ibm/10 border-b border-csp-ibm/30 flex items-center gap-2 shrink-0">
            <span className="text-tiny text-csp-ibm-onLight dark:text-csp-ibm-onDark">Busca: <strong>"{query}"</strong></span>
            <button onClick={() => { setQuery(''); }} className="text-3xs text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline ml-1">{t('action.clearInline')}</button>
            <span className="ml-auto text-3xs text-fg-subtle">{filtered.length} resultado(s)</span>
          </div>
        )}

        {/* Tier filter bar */}
        <div className="px-6 py-3 border-b border-surface-border dark:border-gray-800 flex items-center gap-2 flex-wrap shrink-0">
          <ClassificationBadge size="sm" className="mr-1" />
          {activeCategory && (
            <button onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1 text-tiny px-3 py-1 rounded-full border font-medium bg-surface-alt text-fg border-line-strong font-medium">
              {activeCategory} ×
            </button>
          )}
          {(['all', ...TIERS, 'privileged'] as const).map(tier => (
            <button key={tier} onClick={() => setActiveTier(tier)}
              className={`text-tiny px-3 py-1 rounded-full border transition-colors ${
                activeTier === tier
                  ? 'bg-csp-ibm/10 dark:bg-csp-ibm/20 text-csp-ibm-onLight dark:text-csp-ibm-onDark border-csp-ibm/40 font-medium'
                  : 'bg-white dark:bg-gray-900 text-fg-muted border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {tier === 'all' ? t('filter.allFem') : tier === 'privileged' ? t('count.privileged') : IBM_TIER_META[tier].label}
            </button>
          ))}
          <span className="ml-auto text-tiny text-fg-muted">{filtered.length} roles</span>
        </div>

        {/* Tipo de role + categoria */}
        <div className="px-6 py-2 border-b border-surface-border dark:border-gray-800 flex items-center gap-3 flex-wrap shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          {/* Chips de tipo: platform vs service */}
          <div className="flex items-center gap-1.5">
            {ROLE_KINDS.map(m => (
              <button key={m.value} onClick={() => setActiveKind(m.value)}
                className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${
                  activeKind === m.value
                    ? 'bg-surface-alt text-white border-line-strong font-medium'
                    : 'bg-transparent text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
          <span className="text-fg dark:text-gray-700">|</span>
          {/* Category chips */}
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'bg-surface-alt text-fg border-line-strong font-medium'
                  : 'text-fg-muted border-line hover:bg-surface-hover'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-body border-collapse" style={{ tableLayout: 'fixed' }}>
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
                <RszTh idx={4} onMD={onMouseDown}>Modelo</RszTh>
                <RszTh idx={5} onMD={onMouseDown}>Priv.</RszTh>
                <th className="w-8 overflow-hidden" />
              </tr>
            </thead>
            <tbody>
              {paginated.map(role => {
                const tier = IBM_TIER_META[role.tier]
                return (
                  <tr key={role.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <Link href={`/ibm-cloud/roles/${role.slug}`} className="block">
                        <div className="font-medium text-csp-ibm-onLight dark:text-csp-ibm-onDark text-body group-hover:underline truncate">{role.name}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <p className="text-fg-muted text-tiny leading-relaxed line-clamp-2">{role.description}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center text-3xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: tier.bg, color: tier.color }}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button onClick={() => setActiveCategory(activeCategory === role.category ? null : role.category)}>
                        <span className="inline-flex items-center text-3xs px-2 py-0.5 rounded-full font-medium border bg-surface-alt text-fg-muted border-line">
                          {role.category}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`text-3xs px-2 py-0.5 rounded font-mono ${
                        role.kind === 'platform'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {role.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {role.isPrivileged ? (
                        <ShieldAlert size={13} className="text-red-500" />
                      ) : (
                        <span className="text-tiny text-fg-muted dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/ibm-cloud/roles/${role.slug}`} className="text-fg-muted dark:text-gray-600 group-hover:text-csp-ibm dark:group-hover:text-csp-ibm-onDark transition-colors">
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

export default function IbmRolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <IbmRolesContent />
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
