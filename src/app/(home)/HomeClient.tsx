'use client'

import Link from 'next/link'
import { Github, Info, Sparkles, GitCompare, FileJson, ShieldAlert, ScanSearch, ShieldCheck } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { SOD_RULES } from '@/data/sod/rules'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import type { TranslationKey } from '@/i18n/dictionary'
import type { CloudCard } from './clouds'

export default function HomeClient({ clouds }: { clouds: CloudCard[] }) {
  const t = useT()
  const fmt = useNumberFormat()
  const maxTotal = Math.max(...clouds.map((c) => c.total))

  return (
    <AppShell
      headerTitle="Multi-Cloud IAM Reference"
      headerSub={t('home.tagline')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* fundo sutil: gradientes com as cores csp.* em baixíssima opacidade */}
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-csp-azure/10 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-tl from-csp-gcp/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

          <div className="relative max-w-5xl px-6 py-6 space-y-10">

            {/* Hero */}
            <section className="text-center pt-10 pb-2">
              <h1 className="text-display-sm sm:text-display-lg font-bold tracking-tight text-gray-800 dark:text-gray-50 mb-3">
                Multi-Cloud IAM Reference
              </h1>
              <p className="text-body sm:text-note text-fg-muted max-w-2xl mx-auto leading-relaxed mb-6">
                Roles, permissions and policies for 6 cloud providers — with EAM classification,
                SoD analysis and risk evaluation
              </p>
            </section>

            {/* Cloud Grid */}
            <section id="clouds">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clouds.map((cloud) => (
                  <Link
                    key={cloud.href}
                    href={cloud.href}
                    className={`group block p-5 rounded-xl bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 ${cloud.hoverBorder} hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 shadow-card`}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${cloud.dotClass} transition-transform duration-150 group-hover:scale-125`} aria-hidden="true" />
                      <span className="text-note font-semibold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-150">{cloud.name}</span>
                    </div>
                    <p className="text-tiny text-fg-muted transition-colors duration-150">
                      {cloud.metrics.map((m, i) => (
                        <span key={m.label}>
                          {i > 0 && ' · '}
                          {fmt(m.n)} {m.label.includes('.') ? t(m.label as TranslationKey) : m.label}
                        </span>
                      ))}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Gráfico de Cobertura — CSS puro, width proporcional ao maior total */}
            <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5 shadow-card">
              <h2 className="text-note font-semibold text-gray-700 dark:text-gray-200 mb-4">
                {t('home.itemsPerCloud')}
              </h2>
              <div className="space-y-3">
                {clouds.map((cloud) => (
                  <div key={cloud.href} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-tiny text-fg-muted text-right">{cloud.name}</span>
                    <div className="flex-1 h-4 rounded bg-surface-muted dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded ${cloud.barClass}`}
                        style={{ width: `${Math.max((cloud.total / maxTotal) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-tiny font-mono text-gray-600 dark:text-gray-300">
                      {fmt(cloud.total)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Ferramentas */}
            <section>
              <h2 className="text-note font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('info.toolsTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ToolCard
                  href="/advisor"
                  color="violet"
                  beta
                  icon={<Sparkles size={18} />}
                  title="Role Advisor"
                  description="Get role recommendations based on job function and access needs"
                />
                <ToolCard
                  href="/compare"
                  color="blue"
                  beta
                  icon={<GitCompare size={18} />}
                  title="Multi-Cloud Compare"
                  description="Side-by-side tier equivalences across all clouds"
                />
                <ToolCard
                  href="/evaluate"
                  color="emerald"
                  beta
                  icon={<FileJson size={18} />}
                  title="Role Evaluator"
                  description="Paste any role JSON and get instant risk analysis"
                />
                <ToolCard
                  href="/sod"
                  color="amber"
                  beta
                  icon={<ShieldAlert size={18} />}
                  title="SoD Analyzer"
                  description={`${SOD_RULES.length} conflict rules across Entra ID and Azure RBAC`}
                />
                <ToolCard
                  href="/permission-scope"
                  color="teal"
                  beta
                  icon={<ScanSearch size={18} />}
                  title="Permission Scope"
                  description="Find every role that grants a given permission, across all 6 clouds"
                />
                <ToolCard
                  href="/tier-comparison"
                  color="red"
                  icon={<ShieldCheck size={18} />}
                  title="Tier 0 Comparison"
                  description="Compare Tier 0 privileged access across all cloud platforms"
                />
              </div>
            </section>

            {/* Footer mínimo */}
            <footer className="border-t border-surface-border dark:border-gray-800 pt-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-tiny text-fg-muted">
                Data sourced from official documentation and EntraOps/Cloud-Architekt
              </p>
              <div className="flex items-center gap-5">
                <a
                  href="https://github.com/natebzurg/entraid.permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-tiny text-fg-muted hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
                >
                  <Github size={13} /> GitHub
                </a>
                <a
                  href="https://github.com/natebzurg/entraid.permissions/commits/main"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tiny text-fg-muted hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
                >
                  Changelog
                </a>
                <Link
                  href="/info"
                  className="inline-flex items-center gap-1.5 text-tiny text-fg-muted hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
                >
                  <Info size={13} /> Info
                </Link>
              </div>
            </footer>

          </div>
        </div>
      </div>
    </AppShell>
  )
}

// Mesmo esquema de cores dos botões de ferramentas globais na Sidebar
// (violet=Advisor, blue=Compare, emerald=Evaluator, amber=SoD, red=Tier 0).
const TOOL_COLORS = {
  violet:  { card: 'bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/60 border-violet-200 dark:border-violet-800/50 hover:border-violet-300 dark:hover:border-violet-700/70',   icon: 'text-violet-600 dark:text-violet-400',  title: 'text-violet-700 dark:text-violet-300 group-hover:text-violet-800 dark:group-hover:text-violet-200',   betaText: 'text-violet-800 dark:text-violet-400',  betaBg: 'bg-violet-100 dark:bg-violet-900/60' },
  blue:    { card: 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700/70',           icon: 'text-blue-600 dark:text-blue-400',    title: 'text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200',       betaText: 'text-blue-800 dark:text-blue-400',    betaBg: 'bg-blue-100 dark:bg-blue-900/60' },
  emerald: { card: 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700/70', icon: 'text-emerald-600 dark:text-emerald-400', title: 'text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200', betaText: 'text-emerald-800 dark:text-emerald-400', betaBg: 'bg-emerald-100 dark:bg-emerald-900/60' },
  amber:   { card: 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700/70',       icon: 'text-amber-700 dark:text-amber-400',   title: 'text-amber-700 dark:text-amber-300 group-hover:text-amber-800 dark:group-hover:text-amber-200',     betaText: 'text-amber-800 dark:text-amber-400',   betaBg: 'bg-amber-100 dark:bg-amber-900/60' },
  red:     { card: 'bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700/70',               icon: 'text-red-600 dark:text-red-400',     title: 'text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200',         betaText: 'text-red-800 dark:text-red-400',     betaBg: 'bg-red-100 dark:bg-red-900/60' },
  teal:    { card: 'bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border-teal-200 dark:border-teal-800/50 hover:border-teal-300 dark:hover:border-teal-700/70',           icon: 'text-teal-600 dark:text-teal-400',    title: 'text-teal-700 dark:text-teal-300 group-hover:text-teal-800 dark:group-hover:text-teal-200',       betaText: 'text-teal-800 dark:text-teal-400',    betaBg: 'bg-teal-100 dark:bg-teal-900/60' },
} as const

function ToolCard({ href, icon, title, description, color, beta }: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  color: keyof typeof TOOL_COLORS
  beta?: boolean
}) {
  const c = TOOL_COLORS[color]
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 p-5 rounded-xl border transition-colors duration-150 ${c.card}`}
    >
      <div className={`shrink-0 mt-0.5 ${c.icon}`}>{icon}</div>
      <div>
        <div className={`text-note font-semibold mb-1 inline-flex items-center gap-1.5 ${c.title}`}>
          {title}
          {beta && (
            <span className={`text-micro font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.betaText} ${c.betaBg}`}>
              Beta
            </span>
          )}
        </div>
        <p className="text-tiny text-fg-subtle leading-relaxed">{description}</p>
      </div>
    </Link>
  )
}
