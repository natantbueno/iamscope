'use client'

import { useState, useEffect } from 'react'
import RoleDetailHeader, { BackToList, roleDetailSub } from './RoleDetailHeader'
import { CLOUD_META } from '@/data/compare/types'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'
import AppShell from '@/components/AppShell'
import { AWS_POLICIES, AWS_TIER_META } from '@/data/aws'
import { getAwsPolicyDoc, type AwsPolicyDoc } from '@/lib/awsActions'
import Link from 'next/link'
import { ShieldAlert, ExternalLink, CheckSquare, Copy, CheckCheck, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import JsonActions from './JsonActions'
import PermissionsTable from '@/components/PermissionsTable'
import { useNumberFormat } from '@/i18n/useNumberFormat'

// Nível 3: a cor por categoria saiu. Eram 15 hex escritos à mão para dizer
// "esta categoria é diferente daquela" — coisa que o nome já diz, e que colidia
// com a escada de tier na mesma página. O ícone e o rótulo ficam.
const CATEGORY_TINT = 'rgb(var(--c-fg-subtle))'
const TYPE_COLORS: Record<string, string> = {
  'managed': '#6b7280', 'service-role': '#6b7280', 'permission-set': '#6b7280', 'permission-boundary': '#6b7280',
}
const TYPE_LABELS: Record<string, string> = {
  'managed': 'AWS Managed', 'service-role': 'Service Role', 'permission-set': 'Permission Set', 'permission-boundary': 'Permission Boundary',
}

export default function AwsPolicyClient({ slug }: { slug: string }) {
  const t = useT()
  const policy = AWS_POLICIES.find(p => p.slug === slug)

  // Documento JSON oficial + actions vivem em public/aws-policy-docs/<slug>.json.
  // Os hooks ficam ANTES do early return de "not found" — chamá-los depois
  // quebraria as regras de hooks quando a policy não existe.
  const [doc, setDoc] = useState<AwsPolicyDoc | null>(null)
  const [docError, setDocError] = useState(false)

  useEffect(() => {
    if (!policy) return
    let alive = true
    setDoc(null)
    setDocError(false)
    getAwsPolicyDoc(policy.slug)
      .then((d) => { if (alive) setDoc(d) })
      .catch(() => { if (alive) setDocError(true) })
    return () => { alive = false }
  }, [policy])

  if (!policy) {
    return (
      <AppShell headerTitle="Not Found" headerSub="Policy not found">
        <div className="flex flex-col items-center justify-center flex-1 text-fg-subtle">
          <p className="text-note">Policy <code className="font-mono">{slug}</code> not found.</p>
          <Link href="/aws/policies" className="mt-3 text-tiny text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">Back to Policies</Link>
        </div>
      </AppShell>
    )
  }

  const tier = AWS_TIER_META[policy.tier]
  const catColor = CATEGORY_TINT
  const typeColor = TYPE_COLORS[policy.type]
  const related = AWS_POLICIES.filter(p => p.category === policy.category && p.slug !== policy.slug).slice(0, 5)

  const docsSlug = policy.arn.replace('arn:aws:iam::aws:policy/', '').replace('service-role/', '').replace('job-function/', '').replace('aws-service-role/', '')
  const isRealManagedPolicyArn = policy.arn.startsWith('arn:aws:iam::aws:policy/')
  const illustrativeDocsUrl =
    policy.type === 'permission-boundary'
      ? 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html'
      : policy.slug === 'organization-account-access-role'
      ? 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html'
      : null

  return (
    <AppShell
      headerTitle={policy.name}
      headerSub={roleDetailSub(CLOUD_META.aws.label, policy.category, tier.label)}
      headerBack={<BackToList href="/aws/policies" />}
      pageHasOwnHeading
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-5xl space-y-5">

          <RoleDetailHeader

            syncPlatform={'AWS IAM'}
            name={policy.name}
            tier={{ label: tier.label, color: tier.color, bg: tier.bg, description: tier.description }}
            categoryBadge={
              <span className="text-tiny font-semibold" style={{ color: catColor }}>{policy.category}</span>
            }
            isPrivileged={policy.isPrivileged}
          />

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
              <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mb-1">{t('table.type')}</p>
              <span className="text-body font-bold" style={{ color: typeColor }}>{TYPE_LABELS[policy.type]}</span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
              <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mb-1">{t('table.scope')}</p>
              <span className="text-body font-bold text-gray-700 dark:text-gray-300 capitalize">{policy.scope}</span>
            </div>
          </div>

          {/* Privileged warning */}
          {policy.isPrivileged && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30">
              <ShieldAlert size={14} className="text-danger shrink-0 mt-0.5" />
              <p className="text-tiny text-danger">
                <strong>Privilegiada.</strong> Esta policy concede acesso amplo ou crítico. Aplique com o princípio do menor privilégio.
              </p>
            </div>
          )}

          {/* ARN */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mb-2">Amazon Resource Name (ARN)</p>
            <code className="text-tiny font-mono text-csp-aws-onLight dark:text-csp-aws-onDark break-all">{policy.arn}</code>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mb-2">{t('table.description')}</p>
            <p className="text-body text-gray-700 dark:text-gray-300 leading-relaxed">{policy.description}</p>
          </div>

          {/* Tier info */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />
              <p className="text-tiny font-semibold" style={{ color: tier.color }}>{tier.label}</p>
            </div>
            <p className="text-tiny text-fg-muted leading-relaxed">{tier.description}</p>
          </div>

          {/*
            Metadados oficiais da AWS. Isto substituiu o bloco "Capabilities",
            que listava policy.privileges — campo que era só um prefixo do
            array de actions, não um texto de capacidades.
          */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mb-3">
              {t('label.policyDetails')} <span className="normal-case font-normal">{t('label.awsData')}</span>
            </p>
            <dl className="space-y-1.5">
              {([
                [t('table.type'), policy.officialType],
                [t('table.createdAt'), policy.createdAt],
                [t('table.lastEdit'), policy.editedAt],
                [t('table.version'), policy.version],
              ] as const).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2">
                  <CheckSquare size={13} className="shrink-0 mt-0.5" style={{ color: typeColor }} />
                  <dt className="text-tiny text-fg-subtle w-28 shrink-0">{k}</dt>
                  <dd className="text-tiny text-fg-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {policy.deprecated && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <ShieldAlert size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-tiny text-amber-700 dark:text-amber-400 leading-relaxed">
                <Rich text={t('label.deprecatedNote')} />
              </p>
            </div>
          )}

          {/* IAM Actions + documento JSON oficial, ambos de public/aws-policy-docs/ */}
          {policy.actionCount > 0 && (
            <AwsActionsSection actions={doc?.actions ?? []} slug={policy.slug}
              total={policy.actionCount} loading={doc === null && !docError} />
          )}

          <AwsPolicyDocumentJson doc={doc} error={docError} nome={policy.name} />

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
              <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mb-3">Relacionadas em {policy.category}</p>
              <div className="space-y-1">
                {related.map(r => (
                  <Link key={r.slug} href={`/aws/policies/${r.slug}`}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColor }} />
                    <span className="flex-1 text-tiny text-gray-700 dark:text-gray-300 group-hover:text-csp-aws transition-colors">{r.name}</span>
                    <span className="text-2xs px-1.5 py-0.5 rounded-full" style={{ background: AWS_TIER_META[r.tier].bg, color: AWS_TIER_META[r.tier].color }}>{r.tier}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Footer links */}
          <div className="flex items-center justify-end pt-1">
            {isRealManagedPolicyArn ? (
              <a href={`https://docs.aws.amazon.com/aws-managed-policy/latest/reference/${docsSlug}.html`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-tiny text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">
                <ExternalLink size={12} />
                AWS Docs
              </a>
            ) : illustrativeDocsUrl ? (
              <a href={illustrativeDocsUrl}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-tiny text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline">
                <ExternalLink size={12} />
                AWS Docs (conceito)
              </a>
            ) : null}
          </div>

        </div>
      </div>
    </AppShell>
  )
}

function AwsActionsSection(
  { actions, slug, total, loading }:
  { actions: string[]; slug: string; total: number; loading: boolean },
) {
  const t = useT()
  const fmt = useNumberFormat()
  return (
    <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
      <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider mb-3">
        IAM Actions ({fmt(total)})
      </p>
      {loading && <p className="text-tiny text-fg-subtle mb-2">{t('state.loadingActions')}</p>}
      <PermissionsTable
        rows={actions.map((action) => {
          const i = action.indexOf(':')
          return {
            permission: action,
            service: i === -1 ? action : action.substring(0, i),
            operation: i === -1 ? '' : action.substring(i + 1),
            wildcard: action.includes('*') ? 'Wildcard' : t('label.specific'),
          }
        })}
        columns={[
          { key: 'permission', label: 'IAM Action' },
          { key: 'service',    label: t('table.service'), mono: true, width: 'w-36' },
          { key: 'operation',  label: t('table.operation'), mono: true },
          { key: 'wildcard',   label: t('table.scope'), badge: true, width: 'w-32' },
        ]}
        filterKey="wildcard"
        riskValues={['Wildcard']}
        filename={`aws-${slug}-actions`}
        noun="noun.actions"
        searchPlaceholder="ph.filterActions"
      />
    </div>
  )
}

/**
 * Documento JSON REAL da policy, como a AWS publica.
 *
 * Antes este bloco *montava* um documento fictício — Version fixa em
 * "2012-10-17", um único Statement e Resource sempre "*" — a partir da lista
 * de actions. Isso escondia Condition, NotAction, Resource específico e
 * múltiplos Statements, ou seja, mostrava uma policy que não existe.
 * Agora vem de public/aws-policy-docs/<slug>.json.
 */
function AwsPolicyDocumentJson(
  { doc, error, nome }: { doc: AwsPolicyDoc | null; error: boolean; nome: string },
) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
        <p className="text-tiny text-red-500">{t('state.jsonLoadFailed')}</p>
      </div>
    )
  }
  if (!doc) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
        <p className="text-tiny text-fg-subtle">{t('state.loadingJson')}</p>
      </div>
    )
  }

  const jsonStr = JSON.stringify(doc.document, null, 2)
  const lines = jsonStr.split('\n')
  const PREVIEW_LINES = 12
  const showLines = expanded ? lines : lines.slice(0, PREVIEW_LINES)

  return (
    <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-2xs text-fg-subtle font-medium uppercase tracking-wider flex items-center gap-1.5">
          <Code2 size={13} />
          Policy Document (JSON)
        </p>
        <JsonActions json={jsonStr} filename={`aws-policy-${nome}`} />
      </div>
      <div className="relative">
        <div className="bg-black dark:bg-black rounded-lg p-4 border border-line overflow-x-auto">
          <pre className="text-3xs font-mono leading-relaxed">
            {showLines.map((line, i) => (
              <AwsJsonLine key={i} line={line} />
            ))}
          </pre>
        </div>
        {lines.length > PREVIEW_LINES && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-tiny text-csp-aws-onLight dark:text-csp-aws-onDark hover:underline"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Recolher' : `Mostrar tudo (${lines.length} linhas)`}
          </button>
        )}
      </div>
    </div>
  )
}

function AwsJsonLine({ line }: { line: string }) {
  const parts: React.ReactNode[] = []
  let remaining = line
  let key = 0

  while (remaining.length > 0) {
    const keyMatch = remaining.match(/^(\s*)"([^"]+)"(:)/)
    if (keyMatch) {
      parts.push(<span key={key++} className="text-fg-subtle">{keyMatch[1]}</span>)
      parts.push(<span key={key++} className="text-blue-400">&quot;{keyMatch[2]}&quot;</span>)
      parts.push(<span key={key++} className="text-fg-subtle">{keyMatch[3]}</span>)
      remaining = remaining.slice(keyMatch[0].length)
      continue
    }
    const strMatch = remaining.match(/^(\s*)"([^"]*)"(.*)/)
    if (strMatch) {
      parts.push(<span key={key++} className="text-fg-subtle">{strMatch[1]}</span>)
      parts.push(<span key={key++} className="text-green-400">&quot;{strMatch[2]}&quot;</span>)
      parts.push(<span key={key++} className="text-fg-subtle">{strMatch[3]}</span>)
      remaining = ''
      continue
    }
    const boolMatch = remaining.match(/^(\s*)(true|false|null|\d+)(,?)(.*)/)
    if (boolMatch) {
      parts.push(<span key={key++} className="text-fg-subtle">{boolMatch[1]}</span>)
      parts.push(<span key={key++} className="text-yellow-400">{boolMatch[2]}</span>)
      parts.push(<span key={key++} className="text-fg-subtle">{boolMatch[3]}{boolMatch[4]}</span>)
      remaining = ''
      continue
    }
    const bracketMatch = remaining.match(/^(\s*)([\[\]{},]+)(.*)/)
    if (bracketMatch) {
      parts.push(<span key={key++} className="text-fg-subtle">{bracketMatch[1]}{bracketMatch[2]}{bracketMatch[3]}</span>)
      remaining = ''
      continue
    }
    parts.push(<span key={key++} className="text-fg-subtle">{remaining}</span>)
    remaining = ''
  }

  return <div>{parts}{'\n'}</div>
}
