'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useT, useLanguage } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'

/**
 * Paginação padrão do site.
 *
 * Substitui o "Carregar mais" que existia em 8 telas. O problema do modelo
 * anterior: para chegar à última permissão de um conjunto de 13.590 era preciso
 * clicar 136 vezes, e não havia como saber em que ponto da lista você estava.
 *
 * A opção "Tudo" existe porque boa parte das telas tem poucas centenas de itens
 * e paginar ali só atrapalha. Em conjuntos grandes ela continua disponível, mas
 * avisamos: renderizar 13 mil linhas trava o navegador por alguns segundos.
 */

export const PAGE_SIZES = [20, 25, 50, 100, 'all'] as const
export type PageSize = (typeof PAGE_SIZES)[number]

/** Padrão do site. Telas com poucos itens podem passar 'all'. */
export const DEFAULT_PAGE_SIZE: PageSize = 20

/** Acima disto, "Tudo" ganha um aviso — a renderização fica pesada. */
const HEAVY_THRESHOLD = 2000

interface PaginationProps {
  total: number
  page: number
  pageSize: PageSize
  onPageChange: (page: number) => void
  onPageSizeChange: (size: PageSize) => void
  /** Cor de destaque da cloud (ex.: '#4285f4'). */
  accent: string
  /**
   * Chave do dicionário para o que está sendo paginado ('noun.roles',
   * 'noun.permissions'...). É chave e não texto solto justamente para o rótulo
   * acompanhar o idioma da interface.
   */
  noun?: TranslationKey
}

/** Índices de corte para o slice — mantém a conta num lugar só. */
export function pageSlice(total: number, page: number, size: PageSize) {
  if (size === 'all') return { start: 0, end: total }
  const start = (page - 1) * size
  return { start, end: Math.min(start + size, total) }
}

export function pageCount(total: number, size: PageSize) {
  if (size === 'all') return 1
  return Math.max(1, Math.ceil(total / size))
}

/** Janela de páginas com elipses: 1 … 4 5 [6] 7 8 … 20 */
function buildPages(current: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(last - 1, current + 1)
  if (from > 2) out.push('…')
  for (let i = from; i <= to; i++) out.push(i)
  if (to < last - 1) out.push('…')
  out.push(last)
  return out
}

export default function Pagination({
  total, page, pageSize, onPageChange, onPageSizeChange, accent, noun = 'noun.items',
}: PaginationProps) {
  const t = useT()
  const { lang } = useLanguage()
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US'
  const n = (v: number) => v.toLocaleString(locale)

  const last = pageCount(total, pageSize)
  const { start, end } = pageSlice(total, page, pageSize)
  const pages = buildPages(page, last)

  const navBtn = 'p-1.5 rounded-md border border-surface-border dark:border-gray-700 text-fg-muted '
    + 'dark:text-gray-400 enabled:hover:bg-gray-100 dark:enabled:hover:bg-gray-800 '
    + 'disabled:opacity-30 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-t border-surface-border
                    dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">

      <div className="flex items-center gap-1.5">
        <span className="text-3xs text-fg-subtle uppercase tracking-wider">{t('pagination.perPage')}</span>
        <select
          value={String(pageSize)}
          onChange={(e) => {
            const v = e.target.value
            onPageSizeChange(v === 'all' ? 'all' : (Number(v) as PageSize))
            onPageChange(1)
          }}
          className="text-tiny bg-white dark:bg-gray-800 border border-surface-border dark:border-gray-700
                     rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none"
          style={{ borderColor: undefined }}
        >
          {PAGE_SIZES.map((s) => (
            <option key={String(s)} value={String(s)}>{s === 'all' ? t('pagination.all') : s}</option>
          ))}
        </select>
      </div>

      <span className="text-3xs text-fg-subtle">
        {total === 0
          ? t('pagination.empty')
          : `${n(start + 1)}–${n(end)} ${t('pagination.of')} ${n(total)} ${t(noun)}`}
      </span>

      {pageSize === 'all' && total > HEAVY_THRESHOLD && (
        <span className="text-3xs text-amber-700 dark:text-amber-400">
          {n(total)} {t('pagination.heavy')}
        </span>
      )}

      {last > 1 && (
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => onPageChange(1)} disabled={page === 1}
            className={navBtn} aria-label={t('pagination.first')}><ChevronsLeft size={13} /></button>
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
            className={navBtn} aria-label={t('pagination.prev')}><ChevronLeft size={13} /></button>

          {pages.map((p, i) => p === '…' ? (
            <span key={`gap-${i}`} className="text-3xs text-fg-subtle px-1">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="text-tiny min-w-[26px] px-1.5 py-1 rounded-md border transition-colors"
              style={p === page
                ? { background: accent, borderColor: accent, color: '#fff' }
                : { borderColor: 'transparent', color: '#9ca3af' }}
            >
              {p}
            </button>
          ))}

          <button onClick={() => onPageChange(page + 1)} disabled={page === last}
            className={navBtn} aria-label={t('pagination.next')}><ChevronRight size={13} /></button>
          <button onClick={() => onPageChange(last)} disabled={page === last}
            className={navBtn} aria-label={t('pagination.last')}><ChevronsRight size={13} /></button>
        </div>
      )}
    </div>
  )
}
