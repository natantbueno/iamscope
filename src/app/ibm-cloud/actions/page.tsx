'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import { getIbmActions, getIbmServices, getIbmOperations } from '@/lib/ibmActions'
import { IBM_TIER_META, IbmTier } from '@/data/ibmCloud'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ExportButton from '@/components/ExportButton'

const TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

function IbmActionsContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const actions    = useMemo(() => getIbmActions(), [])
  const services   = useMemo(() => getIbmServices(), [])
  const operations = useMemo(() => getIbmOperations(), [])

  const [tier,      setTier]      = useState<IbmTier | 'all'>('all')
  const [service,   setService]   = useState('all')
  const [operation, setOperation] = useState('all')
  const [privOnly,  setPrivOnly]  = useState(false)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  const filtered = useMemo(() => actions.filter((a) => {
    if (tier      !== 'all' && a.tier      !== tier)      return false
    if (service   !== 'all' && a.service   !== service)   return false
    if (operation !== 'all' && a.operation !== operation) return false
    if (privOnly && !a.isUsedByPrivileged)                return false
    if (q && !a.action.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [actions, tier, service, operation, privOnly, q])

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])

  const stats = useMemo(() => ({
    total:      actions.length,
    services:   services.length,
    acctAdmin:  actions.filter(a => a.tier === 'AccountAdmin').length,
    platAdmin:  actions.filter(a => a.tier === 'PlatformAdmin').length,
    readOnly:   actions.filter(a => a.tier === 'ReadOnly').length,
    privileged: actions.filter(a => a.isUsedByPrivileged).length,
  }), [actions, services])

  return (
    <AppShell
      headerTitle="IBM Cloud IAM Actions"
      headerSub={`${stats.total} actions únicas · ${stats.services} serviços`}
      headerActions={<ExportButton filename="ibm-cloud-actions" data={filtered.map((a) => ({
        action: a.action, service: a.service, resource: a.resource, operation: a.operation,
        tier: a.tier, isUsedByPrivileged: a.isUsedByPrivileged, usedByRolesCount: a.usedByRoles.length,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: 'Total',        value: stats.total,     color: 'blue' },
          { label: 'Account Admin',value: stats.acctAdmin, color: 'red' },
          { label: 'Plat. Admin',  value: stats.platAdmin, color: 'orange' },
          { label: 'Read Only',    value: stats.readOnly,  color: 'green' },
          { label: 'Privilegiadas',value: stats.privileged,color: 'red' },
          { label: 'Serviços',     value: stats.services,  color: 'gray' },
        ]} />

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-gray-900 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tier:</span>
            {(['all', ...TIERS] as const).map((t) => {
              const meta = t !== 'all' ? IBM_TIER_META[t] : null
              return (
                <button key={t} onClick={() => { setTier(t); setPage(1) }}
                  className="text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap"
                  style={tier === t && meta ? { backgroundColor: meta.color + '25', color: meta.color, borderColor: meta.color + '60' }
                    : tier === t ? { backgroundColor: '#08bdba20', color: '#08bdba', borderColor: '#08bdba60' }
                    : { color: '#6b7280', borderColor: '#374151' }}>
                  {t === 'all' ? 'Todos' : meta!.label}
                </button>
              )
            })}
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
              <input type="checkbox" checked={privOnly} onChange={e => { setPrivOnly(e.target.checked); setPage(1) }}
                className="accent-[#08bdba]" />
              Priv only
            </label>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Serviço:</span>
            <button onClick={() => { setService('all'); setPage(1) }}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${service === 'all' ? 'bg-[#08bdba] text-black border-[#08bdba]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
              Todos
            </button>
            {services.map(s => (
              <button key={s} onClick={() => { setService(service === s ? 'all' : s); setPage(1) }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors font-mono ${service === s ? 'bg-[#08bdba] text-black border-[#08bdba]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Operação:</span>
            <button onClick={() => { setOperation('all'); setPage(1) }}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${operation === 'all' ? 'bg-[#08bdba] text-black border-[#08bdba]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
              Todas
            </button>
            {operations.map(op => (
              <button key={op} onClick={() => { setOperation(operation === op ? 'all' : op); setPage(1) }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors font-mono ${operation === op ? 'bg-[#08bdba] text-black border-[#08bdba]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
                {op}
              </button>
            ))}
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
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-36">Serviço</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-28">Resource</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20">Operação</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-32">Tier</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-16">Roles</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((a) => {
                const meta = IBM_TIER_META[a.tier]
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
                        <code className="text-[11px] font-mono text-[#08bdba]">{a.action}</code>
                        {a.isUsedByPrivileged && <span className="ml-2 text-[9px] uppercase font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-1.5 py-0.5 rounded">priv</span>}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] text-gray-400 font-mono">{a.service}</code>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] text-gray-400 font-mono">{a.resource}</code>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] text-gray-400 font-mono">{a.operation}</code>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                          style={{ color: meta.color, backgroundColor: meta.color + '15', borderColor: meta.color + '40' }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-gray-500">{a.usedByRoles.length}</td>
                    </tr>
                    {isExp && (
                      <tr key={a.action + '-exp'} className="border-b border-gray-800 bg-gray-900/60">
                        <td colSpan={7} className="px-8 py-2.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Concedida pelas roles:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.usedByRoles.map((r) => (
                              <span key={r.slug}
                                className={`text-[10px] px-2 py-0.5 rounded border ${r.isPrivileged ? 'text-red-400 bg-red-900/20 border-red-800/40' : 'text-gray-300 bg-gray-800 border-gray-700'}`}>
                                {r.name}
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

export default function IbmActionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <IbmActionsContent />
    </Suspense>
  )
}
