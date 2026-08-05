'use client'

import { BookOpen, Grid3x3, ClipboardCheck } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'

export type SoDTab = 'catalog' | 'matrix' | 'evaluate'

const TABS: { id: SoDTab; label: TranslationKey; icon: React.ReactNode }[] = [
  { id: 'catalog',  label: 'sod.tabCatalog',  icon: <BookOpen size={14} /> },
  { id: 'matrix',   label: 'sod.tabMatrix',   icon: <Grid3x3 size={14} /> },
  { id: 'evaluate', label: 'sod.tabEvaluate', icon: <ClipboardCheck size={14} /> },
]

export default function SoDTabs({ active, onChange }: { active: SoDTab; onChange: (tab: SoDTab) => void }) {
  const t = useT()
  return (
    <div className="flex items-center gap-1 px-4 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-body font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'border-brand text-brand-strong dark:text-brand-onDark'
                : 'border-transparent text-fg-muted hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon} {t(tab.label)}
          </button>
        )
      })}
    </div>
  )
}
