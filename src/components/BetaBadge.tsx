'use client'

import { useState } from 'react'
import { Info, ChevronDown } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'

/**
 * O selo Beta e a lista de limitações que anda junto com ele.
 *
 * POR QUE O SELO VOLTOU
 *   A fase 1 do trabalho de UI removeu 11 selos BETA — estavam espalhados sem
 *   critério, inclusive em página de referência que não tinha nada de
 *   provisório. Estes são o oposto: entram só nas quatro FERRAMENTAS, onde os
 *   primeiros usuários acharam buraco de verdade.
 *
 *   E a lista é o ponto, não o selo. Selo sozinho é desculpa genérica; selo com
 *   "hoje isto não funciona, e é exatamente isto" é informação que a pessoa usa
 *   antes de citar o resultado num relatório de auditoria.
 */

export function BetaBadge() {
  const t = useT()
  return (
    <span className="text-micro font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.5 rounded shrink-0">
      {t('beta.label')}
    </span>
  )
}

/**
 * As limitações nascem RECOLHIDAS: quem já sabe o que a ferramenta faz não
 * tropeça num bloco de avisos toda vez que abre a página, e quem estranhou um
 * resultado acha a explicação sem sair dali. Mesmo desenho do "Como isso
 * funciona" do Evaluator e do Advisor.
 */
export function BetaNotice({ items }: { items: TranslationKey[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div className="text-tiny">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg transition-colors"
      >
        <Info size={13} />
        {t('beta.knownLimits')}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-fg-muted max-w-3xl">
          {items.map((k) => (
            <li key={k} className="flex items-start gap-1.5 leading-relaxed">
              <span className="text-fg-subtle mt-0.5 shrink-0">&#9656;</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
