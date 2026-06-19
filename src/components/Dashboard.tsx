'use client'

import Link from 'next/link'
import { AlertTriangle, Star, ExternalLink, Shield, Layers, ChevronRight, KeyRound } from 'lucide-react'
import { ROLES, EAM_META, EamTier } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { useTheme } from './ThemeProvider'
import CategoryBadge from './CategoryBadge'
import EamTierBadge from './EamTierBadge'

const TOP_ROLES = [
  'Global Administrator', 'Conditional Access Administrator', 'Privileged Role Administrator',
  'Security Administrator', 'User Administrator', 'Application Administrator',
]

const TIER_ORDER: EamTier[] = ['ControlPlane', 'ManagementPlane', 'UserAccess']

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

  return (
    <div className="p-6 max-w-4xl">
      {/* Stats - agora clicáveis */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Built-in Roles" value={totalRoles} accent href="/roles" />
        <StatCard label="Control Plane" value={controlPlaneRoles} danger href="/roles?tier=ControlPlane" />
        <StatCard label="Privilegiadas" value={privilegedRoles} href="/roles?filter=privileged" />
        <StatCard label="API Permissions" value={API_PERMISSIONS.length} href="/api-permissions" />
      </div>

      {/* EAM tier breakdown - cada linha clicável */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-1.5 mb-3">
          <Layers size={14} className="text-[#0078d4] dark:text-[#85b7eb]" />
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
            Classificação por Enterprise Access Model
          </h2>
        </div>
        <div className="space-y-2">
          {TIER_ORDER.map((tier) => {
            const meta = EAM_META[tier]
            const count = tierStats[tier] || 0
            return (
              <Link key={tier} href={`/roles?tier=${tier}`}
                className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div className="w-32 shrink-0 pt-0.5">
                  <EamTierBadge tier={tier} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full"
                        style={{ width: `${(count / totalRoles) * 100}%`, background: isDark ? meta.darkText : meta.textColor }} />
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 w-6 text-right">{count}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{meta.description}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 group-hover:text-[#0078d4] dark:group-hover:text-[#85b7eb] mt-1 shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-2">Sobre este site</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
            Referência para roles e API permissions do Microsoft Entra ID, com classificação por tier do
            Enterprise Access Model. Inspirado no{' '}
            <a href="https://azure.permissions.cloud" target="_blank" rel="noopener noreferrer"
              className="text-[#0078d4] dark:text-[#85b7eb] hover:underline inline-flex items-center gap-0.5">
              azure.permissions.cloud <ExternalLink size={11} />
            </a>{' '}
            e nas classificações do{' '}
            <a href="https://github.com/Cloud-Architekt/AzurePrivilegedIAM" target="_blank" rel="noopener noreferrer"
              className="text-[#0078d4] dark:text-[#85b7eb] hover:underline inline-flex items-center gap-0.5">
              EntraOps <ExternalLink size={11} />
            </a>.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Star size={14} className="text-amber-500" />
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Roles mais consultadas</h2>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {TOP_ROLES.slice(0, 5).map((name) => {
              const role = ROLES.find((r) => r.name === name)
              if (!role) return null
              return (
                <Link key={name} href={`/roles/${role.slug}`}
                  className="text-left flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-[#e8f1fb] dark:hover:bg-[#0c2a47] border border-gray-200 dark:border-gray-700 hover:border-[#9dc3e8] rounded-md px-2.5 py-1.5 transition-colors">
                  <span className="text-[12px] font-medium text-[#0078d4] dark:text-[#85b7eb] flex-1 truncate">{role.name}</span>
                  {role.isPrivileged && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
                  <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Shield size={16} className="text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300 mb-1">Custom Roles</p>
            <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Custom roles permitem composição granular de permissões, mas nem todas as permissões das built-in
              roles estão disponíveis no catálogo. Requer licença Entra ID P1 ou P2. Consulte via{' '}
              <code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-900 px-1 rounded">
                GET /roleManagement/directory/resourceActions
              </code>{' '}
              para ver o catálogo completo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent, danger, href }: {
  label: string; value: number | string; accent?: boolean; danger?: boolean; href: string
}) {
  return (
    <Link href={href}
      className="block bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-3.5 transition-colors group">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
        {label}
        <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </p>
      <p className={`font-semibold text-[22px] ${
        danger ? 'text-red-600 dark:text-red-400'
        : accent ? 'text-[#0078d4] dark:text-[#85b7eb]'
        : 'text-gray-800 dark:text-gray-100'
      }`}>
        {value}
      </p>
    </Link>
  )
}
