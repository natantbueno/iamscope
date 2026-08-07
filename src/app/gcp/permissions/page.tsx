'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import { getGcpPermissions, type GcpPermEntry } from '@/lib/gcpPermissions'
// TIER_META vem de '@/data/tierMeta', não do módulo de dados. Os dois exportam
// o mesmo objeto, mas importar pelo módulo de dados arrasta o dataset inteiro
// para o bundle desta rota — que é justamente o que tierMeta.ts foi criado
// para evitar. Ver o cabeçalho de src/data/tierMeta.ts.
import { GCP_TIER_META } from '@/data/tierMeta'
import type { GcpTier } from '@/data/gcp'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ExportButton from '@/components/ExportButton'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useNumberFormat } from '@/i18n/useNumberFormat'

const TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']

function GcpPermissionsContent() {
  const t = useT()
  const fmt = useNumberFormat()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  // O índice de permissões vive em public/gcp-perms-index.json (fora do
  // bundle) — por isso carrega sob demanda, como a página da Azure.
  const [permissions, setPermissions] = useState<GcpPermEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let alive = true
    getGcpPermissions()
      .then((p) => { if (alive) { setPermissions(p); setLoading(false) } })
      .catch(() => { if (alive) { setLoadError(true); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const services = useMemo(
    () => [...new Set(permissions.map((p) => p.service))].sort(), [permissions])
  const verbs = useMemo(
    () => [...new Set(permissions.map((p) => p.verb).filter(Boolean))].sort(), [permissions])

  const [tier,    setTier]    = useState<GcpTier | 'all'>('all')
  const [service, setService] = useState('all')
  const [verb,    setVerb]    = useState('all')
  const [privOnly, setPrivOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => permissions.filter((p) => {
    if (tier    !== 'all' && p.tier    !== tier)    return false
    if (service !== 'all' && p.service !== service) return false
    if (verb    !== 'all' && p.verb    !== verb)    return false
    if (privOnly && !p.isUsedByPrivileged)           return false
    if (q && !p.permission.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [permissions, tier, service, verb, privOnly, q])

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtered)

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
      headerSub={t('sub.gcpPerms')}
      headerActions={<ExportButton filename="gcp-permissions" data={filtered.map((p) => ({
        permission: p.permission, service: p.service, verb: p.verb, tier: p.tier,
        isUsedByPrivileged: p.isUsedByPrivileged, usedByRolesCount: p.usedByRoles.length,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {loadError && (
          <div className="m-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-tiny text-red-600 dark:text-red-400">
            {t('perm.gcpLoadFailed')}{' '}
            (<code className="font-mono">/gcp-perms-index.json</code>).
          </div>
        )}
        {loading && !loadError && (
          <div className="m-4 text-tiny text-fg-subtle">{t('perm.loadingGcp')}</div>
        )}
        <StatsBar stats={[
          { label: t('count.total'), value: stats.total,     color: 'green' },
          { label: 'Project Owner', value: stats.owner,     color: 'red' },
          { label: 'Admin',         value: stats.admin,     color: 'orange' },
          { label: 'Viewer',        value: stats.viewer,    color: 'green' },
          { label: t('filter.privileged'), value: stats.privileged, color: 'red' },
          { label: t('label.services'),    value: stats.services,   color: 'gray' },
        ]} />

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-line bg-surface flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tier filter */}
            <span className="text-2xs text-fg-muted uppercase tracking-wider">Tier:</span>
            {(['all', ...TIERS] as const).map((t) => {
              const meta = t !== 'all' ? GCP_TIER_META[t] : null
              return (
                <button key={t} onClick={() => { setTier(t); setPage(1) }}
                  className="text-3xs px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap"
                  style={tier === t && meta ? { backgroundColor: meta.color + '25', color: meta.color, borderColor: meta.color + '60' }
                    : tier === t ? { backgroundColor: '#4285f420', color: '#4285f4', borderColor: '#4285f460' }
                    : { color: '#6b7280', borderColor: '#374151' }}>
                  {t === 'all' ? 'Todos' : meta!.label}
                </button>
              )
            })}
            <label className="ml-auto flex items-center gap-1.5 text-3xs text-fg-subtle cursor-pointer">
              <input type="checkbox" checked={privOnly} onChange={e => { setPrivOnly(e.target.checked); setPage(1) }}
                className="accent-csp-gcp" />
              Privilegiadas only
            </label>
          </div>
          {/*
            Serviço e Verbo são <select>, não chips: com os dados oficiais são
            314 serviços e milhares de verbos. Como chips, os filtros ocupavam
            várias telas e empurravam a tabela para fora da página.
          */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5">
              <span className="text-2xs text-fg-muted uppercase tracking-wider">{t('table.service')}</span>
              <select
                value={service}
                onChange={(e) => { setService(e.target.value); setPage(1) }}
                className="text-3xs bg-surface border border-line-strong rounded-md px-2 py-1 text-fg-muted focus:border-csp-gcp focus:outline-none max-w-[220px]"
              >
                <option value="all">Todos ({services.length})</option>
                {services.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-2xs text-fg-muted uppercase tracking-wider">{t('table.verb')}</span>
              <select
                value={verb}
                onChange={(e) => { setVerb(e.target.value); setPage(1) }}
                className="text-3xs font-mono bg-surface border border-line-strong rounded-md px-2 py-1 text-fg-muted focus:border-csp-gcp focus:outline-none max-w-[220px]"
              >
                <option value="all">Todos ({verbs.length})</option>
                {verbs.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            {(service !== 'all' || verb !== 'all') && (
              <button
                onClick={() => { setService('all'); setVerb('all'); setPage(1) }}
                className="text-3xs px-2 py-1 rounded-md border border-line-strong text-fg-subtle hover:text-fg hover:border-gray-500 transition-colors"
              >
                Limpar filtros
              </button>
            )}

            <span className="text-2xs text-fg-muted ml-auto">
              {fmt(filtered.length)} {t('noun.permissions')}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-tiny border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-alt border-b border-line-strong">
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-6"></th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider">{t('table.permission')}</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-36">{t('table.service')}</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-28">{t('table.verb')}</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-32">Tier</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-20">Roles</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const meta = GCP_TIER_META[p.tier]
                const isExp = expanded === p.permission
                return (
                  <>
                    <tr key={p.permission}
                      className="border-b border-line hover:bg-surface-alt/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : p.permission)}>
                      <td className="px-4 py-2.5 align-middle text-gray-600">
                        {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-3xs font-mono text-success-fg">{p.permission}</code>
                        {p.isUsedByPrivileged && <span className="ml-2 text-micro uppercase font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 px-1.5 py-0.5 rounded">priv</span>}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-fg-subtle">{p.service}</td>
                      <td className="px-4 py-2.5 align-middle">
                        <code className="text-3xs text-fg-subtle font-mono">{p.verb}</code>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-2xs px-2 py-0.5 rounded-full border font-medium"
                          style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.color + '40' }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-fg-muted">{p.usedByRoles.length}</td>
                    </tr>
                    {isExp && (
                      <tr key={p.permission + '-exp'} className="border-b border-line bg-surface/60">
                        <td colSpan={6} className="px-8 py-2.5">
                          <p className="text-2xs text-fg-muted uppercase tracking-wider mb-1.5">Usada pelas roles:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {p.usedByRoles.map((r) => (
                              <span key={r.slug}
                                className={`text-2xs px-2 py-0.5 rounded border ${r.isPrivileged ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800/40' : 'text-fg-muted bg-surface-alt border-line-strong'}`}>
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
            <div className="flex items-center justify-center h-48 text-fg-muted text-note">{t('empty.permissions')}</div>
          )}
        </div>
        <Pagination
          total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.permissions"
        />
      </div>
    </AppShell>
  )
}

export default function GcpPermissionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <GcpPermissionsContent />
    </Suspense>
  )
}
