'use client'

import { Suspense, useMemo, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatsBar from '@/components/StatsBar'
import { GWS_PRIVILEGES, GWS_SOURCES } from '@/data/googleWorkspace'
import { Info } from 'lucide-react'
import ExportButton from '@/components/ExportButton'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'

/**
 * Catálogo de privilégios do Admin console do Google Workspace.
 *
 * ANTES ESTA PÁGINA ERA DERIVADA DAS ROLES
 *   Ela juntava os `apiPrivileges` de cada role e apresentava o resultado como
 *   catálogo. Aqueles nomes não vinham do Google — 79 dos 84 eram inventados.
 *   Agora a página lê o catálogo oficial da página "Administrator privilege
 *   definitions", que é a lista que o Admin console realmente mostra.
 *
 * O QUE NÃO DÁ PARA MOSTRAR
 *   Quais roles concedem cada privilégio. O Google não publica esse mapa; ele
 *   só existe via privileges.list do Admin SDK, que exige OAuth no tenant.
 *   A página declara a lacuna em vez de preencher com suposição.
 */

const SECOES = ['Admin settings', 'Services'] as const

function GwsPrivilegesContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [secao, setSecao] = useState<string>('all')
  const [grupo, setGrupo] = useState<string>('all')

  const grupos = useMemo(
    () => [...new Set(GWS_PRIVILEGES.filter((p) => secao === 'all' || p.section === secao).map((p) => p.group))].sort(),
    [secao],
  )

  const filtered = useMemo(() => GWS_PRIVILEGES.filter((p) => {
    if (secao !== 'all' && p.section !== secao) return false
    if (grupo !== 'all' && p.group !== grupo) return false
    if (q) {
      const s = q.toLowerCase()
      if (!p.name.toLowerCase().includes(s) && !p.description.toLowerCase().includes(s)) return false
    }
    return true
  }), [secao, grupo, q])

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtered)

  const stats = useMemo(() => ({
    total:   GWS_PRIVILEGES.length,
    grupos:  GWS_PRIVILEGES.filter((p) => !p.isChild).length,
    filhos:  GWS_PRIVILEGES.filter((p) => p.isChild).length,
    admin:   GWS_PRIVILEGES.filter((p) => p.section === 'Admin settings').length,
    servicos: GWS_PRIVILEGES.filter((p) => p.section === 'Services').length,
  }), [])

  const fonte = GWS_SOURCES.find((s) => s.id === 'privilege-definitions')

  return (
    <AppShell
      headerTitle="Google Workspace — Admin Privileges"
      headerSub={t('sub.gwsPrivileges')}
      headerActions={<ExportButton filename="google-workspace-privileges" data={filtered.map((p) => ({
        privilege: p.name, section: p.section, group: p.group, description: p.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: t('count.total'), value: stats.total,    color: 'green' },
          { label: t('label.groups'), value: stats.grupos,   color: 'green' },
          { label: t('label.subPrivileges'), value: stats.filhos,   color: 'gray' },
          { label: 'Admin settings', value: stats.admin,    color: 'gray' },
          { label: 'Services',       value: stats.servicos, color: 'gray' },
        ]} />

        {/*
          Aviso de lacuna, no topo e não no rodapé: sem ele o usuário procuraria
          a coluna "quais roles concedem" e concluiria que o site está quebrado.
        */}
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <Info size={13} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-3xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Esta é a lista de privilégios que o Admin console apresenta, no texto oficial do Google.
            O <strong>mapa de qual role concede qual privilégio não é publicado</strong> — só existe
            via <code className="font-mono">privileges.list</code> do Admin SDK, que exige OAuth no
            seu tenant. Por isso não há coluna de roles aqui.
            {fonte && (
              <>
                {' '}
                <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="underline">
                  Fonte oficial
                </a>
                {' '}(doc de {fonte.docLastUpdated}).
              </>
            )}
          </p>
        </div>

        {/* Filtros */}
        <div className="px-4 pt-3 pb-2 border-b border-line bg-surface flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xs text-fg-muted uppercase tracking-wider">Seção:</span>
            <button onClick={() => { setSecao('all'); setGrupo('all'); setPage(1) }}
              className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${secao === 'all' ? 'bg-csp-gws text-white border-csp-gws' : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg-muted'}`}>
              Todas
            </button>
            {SECOES.map((s) => (
              <button key={s} onClick={() => { setSecao(secao === s ? 'all' : s); setGrupo('all'); setPage(1) }}
                className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${secao === s ? 'bg-csp-gws text-white border-csp-gws' : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg-muted'}`}>
                {s}
              </button>
            ))}
            <span className="ml-auto text-2xs text-fg-muted">{filtered.length} privilégios</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs text-fg-muted uppercase tracking-wider">Grupo:</span>
            <button onClick={() => { setGrupo('all'); setPage(1) }}
              className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${grupo === 'all' ? 'bg-csp-gws text-white border-csp-gws' : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg-muted'}`}>
              Todos
            </button>
            {grupos.map((g) => (
              <button key={g} onClick={() => { setGrupo(grupo === g ? 'all' : g); setPage(1) }}
                className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors ${grupo === g ? 'bg-csp-gws text-white border-csp-gws' : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg-muted'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-tiny border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-alt border-b border-line-strong">
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-80">Privilégio</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider w-36">Seção</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider">{t('table.description')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.slug} className="border-b border-line hover:bg-surface-alt/60 transition-colors">
                  <td className="px-4 py-2.5 align-top">
                    {/* Sub-privilégio recuado: espelha a hierarquia do Admin console */}
                    <span className={p.isChild ? 'pl-4 text-fg-muted' : 'font-medium text-csp-gws-onLight dark:text-csp-gws-onDark'}>
                      {p.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <span className="text-2xs text-fg-subtle bg-surface-alt border border-line-strong px-2 py-0.5 rounded-full whitespace-nowrap">
                      {p.section}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 align-top text-fg-muted text-3xs leading-relaxed">
                    {p.description || <span className="text-fg-subtle italic">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-48 text-fg-muted text-note">{t('empty.privileges')}</div>
          )}
        </div>
        <Pagination
          total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.privileges"
        />
      </div>
    </AppShell>
  )
}

export default function GwsPrivilegesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <GwsPrivilegesContent />
    </Suspense>
  )
}
