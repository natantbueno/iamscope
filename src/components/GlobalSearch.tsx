'use client'

// Busca global, com estado na URL (?q=).
//
// Ficava na sidebar; foi movida para logo abaixo do menu de clouds em 30/07,
// para ganhar largura e ficar no caminho natural do olho — na sidebar ela
// competia com a navegação e sumia quando o menu era recolhido.
//
// Por que URL e não useState no AppShell:
// - O AppShell é instanciado por página; qualquer navegação o remonta e
//   destruía o estado local da busca (campo limpava sozinho).
// - Com o valor derivado de ?q=, o campo sobrevive à navegação causada pela
//   própria busca, a URL fica compartilhável e mudar filtros na mesma página
//   (que preservam os params) não reseta a busca.
//
// Comportamento:
// - Digitando já na página de listagem → router.replace no mesmo pathname
//   (sem remontagem, sem perda de foco, sem poluir o histórico).
// - Digitando em outra página → router.push para a listagem com ?q= e o foco
//   é restaurado após a remontagem (flag em escopo de módulo, que sobrevive
//   à navegação client-side).
// - Navegar para outra seção sem ?q= → campo limpo (reset intencional).

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

// Sobrevive à remontagem do componente na navegação client-side (SPA).
let pendingSearchFocus = false

const INPUT_CLASSES =
  'w-full text-tiny pl-8 pr-3 py-1.5 border border-line-strong rounded-md bg-surface-alt text-fg placeholder-fg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand'

function normalizePath(p: string): string {
  const trimmed = p.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

function GlobalSearchInner({ basePath }: { basePath: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''

  const [value, setValue] = useState(urlQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza com a URL quando o q muda por navegação externa (ex.: usuário
  // foi para outra seção, limpou filtros, usou voltar/avançar). Não sobrescreve
  // enquanto o usuário está digitando (input focado) para não perder teclas
  // entre o replace e a atualização assíncrona de searchParams.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setValue(urlQuery)
  }, [urlQuery, pathname])

  // Restaura o foco após a remontagem causada pela navegação da própria busca.
  useEffect(() => {
    if (pendingSearchFocus && inputRef.current) {
      pendingSearchFocus = false
      const el = inputRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [])

  const handleChange = (val: string) => {
    setValue(val)

    if (normalizePath(pathname) === normalizePath(basePath)) {
      // Já na listagem: atualiza q preservando os demais filtros da página.
      const params = new URLSearchParams(searchParams.toString())
      if (val) params.set('q', val)
      else params.delete('q')
      const qs = params.toString()
      router.replace(`${basePath}${qs ? `?${qs}` : ''}`, { scroll: false })
    } else if (val) {
      // Em outra página: navega para a listagem da plataforma/view atual.
      pendingSearchFocus = true
      router.push(`${basePath}?q=${encodeURIComponent(val)}`, { scroll: false })
    }
  }

  return (
    <div className="relative">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Buscar..."
        className={INPUT_CLASSES}
      />
    </div>
  )
}

// Fallback estático com o mesmo layout — evita layout shift e satisfaz a
// exigência do Next de Suspense em volta de useSearchParams no export estático.
function SearchFallback() {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
      <input type="text" disabled placeholder="Buscar..." className={INPUT_CLASSES} />
    </div>
  )
}

export default function GlobalSearch({ basePath }: { basePath: string }) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <GlobalSearchInner basePath={basePath} />
    </Suspense>
  )
}
