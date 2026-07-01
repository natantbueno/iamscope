'use client'

import AppShell from '@/components/AppShell'
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

const TYPE_COLORS: Record<string, string> = {
  'managed': '#0891b2',
  'service-role': '#7c3aed',
  'permission-set': '#16a34a',
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  IAM: <ShieldCheck size={15} />, Compute: <Server size={15} />, Storage: <HardDrive size={15} />,
  Database: <Database size={15} />, Networking: <Network size={15} />, Security: <Lock size={15} />,
  DevOps: <Code size={15} />, Serverless: <Zap size={15} />, Containers: <Box size={15} />,
  AI: <BrainCircuit size={15} />, Analytics: <BarChart2 size={15} />, Management: <Settings size={15} />,
  IoT: <Cpu size={15} />, Billing: <CreditCard size={15} />, Messaging: <MessageSquare size={15} />,
}

export default function AwsDashboard() {
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

  const byType = {
    managed: AWS_POLICIES.filter(p => p.type === 'managed').length,
    'service-role': AWS_POLICIES.filter(p => p.type === 'service-role').length,
    'permission-set': AWS_POLICIES.filter(p => p.type === 'permission-set').length,
  }

  return (
    <AppShell headerTitle="AWS IAM" headerSub="Managed Policies, Service Roles e Permission Sets">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-4xl">

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Policies', value: total,              href: '/aws/policies',                   color: '#ff9900' },
              { label: 'Privileged',     value: privileged.length,  href: '/aws/policies?filter=privileged', color: '#dc2626' },
              { label: 'FullAccess',     value: fullAccess.length,  href: '/aws/policies?filter=FullAccess', color: AWS_TIER_META.FullAccess.color },
              { label: 'Categorias',     value: catCounts.length,   href: '/aws/policies',                   color: '#7c3aed' },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm hover:border-[#ff9900]/40 dark:hover:border-[#ff9900]/30 transition-colors group">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  {s.label}<ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-[28px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Tier distribution */}
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribuição por Tier</h2>
              <div className="space-y-3">
                {tierCounts.map(({ tier, count, meta }) => (
                  <Link key={tier} href={`/aws/policies?filter=${tier}`} className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium group-hover:underline" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxTier) * 100}%`, background: meta.color }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Policy type breakdown */}
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Tipo de Policy</h2>
              <div className="space-y-3">
                {(Object.entries(byType) as [string, number][]).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[type] }} />
                    <span className="flex-1 text-[12px] text-gray-600 dark:text-gray-400 font-medium capitalize">{type.replace('-', ' ')}</span>
                    <span className="text-[12px] font-bold" style={{ color: TYPE_COLORS[type] }}>{count}</span>
                  </div>
                ))}
                <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2 leading-relaxed">
                  AWS Managed — criadas e mantidas pela AWS.<br />
                  Service Roles — para serviços assumirem ações.<br />
                  Permission Sets — Identity Center multi-conta.
                </p>
              </div>
            </div>
          </div>

          {/* Privileged policies */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Policies Privilegiadas</h2>
              <Link href="/aws/policies?filter=privileged" className="text-[11px] text-[#ff9900] hover:underline">ver todas</Link>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {privileged.slice(0, 12).map(p => (
                <Link key={p.slug} href={`/aws/policies/${p.slug}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <ShieldAlert size={12} className="text-red-500 shrink-0" />
                  <span className="flex-1 text-[12px] text-gray-700 dark:text-gray-300 group-hover:text-[#ff9900] transition-colors">{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: AWS_TIER_META[p.tier].bg, color: AWS_TIER_META[p.tier].color }}>{p.tier}</span>
                  <ChevronRight size={11} className="text-gray-300 dark:text-gray-600 group-hover:text-[#ff9900]" />
                </Link>
              ))}
            </div>
          </div>

          {/* Categories grid */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Por Categoria</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {catCounts.map(({ cat, count }) => (
                <Link key={cat} href={`/aws/policies?category=${cat}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-[#f7f9fc] dark:bg-gray-800 hover:bg-[#fff8ec] dark:hover:bg-[#2a1800] hover:border-[#ff9900]/40 transition-colors">
                  <span className="shrink-0" style={{ color: CAT_COLORS[cat] ?? '#ff9900' }}>{CAT_ICONS[cat] ?? <Shield size={15} />}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                    <p className="text-[10px] text-gray-400">{count} policies</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Info bar */}
          <div className="text-[12px] text-gray-400 dark:text-gray-500 px-1 border-l-2 border-[#ff9900]/40 pl-3">
            AWS IAM Managed Policies são mantidas e atualizadas pela AWS. Service Roles permitem que serviços AWS assumam permissões de forma segura.
            Permission Sets são usados via IAM Identity Center para acesso federado em múltiplas contas.
          </div>

        </div>
      </div>
    </AppShell>
  )
}
