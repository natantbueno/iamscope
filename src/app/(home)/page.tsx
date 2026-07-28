// Home page — porta de entrada do site, renderizada DENTRO do layout padrão
// (AppShell: sidebar + CloudNav + header), como as demais páginas.
// Server Component: zero useState/useEffect; todos os números calculados em
// build time a partir dos datasets reais (nunca hardcoded). AppShell é client
// component e recebe este conteúdo como children — mesmo padrão de /entraid/pim.
// Vive no route group (home) — mesma URL "/" — para não colidir com o antigo
// src/app/page.tsx movido para /entraid nesta sessão.
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldAlert, FileJson, GitCompare, Github, Info, Sparkles, ShieldCheck, ScanSearch } from 'lucide-react'

import AppShell from '@/components/AppShell'
import { ROLES } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { AZURE_ROLES } from '@/data/azureRbac'
import { AWS_POLICIES } from '@/data/aws'
import { GCP_ROLES } from '@/data/gcp'
import { GWS_ROLES, GWS_SCOPES } from '@/data/googleWorkspace'
import { OCI_POLICIES } from '@/data/oci'
import { IBM_ROLES } from '@/data/ibmCloud'
import { SOD_RULES } from '@/data/sod/rules'
import { getRoleActions } from '@/lib/roleActions'
import { getAwsActions, getAwsServices } from '@/lib/awsActions'
import { getGcpPermissions, getGcpServices } from '@/lib/gcpPermissions'
import { getOciVerbs, getOciResources } from '@/lib/ociVerbs'
import { getIbmActions, getIbmServices } from '@/lib/ibmActions'

export const metadata: Metadata = {
  title: 'Multi-Cloud IAM Reference',
  description:
    'Roles, permissions and policies for 7 cloud providers — with EAM classification, SoD analysis and risk evaluation.',
}

// ── Stats calculadas em build time ──────────────────────────────────────────

interface CloudCard {
  name: string
  href: string
  metrics: string
  total: number // usado no gráfico de cobertura (itens da listagem principal)
  dotClass: string      // ponto/ícone (token csp.*)
  hoverBorder: string   // borda no hover (token csp.*)
  barClass: string      // barra do gráfico de cobertura
}

function buildClouds(): CloudCard[] {
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  return [
    {
      name: 'Entra ID', href: '/entraid',
      metrics: `${fmt(ROLES.length)} Roles · ${fmt(API_PERMISSIONS.length)} API Permissions · ${fmt(getRoleActions().length)} Role Actions`,
      total: ROLES.length,
      dotClass: 'bg-csp-azure', hoverBorder: 'hover:border-csp-azure', barClass: 'bg-csp-azure',
    },
    {
      name: 'Azure RBAC', href: '/azure-rbac',
      metrics: `${fmt(AZURE_ROLES.length)} Roles · ${fmt(AZURE_ROLES.filter((r) => r.isPrivileged).length)} Privilegiadas · ${fmt([...new Set(AZURE_ROLES.map((r) => r.category))].length)} Categorias`,
      total: AZURE_ROLES.length,
      dotClass: 'bg-csp-azure-hover', hoverBorder: 'hover:border-csp-azure-hover', barClass: 'bg-csp-azure-hover',
    },
    {
      name: 'AWS IAM', href: '/aws',
      metrics: `${fmt(AWS_POLICIES.length)} Policies · ${fmt(getAwsActions().length)} Actions · ${fmt(getAwsServices().length)} Services`,
      total: AWS_POLICIES.length,
      dotClass: 'bg-csp-aws', hoverBorder: 'hover:border-csp-aws', barClass: 'bg-csp-aws',
    },
    {
      name: 'GCP IAM', href: '/gcp',
      metrics: `${fmt(GCP_ROLES.length)} Roles · ${fmt(getGcpPermissions().length)} Permissions · ${fmt(getGcpServices().length)} Services`,
      total: GCP_ROLES.length,
      dotClass: 'bg-csp-gcp', hoverBorder: 'hover:border-csp-gcp', barClass: 'bg-csp-gcp',
    },
    {
      name: 'Google Workspace', href: '/google-workspace',
      metrics: `${fmt(GWS_ROLES.length)} Roles · ${fmt(GWS_ROLES.filter((r) => r.isPrivileged).length)} Privilegiadas · ${fmt(GWS_SCOPES.length)} OAuth Scopes`,
      total: GWS_ROLES.length,
      dotClass: 'bg-csp-gws', hoverBorder: 'hover:border-csp-gws', barClass: 'bg-csp-gws',
    },
    {
      name: 'OCI IAM', href: '/oci',
      metrics: `${fmt(OCI_POLICIES.length)} Policies · ${fmt(getOciVerbs().length)} Verbs · ${fmt(getOciResources().length)} Resources`,
      total: OCI_POLICIES.length,
      dotClass: 'bg-csp-oci', hoverBorder: 'hover:border-csp-oci', barClass: 'bg-csp-oci',
    },
    {
      name: 'IBM Cloud', href: '/ibm-cloud',
      metrics: `${fmt(IBM_ROLES.length)} Roles · ${fmt(getIbmActions().length)} Actions · ${fmt(getIbmServices().length)} Services`,
      total: IBM_ROLES.length,
      dotClass: 'bg-csp-ibm', hoverBorder: 'hover:border-csp-ibm', barClass: 'bg-csp-ibm',
    },
  ]
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  const clouds = buildClouds()
  const maxTotal = Math.max(...clouds.map((c) => c.total))

  return (
    <AppShell
      headerTitle="Multi-Cloud IAM Reference"
      headerSub="Roles, permissions e policies de 7 cloud providers"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* fundo sutil: gradientes com as cores csp.* em baixíssima opacidade */}
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-csp-azure/10 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-tl from-csp-gcp/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

          <div className="relative max-w-5xl px-6 py-6 space-y-10">

            {/* Hero */}
            <section className="text-center pt-10 pb-2">
              <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-gray-800 dark:text-gray-50 mb-3">
                Multi-Cloud IAM Reference
              </h1>
              <p className="text-[13px] sm:text-[14px] text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-6">
                Roles, permissions and policies for 7 cloud providers — with EAM classification,
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
                      <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-150">{cloud.name}</span>
                    </div>
                    <p className="text-[12px] text-white transition-colors duration-150">
                      {cloud.metrics}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Gráfico de Cobertura — CSS puro, width proporcional ao maior total */}
            <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5 shadow-card">
              <h2 className="text-[14px] font-semibold text-gray-700 dark:text-gray-200 mb-4">
                Itens catalogados por cloud
              </h2>
              <div className="space-y-3">
                {clouds.map((cloud) => (
                  <div key={cloud.href} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-[12px] text-gray-500 dark:text-gray-400 text-right">{cloud.name}</span>
                    <div className="flex-1 h-4 rounded bg-surface-muted dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded ${cloud.barClass}`}
                        style={{ width: `${Math.max((cloud.total / maxTotal) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-[12px] font-mono text-gray-600 dark:text-gray-300">
                      {cloud.total.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Ferramentas */}
            <section>
              <h2 className="text-[14px] font-semibold text-gray-700 dark:text-gray-200 mb-4">Ferramentas</h2>
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
                  description="Find every role that grants a given permission, across all 7 clouds"
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
              <p className="text-[12px] text-gray-500">
                Data sourced from official documentation and EntraOps/Cloud-Architekt
              </p>
              <div className="flex items-center gap-5">
                <a
                  href="https://github.com/natebzurg/entraid.permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
                >
                  <Github size={13} /> GitHub
                </a>
                <a
                  href="https://github.com/natebzurg/entraid.permissions/commits/main"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
                >
                  Changelog
                </a>
                <Link
                  href="/info"
                  className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
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
  violet:  { card: 'bg-violet-950/60 hover:bg-violet-900/60 border-violet-800/50 hover:border-violet-700/70',   icon: 'text-violet-400',  title: 'text-violet-300 group-hover:text-violet-200',   betaText: 'text-violet-500',  betaBg: 'bg-violet-900/60' },
  blue:    { card: 'bg-blue-950/60 hover:bg-blue-900/60 border-blue-800/50 hover:border-blue-700/70',           icon: 'text-blue-400',    title: 'text-blue-300 group-hover:text-blue-200',       betaText: 'text-blue-500',    betaBg: 'bg-blue-900/60' },
  emerald: { card: 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-800/50 hover:border-emerald-700/70', icon: 'text-emerald-400', title: 'text-emerald-300 group-hover:text-emerald-200', betaText: 'text-emerald-500', betaBg: 'bg-emerald-900/60' },
  amber:   { card: 'bg-amber-950/60 hover:bg-amber-900/60 border-amber-800/50 hover:border-amber-700/70',       icon: 'text-amber-400',   title: 'text-amber-300 group-hover:text-amber-200',     betaText: 'text-amber-500',   betaBg: 'bg-amber-900/60' },
  red:     { card: 'bg-red-950/60 hover:bg-red-900/60 border-red-800/50 hover:border-red-700/70',               icon: 'text-red-400',     title: 'text-red-300 group-hover:text-red-200',         betaText: 'text-red-500',     betaBg: 'bg-red-900/60' },
  teal:    { card: 'bg-teal-950/60 hover:bg-teal-900/60 border-teal-800/50 hover:border-teal-700/70',           icon: 'text-teal-400',    title: 'text-teal-300 group-hover:text-teal-200',       betaText: 'text-teal-500',    betaBg: 'bg-teal-900/60' },
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
        <div className={`text-[14px] font-semibold mb-1 inline-flex items-center gap-1.5 ${c.title}`}>
          {title}
          {beta && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.betaText} ${c.betaBg}`}>
              Beta
            </span>
          )}
        </div>
        <p className="text-[12px] text-gray-400 leading-relaxed">{description}</p>
      </div>
    </Link>
  )
}
