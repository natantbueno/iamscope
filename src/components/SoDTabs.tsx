'use client'

import { BookOpen, Grid3x3, ClipboardCheck } from 'lucide-react'

export type SoDTab = 'catalog' | 'matrix' | 'evaluate'

const TABS: { id: SoDTab; label: string; icon: React.ReactNode }[] = [
  { id: 'catalog', label: 'Catálogo de Regras', icon: <BookOpen size={14} /> },
  { id: 'matrix', label: 'Matriz de Conflito', icon: <Grid3x3 size={14} /> },
  { id: 'evaluate', label: 'Avaliação de Usuário', icon: <ClipboardCheck size={14} /> },
]

export default function SoDTabs({ active, onChange }: { active: SoDTab; onChange: (t: SoDTab) => void }) {
  return (
    <div className="flex items-center gap-1 px-4 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 overflow-x-auto">
      {TABS.map((t) => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'border-[#0078d4] text-[#0078d4] dark:text-[#85b7eb]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        )
      })}
    </div>
  )
}
