'use client'

import AppShell from '@/components/AppShell'
import { IBM_ROLES, IBM_TIER_META, IbmTier } from '@/data/ibmCloud'
import Link from 'next/link'
import { ShieldAlert, Key, Server, Database, Cloud, Shield, ShieldCheck, Network, Lock, HardDrive, Settings, Activity, Box, Cpu, ChevronRight } from 'lucide-react'

const TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

const CATEGORY_COLORS: Record<string, string> = {
  Identity:          '#7c3aed',
  AccountManagement: '#0f62fe',
  Platform:          '#2563eb',
  Infrastructure:    '#ea580c',
  Compute:           '#0891b2',
  Data:              '#16a34a',
  Security:          '#dc2626',
  Observability:     '#ca8a04',
  Networking:        '#6366f1',
  Classic:           '#78716c',
  CloudFoundry:      '#059669',
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Identity:          <ShieldCheck size={15} />,
  AccountManagement: <Settings size={15} />,
  Platform:          <Cpu size={15} />,
  Infrastructure:    <Server size={15} />,
  Compute:           <Server size={15} />,
  Data:              <Database size={15} />,
  Security:          <Lock size={15} />,
  Observability:     <Activity size={15} />,
  Networking:        <Network size={15} />,
  Classic:           <HardDrive size={15} />,
  CloudFoundry:      <Cloud size={15} />,
}

export default function IbmCloudDashboard() {
  const total        = IBM_ROLES.length
  const privileged   = IBM_ROLES.filter(r => r.isPrivileged).length
  const accountAdmin = IBM_ROLES.filter(r => r.tier === 'AccountAdmin').length
  const iamRoles     = IBM_ROLES.filter(r => r.accessModel === 'iam').length
  const classicRoles = IBM_ROLES.filter(r => r.accessModel === 'classic').length
  const cfRoles      = IBM_ROLES.filter(r => r.accessModel === 'cloud-foundry').length

  const tierCounts = TIERS.map(t => ({
    tier: t,
    count: IBM_ROLES.filter(r => r.tier === t).length,
    meta: IBM_TIER_META[t],
  }))

  const categories = [...new Set(IBM_ROLES.map(r => r.category))].sort()
  const catCounts = categories.map(c => ({
    cat: c,
    count: IBM_ROLES.filter(r => r.category === c).length,
  }))

  return (
    <AppShell
      headerTitle="IBM Cloud IAM"
      headerSub="Referência de roles, plataformas e acessos IBM Cloud"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Roles',   value: total,            href: '/ibm-cloud/roles',                color: '#08bdba' },
              { label: 'Privilegiadas', value: privileged,       href: '/ibm-cloud/roles?filter=privileged', color: '#dc2626' },
              { label: 'Account Admin', value: accountAdmin,     href: '/ibm-cloud/roles?tier=AccountAdmin', color: '#ea580c' },
              { label: 'Categorias',    value: categories.length, href: '/ibm-cloud/roles',               color: '#7c3aed' },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm hover:border-[#08bdba]/40 dark:hover:border-[#08bdba]/30 transition-colors group">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  {s.label}<ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-[28px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              </Link>
            ))}
          </div>

          {/* Access Models */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'IAM', count: iamRoles, color: '#0f62fe', filter: 'iam', desc: 'Recursos IAM-habilitados, Platform & Service roles' },
              { label: 'Classic Infrastructure', count: classicRoles, color: '#78716c', filter: 'classic', desc: 'Permissões Account, Devices, Network, Services' },
              { label: 'Cloud Foundry', count: cfRoles, color: '#059669', filter: 'cloud-foundry', desc: 'Org Manager/Auditor e Space Manager/Developer' },
            ].map(m => (
              <Link key={m.filter} href={`/ibm-cloud/roles?model=${m.filter}`}
                className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4 hover:border-current transition-colors group"
                style={{ ['--hover-color' as string]: m.color } as React.CSSProperties}>
                <div className="text-2xl font-bold mb-1" style={{ color: m.color }}>{m.count}</div>
                <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">{m.label}</div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{m.desc}</p>
              </Link>
            ))}
          </div>

          {/* Two-col: Tier breakdown + Privileged */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribuição por Tier</h2>
              <div className="space-y-3">
                {tierCounts.map(({ tier, count, meta }) => (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                        <span className="text-[12px] text-gray-600 dark:text-gray-400">{meta.label}</span>
                      </div>
                      <span className="text-[12px] font-semibold" style={{ color: meta.color }}>{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                      <div className="h-1 rounded-full" style={{ width: `${(count / total) * 100}%`, background: meta.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-red-500" /> Roles Privilegiadas
              </h2>
              <div className="space-y-1">
                {IBM_ROLES.filter(r => r.isPrivileged).slice(0, 6).map(r => (
                  <Link key={r.slug} href={`/ibm-cloud/roles/${r.slug}`}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group">
                    <span className="text-[11px] text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 truncate mr-2">{r.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: IBM_TIER_META[r.tier].bg, color: IBM_TIER_META[r.tier].color }}>
                      {IBM_TIER_META[r.tier].label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Por Categoria</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {catCounts.map(({ cat, count }) => (
                <Link key={cat} href={`/ibm-cloud/roles?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-[#f7f9fc] dark:bg-gray-800 hover:bg-[#eef3fb] dark:hover:bg-[#0a1a38] hover:border-[#0f62fe]/40 transition-colors">
                  <span className="shrink-0" style={{ color: CATEGORY_COLORS[cat] || '#0f62fe' }}>{CATEGORY_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-[10px] text-gray-400">{count} roles</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Info bar */}
          <div className="rounded-xl border border-[#0f62fe]/30 bg-[#0f62fe]/5 dark:bg-[#0f62fe]/10 px-5 py-4 flex items-start gap-3">
            <Cloud size={15} className="text-[#0f62fe] dark:text-[#4589ff] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#0f62fe] dark:text-[#4589ff] leading-relaxed">
              IBM Cloud utiliza três modelos de acesso: <strong>IAM</strong> (baseado em políticas granulares para recursos modernos), <strong>Classic Infrastructure</strong> (permissões por categorias Account/Devices/Network/Services) e <strong>Cloud Foundry</strong> (acesso por Org e Space para aplicações PaaS).
            </p>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
