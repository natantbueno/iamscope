'use client'

// Tabela de permissões com busca — o mesmo padrão do bloco "Permissões completas"
// da página de role do Entra ID, generalizado para as 6 clouds.
//
// Cada cloud descreve a permissão de um jeito diferente (action, permission,
// verb action, privilege...) e com metadados diferentes (tier, service, verb,
// type). Em vez de replicar seis variações, a página que usa este componente
// entrega as linhas já enriquecidas e diz quais colunas exibir.
//
// Recursos: busca em todas as colunas, chips de filtro com contagem sobre uma
// coluna, cabeçalho fixo, copiar por linha, exportar e contador "X de Y".

import { useState, useMemo } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { Search, Copy, CheckCheck, X } from 'lucide-react'
import Pagination from '@/components/Pagination'
import type { TranslationKey } from '@/i18n/dictionary'
import { usePagination } from '@/hooks/usePagination'
import ExportButton from './ExportButton'

export interface PermissionRow {
  /** Sempre presente — a permissão em si, exibida em fonte mono na 1ª coluna. */
  permission: string
  [key: string]: string
}

export interface PermissionColumn {
  key: string
  label: string
  /** Renderiza em fonte monoespaçada (para strings técnicas). */
  mono?: boolean
  /** Renderiza como pílula colorida (usa `colors` quando disponível). */
  badge?: boolean
  /** Largura fixa da coluna, ex.: 'w-36'. */
  width?: string
}

interface PermissionsTableProps {
  rows: PermissionRow[]
  /** A primeira coluna deve ser a da permissão. */
  columns: PermissionColumn[]
  /** Coluna usada para os chips de filtro rápido (ex.: 'tier', 'type'). */
  filterKey?: string
  /** Cores por valor da coluna de filtro e das colunas badge. */
  colors?: Record<string, string>
  /** Cor de destaque da cloud (usada na permissão e no foco da busca). */
  accent: string
  /** Nome base do arquivo exportado. */
  filename: string
  /** Rótulo do que está sendo listado, ex.: 'actions', 'permissions'. */
  /** Chave do dicionário (ex.: 'noun.permissions') — acompanha o idioma. */
  noun?: TranslationKey
  /** Também chave do dicionário — o placeholder é texto de tela como qualquer outro. */
  searchPlaceholder?: TranslationKey
}

export default function PermissionsTable({
  rows, columns, filterKey, colors = {}, accent, filename,
  noun = 'noun.permissions', searchPlaceholder = 'ph.filterGeneric',
}: PermissionsTableProps) {
  const t = useT()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [copied, setCopied] = useState<string | null>(null)

  // Valores distintos da coluna de filtro, com contagem — vira chip.
  const filterOptions = useMemo(() => {
    if (!filterKey) return []
    const counts = new Map<string, number>()
    for (const r of rows) {
      const v = r[filterKey]
      if (!v) continue
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows, filterKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filterKey && activeFilter !== 'all' && r[filterKey] !== activeFilter) return false
      if (!q) return true
      return columns.some((c) => (r[c.key] ?? '').toLowerCase().includes(q))
    })
  }, [rows, columns, search, filterKey, activeFilter])

  const copy = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(value)
    setTimeout(() => setCopied(null), 1500)
  }

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtered)


  return (
    <div>
      {/* Controles */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(searchPlaceholder)}
            aria-label={t(searchPlaceholder)}
            className="w-full text-tiny pl-8 pr-8 py-1.5 border border-surface-border dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1"
            style={{ ['--tw-ring-color' as string]: accent }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label={t('action.clearSearch')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300">
              <X size={13} />
            </button>
          )}
        </div>

        {filterOptions.length > 1 && (
          <>
            <button onClick={() => setActiveFilter('all')}
              className={`text-3xs px-2.5 py-1 rounded-full border transition-colors ${
                activeFilter === 'all'
                  ? 'font-medium text-white border-transparent'
                  : 'text-fg-muted border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              style={activeFilter === 'all' ? { background: accent, borderColor: accent } : {}}>
              Todas ({rows.length})
            </button>
            {filterOptions.map(([value, n]) => {
              const active = activeFilter === value
              const c = colors[value] ?? accent
              return (
                <button key={value} onClick={() => setActiveFilter(active ? 'all' : value)}
                  className={`text-3xs px-2.5 py-1 rounded-full border transition-colors ${
                    active ? 'font-medium' : 'text-fg-muted border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  style={active ? { background: c + '20', color: c, borderColor: c + '80' } : {}}>
                  {value} ({n})
                </button>
              )
            })}
          </>
        )}

        <ExportButton filename={filename} data={filtered} />
      </div>

      {/* Tabela */}
      <div className="border border-surface-border dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-tiny border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
                {columns.map((c) => (
                  <th key={c.key}
                    className={`text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 ${c.width ?? ''}`}>
                    {c.label}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-fg-subtle text-body">
                    Nenhum resultado para “{search}”.
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={row.permission + i}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                    {columns.map((c, ci) => {
                      const v = row[c.key] ?? ''
                      const isFirst = ci === 0
                      if (c.badge && v) {
                        const col = colors[v] ?? accent
                        return (
                          <td key={c.key} className="px-3 py-2 align-top">
                            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                              style={{ color: col, borderColor: col + '50', background: col + '15' }}>
                              {v}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={c.key} className="px-3 py-2 align-top">
                          <span
                            className={`${c.mono || isFirst ? 'font-mono text-3xs break-all' : 'text-3xs'} ${
                              isFirst ? 'font-medium' : 'text-fg-muted'
                            } leading-snug`}
                            style={isFirst ? { color: accent } : undefined}
                          >
                            {v || '—'}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 align-top">
                      <button onClick={() => copy(row.permission)} title={t('action.copy')}
                        className="opacity-0 group-hover:opacity-100 text-fg-muted dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity">
                        {copied === row.permission
                          ? <CheckCheck size={11} className="text-green-600 opacity-100" />
                          : <Copy size={11} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        total={filtered.length} page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize}
        accent={accent} noun={noun}
      />
    </div>
  )
}
