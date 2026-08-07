'use client'

import AppShell from '@/components/AppShell'
import ReferenceIndex from '@/components/ReferenceIndex'
import { GCP_ROLES, GCP_TIER_META, GcpTier } from '@/data/gcp'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'

const TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']

// Nível 3: a lista continua, a cor saiu. Eram 15 hex para distinguir 15
// palavras que já se distinguem — e cinco deles eram os mesmos da escada de tier.
const CATEGORIES: string[] = [
  'IAM', 'Compute', 'Storage', 'BigQuery', 'Kubernetes', 'Database', 'Networking', 'Security', 'DevOps', 'Serverless', 'AI', 'Analytics', 'Observability', 'Billing', 'Management',
]

// Título de documentação oficial não se traduz — é o nome da página no
// cloud.google.com, e é por ele que a pessoa acha o documento.
const GCP_DOCS = [
  { title: 'Understanding IAM Roles', url: 'https://cloud.google.com/iam/docs/understanding-roles' },
  { title: 'Predefined Roles Reference', url: 'https://cloud.google.com/iam/docs/predefined-roles' },
  { title: 'Using IAM Securely', url: 'https://cloud.google.com/iam/docs/using-iam-securely' },
  { title: 'IAM Conditions', url: 'https://cloud.google.com/iam/docs/conditions-overview' },
  { title: 'Service Account Best Practices', url: 'https://cloud.google.com/iam/docs/best-practices-for-securing-service-accounts' },
  { title: 'Resource Hierarchy', url: 'https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy' },
  { title: 'Org Policy Service', url: 'https://cloud.google.com/resource-manager/docs/organization-policy/overview' },
  { title: 'VPC Service Controls', url: 'https://cloud.google.com/vpc-service-controls/docs/overview' },
]

// `scope` é o valor gravado no dado, não texto de tela — fica fora do dicionário.
const SCOPES: { scope: string; label: TranslationKey; desc: TranslationKey; color: string }[] = [
  { scope: 'org',      label: 'gcp.scopeOrg',      desc: 'gcp.scopeOrgD',      color: '#dc2626' },
  { scope: 'folder',   label: 'gcp.scopeFolder',   desc: 'gcp.scopeFolderD',   color: '#ea580c' },
  { scope: 'project',  label: 'gcp.scopeProject',  desc: 'gcp.scopeProjectD',  color: '#4285f4' },
  { scope: 'resource', label: 'gcp.scopeResource', desc: 'gcp.scopeResourceD', color: '#16a34a' },
]

const BEST_PRACTICES: { title: TranslationKey; body: TranslationKey }[] = [
  { title: 'gcp.bpLeastTitle', body: 'gcp.bpLeastBody' },
  { title: 'gcp.bpPrimTitle',  body: 'gcp.bpPrimBody' },
  { title: 'gcp.bpSaTitle',    body: 'gcp.bpSaBody' },
  { title: 'gcp.bpAuditTitle', body: 'gcp.bpAuditBody' },
  { title: 'gcp.bpVpcTitle',   body: 'gcp.bpVpcBody' },
  { title: 'gcp.bpRotTitle',   body: 'gcp.bpRotBody' },
]

export default function GcpReferenceClient() {
  const t = useT()

  return (
    <AppShell
      headerTitle="GCP IAM Reference"
      headerSub={t('ref.headerSubTiers')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl space-y-6">

          <ReferenceIndex cloud="gcp" />

          {/* Tier reference table */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('ref.roleTiers')}</h2>
            <div className="space-y-3">
              {TIERS.map(tier => {
                const meta = GCP_TIER_META[tier]
                const count = GCP_ROLES.filter(r => r.tier === tier).length
                return (
                  <div key={tier} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-tiny font-semibold">{meta.label}</span>
                        <Link href={`/gcp/roles?filter=${tier}`}
                          className="text-2xs text-fg-subtle hover:text-csp-gcp transition-colors">{count} {t('noun.roles')} →</Link>
                      </div>
                      <p className="text-tiny text-fg-muted">{meta.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scope reference */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.assignmentScopes')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {SCOPES.map(s => (
                <div key={s.scope} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-tiny font-semibold text-gray-700 dark:text-gray-300">{t(s.label)}</span>
                    <span className="text-2xs font-mono text-fg-subtle">{s.scope}</span>
                  </div>
                  <p className="text-tiny text-fg-muted leading-relaxed">{t(s.desc)}</p>
                  <div className="mt-1 text-3xs text-fg-subtle">
                    {GCP_ROLES.filter(r => r.scope === s.scope).length} {t('noun.roles')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('section.categoriesByService')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const count = GCP_ROLES.filter(r => r.category === cat).length
                if (!count) return null
                return (
                  <Link key={cat} href={`/gcp/roles?category=${cat}`}
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
                  <span className="w-5 h-5 rounded-full bg-csp-gcp/10 text-csp-gcp-onLight dark:text-csp-gcp-onDark text-2xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-tiny font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{t(p.title)}</div>
                    <p className="text-tiny text-fg-muted leading-relaxed">{t(p.body)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* External docs */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('data.officialDocs')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {GCP_DOCS.map(d => (
                <a key={d.url} href={d.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-csp-gcp/50 hover:bg-csp-gcp/5 transition-all group">
                  <ExternalLink size={12} className="text-fg-muted dark:text-gray-600 group-hover:text-csp-gcp shrink-0" />
                  <span className="text-tiny text-fg-muted group-hover:text-csp-gcp transition-colors">{d.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Frescor dos dados */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('ref.freshnessTitle')}</h2>
            <p className="text-tiny text-fg-muted leading-relaxed mb-3">
              {t('ref.freshnessLeadA')}{' '}
              <Link href="/info" className="text-csp-gcp-onLight dark:text-csp-gcp-onDark hover:underline">{t('info.title')}</Link>{' '}
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
                {DATA_SYNC.filter(d => d.platform === 'GCP IAM').map((d, i, arr) => (
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
