'use client'

import { useEffect, useState, useMemo } from 'react'
import { KPI_TONE_VALUE } from '@/lib/kpiTone'
import { lookupActionDoc } from '@/lib/azureActionDocs'
import RoleDetailHeader, { BackToList, roleDetailSub } from './RoleDetailHeader'
import { CLOUD_META } from '@/data/compare/types'
import { useT } from '@/i18n/LanguageProvider'
import Link from 'next/link'
import { Copy, CheckCheck, ExternalLink, ShieldAlert, Hash, Tag, Layers, BookOpen, Shield, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import { AZURE_ROLES, AZURE_TIER_META, AzureRbacPermission, AzurePermType } from '@/data/azureRbac'
import AppShell from '@/components/AppShell'
import PermissionsTable from '@/components/PermissionsTable'

const TYPE_COLORS: Record<AzurePermType, { bg: string; text: string; label: string }> = {
  // Nível 3: o tipo da permission é categoria, não risco — a cor não distinguia
  // nada que o rótulo já não diga. NotActions e NotDataActions são negações, e
  // é isso que o nome carrega.
  Actions:        { bg: '#6b728018', text: '#6b7280', label: 'Actions' },
  NotActions:     { bg: '#6b728018', text: '#6b7280', label: 'NotActions' },
  DataActions:    { bg: '#6b728018', text: '#6b7280', label: 'DataActions' },
  NotDataActions: { bg: '#6b728018', text: '#6b7280', label: 'NotDataActions' },
}

export default function AzureRbacRoleClient({ slug }: { slug: string }) {
  const t = useT()
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
            <p className="text-fg-subtle mb-4">Role não encontrada.</p>
            <Link href="/azure-rbac/roles" className="text-brand-onDark hover:underline text-body">
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
      headerSub={roleDetailSub(CLOUD_META.azureRbac.label, role.category, meta.label)}
      headerBack={<BackToList href="/azure-rbac/roles" />}
      pageHasOwnHeading
    >
      <div className="flex-1 overflow-y-auto bg-app">
        <div className="max-w-5xl px-6 py-6">

          <RoleDetailHeader
          syncPlatform={'Azure RBAC'}
            name={role.name}
            tier={{ label: meta.label, color: meta.textColor, bg: meta.bgColor,
                    darkColor: meta.darkText, darkBg: meta.darkBg, description: meta.description }}
            category={role.category}
            isPrivileged={role.isPrivileged}
            extra={`${role.permissionCount} ${t('table.permissions').toLowerCase()}`}
          />

          {/* Stat blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <StatCard label={t('label.totalPerms')} value={role.permissionCount} accent={KPI_TONE_VALUE.accent} />
            <StatCard label="Actions"     value={permsByType['Actions']?.length ?? 0}     accent={KPI_TONE_VALUE.neutral} />
            <StatCard label="NotActions"  value={permsByType['NotActions']?.length ?? 0}  accent={KPI_TONE_VALUE.danger} />
            <StatCard label="DataActions" value={(permsByType['DataActions']?.length ?? 0) + (permsByType['NotDataActions']?.length ?? 0)} accent={KPI_TONE_VALUE.neutral} />
          </div>

          {/* Fact cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-6">
            <FactCard icon={<Hash size={14} />} label="Role ID">
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-3xs text-fg-muted break-all">{role.id}</code>
                <button onClick={copyId} className="text-fg-subtle hover:text-fg shrink-0" title={t('action.copy')} aria-label={t('action.copyRoleId')}>
                  {copied ? <CheckCheck size={13} className="text-fg" /> : <Copy size={13} />}
                </button>
              </div>
            </FactCard>
            <FactCard icon={<Tag size={14} />} label={t('table.category')}>
              <span className="text-body text-fg">{role.category}</span>
            </FactCard>
            <FactCard icon={<Layers size={14} />} label="Risk Tier">
              <span className="text-body font-medium" style={{ color: meta.darkText }}>{meta.label} ({meta.short})</span>
            </FactCard>
          </div>

          {/* Risk Tier explainer */}
          <section className="rounded-lg p-4 border mb-6"
            style={{ background: meta.darkBg, borderColor: meta.darkText + '30' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Shield size={15} style={{ color: meta.darkText }} />
              <span className="text-body font-semibold" style={{ color: meta.darkText }}>
                Risk Tier: {meta.label}
              </span>
            </div>
            <p className="text-tiny leading-relaxed" style={{ color: meta.darkText }}>{meta.description}</p>
          </section>

          {/* Description — texto oficial da Microsoft, literal */}
          <section className="bg-surface border border-line rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-note font-semibold text-fg">{t('table.description')}</h2>
              <span className="text-micro font-bold uppercase tracking-wider text-fg-muted bg-surface-alt border border-line-strong px-1.5 py-0.5 rounded">
                Microsoft
              </span>
            </div>
            <p className="text-body text-fg-muted leading-relaxed">{role.description}</p>
          </section>

          {/* Permissions */}
          <section className="bg-surface border border-line rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-note font-semibold text-fg">{t('table.permissions')}</h2>
              <span className="text-micro font-bold uppercase tracking-wider text-fg-muted bg-surface-alt border border-line-strong px-1.5 py-0.5 rounded">
                Microsoft
              </span>
              {loadingPerms && <span className="text-3xs text-fg-subtle font-normal">Carregando...</span>}
              <a
                href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles"
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-3xs text-brand-onDark hover:underline"
              >
                Azure built-in roles <ExternalLink size={11} />
              </a>
            </div>
            {!loadingPerms && perms.length === 0 && (
              <p className="text-body text-fg-subtle">{t('empty.noPermsRecorded')}</p>
            )}
            {perms.length > 0 && (
              <PermissionsTable
                rows={perms.map((p) => ({
                  permission: p.action,
                  type: p.type,
                  description: lookupActionDoc(actionDocs, p.action) ?? '',
                }))}
                columns={[
                  { key: 'permission',  label: 'Action' },
                  { key: 'type',        label: 'Tipo', badge: true, width: 'w-36' },
                  { key: 'description', label: t('label.descMicrosoft') },
                ]}
                filterKey="type"
                filename={`azure-rbac-${slug}-permissoes`}
                noun="noun.permissions"
                searchPlaceholder="ph.filterActionOrDesc"
              />
            )}
          </section>

          {/* Role Definition JSON */}
          <AzureRoleDefinitionJson role={role} permsByType={permsByType} />

          {/* Assignable scopes */}
          <section className="bg-surface border border-line rounded-lg p-5 mb-6">
            <h2 className="text-note font-semibold text-fg mb-2">Assignable Scopes</h2>
            <div className="flex flex-wrap gap-2">
              {role.assignableScopes.map((scope) => (
                <span key={scope} className="text-3xs font-mono px-2 py-1 bg-surface-alt border border-line-strong rounded text-fg-muted">
                  {scope}
                </span>
              ))}
            </div>
          </section>

          {/* PowerShell / CLI */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface border border-line rounded-lg p-5">
              <h3 className="text-tiny font-semibold text-fg mb-2">PowerShell</h3>
              <pre className="text-3xs font-mono bg-black text-green-400 rounded-md p-3 overflow-x-auto leading-relaxed border border-line">{`Get-AzRoleDefinition -Name "${role.name}"`}</pre>
            </div>
            <div className="bg-surface border border-line rounded-lg p-5">
              <h3 className="text-tiny font-semibold text-fg mb-2">Azure CLI</h3>
              <pre className="text-3xs font-mono bg-black text-blue-700 dark:text-blue-300 rounded-md p-3 overflow-x-auto leading-relaxed border border-line">{`az role definition list --name "${role.name}"`}</pre>
            </div>
          </section>

          {/* Docs link */}
          <a href={docsUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-body text-brand-onDark hover:underline mb-8">
            <BookOpen size={15} /> {t('perm.msLearnDocs')} <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </AppShell>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 text-fg-muted mb-1.5">
        {icon}
        <span className="text-2xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-3.5">
      <p className="text-2xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: accent }}>{label}</p>
      <span className="text-stat font-bold" style={{ color: accent }}>{value}</span>
    </div>
  )
}

function AzureRoleDefinitionJson({ role, permsByType }: { role: { name: string; id: string; description: string; assignableScopes: string[] }; permsByType: Partial<Record<AzurePermType, string[]>> }) {
  const t = useT()
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
    <section className="bg-surface border border-line rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-note font-semibold text-fg flex items-center gap-2">
          <Code2 size={15} />
          Role Definition (JSON)
        </h2>
        <button
          onClick={copyJson}
          className="flex items-center gap-1.5 text-3xs text-fg-subtle hover:text-fg transition-colors"
          title={t('action.copyJson')}
        >
          {jsonCopied ? <CheckCheck size={13} className="text-fg" /> : <Copy size={13} />}
          {jsonCopied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <div className="relative">
        <div className="bg-black rounded-lg p-4 border border-line overflow-x-auto">
          <pre className="text-3xs font-mono leading-relaxed">
            {showLines.map((line, i) => (
              <AzureJsonLine key={i} line={line} />
            ))}
          </pre>
        </div>
        {lines.length > PREVIEW_LINES && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-tiny text-brand-onDark hover:underline"
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
