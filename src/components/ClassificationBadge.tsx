'use client'

import { Info } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'

/**
 * Marca visualmente que um tier NÃO vem do provedor.
 *
 * POR QUE ISSO EXISTE
 *   Tier e categoria são classificação editorial do IAM Scope em 5 das 6
 *   clouds. Até 08/2026 esse aviso vivia só no rodapé da sidebar — invisível
 *   para quem chega por busca direto numa página de detalhe, que é o caminho
 *   mais comum num site de referência. Exibir "Tier 0" ao lado de um nome
 *   oficial da Microsoft, sem qualificar, faz o leitor supor que a Microsoft
 *   classificou aquilo. É o maior risco de credibilidade do projeto.
 *
 * DUAS PROCEDÊNCIAS, PORQUE NÃO SÃO A MESMA COISA
 *   - 'iamscope' : derivamos das permissões oficiais. É nosso.
 *   - 'entraops' : vem do EntraOps / AzurePrivilegedIAM, que segue o Enterprise
 *                  Access Model da Microsoft. Não é nosso, mas também não é um
 *                  rótulo publicado pela Microsoft — a distinção importa.
 *
 * O `title` carrega a explicação longa. Tooltip nativo é proposital: funciona
 * sem JS, sem biblioteca e sem quebrar no export estático.
 */
export default function ClassificationBadge({
  source = 'iamscope',
  size = 'md',
  className = '',
}: {
  source?: 'iamscope' | 'entraops'
  /** 'sm' para caber em cabeçalho de tabela e linha de filtro. */
  size?: 'sm' | 'md'
  className?: string
}) {
  const t = useT()
  const ehNosso = source === 'iamscope'

  const label = ehNosso ? t('origin.badgeEditorial') : t('origin.badgeEntraOps')
  const tip = ehNosso ? t('origin.tipEditorial') : t('origin.tipEntraOps')

  const dims = size === 'sm'
    ? 'text-micro px-1.5 py-0.5 gap-1'
    : 'text-2xs px-2 py-0.5 gap-1.5'

  return (
    <span
      title={tip}
      aria-label={tip}
      className={`inline-flex items-center rounded-full border whitespace-nowrap cursor-help
                  border-violet-200 dark:border-violet-800/60
                  bg-violet-50 dark:bg-violet-950/50
                  text-violet-700 dark:text-violet-300
                  font-medium ${dims} ${className}`}
    >
      <Info size={size === 'sm' ? 9 : 11} className="shrink-0 opacity-70" />
      {label}
    </span>
  )
}
