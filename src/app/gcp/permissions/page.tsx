'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import { getGcpPermissions, getGcpServices, getGcpVerbs } from '@/lib/gcpPermissions'
import { GCP_TIER_META, GcpTier } from '@/data/gcp'
import { ChevronDown, ChevronRight } from 'lucide-react'

const TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']

function GcpPermissionsContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const permissions = useMemo(() => getGcpPermissions(), [])
  const services    = useMemo(() => getGcpServices(), [])
  const verbs       = useMemo(() => getGcpVerbs(), [])

  const [tier,    setTier]    = useState<GcpTier | 'all'>('all')
  const [service, setService] = useState('all')
  const [verb,    setVerb]    = useState('all')
  const [privOnly, setPrivOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  const filtered = useMemo(() => permissions.filter((p) => {
    if (tier    !== 'all' && p.tier    !== tier)    return false
    if (service !== 'all' && p.service !== service) return false
    if (verb    !== 'all' && p.verb    !== verb)    return false
    if (privOnly && !p.isUsedByPrivileged)           return false
    if (q && !p.permission.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [permissions, tier, service, verb, privOnly, q])

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])

  const stats = useMemo(() => ({
    total:     permissions.length,
    services:  services.length,
    owner:     permissions.filter(p => p.tier === 'ProjectOwner').length,
    admin:     permissions.filter(p => p.tier === 'Admin').length,
    viewer:    permissions.filter(p => p.tier === 'Viewer').length,
    privileged:permissions.filter(p => p.isUsedByPrivileged).length,
  }), [permissions, services])

  return (
    <AppShell
      headerTitle="GCP IAM Permissions"
      headerSub={`${stats.total} permissões únicas · ${stats.services} serviços`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: 'Total',         value: stats.total,     color: 'green' },
          { label: 'Project Owner', value: stats.owner,     color: 'red' },
          { label: 'Admin',         value: stats.admin,     color: 'orange' },
          { label: 'Viewer',        value: stats.viewer,    color: 'green' },
          { label: 'Privilegiadas', value: stats.privileged,color: 'red' },
          { label: 'Serviços',      value: stats.services,  color: 'gray' },
        ]} />

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-gray-900 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tier filter */}
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tier:</span>
            {(['all', ...TIERS] as const).map((t) => {
              const meta = t !== 'all' ? GCP_TIER_META[t] : null
              return (
                <button key={t} onClick={() => { setTier(t); setPage(1) }}
                  className="text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap"
                  style={tier === t && meta ? { backgroundColor: meta.color + '25', color: meta.color, borderColor: meta.color + '60' }
                    : tier === t ? { backgroundColor: '#0f9d5820', color: '#0f9d58', borderColor: '#0f9d5860' }
                    : { color: '#6b7280', borderColor: '#374151' }}>
                  {t === 'all' ? 'Todos' : meta!.label}
                </button>
              )
            })}
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
              <input type="checkbox" checked={privOnly} onChange={e => { setPrivOnly(e.target.checked); setPage(1) }}
                className="accent-[#0f9d58]" />
              Privilegiadas only
            </label>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Serviço:</span>
            <button onClick={() => { setService('all'); setPage(1) }}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${service === 'all' ? 'bg-[#0f9d58] text-white border-[#0f9d58]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
              Todos
            </button>
            {services.map(s => (
              <button key={s} onClick={() => { setService(service === s ? 'all' : s); setPage(1) }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${service === s ? 'bg-[#0f9d58] text-white border-[#0f9d58]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
                {s}
              </button>
            ))}
            <span className="text-[10px] text-gray-500 ml-auto">{filtered.length} permissões</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Verbo:</span>
            <button onClick={() => { setVerb('all'); setPage(1) }}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${verb === 'all' ? 'bg-[#0f9d58] text-white border-[#0f9d58]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
              Todos
            </button>
            {verbs.map(v => (
              <button key={v} onClick={() => { setVerb(verb === v ? 'all' : v); setPage(1) }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors font-mono ${verb === v ? 'bg-[#0f9d58] text-white border-[#0f9d58]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-6"></th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Permissão</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-36">Serviço</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-28">Verbo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-32">Tier</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20">Roles</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const meta = GCP_TIER_META[p.tier]
                const isExp = expanded === p.permission
                return (
                  <>
                    <tr key={p.permission}
                      className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : p.permission)}>
                      <td className="px-4 py-2.5 align-middle text-gray-600">
                        {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] font-mono text-[#4ade80]">{p.permission}</code>
                        {p.isUsedByPrivileged && <span className="ml-2 text-[9px] uppercase font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-1.5 py-0.5 rounded">priv</span>}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-gray-400">{p.service}</td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] text-gray-400 font-mono">{p.verb}</code>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                          style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.color + '40' }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-gray-500">{p.usedByRoles.length}</td>
                    </tr>
                    {isExp && (
                      <tr key={p.permission + '-exp'} className="border-b border-gray-800 bg-gray-900/60">
                        <td colSpan={6} className="px-8 py-2.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Usada pelas roles:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {p.usedByRoles.map((r) => (
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
            <div className="flex items-center justify-center h-48 text-gray-500 text-[14px]">Nenhuma permissão encontrada.</div>
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

export default function GcpPermissionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <GcpPermissionsContent />
    </Suspense>
  )
}
