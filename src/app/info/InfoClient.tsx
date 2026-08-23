'use client'

import Link from 'next/link'
import AppShell from '@/components/AppShell'
import EntraScopeIcon from '@/components/EntraScopeIcon'
import { Globe, Search, BookOpen, ExternalLink, Linkedin, ShieldCheck, GitCompare, Compass, Shield, RefreshCw, ScanSearch, FileJson, ShieldAlert, Gauge } from 'lucide-react'
import { CLOUD_MARK } from '@/lib/cloudColors'
import { DATA_SYNC, getLatestSync } from '@/data/syncMeta'
import ExportButton from '@/components/ExportButton'
import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'

/**
 * Changelog do site. Manter em ordem cronológica inversa e registrar tanto
 * mudança de dado quanto de produto — é o que dá ao usuário motivo para
 * confiar (ou desconfiar) do que está vendo.
 *
 * `kind` é discriminador, não rótulo: a palavra exibida vem do dicionário. O
 * texto de cada entrada também, por chave — o array roda em nível de módulo e
 * não tem como chamar o hook.
 */
const SITE_CHANGELOG: {
  date: string; kind: 'data' | 'product'; title: TranslationKey; detail: TranslationKey
}[] = [
  { date: '2026-08-03', kind: 'data',    title: 'chlog.gwsRebuildTitle',   detail: 'chlog.gwsRebuildBody' },
  { date: '2026-08-03', kind: 'product', title: 'chlog.tierBadgeTitle',    detail: 'chlog.tierBadgeBody' },
  { date: '2026-08-03', kind: 'product', title: 'chlog.searchTitle',       detail: 'chlog.searchBody' },
  { date: '2026-08-01', kind: 'product', title: 'chlog.assessTitle',       detail: 'chlog.assessBody' },
  { date: '2026-07-31', kind: 'data',    title: 'chlog.gcpFullTitle',      detail: 'chlog.gcpFullBody' },
  { date: '2026-07-31', kind: 'data',    title: 'chlog.azureCountTitle',   detail: 'chlog.azureCountBody' },
  { date: '2026-07-31', kind: 'data',    title: 'chlog.awsOfficialTitle',  detail: 'chlog.awsOfficialBody' },
  { date: '2026-07-27', kind: 'product', title: 'chlog.azurePermsTitle',   detail: 'chlog.azurePermsBody' },
  { date: '2026-07-27', kind: 'data',    title: 'chlog.ociRemovedTitle',   detail: 'chlog.ociRemovedBody' },
  { date: '2026-07-27', kind: 'data',    title: 'chlog.entraDescTitle',    detail: 'chlog.entraDescBody' },
  { date: '2026-07-27', kind: 'data',    title: 'chlog.ownTextTitle',      detail: 'chlog.ownTextBody' },
  { date: '2026-07-27', kind: 'product', title: 'chlog.tierZeroTitle',     detail: 'chlog.tierZeroBody' },
  { date: '2026-07-27', kind: 'product', title: 'chlog.permScopeTitle',    detail: 'chlog.permScopeBody' },
  { date: '2026-07-27', kind: 'product', title: 'chlog.permTableTitle',    detail: 'chlog.permTableBody' },
  { date: '2026-07-06', kind: 'data',    title: 'chlog.awsCatsTitle',      detail: 'chlog.awsCatsBody' },
  { date: '2026-07-01', kind: 'data',    title: 'chlog.azureMissingTitle', detail: 'chlog.azureMissingBody' },
]

// Nome de plataforma não se traduz — é o que aparece no portal do provedor.
// Os hex viviam cravados aqui, e por isso esta página atravessou a
// neutralização do nível 3 sem perder cor enquanto a sidebar e a home
// perdiam — a divergência que src/lib/cloudColors.ts existe para evitar.
// Agora as três leem da mesma fonte.
const PLATFORMS: { name: string; color: string; desc: TranslationKey }[] = [
  { name: 'Microsoft Entra ID', color: CLOUD_MARK.entraId,         desc: 'info.platformEntra' },
  { name: 'Azure RBAC',         color: CLOUD_MARK.azureRbac,       desc: 'info.platformAzure' },
  { name: 'Google Cloud (GCP)', color: CLOUD_MARK.gcp,             desc: 'info.platformGcp' },
  { name: 'Google Workspace',   color: CLOUD_MARK.googleWorkspace, desc: 'info.platformGws' },
  { name: 'AWS IAM',            color: CLOUD_MARK.aws,             desc: 'info.platformAws' },
  { name: 'IBM Cloud',          color: CLOUD_MARK.ibmCloud,        desc: 'info.platformIbm' },
]

export default function InfoClient() {
  const t = useT()

  // O nome de cada ferramenta é o próprio nome do produto — fica em inglês nos
  // dois idiomas, como no menu lateral.
  const TOOLS: { icon: React.ReactNode; title: string; href: string; desc: TranslationKey }[] = [
    { icon: <Gauge size={14} />,       title: 'Assessment',          href: '/assessment', desc: 'info.toolAssess' },
    { icon: <Search size={14} />,      title: 'Busca global',        href: '/search',                          desc: 'info.toolSearch' },
    { icon: <ScanSearch size={14} />,  title: 'Permission Scope',    href: '/permission-scope', desc: 'info.toolScope' },
    { icon: <Compass size={14} />  ,    title: 'Role Advisor',        href: '/advisor', desc: 'info.toolAdvisor' },
    { icon: <GitCompare size={14} />,  title: 'Multi-Cloud Compare', href: '/compare', desc: 'info.toolCompare' },
    { icon: <FileJson size={14} />,    title: 'Role Evaluator',      href: '/evaluate', desc: 'info.toolEval' },
    { icon: <ShieldAlert size={14} />, title: 'SoD Analyzer',        href: '/sod', desc: 'info.toolSod' },
    { icon: <ShieldCheck size={14} />, title: 'Tier 0 Comparison',   href: '/tier-comparison',                 desc: 'info.toolTierZero' },
  ]

  return (
    <AppShell
      headerTitle={t('info.title')}
      headerSub={t('info.headerSub')}
      pageHasOwnHeading
      >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-8 py-8 space-y-8">

          {/* Hero */}
          <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-8 flex flex-col items-center text-center gap-4">
            <EntraScopeIcon size={56} />
            <div>
              <h1 className="text-stat font-bold text-gray-900 dark:text-gray-100 mb-1">IAM Scope</h1>
              <p className="text-body text-fg-muted">
                {t('info.tagline')}
              </p>
            </div>
            <a
              href="https://iamscope.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-tiny text-brand-strong dark:text-brand-onDark hover:underline"
            >
              iamscope.cloud <ExternalLink size={12} />
            </a>
          </section>

          {/* Proposta */}
          <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search size={16} className="text-brand-strong dark:text-brand-onDark" />
              <h2 className="text-lead font-semibold text-gray-800 dark:text-gray-100">{t('info.whatIsTitle')}</h2>
            </div>
            <p className="text-body text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              {t('info.whatIsOne')}
            </p>
            <p className="text-body text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('info.whatIsTwo')}
            </p>
          </section>

          {/* Plataformas */}
          <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-brand-strong dark:text-brand-onDark" />
              <h2 className="text-lead font-semibold text-gray-800 dark:text-gray-100">{t('info.platformsTitle')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLATFORMS.map((p) => (
                <div key={p.name} className="flex gap-3 p-3 rounded-lg bg-surface-faint dark:bg-gray-800 border border-surface-border dark:border-gray-700">
                  <span className="mt-1 shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <div>
                    <p className="text-body font-medium text-gray-800 dark:text-gray-100 mb-0.5">{p.name}</p>
                    <p className="text-tiny text-fg-muted leading-snug">{t(p.desc)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ferramentas */}
          <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-brand-strong dark:text-brand-onDark" />
              <h2 className="text-lead font-semibold text-gray-800 dark:text-gray-100">{t('info.toolsTitle')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOOLS.map((item) => (
                <Link key={item.title} href={item.href}
                  className="flex gap-3 p-3 rounded-lg bg-surface-faint dark:bg-gray-800 border border-surface-border dark:border-gray-700 hover:border-brand/50 dark:hover:border-brand-onDark/50 transition-colors">
                  <span className="text-brand-strong dark:text-brand-onDark mt-0.5 shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-body font-medium text-gray-800 dark:text-gray-100 mb-0.5">{item.title}</p>
                    <p className="text-tiny text-fg-muted leading-snug">{t(item.desc)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Sobre o autor */}
          <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-brand-strong dark:text-brand-onDark" />
              <h2 className="text-lead font-semibold text-gray-800 dark:text-gray-100">{t('info.authorTitle')}</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-16 h-16 rounded-full bg-brand-soft dark:bg-brand-activeBg border-2 border-brand dark:border-brand-onDark flex items-center justify-center shrink-0">
                <span className="text-stat font-bold text-brand-strong dark:text-brand-onDark">N</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lead font-semibold text-gray-900 dark:text-gray-100 mb-1">Natan Tomaz</h3>
                <p className="text-body text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {t('info.authorBio')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://www.linkedin.com/in/natantomazbueno/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-tiny font-medium bg-[#0a66c2] hover:bg-[#094fa1] text-white transition-colors"
                  >
                    <Linkedin size={13} /> LinkedIn
                  </a>
                  <a
                    href="https://iamscope.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-tiny font-medium border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink size={13} /> iamscope.cloud
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Atualizações no site */}
          <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-brand-strong dark:text-brand-onDark" />
                <h2 className="text-lead font-semibold text-gray-800 dark:text-gray-100">{t('info.updatesTitle')}</h2>
              </div>
              <ExportButton filename="data-sync-status" data={DATA_SYNC.map((d) => ({
                dataset: d.label, platform: d.platform, lastSynced: d.lastSynced, source: d.sourceLabel, notes: d.notes ?? '',
              }))} />
            </div>

            {/* Changelog — mudanças recentes de dado e de produto */}
            <div className="mb-5">
              <p className="text-tiny text-fg-muted mb-3">
                {t('info.changelogIntro')}
              </p>
              <ul className="space-y-2.5">
                {SITE_CHANGELOG.map((c) => (
                  <li key={c.title} className="flex gap-3">
                    <span className="text-3xs font-mono text-fg-muted shrink-0 w-20 pt-0.5">{c.date}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-tiny font-medium text-gray-700 dark:text-gray-200">{t(c.title)}</p>
                        <span className={`text-micro font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          c.kind === 'data'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                        }`}>{c.kind === 'data' ? t('info.kindData') : t('info.kindProduct')}</span>
                      </div>
                      <p className="text-3xs text-fg-muted leading-snug mt-0.5">{t(c.detail)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-surface-border dark:border-gray-800">
              <h3 className="text-body font-semibold text-gray-700 dark:text-gray-200 mb-1">{t('info.freshnessTitle')}</h3>
              <p className="text-tiny text-fg-muted mb-4">
                {t('info.freshnessLead')} <strong className="text-gray-700 dark:text-gray-300">{getLatestSync()}</strong>.{' '}
                {t('info.freshnessBody')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-tiny border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 text-2xs">{t('data.dataset')}</th>
                    <th className="text-left font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 text-2xs">{t('data.lastCheck')}</th>
                    <th className="text-left font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 text-2xs">{t('table.source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA_SYNC.map((d, i) => (
                    <tr key={d.id} className={`${i === DATA_SYNC.length - 1 ? '' : 'border-b border-gray-100 dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                      <td className="px-3 py-2 align-top text-gray-700 dark:text-gray-300 font-medium">
                        {d.label}
                        {d.notes && <p className="text-3xs font-normal text-fg-muted mt-0.5 leading-snug">{d.notes}</p>}
                      </td>
                      <td className="px-3 py-2 align-top text-fg-muted whitespace-nowrap font-mono text-3xs">{d.lastSynced}</td>
                      <td className="px-3 py-2 align-top">
                        <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-brand-strong dark:text-brand-onDark hover:underline inline-flex items-center gap-1">
                          {d.sourceLabel}
                          <ExternalLink size={10} className="shrink-0" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Fontes */}
          <section className="text-left pb-4">
            <p className="text-3xs text-fg-muted">
              {t('info.disclaimer')}
            </p>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
