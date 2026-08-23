'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from './ThemeProvider'
import { useT } from '@/i18n/LanguageProvider'

/**
 * Alternador de tema. Mora na linha do menu superior, ao lado do seletor de
 * idioma — os dois são preferências da pessoa, não navegação, e ficam juntos.
 *
 * Por que switch de duas posições e não um botão que alterna:
 *
 * O botão mostrava o DESTINO (sol = "ir para o claro"), que é a convenção —
 * mas a convenção só se lê depois de aprendida, e num ícone sozinho o estado
 * atual fica implícito: quem chega vê um sol e não sabe se está no claro ou
 * indo para ele. Aqui as duas opções aparecem lado a lado e a atual fica
 * marcada, do mesmo jeito que PT/EN ao lado. O `aria-pressed` diz o mesmo a
 * quem usa leitor de tela, e o `title` de cada lado continua sendo a ação.
 *
 * A pílula é `rounded-full` — mais redonda que a do idioma, de propósito: são
 * dois controles vizinhos com a mesma estrutura, e a forma é o que os separa
 * de relance.
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useT()

  const opts: { code: Theme; Icon: typeof Sun; title: string }[] = [
    { code: 'light', Icon: Sun,  title: t('action.themeLight') },
    { code: 'dark',  Icon: Moon, title: t('action.themeDark') },
  ]

  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className="flex items-center gap-0.5 rounded-full border border-surface-border dark:border-gray-700
                 bg-white dark:bg-gray-900 p-0.5 shrink-0"
    >
      {opts.map(({ code, Icon, title }) => {
        const active = theme === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setTheme(code)}
            aria-pressed={active}
            title={title}
            className={`flex items-center justify-center px-1.5 sm:px-2.5 py-1.5 rounded-full transition-colors ${
              active
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                : 'text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}
