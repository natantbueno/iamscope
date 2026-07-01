'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { IBM_ROLES, IBM_TIER_META, IbmTier, IbmCategory, IbmAccessModel } from '@/data/ibmCloud'
import { useColumnResize } from '@/hooks/useColumnResize'

const TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

const ACCESS_MODELS: { value: IbmAccessModel | 'all'; label: string }[] = [
  { value: 'all',           label: 'Todos' },
  { value: 'iam',           label: 'IAM' },
  { value: 'classic',       label: 'Classic Infra' },
  { value: 'cloud-foundry', label: 'Cloud Foundry' },
]

const CATEGORY_COLORS: Record<string, string> = {
  Identity:               '#7c3aed',
  AccountManagement:      '#0f62fe',
  Platform:               '#2563eb',
  Infrastructure:         '#ea580c',
  Compute:                '#0891b2',
  Data:                   '#16a34a',
  Security:               '#dc2626',
  Observability:          '#ca8a04',
  Networking:             '#6366f1',
  Classic:                '#78716c',
  ClassicAdministrative:  '#a16207',
  ClassicDevice:          '#c2410c',
  ClassicNetwork:         '#0369a1',
  ClassicSales:           '#7e22ce',
  ClassicSecurity:        '#b91c1c',
  ClassicSoftware:        '#047857',
  CloudFoundry:           '#059669',
}

function IbmRolesContent() {
  const params = useSearchParams()
  const [query, setQuery]           = useState('')
  const [activeTier, setActiveTier] = useState<IbmTier | 'all' | 'privileged'>('all')
  const [activeCategory, setActiveCategory] = useState<IbmCategory | null>(null)
  const [activeModel, setActiveModel] = useState<IbmAccessModel | 'all'>('all')
  const { widths, onMouseDown } = useColumnResize([200, 240, 120, 130, 100, 60])

  useEffect(() => {
    const filter = params.get('filter')
    const cat    = params.get('category')
    const model  = params.get('model')
    if (filter === 'privileged') setActiveTier('privileged')
    else if (filter && filter !== 'all') setActiveTier(filter as IbmTier)
    if (cat) setActiveCategory(cat as IbmCategory)
    if (model) setActiveModel(model as IbmAccessModel)
    setQuery(params.get('q') ?? '')
  }, [params])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return IBM_ROLES.filter(r => {
      if (activeTier === 'privileged' && !r.isPrivileged) return false
      if (activeTier !== 'all' && activeTier !== 'privileged' && r.tier !== activeTier) return false
      if (activeCategory && r.category !== activeCategory) return false
      if (activeModel !== 'all' && r.accessModel !== activeModel) return false
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [activeTier, activeCategory, activeModel, query])

  const categories = [...new Set(IBM_ROLES.map(r => r.category))].sort() as IbmCategory[]

  return (
    <AppShell
      headerTitle="IBM Cloud IAM Roles"
      headerSub={`${filtered.length} de ${IBM_ROLES.length} roles`}
    >
      <div className="flex flex-col flex-1 min-h-0">

        {/* Search chip */}
        {query && (
          <div className="px-6 py-2 bg-[#0f62fe]/10 border-b border-[#0f62fe]/30 flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-[#0f62fe] dark:text-[#4589ff]">Busca: <strong>"{query}"</strong></span>
            <button onClick={() => { setQuery(''); }} className="text-[11px] text-[#0f62fe] dark:text-[#4589ff] hover:underline ml-1">× limpar</button>
            <span className="ml-auto text-[11px] text-gray-400">{filtered.length} resultado(s)</span>
          </div>
        )}

        {/* Tier filter bar */}
        <div className="px-6 py-3 border-b border-[#dde3ec] dark:border-gray-800 flex items-center gap-2 flex-wrap shrink-0">
          {activeCategory && (
            <button onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1 text-[12px] px-3 py-1 rounded-full border font-medium"
              style={{ background: (CATEGORY_COLORS[activeCategory] || '#6366f1') + '18', color: CATEGORY_COLORS[activeCategory] || '#6366f1', borderColor: (CATEGORY_COLORS[activeCategory] || '#6366f1') + '60' }}>
              {activeCategory} ×
            </button>
          )}
          {(['all', ...TIERS, 'privileged'] as const).map(t => (
            <button key={t} onClick={() => setActiveTier(t)}
              className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                activeTier === t
                  ? 'bg-[#0f62fe]/10 dark:bg-[#0f62fe]/20 text-[#0f62fe] dark:text-[#4589ff] border-[#0f62fe]/40 font-medium'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-[#dde3ec] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {t === 'all' ? 'Todas' : t === 'privileged' ? 'Privilegiadas' : IBM_TIER_META[t].label}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">{filtered.length} roles</span>
        </div>

        {/* Access model + category row */}
        <div className="px-6 py-2 border-b border-[#dde3ec] dark:border-gray-800 flex items-center gap-3 flex-wrap shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          {/* Access model chips */}
          <div className="flex items-center gap-1.5">
            {ACCESS_MODELS.map(m => (
              <button key={m.value} onClick={() => setActiveModel(m.value)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                  activeModel === m.value
                    ? 'bg-gray-800 text-white border-gray-700 font-medium'
                    : 'bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
          <span className="text-gray-200 dark:text-gray-700">|</span>
          {/* Category chips */}
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'font-medium'
                  : 'bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              style={activeCategory === cat ? { background: (CATEGORY_COLORS[cat] || '#6366f1') + '18', color: CATEGORY_COLORS[cat] || '#6366f1', borderColor: (CATEGORY_COLORS[cat] || '#6366f1') + '60' } : {}}>
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
                <RszTh idx={4} onMD={onMouseDown}>Modelo</RszTh>
                <RszTh idx={5} onMD={onMouseDown}>Priv.</RszTh>
                <th className="w-8 overflow-hidden" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(role => {
                const tier = IBM_TIER_META[role.tier]
                const catColor = CATEGORY_COLORS[role.category] || '#6366f1'
                return (
                  <tr key={role.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-4 py-3 align-top overflow-hidden">
                      <Link href={`/ibm-cloud/roles/${role.slug}`} className="block">
                        <div className="font-medium text-[#0f62fe] dark:text-[#4589ff] text-[13px] group-hover:underline truncate">{role.name}</div>
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
                      <button onClick={() => setActiveCategory(activeCategory === role.category ? null : role.category)}>
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: catColor + '18', color: catColor }}>
                          {role.category}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                        role.accessModel === 'iam'           ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' :
                        role.accessModel === 'classic'       ? 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400' :
                        'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {role.accessModel}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {role.isPrivileged ? (
                        <ShieldAlert size={13} className="text-red-500" />
                      ) : (
                        <span className="text-[12px] text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/ibm-cloud/roles/${role.slug}`} className="text-gray-300 dark:text-gray-600 group-hover:text-[#0f62fe] dark:group-hover:text-[#4589ff] transition-colors">
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

export default function IbmRolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <IbmRolesContent />
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
