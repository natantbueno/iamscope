'use client'

import AppShell from '@/components/AppShell'
import { useT } from '@/i18n/LanguageProvider'
import { KPI_TONE } from '@/lib/kpiTone'
import { GWS_ROLES, GWS_SCOPES, GWS_TIER_META, GwsTier } from '@/data/googleWorkspace'
import Link from 'next/link'
import {
  Shield, ShieldAlert, ChevronRight, ExternalLink, Info,
  Users, Mail, HardDrive, Chrome, Lock,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { resolveTierAccent, CLOUD_TIER_ACCENT_TEXT, cloudInfoBarStyle } from '@/lib/cloudTierAccent'

const TIER_ORDER: GwsTier[] = ['SuperAdmin', 'DelegatedAdmin', 'ServiceAdmin', 'SpecializedAdmin', 'ReadOnly']

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Identity:       <Users size={15} />,
  Security:       <Shield size={15} />,
  Communication:  <Mail size={15} />,
  Productivity:   <Chrome size={15} />,
  Device:         <Chrome size={15} />,
  Storage:        <HardDrive size={15} />,
  Analytics:      <Lock size={15} />,
  Billing:        <Lock size={15} />,
  Infrastructure: <Lock size={15} />,
}

export default function GwsDashboard() {
  const t = useT()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const total      = GWS_ROLES.length
  const privileged = GWS_ROLES.filter((r) => r.isPrivileged).length
  const scopes     = GWS_SCOPES.length
  const restricted = GWS_SCOPES.filter((s) => s.sensitivity === 'restricted').length

  const byTier = TIER_ORDER.map((tier) => ({
    tier,
    count: GWS_ROLES.filter((r) => r.tier === tier).length,
    meta: GWS_TIER_META[tier],
  }))

  const categories = [...new Set(GWS_ROLES.map((r) => r.category))]

  return (
    <AppShell
      headerTitle="Google Workspace"
      headerSub="Admin Roles & OAuth Scopes reference"
    >
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('kpi.adminRoles'),       value: total,      href: '/google-workspace/roles',                            tone: 'accent' as const },
            { label: t('count.oauthScopes'),    value: scopes,     href: '/google-workspace/api-permissions',                  tone: 'neutral' as const },
            { label: t('count.privileged'),     value: privileged, href: '/google-workspace/roles?filter=privileged',          tone: 'danger' as const },
            { label: t('kpi.restrictedScopes'), value: restricted, href: '/google-workspace/api-permissions?sensitivity=restricted', tone: 'neutral' as const },
          ].map((s) => (
            <Link key={s.label} href={s.href}
              className="flex flex-col justify-between gap-2 min-w-0 bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-3 sm:p-4 shadow-sm hover:border-csp-gws/40 dark:hover:border-csp-gws/30 transition-colors group">
              <p className="text-3xs text-fg-muted uppercase tracking-wider flex items-start gap-1 leading-snug">
                <span className="min-w-0 break-words">{s.label}</span>
                <ChevronRight size={10} className="reveal-on-hover shrink-0 mt-0.5" />
              </p>
              <p className={`text-stat font-extrabold leading-none ${KPI_TONE[s.tone]}`}>{s.value}</p>
            </Link>
          ))}
        </div>

        {/* Two-column: Admin Tier breakdown + Roles Privilegiadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.adminTierDist')}</h2>
            <div className="space-y-3">
              {byTier.map(({ tier, count, meta }) => {
                const neutral = isDark ? meta.darkText : meta.textColor
                const graphicColor = resolveTierAccent('googleWorkspace', meta.textColor, neutral, isDark)
                const textColor = resolveTierAccent('googleWorkspace', meta.textColor, neutral, isDark, 'text')
                return (
                <Link key={tier} href={`/google-workspace/roles?tier=${tier}`} className="block group">
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
              <Link href="/google-workspace/roles?filter=privileged" className="text-3xs" style={{ color: CLOUD_TIER_ACCENT_TEXT.googleWorkspace[isDark ? 'dark' : 'light'] }}>{t('action.seeAll')}</Link>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {privileged === 0 && <p className="text-tiny text-fg-muted px-2 py-1">Nenhuma role privilegiada catalogada.</p>}
              {GWS_ROLES.filter((r) => r.isPrivileged).slice(0, 12).map((role) => {
                const meta = GWS_TIER_META[role.tier]
                const neutral = isDark ? meta.darkText : meta.textColor
                const pillColor = resolveTierAccent('googleWorkspace', meta.textColor, neutral, isDark)
                const pillText = resolveTierAccent('googleWorkspace', meta.textColor, neutral, isDark, 'text')
                return (
                  <Link key={role.slug} href={`/google-workspace/roles/${role.slug}`}
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

        {/* Categories */}
        <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('section.byCategory')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {categories.sort().map((cat) => {
              const count = GWS_ROLES.filter((r) => r.category === cat).length
              return (
                <Link key={cat} href={`/google-workspace/roles?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-[#0a2010] hover:border-green-300 dark:hover:border-green-800 transition-colors">
                  <span className="shrink-0" style={{ color: CLOUD_TIER_ACCENT_TEXT.googleWorkspace[isDark ? 'dark' : 'light'] }}>{CATEGORY_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-3xs font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-2xs" style={{ color: CLOUD_TIER_ACCENT_TEXT.googleWorkspace[isDark ? 'dark' : 'light'] }}>{count} roles</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Info bar */}
        {(() => {
          const bar = cloudInfoBarStyle('googleWorkspace', isDark)
          return (
        <div className="rounded-xl border px-5 py-4 flex items-start gap-3" style={{ borderColor: bar.border, background: bar.background }}>
          <Info size={15} className="mt-0.5 shrink-0" style={{ color: bar.text }} />
          <p className="text-tiny leading-relaxed" style={{ color: bar.text }}>
            <strong>OAuth 2.0 & Service Accounts</strong> — os escopos OAuth do Google Workspace definem o que uma aplicação pode acessar em nome de um usuário.
            Escopos <strong>Restricted</strong> exigem aprovação do Google antes de uso em apps publicados. Use{' '}
            <code className="font-mono text-3xs px-1 rounded" style={{ background: bar.codeBackground }}>gam oauth info</code>{' '}
            para inspecionar os tokens ativos no seu domínio.
          </p>
        </div>
          )
        })()}

      </div>
      </div>
    </AppShell>
  )
}
