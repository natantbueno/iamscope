'use client'

// Índice dos resource providers do Azure RBAC.
//
// A página irmã de /aws/actions (451 serviços) e /gcp/permissions (317). O
// Azure era a única nuvem grande sem entrada por serviço: quem procurava
// `Microsoft.Storage/blobServices/containers/write` não chegava aqui, porque
// /azure-rbac/permissions só cataloga as actions escritas por extenso nas
// definições de role — e essa não é a string que a pessoa digita.
//
// O layout espelha as duas irmãs de propósito: StatsBar, filtros numa faixa
// própria, tabela densa, Pagination no rodapé. A inconsistência entre páginas
// que respondem à mesma pergunta custaria mais do que qualquer economia.

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Search, X } from 'lucide-react'

import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import ExportButton from '@/components/ExportButton'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useInlineQuery } from '@/hooks/useInlineQuery'
import {
  getAzureProviderIndex,
  type AzureProviderIndex,
  type AzureProviderSummary,
} from '@/lib/azureProviders'

type Ordem = 'size' | 'name' | 'roles'

function AzureProvidersContent() {
  const t = useT()
  const fmt = useNumberFormat()

  // O índice vive em public/azure-providers/index.json (fora do bundle) —
  // carrega sob demanda, como as páginas de AWS e GCP.
  const [data, setData] = useState<AzureProviderIndex | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let alive = true
    getAzureProviderIndex()
      .then((d) => { if (alive) setData(d) })
      .catch(() => { if (alive) setLoadError(true) })
    return () => { alive = false }
  }, [])

  const [busca, setBusca] = useInlineQuery('/azure-rbac/providers')
  const [ordem, setOrdem] = useState<Ordem>('size')

  const providers = data?.providers ?? []
  const meta = data?._meta

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const base = termo
      ? providers.filter((p) => p.name.toLowerCase().includes(termo))
      : providers
    const out = [...base]
    // O padrão é por tamanho: a pergunta que traz alguém a este índice é "onde
    // está o grosso das permissões do Azure", e alfabético enterra isso.
    if (ordem === 'size') out.sort((a, b) => b.actions - a.actions || a.name.localeCompare(b.name))
    if (ordem === 'roles') out.sort((a, b) => b.roles - a.roles || a.name.localeCompare(b.name))
    if (ordem === 'name') out.sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [providers, busca, ordem])

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtrados)
  useEffect(() => { setPage(1) }, [busca, ordem, setPage])

  const maior = providers[0]?.actions ?? 1

  return (
    <AppShell
      headerTitle="Azure Resource Providers"
      headerSub={t('sub.azureProviders')}
      headerActions={
        filtrados.length > 0
          ? <ExportButton filename="azure-rbac-providers" title="Azure RBAC Providers"
              data={filtrados.map((p) => ({
                provider: p.name, actions: p.actions, roles: p.roles,
                read: p.read, write: p.write, delete: p.delete, action: p.action,
                planeDeclared: p.typed,
              }))} />
          : undefined
      }
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {loadError && (
          <div className="m-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-tiny text-red-600 dark:text-red-400">
            {t('azp.loadFailed')}{' '}
            (<code className="font-mono">/azure-providers/index.json</code>).
          </div>
        )}
        {!data && !loadError && (
          <div className="m-4 text-tiny text-fg-subtle">{t('azp.loading')}</div>
        )}

        {meta && (
          <StatsBar stats={[
            { label: t('label.providers'),     value: meta.providers,      color: 'blue' },
            { label: t('count.actions'),       value: meta.universeActions, color: 'purple' },
            { label: t('count.roles'),         value: meta.roles,          color: 'gray' },
            { label: t('label.planeDeclared'), value: meta.typedActions,   color: 'gray' },
          ]} />
        )}

        {/* Filtros */}
        <div className="px-4 pt-3 pb-2 border-b border-line bg-surface flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative max-w-md flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t('azp.searchPlaceholder')}
                aria-label={t('azp.searchAria')}
                className="w-full text-tiny pl-8 pr-8 py-1.5 rounded-md border border-line-strong bg-surface-alt text-fg placeholder-fg-subtle focus:outline-none focus:border-brand"
              />
              {busca && (
                <button onClick={() => setBusca('')} aria-label={t('action.clearSearch')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap rolagem-chips">
              <span className="text-2xs text-fg-muted uppercase tracking-wider">{t('label.sortBy')}</span>
              {(['size', 'roles', 'name'] as const).map((o) => (
                <button key={o} onClick={() => setOrdem(o)}
                  className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                    ordem === o
                      ? 'bg-accent/10 text-accent border-accent/60'
                      : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg'
                  }`}>
                  {o === 'size' ? t('sort.bySize') : o === 'roles' ? t('sort.byRoles') : t('sort.byName')}
                </button>
              ))}
            </div>

            <span className="text-2xs text-fg-muted ml-auto">
              {fmt(filtrados.length)} {t('noun.providers')}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto table-scroll-x">
          <table className="w-full text-tiny border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-alt border-b border-line-strong">
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider">Provider</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-fg-muted uppercase tracking-wider w-40">{t('count.actions')}</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-fg-muted uppercase tracking-wider w-20">{t('count.roles')}</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-fg-muted uppercase tracking-wider w-20">read</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-fg-muted uppercase tracking-wider w-20">write</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-fg-muted uppercase tracking-wider w-20">delete</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-fg-muted uppercase tracking-wider w-20">action</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <ProviderRow key={p.slug} p={p} maior={maior} />
              ))}
            </tbody>
          </table>

          {data && filtrados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-subtle">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-body">{t('azp.emptyProviders')}</p>
            </div>
          )}
        </div>

        <Pagination
          total={filtrados.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.providers"
        />

        {meta && (
          <div className="px-4 py-3 border-t border-line">
            {/*
              As duas ressalvas que este índice tem de carregar, em texto
              visível e não em tooltip:

              1. o universo vem da documentação, não da Management API — todo
                 número aqui é PISO (é o mesmo `≥` das telas de role);
              2. 158 é a contagem de prefixos com caixa diferente; distintos são
                 151, e é o distinto que vira rota.
            */}
            <p className="text-3xs text-fg-muted leading-relaxed">
              {t('azp.floorNote')}{' '}
              {t('azp.caseNote')
                .replace('{keys}', fmt(meta.universeKeys))
                .replace('{actions}', fmt(meta.universeActions))
                .replace('{raw}', fmt(meta.providersRaw))
                .replace('{providers}', fmt(meta.providers))}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

/**
 * Uma linha do índice.
 *
 * A barra de proporção é o único elemento gráfico: com 1.696 ações no maior
 * provider e 4 no menor, a coluna de número sozinha não deixa ver a escala. É
 * neutra (`bg-accent`), como manda a padronização de 06/08.
 */
function ProviderRow({ p, maior }: { p: AzureProviderSummary; maior: number }) {
  const t = useT()
  const fmt = useNumberFormat()
  const pct = Math.max(2, Math.round((p.actions / maior) * 100))

  return (
    <tr className="border-b border-line hover:bg-surface-alt/60 transition-colors group">
      <td className="px-4 py-2.5 align-middle">
        {/* Nome de item de lista em text-accent — padronização de 21/08. */}
        <Link href={`/azure-rbac/providers/${p.slug}`}
          className="font-mono text-3xs text-accent hover:underline break-all">
          {p.name}
        </Link>
      </td>
      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center justify-end gap-2">
          <span className="h-1 rounded-full bg-accent/60 shrink-0" style={{ width: `${pct}%`, maxWidth: '5rem' }} />
          <span className="text-tiny font-semibold tabular-nums text-fg">{fmt(p.actions)}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 align-middle text-right tabular-nums text-fg-muted">{fmt(p.roles)}</td>
      <td className="px-4 py-2.5 align-middle text-right tabular-nums text-fg-subtle">{fmt(p.read)}</td>
      <td className="px-4 py-2.5 align-middle text-right tabular-nums text-fg-subtle">{fmt(p.write)}</td>
      <td className="px-4 py-2.5 align-middle text-right tabular-nums text-fg-subtle">{fmt(p.delete)}</td>
      <td className="px-4 py-2.5 align-middle text-right tabular-nums text-fg-subtle">{fmt(p.action)}</td>
      <td className="px-2 py-2.5 align-middle">
        <Link href={`/azure-rbac/providers/${p.slug}`}
          aria-label={`${t('azp.openProvider')} ${p.name}`}
          className="text-fg-subtle group-hover:text-accent transition-colors inline-block">
          <ChevronRight size={15} />
        </Link>
      </td>
    </tr>
  )
}

export default function AzureProvidersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <AzureProvidersContent />
    </Suspense>
  )
}
