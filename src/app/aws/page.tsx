'use client'

import AppShell from '@/components/AppShell'
import { useT } from '@/i18n/LanguageProvider'
import { KPI_TONE } from '@/lib/kpiTone'
import { AWS_POLICIES, AWS_TIER_META, AwsTier, AwsCategory } from '@/data/aws'
import Link from 'next/link'
import { ShieldAlert, ChevronRight, Shield, ShieldCheck, Server, Database, Network, HardDrive, Lock, Code, Box, Zap, BrainCircuit, BarChart2, Settings, Cpu, CreditCard, MessageSquare } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { resolveTierAccent, CLOUD_TIER_ACCENT_TEXT, cloudInfoBarStyle } from '@/lib/cloudTierAccent'

const TIERS: AwsTier[] = ['FullAccess', 'PowerUser', 'ReadOnly', 'Operator', 'Specialized']

const CAT_ICONS: Record<string, React.ReactNode> = {
  IAM: <ShieldCheck size={15} />, Compute: <Server size={15} />, Storage: <HardDrive size={15} />,
  Database: <Database size={15} />, Networking: <Network size={15} />, Security: <Lock size={15} />,
  DevOps: <Code size={15} />, Serverless: <Zap size={15} />, Containers: <Box size={15} />,
  AI: <BrainCircuit size={15} />, Analytics: <BarChart2 size={15} />, Management: <Settings size={15} />,
  IoT: <Cpu size={15} />, Billing: <CreditCard size={15} />, Messaging: <MessageSquare size={15} />,
}

export default function AwsDashboard() {
  const t = useT()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const total = AWS_POLICIES.length
  const privileged = AWS_POLICIES.filter(p => p.isPrivileged)
  const fullAccess = AWS_POLICIES.filter(p => p.tier === 'FullAccess')

  const categories = Array.from(new Set(AWS_POLICIES.map(p => p.category))) as AwsCategory[]
  const catCounts = categories.map(c => ({ cat: c, count: AWS_POLICIES.filter(p => p.category === c).length }))
    .sort((a, b) => b.count - a.count)

  const tierCounts = TIERS.map(t => ({
    tier: t, count: AWS_POLICIES.filter(p => p.tier === t).length,
    meta: AWS_TIER_META[t],
  }))
  const maxTier = Math.max(...tierCounts.map(t => t.count))

  return (
    <AppShell headerTitle="AWS IAM" headerSub="Managed Policies, Service Roles e Permission Sets">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('kpi.totalPolicies'), value: total,              href: '/aws/policies',                   tone: 'accent' as const },
              { label: t('count.privileged'),  value: privileged.length,  href: '/aws/policies?filter=privileged', tone: 'danger' as const },
              { label: t('kpi.fullAccess'),    value: fullAccess.length,  href: '/aws/policies?filter=FullAccess', tone: 'neutral' as const },
              { label: t('count.categories'),  value: catCounts.length,   href: '/aws/policies',                   tone: 'neutral' as const },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="flex flex-col justify-between gap-2 min-w-0 bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-3 sm:p-4 shadow-sm hover:border-csp-aws/40 dark:hover:border-csp-aws/30 transition-colors group">
                <p className="text-3xs text-fg-muted uppercase tracking-wider flex items-start gap-1 leading-snug">
                  <span className="min-w-0 break-words">{s.label}</span>
                  <ChevronRight size={10} className="reveal-on-hover shrink-0 mt-0.5" />
                </p>
                <p className={`text-stat font-extrabold leading-none ${KPI_TONE[s.tone]}`}>{s.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tier distribution */}
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.tierDistribution')}</h2>
              <div className="space-y-3">
                {tierCounts.map(({ tier, count, meta }) => (
                  <Link key={tier} href={`/aws/policies?filter=${tier}`} className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-tiny font-medium group-hover:underline">{meta.label}</span>
                      <span className="text-3xs font-semibold text-fg-muted">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxTier) * 100}%`, background: resolveTierAccent('aws', meta.color, meta.color, isDark) }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Privileged policies */}
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-red-500" /> Policies Privilegiadas
                </h2>
                <Link href="/aws/policies?filter=privileged" className="text-3xs" style={{ color: CLOUD_TIER_ACCENT_TEXT.aws[isDark ? 'dark' : 'light'] }}>{t('action.seeAll')}</Link>
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {privileged.length === 0 && <p className="text-tiny text-fg-muted px-2 py-1">Nenhuma policy privilegiada catalogada.</p>}
                {privileged.slice(0, 12).map(p => {
                  const meta = AWS_TIER_META[p.tier]
                  const pillColor = resolveTierAccent('aws', meta.color, meta.color, isDark)
                  const pillText = resolveTierAccent('aws', meta.color, meta.color, isDark, 'text')
                  return (
                  <Link key={p.slug} href={`/aws/policies/${p.slug}`}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group">
                    <span className="text-3xs text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 truncate mr-2">{p.name}</span>
                    <span className="text-2xs px-1.5 py-0.5 rounded-full shrink-0 font-medium" style={{ background: `${pillColor}26`, color: pillText }}>
                      {meta.label}
                    </span>
                  </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Categories grid */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('section.byCategory')}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {catCounts.map(({ cat, count }) => (
                <Link key={cat} href={`/aws/policies?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800 hover:bg-surface-hover hover:border-line-strong transition-colors">
                  <span className="shrink-0" style={{ color: CLOUD_TIER_ACCENT_TEXT.aws[isDark ? 'dark' : 'light'] }}>{CAT_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-3xs font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-2xs" style={{ color: CLOUD_TIER_ACCENT_TEXT.aws[isDark ? 'dark' : 'light'] }}>{count} policies</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Info bar */}
          {(() => {
            const bar = cloudInfoBarStyle('aws', isDark)
            return (
          <div className="rounded-xl border px-5 py-4 flex items-start gap-3" style={{ borderColor: bar.border, background: bar.background }}>
            <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: bar.text }} />
            <p className="text-tiny leading-relaxed" style={{ color: bar.text }}>
              AWS IAM Managed Policies são mantidas e atualizadas pela AWS. Service Roles permitem que serviços AWS assumam permissões de forma segura.
              Permission Sets são usados via IAM Identity Center para acesso federado em múltiplas contas.
            </p>
          </div>
            )
          })()}

        </div>
      </div>
    </AppShell>
  )
}
