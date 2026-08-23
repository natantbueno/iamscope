'use client'

import { useCallback, useMemo } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert, Cloud, LayoutGrid } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { BetaNotice } from '@/components/BetaBadge'
import SoDTabs, { SoDTab } from '@/components/SoDTabs'
import SoDScopeNotice from '@/components/SoDScopeNotice'
import SoDRulesCatalog from '@/components/SoDRulesCatalog'
import SoDMatrix from '@/components/SoDMatrix'
import SoDUserEvaluator from '@/components/SoDUserEvaluator'
import SoDSeverityBadge from '@/components/SoDSeverityBadge'
import SodScriptCard from '@/components/SodScriptCard'
import {
  SOD_RULES, SOD_CATEGORY_META, SOD_PROVIDER_META, SOD_PROVIDERS, SOD_PLATFORMS,
  SoDSeverity, SoDCategory, SoDProvider, ruleProvider, isCrossPlatform,
} from '@/data/sod/rules'

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
    const byProvider: Record<SoDProvider, number> = { microsoft: 0, aws: 0, google: 0 }
    let crossCloud = 0
    for (const r of SOD_RULES) {
      severityBreakdown[r.severity]++
      categoriesCovered.add(r.category)
      byProvider[ruleProvider(r)]++
      if (isCrossPlatform(r)) crossCloud++
    }
    return {
      severityBreakdown,
      categoriesCovered: categoriesCovered.size,
      totalCategories: Object.keys(SOD_CATEGORY_META).length,
      byProvider,
      crossCloud,
    }
  }, [])

  // O script PowerShell fala com o Microsoft Graph e com o Azure Resource
  // Manager: ele só consegue avaliar as regras Microsoft. Passar
  // SOD_RULES.length aqui prometeria cobertura de AWS/GCP/Workspace que o
  // script não tem.
  const microsoftRuleCount = metrics.byProvider.microsoft

  return (
    <AppShell
      headerTitle="SoD Analyzer"
      headerSub={t('sod.headerSub')}
      beta
      headerActions={
        <div className="flex items-center gap-1.5 text-3xs text-fg-muted">
          <ShieldAlert size={14} />
          <span className="hidden sm:inline">{SOD_RULES.length} {t('noun.rules')} · {t('sod.clientSide')}</span>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
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
          {/*
            Antes este card mostrava "Entra ID + Azure RBAC" cravado. Agora
            conta por PROVEDOR, que é o recorte que importa: é dentro do
            provedor que uma regra pode cruzar plataformas.
          */}
          <MetricCard label={t('sod.cloudsCovered')} icon={<Cloud size={13} />}>
            <p className="text-body font-semibold text-gray-800 dark:text-gray-100">
              {SOD_PLATFORMS.length} <span className="font-normal text-fg-subtle">{t('sod.scopePlatforms')}</span>
            </p>
            <p className="text-2xs text-fg-muted mt-0.5">
              {SOD_PROVIDERS.map((p, i) => (
                <span key={p}>
                  {i > 0 && ' · '}{metrics.byProvider[p]} {SOD_PROVIDER_META[p].label}
                </span>
              ))}
            </p>
          </MetricCard>
          <MetricCard label={t('sod.categoriesCovered')} icon={<LayoutGrid size={13} />}>
            <p className="text-heading font-bold text-gray-800 dark:text-gray-100">
              {metrics.categoriesCovered} <span className="text-body font-normal text-fg-subtle">{t('sod.outOf')} {metrics.totalCategories}</span>
            </p>
          </MetricCard>
        </div>
        {/*
          O aviso de escopo fica ACIMA das abas, não dentro de uma delas: vale
          para o catálogo, para a matriz e para a avaliação por igual. Se ficasse
          numa aba só, quem entra direto em /sod?tab=evaluate — o caminho de quem
          já sabe o que quer — nunca o veria.
        */}
        <SoDScopeNotice platformCount={SOD_PLATFORMS.length} crossCloudCount={metrics.crossCloud} />
        <div className="px-4 pb-3">
          <BetaNotice items={['beta.sodOne', 'beta.sodTwo', 'beta.sodThree']} />
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
              <SodScriptCard ruleCount={microsoftRuleCount} />
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
