'use client'

// Lê e escreve o parâmetro `q` da URL da própria página — sempre a mesma
// rota (router.replace, sem histórico extra), sempre preservando os outros
// parâmetros. É o que sobrou do "já estou nesta página" do antigo
// GlobalSearch.tsx, agora usado pelo InlineListFilter de cada tabela.
//
// Não guarda estado local: lê `searchParams` a cada render, então nunca
// diverge da URL — a causa da maioria dos campos de busca por página que
// ficavam dessincronizados entre si.

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function useInlineQuery(pathname: string, param = 'q') {
  const router = useRouter()
  const searchParams = useSearchParams()
  const value = searchParams.get(param) ?? ''

  const setValue = useCallback((v: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (v) params.set(param, v)
    else params.delete(param)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [router, searchParams, pathname, param])

  return [value, setValue] as const
}
