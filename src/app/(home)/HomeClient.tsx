'use client'

import Link from 'next/link'
import { Github, Info, Compass, GitCompare, FileJson, ShieldAlert, ScanSearch, ShieldCheck, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { SOD_RULES } from '@/data/sod/rules'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import type { TranslationKey } from '@/i18n/dictionary'
import type { CloudCard } from './clouds'

export default function HomeClient({ clouds }: { clouds: CloudCard[] }) {
  const t = useT()
  const fmt = useNumberFormat()

  return (
    <AppShell
      headerTitle="Multi-Cloud IAM Reference"
      headerSub={t('home.tagline')}
    >
      <div className="flex-1 overflow-y-auto">
        <div>
          {/*
            Sem hero. O <h1> daqui repetia palavra por palavra o headerTitle que o
            AppShell renderiza 40px acima — duas <h1> na mesma página, com o mesmo
            texto, e ~260px antes do primeiro dado. O subtítulo continua vivo como
            `headerSub`. Os dois gradientes decorativos saíram junto.
          */}
          <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-10">

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
                      <span className="w-2.5 h-2.5 rounded-full transition-transform duration-150 group-hover:scale-125"
                        style={{ background: cloud.dotColor }} aria-hidden="true" />
                      <span className="text-note font-semibold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-150">{cloud.name}</span>
                    </div>
                    <p className="text-tiny text-fg-muted transition-colors duration-150">
                      {cloud.metrics.map((m, i) => (
                        <span key={m.label}>
                          {i > 0 && ' · '}
                          {fmt(m.n)} {t(m.label as TranslationKey)}
                        </span>
                      ))}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Ferramentas */}
            <section>
              <h2 className="text-note font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('info.toolsTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TOOLS.map((tool) => (
                  <ToolCard
                    key={tool.href}
                    href={tool.href}
                    icon={<tool.icon size={18} />}
                    title={tool.title}
                    description={
                      tool.href === '/sod'
                        ? `${fmt(SOD_RULES.length)} ${t('home.toolSod')}`
                        : t(tool.desc)
                    }
                  />
                ))}
              </div>
            </section>

            {/* Footer mínimo */}
            <footer className="border-t border-surface-border dark:border-gray-800 pt-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-tiny text-fg-muted">
                {t('home.dataSource')}
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

// Ferramentas globais. Mesma lista e mesmos ícones da Sidebar — antes as duas
// descreviam as mesmas ferramentas com ícones e ordem diferentes, e a home
// ainda omitia o Assessment.
const TOOLS: { href: string; title: string; icon: LucideIcon; desc: TranslationKey }[] = [
  { href: '/advisor',          title: 'Role Advisor',        icon: Compass,     desc: 'home.toolAdvisor' },
  { href: '/compare',          title: 'Multi-Cloud Compare', icon: GitCompare,  desc: 'home.toolCompare' },
  { href: '/evaluate',         title: 'Role Evaluator',      icon: FileJson,    desc: 'home.toolEval' },
  { href: '/sod',              title: 'SoD Analyzer',        icon: ShieldAlert, desc: 'home.toolSod' },
  { href: '/assessment',       title: 'Assessment',          icon: Gauge,       desc: 'home.toolAssess' },
  { href: '/permission-scope', title: 'Permission Scope',    icon: ScanSearch,  desc: 'home.toolScope' },
  { href: '/tier-comparison',  title: 'Tier 0 Comparison',   icon: ShieldCheck, desc: 'home.toolTierZero' },
]

// Mesma superfície dos cards de cloud logo acima: um card é um card. A cor
// saiu porque não distinguia nada — os sete itens são a mesma coisa.
function ToolCard({ href, icon, title, description }: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 p-5 rounded-xl bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:border-line-strong transition-colors duration-150 shadow-card"
    >
      <div className="shrink-0 mt-0.5 text-fg-subtle group-hover:text-fg-muted transition-colors duration-150">{icon}</div>
      <div>
        <div className="text-note font-semibold mb-1 text-gray-800 dark:text-gray-100">{title}</div>
        <p className="text-tiny text-fg-muted leading-relaxed">{description}</p>
      </div>
    </Link>
  )
}
