'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { DICTIONARY, type TranslationKey } from './dictionary'

/**
 * Idioma da INTERFACE. Os dados oficiais nunca são traduzidos —
 * ver docs/ADR-001-idioma-dos-dados.md para o porquê (resumo: as traduções da
 * AWS e da Microsoft são feitas por máquina, e a versão pt-BR do Azure chega a
 * traduzir o próprio identificador da action, virando "leitura" onde o Azure
 * publica "read").
 *
 * POR QUE NÃO next-intl COM ROTAS /pt E /en
 *   O site usa `output: 'export'`. Rotear por idioma dobraria a árvore estática
 *   — só o GCP tem 2.381 páginas de detalhe, então seriam ~4.800 só ali. A
 *   troca acontece no cliente, sem mudar a URL, e a escolha fica no
 *   localStorage. Custo: nenhum. Perda: a URL não carrega o idioma, então um
 *   link compartilhado abre no idioma de quem recebe — aceitável para uma
 *   ferramenta de consulta.
 */

export type Lang = 'pt' | 'en'

const STORAGE_KEY = 'iamscope.lang'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** Traduz uma chave. Sem tradução, devolve a própria chave — falha visível. */
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt',
  setLang: () => {},
  t: (k) => k,
})

function detectInitial(): Lang {
  if (typeof window === 'undefined') return 'pt'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'pt' || saved === 'en') return saved
  // Sem escolha salva, segue o navegador — quem não é pt cai em inglês.
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Começa sempre em 'pt' para o HTML do servidor e do cliente baterem; a
  // preferência real é aplicada no efeito, evitando erro de hidratação.
  const [lang, setLangState] = useState<Lang>('pt')

  useEffect(() => {
    const initial = detectInitial()
    if (initial !== 'pt') setLangState(initial)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { window.localStorage.setItem(STORAGE_KEY, l) } catch { /* modo privado */ }
  }, [])

  const t = useCallback((key: TranslationKey) => {
    const entry = DICTIONARY[key]
    if (!entry) return key
    return entry[lang] || entry.pt || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

/** Atalho para quem só precisa traduzir. */
export function useT() {
  return useContext(LanguageContext).t
}
