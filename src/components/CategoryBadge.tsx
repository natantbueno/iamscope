'use client'

import { RoleCategory, CATEGORY_META } from '@/data/roles'
import { useTheme } from './ThemeProvider'

export default function CategoryBadge({ category }: { category: RoleCategory }) {
  const meta = CATEGORY_META[category]
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{
        background: isDark ? meta.darkBg : meta.bgColor,
        color: isDark ? meta.darkText : meta.textColor,
      }}
    >
      {meta.label}
    </span>
  )
}
