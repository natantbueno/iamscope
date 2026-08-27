'use client'

import AppShell from '@/components/AppShell'
import ClassificationBadge from '@/components/ClassificationBadge'
import Link from 'next/link'
import { ShieldAlert, GitCompare } from 'lucide-react'
import { CloudId, CLOUD_META, CLOUD_ORDER, Equivalence, getCloudUrl } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'
import tiersData from '@/data/compare/tiers.json'
import ExportButton from '@/components/ExportButton'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'
import type { TranslationKey } from '@/i18n/dictionary'

const equivalences = equivalencesData as Equivalence[]
const tier0 = tiersData.find(t => t.level === 0)!
const globalAdmin = equivalences.find(eq => eq.id === 'global-admin')!

// A verdadeira primitiva Tier 0 de cada cloud — nem sempre é a role
// "administrativa" mais óbvia, que é justamente o motivo da página existir.
const TIER0_NOTES: Partial<Record<CloudId, TranslationKey>> = {
  entraId:         'tzero.noteEntra',
  aws:             'tzero.noteAws',
  gcp:             'tzero.noteGcp',
  azureRbac:       'tzero.noteAzure',
  ibmCloud:        'tzero.noteIbm',
  googleWorkspace: 'tzero.noteGws',
}

const SCOPE_LABEL: Partial<Record<CloudId, TranslationKey>> = {
  entraId:         'tzero.scopeEntra',
  azureRbac:       'tzero.scopeAzure',
  aws:             'tzero.scopeAws',
  gcp:             'tzero.scopeGcp',
  ibmCloud:        'tzero.scopeIbm',
  googleWorkspace: 'tzero.scopeGws',
}

export default function TierComparisonClient() {
  const t = useT()

  return (
    <AppShell
      headerTitle={t('tzero.headerTitle')}
      headerSub={t('tzero.headerSub')}
      headerActions={
        <div className="flex items-center gap-3">
          {/* Página inteira sobre tier: o rótulo de procedência precisa estar no topo. */}
          <ClassificationBadge className="hidden sm:inline-flex" />
          <Link href="/compare" className="hidden lg:flex items-center gap-1.5 text-3xs text-fg-muted hover:text-brand">
            <GitCompare size={14} />
            <span className="hidden sm:inline">{t('tzero.seeFull')}</span>
          </Link>
          {/* O CSV sai no idioma em que a pessoa está lendo a página. */}
          <ExportButton
            filename="tier0-comparison"
            data={CLOUD_ORDER.map((cloud) => {
              const entry = globalAdmin.clouds[cloud]
              const scope = SCOPE_LABEL[cloud]
              const note = TIER0_NOTES[cloud]
              return {
                cloud: CLOUD_META[cloud].label,
                tierZeroRole: entry?.role ?? '',
                scope: scope ? t(scope) : '',
                note: note ? t(note) : '',
              }
            })}
          />
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-4xl">

          {/* ── Overview ─────────────────────────────────── */}
          <Section id="overview" title={t('tzero.whyTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-3">
              <Rich text={t('tzero.whyOneA')} className="text-gray-800 dark:text-gray-200" />{' '}
              <code className="font-mono text-3xs">AdministratorAccess</code>{' '}na AWS,{' '}
              <code className="font-mono text-3xs">Project Owner</code>{' '}
              {t('tzero.whyOneB')}
            </p>
            <p className="text-note text-fg-muted leading-relaxed">
              <Rich text={t('tzero.whyTwo')} className="text-gray-800 dark:text-gray-200" />
            </p>
          </Section>

          <Divider />

          {/* ── Cards per cloud ──────────────────────────── */}
          <Section id="cards" title={t('tzero.cardsTitle')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CLOUD_ORDER.map(cloud => {
                const entry = globalAdmin.clouds[cloud]
                if (!entry) return null
                const meta = CLOUD_META[cloud]
                const note = TIER0_NOTES[cloud]
                return (
                  <div key={cloud} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span className="text-3xs font-semibold uppercase tracking-wider">{meta.label}</span>
                    </div>
                    {entry.slug ? (
                      <Link href={getCloudUrl(cloud, entry.slug)} className="text-note font-semibold text-gray-800 dark:text-gray-100 hover:underline">
                        {entry.role}
                      </Link>
                    ) : (
                      <span className="text-note font-semibold text-gray-800 dark:text-gray-100">{entry.role}</span>
                    )}
                    {note && (
                      <p className="text-tiny text-fg-muted leading-relaxed mt-2">{t(note)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          <Divider />

          {/* ── Comparison table ─────────────────────────── */}
          <Section id="table" title={t('tzero.tableTitle')}>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-body">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>Cloud</Th>
                    <Th>{t('tzero.colPrimitive')}</Th>
                    <Th>{t('table.scope')}</Th>
                    <Th>{t('tzero.colRisk')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {CLOUD_ORDER.map((cloud, i) => {
                    const entry = globalAdmin.clouds[cloud]
                    if (!entry) return null
                    const meta = CLOUD_META[cloud]
                    const scope = SCOPE_LABEL[cloud]
                    return (
                      <TR key={cloud} last={i === CLOUD_ORDER.length - 1}>
                        <TD bold>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                            {meta.label}
                          </span>
                        </TD>
                        <TD>
                          {entry.slug ? (
                            <Link href={getCloudUrl(cloud, entry.slug)} className="text-brand-strong dark:text-brand-onDark hover:underline">{entry.role}</Link>
                          ) : entry.role}
                        </TD>
                        <TD>{scope ? t(scope) : null}</TD>
                        <TD>
                          <span className="inline-flex items-center gap-1 text-red-500">
                            <ShieldAlert size={12} /> Critical
                          </span>
                        </TD>
                      </TR>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Divider />

          {/* ── Tier model recap ─────────────────────────── */}
          <Section id="model" title={t('tzero.modelTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-3">
              {t('tzero.modelBodyA')}{' '}
              <Link href="/compare" className="text-brand-strong dark:text-brand-onDark hover:underline">{t('tzero.modelLink')}</Link>,{' '}
              {t('tzero.modelBodyB')}
            </p>
            {/* name/description vêm de src/data/compare/tiers.json, que está só
                em português — ver a nota no relatório sobre texto editorial
                que mora em src/data/ e não aparece no find-untranslated. */}
            {/* Background tint alone carries the tier's color signal — a colored
                left border here is the "side-tab" AI-slop tell the detector flags. */}
            <div className="p-3 rounded-lg" style={{ background: tier0.bg }}>
              <p className="text-tiny font-semibold">{tier0.name}</p>
              <p className="text-tiny text-fg-muted leading-relaxed mt-1">{tier0.description}</p>
            </div>
          </Section>

        </div>
      </div>
    </AppShell>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Divider() {
  return <hr className="border-gray-200 dark:border-gray-800" />
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">
      {children}
    </th>
  )
}

function TR({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <tr className={`${last ? '' : 'border-b border-gray-100 dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
      {children}
    </tr>
  )
}

function TD({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td className={`px-4 py-2.5 align-top text-body ${bold ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-fg-muted'}`}>
      {children}
    </td>
  )
}
