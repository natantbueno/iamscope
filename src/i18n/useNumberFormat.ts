'use client'

import { useCallback } from 'react'
import { useLanguage } from './LanguageProvider'

/**
 * Formata número no separador do idioma escolhido.
 *
 * POR QUE EXISTE
 *   O código tinha `toLocaleString('pt-BR')` fixo em 13 lugares. Com a
 *   interface em inglês isso imprime `2.381` onde o leitor de inglês lê dois
 *   mil trezentos e oitenta e um como "2,381" — e `1.700` chega a parecer
 *   "um vírgula sete". Separador de milhar é parte da interface, não do dado.
 */
export function useNumberFormat() {
  const { lang } = useLanguage()
  return useCallback(
    (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US'),
    [lang],
  )
}
