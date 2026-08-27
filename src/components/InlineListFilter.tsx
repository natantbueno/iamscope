'use client'

// Filtro embutido na linha de chips de uma tabela — sempre filtra a lista que
// já está na tela, em linha, nunca navega. É o par da paleta de comando
// (CommandPalette.tsx), que faz o oposto: sempre cruza as 6 clouds e sempre
// navega. As duas existiam misturadas numa única caixa (GlobalSearch.tsx),
// que decidia o comportamento pela rota — esta separação tira essa ambiguidade.

import { Search, X } from 'lucide-react'

// Sem margem própria: quem usa decide como empurrar para a direita na linha
// de chips (geralmente junto com a contagem, `<div className="ml-auto ...">`).
export default function InlineListFilter({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative w-36 shrink-0 transition-[width] focus-within:w-56">
      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Filtrar...'}
        className="w-full text-3xs pl-7 pr-6 py-1 border border-line-strong rounded-full bg-surface-alt text-fg placeholder-fg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar filtro"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg p-0.5"
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}
