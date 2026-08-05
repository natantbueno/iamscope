'use client'

import { useCallback, useMemo } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert, Cloud, LayoutGrid } from 'lucide-react'
import AppShell from '@/components/AppShell'
import SoDTabs, { SoDTab } from '@/components/SoDTabs'
import SoDRulesCatalog from '@/components/SoDRulesCatalog'
import SoDMatrix from '@/components/SoDMatrix'
import SoDUserEvaluator from '@/components/SoDUserEvaluator'
import SoDSeverityBadge from '@/components/SoDSeverityBadge'
import SodScriptCard from '@/components/SodScriptCard'
import { SOD_RULES, SOD_SEVERITY_META, SOD_CATEGORY_META, SoDSeverity, SoDCategory } from '@/data/sod/rules'

const VALID_TABS: SoDTab[] = ['catalog', 'matrix', 'evaluate']

export default function SodClient() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get('tab')
  const activeTab: SoDTab = VALID_TABS.includes(tabParam as SoDTab) ? (tabParam as SoDTab) : 'catalog'

  const setTab = useCallback((tab: SoDTab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'catalog') params.delete('tab'); else params.set('tab', tab)
    router.replace(`/sod?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const metrics = useMemo(() => {
    const severityBreakdown: Record<SoDSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    const categoriesCovered = new Set<SoDCategory>()
    let entraOnly = 0, azureOnly = 0, crossCloud = 0
    for (const r of SOD_RULES) {
      severityBreakdown[r.severity]++
      categoriesCovered.add(r.category)
      if (r.cloud === 'entra-id') entraOnly++
      else if (r.cloud === 'azure-rbac') azureOnly++
      else crossCloud++
    }
    const totalCategories = Object.keys(SOD_CATEGORY_META).length
    return { severityBreakdown, categoriesCovered: categoriesCovered.size, totalCategories, entraOnly, azureOnly, crossCloud }
  }, [])

  return (
    <AppShell
      headerTitle="SoD Analyzer"
      headerSub={t('sod.headerSub')}
      headerActions={
        <div className="flex items-center gap-1.5 text-3xs text-fg-muted">
          <ShieldAlert size={14} />
          <span>{SOD_RULES.length} regras · 100% client-side</span>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <MetricCard label={t('sod.totalRules')}>
            <p className="text-heading font-bold text-gray-800 dark:text-gray-100">{SOD_RULES.length}</p>
          </MetricCard>
          <MetricCard label={t('table.severity')}>
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(metrics.severityBreakdown) as SoDSeverity[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 text-3xs text-fg-muted">
                  <SoDSeverityBadge severity={s} /> {metrics.severityBreakdown[s]}
                </span>
              ))}
            </div>
          </MetricCard>
          <MetricCard label="Clouds cobertas" icon={<Cloud size={13} />}>
            <p className="text-body font-semibold text-gray-800 dark:text-gray-100">Entra ID + Azure RBAC</p>
            <p className="text-2xs text-fg-muted mt-0.5">
              {metrics.entraOnly} Entra · {metrics.azureOnly} Azure · {metrics.crossCloud} cross-cloud
            </p>
          </MetricCard>
          <MetricCard label="Categorias cobertas" icon={<LayoutGrid size={13} />}>
            <p className="text-heading font-bold text-gray-800 dark:text-gray-100">{metrics.categoriesCovered} <span className="text-body font-normal text-fg-subtle">de {metrics.totalCategories}</span></p>
          </MetricCard>
        </div>
        <SoDTabs active={activeTab} onChange={setTab} />
        {activeTab === 'catalog' && <SoDRulesCatalog />}
        {activeTab === 'matrix' && <SoDMatrix />}
        {activeTab === 'evaluate' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/*
              O avaliador manual cobre uma identidade por vez, colando as roles.
              O script cobre o tenant inteiro. Ficam juntos porque respondem à
              mesma pergunta em escalas diferentes.
            */}
            <div className="px-4 pt-4">
              <SodScriptCard ruleCount={SOD_RULES.length} />
            </div>
            <SoDUserEvaluator />
          </div>
        )}
      </div>
    </AppShell>
  )
}

function MetricCard({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800/60">
      <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      {children}
    </div>
  )
}
