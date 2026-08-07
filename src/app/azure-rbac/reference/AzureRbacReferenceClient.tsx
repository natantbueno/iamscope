'use client'

import AppShell from '@/components/AppShell'
import ReferenceIndex from '@/components/ReferenceIndex'
import { AZURE_ROLES, AZURE_TIER_META, AzureRbacTier } from '@/data/azureRbac'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'

const TIER_ORDER: AzureRbacTier[] = ['FullControl', 'AccessManagement', 'Contributor', 'DataPlane', 'Reader', 'Specialized']

export default function AzureRbacReferenceClient() {
  const t = useT()
  const privileged = AZURE_ROLES.filter((r) => r.isPrivileged).length

  return (
    <AppShell
      headerTitle="Reference"
      headerSub={t('azure.headerSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-8 py-8 space-y-12">

          <ReferenceIndex cloud="azureRbac" />

          <Section id="risk-tier" title={t('azure.tierTitle')}>
            <p className="text-note text-fg-subtle leading-relaxed mb-4">
              {t('azure.tierIntro')}
            </p>
            <div className="space-y-3">
              {TIER_ORDER.map((tier) => {
                const meta = AZURE_TIER_META[tier]
                return (
                  <div key={tier} className="flex items-start gap-4 p-3 border border-line-strong rounded-lg bg-surface">
                    <div className="pt-0.5 shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-semibold border"
                        style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
                        {meta.short} — {meta.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-tiny text-fg-muted leading-relaxed">{meta.description}</p>
                      <p className="text-3xs text-fg-muted mt-1">
                        {AZURE_ROLES.filter((r) => r.tier === tier).length} {t('ref.rolesInTier')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Note>{t('azure.tierNote')}</Note>
          </Section>

          <Divider />

          <Section id="permissions" title={t('azure.permTitle')}>
            <p className="text-note text-fg-subtle leading-relaxed mb-4">
              {t('azure.permIntro')}
            </p>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('table.type')}</Th>
                  <Th>{t('table.description')}</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>Actions</TD><TD>{t('azure.permActions')}</TD></TR>
                <TR><TD bold>NotActions</TD><TD>{t('azure.permNotActions')}</TD></TR>
                <TR><TD bold>DataActions</TD><TD>{t('azure.permDataActions')}</TD></TR>
                <TR last><TD bold>NotDataActions</TD><TD>{t('azure.permNotDataActions')}</TD></TR>
              </tbody>
            </table>
            <p className="text-body text-fg-subtle leading-relaxed">
              {t('azure.permFormatA')}{' '}
              <code className="font-mono bg-surface-alt px-1.5 py-0.5 rounded text-tiny text-fg">{'provider/resourceType/action'}</code> —{' '}
              {t('azure.permFormatB')}{' '}
              <code className="font-mono bg-surface-alt px-1.5 py-0.5 rounded text-tiny text-fg">Microsoft.Compute/virtualMachines/write</code>.
            </p>
            <Note><Rich text={t('azure.permNote')} /></Note>
          </Section>

          <Divider />

          <Section id="scopes" title={t('section.assignmentScopes')}>
            <p className="text-note text-fg-subtle leading-relaxed mb-3">
              {t('azure.scopeIntro')}
            </p>
            <CodeBlock>{`Management Group  →  /providers/Microsoft.Management/managementGroups/{mgId}
Subscription      →  /subscriptions/{subId}
Resource Group    →  /subscriptions/{subId}/resourceGroups/{rgName}
Resource          →  /subscriptions/{subId}/resourceGroups/{rg}/providers/{type}/{name}`}</CodeBlock>
            <p className="text-body text-fg-subtle leading-relaxed mt-3">
              {t('azure.scopeBodyA')}{' '}
              <code className="font-mono bg-surface-alt px-1 rounded text-tiny text-fg">assignableScopes</code>{' '}
              {t('azure.scopeBodyB')}
            </p>
          </Section>

          <Divider />

          <Section id="privileged" title={t('azure.privTitle')}>
            <p className="text-note text-fg-subtle leading-relaxed mb-3">
              {t('azure.privIntroA')}{' '}
              <strong className="text-red-400">{t('filter.privileged')}</strong>{' '}
              {t('azure.privIntroB')}
            </p>
            <ul className="text-body text-fg-subtle space-y-1.5 list-disc pl-5 mb-3">
              <li>{t('azure.privOne')}</li>
              <li>{t('azure.privTwo')}</li>
              <li>{t('azure.privThree')}</li>
              <li>{t('azure.privFour')}</li>
            </ul>
            <p className="text-body text-fg-subtle leading-relaxed">
              {t('azure.privCountA')} <strong className="text-fg">{privileged} {t('noun.roles')}</strong>{' '}
              <Rich text={t('azure.privCountB')} />
            </p>
          </Section>

          <Divider />

          <Section id="sources" title={t('data.sources')}>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('table.source')}</Th>
                  <Th>{t('table.content')}</Th>
                </tr>
              </thead>
              <tbody>
                <TR>
                  <TD><ExtLink href="https://www.azadvertizer.net">AzAdvertizer</ExtLink></TD>
                  <TD>{t('azure.srcAzAdv')}</TD>
                </TR>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles">Microsoft Learn — Built-in Roles</ExtLink></TD>
                  <TD>{t('azure.srcLearnRoles')}</TD>
                </TR>
                <TR last>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/azure/role-based-access-control/overview">Microsoft Learn — Azure RBAC Overview</ExtLink></TD>
                  <TD>{t('azure.srcLearnOverview')}</TD>
                </TR>
              </tbody>
            </table>
          </Section>

          <Divider />

          <Section id="data-freshness" title={t('ref.freshnessTitle')}>
            <p className="text-note text-fg-subtle leading-relaxed mb-4">
              {t('ref.freshnessLeadA')}{' '}
              <a href="/info" className="text-brand-onDark hover:underline">{t('info.title')}</a>{' '}
              {t('ref.freshnessLeadB')}
            </p>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('data.dataset')}</Th>
                  <Th>{t('data.lastCheck')}</Th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter((d) => d.platform === 'Azure RBAC').map((d, i, arr) => (
                  <TR key={d.id} last={i === arr.length - 1}>
                    <TD bold>{d.label}</TD>
                    <TD><code className="font-mono text-tiny">{d.lastSynced}</code></TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </Section>

          <div className="pb-8" />
        </div>
      </div>
    </AppShell>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-sub font-semibold text-fg mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Divider() {
  return <hr className="border-line" />
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-lg">
      <p className="text-tiny text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 p-3 bg-app text-fg text-3xs font-mono rounded-lg overflow-x-auto leading-relaxed border border-line">
      {children}
    </pre>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-brand-onDark hover:underline inline-flex items-center gap-0.5">
      {children}
      <ExternalLink size={11} className="inline shrink-0" />
    </a>
  )
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
    <tr className={`${last ? '' : 'border-b border-line'} hover:bg-surface-alt/50 transition-colors`}>
      {children}
    </tr>
  )
}

function TD({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td className={`px-4 py-2.5 align-top text-body ${bold ? 'font-medium text-fg-muted' : 'text-fg-subtle'}`}>
      {children}
    </td>
  )
}
