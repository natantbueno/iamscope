'use client'

import { themedText } from '@/lib/readableColor'
import AppShell from '@/components/AppShell'
import { useT } from '@/i18n/LanguageProvider'
import { KPI_TONE } from '@/lib/kpiTone'
import { IBM_ROLES, IBM_TIER_META, IbmTier } from '@/data/ibmCloud'
import { IBM_CLASSIC_PERMISSIONS_COUNT } from '@/data/counts'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import Link from 'next/link'
import { ShieldAlert, Key, Server, Database, Cloud, Shield, ShieldCheck, Network, Lock, HardDrive, Settings, Activity, Box, Cpu, ChevronRight } from 'lucide-react'
import { Rich } from '@/i18n/Rich'

const TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Identity:          <ShieldCheck size={15} />,
  AccountManagement: <Settings size={15} />,
  Platform:          <Cpu size={15} />,
  Infrastructure:    <Server size={15} />,
  Compute:           <Server size={15} />,
  Data:              <Database size={15} />,
  Security:          <Lock size={15} />,
  Observability:     <Activity size={15} />,
  Networking:        <Network size={15} />,
  Classic:           <HardDrive size={15} />,
  CloudFoundry:      <Cloud size={15} />,
}

export default function IbmCloudDashboard() {
  const t = useT()
  const fmt = useNumberFormat()
  const total        = IBM_ROLES.length
  const privileged   = IBM_ROLES.filter(r => r.isPrivileged).length
  const accountAdmin = IBM_ROLES.filter(r => r.tier === 'AccountAdmin').length
  // O recorte deixou de ser por modelo de acesso: TODAS as roles oficiais da
  // IBM são de IAM. O clássico não tem role — tem permissão, e ganhou página
  // própria em /ibm-cloud/classic.
  const platformRoles = IBM_ROLES.filter(r => r.kind === 'platform').length
  const serviceRoles  = IBM_ROLES.filter(r => r.kind === 'service').length

  const tierCounts = TIERS.map(t => ({
    tier: t,
    count: IBM_ROLES.filter(r => r.tier === t).length,
    meta: IBM_TIER_META[t],
  }))

  const categories = [...new Set(IBM_ROLES.map(r => r.category))].sort()
  const catCounts = categories.map(c => ({
    cat: c,
    count: IBM_ROLES.filter(r => r.category === c).length,
  }))

  return (
    <AppShell
      headerTitle="IBM Cloud IAM"
      headerSub={t('ibm.pageSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('kpi.totalRoles'),   value: total,            href: '/ibm-cloud/roles',                tone: 'accent' as const },
              { label: t('count.privileged'), value: privileged,       href: '/ibm-cloud/roles?filter=privileged', tone: 'danger' as const },
              { label: t('kpi.accountAdmin'), value: accountAdmin,     href: '/ibm-cloud/roles?tier=AccountAdmin', tone: 'neutral' as const },
              { label: t('count.categories'), value: categories.length, href: '/ibm-cloud/roles',               tone: 'neutral' as const },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="flex flex-col justify-between gap-2 min-w-0 bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-3 sm:p-4 shadow-sm hover:border-csp-ibm/40 dark:hover:border-csp-ibm/30 transition-colors group">
                <p className="text-3xs text-fg-muted uppercase tracking-wider flex items-start gap-1 leading-snug">
                  <span className="min-w-0 break-words">{s.label}</span>
                  <ChevronRight size={10} className="reveal-on-hover shrink-0 mt-0.5" />
                </p>
                <p className={`text-stat font-bold leading-none ${KPI_TONE[s.tone]}`}>{s.value}</p>
              </Link>
            ))}
          </div>

          {/*
            Os dois modelos de acesso da IBM, com o cartão do clássico levando à
            página própria. Antes eram três cartões apontando para filtros da
            MESMA lista de roles — o que dava a entender que o clássico e o
            Cloud Foundry têm roles. Não têm.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/ibm-cloud/roles?kind=platform"
              className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
              <div className="text-stat font-bold leading-none mb-1.5 themed-color" style={themedText('#6b7280', undefined, 3)}>{platformRoles}</div>
              <div className="text-tiny font-semibold text-gray-700 dark:text-gray-300">Platform roles</div>
              <p className="text-3xs text-fg-subtle mt-1 leading-relaxed">{t('ibm.platformDesc')}</p>
            </Link>
            <Link href="/ibm-cloud/roles?kind=service"
              className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
              <div className="text-stat font-bold leading-none mb-1.5 themed-color" style={themedText('#6b7280', undefined, 3)}>{serviceRoles}</div>
              <div className="text-tiny font-semibold text-gray-700 dark:text-gray-300">Service roles</div>
              <p className="text-3xs text-fg-subtle mt-1 leading-relaxed">{t('ibm.serviceDesc')}</p>
            </Link>
            <Link href="/ibm-cloud/classic"
              className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
              <div className="text-stat font-bold leading-none mb-1.5 themed-color" style={themedText('#6b7280', undefined, 3)}>4</div>
              <div className="text-tiny font-semibold text-gray-700 dark:text-gray-300">Classic Infrastructure</div>
              <p className="text-3xs text-fg-subtle mt-1 leading-relaxed">{t('ibm.classicDesc').replace('{n}', fmt(IBM_CLASSIC_PERMISSIONS_COUNT))}</p>
            </Link>
          </div>

          {/* Two-col: Tier breakdown + Privileged */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.tierDistribution')}</h2>
              <div className="space-y-3">
                {tierCounts.map(({ tier, count, meta }) => (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                        <span className="text-tiny text-fg-muted">{meta.label}</span>
                      </div>
                      <span className="text-tiny font-semibold themed-color" style={themedText(meta.color)}>{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                      <div className="h-1 rounded-full" style={{ width: `${(count / total) * 100}%`, background: meta.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-red-500" /> Roles Privilegiadas
              </h2>
              <div className="space-y-1">
                {IBM_ROLES.filter(r => r.isPrivileged).slice(0, 6).map(r => (
                  <Link key={r.slug} href={`/ibm-cloud/roles/${r.slug}`}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group">
                    <span className="text-3xs text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 truncate mr-2">{r.name}</span>
                    <span className="text-2xs px-1.5 py-0.5 rounded-full shrink-0 themed-color" style={{ background: IBM_TIER_META[r.tier].bg, ...themedText(IBM_TIER_META[r.tier].color, IBM_TIER_META[r.tier].bg) }}>
                      {IBM_TIER_META[r.tier].label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('section.byCategory')}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {catCounts.map(({ cat, count }) => (
                <Link key={cat} href={`/ibm-cloud/roles?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800 hover:bg-[#eef3fb] dark:hover:bg-info-soft hover:border-csp-ibm/40 transition-colors">
                  <span className="shrink-0 text-fg-subtle">{CATEGORY_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-3xs font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-2xs text-fg-subtle">{count} roles</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Info bar */}
          <div className="rounded-xl border border-csp-ibm/30 bg-csp-ibm/5 dark:bg-csp-ibm/10 px-5 py-4 flex items-start gap-3">
            <Cloud size={15} className="text-csp-ibm-onLight dark:text-csp-ibm-onDark mt-0.5 shrink-0" />
            <p className="text-tiny text-csp-ibm-onLight dark:text-csp-ibm-onDark leading-relaxed">
              <Rich text={t('ibm.modelsBody')} />
            </p>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
