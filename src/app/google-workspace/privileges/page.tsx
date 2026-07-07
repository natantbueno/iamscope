'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import { GWS_ROLES, GWS_TIER_META, GwsTier } from '@/data/googleWorkspace'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ExportButton from '@/components/ExportButton'

// Derive unique admin API privileges from all roles
interface GwsPrivEntry {
  privilege: string
  category: string
  usedByRoles: { name: string; slug: string; isPrivileged: boolean; tier: GwsTier }[]
}

function buildPrivileges(): GwsPrivEntry[] {
  const map = new Map<string, GwsPrivEntry>()
  for (const role of GWS_ROLES) {
    if (!role.apiPrivileges) continue
    for (const priv of role.apiPrivileges) {
      if (!map.has(priv)) {
        // derive category from prefix
        const prefix = priv.split('_')[0]
        const CATEGORY_MAP: Record<string, string> = {
          SUPER: 'Identity', USERS: 'Identity', GROUPS: 'Identity',
          DEVICES: 'Device', CHROME: 'Device',
          SECURITY: 'Security', ADMIN: 'Audit',
          BILLING: 'Billing', RESELLER: 'Billing',
          SERVICES: 'Services', OU: 'Services', MARKETPLACE: 'Services', DATA: 'Services',
          STORAGE: 'Storage', DRIVE: 'Storage',
          DIRECTORY: 'Directory', CALENDAR: 'Calendar',
          VOICE: 'Communication', REPORT: 'Analytics', USAGE: 'Analytics', ALERT: 'Analytics',
        }
        map.set(priv, { privilege: priv, category: CATEGORY_MAP[prefix] ?? 'Other', usedByRoles: [] })
      }
      const entry = map.get(priv)!
      if (!entry.usedByRoles.some(r => r.slug === role.slug)) {
        entry.usedByRoles.push({ name: role.name, slug: role.slug, isPrivileged: role.isPrivileged, tier: role.tier })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.privilege.localeCompare(b.privilege))
}

const TIERS: GwsTier[] = ['SuperAdmin', 'DelegatedAdmin', 'ServiceAdmin', 'SpecializedAdmin', 'ReadOnly']

function GwsPrivilegesContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const privileges = useMemo(() => buildPrivileges(), [])
  const categories = useMemo(() => [...new Set(privileges.map(p => p.category))].sort(), [privileges])

  const [category, setCategory] = useState('all')
  const [privOnly,  setPrivOnly] = useState(false)
  const [expanded,  setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  const filtered = useMemo(() => privileges.filter((p) => {
    if (category !== 'all' && p.category !== category) return false
    if (privOnly && !p.usedByRoles.some(r => r.isPrivileged)) return false
    if (q && !p.privilege.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [privileges, category, privOnly, q])

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])

  const stats = useMemo(() => ({
    total:      privileges.length,
    categories: categories.length,
    superAdmin: privileges.filter(p => p.usedByRoles.some(r => r.tier === 'SuperAdmin')).length,
    privileged: privileges.filter(p => p.usedByRoles.some(r => r.isPrivileged)).length,
    roles:      GWS_ROLES.filter(r => r.apiPrivileges && r.apiPrivileges.length > 0).length,
  }), [privileges, categories])

  return (
    <AppShell
      headerTitle="Google Workspace — Admin API Privileges"
      headerSub={`${stats.total} privilégios únicos · ${stats.roles} roles com API privileges`}
      headerActions={<ExportButton filename="google-workspace-privileges" data={filtered.map((p) => ({
        privilege: p.privilege, category: p.category, usedByRolesCount: p.usedByRoles.length,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: 'Total',        value: stats.total,      color: 'green' },
          { label: 'Super Admin',  value: stats.superAdmin, color: 'red' },
          { label: 'Privilegiadas',value: stats.privileged, color: 'red' },
          { label: 'Categorias',   value: stats.categories, color: 'gray' },
          { label: 'Roles com API',value: stats.roles,      color: 'green' },
        ]} />

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-gray-900 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Categoria:</span>
            <button onClick={() => { setCategory('all'); setPage(1) }}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${category === 'all' ? 'bg-[#34a853] text-white border-[#34a853]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
              Todas
            </button>
            {categories.map(c => (
              <button key={c} onClick={() => { setCategory(category === c ? 'all' : c); setPage(1) }}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${category === c ? 'bg-[#34a853] text-white border-[#34a853]' : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'}`}>
                {c}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
              <input type="checkbox" checked={privOnly} onChange={e => { setPrivOnly(e.target.checked); setPage(1) }}
                className="accent-[#34a853]" />
              Privilegiadas only
            </label>
            <span className="text-[10px] text-gray-500">{filtered.length} privilégios</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-6"></th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">API Privilege</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-32">Categoria</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20">Roles</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const isExp = expanded === p.privilege
                const hasPrivRole = p.usedByRoles.some(r => r.isPrivileged)
                return (
                  <>
                    <tr key={p.privilege}
                      className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : p.privilege)}>
                      <td className="px-4 py-2.5 align-middle text-gray-600">
                        {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-[11px] font-mono text-[#34a853]">{p.privilege}</code>
                        {hasPrivRole && <span className="ml-2 text-[9px] uppercase font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-1.5 py-0.5 rounded">priv</span>}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-[10px] text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-gray-500">{p.usedByRoles.length}</td>
                    </tr>
                    {isExp && (
                      <tr key={p.privilege + '-exp'} className="border-b border-gray-800 bg-gray-900/60">
                        <td colSpan={4} className="px-8 py-2.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Concedida pelas admin roles:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {p.usedByRoles.map((r) => {
                              const tm = GWS_TIER_META[r.tier]
                              return (
                                <span key={r.slug}
                                  className="text-[10px] px-2 py-0.5 rounded border"
                                  style={{ color: tm.textColor, backgroundColor: tm.darkBg, borderColor: tm.textColor + '40' }}>
                                  {r.name}
                                </span>
                              )
                            })}
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
            <div className="flex items-center justify-center h-48 text-gray-500 text-[14px]">Nenhum privilégio encontrado.</div>
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

export default function GwsPrivilegesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <GwsPrivilegesContent />
    </Suspense>
  )
}
