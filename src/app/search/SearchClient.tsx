'use client'

import { useEffect, useMemo, useState } from 'react'
import { SEARCH_INDEX_TOTAL } from '@/data/siteIndex'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ShieldAlert, ChevronRight, AlertTriangle } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import ExportButton from '@/components/ExportButton'
import ClassificationBadge from '@/components/ClassificationBadge'
import { useT } from '@/i18n/LanguageProvider'
import { type Indice, type Resultado, pareceAction, ranquear, carregarIndice } from '@/lib/searchIndex'

/**
 * Busca global — todas as roles e policies das 6 clouds num lugar só.
 *
 * PARA QUE SERVE
 *   A barra de busca do topo precisa de um destino quando a página atual não
 *   tem lista onde filtrar: home, SoD, Compare, Assessment, Permission Scope.
 *   Antes ela caía em `/` e não acontecia nada — a pessoa digitava e o site
 *   parecia ignorá-la.
 *
 * DE ONDE VÊM OS DADOS
 *   public/search-index.json, gerado por scripts/build-search-index.js e
 *   buscado sob demanda. Importar os 6 datasets aqui somaria 2,5 MB ao bundle
 *   desta página — que é justamente a mais acessada vinda da home.
 *
 * O QUE ESTÁ NO ÍNDICE
 *   Roles e policies (4.603). NÃO inclui actions nem permissions individuais:
 *   somadas passam de 30 mil e mudariam a natureza da busca. Para procurar uma
 *   permission específica existe o Permission Scope, que é a ferramenta certa
 *   — e a tela aponta para lá quando o termo parece um identificador de action.
 */

export default function SearchClient() {
  const t = useT()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [indice, setIndice] = useState<Indice | null>(null)
  const [erro, setErro] = useState(false)
  const [cloudAtiva, setCloudAtiva] = useState('all')
  const [soPrivilegiadas, setSoPriv] = useState(false)

  // Índice só é baixado quando há o que buscar — abrir /search sem termo não
  // deve custar 1,2 MB de download.
  useEffect(() => {
    if (!q.trim() || indice) return
    carregarIndice()
      .then((d) => { setIndice(d); setErro(false) })
      .catch(() => setErro(true))
  }, [q, indice])

  const resultados = useMemo<Resultado[]>(() => {
    const termo = q.trim().toLowerCase()
    if (!termo || !indice) return []
    return ranquear(indice, termo)
  }, [q, indice])

  const porCloud = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of resultados) m[r.cloud] = (m[r.cloud] ?? 0) + 1
    return m
  }, [resultados])

  const filtrados = useMemo(() => resultados.filter((r) => {
    if (cloudAtiva !== 'all' && r.cloud !== cloudAtiva) return false
    if (soPrivilegiadas && !r.privileged) return false
    return true
  }), [resultados, cloudAtiva, soPrivilegiadas])

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtrados)

  const carregando = !!q.trim() && !indice && !erro
  // O fallback só aparece enquanto o índice não chegou. Cravado, ele envelhece
  // em silêncio a cada recoleta — e envelheceu: ficou em 4603 enquanto o real
  // subia para 4633.
  const totalIndexado = indice
    ? Object.values(indice.clouds).reduce((a, c) => a + c.total, 0)
    : SEARCH_INDEX_TOTAL

  return (
    <AppShell
      headerTitle={t('search.title')}
      headerSub={q ? t('search.subWithQuery').replace('{n}', String(resultados.length)).replace('{q}', q)
                   : t('search.sub').replace('{n}', totalIndexado.toLocaleString('pt-BR'))}
      headerActions={filtrados.length > 0 ? (
        <ExportButton filename={`iamscope-busca-${q.replace(/\W+/g, '-')}`} data={filtrados.map((r) => ({
          cloud: indice?.clouds[r.cloud]?.label ?? r.cloud,
          name: r.name, id: r.id, tier: r.tierLabel, category: r.category,
          isPrivileged: r.privileged, description: r.description,
        }))} />
      ) : undefined}
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">

        {/* Sem termo: explica o que a página faz em vez de mostrar tela vazia */}
        {!q.trim() && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <Search size={30} className="mx-auto mb-3 text-fg-subtle opacity-40" />
              <p className="text-body text-fg-muted">{t('search.emptyTitle')}</p>
              <p className="text-tiny text-fg-subtle mt-2 leading-relaxed">
                {t('search.emptyHint').replace('{n}', totalIndexado.toLocaleString('pt-BR'))}
              </p>
            </div>
          </div>
        )}

        {carregando && (
          <div className="flex-1 flex items-center justify-center text-fg-subtle text-note">
            {t('state.loading')}
          </div>
        )}

        {erro && (
          <div className="flex-1 flex items-center justify-center text-red-400 text-note">
            {t('state.error')}
          </div>
        )}

        {q.trim() && indice && (
          <>
            {/* Filtros por cloud — com a contagem de cada uma no resultado atual */}
            <div className="px-4 pt-3 pb-2 border-b border-line bg-surface shrink-0 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 flex-wrap rolagem-chips">
                <ClassificationBadge size="sm" className="mr-1" />
                <button
                  onClick={() => { setCloudAtiva('all'); setPage(1) }}
                  className={`text-3xs px-2.5 py-1 rounded-full border transition-colors font-medium whitespace-nowrap ${
                    cloudAtiva === 'all'
                      ? 'bg-gray-700 text-fg border-gray-500'
                      : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg'
                  }`}>
                  {t('filter.all')} <span className="opacity-60">{resultados.length}</span>
                </button>

                {Object.entries(indice.clouds).map(([key, c]) => {
                  const n = porCloud[key] ?? 0
                  if (n === 0) return null
                  const ativa = cloudAtiva === key
                  return (
                    <button key={key}
                      onClick={() => { setCloudAtiva(ativa ? 'all' : key); setPage(1) }}
                      className="text-3xs px-2.5 py-1 rounded-full border transition-colors font-medium whitespace-nowrap inline-flex items-center gap-1.5"
                      style={ativa
                        ? { background: c.color + '30', color: c.text, borderColor: c.color + '90' }
                        : { color: '#93a3bd', borderColor: '#243049' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                      {c.label} <span className="opacity-60">{n}</span>
                    </button>
                  )
                })}

                <button
                  onClick={() => { setSoPriv((v) => !v); setPage(1) }}
                  className={`flex items-center gap-1 text-3xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ml-auto ${
                    soPrivilegiadas
                      ? 'bg-red-950 text-red-400 border-red-700 font-medium'
                      : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg'
                  }`}>
                  <ShieldAlert size={11} /> {t('filter.privileged')}
                </button>
              </div>

              {/* Termo parece uma action? O Permission Scope resolve melhor. */}
              {pareceAction(q.trim()) && (
                <p className="text-3xs text-fg-subtle">
                  {t('search.looksLikeAction')}{' '}
                  <Link href={`/permission-scope?q=${encodeURIComponent(q)}`} className="text-brand-onDark underline">
                    Permission Scope
                  </Link>
                  .
                </p>
              )}
            </div>

            {/* Resultados — lista, não tabela: os campos variam por cloud */}
            <div className="flex-1 overflow-auto table-scroll-x">
              {paginated.map((r) => {
                const c = indice.clouds[r.cloud]
                const tier = indice.tiers[r.cloud]?.[r.tier]
                return (
                  <Link key={`${r.cloud}-${r.slug}`} href={`${c.base}${r.slug}/`}
                    className="flex items-start gap-3 px-4 py-3 border-b border-line hover:bg-surface-alt/60 transition-colors group">
                    <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: c.color }} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-body font-medium" style={{ color: c.text }}>{r.name}</span>
                        {r.privileged && (
                          <ShieldAlert size={12} className="text-red-400 shrink-0" />
                        )}
                        {r.deprecated && (
                          <span className="inline-flex items-center gap-1 text-micro uppercase font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                            <AlertTriangle size={9} /> {t('filter.deprecated')}
                          </span>
                        )}
                      </div>

                      {r.description && (
                        <p className="text-tiny text-fg-muted leading-snug mt-0.5 line-clamp-2">{r.description}</p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <span className="text-micro uppercase tracking-wider text-fg-subtle">{c.label}</span>
                        {tier && (
                          <span className="text-micro font-semibold px-1.5 py-0.5 rounded-full border"
                            style={{ color: tier.color, borderColor: tier.color + '50', background: tier.color + '18' }}>
                            {tier.label}
                          </span>
                        )}
                        {r.category && (
                          <span className="text-micro text-fg-subtle">{r.category}</span>
                        )}
                        {r.id && (
                          <code className="text-micro font-mono text-fg-subtle truncate max-w-[280px]">{r.id}</code>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={15} className="text-fg-subtle group-hover:text-fg-muted transition-colors shrink-0 mt-1" />
                  </Link>
                )
              })}

              {filtrados.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <Search size={26} className="mb-3 text-fg-subtle opacity-40" />
                  <p className="text-body text-fg-muted">{t('search.noResults').replace('{q}', q)}</p>
                  <p className="text-tiny text-fg-subtle mt-2 max-w-sm leading-relaxed">
                    {t('search.noResultsHint')}
                  </p>
                </div>
              )}
            </div>

            <Pagination
              total={filtrados.length} page={page} pageSize={pageSize}
              onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.roles"
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
