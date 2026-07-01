'use client'

import Link from 'next/link'
import { Shield, Package, Database, Server, Network, Lock, Code, Box, Zap, MessageSquare, BarChart2, Activity, Cpu, CreditCard, Settings, ChevronRight } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { OCI_POLICIES, OCI_TIER_META, OciTier, OciCategory } from '@/data/oci'

const TIERS: OciTier[] = ['Manage', 'Use', 'Read', 'Inspect']

const CAT_ICONS: Record<OciCategory, React.ReactNode> = {
  Identity:   <Shield size={14} />,
  Compute:    <Server size={14} />,
  Storage:    <Package size={14} />,
  Networking: <Network size={14} />,
  Database:   <Database size={14} />,
  Security:   <Lock size={14} />,
  DevOps:     <Code size={14} />,
  Containers: <Box size={14} />,
  Serverless: <Zap size={14} />,
  Messaging:  <MessageSquare size={14} />,
  Analytics:  <BarChart2 size={14} />,
  Monitoring: <Activity size={14} />,
  AI:         <Cpu size={14} />,
  Billing:    <CreditCard size={14} />,
  Management: <Settings size={14} />,
}

const CAT_COLORS: Record<OciCategory, string> = {
  Identity:   '#6366f1', Compute:    '#0891b2', Storage:    '#0d9488',
  Networking: '#8b5cf6', Database:   '#0ea5e9', Security:   '#dc2626',
  DevOps:     '#f59e0b', Containers: '#06b6d4', Serverless: '#a855f7',
  Messaging:  '#10b981', Analytics:  '#f97316', Monitoring: '#64748b',
  AI:         '#ec4899', Billing:    '#84cc16', Management: '#6b7280',
}

const OCI_COLOR = '#C74634'

export default function OciDashboardPage() {
  const total     = OCI_POLICIES.length
  const privileged = OCI_POLICIES.filter(p => p.isPrivileged).length
  const manage    = OCI_POLICIES.filter(p => p.tier === 'Manage').length
  const cats      = new Set(OCI_POLICIES.map(p => p.category)).size

  const tierDist = TIERS.map(t => ({
    tier: t,
    count: OCI_POLICIES.filter(p => p.tier === t).length,
    meta: OCI_TIER_META[t],
  }))
  const maxTier = Math.max(...tierDist.map(d => d.count))

  const catDist = Object.entries(
    OCI_POLICIES.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1; return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const privilegedPolicies = OCI_POLICIES.filter(p => p.isPrivileged).slice(0, 8)

  return (
    <AppShell headerTitle="OCI IAM" headerSub={`${total} policy patterns · Oracle Cloud Infrastructure · Verb-based access model`}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl px-6 py-5 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          {([
            { label: 'Total Policies', value: total,     href: '/oci/policies',                   color: OCI_COLOR },
            { label: 'Privileged',     value: privileged, href: '/oci/policies?privileged=true',  color: '#dc2626' },
            { label: 'Manage Tier',    value: manage,     href: '/oci/policies?tier=Manage',      color: '#ea580c' },
            { label: 'Categories',     value: cats,       href: '/oci/policies',                  color: '#7c3aed' },
          ] as {label:string;value:number;href:string;color:string}[]).map(s => (
            <Link key={s.label} href={s.href}
              className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm hover:border-[#C74634]/40 dark:hover:border-[#C74634]/30 transition-colors group">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                {s.label}<ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-[28px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tier distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
            <p className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-3">Distribuição por Verb Tier</p>
            <div className="space-y-2.5">
              {tierDist.map(({ tier, count, meta }) => (
                <div key={tier} className="flex items-center gap-3">
                  <span className="text-[11px] font-medium w-16 shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${(count / maxTier) * 100}%`, background: meta.color }} />
                  </div>
                  <span className="text-[11px] text-gray-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              {TIERS.map(t => (
                <div key={t} className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: OCI_TIER_META[t].bg, color: OCI_TIER_META[t].color }}>{OCI_TIER_META[t].label}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{OCI_TIER_META[t].description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Privileged policies */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
            <p className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-3">Políticas Privilegiadas</p>
            <div className="space-y-1.5">
              {privilegedPolicies.map(p => {
                const meta = OCI_TIER_META[p.tier]
                return (
                  <Link key={p.slug} href={`/oci/policies/${p.slug}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    <span className="text-[12px] text-gray-700 dark:text-gray-300 group-hover:text-[#C74634] transition-colors truncate">{p.name}</span>
                  </Link>
                )
              })}
            </div>
            <Link href="/oci/policies?privileged=true" className="mt-3 block text-[11px] text-[#C74634] hover:underline">
              Ver todas privilegiadas →
            </Link>
          </div>
        </div>

        {/* Categories grid */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Por Categoria</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {catDist.map(([cat, count]) => (
              <Link key={cat} href={`/oci/policies?category=${encodeURIComponent(cat)}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-[#f7f9fc] dark:bg-gray-800 hover:bg-[#fdf2f0] dark:hover:bg-[#2a0a06] hover:border-[#C74634]/40 transition-colors">
                <span className="shrink-0" style={{ color: CAT_COLORS[cat as OciCategory] ?? '#C74634' }}>
                  {CAT_ICONS[cat as OciCategory]}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-800 dark:text-gray-100 truncate">{cat}</p>
                  <p className="text-[10px] text-gray-400">{count} policies</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Info bar */}
        <div className="text-[11px] text-gray-400 dark:text-gray-600 flex items-center gap-4 pb-2">
          <span>OCI IAM usa verbos: <strong className="text-gray-500">inspect · read · use · manage</strong></span>
          <span>·</span>
          <a href="https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policygetstarted.htm" target="_blank" rel="noopener" className="hover:text-[#C74634] transition-colors">Oracle IAM Docs ↗</a>
          <span>·</span>
          <a href="https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/policyreference.htm" target="_blank" rel="noopener" className="hover:text-[#C74634] transition-colors">Policy Reference ↗</a>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
