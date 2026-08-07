'use client'

import { themedText } from '@/lib/readableColor'
import AppShell from '@/components/AppShell'
import { useT } from '@/i18n/LanguageProvider'
import { KPI_TONE } from '@/lib/kpiTone'
import { Rich } from '@/i18n/Rich'
import { GCP_ROLES, GCP_TIER_META, GcpTier, GCP_CATEGORIES } from '@/data/gcp'
import Link from 'next/link'
import { ShieldAlert, Cloud, Database, Server, Key, Shield, Network, Lock, HardDrive, Box, Zap, BrainCircuit, BarChart2, Activity, CreditCard, Settings, Code, Cpu, ChevronRight } from 'lucide-react'

const TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']

const CAT_ICONS: Record<string, React.ReactNode> = {
  IAM: <Shield size={15} />, Compute: <Server size={15} />, Storage: <HardDrive size={15} />,
  BigQuery: <Database size={15} />, Kubernetes: <Box size={15} />, Database: <Database size={15} />,
  Networking: <Network size={15} />, Security: <Lock size={15} />, DevOps: <Code size={15} />,
  Serverless: <Zap size={15} />, AI: <BrainCircuit size={15} />, Analytics: <BarChart2 size={15} />,
  Observability: <Activity size={15} />, Billing: <CreditCard size={15} />, Management: <Settings size={15} />,
}

export default function GcpDashboard() {
  const t = useT()
  const total      = GCP_ROLES.length
  const privileged = GCP_ROLES.filter(r => r.isPrivileged).length
  const adminRoles = GCP_ROLES.filter(r => r.tier === 'Admin' || r.tier === 'ProjectOwner').length

  const tierCounts = TIERS.map(t => ({
    tier: t,
    count: GCP_ROLES.filter(r => r.tier === t).length,
    meta: GCP_TIER_META[t],
  }))

  const catCounts = GCP_CATEGORIES.map(c => ({
    cat: c,
    count: GCP_ROLES.filter(r => r.category === c).length,
  })).filter(x => x.count > 0)

  return (
    <AppShell
      headerTitle="Google Cloud IAM"
      headerSub={t('gcp.pageSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl px-6 py-6 space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: t('kpi.totalRoles'),   value: total,              href: '/gcp/roles',                tone: 'accent' as const },
              { label: t('count.privileged'), value: privileged,         href: '/gcp/roles?filter=privileged', tone: 'danger' as const },
              { label: t('kpi.adminOwner'),   value: adminRoles,         href: '/gcp/roles?tier=Admin',     tone: 'neutral' as const },
              { label: t('count.categories'), value: GCP_CATEGORIES.length, href: '/gcp/roles',             tone: 'neutral' as const },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm hover:border-csp-gcp/40 dark:hover:border-csp-gcp/30 transition-colors group">
                <p className="text-3xs text-fg-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  {s.label}<ChevronRight size={10} className="reveal-on-hover" />
                </p>
                <p className={`text-stat font-bold leading-none ${KPI_TONE[s.tone]}`}>{s.value}</p>
              </Link>
            ))}
          </div>

          {/* Tier distribution + Privileged roles */}
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
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {GCP_ROLES.filter(r => r.isPrivileged).map(r => (
                  <Link key={r.slug} href={`/gcp/roles/${r.slug}`}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group">
                    <span className="text-3xs text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 truncate mr-2">{r.name}</span>
                    <span className="text-2xs px-1.5 py-0.5 rounded-full shrink-0 themed-color" style={{ background: GCP_TIER_META[r.tier].bg, ...themedText(GCP_TIER_META[r.tier].color, GCP_TIER_META[r.tier].bg) }}>
                      {GCP_TIER_META[r.tier].label}
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
                <Link key={cat} href={`/gcp/roles?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800 hover:bg-[#e8f4f0] dark:hover:bg-success-soft hover:border-csp-gcp/40 transition-colors">
                  <span className="shrink-0 text-fg-subtle">{CAT_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-3xs font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-2xs text-fg-subtle">{count} roles</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Info bar */}
          <div className="rounded-xl border border-csp-gcp/30 bg-csp-gcp/5 dark:bg-csp-gcp/10 px-5 py-4 flex items-start gap-3">
            <Cloud size={15} className="text-csp-gcp-onLight dark:text-csp-gcp-onDark mt-0.5 shrink-0" />
            <p className="text-tiny text-csp-gcp-onLight dark:text-csp-gcp-onDark leading-relaxed">
              <Rich text={t('gcp.modelBody')} />
            </p>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
