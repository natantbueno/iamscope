'use client'

import AppShell from '@/components/AppShell'
import { useT } from '@/i18n/LanguageProvider'
import { KPI_TONE } from '@/lib/kpiTone'
import { AZURE_ROLES, AZURE_TIER_META, AzureRbacTier } from '@/data/azureRbac'
import Link from 'next/link'
import {
  Shield, ShieldAlert, Database, HardDrive, Network, Eye, Cpu, Boxes,
  ChevronRight, ExternalLink, Info,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { resolveTierAccent, CLOUD_TIER_ACCENT_TEXT, cloudInfoBarStyle } from '@/lib/cloudTierAccent'

const TIER_ORDER: AzureRbacTier[] = ['FullControl', 'AccessManagement', 'Contributor', 'DataPlane', 'Reader', 'Specialized']

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  General:     <Shield size={15} />,
  Security:    <ShieldAlert size={15} />,
  Compute:     <Cpu size={15} />,
  Storage:     <HardDrive size={15} />,
  Networking:  <Network size={15} />,
  Database:    <Database size={15} />,
  Identity:    <Shield size={15} />,
  Monitoring:  <Eye size={15} />,
  Containers:  <Boxes size={15} />,
  AppService:  <Cpu size={15} />,
  Integration: <Network size={15} />,
  Management:  <Shield size={15} />,
  AI:          <Cpu size={15} />,
}

export default function AzureRbacDashboard() {
  const t = useT()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const total       = AZURE_ROLES.length
  const privileged  = AZURE_ROLES.filter((r) => r.isPrivileged).length
  const categories  = [...new Set(AZURE_ROLES.map((r) => r.category))]

  const byTier = TIER_ORDER.map((tier) => ({
    tier,
    count: AZURE_ROLES.filter((r) => r.tier === tier).length,
    meta:  AZURE_TIER_META[tier],
  }))

  return (
    <AppShell
      headerTitle="Azure RBAC"
      headerSub="Azure Resource Manager — built-in role reference"
    >
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('kpi.builtinRoles'),  value: total,           href: '/azure-rbac/roles',                   tone: 'accent' as const },
            { label: t('kpi.fullControl'),   value: byTier[0].count, href: '/azure-rbac/roles?tier=FullControl',  tone: 'neutral' as const },
            { label: t('count.privileged'),  value: privileged,      href: '/azure-rbac/roles?filter=privileged', tone: 'danger' as const },
            { label: t('count.categories'),  value: categories.length, href: '/azure-rbac/roles',                 tone: 'neutral' as const },
          ].map((s) => (
            <Link key={s.label} href={s.href}
              className="flex flex-col justify-between gap-2 min-w-0 bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-3 sm:p-4 shadow-sm hover:border-brand/40 dark:hover:border-brand/30 transition-colors group">
              <p className="text-3xs text-fg-muted uppercase tracking-wider flex items-start gap-1 leading-snug">
                <span className="min-w-0 break-words">{s.label}</span>
                <ChevronRight size={10} className="reveal-on-hover shrink-0 mt-0.5" />
              </p>
              <p className={`text-stat font-extrabold leading-none ${KPI_TONE[s.tone]}`}>{s.value}</p>
            </Link>
          ))}
        </div>

        {/* ── Two-column: Risk Tier breakdown + Roles Privilegiadas ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.riskTierDist')}</h2>
            <div className="space-y-3">
              {byTier.map(({ tier, count, meta }) => {
                // Checagem de "é o tier de topo" sempre pelo hex canônico
                // (textColor); darkText/-Dark são só a variante de SAÍDA do
                // mesmo tier, e nunca coincidem com os cinzas neutros — usá-los
                // na checagem faria todo tier parecer "de topo" no escuro.
                const neutral = isDark ? meta.darkText : meta.textColor
                const graphicColor = resolveTierAccent('azureRbac', meta.textColor, neutral, isDark)
                const textColor = resolveTierAccent('azureRbac', meta.textColor, neutral, isDark, 'text')
                return (
                <Link key={tier} href={`/azure-rbac/roles?tier=${tier}`} className="block group">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: graphicColor }} />
                      <span className="text-tiny text-fg-muted group-hover:underline">{meta.label}</span>
                    </div>
                    <span className="text-tiny font-semibold" style={{ color: textColor }}>{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                    <div className="h-1 rounded-full transition-all"
                      style={{ width: `${(count / total) * 100}%`, backgroundColor: graphicColor }} />
                  </div>
                </Link>
                )
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-red-500" /> Roles Privilegiadas
              </h2>
              <Link href="/azure-rbac/roles?filter=privileged" className="text-3xs" style={{ color: CLOUD_TIER_ACCENT_TEXT.azureRbac[isDark ? 'dark' : 'light'] }}>{t('action.seeAll')}</Link>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {privileged === 0 && <p className="text-tiny text-fg-muted px-2 py-1">Nenhuma role privilegiada catalogada.</p>}
              {AZURE_ROLES.filter((r) => r.isPrivileged).slice(0, 12).map((role) => {
                const meta = AZURE_TIER_META[role.tier]
                const neutral = isDark ? meta.darkText : meta.textColor
                const pillColor = resolveTierAccent('azureRbac', meta.textColor, neutral, isDark)
                const pillText = resolveTierAccent('azureRbac', meta.textColor, neutral, isDark, 'text')
                return (
                  <Link key={role.slug} href={`/azure-rbac/roles/${role.slug}`}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group">
                    <span className="text-3xs text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 truncate mr-2">{role.name}</span>
                    <span className="text-2xs px-1.5 py-0.5 rounded-full shrink-0 font-medium" style={{ background: `${pillColor}26`, color: pillText }}>
                      {meta.short}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Categories grid ── */}
        <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('section.byCategory')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {categories.sort().map((cat) => {
              const count = AZURE_ROLES.filter((r) => r.category === cat).length
              return (
                <Link key={cat} href={`/azure-rbac/roles?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800 hover:bg-brand-soft dark:hover:bg-brand-activeBg hover:border-brand-mid dark:hover:border-brand-activeRing transition-colors">
                  <span className="shrink-0" style={{ color: CLOUD_TIER_ACCENT_TEXT.azureRbac[isDark ? 'dark' : 'light'] }}>{CATEGORY_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-3xs font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-2xs" style={{ color: CLOUD_TIER_ACCENT_TEXT.azureRbac[isDark ? 'dark' : 'light'] }}>{count} roles</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Info bar ── */}
        {(() => {
          const bar = cloudInfoBarStyle('azureRbac', isDark)
          return (
        <div className="rounded-xl border px-5 py-4 flex items-start gap-3" style={{ borderColor: bar.border, background: bar.background }}>
          <Info size={15} className="mt-0.5 shrink-0" style={{ color: bar.text }} />
          <p className="text-tiny leading-relaxed" style={{ color: bar.text }}>
            <strong>Assignable Scopes</strong> — roles são atribuídas em escopos específicos: Management Group, Subscription, Resource Group ou Resource individual.
            O escopo efetivo de cada role está visível na página de detalhes. Use{' '}
            <code className="font-mono text-3xs px-1 rounded" style={{ background: bar.codeBackground }}>az role assignment list --all</code>{' '}
            para listar atribuições ativas no seu tenant.
          </p>
        </div>
          )
        })()}

      </div>
      </div>
    </AppShell>
  )
}
