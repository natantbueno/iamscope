'use client'

import { themedText } from '@/lib/readableColor'
import AppShell from '@/components/AppShell'
import { useT } from '@/i18n/LanguageProvider'
import { AWS_POLICIES, AWS_TIER_META, AwsTier, AwsCategory } from '@/data/aws'
import Link from 'next/link'
import { ShieldAlert, ChevronRight, Shield, ShieldCheck, Server, Database, Network, HardDrive, Lock, Code, Box, Zap, BrainCircuit, BarChart2, Settings, Cpu, CreditCard, MessageSquare } from 'lucide-react'

const TIERS: AwsTier[] = ['FullAccess', 'PowerUser', 'ReadOnly', 'Operator', 'Specialized']

const CAT_COLORS: Record<string, string> = {
  IAM: '#dc2626', Compute: '#0891b2', Storage: '#16a34a', Database: '#7c3aed',
  Networking: '#0369a1', Security: '#b91c1c', DevOps: '#ea580c', Serverless: '#f59e0b',
  Containers: '#326ce5', AI: '#8b5cf6', Analytics: '#14b8a6', Management: '#6b7280',
  IoT: '#059669', Billing: '#475569', Messaging: '#d97706',
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  IAM: <ShieldCheck size={15} />, Compute: <Server size={15} />, Storage: <HardDrive size={15} />,
  Database: <Database size={15} />, Networking: <Network size={15} />, Security: <Lock size={15} />,
  DevOps: <Code size={15} />, Serverless: <Zap size={15} />, Containers: <Box size={15} />,
  AI: <BrainCircuit size={15} />, Analytics: <BarChart2 size={15} />, Management: <Settings size={15} />,
  IoT: <Cpu size={15} />, Billing: <CreditCard size={15} />, Messaging: <MessageSquare size={15} />,
}

export default function AwsDashboard() {
  const t = useT()
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
        <div className="max-w-5xl px-6 py-6 space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Policies', value: total,              href: '/aws/policies',                   color: '#ff9900' },
              { label: 'Privileged',     value: privileged.length,  href: '/aws/policies?filter=privileged', color: '#dc2626' },
              { label: 'FullAccess',     value: fullAccess.length,  href: '/aws/policies?filter=FullAccess', color: AWS_TIER_META.FullAccess.color },
              { label: 'Categorias',     value: catCounts.length,   href: '/aws/policies',                   color: '#7c3aed' },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm hover:border-csp-aws/40 dark:hover:border-csp-aws/30 transition-colors group">
                <p className="text-3xs text-fg-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  {s.label}<ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-display font-bold leading-none themed-color" style={themedText(s.color, undefined, 3)}>{s.value}</p>
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
                      <span className="text-tiny font-medium group-hover:underline" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="text-3xs font-semibold text-fg-muted">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxTier) * 100}%`, background: meta.color }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Privileged policies */}
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300">Policies Privilegiadas</h2>
                <Link href="/aws/policies?filter=privileged" className="text-3xs text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">{t('action.seeAll')}</Link>
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {privileged.slice(0, 12).map(p => (
                  <Link key={p.slug} href={`/aws/policies/${p.slug}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <ShieldAlert size={12} className="text-red-500 shrink-0" />
                    <span className="flex-1 text-tiny text-gray-700 dark:text-gray-300 group-hover:text-csp-aws transition-colors">{p.name}</span>
                    <span className="text-2xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: AWS_TIER_META[p.tier].bg, color: AWS_TIER_META[p.tier].color }}>{p.tier}</span>
                    <ChevronRight size={11} className="text-fg-muted dark:text-gray-600 group-hover:text-csp-aws" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Categories grid */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('section.byCategory')}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {catCounts.map(({ cat, count }) => (
                <Link key={cat} href={`/aws/policies?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800 hover:bg-[#fff8ec] dark:hover:bg-warning-soft hover:border-csp-aws/40 transition-colors">
                  <span className="shrink-0" style={{ color: CAT_COLORS[cat] ?? '#ff9900' }}>{CAT_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-3xs font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-2xs text-fg-subtle">{count} policies</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Info bar */}
          <div className="rounded-xl border border-csp-aws/30 bg-csp-aws/5 dark:bg-csp-aws/10 px-5 py-4 flex items-start gap-3">
            <ShieldCheck size={15} className="text-csp-aws-onLight dark:text-csp-aws-onDark mt-0.5 shrink-0" />
            <p className="text-tiny text-[#7a4a00] dark:text-[#ffb84d] leading-relaxed">
              AWS IAM Managed Policies são mantidas e atualizadas pela AWS. Service Roles permitem que serviços AWS assumam permissões de forma segura.
              Permission Sets são usados via IAM Identity Center para acesso federado em múltiplas contas.
            </p>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
