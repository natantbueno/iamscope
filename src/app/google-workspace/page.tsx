'use client'

import AppShell from '@/components/AppShell'
import { GWS_ROLES, GWS_SCOPES, GWS_TIER_META, GwsTier } from '@/data/googleWorkspace'
import Link from 'next/link'
import {
  Shield, ShieldAlert, ChevronRight, ExternalLink, Info,
  Users, Mail, HardDrive, Chrome, Lock,
} from 'lucide-react'

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
      <div className="p-6 max-w-4xl space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Admin Roles"    value={total}      accent href="/google-workspace/roles" />
          <StatCard label="OAuth Scopes"   value={scopes}     blue   href="/google-workspace/api-permissions" />
          <StatCard label="Privilegiadas"  value={privileged}        href="/google-workspace/roles?filter=privileged" />
          <StatCard label="Restricted Scopes" value={restricted} danger href="/google-workspace/api-permissions?sensitivity=restricted" />
        </div>

        {/* Tier breakdown */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <Shield size={14} className="text-[#34a853] dark:text-[#4ade80]" />
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
              Classificação por Admin Tier
            </h2>
          </div>
          <div className="space-y-2">
            {byTier.map(({ tier, count, meta }) => (
              <Link key={tier} href={`/google-workspace/roles?tier=${tier}`}
                className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div className="w-40 shrink-0 pt-0.5">
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
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 w-6 text-right tabular-nums">{count}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug line-clamp-1">{meta.description}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 group-hover:text-[#34a853] dark:group-hover:text-[#4ade80] mt-1 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Roles Privilegiadas */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldAlert size={14} className="text-red-500" />
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Roles Privilegiadas</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {GWS_ROLES.filter((r) => r.isPrivileged).slice(0, 6).map((role) => {
              const meta = GWS_TIER_META[role.tier]
              return (
                <Link key={role.slug} href={`/google-workspace/roles/${role.slug}`}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-[#0a2010] border border-[#dde3ec] dark:border-gray-700 hover:border-green-300 rounded-md px-2.5 py-1.5 transition-colors">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: meta.darkBg, color: meta.darkText }}>{meta.short}</span>
                  <span className="text-[12px] font-medium text-[#34a853] dark:text-[#4ade80] flex-1 truncate">{role.name}</span>
                  <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Por Categoria</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {categories.sort().map((cat) => {
              const count = GWS_ROLES.filter((r) => r.category === cat).length
              return (
                <Link key={cat} href={`/google-workspace/roles?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-[#f7f9fc] dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-[#0a2010] hover:border-green-300 dark:hover:border-green-800 transition-colors">
                  <span className="text-[#34a853] dark:text-[#4ade80] shrink-0">{CATEGORY_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-[10px] text-gray-400">{count} roles</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Info bar */}
        <div className="bg-green-950/30 border border-green-900 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info size={15} className="text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-green-300 mb-1">OAuth 2.0 & Service Accounts</p>
              <p className="text-[12px] text-green-400 leading-relaxed">
                Os escopos OAuth do Google Workspace definem o que uma aplicação pode acessar em nome de um usuário.
                Escopos <strong className="text-green-300">Restricted</strong> exigem aprovação do Google antes de uso em apps publicados.
                Use{' '}
                <code className="font-mono text-[11px] bg-green-950 px-1 rounded">gam oauth info</code>{' '}
                para inspecionar os tokens ativos no seu domínio.
              </p>
            </div>
          </div>
        </div>

      </div>
      </div>
    </AppShell>
  )
}

function StatCard({ label, value, accent, blue, danger, href }: {
  label: string; value: number; accent?: boolean; blue?: boolean; danger?: boolean; href: string
}) {
  const color = danger ? '#dc2626' : accent ? '#34a853' : blue ? '#4285f4' : '#6b7280'
  return (
    <Link href={href}
      className="block bg-white dark:bg-gray-900 rounded-lg p-4 border border-[#dde3ec] dark:border-gray-800 shadow-sm hover:border-[#34a853]/40 dark:hover:border-[#34a853]/30 transition-colors group">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {label}
        <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </p>
      <p className="text-[28px] font-bold leading-none" style={{ color }}>{value}</p>
    </Link>
  )
}
