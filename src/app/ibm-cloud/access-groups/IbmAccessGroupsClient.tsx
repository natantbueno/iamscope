'use client'

import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { ExternalLink, Users, ShieldCheck, Layers, Network } from 'lucide-react'
import { IBM_ACCESS_PRIMITIVES } from '@/data/ibmAccessPrimitives'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'

/**
 * ATENÇÃO — o corpo de cada primitivo (description, members, useCases,
 * keyCapabilities, limits) vem de src/data/ibmAccessPrimitives.ts, que é texto
 * escrito para o site e está só em português. Como find-untranslated.js pula
 * src/data/, essas ~26 strings não entram na contagem e a página fica com
 * rótulo traduzido e corpo em português na versão em inglês. Resolver isso
 * exige decidir o que fazer com o texto editorial que mora em src/data/ — não
 * é um esquecimento desta página.
 */

export default function IbmAccessGroupsClient() {
  const t = useT()

  const accessGroup = IBM_ACCESS_PRIMITIVES.find(p => p.slug === 'access-group')!
  const trustedProfile = IBM_ACCESS_PRIMITIVES.find(p => p.slug === 'trusted-profile')!

  return (
    <AppShell
      headerTitle="Access Groups & Trusted Profiles"
      headerSub={t('iag.headerSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-3xl">

          {/* ── Overview ─────────────────────────────────── */}
          <Section id="overview" title={t('iag.whyTitle')}>
            <p className="text-note text-fg-muted leading-relaxed mb-3">
              <Rich text={t('iag.whyBodyA')} className="text-gray-800 dark:text-gray-200" />{' '}
              {/* Apontava para /ibm-cloud/roles/iam-administrator, que morreu com o dataset
                  antigo de 157 roles inventadas. O nome oficial da role é Administrator. */}
              <Link href="/ibm-cloud/roles/platform-administrator" className="text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline">Administrator</Link>,{' '}
              {t('iag.whyBodyB')}
            </p>
          </Section>

          <Divider />

          {/* ── Access Group ─────────────────────────────── */}
          <PrimitiveSection icon={<Users size={16} className="text-csp-ibm-onLight dark:text-csp-ibm-onDark" />} data={accessGroup} />

          <Divider />

          {/* ── Trusted Profile ──────────────────────────── */}
          <PrimitiveSection icon={<ShieldCheck size={16} className="text-csp-ibm-onLight dark:text-csp-ibm-onDark" />} data={trustedProfile} />

          <Divider />

          {/* ── Comparison ───────────────────────────────── */}
          <Section id="comparison" title={t('iag.cmpTitle')}>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-body">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>{t('iag.cmpPrimitive')}</Th>
                    <Th>{t('iag.cmpIsIdent')}</Th>
                    <Th>{t('iag.cmpMainUse')}</Th>
                    <Th>{t('iag.cmpAnalog')}</Th>
                  </tr>
                </thead>
                <tbody>
                  <TR>
                    <TD bold>Access Group</TD>
                    <TD>{t('iag.agIdent')}</TD>
                    <TD>{t('iag.agUse')}</TD>
                    <TD>AWS IAM Group / Entra ID role-assignable group</TD>
                  </TR>
                  <TR>
                    <TD bold>Trusted Profile</TD>
                    <TD>{t('iag.tpIdent')}</TD>
                    <TD>{t('iag.tpUse')}</TD>
                    <TD>AWS IAM Role (assumable) / Azure Managed Identity</TD>
                  </TR>
                  <TR last>
                    <TD bold>Service ID</TD>
                    <TD>{t('iag.svcIdent')}</TD>
                    <TD>{t('iag.svcUse')}</TD>
                    <TD>AWS IAM User (service account) / GCP service account key</TD>
                  </TR>
                </tbody>
              </table>
            </div>
            <Note><Rich text={t('iag.cmpNote')} /></Note>
          </Section>

          <Divider />

          {/* ── How they compose ─────────────────────────── */}
          <Section id="composition" title={t('iag.compTitle')}>
            <ol className="space-y-3 mb-2">
              <Step n={1} title={t('iag.stepOne')} icon={<Layers size={14} />}>
                {t('iag.stepOneBodyA')}{' '}
                <Link href="/ibm-cloud/roles" className="text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline">{t('iag.stepOneLink')}</Link>.
              </Step>
              <Step n={2} title={t('iag.stepTwo')} icon={<Network size={14} />}>
                {t('iag.stepTwoBody')}
              </Step>
              <Step n={3} title={t('iag.stepThree')} icon={<Users size={14} />}>
                {t('iag.stepThreeBody')}
              </Step>
              <Step n={4} title={t('iag.stepFour')} icon={<ShieldCheck size={14} />}>
                {t('iag.stepFourBody')}
              </Step>
            </ol>
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
                    <TD bold>Setting up access groups</TD>
                    <TD><ExtLink href={accessGroup.docsUrl}>cloud.ibm.com</ExtLink></TD>
                  </TR>
                  <TR last>
                    <TD bold>Creating a trusted profile</TD>
                    <TD><ExtLink href={trustedProfile.docsUrl}>cloud.ibm.com</ExtLink></TD>
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

function PrimitiveSection({ icon, data }: { icon: React.ReactNode; data: typeof IBM_ACCESS_PRIMITIVES[number] }) {
  const t = useT()
  return (
    <Section id={data.slug} title={data.name}>
      <div className="flex items-start gap-2 mb-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <p className="text-note text-fg-muted leading-relaxed">{data.description}</p>
      </div>

      {data.members && (
        <div className="mb-4">
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">{t('iag.membersLabel')}</p>
          <ul className="text-tiny text-fg-muted leading-relaxed space-y-1 list-disc list-inside">
            {data.members.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {data.trustedBy && (
        <div className="mb-4">
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">{t('iag.trustedLabel')}</p>
          <ul className="text-tiny text-fg-muted leading-relaxed space-y-1 list-disc list-inside">
            {data.trustedBy.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">{t('iag.useCases')}</p>
          <ul className="text-tiny text-fg-muted leading-relaxed space-y-1 list-disc list-inside">
            {data.useCases.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">{t('iag.capabilities')}</p>
          <ul className="text-tiny text-fg-muted leading-relaxed space-y-1 list-disc list-inside">
            {data.keyCapabilities.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      </div>

      {data.limits && (
        <div className="mt-4">
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">{t('iag.limits')}</p>
          <ul className="text-tiny text-fg-muted leading-relaxed space-y-1 list-disc list-inside">
            {data.limits.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      )}
    </Section>
  )
}

function Step({ n, title, icon, children }: { n: number; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-csp-ibm text-white text-tiny font-semibold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <p className="text-body font-semibold text-gray-800 dark:text-gray-100 mb-0.5 flex items-center gap-1.5">
          {title} <span className="text-csp-ibm-onLight dark:text-csp-ibm-onDark">{icon}</span>
        </p>
        <p className="text-tiny text-fg-muted leading-relaxed">{children}</p>
      </div>
    </li>
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

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline inline-flex items-center gap-0.5">
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
