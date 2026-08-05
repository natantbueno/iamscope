'use client'

import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { ROLES } from '@/data/roles'
import EamTierBadge from '@/components/EamTierBadge'
import { ExternalLink, ShieldCheck, Timer } from 'lucide-react'
import ExportButton from '@/components/ExportButton'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'

export default function PimClient() {
  const t = useT()

  // As roles Control Plane privilegiadas são as melhores candidatas a eligible assignment em PIM.
  const topControlPlaneRoles = ROLES
    .filter((r) => r.eamTier === 'ControlPlane' && r.isPrivileged)
    .sort((a, b) => b.permissionCount - a.permissionCount)
    .slice(0, 12)

  return (
    <AppShell
      headerTitle="Privileged Identity Management (PIM)"
      headerSub={t('pim.headerSub')}
      headerActions={<ExportButton filename="entraid-pim-candidate-roles" data={topControlPlaneRoles.map((r) => ({
        name: r.name, eamTier: r.eamTier, permissionCount: r.permissionCount, isPrivileged: r.isPrivileged,
      }))} />}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-3xl">

          {/* ── O que é ──────────────────────────────────── */}
          <Section id="overview" title={t('pim.whatTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-3">
              <ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure">Privileged Identity Management</ExtLink>{' '}
              <Rich text={t('pim.whatOneB')} className="text-gray-800 dark:text-gray-200" />{' '}
              <Link href="/entraid/roles/global-administrator" className="text-brand-strong dark:text-brand-onDark hover:underline">Global Administrator</Link>{' '}
              {t('pim.whatOneC')}
            </p>
            <p className="text-note text-fg-muted leading-relaxed">
              <Rich text={t('pim.whatTwo')} className="text-gray-800 dark:text-gray-200" />
            </p>
            <Note>
              <Rich text={t('pim.whatNoteA')} />{' '}
              <EamTierBadge tier="ControlPlane" showLabel={false} /> Control Plane /{' '}
              <span className="inline-flex items-center px-1.5 py-0 rounded text-2xs font-semibold text-amber-700 dark:text-amber-400">{t('pim.privilegedAdj')}</span>{' '}
              {t('pim.whatNoteB')}
            </Note>
          </Section>

          <Divider />

          {/* ── Eligible vs Active ───────────────────────── */}
          <Section id="eligible-vs-active" title={t('pim.evaTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-4">
              <Rich text={t('pim.evaIntro')} />
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <Timer size={16} className="text-amber-500" />
                  <h3 className="text-body font-semibold text-gray-800 dark:text-gray-100">{t('pim.eligible')}</h3>
                </div>
                <p className="text-tiny text-fg-muted leading-relaxed">
                  <Rich text={t('pim.eligibleBody')} />
                </p>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <h3 className="text-body font-semibold text-gray-800 dark:text-gray-100">{t('pim.active')}</h3>
                </div>
                <p className="text-tiny text-fg-muted leading-relaxed">
                  <Rich text={t('pim.activeBody')} />
                </p>
              </div>
            </div>
            <table className="w-full text-body border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>{t('pim.colFeature')}</Th>
                  <Th>Eligible</Th>
                  <Th>Active</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>{t('pim.rowEffective')}</TD><TD>{t('pim.rowEffectiveE')}</TD><TD>{t('pim.rowEffectiveA')}</TD></TR>
                <TR><TD bold>{t('pim.rowActivate')}</TD><TD>{t('pim.rowActivateE')}</TD><TD>{t('pim.no')}</TD></TR>
                <TR><TD bold>{t('pim.rowApproval')}</TD><TD>{t('pim.rowApprovalE')}</TD><TD>{t('pim.notApplicable')}</TD></TR>
                <TR><TD bold>{t('pim.rowMfa')}</TD><TD>{t('pim.rowApprovalE')}</TD><TD>{t('pim.rowMfaA')}</TD></TR>
                <TR last><TD bold>{t('pim.rowUse')}</TD><TD>{t('pim.rowUseE')}</TD><TD>{t('pim.rowUseA')}</TD></TR>
              </tbody>
            </table>
          </Section>

          <Divider />

          {/* ── Fluxo JIT ────────────────────────────────── */}
          <Section id="jit-flow" title={t('pim.jitTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-4">
              <Rich text={t('pim.jitIntro')} />
            </p>
            <ol className="space-y-3">
              <JitStep n={1} title={t('pim.jitOne')}>
                {t('pim.jitOneA')}{' '}
                <code className="font-mono text-3xs bg-gray-100 dark:bg-gray-800 px-1 rounded">My roles</code>{' '}
                {t('pim.jitOneB')}{' '}
                <code className="font-mono text-3xs bg-gray-100 dark:bg-gray-800 px-1 rounded">roleManagement/directory/roleAssignmentScheduleRequests</code>{' '}
                {t('pim.jitOneC')}
              </JitStep>
              <JitStep n={2} title={t('pim.jitTwo')}>
                {t('pim.jitTwoBody')}
              </JitStep>
              <JitStep n={3} title={t('pim.jitThree')}>
                {t('pim.jitThreeBody')}
              </JitStep>
              <JitStep n={4} title={t('pim.jitFour')}>
                <Rich text={t('pim.jitFourBody')} />
              </JitStep>
            </ol>
          </Section>

          <Divider />

          {/* ── PIM for Groups ───────────────────────────── */}
          <Section id="pim-for-groups" title="PIM for Groups">
            <p className="text-note text-fg-muted leading-relaxed mb-3">
              <Rich text={t('pim.groupsIntroA')} />{' '}
              <code className="font-mono text-3xs bg-gray-100 dark:bg-gray-800 px-1 rounded">isAssignableToRole: true</code>
              <Rich text={t('pim.groupsIntroB')} />
            </p>
            <ul className="text-body text-fg-muted space-y-1.5 list-disc pl-5">
              <li>{t('pim.groupsOne')}</li>
              <li>{t('pim.groupsTwo')}</li>
              <li>{t('pim.groupsThree')}</li>
            </ul>
          </Section>

          <Divider />

          {/* ── Roles candidatas ─────────────────────────── */}
          <Section id="candidate-roles" title={t('pim.candTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-4">
              {t('pim.candIntroA')}{' '}
              <EamTierBadge tier="ControlPlane" showLabel={false} /> {t('pim.candIntroB')}
            </p>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {topControlPlaneRoles.map((role, i) => (
                <Link
                  key={role.slug}
                  href={`/entraid/roles/${role.slug}`}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-body hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    i === topControlPlaneRoles.length - 1 ? '' : 'border-b border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{role.name}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-3xs text-fg-muted">{role.permissionCount} {t('noun.permissions')}</span>
                    <EamTierBadge tier={role.eamTier} showLabel={false} />
                  </span>
                </Link>
              ))}
            </div>
          </Section>

          <Divider />

          {/* ── Licenciamento ────────────────────────────── */}
          <Section id="licensing" title={t('pim.licTitle')}>
            <table className="w-full text-body border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>{t('pim.licFeature')}</Th>
                  <Th>{t('pim.licMin')}</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>{t('pim.licEntra')}</TD><TD>{t('pim.licPtwoOrGov')}</TD></TR>
                <TR><TD bold>{t('pim.licAzure')}</TD><TD>{t('pim.licAzureD')}</TD></TR>
                <TR last><TD bold>PIM for Groups</TD><TD>{t('pim.licPtwoOrGov')}</TD></TR>
              </tbody>
            </table>
            <Note><Rich text={t('pim.licNote')} /></Note>
          </Section>

          <Divider />

          {/* ── Fontes ───────────────────────────────────── */}
          <Section id="sources" title={t('data.sources')}>
            <table className="w-full text-body border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>{t('table.source')}</Th>
                  <Th>{t('table.content')}</Th>
                </tr>
              </thead>
              <tbody>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure">Microsoft Learn — What is PIM</ExtLink></TD>
                  <TD>{t('pim.srcConfigure')}</TD>
                </TR>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-assign-roles">Assign Eligible/Active roles</ExtLink></TD>
                  <TD>{t('pim.srcAssign')}</TD>
                </TR>
                <TR last>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/concept-pim-for-groups">PIM for Groups</ExtLink></TD>
                  <TD>{t('pim.srcGroups')}</TD>
                </TR>
              </tbody>
            </table>
          </Section>

          <div className="pb-8" />
        </div>
      </div>
    </AppShell>
  )
}

/* ── Layout helpers (mesmo padrão de /reference) ────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-sub font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Divider() {
  return <hr className="border-gray-200 dark:border-gray-800" />
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg">
      <p className="text-tiny text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  )
}

function JitStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-white text-tiny font-semibold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <p className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-0.5">{title}</p>
        <p className="text-tiny text-fg-muted leading-relaxed">{children}</p>
      </div>
    </li>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-brand-strong dark:text-brand-onDark hover:underline inline-flex items-center gap-0.5">
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
