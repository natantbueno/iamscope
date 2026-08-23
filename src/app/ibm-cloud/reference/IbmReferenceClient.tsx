'use client'

import AppShell from '@/components/AppShell'
import ReferenceIndex from '@/components/ReferenceIndex'
// TIER_META vem de '@/data/tierMeta', não do módulo de dados. Os dois exportam
// o mesmo objeto, mas importar pelo módulo de dados arrasta o dataset inteiro
// para o bundle desta rota — que é justamente o que tierMeta.ts foi criado
// para evitar. Ver o cabeçalho de src/data/tierMeta.ts.
import { IBM_TIER_META } from '@/data/tierMeta'
import type { IbmTier } from '@/data/ibmCloud'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'
import type { TranslationKey } from '@/i18n/dictionary'

const TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

// Os três elementos de uma política. "Role" não se traduz — é o nome do campo
// na própria API do IBM Cloud.
const POLICY_ELEMENTS: { label: TranslationKey | 'Role'; desc: TranslationKey; color: string }[] = [
  { label: 'ibm.elemSubject',  desc: 'ibm.elemSubjectD',  color: '#7c3aed' },
  { label: 'Role',             desc: 'ibm.elemRoleD',     color: '#08bdba' },
  { label: 'ibm.elemResource', desc: 'ibm.elemResourceD', color: '#16a34a' },
]

const SOURCES = [
  { label: 'IBM Cloud IAM Roles', url: 'https://cloud.ibm.com/docs/iam?topic=iam-userroles' },
  { label: 'Platform & Service Roles', url: 'https://cloud.ibm.com/docs/iam?topic=iam-service-roles-actions' },
  { label: 'Access Groups', url: 'https://cloud.ibm.com/docs/iam?topic=iam-groups' },
  { label: 'Trusted Profiles', url: 'https://cloud.ibm.com/docs/iam?topic=iam-create-trusted-profile' },
  { label: 'Classic Infrastructure Permissions', url: 'https://cloud.ibm.com/docs/iam?topic=iam-mngclassicinfra#how-classic-infra-permissions-work' },
  { label: 'Migrated SoftLayer Permissions', url: 'https://cloud.ibm.com/docs/iam?topic=iam-migrated_permissions' },
]

export default function IbmReferenceClient() {
  const t = useT()

  return (
    <AppShell
      headerTitle="IBM Cloud IAM — Reference"
      headerSub={t('ref.headerSubTiers')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 max-w-3xl space-y-8">

          <ReferenceIndex cloud="ibmCloud" />

          <section>
            <h2 className="text-lead font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('ibm.tiersTitle')}</h2>
            <div className="space-y-3">
              {TIERS.map(tier => {
                const m = IBM_TIER_META[tier]
                return (
                  <div key={tier} className="flex items-start gap-3 p-4 rounded-xl border border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: m.color }} />
                    <div>
                      <div className="text-body font-semibold mb-1" style={{ color: m.color }}>{m.label}</div>
                      <p className="text-tiny text-fg-muted leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lead font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('ibm.policyTitle')}</h2>
            <p className="text-body text-fg-muted leading-relaxed mb-3">
              <Rich text={t('ibm.policyIntro')} />
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {POLICY_ELEMENTS.map(item => (
                <div key={item.label} className="p-3 rounded-lg border border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="text-tiny font-semibold mb-1" style={{ color: item.color }}>
                    {item.label === 'Role' ? 'Role' : t(item.label)}
                  </div>
                  <p className="text-3xs text-fg-muted leading-relaxed">{t(item.desc)}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lead font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('ibm.platVsSvc')}</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900">
                <h3 className="text-body font-semibold text-gray-700 dark:text-gray-200 mb-1">Platform Roles</h3>
                <p className="text-tiny text-fg-muted leading-relaxed">
                  <Rich text={t('ibm.platformBody')} />
                </p>
              </div>
              <div className="p-4 rounded-xl border border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900">
                <h3 className="text-body font-semibold text-gray-700 dark:text-gray-200 mb-1">Service Roles</h3>
                <p className="text-tiny text-fg-muted leading-relaxed">
                  <Rich text={t('ibm.serviceBody')} />
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lead font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('ibm.groupsTitle')}</h2>
            <p className="text-tiny text-fg-muted leading-relaxed mb-3">
              <Rich text={t('ibm.groupsBody')} />{' '}
              <Link href="/ibm-cloud/access-groups" className="text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline">Access Groups &amp; Trusted Profiles</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lead font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('data.sources')}</h2>
            <div className="space-y-2">
              {SOURCES.map(s => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-tiny text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline">
                  <ExternalLink size={12} /> {s.label}
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lead font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('ref.freshnessTitle')}</h2>
            <p className="text-tiny text-fg-muted leading-relaxed mb-3">
              {t('ref.freshnessLeadA')}{' '}
              <Link href="/info" className="text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline">{t('info.title')}</Link>{' '}
              {t('ref.freshnessLeadB')}
            </p>
            <table className="w-full text-body border border-surface-border dark:border-gray-800 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-800">
                  <th className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">{t('data.dataset')}</th>
                  <th className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">{t('data.lastCheck')}</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter(d => d.platform === 'IBM Cloud').map((d, i, arr) => (
                  <tr key={d.id} className={`${i === arr.length - 1 ? '' : 'border-b border-surface-border dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                    <td className="px-4 py-2.5 align-top text-body font-medium text-gray-700 dark:text-gray-300">{d.label}</td>
                    <td className="px-4 py-2.5 align-top text-body text-fg-muted"><code className="font-mono text-tiny">{d.lastSynced}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
