'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert, Cloud, LayoutGrid } from 'lucide-react'
import AppShell from '@/components/AppShell'
import SoDTabs, { SoDTab } from '@/components/SoDTabs'
import SoDRulesCatalog from '@/components/SoDRulesCatalog'
import SoDMatrix from '@/components/SoDMatrix'
import SoDUserEvaluator from '@/components/SoDUserEvaluator'
import SoDSeverityBadge from '@/components/SoDSeverityBadge'
import { SOD_RULES, SOD_SEVERITY_META, SOD_CATEGORY_META, SoDSeverity, SoDCategory } from '@/data/sod/rules'

const VALID_TABS: SoDTab[] = ['catalog', 'matrix', 'evaluate']

export default function SodClient() {
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
      headerSub="Segregation of Duties para Entra ID e Azure RBAC — catálogo, matriz e avaliação de usuário"
      headerActions={
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          <ShieldAlert size={14} />
          <span>{SOD_RULES.length} regras · 100% client-side</span>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <MetricCard label="Total de regras">
            <p className="text-[20px] font-bold text-gray-800 dark:text-gray-100">{SOD_RULES.length}</p>
          </MetricCard>
          <MetricCard label="Severidade">
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(metrics.severityBreakdown) as SoDSeverity[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <SoDSeverityBadge severity={s} /> {metrics.severityBreakdown[s]}
                </span>
              ))}
            </div>
          </MetricCard>
          <MetricCard label="Clouds cobertas" icon={<Cloud size={13} />}>
            <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Entra ID + Azure RBAC</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {metrics.entraOnly} Entra · {metrics.azureOnly} Azure · {metrics.crossCloud} cross-cloud
            </p>
          </MetricCard>
          <MetricCard label="Categorias cobertas" icon={<LayoutGrid size={13} />}>
            <p className="text-[20px] font-bold text-gray-800 dark:text-gray-100">{metrics.categoriesCovered} <span className="text-[13px] font-normal text-gray-400">de {metrics.totalCategories}</span></p>
          </MetricCard>
        </div>
        <SoDTabs active={activeTab} onChange={setTab} />
        {activeTab === 'catalog' && <SoDRulesCatalog />}
        {activeTab === 'matrix' && <SoDMatrix />}
        {activeTab === 'evaluate' && <SoDUserEvaluator />}
      </div>
    </AppShell>
  )
}

function MetricCard({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-[#f7f9fc] dark:bg-gray-800/60">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      {children}
    </div>
  )
}
