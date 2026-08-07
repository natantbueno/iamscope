'use client'

// Permission Scope — busca reversa de permissão em todas as 6 clouds.
//
// O usuário digita uma permissão qualquer (role action do Entra, action do
// Azure, ação IAM da AWS, permission do GCP, ação do IBM Cloud ou
// privilege do Google Workspace) e a página mostra todas as roles/policies que
// a concedem, agrupadas por cloud.
//
// Duas fontes se combinam aqui:
//  - 6 clouds vêm do índice em memória (lib/permissionScope.ts), já no bundle;
//  - Azure RBAC vem de public/azure-perms-index.json, carregado sob demanda,
//    porque suas permissões vivem fora do bundle (926 arquivos JSON).

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, ShieldAlert, ScanSearch, ChevronRight, ChevronDown, ChevronsDown, ChevronsUp } from 'lucide-react'

import AppShell from '@/components/AppShell'
import ExportButton from '@/components/ExportButton'
import { CloudId, CLOUD_META, CLOUD_ORDER, getCloudUrl } from '@/data/compare/types'
import {
  ScopeMatch, ScopeRoleRef, CLOUD_TERMS,
  searchLocalPermissions, countLocalMatches, getLocalIndexStats,
  ensureLocalPermissionIndex,
} from '@/lib/permissionScope'

interface AzurePermIndex { slugs: string[]; index: Record<string, number[]> }

const PER_CLOUD_LIMIT = 40

function PermissionScopeContent() {
  const t = useT()
  const fmt = useNumberFormat()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [activeClouds, setActiveClouds] = useState<Set<CloudId>>(new Set(CLOUD_ORDER))

  // Recolher/expandir. Guardamos o que está RECOLHIDO — assim tudo nasce
  // expandido e um resultado novo não herda o estado do anterior.
  const [collapsedClouds, setCollapsedClouds] = useState<Set<CloudId>>(new Set())
  const [collapsedPerms, setCollapsedPerms] = useState<Set<string>>(new Set())

  const toggleCloudCollapsed = (c: CloudId) =>
    setCollapsedClouds((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c); else next.add(c)
      return next
    })

  const togglePerm = (key: string) =>
    setCollapsedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })

  const expandAll = () => { setCollapsedClouds(new Set()); setCollapsedPerms(new Set()) }

  // Índice do Azure RBAC — carregado só quando o usuário busca de fato.
  const [azureIndex, setAzureIndex] = useState<AzurePermIndex | null>(null)
  const [azureBySlug, setAzureBySlug] = useState<Map<string, { name: string; isPrivileged: boolean }>>(new Map())
  const [azureLoading, setAzureLoading] = useState(false)
  const [azureError, setAzureError] = useState(false)

  useEffect(() => {
    if (!query.trim() || azureIndex || azureLoading) return
    setAzureLoading(true)
    // O catálogo de roles do Azure (azureRbac.ts, 180 kB) vem junto com o
    // índice, por import dinâmico: ele só serve para traduzir slug -> nome, e
    // isso só faz sentido quando o índice chega. Importado no topo, entrava no
    // First Load de quem talvez nunca buscasse nada.
    Promise.all([
      fetch('/azure-perms-index.json')
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<AzurePermIndex> }),
      import('@/data/azureRbac'),
    ])
      .then(([d, { AZURE_ROLES }]) => {
        const m = new Map<string, { name: string; isPrivileged: boolean }>()
        for (const r of AZURE_ROLES) m.set(r.slug, { name: r.name, isPrivileged: r.isPrivileged })
        setAzureBySlug(m)
        setAzureIndex(d)
        setAzureError(false)
      })
      .catch(() => setAzureError(true))
      .finally(() => setAzureLoading(false))
  }, [query, azureIndex, azureLoading])

  // As permissões do GCP também saíram do bundle (public/gcp-perms-index.json).
  // Sem esperar por elas, a busca voltaria sem nenhum resultado de GCP — e sem
  // avisar, que é pior do que demorar um instante a mais.
  const [gcpReady, setGcpReady] = useState(false)

  useEffect(() => {
    if (!query.trim() || gcpReady) return
    let alive = true
    ensureLocalPermissionIndex()
      .catch(() => { /* as outras clouds continuam respondendo */ })
      .finally(() => { if (alive) setGcpReady(true) })
    return () => { alive = false }
  }, [query, gcpReady])

  // Mantém ?q= na URL para o resultado ser compartilhável.
  useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (current === query) return
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString())
      if (query.trim()) p.set('q', query); else p.delete('q')
      const qs = p.toString()
      router.replace(`/permission-scope${qs ? '?' + qs : ''}`, { scroll: false })
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Matches do Azure, no mesmo formato das demais clouds.
  const azureMatches = useMemo<ScopeMatch[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q || !azureIndex) return []
    const out: ScopeMatch[] = []
    for (const action of Object.keys(azureIndex.index)) {
      if (!action.toLowerCase().includes(q)) continue
      const roles: ScopeRoleRef[] = []
      for (const i of azureIndex.index[action]) {
        const slug = azureIndex.slugs[i]
        const meta = slug ? azureBySlug.get(slug) : undefined
        if (slug && meta) roles.push({ name: meta.name, slug, isPrivileged: meta.isPrivileged })
      }
      out.push({ cloud: 'azureRbac', permission: action, roles })
    }
    const rank = (p: string) => {
      const s = p.toLowerCase()
      return s === q ? 0 : s.startsWith(q) ? 1 : 2
    }
    out.sort((a, b) =>
      rank(a.permission) - rank(b.permission) ||
      b.roles.length - a.roles.length ||
      a.permission.localeCompare(b.permission))
    return out
  }, [query, azureIndex, azureBySlug])

  // gcpReady entra nas dependências de propósito: quando o índice do GCP
  // termina de carregar, a busca precisa ser refeita para incluí-lo.
  const localMatches = useMemo(
    () => searchLocalPermissions(query, PER_CLOUD_LIMIT), [query, gcpReady])
  const localCounts  = useMemo(() => countLocalMatches(query), [query, gcpReady])

  // O índice das 6 clouds é construído na primeira vez que é tocado. Calcular o
  // total já na renderização inicial atrasaria o primeiro paint à toa, então
  // isso acontece logo depois da montagem.
  const [indexedTotal, setIndexedTotal] = useState<number | null>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      const stats = getLocalIndexStats()
      setIndexedTotal(Object.values(stats).reduce((a, b) => a + b, 0))
    }, 0)
    return () => clearTimeout(id)
  }, [])

  // Totais reais (antes do limite de exibição), por cloud.
  const totals = useMemo(() => {
    const t: Record<string, number> = { ...localCounts }
    if (azureMatches.length) t.azureRbac = azureMatches.length
    return t
  }, [localCounts, azureMatches])

  const grouped = useMemo(() => {
    const all = [...localMatches, ...azureMatches.slice(0, PER_CLOUD_LIMIT)]
    const g = new Map<CloudId, ScopeMatch[]>()
    for (const m of all) {
      if (!activeClouds.has(m.cloud)) continue
      const arr = g.get(m.cloud)
      if (arr) arr.push(m); else g.set(m.cloud, [m])
    }
    return g
  }, [localMatches, azureMatches, activeClouds])

  // Recolher tudo precisa conhecer o que está na tela agora.
  const collapseAll = () => {
    setCollapsedClouds(new Set(grouped.keys()))
    setCollapsedPerms(new Set(
      [...grouped.entries()].flatMap(([cloud, ms]) => ms.map((m) => `${cloud}|${m.permission}`)),
    ))
  }

  // Uma busca nova começa toda expandida.
  useEffect(() => {
    setCollapsedClouds(new Set())
    setCollapsedPerms(new Set())
  }, [query])

  const totalRolesFound = useMemo(() => {
    let n = 0
    for (const list of grouped.values()) for (const m of list) n += m.roles.length
    return n
  }, [grouped])

  const totalPermsFound = useMemo(() => {
    let n = 0
    for (const [cloud, count] of Object.entries(totals)) {
      if (activeClouds.has(cloud as CloudId)) n += count
    }
    return n
  }, [totals, activeClouds])

  const toggleCloud = (c: CloudId) => {
    setActiveClouds((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c); else next.add(c)
      return next.size === 0 ? new Set(CLOUD_ORDER) : next
    })
  }

  const exportRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    for (const cloud of CLOUD_ORDER) {
      for (const m of grouped.get(cloud) ?? []) {
        for (const r of m.roles) {
          rows.push({
            cloud: CLOUD_META[cloud].label,
            permission: m.permission,
            role: r.name,
            isPrivileged: r.isPrivileged,
            url: getCloudUrl(cloud, r.slug),
          })
        }
      }
    }
    return rows
  }, [grouped])

  const hasQuery = query.trim().length > 0

  return (
    <AppShell
      headerTitle="Permission Scope"
      headerSub={t('perm.scopeLead')}
      headerActions={
        exportRows.length > 0
          ? <ExportButton filename="permission-scope" title="Permission Scope" data={exportRows} />
          : undefined
      }
      pageHasOwnHeading
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl px-6 py-6 space-y-6">

          {/* Busca */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ScanSearch size={18} className="text-brand-onDark" />
              <h1 className="text-sub font-semibold text-gray-800 dark:text-gray-100">
                Busca reversa de permissão
              </h1>
              <span className="text-micro font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.5 rounded">
                Beta
              </span>
            </div>
            <p className="text-body text-fg-muted leading-relaxed mb-4">
              Cole uma permissão de qualquer plataforma e veja todas as roles e policies que a
              concedem. Aceita busca parcial — <code className="font-mono text-tiny">listKeys</code> encontra
              tanto <code className="font-mono text-tiny">Microsoft.Storage/storageAccounts/listKeys/action</code> quanto
              equivalentes em outras clouds.
            </p>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="ex.: listKeys · s3:GetObject · compute.instances.delete · microsoft.directory/users/create"
                aria-label={t('aria.searchPermAllClouds')}
                className="w-full text-body pl-9 pr-9 py-2.5 rounded-lg border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label={t('action.clearSearch')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filtro por cloud */}
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              {CLOUD_ORDER.map((c) => {
                const active = activeClouds.has(c)
                const meta = CLOUD_META[c]
                const n = totals[c] ?? 0
                return (
                  <button
                    key={c}
                    onClick={() => toggleCloud(c)}
                    className={`text-3xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                      active ? 'text-white border-transparent' : 'text-fg-subtle border-gray-300 dark:border-gray-700 hover:border-gray-500'
                    }`}
                    style={active ? { background: meta.color, borderColor: meta.color } : {}}
                  >
                    {meta.shortLabel}
                    {hasQuery && <span className="ml-1 opacity-80">{n}</span>}
                  </button>
                )
              })}
            </div>

            {/* Estado */}
            <div className="mt-3 text-tiny">
              {!hasQuery && (
                <span className="text-fg-muted">
                  {indexedTotal !== null
                    ? `${fmt(indexedTotal)} ${t('perm.indexedIn')}`
                    : t('state.indexingPerms')} · {t('perm.azureOnDemand')}
                </span>
              )}
              {hasQuery && azureLoading && (
                <span className="text-fg-muted">{t('state.loadingAzureIndex')}</span>
              )}
              {hasQuery && azureError && (
                <span className="text-red-500">
                  {t('perm.azureIndexFailed')}
                </span>
              )}
              {hasQuery && !azureLoading && !azureError && (
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>{fmt(totalPermsFound)}</strong> {t('perm.matchedPerms')} ·{' '}
                  <strong>{fmt(totalRolesFound)}</strong> {t('perm.roleGrants')}
                </span>
              )}
            </div>
          </section>

          {/* Resultados */}
          {hasQuery && grouped.size === 0 && !azureLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-body">Nenhuma permissão encontrada para “{query}”.</p>
              <p className="text-tiny mt-1">{t('perm.scopeTryShorter')}</p>
            </div>
          )}

          {/* Controles de recolher/expandir — só aparecem quando há resultado */}
          {grouped.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={expandAll}
                className="inline-flex items-center gap-1.5 text-3xs px-2.5 py-1 rounded-md border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronsDown size={12} /> Expandir tudo
              </button>
              <button
                onClick={collapseAll}
                className="inline-flex items-center gap-1.5 text-3xs px-2.5 py-1 rounded-md border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronsUp size={12} /> Recolher tudo
              </button>
            </div>
          )}

          {CLOUD_ORDER.filter((c) => grouped.has(c)).map((cloud) => {
            const matches = grouped.get(cloud)!
            const meta = CLOUD_META[cloud]
            const terms = CLOUD_TERMS[cloud]
            const total = totals[cloud] ?? matches.length
            const cloudOpen = !collapsedClouds.has(cloud)
            return (
              <section key={cloud} className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl overflow-hidden">
                {/* Cabeçalho da cloud — recolhe a seção inteira */}
                <button
                  onClick={() => toggleCloudCollapsed(cloud)}
                  aria-expanded={cloudOpen}
                  className="w-full px-4 py-2.5 flex items-center gap-2 border-b border-surface-border dark:border-gray-800 text-left hover:brightness-95 transition-all"
                  style={{ background: meta.color + '14' }}
                >
                  {cloudOpen
                    ? <ChevronDown size={14} className="shrink-0" />
                    : <ChevronRight size={14} className="shrink-0" />}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                  <h2 className="text-body font-semibold">{meta.label}</h2>
                  <span className="text-3xs text-fg-muted">
                    {fmt(total)} {terms.permission.toLowerCase()}(s)
                    {total > matches.length && ` · ${t('perm.showing')} ${matches.length}`}
                  </span>
                </button>

                {cloudOpen && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {matches.map((m) => {
                      const key = `${cloud}|${m.permission}`
                      const open = !collapsedPerms.has(key)
                      return (
                        <div key={m.permission}>
                          {/* Linha da permissão — recolhe a tabela de roles */}
                          <button
                            onClick={() => togglePerm(key)}
                            aria-expanded={open}
                            className="w-full px-4 py-2.5 flex items-start gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            {open
                              ? <ChevronDown size={13} className="text-fg-subtle shrink-0 mt-0.5" />
                              : <ChevronRight size={13} className="text-fg-subtle shrink-0 mt-0.5" />}
                            <code className="flex-1 text-tiny font-mono break-all">
                              {m.permission}
                            </code>
                            <span className="text-2xs text-fg-muted whitespace-nowrap shrink-0 mt-0.5">
                              {m.roles.length} {terms.principal}
                            </span>
                          </button>

                          {/* Roles em tabela */}
                          {open && (
                            <div className="px-4 pb-3">
                              <div className="border border-surface-border dark:border-gray-800 rounded-lg overflow-hidden">
                                <table className="w-full text-tiny border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
                                      <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2">
                                        {terms.principal === 'policies' ? 'Policy' : 'Role'}
                                      </th>
                                      <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 w-32">
                                        Privilegiada
                                      </th>
                                      <th className="w-10" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.roles.map((r) => (
                                      <tr key={r.slug}
                                        className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                                        <td className="px-3 py-2">
                                          <Link href={getCloudUrl(cloud, r.slug)}
                                            className="text-tiny font-medium hover:underline"
                                           >
                                            {r.name}
                                          </Link>
                                        </td>
                                        <td className="px-3 py-2">
                                          {r.isPrivileged
                                            ? <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40">
                                                <ShieldAlert size={10} /> Sim
                                              </span>
                                            : <span className="text-3xs text-fg-subtle dark:text-gray-600">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                          <Link href={getCloudUrl(cloud, r.slug)}
                                            aria-label={`Abrir ${r.name}`}
                                            className="text-fg-muted dark:text-gray-600 hover:opacity-80 transition-opacity inline-block">
                                            <ChevronRight size={14} />
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          <div className="pb-8" />
        </div>
      </div>
    </AppShell>
  )
}

export default function PermissionScopePage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <PermissionScopeContent />
    </Suspense>
  )
}
