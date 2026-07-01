'use client'

import Link from 'next/link'
import { AlertTriangle, Star, Shield, ChevronRight, Users, AppWindow, Lock, FileCheck, Monitor } from 'lucide-react'
import { ROLES, EAM_META, EamTier, CATEGORY_META, RoleCategory } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { useTheme } from './ThemeProvider'

const TOP_ROLES = [
  'Global Administrator', 'Conditional Access Administrator', 'Privileged Role Administrator',
  'Security Administrator', 'User Administrator', 'Application Administrator',
]

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
    <div className="max-w-5xl px-6 py-6 space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Built-in Roles',  value: totalRoles,          href: '/roles',                      color: '#0078d4' },
          { label: 'Control Plane',   value: controlPlaneRoles,   href: '/roles?tier=ControlPlane',     color: '#dc2626' },
          { label: 'Privilegiadas',   value: privilegedRoles,     href: '/roles?filter=privileged',     color: '#6b7280' },
          { label: 'API Permissions', value: API_PERMISSIONS.length, href: '/api-permissions',          color: '#6b7280' },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm hover:border-[#0078d4]/40 dark:hover:border-[#0078d4]/30 transition-colors group">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              {s.label}<ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-[28px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Two-column: EAM distribution + Roles mais consultadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribuição por Enterprise Access Model</h2>
          <div className="space-y-3">
            {TIER_ORDER.map((tier) => {
              const meta = EAM_META[tier]
              const count = tierStats[tier] || 0
              const color = isDark ? meta.darkText : meta.textColor
              return (
                <Link key={tier} href={`/roles?tier=${tier}`} className="block group">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[12px] text-gray-600 dark:text-gray-400 group-hover:underline">{meta.label}</span>
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color }}>{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                    <div className="h-1 rounded-full" style={{ width: `${(count / totalRoles) * 100}%`, background: color }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Star size={13} className="text-amber-500" /> Roles mais consultadas
          </h2>
          <div className="space-y-1.5">
            {TOP_ROLES.slice(0, 6).map((name) => {
              const role = ROLES.find((r) => r.name === name)
              if (!role) return null
              return (
                <Link key={name} href={`/roles/${role.slug}`}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-[#e8f1fb] dark:hover:bg-[#0c2a47] border border-[#dde3ec] dark:border-gray-700 hover:border-[#9dc3e8] rounded-md px-2.5 py-1.5 transition-colors">
                  <span className="text-[12px] font-medium text-[#0078d4] dark:text-[#85b7eb] flex-1 truncate">{role.name}</span>
                  {role.isPrivileged && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
                  <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Categories grid */}
      <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Por Categoria</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {catCounts.map(({ cat, count }) => {
            const meta = CATEGORY_META[cat]
            const color = isDark ? meta.darkText : meta.textColor
            return (
              <Link key={cat} href={`/roles?category=${cat}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-[#f7f9fc] dark:bg-gray-800 hover:bg-[#e8f1fb] dark:hover:bg-[#0c2a47] hover:border-[#9dc3e8] dark:hover:border-[#185fa5] transition-colors">
                <span className="shrink-0" style={{ color }}>{CATEGORY_ICONS[cat]}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-800 dark:text-gray-100 truncate">{meta.label}</p>
                  <p className="text-[10px] text-gray-400">{count} roles</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Info bar */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 px-5 py-4 flex items-start gap-3">
        <Shield size={15} className="text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong className="text-amber-800 dark:text-amber-300">Custom Roles</strong> permitem composição granular de permissões, mas nem todas as permissões das built-in
          roles estão disponíveis no catálogo. Requer licença Entra ID P1 ou P2. Consulte via{' '}
          <code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-900 px-1 rounded">
            GET /roleManagement/directory/resourceActions
          </code>{' '}
          para ver o catálogo completo.
        </p>
      </div>
    </div>
  )
}
