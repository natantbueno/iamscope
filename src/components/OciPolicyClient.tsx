'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, CheckSquare, ExternalLink, Copy, CheckCheck, Code, ChevronDown } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { OCI_POLICIES, OCI_TIER_META } from '@/data/oci'
import PermissionsTable from '@/components/PermissionsTable'

const CAT_COLORS: Record<string, string> = {
  Identity: '#6366f1', Compute: '#0891b2', Storage: '#0d9488',
  Networking: '#8b5cf6', Database: '#0ea5e9', Security: '#dc2626',
  DevOps: '#f59e0b', Containers: '#06b6d4', Serverless: '#a855f7',
  Messaging: '#10b981', Analytics: '#f97316', Monitoring: '#64748b',
  AI: '#ec4899', Billing: '#84cc16', Management: '#6b7280',
}

const SCOPE_LABEL: Record<string, string> = {
  tenancy: 'Tenancy',
  compartment: 'Compartment',
  resource: 'Resource',
}

export default function OciPolicyClient({ slug }: { slug: string }) {
  const policy = OCI_POLICIES.find(p => p.slug === slug)
  if (!policy) {
    return (
      <AppShell headerTitle="Policy não encontrada" headerSub="OCI IAM"
        headerBack={<Link href="/oci/policies" className="text-[#C74634] hover:underline text-[13px]">← Políticas</Link>}>
        <div className="flex items-center justify-center flex-1 text-gray-400">Policy não encontrada.</div>
      </AppShell>
    )
  }

  const tier = OCI_TIER_META[policy.tier]
  const catColor = CAT_COLORS[policy.category] ?? '#6b7280'
  const related = OCI_POLICIES.filter(p => p.category === policy.category && p.slug !== policy.slug).slice(0, 5)

  const [jsonExpanded, setJsonExpanded] = useState(false)
  const [copied, setCopied] = useState(false)


  const policyJson = JSON.stringify({
    policyName: policy.name,
    statements: [policy.exampleStatement],
    compartment: policy.scope,
    resourceTypes: policy.resourceTypes,
    verbLevel: policy.tier,
  }, null, 2)

  const jsonLines = policyJson.split('\n')
  const visibleJson = jsonExpanded ? policyJson : jsonLines.slice(0, 12).join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(policyJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell
      headerTitle={policy.name}
      headerSub={`OCI IAM · ${policy.category} · ${tier.label}`}
      headerBack={
        <Link href="/oci/policies" className="flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
      }
    >
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 max-w-5xl">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Verb Tier</p>
            <span className="mt-1 inline-block text-[13px] px-2.5 py-1 rounded-full font-semibold" style={{ background: tier.bg, color: tier.color }}>{tier.label}</span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Categoria</p>
            <span className="mt-1 inline-block text-[13px] px-2.5 py-1 rounded-full border font-medium" style={{ borderColor: catColor + '60', color: catColor }}>{policy.category}</span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Escopo</p>
            <p className="text-[15px] font-bold text-gray-800 dark:text-gray-100 mt-1">{SCOPE_LABEL[policy.scope]}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Privilegiado</p>
            <p className="text-[15px] font-bold mt-1" style={{ color: policy.isPrivileged ? '#dc2626' : '#16a34a' }}>
              {policy.isPrivileged ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>

        {/* Privileged warning */}
        {policy.isPrivileged && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <ShieldAlert size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-700 dark:text-red-400">
              Esta policy é <strong>privilegiada</strong> — concede acesso de alto impacto. Atribua apenas a grupos de administração confiáveis e monitore com Cloud Guard e Audit Logs.
            </p>
          </div>
        )}

        {/* Description */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Descrição</p>
          <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">{policy.description}</p>
        </div>

        {/* Tier explanation */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Verb: {tier.label}</p>
          <p className="text-[12px] text-gray-600 dark:text-gray-400">{tier.description}</p>
        </div>

        {/* Example statement */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Exemplo de Policy Statement</p>
          <code className="block text-[12px] font-mono bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded-lg border border-gray-200 dark:border-gray-700 break-all">
            {policy.exampleStatement}
          </code>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
            Substitua o nome do grupo e compartimento conforme sua estrutura OCI.
          </p>
        </div>

        {/* Resource types */}
        {policy.resourceTypes.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Resource Types</p>
            <div className="flex flex-wrap gap-1.5">
              {policy.resourceTypes.map(rt => (
                <span key={rt} className="text-[11px] px-2 py-0.5 rounded font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {rt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Privileges */}
        {policy.privileges.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Permissões</p>
            <ul className="space-y-1.5">
              {policy.privileges.map((priv, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckSquare size={13} className="shrink-0 mt-0.5" style={{ color: tier.color }} />
                  <span className="text-[12px] text-gray-700 dark:text-gray-300">{priv}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Verb Actions */}
        {policy.verbActions && policy.verbActions.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              <span className="flex items-center gap-2">
                <Code size={13} style={{ color: tier.color }} />
                Verb Actions
                <span className="text-[11px] font-normal text-gray-400">({policy.verbActions.length})</span>
              </span>
            </p>
            <PermissionsTable
              rows={(policy.verbActions ?? []).map((action) => {
                const i = action.lastIndexOf('_')
                return {
                  permission: action,
                  resource: i === -1 ? action : action.substring(0, i),
                  operation: i === -1 ? '' : action.substring(i + 1),
                }
              })}
              columns={[
                { key: 'permission', label: 'Verb Action' },
                { key: 'resource',   label: 'Resource Type', mono: true, width: 'w-48' },
                { key: 'operation',  label: 'Operação', badge: true, width: 'w-32' },
              ]}
              filterKey="operation"
              accent="#C74634"
              filename={`oci-${policy.slug}-verb-actions`}
              noun="verb actions"
              searchPlaceholder="Filtrar actions..."
            />
          </div>
        )}

        {/* Policy Statement (JSON) */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Policy Statement (JSON)</p>
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors z-10"
              title="Copiar JSON"
            >
              {copied ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} className="text-gray-400" />}
            </button>
            <pre className="bg-black dark:bg-black rounded-lg p-4 border border-gray-800 overflow-x-auto">
              <code className="text-[11px] font-mono text-gray-300" dangerouslySetInnerHTML={{ __html: visibleJson
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
                .replace(/: "(.*?)"/g, ': <span class="text-green-400">"$1"</span>')
                .replace(/: (true|false)/g, ': <span class="text-yellow-400">$1</span>')
                .replace(/[\{\}\[\]]/g, '<span class="text-gray-400">$&</span>')
              }} />
            </pre>
            {jsonLines.length > 12 && (
              <button
                onClick={() => setJsonExpanded(!jsonExpanded)}
                className="mt-2 flex items-center gap-1 text-[11px] text-[#C74634] hover:underline"
              >
                <ChevronDown size={12} className={jsonExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                {jsonExpanded ? 'Mostrar menos' : `Mostrar tudo (${jsonLines.length} linhas)`}
              </button>
            )}
          </div>
        </div>

        {/* Related policies */}
        {related.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-4">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Policies Relacionadas — {policy.category}</p>
            <div className="space-y-1">
              {related.map(r => {
                const rm = OCI_TIER_META[r.tier]
                return (
                  <Link key={r.slug} href={`/oci/policies/${r.slug}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: rm.bg, color: rm.color }}>{rm.label}</span>
                    <span className="text-[12px] text-gray-700 dark:text-gray-300 group-hover:text-[#C74634] transition-colors">{r.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pb-2">
          <a href="https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/policyreference.htm"
            target="_blank" rel="noopener"
            className="text-[12px] text-gray-400 hover:text-[#C74634] transition-colors flex items-center gap-1">
            OCI Policy Reference <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </AppShell>
  )
}
