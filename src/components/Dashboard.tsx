'use client'

import Link from 'next/link'
import { useT } from '@/i18n/LanguageProvider'
import { KPI_TONE } from '@/lib/kpiTone'
import { ShieldAlert, Shield, ChevronRight, Users, AppWindow, Lock, FileCheck, Monitor } from 'lucide-react'
import { ROLES, EAM_META, EamTier, CATEGORY_META, RoleCategory } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { useTheme } from './ThemeProvider'
import { resolveTierAccent, CLOUD_TIER_ACCENT_TEXT, cloudInfoBarStyle } from '@/lib/cloudTierAccent'

const TIER_ORDER: EamTier[] = ['ControlPlane', 'ManagementPlane', 'UserAccess']

const CATEGORY_ICONS: Record<RoleCategory, React.ReactNode> = {
  Identity:    <Users size={15} />,
  Application: <AppWindow size={15} />,
  Security:    <Lock size={15} />,
  Compliance:  <FileCheck size={15} />,
  M365:        <Monitor size={15} />,
  Device:      <Monitor size={15} />,
  Other:       <Shield size={15} />,
}

export default function Dashboard() {
  const t = useT()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const totalRoles = ROLES.length
  const privilegedRoles = ROLES.filter((r) => r.isPrivileged).length
  const controlPlaneRoles = ROLES.filter((r) => r.eamTier === 'ControlPlane').length

  const tierStats = ROLES.reduce((acc, r) => {
    acc[r.eamTier] = (acc[r.eamTier] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const categories = [...new Set(ROLES.map((r) => r.category))].sort()
  const catCounts = categories.map((cat) => ({ cat, count: ROLES.filter((r) => r.category === cat).length }))

  return (
    <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('kpi.builtinRoles'),   value: totalRoles,          href: '/entraid/roles',                      tone: 'accent' as const },
          { label: t('tier.controlPlane'), value: controlPlaneRoles,   href: '/entraid/roles?tier=ControlPlane',     tone: 'neutral' as const },
          { label: t('count.privileged'),  value: privilegedRoles,     href: '/entraid/roles?filter=privileged',     tone: 'danger' as const },
          { label: t('count.apiPermissions'), value: API_PERMISSIONS.length, href: '/entraid/api-permissions',          tone: 'neutral' as const },
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

      {/* Two-column: EAM distribution + Roles mais consultadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.eamDistribution')}</h2>
          <div className="space-y-3">
            {TIER_ORDER.map((tier) => {
              const meta = EAM_META[tier]
              const count = tierStats[tier] || 0
              // Ponto/barra usam o par gráfico (>=3.3:1); o número é texto real
              // e precisa do par mais rígido (>=4.5:1) — ver cloudTierAccent.ts.
              const neutral = isDark ? meta.darkText : meta.textColor
              const graphicColor = resolveTierAccent('entraId', meta.textColor, neutral, isDark)
              const textColor = resolveTierAccent('entraId', meta.textColor, neutral, isDark, 'text')
              return (
                <Link key={tier} href={`/entraid/roles?tier=${tier}`} className="block group">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: graphicColor }} />
                      <span className="text-tiny text-fg-muted group-hover:underline">{meta.label}</span>
                    </div>
                    <span className="text-tiny font-semibold" style={{ color: textColor }}>{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                    <div className="h-1 rounded-full" style={{ width: `${(count / totalRoles) * 100}%`, background: graphicColor }} />
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
            <Link href="/entraid/roles?filter=privileged" className="text-3xs" style={{ color: CLOUD_TIER_ACCENT_TEXT.entraId[isDark ? 'dark' : 'light'] }}>{t('action.seeAll')}</Link>
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {privilegedRoles === 0 && <p className="text-tiny text-fg-muted px-2 py-1">Nenhuma role privilegiada catalogada.</p>}
            {ROLES.filter((r) => r.isPrivileged).slice(0, 12).map((role) => {
              const meta = EAM_META[role.eamTier]
              const neutral = isDark ? meta.darkText : meta.textColor
              const pillColor = resolveTierAccent('entraId', meta.textColor, neutral, isDark)
              const pillText = resolveTierAccent('entraId', meta.textColor, neutral, isDark, 'text')
              return (
                <Link key={role.slug} href={`/entraid/roles/${role.slug}`}
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

      {/* Categories grid */}
      <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('section.byCategory')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {catCounts.map(({ cat, count }) => {
            const meta = CATEGORY_META[cat]
            // Ícone e contagem levam a marca da cloud (mesma fonte do Risk
            // Tier — src/lib/cloudTierAccent.ts): aqui é identidade da seção
            // inteira, não codificação por categoria — todas as categorias
            // desta cloud usam a MESMA cor, então não reabre a colisão de
            // matiz por categoria que tirou a cor daqui em 06/08.
            const color = CLOUD_TIER_ACCENT_TEXT.entraId[isDark ? 'dark' : 'light']
            return (
              <Link key={cat} href={`/entraid/roles?category=${cat}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border dark:border-gray-700 bg-surface-faint dark:bg-gray-800 hover:bg-brand-soft dark:hover:bg-brand-activeBg hover:border-brand-mid dark:hover:border-brand-activeRing transition-colors">
                <span className="shrink-0" style={{ color }}>{CATEGORY_ICONS[cat]}</span>
                <div className="min-w-0">
                  <p className="text-3xs font-medium text-gray-800 dark:text-gray-100 truncate">{meta.label}</p>
                  <p className="text-2xs" style={{ color }}>{count} roles</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Info bar */}
      {(() => {
        const bar = cloudInfoBarStyle('entraId', isDark)
        return (
      <div className="rounded-xl border px-5 py-4 flex items-start gap-3" style={{ borderColor: bar.border, background: bar.background }}>
        <Shield size={15} className="mt-0.5 shrink-0" style={{ color: bar.text }} />
        <p className="text-tiny leading-relaxed" style={{ color: bar.text }}>
          <strong>Custom Roles</strong> permitem composição granular de permissões, mas nem todas as permissões das built-in
          roles estão disponíveis no catálogo. Requer licença Entra ID P1 ou P2. Consulte via{' '}
          <code className="font-mono text-3xs px-1 rounded" style={{ background: bar.codeBackground }}>
            GET /roleManagement/directory/resourceActions
          </code>{' '}
          para ver o catálogo completo.
        </p>
      </div>
        )
      })()}
    </div>
  )
}
