'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useT } from '@/i18n/LanguageProvider'

/**
 * Alternador de tema. Mora no canto superior direito, ao lado do seletor de
 * idioma — os dois são preferências da pessoa, não navegação, e ficam juntos.
 *
 * O ícone mostra o destino, não o estado atual (sol = "ir para o claro"), que é
 * a convenção que as pessoas já esperam. Como ícone sozinho não se explica, o
 * `aria-label` e o `title` dizem a ação por extenso, e o `aria-pressed` informa
 * o estado a quem usa leitor de tela.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const t = useT()
  const isDark = theme === 'dark'
  const label = isDark ? t('action.themeLight') : t('action.themeDark')

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="shrink-0 p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-alt transition-colors duration-fast"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
