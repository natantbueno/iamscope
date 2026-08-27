'use client'

// Catálogo de permissões do Azure RBAC — todas as actions usadas pelas roles.
//
// É a visão invertida de /azure-rbac/roles: em vez de "o que esta role
// concede", responde "quais roles concedem esta action". Os dados vêm do
// índice invertido gerado em build time (public/azure-perms-index.json),
// carregado uma vez e reaproveitado pelas páginas de detalhe.

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, ChevronRight, ExternalLink, KeyRound } from 'lucide-react'

import AppShell from '@/components/AppShell'
import ExportButton from '@/components/ExportButton'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import StatsBar from '@/components/StatsBar'
import {
  AzurePermIndexFile, AzurePermissionEntry,
  buildAzurePermissionCatalog, getProviderCounts, getVerbCounts,
} from '@/lib/azurePermissions'
import { useNumberFormat } from '@/i18n/useNumberFormat'


const VERB_COLORS: Record<string, string> = {
  read: '#34d399', write: '#fbbf24', delete: '#f87171',
  action: '#60a5fa', Read: '#34d399', Write: '#fbbf24', Delete: '#f87171', Action: '#60a5fa',
}

function AzurePermissionsContent() {
  const t = useT()
  const fmt = useNumberFormat()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [entries, setEntries] = useState<AzurePermissionEntry[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [provider, setProvider] = useState(searchParams.get('provider') ?? 'all')
  const [verb, setVerb] = useState('all')

  useEffect(() => {
    Promise.all([
      fetch('/azure-perms-index.json').then((r) => { if (!r.ok) throw new Error(); return r.json() }),
      fetch('/azure-action-descriptions.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ])
      .then(([idx, desc]: [AzurePermIndexFile, Record<string, string>]) => {
        setEntries(buildAzurePermissionCatalog(idx, desc))
      })
      .catch(() => setError(true))
  }, [])

  // ?q= e ?provider= na URL para o resultado ser compartilhável
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams()
      if (query.trim()) p.set('q', query)
      if (provider !== 'all') p.set('provider', provider)
      const qs = p.toString()
      router.replace(`/azure-rbac/permissions${qs ? '?' + qs : ''}`, { scroll: false })
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, provider])

  const providers = useMemo(() => (entries ? getProviderCounts(entries) : []), [entries])
  const verbs = useMemo(() => (entries ? getVerbCounts(entries) : []), [entries])

  const filtered = useMemo(() => {
    if (!entries) return []
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (provider !== 'all' && e.provider !== provider) return false
      if (verb !== 'all' && e.verb !== verb) return false
      if (!q) return true
      return e.action.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q)
    })
  }, [entries, query, provider, verb])

  const { paginated: visible, page, setPage, pageSize, setPageSize } = usePagination(filtered)

  useEffect(() => { setPage(1) }, [query, provider, verb, setPage])
  const withDesc = useMemo(() => (entries ?? []).filter((e) => e.description).length, [entries])

  return (
    <AppShell
      headerTitle={t('perm.azureHeader')}
      headerSub={entries ? t('sub.azurePerms') : t('state.loadingCatalog')}
      headerActions={
        filtered.length > 0
          ? <ExportButton filename="azure-rbac-permissions" title="Azure RBAC Permissions"
              data={filtered.map((e) => ({
                action: e.action, provider: e.provider, resource: e.resource, verb: e.verb,
                roles: e.roles.length, description: e.description ?? '',
              }))} />
          : undefined
      }
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {entries && (
          <StatsBar stats={[
            { label: t('count.actions'), value: entries.length, color: 'blue' },
            { label: t('label.providers'), value: providers.length, color: 'purple' },
            { label: t('label.wildcards'), value: entries.filter((e) => e.isWildcard).length, color: 'orange' },
            { label: t('label.withOfficialDesc'), value: withDesc, color: withDesc > 0 ? 'green' : 'gray' },
          ]} />
        )}

        {/* Filtros */}
        <div className="px-4 pt-3 pb-2 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-2">
          <div className="relative max-w-2xl">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ph.searchActionOrDesc')}
              aria-label={t('aria.searchAzurePerm')}
              className="w-full text-tiny pl-8 pr-8 py-1.5 rounded-md border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label={t('action.clearSearch')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Verbo */}
          <div className="flex items-center gap-1.5 flex-wrap rolagem-chips">
            <span className="text-2xs text-fg-subtle uppercase tracking-wider mr-1">Verbo:</span>
            <button onClick={() => setVerb('all')}
              className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${
                verb === 'all' ? 'bg-brand text-white border-brand' : 'text-fg-muted border-gray-300 dark:border-gray-700 hover:border-gray-500'
              }`}>{t('filter.all')}</button>
            {verbs.slice(0, 8).map(([v, n]) => {
              const c = VERB_COLORS[v] ?? '#85b7eb'
              const active = verb === v
              return (
                <button key={v} onClick={() => setVerb(active ? 'all' : v)}
                  className="text-3xs px-2.5 py-0.5 rounded-full border transition-colors"
                  style={active ? { background: c + '25', color: c, borderColor: c + '80' } : { color: '#6b7280', borderColor: '#374151' }}>
                  {v} ({n})
                </button>
              )
            })}
          </div>

          {/* Provider */}
          <div className="flex items-center gap-1.5 flex-wrap rolagem-chips">
            <span className="text-2xs text-fg-subtle uppercase tracking-wider mr-1">{t('perm.providerColon')}</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              aria-label={t('filter.byProvider')}
              className="text-3xs px-2 py-1 rounded border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-brand max-w-xs"
            >
              <option value="all">{t('perm.allProviders')} ({providers.length} providers)</option>
              {providers.map(([p, n]) => <option key={p} value={p}>{p} ({n})</option>)}
            </select>
            <span className="text-3xs text-fg-muted ml-auto">
              {fmt(filtered.length)} {t('pagination.of')} {fmt(entries?.length ?? 0)}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto table-scroll-x">
          {error && (
            <div className="flex items-center justify-center h-48 text-red-400 text-body">
              Falha ao carregar o índice de permissões.
            </div>
          )}
          {!entries && !error && (
            <div className="flex items-center justify-center h-48 text-fg-subtle text-body">{t('state.loading')}</div>
          )}
          {entries && (
            <>
              <table className="w-full text-tiny border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
                    <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">Action</th>
                    <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 w-52">Provider</th>
                    <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 w-24">{t('table.verb')}</th>
                    <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 w-20 text-right">Roles</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.slug} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group">
                      <td className="px-4 py-2.5 align-top">
                        <Link href={`/azure-rbac/permissions/${e.slug}`}
                          className="font-mono text-3xs text-accent hover:underline break-all">
                          {e.action}
                        </Link>
                        {e.description && (
                          <p className="text-3xs text-fg-subtle leading-snug mt-0.5 line-clamp-1">{e.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <span className="text-3xs font-mono text-fg-muted break-all">{e.provider}</span>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        {e.verb && (
                          <span className="text-2xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                            style={{
                              color: VERB_COLORS[e.verb] ?? '#9ca3af',
                              borderColor: (VERB_COLORS[e.verb] ?? '#9ca3af') + '50',
                              background: (VERB_COLORS[e.verb] ?? '#9ca3af') + '15',
                            }}>
                            {e.verb}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 align-top text-right">
                        <span className="text-tiny font-semibold tabular-nums text-gray-600 dark:text-gray-300">{e.roles.length}</span>
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <Link href={`/azure-rbac/permissions/${e.slug}`}
                          aria-label={`Detalhes de ${e.action}`}
                          className="text-fg-muted dark:text-gray-600 group-hover:text-brand-onDark transition-colors inline-block">
                          <ChevronRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-fg-subtle">
                  <Search size={28} className="mb-2 opacity-40" />
                  <p className="text-body">{t('empty.permissions')}</p>
                </div>
              )}
              <Pagination
                total={filtered.length} page={page} pageSize={pageSize}
                onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.permissions"
              />

              {withDesc < (entries.length * 0.5) && (
                <div className="px-4 py-3 border-t border-surface-border dark:border-gray-800">
                  <p className="text-3xs text-fg-muted flex items-start gap-1.5">
                    <KeyRound size={12} className="shrink-0 mt-0.5" />
                    <span>
                      A descrição oficial por action está em <strong>{withDesc}</strong> de {entries.length} permissões
                      ({(withDesc / entries.length * 100).toFixed(1)}%). A coleta é incremental a partir da{' '}
                      <a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions"
                        target="_blank" rel="noreferrer"
                        className="text-brand-onDark hover:underline inline-flex items-center gap-0.5">
                        referência de permissões da Microsoft <ExternalLink size={10} />
                      </a>.
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function AzurePermissionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <AzurePermissionsContent />
    </Suspense>
  )
}
