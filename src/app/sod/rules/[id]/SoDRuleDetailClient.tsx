'use client'

import AppShell from '@/components/AppShell'
import SoDRuleDetailCard from '@/components/SoDRuleDetailCard'
import type { SoDRule } from '@/data/sod/rules'
import { useT } from '@/i18n/LanguageProvider'

export default function SoDRuleDetailClient({ rule }: { rule: SoDRule }) {
  const t = useT()
  return (
    <AppShell headerTitle={rule.name} headerSub={t('sod.ruleDetailSub')} pageHasOwnHeading>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-8 py-8">
          <SoDRuleDetailCard rule={rule} />
        </div>
      </div>
    </AppShell>
  )
}
