'use client'

import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { AWS_POLICIES } from '@/data/aws'
import { ExternalLink, ShieldAlert, ShieldCheck, Lock, Building2 } from 'lucide-react'
import ExportButton from '@/components/ExportButton'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'

export default function ScpVsIdentityPoliciesClient() {
  const t = useT()

  const orgAccountAccessRole = AWS_POLICIES.find(p => p.slug === 'organization-account-access-role')
  const boundaries = AWS_POLICIES.filter(p => p.type === 'permission-boundary')

  return (
    <AppShell
      headerTitle="SCP vs Identity Policies"
      headerSub={t('scp.headerSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-3xl">

          {/* ── Overview ─────────────────────────────────── */}
          <Section id="overview" title={t('scp.twoTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-3">
              <Rich text={t('scp.twoOne')} className="text-gray-800 dark:text-gray-200" />
            </p>
            <p className="text-note text-fg-muted leading-relaxed">
              {t('scp.twoTwoA')}{' '}
              <Link href="/aws/reference" className="text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">Permission Boundaries</Link>.
            </p>
          </Section>

          <Divider />

          {/* ── Comparison ───────────────────────────────── */}
          <Section id="comparison" title={t('scp.cmpTitle')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={16} className="text-blue-500" />
                  <h3 className="text-body font-semibold text-gray-800 dark:text-gray-100">Service Control Policy (SCP)</h3>
                </div>
                <ul className="text-tiny text-fg-muted leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><Rich text={t('scp.scpOne')} /></li>
                  <li>
                    <Rich text={t('scp.scpTwoA')} />{' '}
                    <code className="font-mono text-3xs">AdministratorAccess</code>
                  </li>
                  <li><Rich text={t('scp.scpThree')} /></li>
                  <li><Rich text={t('scp.scpFour')} /></li>
                  <li>{t('scp.scpFive')}</li>
                </ul>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={16} className="text-fg-subtle" />
                  <h3 className="text-body font-semibold text-gray-800 dark:text-gray-100">Identity-based Policy</h3>
                </div>
                <ul className="text-tiny text-fg-muted leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><Rich text={t('scp.idOne')} /></li>
                  <li><Rich text={t('scp.idTwo')} /></li>
                  <li>{t('scp.idThree')}</li>
                  <li>
                    {t('scp.idFourA')}{' '}
                    <Link href="/aws/reference" className="text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">Permission Boundaries</Link>,{' '}
                    {t('scp.idFourB')}
                  </li>
                  <li>{t('scp.idFive')}</li>
                </ul>
              </div>
            </div>
            <Note><Rich text={t('scp.cmpNote')} /></Note>
          </Section>

          <Divider />

          {/* ── Evaluation logic ─────────────────────────── */}
          <Section id="evaluation" title={t('scp.evalTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-4">
              <Rich text={t('scp.evalIntro')} className="text-gray-800 dark:text-gray-200" />
            </p>
            <ol className="space-y-3 mb-4">
              <EvalStep n={1} title={t('scp.evalOne')}>{t('scp.evalOneBody')}</EvalStep>
              <EvalStep n={2} title={t('scp.evalTwo')}>{t('scp.evalTwoBody')}</EvalStep>
              <EvalStep n={3} title={t('scp.evalThree')}>{t('scp.evalThreeBody')}</EvalStep>
              <EvalStep n={4} title={t('scp.evalFour')}>{t('scp.evalFourBody')}</EvalStep>
              <EvalStep n={5} title={t('scp.evalFive')}>{t('scp.evalFiveBody')}</EvalStep>
            </ol>
            <Note><Rich text={t('scp.evalNote')} /></Note>
          </Section>

          <Divider />

          {/* ── Worked example ──────────────────────────── */}
          <Section id="example" title={t('scp.exTitle')}>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-body">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>{t('scp.exLayer')}</Th>
                    <Th>{t('table.content')}</Th>
                    <Th>{t('scp.exEffect')}</Th>
                  </tr>
                </thead>
                <tbody>
                  <TR>
                    <TD bold>{t('scp.exScpRow')}</TD>
                    <TD><Rich text={t('scp.exScpContent')} codeClassName="font-mono text-3xs" /></TD>
                    <TD><span className="text-red-500 font-medium"><Rich text={t('scp.exScpEffect')} codeClassName="font-mono text-3xs" /></span></TD>
                  </TR>
                  <TR>
                    <TD bold>Permission Boundary</TD>
                    <TD><Rich text={t('scp.exBoundContent')} codeClassName="font-mono text-3xs" /></TD>
                    <TD>{t('scp.exBoundEffect')}</TD>
                  </TR>
                  <TR last>
                    <TD bold>{t('scp.exIdRow')}</TD>
                    <TD><Rich text={t('scp.exIdContent')} codeClassName="font-mono text-3xs" /></TD>
                    <TD><span className="text-emerald-600 dark:text-emerald-400 font-medium"><Rich text={t('scp.exIdEffect')} codeClassName="font-mono text-3xs" /></span></TD>
                  </TR>
                </tbody>
              </table>
            </div>
          </Section>

          <Divider />

          {/* ── Related catalog entries ─────────────────── */}
          <Section id="related" title={t('scp.relatedTitle')}>
            <div className="flex justify-end mb-3">
              <ExportButton
                filename="aws-scp-vs-identity-policies-related"
                data={[
                  ...(orgAccountAccessRole ? [{ name: orgAccountAccessRole.name, slug: orgAccountAccessRole.slug, type: orgAccountAccessRole.type, description: orgAccountAccessRole.description }] : []),
                  ...boundaries.map((b) => ({ name: b.name, slug: b.slug, type: b.type, description: b.description })),
                ]}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orgAccountAccessRole && (
                <Link href={`/aws/policies/${orgAccountAccessRole.slug}`}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:border-csp-aws/60 transition-colors group">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert size={14} className="text-red-500 shrink-0" />
                    <span className="text-tiny font-semibold text-gray-800 dark:text-gray-100 group-hover:text-csp-aws">{orgAccountAccessRole.name}</span>
                  </div>
                  <p className="text-3xs text-fg-muted leading-relaxed line-clamp-2">{orgAccountAccessRole.description}</p>
                </Link>
              )}
              {boundaries.map(b => (
                <Link key={b.slug} href={`/aws/policies/${b.slug}`}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:border-csp-aws/60 transition-colors group">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-red-500 shrink-0" />
                    <span className="text-tiny font-semibold text-gray-800 dark:text-gray-100 group-hover:text-csp-aws">{b.name}</span>
                  </div>
                  <p className="text-3xs text-fg-muted leading-relaxed line-clamp-2">{b.description}</p>
                </Link>
              ))}
            </div>
          </Section>

          <Divider />

          {/* ── Sources ──────────────────────────────────── */}
          <Section id="sources" title={t('data.sources')}>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-body">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>{t('iag.docLabel')}</Th>
                    <Th>Link</Th>
                  </tr>
                </thead>
                <tbody>
                  <TR>
                    <TD bold>Service Control Policies (SCPs)</TD>
                    <TD><ExtLink href="https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html">docs.aws.amazon.com</ExtLink></TD>
                  </TR>
                  <TR>
                    <TD bold>Policy Evaluation Logic</TD>
                    <TD><ExtLink href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html">docs.aws.amazon.com</ExtLink></TD>
                  </TR>
                  <TR last>
                    <TD bold>Permission Boundaries</TD>
                    <TD><ExtLink href="https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html">docs.aws.amazon.com</ExtLink></TD>
                  </TR>
                </tbody>
              </table>
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

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg">
      <p className="text-tiny text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  )
}

function EvalStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-csp-aws text-white text-tiny font-semibold flex items-center justify-center mt-0.5">
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
      className="text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline inline-flex items-center gap-0.5">
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
