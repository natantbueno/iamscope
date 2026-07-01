'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import { getOciVerbs, getOciOperations, getOciResources } from '@/lib/ociVerbs'
import { OCI_TIER_META, OciTier } from '@/data/oci'
import { ChevronDown, ChevronRight } from 'lucide-react'

const TIERS: OciTier[] = ['Manage', 'Use', 'Read', 'Inspect']

function OciVerbsContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const verbs      = useMemo(() => getOciVerbs(), [])
  const operations = useMemo(() => getOciOperations(), [])
  const resources  = useMemo(() => getOciResources(), [])

  const [tier,      setTier]      = useState<OciTier | 'all'>('all')
  const [operation, setOperation] = useState('all')
  const [resource,  setResource]  = useState('all')
  const [privOnly,  setPrivOnly]  = useState(false)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  const filtered = useMemo(() => verbs.filter((v) => {
    if (tier      !== 'all' && v.tier      !== tier)      return false
    if (operation !== 'all' && v.operation !== operation) return false
    if (resource  !== 'all' && v.resource  !== resource)  return false
    if (privOnly && !v.isUsedByPrivileged)                return false
    if (q && !v.verb.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [verbs, tier, operation, resource, privOnly, q])

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])

  const stats = useMemo(() => ({
    total:     verbs.length,
    manage:    verbs.filter(v => v.tier === 'Manage').length,
    use:       verbs.filter(v => v.tier === 'Use').length,
    read:      verbs.filter(v => v.tier === 'Read').length,
    inspect:   verbs.filter(v => v.tier === 'Inspect').length,
    privileged:verbs.filter(v => v.isUsedByPrivileged).length,
  }), [verbs])

  return (
    <AppShell
      headerTitle="OCI IAM Verb Actions"
      headerSub={`${stats.total} verb actions únicas · ${resources.length} resource types`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: 'Total',      value: stats.total,     color: 'orange' },
          { label: 'Manage',     value: stats.manage,    color: 'red' },
          { label: 'Use',        value: stats.use,       color: 'orange' },
          { label: 'Read',       value: stats.read,      color: 'green' },
          { label: 'Inspect',    value: stats.inspect,   color: 'blue' },
          { label: 'Privilegiadas',value: stats.privileged,color: 'red' },
        ]} />

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-gray-900 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Verb Tier:</span>
            {(['all', ...TIERS] as const).map((t) => {
              const meta = t !== 'all' ? OCI_TIER_META[t] : null
              return (
                <button key={t} onClick={() => { setTier(t); setPage(1) }}
                  className="text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap"
                  style={tier === t && meta ? { backgroundColor: meta.color + '25', color: meta.color, borderColor: meta.color + '60' }
                    : tier === t ? { backgroundColor: '#C7463420', color: '#C74634', borderColor: '#C7463460' }
                    : { color: '#6b7280', borderColor: '#374151' }}>
                  {t === 'all' ? 'Todos' : meta!.label}
                </button>
              )
            })}
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
              <input type="checkbox" checked={privOnly} onChange={e => { setPrivOnly(e.target.checked); setPage(1) }}
                className="accent-[#C74634]" />
              Privilegiadas only
            </label>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Operação:</span>
            <button onClick={() => { setOperation('all'); setPage(1) }}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${operation === 'all' ? 'bg-[#C74634] text-white border-[#C74634]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
              Todas
            </button>
            {operations.map(op => (
              <button key={op} onClick={() => { setOperation(operation === op ? 'all' : op); setPage(1) }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors font-mono ${operation === op ? 'bg-[#C74634] text-white border-[#C74634]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
                {op}
              </button>
            ))}
            <span className="text-[10px] text-gray-500 ml-auto">{filtered.length} verbs</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-6"></th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Verb Action</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-40">Resource Type</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-24">Operação</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-28">Verb Tier</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20">Policies</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((v) => {
                const meta = OCI_TIER_META[v.tier]
                const isExp = expanded === v.verb
                return (
                  <>
                    <tr key={v.verb}
                      className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : v.verb)}>
                      <td className="px-4 py-2.5 align-middle text-gray-600">
                        {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] font-mono text-[#C74634]">{v.verb}</code>
                        {v.isUsedByPrivileged && <span className="ml-2 text-[9px] uppercase font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-1.5 py-0.5 rounded">priv</span>}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-gray-400 font-mono text-[11px]">{v.resource}</td>
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-[10px] font-mono font-semibold text-gray-300">{v.operation}</span>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                          style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.color + '40' }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-gray-500">{v.usedByPolicies.length}</td>
                    </tr>
                    {isExp && (
                      <tr key={v.verb + '-exp'} className="border-b border-gray-800 bg-gray-900/60">
                        <td colSpan={6} className="px-8 py-2.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Usada pelas policies:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {v.usedByPolicies.map((p) => (
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
            <div className="flex items-center justify-center h-48 text-gray-500 text-[14px]">Nenhum verb action encontrado.</div>
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

export default function OciVerbsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <OciVerbsContent />
    </Suspense>
  )
}
