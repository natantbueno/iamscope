'use client'

import { useT } from '@/i18n/LanguageProvider'

/**
 * O selo Beta que acompanha o nome das quatro FERRAMENTAS.
 *
 * POR QUE O SELO VOLTOU
 *   A fase 1 do trabalho de UI removeu 11 selos BETA — estavam espalhados sem
 *   critério, inclusive em página de referência que não tinha nada de
 *   provisório. Este é o oposto: entra só nas quatro ferramentas, onde os
 *   primeiros usuários acharam buraco de verdade.
 *
 * O bloco expansível de limitações conhecidas que andava junto com o selo
 * (`BetaNotice`) foi removido a pedido — o selo por si só continua, a lista
 * de limitações não fica mais exposta na interface.
 */

export function BetaBadge() {
  const t = useT()
  return (
    <span className="text-micro font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.5 rounded shrink-0">
      {t('beta.label')}
    </span>
  )
}
