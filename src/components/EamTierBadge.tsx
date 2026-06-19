'use client'

import { EamTier, EAM_META } from '@/data/roles'
import { useTheme } from './ThemeProvider'

export default function EamTierBadge({
  tier,
  showLabel = true,
}: {
  tier: EamTier
  showLabel?: boolean
}) {
  const meta = EAM_META[tier]
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{
        background: isDark ? meta.darkBg : meta.bgColor,
        color: isDark ? meta.darkText : meta.textColor,
      }}
      title={meta.description}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: isDark ? meta.darkText : meta.textColor }}
      />
      {showLabel ? meta.label : meta.short}
    </span>
  )
}
