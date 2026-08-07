'use client'

import AppShell from '@/components/AppShell'
import ReferenceIndex from '@/components/ReferenceIndex'
import { AWS_POLICIES, AWS_TIER_META, AwsTier } from '@/data/aws'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'
import type { TranslationKey } from '@/i18n/dictionary'

const TIERS: AwsTier[] = ['FullAccess', 'PowerUser', 'ReadOnly', 'Operator', 'Specialized']

// Nível 3: a lista continua, a cor saiu. Eram 15 hex para distinguir 15
// palavras que já se distinguem — e cinco deles eram os mesmos da escada de tier.
const CATEGORIES: string[] = [
  'IAM', 'Compute', 'Storage', 'Database', 'Networking', 'Security', 'DevOps', 'Serverless', 'Containers', 'AI', 'Analytics', 'Management', 'IoT', 'Billing', 'Messaging',
]

// Título de documentação oficial não se traduz — é o nome da página no
// docs.aws.amazon.com, e é por ele que a pessoa acha o documento.
const AWS_DOCS = [
  { title: 'AWS Managed Policies Reference', url: 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/about-managed-policy-reference.html' },
  { title: 'IAM Best Practices', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html' },
  { title: 'Understanding Policies', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html' },
  { title: 'IAM Access Analyzer', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html' },
  { title: 'Service Control Policies (SCPs)', url: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html' },
  { title: 'IAM Identity Center (SSO)', url: 'https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html' },
  { title: 'Permission Boundaries', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html' },
  { title: 'Attribute-Based Access Control', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html' },
]

// `type` é o valor gravado no dado e `label` é o nome do conceito na AWS —
// nenhum dos dois é texto de tela traduzível.
const POLICY_TYPES: { type: string; label: string; color: string; desc: TranslationKey }[] = [
  { type: 'managed',             label: 'AWS Managed',        color: '#0891b2', desc: 'aws.typeManagedD' },
  { type: 'service-role',        label: 'Service Role',       color: '#7c3aed', desc: 'aws.typeServiceD' },
  { type: 'permission-set',      label: 'Permission Set',     color: '#16a34a', desc: 'aws.typePermSetD' },
  { type: 'permission-boundary', label: 'Permission Boundary', color: '#dc2626', desc: 'aws.typeBoundaryD' },
]

const BEST_PRACTICES: { title: TranslationKey; body: TranslationKey }[] = [
  { title: 'aws.bpAdminTitle',  body: 'aws.bpAdminBody' },
  { title: 'aws.bpRolesTitle',  body: 'aws.bpRolesBody' },
  { title: 'aws.bpSsoTitle',    body: 'aws.bpSsoBody' },
  { title: 'aws.bpBoundTitle',  body: 'aws.bpBoundBody' },
  { title: 'aws.bpAnalyzTitle', body: 'aws.bpAnalyzBody' },
  { title: 'aws.bpMfaTitle',    body: 'aws.bpMfaBody' },
]

export default function AwsReferenceClient() {
  const t = useT()

  return (
    <AppShell headerTitle="AWS IAM Reference" headerSub={t('aws.headerSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl space-y-6">

          <ReferenceIndex cloud="aws" />

          {/* Tier reference */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('ref.accessTiers')}</h2>
            <div className="space-y-3">
              {TIERS.map(tier => {
                const meta = AWS_TIER_META[tier]
                const count = AWS_POLICIES.filter(p => p.tier === tier).length
                return (
                  <div key={tier} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-tiny font-semibold">{meta.label}</span>
                        <Link href={`/aws/policies?filter=${tier}`} className="text-2xs text-fg-subtle hover:text-csp-aws transition-colors">{count} {t('noun.policies')} →</Link>
                      </div>
                      <p className="text-tiny text-fg-muted">{meta.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Policy types */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('aws.policyTypes')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {POLICY_TYPES.map(pt => (
                <div key={pt.type} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: pt.color }} />
                    <span className="text-tiny font-semibold">{pt.label}</span>
                  </div>
                  <p className="text-3xs text-fg-muted leading-relaxed">{t(pt.desc)}</p>
                  <div className="mt-1 text-3xs text-fg-subtle">
                    {AWS_POLICIES.filter(p => p.type === pt.type).length} {t('noun.policies')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permission Boundaries — deep dive */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('aws.boundaryTitle')}</h2>
            <p className="text-tiny text-fg-muted leading-relaxed mb-4">
              <Rich text={t('aws.boundaryIntro')} className="text-gray-700 dark:text-gray-300" />
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
              <div className="flex-1 p-3 rounded-lg bg-surface-faint dark:bg-gray-800 border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-2xs text-fg-subtle uppercase tracking-wider mb-1">Identity Policy</p>
                <p className="text-3xs text-fg-muted"><code className="font-mono">s3:*</code>, <code className="font-mono">ec2:*</code></p>
              </div>
              <div className="flex items-center justify-center text-base font-bold text-fg-subtle">∩</div>
              <div className="flex-1 p-3 rounded-lg bg-surface-faint dark:bg-gray-800 border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-2xs text-fg-subtle uppercase tracking-wider mb-1">Permission Boundary</p>
                <p className="text-3xs text-fg-muted"><code className="font-mono">s3:*</code>, deny <code className="font-mono">iam:*</code></p>
              </div>
              <div className="flex items-center justify-center text-base font-bold text-fg-subtle">=</div>
              <div className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-center">
                <p className="text-2xs text-red-500 uppercase tracking-wider mb-1">{t('aws.boundaryEffective')}</p>
                <p className="text-3xs text-red-700 dark:text-red-400"><Rich text={t('aws.boundaryResult')} /></p>
              </div>
            </div>
            <p className="text-tiny text-fg-muted leading-relaxed">
              <Rich text={t('aws.boundaryBodyA')} className="text-gray-700 dark:text-gray-300" />{' '}
              (<Link href="/aws/policies?filter=all&category=IAM" className="text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">{t('aws.boundaryLink')}</Link>){' '}
              {t('aws.boundaryBodyB')}
            </p>
            <p className="text-tiny text-fg-muted leading-relaxed mt-2">
              {t('aws.boundaryOrgA')}{' '}
              <Link href="/aws/scp-vs-identity-policies" className="text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">SCP vs Identity Policies</Link>.
            </p>
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.categoriesByService')}</h2>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const count = AWS_POLICIES.filter(p => p.category === cat).length
                if (!count) return null
                return (
                  <Link key={cat} href={`/aws/policies?category=${cat}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-current transition-colors group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-fg-subtle" />
                      <span className="text-tiny text-fg-muted group-hover:font-medium">{cat}</span>
                    </div>
                    <span className="text-3xs font-semibold text-fg-muted tabular">{count}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Best practices */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('ref.bestPractices')}</h2>
            <div className="space-y-3">
              {BEST_PRACTICES.map((p, i) => (
                <div key={p.title} className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="w-5 h-5 rounded-full bg-csp-aws/10 text-csp-aws-onLight dark:text-csp-aws-onDark text-2xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-tiny font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{t(p.title)}</div>
                    <p className="text-tiny text-fg-muted leading-relaxed">{t(p.body)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Docs */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('data.officialDocs')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {AWS_DOCS.map(d => (
                <a key={d.url} href={d.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-csp-aws/50 hover:bg-csp-aws/5 transition-all group">
                  <ExternalLink size={12} className="text-fg-muted dark:text-gray-600 group-hover:text-csp-aws shrink-0" />
                  <span className="text-tiny text-fg-muted group-hover:text-csp-aws transition-colors">{d.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Frescor dos dados */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('ref.freshnessTitle')}</h2>
            <p className="text-tiny text-fg-muted leading-relaxed mb-3">
              {t('ref.freshnessLeadA')}{' '}
              <Link href="/info" className="text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">{t('info.title')}</Link>{' '}
              {t('ref.freshnessLeadB')}
            </p>
            <table className="w-full text-body border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">{t('data.dataset')}</th>
                  <th className="text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5">{t('data.lastCheck')}</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter(d => d.platform === 'AWS IAM').map((d, i, arr) => (
                  <tr key={d.id} className={`${i === arr.length - 1 ? '' : 'border-b border-gray-100 dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                    <td className="px-4 py-2.5 align-top text-body font-medium text-gray-700 dark:text-gray-300">{d.label}</td>
                    <td className="px-4 py-2.5 align-top text-body text-fg-muted"><code className="font-mono text-tiny">{d.lastSynced}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
