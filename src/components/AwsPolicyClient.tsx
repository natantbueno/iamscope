'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { AWS_POLICIES, AWS_TIER_META } from '@/data/aws'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, ExternalLink, CheckSquare, Copy, CheckCheck, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import PermissionsTable from '@/components/PermissionsTable'

const CAT_COLORS: Record<string, string> = {
  IAM: '#dc2626', Compute: '#0891b2', Storage: '#16a34a', Database: '#7c3aed',
  Networking: '#0369a1', Security: '#b91c1c', DevOps: '#ea580c', Serverless: '#f59e0b',
  Containers: '#326ce5', AI: '#8b5cf6', Analytics: '#14b8a6', Management: '#6b7280',
  IoT: '#059669', Billing: '#475569', Messaging: '#d97706',
}
const TYPE_COLORS: Record<string, string> = {
  'managed': '#0891b2', 'service-role': '#7c3aed', 'permission-set': '#16a34a', 'permission-boundary': '#dc2626',
}
const TYPE_LABELS: Record<string, string> = {
  'managed': 'AWS Managed', 'service-role': 'Service Role', 'permission-set': 'Permission Set', 'permission-boundary': 'Permission Boundary',
}

export default function AwsPolicyClient({ slug }: { slug: string }) {
  const policy = AWS_POLICIES.find(p => p.slug === slug)

  if (!policy) {
    return (
      <AppShell headerTitle="Not Found" headerSub="Policy not found">
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <p className="text-[14px]">Policy <code className="font-mono">{slug}</code> not found.</p>
          <Link href="/aws/policies" className="mt-3 text-[12px] text-[#ff9900] hover:underline">Back to Policies</Link>
        </div>
      </AppShell>
    )
  }

  const tier = AWS_TIER_META[policy.tier]
  const catColor = CAT_COLORS[policy.category] ?? '#6b7280'
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
      headerSub={policy.arn}
      headerBack={
        <Link href="/aws/policies" className="flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl space-y-5">

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Tier</p>
              <span className="text-[13px] font-bold" style={{ color: tier.color }}>{tier.label}</span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Categoria</p>
              <span className="text-[13px] font-bold" style={{ color: catColor }}>{policy.category}</span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Tipo</p>
              <span className="text-[13px] font-bold" style={{ color: typeColor }}>{TYPE_LABELS[policy.type]}</span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Escopo</p>
              <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 capitalize">{policy.scope}</span>
            </div>
          </div>

          {/* Privileged warning */}
          {policy.isPrivileged && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40">
              <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700 dark:text-red-400">
                <strong>Privilegiada.</strong> Esta policy concede acesso amplo ou crítico. Aplique com o princípio do menor privilégio.
              </p>
            </div>
          )}

          {/* ARN */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">Amazon Resource Name (ARN)</p>
            <code className="text-[12px] font-mono text-[#ff9900] break-all">{policy.arn}</code>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">Descrição</p>
            <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">{policy.description}</p>
          </div>

          {/* Tier info */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />
              <p className="text-[12px] font-semibold" style={{ color: tier.color }}>{tier.label}</p>
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{tier.description}</p>
          </div>

          {/* Privileges */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-3">Capabilities ({policy.privileges.length})</p>
            <div className="space-y-1.5">
              {policy.privileges.map((priv, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckSquare size={13} className="shrink-0 mt-0.5" style={{ color: typeColor }} />
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">{priv}</span>
                </div>
              ))}
            </div>
          </div>

          {/* IAM Actions */}
          {policy.actions && policy.actions.length > 0 && (
            <AwsActionsSection actions={policy.actions} slug={policy.slug} />
          )}

          {/* Policy Document JSON */}
          <AwsPolicyDocumentJson policy={policy} />

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-3">Relacionadas em {policy.category}</p>
              <div className="space-y-1">
                {related.map(r => (
                  <Link key={r.slug} href={`/aws/policies/${r.slug}`}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColor }} />
                    <span className="flex-1 text-[12px] text-gray-700 dark:text-gray-300 group-hover:text-[#ff9900] transition-colors">{r.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: AWS_TIER_META[r.tier].bg, color: AWS_TIER_META[r.tier].color }}>{r.tier}</span>
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
                className="flex items-center gap-1.5 text-[12px] text-[#ff9900] hover:underline">
                <ExternalLink size={12} />
                AWS Docs
              </a>
            ) : illustrativeDocsUrl ? (
              <a href={illustrativeDocsUrl}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-[12px] text-[#ff9900] hover:underline">
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

function AwsActionsSection({ actions, slug }: { actions: string[]; slug: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-3">
        IAM Actions ({actions.length})
      </p>
      <PermissionsTable
        rows={actions.map((action) => {
          const i = action.indexOf(':')
          return {
            permission: action,
            service: i === -1 ? action : action.substring(0, i),
            operation: i === -1 ? '' : action.substring(i + 1),
            wildcard: action.includes('*') ? 'Wildcard' : 'Específica',
          }
        })}
        columns={[
          { key: 'permission', label: 'IAM Action' },
          { key: 'service',    label: 'Serviço', mono: true, width: 'w-36' },
          { key: 'operation',  label: 'Operação', mono: true },
          { key: 'wildcard',   label: 'Escopo', badge: true, width: 'w-32' },
        ]}
        filterKey="wildcard"
        colors={{ Wildcard: '#fbbf24', 'Específica': '#34d399' }}
        accent="#ff9900"
        filename={`aws-${slug}-actions`}
        noun="actions"
        searchPlaceholder="Filtrar actions..."
      />
    </div>
  )
}

function AwsPolicyDocumentJson({ policy }: { policy: { actions?: string[]; privileges: string[]; name: string } }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const jsonObj = {
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: policy.actions ?? policy.privileges,
      Resource: "*"
    }]
  }

  const jsonStr = JSON.stringify(jsonObj, null, 2)
  const lines = jsonStr.split('\n')
  const PREVIEW_LINES = 12
  const showLines = expanded ? lines : lines.slice(0, PREVIEW_LINES)

  const copyJson = () => {
    navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
          <Code2 size={13} />
          Policy Document (JSON)
        </p>
        <button
          onClick={copyJson}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
          title="Copiar JSON"
        >
          {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <div className="relative">
        <div className="bg-black dark:bg-black rounded-lg p-4 border border-gray-800 overflow-x-auto">
          <pre className="text-[11px] font-mono leading-relaxed">
            {showLines.map((line, i) => (
              <AwsJsonLine key={i} line={line} />
            ))}
          </pre>
        </div>
        {lines.length > PREVIEW_LINES && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[12px] text-[#ff9900] hover:underline"
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
      parts.push(<span key={key++} className="text-gray-400">{keyMatch[1]}</span>)
      parts.push(<span key={key++} className="text-blue-400">&quot;{keyMatch[2]}&quot;</span>)
      parts.push(<span key={key++} className="text-gray-400">{keyMatch[3]}</span>)
      remaining = remaining.slice(keyMatch[0].length)
      continue
    }
    const strMatch = remaining.match(/^(\s*)"([^"]*)"(.*)/)
    if (strMatch) {
      parts.push(<span key={key++} className="text-gray-400">{strMatch[1]}</span>)
      parts.push(<span key={key++} className="text-green-400">&quot;{strMatch[2]}&quot;</span>)
      parts.push(<span key={key++} className="text-gray-400">{strMatch[3]}</span>)
      remaining = ''
      continue
    }
    const boolMatch = remaining.match(/^(\s*)(true|false|null|\d+)(,?)(.*)/)
    if (boolMatch) {
      parts.push(<span key={key++} className="text-gray-400">{boolMatch[1]}</span>)
      parts.push(<span key={key++} className="text-yellow-400">{boolMatch[2]}</span>)
      parts.push(<span key={key++} className="text-gray-400">{boolMatch[3]}{boolMatch[4]}</span>)
      remaining = ''
      continue
    }
    const bracketMatch = remaining.match(/^(\s*)([\[\]{},]+)(.*)/)
    if (bracketMatch) {
      parts.push(<span key={key++} className="text-gray-400">{bracketMatch[1]}{bracketMatch[2]}{bracketMatch[3]}</span>)
      remaining = ''
      continue
    }
    parts.push(<span key={key++} className="text-gray-400">{remaining}</span>)
    remaining = ''
  }

  return <div>{parts}{'\n'}</div>
}
