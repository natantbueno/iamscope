'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, Hash, Tag, Layers, CheckSquare, Copy, CheckCheck, Code, ChevronDown } from 'lucide-react'
import { GWS_ROLES, GWS_TIER_META } from '@/data/googleWorkspace'
import AppShell from '@/components/AppShell'
import PermissionsTable from '@/components/PermissionsTable'

export default function GwsRoleClient({ slug }: { slug: string }) {
  const role = GWS_ROLES.find((r) => r.slug === slug)

  if (!role) {
    return (
      <AppShell headerTitle="Role não encontrada" headerSub="Google Workspace">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Role não encontrada.{' '}
            <Link href="/google-workspace/roles" className="text-[#4ade80] underline">Voltar</Link>
          </p>
        </div>
      </AppShell>
    )
  }

  const meta = GWS_TIER_META[role.tier]

  const [jsonExpanded, setJsonExpanded] = useState(false)
  const [copied, setCopied] = useState(false)


  const roleJson = JSON.stringify({
    roleId: role.slug,
    roleName: role.name,
    roleDescription: role.description,
    rolePrivileges: (role.apiPrivileges || []).map(p => ({
      privilegeName: p,
      serviceId: 'admin.googleapis.com',
    })),
    isSystemRole: true,
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
      headerSub={`Google Workspace · ${role.category} · ${meta.label}`}
      headerBack={
        <Link href="/google-workspace/roles"
          className="flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
      }
    >
      <div className="flex-1 overflow-y-auto bg-gray-950">
      <div className="max-w-5xl px-6 py-6">

        {/* Title */}
        <div className="mb-5">
          <div className="flex items-start gap-3 flex-wrap mb-2">
            <h1 className="text-[24px] font-semibold text-gray-100">{role.name}</h1>
            {role.isPrivileged && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950 text-red-400 mt-1.5">
                <ShieldAlert size={12} /> Privilegiada
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
              {meta.label}
            </span>
            <span className="text-[12px] text-gray-500">{role.category}</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <StatCard icon={<Layers size={13} />}      label="Admin Tier"   accent={meta.darkText}>
            <span className="text-[18px] font-bold" style={{ color: meta.darkText }}>{meta.short}</span>
          </StatCard>
          <StatCard icon={<Tag size={13} />}         label="Categoria"    accent="#93c5fd">
            <span className="text-[16px] font-bold text-[#93c5fd]">{role.category}</span>
          </StatCard>
          <StatCard icon={<CheckSquare size={13} />} label="Privilégios"  accent="#4ade80">
            <span className="text-[22px] font-bold text-[#4ade80]">{role.privileges.length}</span>
          </StatCard>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-6">
          <FactCard icon={<Hash size={14} />} label="Slug / ID">
            <code className="font-mono text-[11px] text-gray-300 break-all">{role.slug}</code>
          </FactCard>
          <FactCard icon={<Tag size={14} />} label="Categoria">
            <span className="text-[13px] text-gray-200">{role.category}</span>
          </FactCard>
        </div>

        {/* Tier explainer */}
        <section className="rounded-lg p-4 border mb-6"
          style={{ background: meta.darkBg, borderColor: meta.darkText + '30' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Layers size={15} style={{ color: meta.darkText }} />
            <span className="text-[13px] font-semibold" style={{ color: meta.darkText }}>
              Admin Tier: {meta.label}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: meta.darkText }}>
            {meta.description}
          </p>
        </section>

        {/* Description */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
          <h2 className="text-[14px] font-semibold text-gray-100 mb-2">Descrição</h2>
          <p className="text-[13px] text-gray-300 leading-relaxed">{role.description}</p>
        </section>

        {/* Privileges */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
          <h2 className="text-[14px] font-semibold text-gray-100 mb-4">
            Privilégios <span className="text-[12px] font-normal text-gray-500 ml-2">({role.privileges.length})</span>
          </h2>
          <div className="space-y-1.5">
            {role.privileges.map((priv) => (
              <div key={priv} className="flex items-center gap-2.5 px-3 py-2 rounded bg-gray-800 border border-gray-700">
                <CheckSquare size={12} className="text-[#4ade80] shrink-0" />
                <span className="text-[12px] text-gray-200">{priv}</span>
              </div>
            ))}
          </div>
        </section>

        {/* API Privileges */}
        {role.apiPrivileges && role.apiPrivileges.length > 0 && (
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <h2 className="text-[14px] font-semibold text-gray-100 mb-3">
              <span className="flex items-center gap-2">
                <Code size={13} className="text-[#4ade80]" />
                API Privileges
                <span className="text-[12px] font-normal text-gray-500">({role.apiPrivileges.length})</span>
              </span>
            </h2>
            <PermissionsTable
              rows={(role.apiPrivileges ?? []).map((priv) => {
                const i = priv.indexOf('_')
                return {
                  permission: priv,
                  area: i === -1 ? priv : priv.substring(0, i),
                  operation: i === -1 ? '' : priv.substring(i + 1).replace(/_/g, ' '),
                }
              })}
              columns={[
                { key: 'permission', label: 'API Privilege' },
                { key: 'area',       label: 'Área', badge: true, width: 'w-36' },
                { key: 'operation',  label: 'Operação', width: 'w-48' },
              ]}
              filterKey="area"
              accent="#4ade80"
              filename={`google-workspace-${role.slug}-privileges`}
              noun="privileges"
              searchPlaceholder="Filtrar privileges..."
            />
          </section>
        )}

        {/* Role Definition (JSON) */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
          <h2 className="text-[14px] font-semibold text-gray-100 mb-3">
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
                className="mt-2 flex items-center gap-1 text-[11px] text-[#4ade80] hover:underline"
              >
                <ChevronDown size={12} className={jsonExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                {jsonExpanded ? 'Mostrar menos' : `Mostrar tudo (${jsonLines.length} linhas)`}
              </button>
            )}
          </div>
        </section>

        {/* Docs link */}
        <a href="https://developers.google.com/workspace/admin/roles" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[13px] text-[#4ade80] hover:underline mb-8">
          Ver documentação oficial no Google Workspace Admin SDK
        </a>

      </div>
      </div>
    </AppShell>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}

function StatCard({ icon, label, accent, children }: { icon: React.ReactNode; label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: accent }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}
