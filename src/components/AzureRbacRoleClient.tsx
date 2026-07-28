'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, CheckCheck, ExternalLink, ShieldAlert, Hash, Tag, Layers, BookOpen, Shield, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import { AZURE_ROLES, AZURE_TIER_META, AzureRbacPermission, AzurePermType } from '@/data/azureRbac'
import AppShell from '@/components/AppShell'
import PermissionsTable from '@/components/PermissionsTable'

const TYPE_COLORS: Record<AzurePermType, { bg: string; text: string; label: string }> = {
  Actions:        { bg: '#e6f4ea', text: '#1a5c28', label: 'Actions' },
  NotActions:     { bg: '#fde8e8', text: '#9a2020', label: 'NotActions' },
  DataActions:    { bg: '#e8f1fb', text: '#0a4f8c', label: 'DataActions' },
  NotDataActions: { bg: '#fef3e2', text: '#7a4a00', label: 'NotDataActions' },
}

export default function AzureRbacRoleClient({ slug }: { slug: string }) {
  const role = AZURE_ROLES.find((r) => r.slug === slug)
  const [perms, setPerms] = useState<AzureRbacPermission[]>([])
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [copied, setCopied] = useState(false)

  // Descrições OFICIAIS de cada action, extraídas de
  // learn.microsoft.com/azure/role-based-access-control/permissions/*.
  // Carregado sob demanda e compartilhado entre todas as roles.
  const [actionDocs, setActionDocs] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoadingPerms(true)
    fetch(`/azure-perms/${slug}.json`)
      .then((r) => r.json())
      .then((data) => { setPerms(data); setLoadingPerms(false) })
      .catch(() => { setPerms([]); setLoadingPerms(false) })
  }, [slug])

  useEffect(() => {
    fetch('/azure-action-descriptions.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, string>) => setActionDocs(d))
      .catch(() => setActionDocs({}))
  }, [])

  const permsByType = useMemo(() => {
    const groups: Partial<Record<AzurePermType, string[]>> = {}
    for (const p of perms) {
      if (!groups[p.type]) groups[p.type] = []
      groups[p.type]!.push(p.action)
    }
    return groups
  }, [perms])

  if (!role) {
    return (
      <AppShell headerTitle="Role não encontrada" headerSub="Azure RBAC">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Role não encontrada.</p>
            <Link href="/azure-rbac/roles" className="text-[#85b7eb] hover:underline text-[13px]">
              ← Voltar para roles
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const meta = AZURE_TIER_META[role.tier]
  const docsUrl = `https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/${role.category.toLowerCase()}#${role.name.toLowerCase().replace(/\s+/g, '-')}`

  const copyId = () => {
    navigator.clipboard.writeText(role.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell
      headerTitle={role.name}
      headerSub={`Azure RBAC · ${role.category} · ${meta.label}`}
      headerBack={
        <Link href="/azure-rbac/roles" className="flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors">
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
              <span className="text-[12px] text-gray-500">·</span>
              <span className="text-[12px] text-gray-500">{role.permissionCount} permissões</span>
            </div>
          </div>

          {/* Stat blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <StatCard label="Total de Permissões" value={role.permissionCount} accent="#0078d4" />
            <StatCard label="Actions"     value={permsByType['Actions']?.length ?? 0}     accent="#1a5c28" />
            <StatCard label="NotActions"  value={permsByType['NotActions']?.length ?? 0}  accent="#9a2020" />
            <StatCard label="DataActions" value={(permsByType['DataActions']?.length ?? 0) + (permsByType['NotDataActions']?.length ?? 0)} accent="#0a4f8c" />
          </div>

          {/* Fact cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-6">
            <FactCard icon={<Hash size={14} />} label="Role ID">
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-[11px] text-gray-300 break-all">{role.id}</code>
                <button onClick={copyId} className="text-gray-400 hover:text-gray-200 shrink-0" title="Copiar" aria-label="Copiar Role ID">
                  {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                </button>
              </div>
            </FactCard>
            <FactCard icon={<Tag size={14} />} label="Categoria">
              <span className="text-[13px] text-gray-200">{role.category}</span>
            </FactCard>
            <FactCard icon={<Layers size={14} />} label="Risk Tier">
              <span className="text-[13px] font-medium" style={{ color: meta.darkText }}>{meta.label} ({meta.short})</span>
            </FactCard>
          </div>

          {/* Risk Tier explainer */}
          <section className="rounded-lg p-4 border mb-6"
            style={{ background: meta.darkBg, borderColor: meta.darkText + '30' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Shield size={15} style={{ color: meta.darkText }} />
              <span className="text-[13px] font-semibold" style={{ color: meta.darkText }}>
                Risk Tier: {meta.label}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: meta.darkText }}>{meta.description}</p>
          </section>

          {/* Description — texto oficial da Microsoft, literal */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-[14px] font-semibold text-gray-100">Descrição</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                Microsoft
              </span>
            </div>
            <p className="text-[13px] text-gray-300 leading-relaxed">{role.description}</p>
          </section>

          {/* Permissions */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-[14px] font-semibold text-gray-100">Permissões</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                Microsoft
              </span>
              {loadingPerms && <span className="text-[11px] text-gray-400 font-normal">Carregando...</span>}
              <a
                href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles"
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#85b7eb] hover:underline"
              >
                Azure built-in roles <ExternalLink size={11} />
              </a>
            </div>
            {!loadingPerms && perms.length === 0 && (
              <p className="text-[13px] text-gray-400">Nenhuma permissão registrada.</p>
            )}
            {perms.length > 0 && (
              <PermissionsTable
                rows={perms.map((p) => ({
                  permission: p.action,
                  type: p.type,
                  description: actionDocs[p.action] ?? '',
                }))}
                columns={[
                  { key: 'permission',  label: 'Action' },
                  { key: 'type',        label: 'Tipo', badge: true, width: 'w-36' },
                  { key: 'description', label: 'Descrição (Microsoft)' },
                ]}
                filterKey="type"
                colors={{
                  Actions: '#34d399', NotActions: '#f87171',
                  DataActions: '#60a5fa', NotDataActions: '#fbbf24',
                }}
                accent="#85b7eb"
                filename={`azure-rbac-${slug}-permissoes`}
                noun="permissões"
                searchPlaceholder="Filtrar action ou descrição..."
              />
            )}
          </section>

          {/* Role Definition JSON */}
          <AzureRoleDefinitionJson role={role} permsByType={permsByType} />

          {/* Assignable scopes */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <h2 className="text-[14px] font-semibold text-gray-100 mb-2">Assignable Scopes</h2>
            <div className="flex flex-wrap gap-2">
              {role.assignableScopes.map((scope) => (
                <span key={scope} className="text-[11px] font-mono px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300">
                  {scope}
                </span>
              ))}
            </div>
          </section>

          {/* PowerShell / CLI */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <h3 className="text-[12px] font-semibold text-gray-200 mb-2">PowerShell</h3>
              <pre className="text-[11px] font-mono bg-black text-green-400 rounded-md p-3 overflow-x-auto leading-relaxed border border-gray-800">{`Get-AzRoleDefinition -Name "${role.name}"`}</pre>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <h3 className="text-[12px] font-semibold text-gray-200 mb-2">Azure CLI</h3>
              <pre className="text-[11px] font-mono bg-black text-blue-300 rounded-md p-3 overflow-x-auto leading-relaxed border border-gray-800">{`az role definition list --name "${role.name}"`}</pre>
            </div>
          </section>

          {/* Docs link */}
          <a href={docsUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] text-[#85b7eb] hover:underline mb-8">
            <BookOpen size={15} /> Ver documentação oficial na Microsoft Learn <ExternalLink size={13} />
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

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: accent }}>{label}</p>
      <span className="text-[22px] font-bold" style={{ color: accent }}>{value}</span>
    </div>
  )
}

function AzureRoleDefinitionJson({ role, permsByType }: { role: { name: string; id: string; description: string; assignableScopes: string[] }; permsByType: Partial<Record<AzurePermType, string[]>> }) {
  const [expanded, setExpanded] = useState(false)
  const [jsonCopied, setJsonCopied] = useState(false)

  const jsonObj = {
    Name: role.name,
    Id: role.id,
    IsCustom: false,
    Description: role.description,
    Actions: permsByType['Actions'] ?? [],
    NotActions: permsByType['NotActions'] ?? [],
    DataActions: permsByType['DataActions'] ?? [],
    NotDataActions: permsByType['NotDataActions'] ?? [],
    AssignableScopes: role.assignableScopes,
  }

  const jsonStr = JSON.stringify(jsonObj, null, 2)
  const lines = jsonStr.split('\n')
  const PREVIEW_LINES = 12
  const showLines = expanded ? lines : lines.slice(0, PREVIEW_LINES)

  const copyJson = () => {
    navigator.clipboard.writeText(jsonStr)
    setJsonCopied(true)
    setTimeout(() => setJsonCopied(false), 2000)
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-gray-100 flex items-center gap-2">
          <Code2 size={15} />
          Role Definition (JSON)
        </h2>
        <button
          onClick={copyJson}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
          title="Copiar JSON"
        >
          {jsonCopied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
          {jsonCopied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <div className="relative">
        <div className="bg-black rounded-lg p-4 border border-gray-800 overflow-x-auto">
          <pre className="text-[11px] font-mono leading-relaxed">
            {showLines.map((line, i) => (
              <AzureJsonLine key={i} line={line} />
            ))}
          </pre>
        </div>
        {lines.length > PREVIEW_LINES && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[12px] text-[#85b7eb] hover:underline"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Recolher' : `Mostrar tudo (${lines.length} linhas)`}
          </button>
        )}
      </div>
    </section>
  )
}

function AzureJsonLine({ line }: { line: string }) {
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
