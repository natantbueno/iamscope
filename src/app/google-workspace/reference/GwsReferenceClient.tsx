'use client'

import AppShell from '@/components/AppShell'
import ReferenceIndex from '@/components/ReferenceIndex'
import { GWS_ROLES, GWS_SCOPES, GWS_PRIVILEGES, GWS_SOURCES, GWS_TIER_META, GWS_SCOPE_META, GwsTier, GwsScopeSensitivity } from '@/data/googleWorkspace'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import ExportButton from '@/components/ExportButton'
import { useT } from '@/i18n/LanguageProvider'

const TIER_ORDER: GwsTier[] = ['SuperAdmin', 'DelegatedAdmin', 'ServiceAdmin', 'SpecializedAdmin', 'ReadOnly']
const SENS_ORDER: GwsScopeSensitivity[] = ['restricted', 'sensitive', 'standard']

export default function GwsReferenceClient() {
  const t = useT()

  return (
    <AppShell headerTitle="Google Workspace — Reference" headerSub={t('gws.headerSub')}
      headerActions={<ExportButton filename="google-workspace-data-sync" label={t('data.exportFreshness')}
        data={DATA_SYNC.filter((d) => d.platform === 'Google Workspace').map((d) => ({ dataset: d.label, lastSynced: d.lastSynced, source: d.sourceLabel }))} />}
    >
      <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 space-y-12 max-w-3xl">

        <ReferenceIndex cloud="googleWorkspace" />

        <Section title={t('gws.tierTitle')}>
          <p className="text-note text-fg-subtle leading-relaxed mb-4">
            {t('gws.tierIntro')}
          </p>
          <div className="space-y-3">
            {TIER_ORDER.map((tier) => {
              const meta = GWS_TIER_META[tier]
              const count = GWS_ROLES.filter((r) => r.tier === tier).length
              return (
                <div key={tier} className="rounded-lg border p-4" style={{ backgroundColor: meta.darkBg, borderColor: meta.darkText + '30' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xs font-bold px-2 py-0.5 rounded-full border"
                      style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '50' }}>
                      {meta.short}
                    </span>
                    <span className="text-body font-semibold" style={{ color: meta.darkText }}>{meta.label}</span>
                    <span className="ml-auto text-3xs" style={{ color: meta.darkText + 'aa' }}>{count} {t('noun.roles')}</span>
                  </div>
                  <p className="text-tiny leading-relaxed" style={{ color: meta.darkText + 'cc' }}>{meta.description}</p>
                </div>
              )
            })}
          </div>
        </Section>

        {/*
          Seção nova em 03/08. O dataset ganhou os 120 privilégios oficiais do
          Admin console quando o catálogo foi reconstruído, mas esta página
          continuava só com tiers e OAuth scopes — descrevia um Workspace que o
          site já não tinha.
        */}
        <Section title={t('gws.privTitle')}>
          <p className="text-note text-fg-subtle leading-relaxed mb-4">{t('gws.privIntro')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {['Admin settings', 'Services'].map((secao) => {
              const grupos = GWS_PRIVILEGES.filter((p) => p.section === secao && !p.isChild)
              const filhos = GWS_PRIVILEGES.filter((p) => p.section === secao && p.isChild)
              return (
                <div key={secao} className="rounded-lg border border-line-strong bg-surface-alt p-4">
                  <p className="text-body font-semibold text-fg mb-1">{secao}</p>
                  <p className="text-tiny text-fg-muted">
                    {grupos.length} grupos · {filhos.length} sub-privilégios
                  </p>
                  <p className="text-3xs text-fg-subtle mt-2 leading-relaxed">
                    {grupos.slice(0, 6).map((g) => g.name).join(' · ')}
                    {grupos.length > 6 ? ` · +${grupos.length - 6}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
          <a href="/google-workspace/privileges" className="text-success-fg hover:underline text-note">
            Ver os {GWS_PRIVILEGES.length} privilégios →
          </a>
          <p className="text-tiny text-fg-subtle leading-relaxed mt-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
            {t('gws.privApiNote')}
          </p>
        </Section>

        <Section title={t('gws.scopeTitle')}>
          <p className="text-note text-fg-subtle leading-relaxed mb-4">
            {t('gws.scopeIntro')}
          </p>
          <div className="space-y-3">
            {SENS_ORDER.map((sens) => {
              const meta = GWS_SCOPE_META[sens]
              const count = GWS_SCOPES.filter((s) => s.sensitivity === sens).length
              return (
                <div key={sens} className="rounded-lg border p-4" style={{ backgroundColor: meta.darkBg, borderColor: meta.textColor + '30' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-body font-semibold" style={{ color: meta.darkText }}>{meta.label}</span>
                    <span className="ml-auto text-3xs" style={{ color: meta.darkText + 'aa' }}>{count} {t('noun.scopes')}</span>
                  </div>
                  <p className="text-tiny leading-relaxed" style={{ color: meta.darkText + 'cc' }}>{meta.description}</p>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title={t('data.sources')}>
          {/*
            Lidas de GWS_SOURCES, que o coletor grava junto com os dados. Antes
            eram quatro URLs escritas à mão, e duas delas não eram as fontes de
            fato usadas — a página citava uma procedência que não era a real.
          */}
          <ul className="space-y-2 text-note text-fg-subtle">
            {GWS_SOURCES.map((src) => (
              <li key={src.id}>
                <ExtLink href={src.url}>{src.title}</ExtLink>
                <span className="text-tiny text-fg-subtle ml-2">doc de {src.docLastUpdated}</span>
              </li>
            ))}
            <li><ExtLink href="https://developers.google.com/identity/protocols/oauth2/scopes">OAuth 2.0 Scopes for Google APIs</ExtLink></li>
          </ul>
        </Section>

        <Section title={t('ref.freshnessTitle')}>
          <p className="text-note text-fg-subtle leading-relaxed mb-4">
            {t('ref.freshnessLeadA')}{' '}
            <a href="/info" className="text-success-fg hover:underline">{t('info.title')}</a>{' '}
            {t('ref.freshnessLeadB')}
          </p>
          <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-surface-alt border-b border-line-strong">
                <th className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">{t('data.dataset')}</th>
                <th className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">{t('data.lastCheck')}</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SYNC.filter((d) => d.platform === 'Google Workspace').map((d, i, arr) => (
                <tr key={d.id} className={`${i === arr.length - 1 ? '' : 'border-b border-line'} hover:bg-surface-alt/50 transition-colors`}>
                  <td className="px-4 py-2.5 align-top text-body font-medium text-fg-muted">{d.label}</td>
                  <td className="px-4 py-2.5 align-top text-body text-fg-subtle"><code className="font-mono text-tiny">{d.lastSynced}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

      </div>
      </div>
    </AppShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sub font-semibold text-fg mb-4 pb-2 border-b border-line">{title}</h2>
      {children}
    </section>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-success-fg hover:underline inline-flex items-center gap-1">
      {children} <ExternalLink size={12} />
    </a>
  )
}
