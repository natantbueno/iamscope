'use client'

import { useState } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckSquare, ShieldAlert, ArrowLeft, ChevronRight, Copy, CheckCheck, Code, ChevronDown } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { IBM_ROLES, IBM_TIER_META } from '@/data/ibmCloud'
import PermissionsTable from '@/components/PermissionsTable'

const CATEGORY_COLORS: Record<string, string> = {
  Identity: '#7c3aed', Platform: '#0f62fe', Infrastructure: '#ea580c',
  Compute: '#0891b2', Data: '#16a34a', Security: '#dc2626',
  Observability: '#ca8a04', Networking: '#6366f1', Classic: '#78716c',
}

export default function IbmCloudRoleClient({ slug }: { slug: string }) {
  const role = IBM_ROLES.find(r => r.slug === slug)
  if (!role) return notFound()

  const [jsonExpanded, setJsonExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const tier = IBM_TIER_META[role.tier]
  const catColor = CATEGORY_COLORS[role.category] || '#6366f1'


  const roleJson = JSON.stringify({
    display_name: role.name,
    description: role.description,
    actions: role.actions || [],
    crn: `crn:v1:bluemix:public:iam::::role:${role.slug}`,
    account_id: '*',
  }, null, 2)

  const jsonLines = roleJson.split('\n')
  const visibleJson = jsonExpanded ? roleJson : jsonLines.slice(0, 12).join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(roleJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell
      headerTitle={role.name}
      headerSub="IBM Cloud IAM — detalhes da role"
      headerBack={
        <Link href="/ibm-cloud/roles" className="flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl space-y-5">

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tier</div>
              <span className="inline-flex items-center text-[12px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: tier.bg, color: tier.color }}>
                {tier.label}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Categoria</div>
              <span className="inline-flex items-center text-[12px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: catColor + '18', color: catColor }}>
                {role.category}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Escopo</div>
              <div className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 capitalize">{role.scope}</div>
            </div>
          </div>

          {/* Privileged warning */}
          {role.isPrivileged && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3">
              <ShieldAlert size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-red-600 dark:text-red-400 leading-relaxed">
                Esta é uma role <strong>privilegiada</strong> — concede capacidades de controle elevado. Aplique o princípio do menor privilégio e monitore o uso via Activity Tracker.
              </p>
            </div>
          )}

          {/* Tier explainer */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />
              <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{tier.label}</h2>
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{tier.description}</p>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2">Descrição</h2>
            <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{role.description}</p>
          </div>

          {/* Privileges */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Privilégios / Capacidades
              <span className="ml-2 text-[11px] font-normal text-gray-400">({role.privileges.length})</span>
            </h2>
            <div className="space-y-2">
              {role.privileges.map((priv, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckSquare size={13} className="mt-0.5 shrink-0" style={{ color: tier.color }} />
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">{priv}</span>
                </div>
              ))}
            </div>
          </div>

          {/* IAM Actions */}
          {role.actions && role.actions.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <span className="flex items-center gap-2">
                  <Code size={13} style={{ color: tier.color }} />
                  IAM Actions
                  <span className="text-[11px] font-normal text-gray-400">({role.actions.length})</span>
                </span>
              </h2>
              <PermissionsTable
                rows={(role.actions ?? []).map((action) => {
                  const parts = action.split('.')
                  return {
                    permission: action,
                    service: parts[0] ?? '',
                    resource: parts.length > 2 ? parts[1] : '',
                    operation: parts.length > 2 ? parts.slice(2).join('.') : (parts[1] ?? ''),
                  }
                })}
                columns={[
                  { key: 'permission', label: 'IAM Action' },
                  { key: 'service',    label: 'Serviço', mono: true, width: 'w-40' },
                  { key: 'resource',   label: 'Recurso', mono: true, width: 'w-32' },
                  { key: 'operation',  label: 'Operação', badge: true, width: 'w-32' },
                ]}
                filterKey="operation"
                accent="#4589ff"
                filename={`ibm-cloud-${role.slug}-actions`}
                noun="actions"
                searchPlaceholder="Filtrar actions..."
              />
            </div>
          )}

          {/* Role Definition (JSON) */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Role Definition (JSON)
            </h2>
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
                  className="mt-2 flex items-center gap-1 text-[11px] text-[#0f62fe] dark:text-[#4589ff] hover:underline"
                >
                  <ChevronDown size={12} className={jsonExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  {jsonExpanded ? 'Mostrar menos' : `Mostrar tudo (${jsonLines.length} linhas)`}
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-end">
            <Link href="/ibm-cloud/reference"
              className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-[#0f62fe] dark:hover:text-[#4589ff] transition-colors">
              Reference <ChevronRight size={13} />
            </Link>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
