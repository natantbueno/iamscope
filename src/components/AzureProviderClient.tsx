'use client'

// Detalhe de um resource provider do Azure — as ações dele, a descrição
// oficial da Microsoft, o plano declarado e QUAIS DAS 504 ROLES concedem cada
// uma.
//
// A pergunta que esta tela responde e nenhuma outra do site respondia: dada
// uma ação qualquer do Azure — inclusive uma que nenhuma role cita por
// extenso —, quem pode executá-la? A resposta exige expandir os wildcards das
// definições, e isso é feito em build time por
// scripts/build-azure-providers.js. Aqui só se lê o resultado.
//
// O layout espelha /aws/actions: tabela densa, linha que expande no clique,
// chips de quem concede dentro da linha expandida.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Search, ShieldOff, X } from 'lucide-react'

import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import ExportButton from '@/components/ExportButton'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { BackToList } from '@/components/RoleDetailHeader'
import {
  getAzureProvider,
  type AzureActionPlane,
  type AzureProviderAction,
  type AzureProviderDetail,
  type AzureProviderRole,
} from '@/lib/azureProviders'

const PLANOS: AzureActionPlane[] = ['control', 'data', 'both', 'undeclared']

/**
 * Chave de dicionário por plano.
 *
 * Mapa explícito, e não `t(\`plane.${p}\`)`: o TranslationKey é uma união de
 * literais, e a chave montada por template escapa da checagem — um rótulo
 * ausente só apareceria cru na tela.
 */
const PLANE_KEY: Record<AzureActionPlane, TranslationKey> = {
  control: 'plane.control',
  data: 'plane.data',
  both: 'plane.both',
  undeclared: 'plane.undeclared',
}

export default function AzureProviderClient({ slug }: { slug: string }) {
  const t = useT()
  const fmt = useNumberFormat()

  const [data, setData] = useState<AzureProviderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getAzureProvider(slug)
      .then((d) => { if (alive) { setData(d); setLoading(false) } })
      .catch(() => { if (alive) { setData(null); setLoading(false) } })
    return () => { alive = false }
  }, [slug])

  const [busca, setBusca] = useState('')
  const [verbo, setVerbo] = useState('all')
  const [plano, setPlano] = useState<AzureActionPlane | 'all'>('all')
  const [role, setRole] = useState('all')
  const [expandida, setExpandida] = useState<string | null>(null)

  const acoes = useMemo(() => data?.actions ?? [], [data])

  const verbos = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of acoes) {
      if (!a.verb) continue
      const v = a.verb.toLowerCase()
      m.set(v, (m.get(v) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [acoes])

  const roles = useMemo(
    () => [...(data?.roles ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  )

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return acoes.filter((a) => {
      if (verbo !== 'all' && a.verb.toLowerCase() !== verbo) return false
      if (plano !== 'all' && a.plane !== plano) return false
      if (role !== 'all'
        && !a.grantedBy.some((r) => r.slug === role)
        && !a.grantedAsData.some((r) => r.slug === role)) return false
      if (!q) return true
      return a.action.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    })
  }, [acoes, busca, verbo, plano, role])

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtradas)
  useEffect(() => { setPage(1) }, [busca, verbo, plano, role, setPage])

  const stats = useMemo(() => ({
    control: acoes.filter((a) => a.plane === 'control' || a.plane === 'both').length,
    data: acoes.filter((a) => a.plane === 'data' || a.plane === 'both').length,
  }), [acoes])

  if (loading) {
    return (
      <AppShell headerTitle={t('state.loading')} headerSub="Azure RBAC">
        <div className="flex-1 flex items-center justify-center text-fg-subtle text-body">{t('state.loading')}</div>
      </AppShell>
    )
  }

  if (!data) {
    return (
      <AppShell headerTitle={t('azp.notFound')} headerSub="Azure RBAC">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-fg-subtle mb-4">{t('azp.notFound')}</p>
            <Link href="/azure-rbac/providers" className="text-accent hover:underline text-body">
              ← {t('azp.backToProviders')}
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const temFiltro = busca !== '' || verbo !== 'all' || plano !== 'all' || role !== 'all'

  return (
    <AppShell
      // Nome de provider é nome próprio: fica em inglês nos dois idiomas.
      headerTitle={data.provider}
      headerSub={t('sub.azureProvider')}
      headerBack={<BackToList href="/azure-rbac/providers" />}
      headerActions={
        filtradas.length > 0
          ? <ExportButton filename={`azure-${data.slug}`} title={data.provider}
              data={filtradas.map((a) => ({
                action: a.action, verb: a.verb, plane: a.plane,
                description: a.description,
                grantedByCount: a.grantedBy.length,
                grantedAsDataCount: a.grantedAsData.length,
                excludedByCount: a.excludedBy.length,
                grantedBy: a.grantedBy.map((r) => r.name).join('; '),
              }))} />
          : undefined
      }
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        <StatsBar stats={[
          { label: t('count.actions'),   value: acoes.length,  color: 'blue' },
          { label: t('count.roles'),     value: roles.length,  color: 'gray' },
          { label: t('plane.control'),   value: stats.control, color: 'purple' },
          { label: t('plane.data'),      value: stats.data,    color: 'gray' },
        ]} />

        {/* Filtros */}
        <div className="px-4 pt-3 pb-2 border-b border-line bg-surface flex flex-col gap-2 shrink-0">
          <div className="relative max-w-2xl">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t('azp.searchAction')}
              aria-label={t('azp.searchAction')}
              className="w-full text-tiny pl-8 pr-8 py-1.5 rounded-md border border-line-strong bg-surface-alt text-fg placeholder-fg-subtle focus:outline-none focus:border-brand"
            />
            {busca && (
              <button onClick={() => setBusca('')} aria-label={t('action.clearSearch')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Verbo */}
          <div className="flex items-center gap-1.5 flex-wrap rolagem-chips">
            <span className="text-2xs text-fg-muted uppercase tracking-wider mr-1">{t('table.verb')}</span>
            <Chip ativo={verbo === 'all'} onClick={() => setVerbo('all')}>{t('filter.all')}</Chip>
            {verbos.map(([v, n]) => (
              <Chip key={v} ativo={verbo === v} onClick={() => setVerbo(verbo === v ? 'all' : v)}>
                {v} ({fmt(n)})
              </Chip>
            ))}
          </div>

          {/* Plano e role */}
          <div className="flex items-center gap-2 flex-wrap rolagem-chips">
            <span className="text-2xs text-fg-muted uppercase tracking-wider mr-1">{t('table.plane')}</span>
            <Chip ativo={plano === 'all'} onClick={() => setPlano('all')}>{t('filter.all')}</Chip>
            {PLANOS.map((p) => (
              <Chip key={p} ativo={plano === p} onClick={() => setPlano(plano === p ? 'all' : p)}>
                {t(PLANE_KEY[p])}
              </Chip>
            ))}

            <label className="flex items-center gap-1.5 ml-2">
              <span className="text-2xs text-fg-muted uppercase tracking-wider">{t('azp.grantedByLabel')}</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label={t('azp.grantedByLabel')}
                className="text-3xs bg-surface border border-line-strong rounded-md px-2 py-1 text-fg-muted focus:border-brand focus:outline-none max-w-[240px]"
              >
                <option value="all">{t('azp.anyRole')} ({roles.length})</option>
                {roles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
              </select>
            </label>

            {temFiltro && (
              <button
                onClick={() => { setBusca(''); setVerbo('all'); setPlano('all'); setRole('all') }}
                className="text-3xs px-2 py-1 rounded-md border border-line-strong text-fg-subtle hover:text-fg hover:border-gray-500 transition-colors"
              >
                {t('action.clearFilters')}
              </button>
            )}

            <span className="text-2xs text-fg-muted ml-auto">
              {fmt(filtradas.length)} {t('noun.actions')}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-tiny border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-alt border-b border-line-strong">
                <th className="px-4 py-2.5 w-6" />
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider">Action</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-24">{t('table.verb')}</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-36">{t('table.plane')}</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-fg-muted uppercase tracking-wider w-20">{t('count.roles')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((a) => (
                <ActionRows
                  key={a.action}
                  a={a}
                  aberta={expandida === a.action}
                  onToggle={() => setExpandida(expandida === a.action ? null : a.action)}
                />
              ))}
            </tbody>
          </table>

          {filtradas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-subtle">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-body">{t('azp.emptyActions')}</p>
            </div>
          )}
        </div>

        <Pagination
          total={filtradas.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.actions"
        />

        <div className="px-4 py-3 border-t border-line">
          <p className="text-3xs text-fg-muted leading-relaxed">{t('azp.planeNote')}</p>
        </div>
      </div>
    </AppShell>
  )
}

// ── Peças ───────────────────────────────────────────────────────────────────

function Chip({ ativo, onClick, children }: {
  ativo: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick}
      className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
        ativo
          ? 'bg-accent/10 text-accent border-accent/60'
          : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg'
      }`}>
      {children}
    </button>
  )
}

/**
 * O selo de plano.
 *
 * `undeclared` é o caso MAJORITÁRIO (~90%) e é dito com todas as letras, não
 * omitido: o store de descrições da Microsoft mistura control e data plane sem
 * marcar nenhuma chave, então o plano só é afirmado quando alguma definição de
 * role cita a ação por extenso. Um traço mudo aqui seria lido como "control".
 */
function SeloPlano({ plane }: { plane: AzureActionPlane }) {
  const t = useT()
  const rotulo = t(PLANE_KEY[plane])
  if (plane === 'undeclared') {
    return <span className="text-3xs text-fg-subtle italic">{rotulo}</span>
  }
  return (
    <span className="text-2xs px-2 py-0.5 rounded-full border font-medium text-fg-muted bg-surface-alt border-line-strong whitespace-nowrap">
      {rotulo}
    </span>
  )
}

function ActionRows({ a, aberta, onToggle }: {
  a: AzureProviderAction; aberta: boolean; onToggle: () => void
}) {
  const t = useT()
  const total = new Set([...a.grantedBy, ...a.grantedAsData].map((r) => r.slug)).size

  return (
    <>
      <tr
        className="border-b border-line hover:bg-surface-alt/60 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 align-top text-fg-subtle">
          {aberta ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </td>
        <td className="px-4 py-2.5 align-top">
          {/* Nome de item de lista em text-accent — padronização de 21/08. */}
          <code className="text-3xs font-mono text-accent break-all">{a.action}</code>
          {a.description && (
            <p className={`text-3xs text-fg-subtle leading-snug mt-0.5 ${aberta ? '' : 'line-clamp-1'}`}>
              {a.description}
            </p>
          )}
        </td>
        <td className="px-4 py-2.5 align-top">
          <code className="text-3xs font-mono text-fg-subtle">{a.verb}</code>
        </td>
        <td className="px-4 py-2.5 align-top"><SeloPlano plane={a.plane} /></td>
        <td className="px-4 py-2.5 align-top text-right tabular-nums text-fg-muted">{total}</td>
      </tr>

      {aberta && (
        <tr className="border-b border-line bg-surface/60">
          <td colSpan={5} className="px-8 py-3 space-y-3">
            <ListaDeRoles titulo={t('azp.grantedControl')} roles={a.grantedBy} />
            {a.grantedAsData.length > 0 && (
              <ListaDeRoles titulo={t('azp.grantedData')} roles={a.grantedAsData} />
            )}
            {/*
              A negação explícita não some da tela: uma role com a ação em
              NotActions responde "esta aqui NÃO pode" — que vale tanto quanto
              a lista de quem pode. É o mesmo princípio do deniedBy do
              Permission Scope.
            */}
            {a.excludedBy.length > 0 && (
              <ListaDeRoles titulo={t('azp.deniedBy')} roles={a.excludedBy} negativa />
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function ListaDeRoles({ titulo, roles, negativa = false }: {
  titulo: string; roles: AzureProviderRole[]; negativa?: boolean
}) {
  const t = useT()
  return (
    <div>
      <p className="text-2xs text-fg-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {negativa && <ShieldOff size={11} className="text-danger" />}
        {titulo} ({roles.length})
      </p>
      {roles.length === 0 ? (
        <p className="text-3xs text-fg-subtle italic">{t('azp.noRole')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <Link
              key={r.slug}
              href={`/azure-rbac/roles/${r.slug}`}
              onClick={(e) => e.stopPropagation()}
              title={`${r.name} · ${r.tier}`}
              className={`text-2xs px-2 py-0.5 rounded border transition-colors hover:border-gray-500 ${
                negativa
                  ? 'text-danger bg-surface-alt border-line-strong'
                  : 'text-fg-muted bg-surface-alt border-line-strong hover:text-fg'
              }`}
            >
              {r.name}
              {/* Estado semântico com RÓTULO, nunca cor sozinha — mesma
                  marcação de /aws/actions e /gcp/permissions. */}
              {r.isPrivileged && (
                <span className="ml-1.5 text-micro uppercase font-bold text-danger">{t('azp.priv')}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
