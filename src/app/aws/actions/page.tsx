'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import { getAwsActions, type AwsActionEntry } from '@/lib/awsActions'
import { AWS_TIER_META, AwsTier } from '@/data/aws'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import ExportButton from '@/components/ExportButton'

const TIERS: AwsTier[] = ['FullAccess', 'PowerUser', 'Operator', 'Specialized', 'ReadOnly']

function AwsActionsContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  // O índice de actions vive em public/aws-actions-index.json (fora do
  // bundle) — carrega sob demanda, como as páginas de Azure e GCP.
  const [actions, setActions] = useState<AwsActionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let alive = true
    getAwsActions()
      .then((a) => { if (alive) { setActions(a); setLoading(false) } })
      .catch(() => { if (alive) { setLoadError(true); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const services = useMemo(
    () => [...new Set(actions.map((a) => a.service).filter(Boolean))].sort(), [actions])

  const [tier,     setTier]     = useState<AwsTier | 'all'>('all')
  const [service,  setService]  = useState('all')
  const [wildcardFilter, setWildcardFilter] = useState<'all' | 'wildcard' | 'specific'>('all')
  const [privOnly, setPrivOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  const filtered = useMemo(() => actions.filter((a) => {
    if (tier    !== 'all' && a.tier    !== tier)    return false
    if (service !== 'all' && a.service !== service) return false
    if (wildcardFilter === 'wildcard'  && !a.isWildcard) return false
    if (wildcardFilter === 'specific'  &&  a.isWildcard) return false
    if (privOnly && !a.isUsedByPrivileged)               return false
    if (q && !a.action.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [actions, tier, service, wildcardFilter, privOnly, q])

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])

  const stats = useMemo(() => ({
    total:      actions.length,
    services:   services.length,
    wildcards:  actions.filter(a => a.isWildcard).length,
    specific:   actions.filter(a => !a.isWildcard).length,
    fullAccess: actions.filter(a => a.tier === 'FullAccess').length,
    privileged: actions.filter(a => a.isUsedByPrivileged).length,
  }), [actions, services])

  return (
    <AppShell
      headerTitle="AWS IAM Actions"
      headerSub={`${stats.total} action patterns · ${stats.services} serviços`}
      headerActions={<ExportButton filename="aws-actions" data={filtered.map((a) => ({
        action: a.action, service: a.service, tier: a.tier, isWildcard: a.isWildcard,
        isUsedByPrivileged: a.isUsedByPrivileged, usedByPoliciesCount: a.usedByPolicies.length,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {loadError && (
          <div className="m-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-[12px] text-red-600 dark:text-red-400">
            Não foi possível carregar o índice de actions da AWS
            (<code className="font-mono">/aws-actions-index.json</code>).
          </div>
        )}
        {loading && !loadError && (
          <div className="m-4 text-[12px] text-gray-400">Carregando actions da AWS…</div>
        )}
        <StatsBar stats={[
          { label: 'Total',       value: stats.total,      color: 'orange' },
          { label: 'Wildcards',   value: stats.wildcards,  color: 'red' },
          { label: 'Específicas', value: stats.specific,   color: 'green' },
          { label: 'Full Access', value: stats.fullAccess, color: 'red' },
          { label: 'Privilegiadas',value: stats.privileged,color: 'red' },
          { label: 'Serviços',    value: stats.services,   color: 'gray' },
        ]} />

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-gray-900 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tier:</span>
            {(['all', ...TIERS] as const).map((t) => {
              const meta = t !== 'all' ? AWS_TIER_META[t] : null
              return (
                <button key={t} onClick={() => { setTier(t); setPage(1) }}
                  className="text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap"
                  style={tier === t && meta ? { backgroundColor: meta.color + '25', color: meta.color, borderColor: meta.color + '60' }
                    : tier === t ? { backgroundColor: '#ff990020', color: '#ff9900', borderColor: '#ff990060' }
                    : { color: '#6b7280', borderColor: '#374151' }}>
                  {t === 'all' ? 'Todos' : meta!.label}
                </button>
              )
            })}
            <div className="ml-auto flex items-center gap-2">
              {(['all', 'wildcard', 'specific'] as const).map(w => (
                <button key={w} onClick={() => { setWildcardFilter(w); setPage(1) }}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${wildcardFilter === w ? 'bg-[#ff9900] text-black border-[#ff9900]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
                  {w === 'all' ? 'Todos' : w === 'wildcard' ? 'Wildcards (*)' : 'Específicas'}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={privOnly} onChange={e => { setPrivOnly(e.target.checked); setPage(1) }}
                  className="accent-[#ff9900]" />
                Priv only
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Serviço:</span>
            <ServiceSelect
              services={services}
              actions={actions}
              value={service}
              onChange={(s) => { setService(s); setPage(1) }}
            />
            {service !== 'all' && (
              <button onClick={() => { setService('all'); setPage(1) }}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                title="Limpar filtro de serviço">
                <X size={12} /> limpar
              </button>
            )}
            <span className="text-[10px] text-gray-500 ml-auto">{filtered.length} actions</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-6"></th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-32">Serviço</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-32">Tier</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20">Policies</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((a) => {
                const meta = AWS_TIER_META[a.tier]
                const isExp = expanded === a.action
                return (
                  <>
                    <tr key={a.action}
                      className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : a.action)}>
                      <td className="px-4 py-2.5 align-middle text-gray-600">
                        {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className={`text-[11px] font-mono ${a.isWildcard ? 'text-amber-400' : 'text-[#ff9900]'}`}>{a.action}</code>
                        {a.isWildcard && <span className="ml-2 text-[9px] uppercase font-bold text-amber-400 bg-amber-900/30 border border-amber-800/50 px-1.5 py-0.5 rounded">wildcard</span>}
                        {a.isUsedByPrivileged && <span className="ml-2 text-[9px] uppercase font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-1.5 py-0.5 rounded">priv</span>}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] text-gray-400 font-mono">{a.service}</code>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                          style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.color + '40' }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-gray-500">{a.usedByPolicies.length}</td>
                    </tr>
                    {isExp && (
                      <tr key={a.action + '-exp'} className="border-b border-gray-800 bg-gray-900/60">
                        <td colSpan={5} className="px-8 py-2.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Concedida pelas policies:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.usedByPolicies.map((p) => (
                              <span key={p.slug}
                                className={`text-[10px] px-2 py-0.5 rounded border ${p.isPrivileged ? 'text-red-400 bg-red-900/20 border-red-800/40' : 'text-gray-300 bg-gray-800 border-gray-700'}`}>
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-48 text-gray-500 text-[14px]">Nenhuma action encontrada.</div>
          )}
          {paginated.length < filtered.length && (
            <div className="flex justify-center py-4">
              <button onClick={() => setPage(p => p + 1)}
                className="text-[12px] px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors">
                Mostrar mais ({filtered.length - paginated.length} restantes)
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function AwsActionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <AwsActionsContent />
    </Suspense>
  )
}

// ── Seletor de serviço compacto com busca ────────────────────────────────────
// Substitui a antiga parede de ~400 pills (um botão por serviço), que ocupava
// a página inteira. Dropdown com busca, contagem de actions por serviço e
// lista rolável.
function ServiceSelect({ services, actions, value, onChange }: {
  services: string[]
  actions: { service: string }[]
  value: string
  onChange: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of actions) m.set(a.service, (m.get(a.service) ?? 0) + 1)
    return m
  }, [actions])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Foca a busca ao abrir
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const q = query.trim().toLowerCase()
  const visible = q ? services.filter((s) => s.toLowerCase().includes(q)) : services

  const pick = (s: string) => { onChange(s); setOpen(false); setQuery('') }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 text-[11px] pl-2.5 pr-2 py-1 rounded-md border transition-colors ${
          value !== 'all'
            ? 'bg-[#ff990020] text-[#ff9900] border-[#ff990060]'
            : 'text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-300 bg-gray-800'
        }`}
      >
        {value === 'all' ? 'Todos os serviços' : <code className="font-mono">{value}</code>}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
          <div className="relative border-b border-gray-800">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && visible.length > 0) pick(visible[0])
              }}
              placeholder={`Buscar entre ${services.length} serviços...`}
              className="w-full text-[11px] pl-7 pr-2.5 py-2 bg-transparent text-gray-100 placeholder-gray-500 outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {!q && (
              <li>
                <button onClick={() => pick('all')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-left transition-colors ${
                    value === 'all' ? 'text-[#ff9900] bg-[#ff990010]' : 'text-gray-300 hover:bg-gray-800'
                  }`}>
                  Todos os serviços
                </button>
              </li>
            )}
            {visible.map((s) => (
              <li key={s}>
                <button onClick={() => pick(s)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                    value === s ? 'bg-[#ff990015]' : 'hover:bg-gray-800'
                  }`}>
                  <code className={`text-[11px] font-mono ${value === s ? 'text-[#ff9900]' : 'text-gray-300'}`}>{s}</code>
                  <span className="text-[10px] text-gray-500 tabular-nums">{counts.get(s) ?? 0}</span>
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-gray-500">Nenhum serviço encontrado.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
