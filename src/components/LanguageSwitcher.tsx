'use client'

import { useLanguage, type Lang } from '@/i18n/LanguageProvider'

/**
 * Alternador de idioma da interface.
 *
 * As bandeiras são SVG inline em vez de emoji (🇧🇷/🇺🇸) porque o Windows não
 * renderiza emoji de bandeira — no Chrome em Windows sairiam as letras "BR" e
 * "US" num retângulo, que é justamente o público principal do site.
 */

function FlagBR({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden="true">
      <rect width="28" height="20" rx="2" fill="#009B3A" />
      <path d="M14 3.2 25.2 10 14 16.8 2.8 10z" fill="#FEDF00" />
      <circle cx="14" cy="10" r="4" fill="#002776" />
      <path d="M10.3 8.8a8.6 8.6 0 0 1 7.5 1.9" stroke="#fff" strokeWidth="1.1" fill="none" />
    </svg>
  )
}

function FlagUS({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden="true">
      <rect width="28" height="20" rx="2" fill="#fff" />
      {[0, 2, 4, 6, 8].map((i) => (
        <rect key={i} y={i * 2.8} width="28" height="1.55" fill="#B22234" />
      ))}
      {[1, 3, 5, 7, 9].map((i) => (
        <rect key={i} y={i * 2.0 + 0.4} width="28" height="1.55" fill="#B22234" opacity="0" />
      ))}
      <rect width="28" height="20" rx="2" fill="none" />
      <rect width="12" height="10.8" fill="#3C3B6E" />
      {[...Array(4)].map((_, r) => [...Array(5)].map((_, c) => (
        <circle key={`${r}-${c}`} cx={1.4 + c * 2.4} cy={1.5 + r * 2.6} r="0.55" fill="#fff" />
      )))}
    </svg>
  )
}

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage()

  const opts: { code: Lang; label: string; Flag: typeof FlagBR }[] = [
    { code: 'pt', label: 'PT', Flag: FlagBR },
    { code: 'en', label: 'EN', Flag: FlagUS },
  ]

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className="flex items-center gap-0.5 rounded-lg border border-surface-border dark:border-gray-700
                 bg-white dark:bg-gray-900 p-0.5 shrink-0"
    >
      {opts.map(({ code, label, Flag }) => {
        const active = lang === code
        return (
          <button
            key={code}
            onClick={() => setLang(code)}
            aria-pressed={active}
            title={t(code === 'pt' ? 'lang.pt' : 'lang.en')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-3xs font-medium transition-colors ${
              active
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                : 'text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Flag className={`w-4 h-3 rounded-[1px] ${active ? '' : 'opacity-50 grayscale'}`} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
