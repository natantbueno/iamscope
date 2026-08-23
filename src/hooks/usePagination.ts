'use client'

import { useEffect, useMemo, useState } from 'react'
import { pageSlice, pageCount, DEFAULT_PAGE_SIZE, type PageSize } from '@/components/Pagination'

/**
 * Estado de paginação para listas filtráveis.
 *
 * Resolve sozinho o bug clássico do modelo anterior: quando um filtro reduz a
 * lista e o usuário estava na página 12, a tela ficava vazia sem explicação.
 * Aqui, se a página atual passar do fim, ela volta para a última válida.
 *
 * @param items lista JÁ filtrada
 * @param initialSize tamanho inicial — use 'all' em telas com poucos itens
 */
export function usePagination<T>(items: T[], initialSize: PageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(initialSize)

  const total = items.length
  const last = pageCount(total, pageSize)

  // filtro encolheu a lista? traz a página para dentro do intervalo válido
  useEffect(() => {
    if (page > last) setPage(last)
  }, [page, last])

  const paginated = useMemo(() => {
    const { start, end } = pageSlice(total, Math.min(page, last), pageSize)
    return items.slice(start, end)
  }, [items, total, page, last, pageSize])

  return {
    paginated,
    page: Math.min(page, last),
    setPage,
    pageSize,
    setPageSize,
    total,
    /** Passe para o filtro: volta à página 1 quando o critério muda. */
    resetPage: () => setPage(1),
  }
}
