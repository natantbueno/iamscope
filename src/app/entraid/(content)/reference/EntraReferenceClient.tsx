'use client'

import AppShell from '@/components/AppShell'
import ReferenceIndex from '@/components/ReferenceIndex'
import { EAM_META, EamTier } from '@/data/roles'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import ExportButton from '@/components/ExportButton'
import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'

const TIER_ORDER: EamTier[] = ['ControlPlane', 'ManagementPlane', 'UserAccess', 'Unclassified']

// O badge é o valor gravado no dado — só a descrição é texto de tela.
const CATEGORIES: { badge: string; description: TranslationKey }[] = [
  { badge: 'Identity',      description: 'entra.catIdentity' },
  { badge: 'Application',   description: 'entra.catApp' },
  { badge: 'Security',      description: 'entra.catSecurity' },
  { badge: 'Compliance',    description: 'entra.catCompliance' },
  { badge: 'Microsoft 365', description: 'entra.catMsThreeSixFive' },
  { badge: 'Device',        description: 'entra.catDevice' },
  { badge: 'Other',         description: 'entra.catOther' },
]

const CUSTOM_LIMITS: { limit: TranslationKey; detail: TranslationKey }[] = [
  { limit: 'entra.limitPreview', detail: 'entra.limitPreviewD' },
  { limit: 'entra.limitCross',   detail: 'entra.limitCrossD' },
  { limit: 'entra.limitInherit', detail: 'entra.limitInheritD' },
  { limit: 'entra.limitTenant',  detail: 'entra.limitTenantD' },
  { limit: 'entra.limitCsp',     detail: 'entra.limitCspD' },
]

export default function EntraReferenceClient() {
  const t = useT()

  return (
    <AppShell
      headerTitle="Reference"
      headerSub={t('entra.headerSub')}
      headerActions={<ExportButton filename="entraid-data-sync" label={t('data.exportFreshness')}
        data={DATA_SYNC.filter((d) => d.platform === 'Entra ID').map((d) => ({ dataset: d.label, lastSynced: d.lastSynced, source: d.sourceLabel }))} />}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-8 py-8 space-y-12">

          <ReferenceIndex cloud="entraId" />

          <Section id="eam" title="Enterprise Access Model (EAM)">
            <p className="text-note text-fg-subtle leading-relaxed mb-4">
              {t('entra.eamIntroA')}{' '}
              <ExtLink href="https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model">Enterprise Access Model</ExtLink>{' '}
              {t('entra.eamIntroB')}
            </p>
            <div className="space-y-3">
              {TIER_ORDER.map((tier) => {
                const meta = EAM_META[tier]
                return (
                  <div key={tier} className="flex items-start gap-4 p-3 border border-line-strong rounded-lg bg-surface">
                    <div className="pt-0.5 shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-semibold border"
                        style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
                        {meta.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-tiny text-fg-muted leading-relaxed">{meta.description}</p>
                      <p className="text-3xs text-fg-muted mt-1">{t('entra.eamShort')} {meta.short || '—'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Note>{t('entra.eamNote')}</Note>
          </Section>

          <Divider />

          <Section id="categories" title={t('entra.catTitle')}>
            <p className="text-note text-fg-subtle leading-relaxed mb-4">
              {t('entra.catIntro')}
            </p>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('table.badge')}</Th>
                  <Th>{t('table.description')}</Th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c, i) => (
                  <TR key={c.badge} last={i === CATEGORIES.length - 1}>
                    <TD bold>{c.badge}</TD>
                    <TD>{t(c.description)}</TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </Section>

          <Divider />

          <Section id="role-actions" title="Role Actions">
            <p className="text-note text-fg-subtle leading-relaxed mb-3">
              {t('entra.actionsIntro')}
            </p>
            <CodeBlock>{'{namespace}/{resource...}/{verb}'}</CodeBlock>
            <p className="text-body text-fg-subtle leading-relaxed mt-3 mb-3">{t('entra.actionsParts')}</p>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('table.part')}</Th>
                  <Th>{t('table.example')}</Th>
                  <Th>{t('table.meaning')}</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>Namespace</TD><TD><code className="font-mono text-tiny">microsoft.directory</code></TD><TD>{t('entra.partNamespace')}</TD></TR>
                <TR><TD bold>Resource</TD><TD><code className="font-mono text-tiny">users/password</code></TD><TD>{t('entra.partResource')}</TD></TR>
                <TR last><TD bold>Verb</TD><TD><code className="font-mono text-tiny">update</code></TD><TD>{t('entra.partVerb')}</TD></TR>
              </tbody>
            </table>
            <p className="text-body text-fg-subtle leading-relaxed">
              {t('entra.actionsOutro')}
            </p>
          </Section>

          <Divider />

          <Section id="api-permissions" title="API Permissions (Microsoft Graph)">
            <p className="text-note text-fg-subtle leading-relaxed mb-4">
              {t('entra.apiIntroA')}{' '}
              <ExtLink href="https://learn.microsoft.com/en-us/graph/overview">Microsoft Graph</ExtLink>{' '}
              {t('entra.apiIntroB')}
            </p>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('table.type')}</Th>
                  <Th>{t('table.badge')}</Th>
                  <Th>{t('table.description')}</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>Application</TD><TD><code className="font-mono text-tiny">AppRole</code></TD><TD>{t('entra.apiApp')}</TD></TR>
                <TR last><TD bold>Delegated</TD><TD><code className="font-mono text-tiny">Delegated</code></TD><TD>{t('entra.apiDelegated')}</TD></TR>
              </tbody>
            </table>
            <p className="text-body text-fg-subtle leading-relaxed">
              {t('entra.apiFormatA')}{' '}
              <code className="font-mono bg-surface-alt px-1.5 py-0.5 rounded text-tiny text-fg">Resource.Action.Scope</code> —{' '}
              <code className="font-mono bg-surface-alt px-1.5 py-0.5 rounded text-tiny text-fg">User.ReadWrite.All</code>{' '}
              {t('entra.apiFormatB')}
            </p>
          </Section>

          <Divider />

          <Section id="custom-roles" title={t('entra.customTitle')}>
            <p className="text-note text-fg-subtle leading-relaxed mb-4">
              {t('entra.customIntro')}
            </p>

            <h3 className="text-note font-semibold text-fg mb-2">{t('entra.customReqs')}</h3>
            <ul className="text-body text-fg-subtle space-y-1.5 list-disc pl-5 mb-4">
              <li>{t('entra.customReqOne')}</li>
              <li>{t('entra.customReqTwo')}</li>
              <li>
                {t('entra.customReqThreeA')}
                <code className="font-mono bg-surface-alt px-1 rounded text-tiny text-fg">New-MgRoleManagementDirectoryRoleDefinition</code>
                {t('entra.customReqThreeB')}
              </li>
            </ul>

            <h3 className="text-note font-semibold text-fg mb-2">{t('entra.customPermsTitle')}</h3>
            <p className="text-body text-fg-subtle leading-relaxed mb-2">
              {t('entra.customPermsOne')}
            </p>
            <p className="text-body text-fg-subtle leading-relaxed mb-2">
              {t('entra.customPermsTwo')}
            </p>
            <CodeBlock>{`GET https://graph.microsoft.com/v1.0/roleManagement/directory/resourceNamespaces

# ou via PowerShell:
Get-MgRoleManagementDirectoryResourceNamespace | ForEach-Object {
  Get-MgRoleManagementDirectoryResourceNamespaceResourceAction -UnifiedRbacResourceNamespaceId $_.Id
}`}</CodeBlock>

            <h3 className="text-note font-semibold text-fg mt-4 mb-2">{t('entra.customScopeTitle')}</h3>
            <ul className="text-body text-fg-subtle space-y-1.5 list-disc pl-5 mb-4">
              <li>{t('entra.customScopeOne')}</li>
              <li>{t('entra.customScopeTwo')}</li>
              <li>{t('entra.customScopeThree')}</li>
            </ul>

            <h3 className="text-note font-semibold text-fg mb-2">{t('entra.customUnsupTitle')}</h3>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('table.type')}</Th>
                  <Th>{t('table.description')}</Th>
                </tr>
              </thead>
              <tbody>
                {CUSTOM_LIMITS.map((l, i) => (
                  <TR key={l.limit} last={i === CUSTOM_LIMITS.length - 1}>
                    <TD bold>{t(l.limit)}</TD>
                    <TD>{t(l.detail)}</TD>
                  </TR>
                ))}
              </tbody>
            </table>
            <Note>{t('entra.customNote')}</Note>
          </Section>

          <Divider />

          <Section id="sources" title={t('data.sources')}>
            <table className="w-full text-body border border-line-strong rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-surface-alt border-b border-line-strong">
                  <Th>{t('table.source')}</Th>
                  <Th>{t('table.content')}</Th>
                  <Th>{t('entra.srcUpdate')}</Th>
                </tr>
              </thead>
              <tbody>
                <TR>
                  <TD><ExtLink href="https://github.com/Cloud-Architekt/AzurePrivilegedIAM">AzurePrivilegedIAM (EntraOps)</ExtLink></TD>
                  <TD>{t('entra.srcEntraOps')}</TD>
                  <TD>{t('entra.srcEntraOpsUp')}</TD>
                </TR>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference">Microsoft Learn — Permissions Reference</ExtLink></TD>
                  <TD>{t('entra.srcPermsRef')}</TD>
                  <TD>Microsoft</TD>
                </TR>
                <TR last>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/graph/permissions-reference">Microsoft Graph Permissions Reference</ExtLink></TD>
                  <TD>{t('entra.srcGraphRef')}</TD>
                  <TD>Microsoft</TD>
                </TR>
              </tbody>
            </table>
            <p className="text-body text-fg-subtle leading-relaxed">
              {t('entra.srcOutroA')}{' '}
              <ExtLink href="https://github.com/natebzurg/entraid.permissions">{t('entra.srcRepoLink')}</ExtLink>.
            </p>
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
                {DATA_SYNC.filter((d) => d.platform === 'Entra ID').map((d, i, arr) => (
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
