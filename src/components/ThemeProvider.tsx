'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// -----------------------------------------------------------------------------
// Tema claro/escuro.
//
// Antes este arquivo era um stub: devolvia 'dark' fixo, `toggleTheme` era um
// no-op e o <html> entrava com a classe `dark` cravada. O tema claro existia só
// no papel — metade de cada `className` do projeto carregava um par `x dark:x`
// cujo lado claro nunca era avaliado nem testado, e que já tinha apodrecido em
// vários pontos (texto branco sobre card branco, campo de busca só com cores
// escuras).
//
// Como funciona agora:
//   1. O script inline em app/layout.tsx decide o tema e escreve a classe no
//      <html> ANTES da primeira pintura. É ele que evita o flash.
//   2. Este provider só espelha, no estado do React, o que o script já decidiu.
//      Por isso o valor inicial é 'dark' e a sincronia acontece no primeiro
//      efeito: o HTML estático sempre sai com `dark`, e renderizar diferente
//      disso na hidratação quebraria o casamento com o servidor.
//   3. A escolha explícita vai para o localStorage. Sem escolha explícita, o
//      tema segue a preferência do sistema, inclusive quando ela muda com a
//      página aberta.
// -----------------------------------------------------------------------------

export type Theme = 'light' | 'dark'

/** Mesma chave lida pelo script inline do layout — mudar aqui exige mudar lá. */
export const THEME_STORAGE_KEY = 'iam-scope-theme'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.documentElement.style.colorScheme = t
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  // Espelha o que o script inline já aplicou. Não aplica nada: só lê.
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    apply(t)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t)
    } catch {
      // Modo privado / storage bloqueado: o tema vale para esta sessão e pronto.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')
  }, [setTheme])

  // Acompanha a preferência do sistema — mas só enquanto a pessoa não escolheu.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      try {
        if (window.localStorage.getItem(THEME_STORAGE_KEY)) return
      } catch {
        /* segue com a preferência do sistema */
      }
      const next: Theme = mq.matches ? 'light' : 'dark'
      setThemeState(next)
      apply(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
