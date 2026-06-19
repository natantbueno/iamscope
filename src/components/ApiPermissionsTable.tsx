'use client'

import { useState, useMemo } from 'react'
import { Copy, CheckCheck } from 'lucide-react'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { EamTier } from '@/data/roles'
import EamTierBadge from './EamTierBadge'

type ApiFilter = 'all' | EamTier

const FILTERS: { label: string; value: ApiFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Control Plane', value: 'ControlPlane' },
  { label: 'Management Plane', value: 'ManagementPlane' },
  { label: 'Workload Plane', value: 'WorkloadPlane' },
  { label: 'User Access', value: 'UserAccess' },
]

const PAGE_SIZE = 50

export default function ApiPermissionsTable({ search, initialTier = 'all' }: { search: string; initialTier?: string }) {
  const [filter, setFilter] = useState<ApiFilter>(
    ['ControlPlane', 'ManagementPlane', 'WorkloadPlane', 'UserAccess'].includes(initialTier)
      ? (initialTier as ApiFilter)
      : 'all'
  )
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return API_PERMISSIONS.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      const matchFilter = filter === 'all' || p.eamTier === filter
      return matchSearch && matchFilter
    })
  }, [search, filter])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const onFilter = (f: ApiFilter) => { setFilter(f); setPage(1) }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => onFilter(f.value)}
            className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
              filter === f.value
                ? 'bg-[#e8f1fb] dark:bg-[#0c2a47] text-[#0078d4] dark:text-[#85b7eb] border-[#9dc3e8] dark:border-[#185fa5] font-medium'
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">{filtered.length} permissões</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <p className="text-[14px]">Nenhuma permissão encontrada.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-[13px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th className="w-72">Permissão</Th>
                  <Th>Categoria</Th>
                  <Th className="w-32">EAM Tier</Th>
                  <Th className="w-24">Tipo</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((perm) => (
                  <tr key={perm.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-[12px] text-[#0078d4] dark:text-[#85b7eb] font-medium break-all">{perm.name}</code>
                        <button onClick={() => copyId(perm.id)}
                          className="text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                          title="Copiar ID">
                          {copiedId === perm.id ? <CheckCheck size={12} className="text-green-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{perm.id.substring(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-gray-500 dark:text-gray-400 text-[12px]">{perm.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <EamTierBadge tier={perm.eamTier} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {perm.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div className="flex justify-center py-4">
                <button onClick={() => setPage((p) => p + 1)}
                  className="text-[12px] px-4 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Carregar mais ({filtered.length - visible.length} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5 ${className}`}>
      {children}
    </th>
  )
}
