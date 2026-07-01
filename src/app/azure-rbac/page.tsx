'use client'

import AppShell from '@/components/AppShell'
import { AZURE_ROLES, AZURE_TIER_META, AzureRbacTier } from '@/data/azureRbac'
import Link from 'next/link'
import {
  Shield, ShieldAlert, Database, HardDrive, Network, Eye, Cpu, Boxes,
  ChevronRight, ExternalLink, Info,
} from 'lucide-react'

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

const TOP_ROLES = [
  'Owner', 'Contributor', 'User Access Administrator',
  'Security Admin', 'Key Vault Administrator',
]

export default function AzureRbacDashboard() {
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
      <div className="p-6 max-w-4xl space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Built-in Roles"  value={total}            accent href="/azure-rbac/roles" />
          <StatCard label="Full Control"    value={byTier[0].count}  danger href="/azure-rbac/roles?tier=FullControl" />
          <StatCard label="Privilegiadas"   value={privileged}              href="/azure-rbac/roles?filter=privileged" />
          <StatCard label="Categorias"      value={categories.length}       href="/azure-rbac/roles" />
        </div>

        {/* ── Risk Tier breakdown ── */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <Shield size={14} className="text-[#0078d4] dark:text-[#85b7eb]" />
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
              Classificação por Risk Tier
            </h2>
          </div>
          <div className="space-y-2">
            {byTier.map(({ tier, count, meta }) => (
              <Link key={tier} href={`/azure-rbac/roles?tier=${tier}`}
                className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div className="w-36 shrink-0 pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
                    {meta.short} — {meta.label}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${(count / total) * 100}%`, backgroundColor: meta.darkText }} />
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 w-8 text-right tabular-nums">{count}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug line-clamp-1">{meta.description}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 group-hover:text-[#0078d4] dark:group-hover:text-[#85b7eb] mt-1 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Roles Privilegiadas ── */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldAlert size={14} className="text-red-500" />
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Roles Privilegiadas</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {AZURE_ROLES.filter((r) => r.isPrivileged).slice(0, 6).map((role) => {
              const meta = AZURE_TIER_META[role.tier]
              return (
                <Link key={role.slug} href={`/azure-rbac/roles/${role.slug}`}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-[#e8f1fb] dark:hover:bg-[#0c2a47] border border-[#dde3ec] dark:border-gray-700 hover:border-[#9dc3e8] rounded-md px-2.5 py-1.5 transition-colors">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: meta.darkBg, color: meta.darkText }}>{meta.short}</span>
                  <span className="text-[12px] font-medium text-[#0078d4] dark:text-[#85b7eb] flex-1 truncate">{role.name}</span>
                  <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Categories grid ── */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Por Categoria</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {categories.sort().map((cat) => {
              const count = AZURE_ROLES.filter((r) => r.category === cat).length
              return (
                <Link key={cat} href={`/azure-rbac/roles?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-[#f7f9fc] dark:bg-gray-800 hover:bg-[#e8f1fb] dark:hover:bg-[#0c2a47] hover:border-[#9dc3e8] dark:hover:border-[#185fa5] transition-colors">
                  <span className="text-[#0078d4] dark:text-[#85b7eb] shrink-0">{CATEGORY_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-[10px] text-gray-400">{count} roles</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Info bar ── */}
        <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-blue-300 mb-1">Assignable Scopes</p>
              <p className="text-[12px] text-blue-400 leading-relaxed">
                Roles são atribuídas em escopos específicos: Management Group, Subscription, Resource Group ou Resource individual.
                O escopo efetivo de cada role está visível na página de detalhes.
                Use{' '}
                <code className="font-mono text-[11px] bg-blue-950 px-1 rounded">az role assignment list --all</code>{' '}
                para listar atribuições ativas no seu tenant.
              </p>
            </div>
          </div>
        </div>

      </div>
      </div>
    </AppShell>
  )
}

function StatCard({ label, value, accent, danger, href }: {
  label: string; value: number | string; accent?: boolean; danger?: boolean; href: string
}) {
  const color = danger ? '#dc2626' : accent ? '#0078d4' : '#6b7280'
  return (
    <Link href={href}
      className="block bg-white dark:bg-gray-900 rounded-lg p-4 border border-[#dde3ec] dark:border-gray-800 shadow-sm hover:border-[#0078d4]/40 dark:hover:border-[#0078d4]/30 transition-colors group">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {label}
        <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </p>
      <p className="text-[28px] font-bold leading-none" style={{ color }}>{value}</p>
    </Link>
  )
}
