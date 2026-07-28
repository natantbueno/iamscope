'use client'

import Link from 'next/link'
import {
  ArrowLeft, AlertTriangle, Copy, CheckCheck, ExternalLink, Shield, Hash, Tag, Layers, BookOpen,
  ListTree, ShieldAlert, Settings2, Users2, HelpCircle, ChevronDown, ChevronUp, Code2,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { getRoleBySlug, getRelatedRoles } from '@/lib/roles'
import { EAM_META, EamTier } from '@/data/roles'
import CategoryBadge from '@/components/CategoryBadge'
import EamTierBadge from '@/components/EamTierBadge'
import RolePermissionsList from '@/components/RolePermissionsList'
import AppShell from '@/components/AppShell'

export default function RolePageClient({ slug }: { slug: string }) {
  const role = getRoleBySlug(slug)
  const [copied, setCopied] = useState(false)
  const isDark = true

  if (!role) return null
  const eam = EAM_META[role.eamTier]
  const related = getRelatedRoles(role)
  const docsUrl = `https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#${role.docsSlug ?? slug}`

  // stats por tier das permissões desta role
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const permStats = useMemo(() => ({
    total:      role.permissions.length,
    control:    role.permissions.filter((p) => p.tier === 'ControlPlane').length,
    management: role.permissions.filter((p) => p.tier === 'ManagementPlane').length,
    userAccess: role.permissions.filter((p) => p.tier === 'UserAccess').length,
    unclassified: role.permissions.filter((p) => p.tier === 'Unclassified').length,
  }), [role])

  // Composição de tiers da role e quais ações sustentam a classificação.
  // Existe porque o tier da role é o MAIOR tier entre suas ações: uma única
  // ação de Control Plane entre 42 já a torna Tier 0. Sem mostrar isso, o
  // texto do tier ("controle total do tenant") passa a impressão errada em
  // roles de leitura como AI Reader e Global Reader.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const tierBreakdown = useMemo(() => {
    const ORDER: EamTier[] = ['ControlPlane', 'ManagementPlane', 'UserAccess', 'Unclassified']
    const counts = ORDER
      .map((t) => [t, role.permissions.filter((p) => p.tier === t).length] as [EamTier, number])
      .filter(([, n]) => n > 0)
    const driving = role.permissions.filter((p) => p.tier === role.eamTier)
    return {
      total: role.permissions.length,
      counts,
      driving: driving.length,
      drivingActions: driving.slice(0, 3).map((p) => p.action),
    }
  }, [role])

  const copyId = () => {
    navigator.clipboard.writeText(role.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Divide a richDescription em linhas para exibição
  const richLines = (role.richDescription || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <AppShell
      headerTitle={role.name}
      headerSub={`Entra ID · ${role.category} · EAM ${role.eamTier}`}
      headerBack={
        <Link href="/entraid/roles" className="flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
      }
    >
      <div className="flex-1 overflow-y-auto bg-gray-950">
      <div className="max-w-5xl px-6 py-6">
        {/* Title block */}
        <div className="mb-5">
          <div className="flex items-start gap-3 flex-wrap mb-2">
            <h1 className="text-[24px] font-semibold text-gray-900 dark:text-gray-100">{role.name}</h1>
            {role.isPrivileged && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 mt-1.5">
                <AlertTriangle size={12} /> Privilegiada
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EamTierBadge tier={role.eamTier} />
            <CategoryBadge category={role.category} />
          </div>
        </div>

        {/* Stats + facts grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-3">
          <StatCard icon={<ListTree size={13} />} label="Role Actions" value={permStats.total} accent="#0078d4" />
          <StatCard icon={<ShieldAlert size={13} />} label="Control Plane" value={permStats.control} accent="#dc2626" />
          <StatCard icon={<Settings2 size={13} />} label="Management Plane" value={permStats.management} accent="#ea580c" />
          <StatCard icon={<Users2 size={13} />} label="User Access" value={permStats.userAccess} accent="#16a34a" />
          <StatCard icon={<HelpCircle size={13} />} label="Não classificadas" value={permStats.unclassified} accent="#6b7280" />
        </div>

        {/* Quick facts grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-6">
          <FactCard icon={<Hash size={14} />} label="Template ID">
            <div className="flex items-center gap-1.5">
              <code className="font-mono text-[11px] text-gray-600 dark:text-gray-300 break-all">{role.id}</code>
              <button onClick={copyId} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0" title="Copiar">
                {copied ? <CheckCheck size={13} className="text-green-600" /> : <Copy size={13} />}
              </button>
            </div>
          </FactCard>
          <FactCard icon={<Tag size={14} />} label="Categoria">
            <span className="text-[13px] text-gray-700 dark:text-gray-200">{role.category}</span>
          </FactCard>
          <FactCard icon={<Layers size={14} />} label="EAM Tier">
            <span className="text-[13px] text-gray-700 dark:text-gray-200">{eam.label} ({eam.short})</span>
          </FactCard>
        </div>

        {/* EAM explainer */}
        <section className="rounded-lg p-4 border mb-6"
          style={{
            background: isDark ? eam.darkBg : eam.bgColor,
            borderColor: (isDark ? eam.darkText : eam.textColor) + '30',
          }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield size={15} style={{ color: isDark ? eam.darkText : eam.textColor }} />
            <span className="text-[13px] font-semibold" style={{ color: isDark ? eam.darkText : eam.textColor }}>
              Enterprise Access Model: {eam.label}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: isDark ? eam.darkText : eam.textColor }}>
            {eam.description}
          </p>

          {/* Por que ESTA role caiu neste tier.
              O texto acima define o tier; ele não descreve o alcance da role.
              Uma role entra no tier da sua ação mais alta — então uma única
              ação de Control Plane entre dezenas basta para classificá-la como
              Tier 0, sem que ela tenha controle total do tenant. */}
          {tierBreakdown.total > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: (isDark ? eam.darkText : eam.textColor) + '30' }}>
              <p className="text-[12px] leading-relaxed" style={{ color: isDark ? eam.darkText : eam.textColor }}>
                Esta role é classificada como <strong>{eam.label}</strong> porque{' '}
                {tierBreakdown.driving === 0 ? (
                  <>a classificação vem da definição da própria role na fonte, não de suas ações listadas aqui.</>
                ) : tierBreakdown.driving === tierBreakdown.total ? (
                  <>todas as suas {tierBreakdown.total} ações são desse tier.</>
                ) : (
                  <>
                    <strong>{tierBreakdown.driving}</strong> de {tierBreakdown.total} ações
                    {' '}({(tierBreakdown.driving / tierBreakdown.total * 100).toFixed(0)}%) são desse tier —
                    o tier da role acompanha sempre a ação de maior privilégio, não o conjunto.
                  </>
                )}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {tierBreakdown.counts.map(([t, n]) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border"
                    style={{
                      color: isDark ? EAM_META[t].darkText : EAM_META[t].textColor,
                      borderColor: (isDark ? EAM_META[t].darkText : EAM_META[t].textColor) + '50',
                    }}>
                    {n} {EAM_META[t].label}
                  </span>
                ))}
              </div>
              {tierBreakdown.driving > 0 && tierBreakdown.driving <= 3 && (
                <div className="mt-2">
                  <p className="text-[11px] opacity-80 mb-1" style={{ color: isDark ? eam.darkText : eam.textColor }}>
                    {tierBreakdown.driving === 1 ? 'Ação responsável:' : 'Ações responsáveis:'}
                  </p>
                  {tierBreakdown.drivingActions.map((a) => (
                    <code key={a} className="block text-[10px] font-mono break-all opacity-90"
                      style={{ color: isDark ? eam.darkText : eam.textColor }}>
                      {a}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Description */}
        <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-5 mb-6">
          <h2 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Descrição</h2>
          {richLines.length > 1 ? (
            <ul className="space-y-1.5">
              {richLines.map((line, i) => (
                <li key={i} className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed flex gap-2">
                  {line.startsWith('-') ? (
                    <>
                      <span className="text-[#0078d4] dark:text-[#85b7eb] shrink-0">•</span>
                      <span>{line.replace(/^-\s*/, '')}</span>
                    </>
                  ) : (
                    <span className={i === 0 ? 'font-medium text-gray-700 dark:text-gray-200' : ''}>{line}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">{role.description}</p>
          )}

        </section>

        {/* Role Definition JSON */}
        <RoleDefinitionJson role={role} />

        {/* Full permissions */}
        <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-5 mb-6">
          <h2 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Permissões completas
          </h2>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mb-4">
            Todas as {role.permissionCount} role actions desta role, classificadas por tier do EAM.
          </p>
          <RolePermissionsList permissions={role.permissions} />
        </section>

        {/* Code snippets */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-5">
            <h3 className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 mb-2">PowerShell</h3>
            <pre className="text-[11px] font-mono bg-gray-900 dark:bg-black text-green-400 rounded-md p-3 overflow-x-auto leading-relaxed border border-gray-800">
{`Get-MgRoleManagementDirectoryRoleDefinition \`
  -UnifiedRoleDefinitionId "${role.id}"`}
            </pre>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-5">
            <h3 className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 mb-2">Microsoft Graph</h3>
            <pre className="text-[11px] font-mono bg-gray-900 dark:bg-black text-blue-300 rounded-md p-3 overflow-x-auto leading-relaxed border border-gray-800">
{`GET https://graph.microsoft.com/v1.0/
  roleManagement/directory/
  roleDefinitions/${role.id}`}
            </pre>
          </div>
        </section>

        {/* Docs link */}
        <a href={docsUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[13px] text-[#0078d4] dark:text-[#85b7eb] hover:underline mb-8">
          <BookOpen size={15} /> Ver documentação oficial na Microsoft Learn <ExternalLink size={13} />
        </a>

        {/* Related roles */}
        {related.length > 0 && (
          <section className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <h2 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 mb-3">Roles relacionadas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {related.map((r) => (
                <Link key={r.slug} href={`/entraid/roles/${r.slug}`}
                  className="block bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-3 transition-colors">
                  <div className="text-[13px] font-medium text-[#0078d4] dark:text-[#85b7eb] mb-1.5 truncate">{r.name}</div>
                  <div className="flex items-center gap-1.5">
                    <EamTierBadge tier={r.eamTier} showLabel={false} />
                    <CategoryBadge category={r.category} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      </div>
    </AppShell>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}

function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: number; accent: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: accent }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[22px] font-bold" style={{ color: accent }}>{value}</span>
    </div>
  )
}

function RoleDefinitionJson({ role }: { role: { id: string; name: string; description: string; isPrivileged: boolean; permissions: { action: string }[] } }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const jsonObj = {
    "@odata.type": "#microsoft.graph.unifiedRoleDefinition",
    id: role.id,
    displayName: role.name,
    description: role.description,
    isBuiltIn: true,
    isEnabled: true,
    isPrivileged: role.isPrivileged,
    rolePermissions: [{
      allowedResourceActions: role.permissions.map(p => p.action)
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
    <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Code2 size={15} />
          Role Definition (JSON)
        </h2>
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
        <div className="bg-black rounded-lg p-4 border border-gray-800 overflow-x-auto">
          <pre className="text-[11px] font-mono leading-relaxed">
            {showLines.map((line, i) => (
              <JsonLine key={i} line={line} />
            ))}
          </pre>
        </div>
        {lines.length > PREVIEW_LINES && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Recolher' : `Mostrar tudo (${lines.length} linhas)`}
          </button>
        )}
      </div>
    </section>
  )
}

function JsonLine({ line }: { line: string }) {
  const parts: React.ReactNode[] = []
  let remaining = line
  let key = 0

  while (remaining.length > 0) {
    // Match key
    const keyMatch = remaining.match(/^(\s*)"([^"]+)"(:)/)
    if (keyMatch) {
      parts.push(<span key={key++} className="text-gray-400">{keyMatch[1]}</span>)
      parts.push(<span key={key++} className="text-blue-400">&quot;{keyMatch[2]}&quot;</span>)
      parts.push(<span key={key++} className="text-gray-400">{keyMatch[3]}</span>)
      remaining = remaining.slice(keyMatch[0].length)
      continue
    }
    // Match string value
    const strMatch = remaining.match(/^(\s*)"([^"]*)"(.*)/)
    if (strMatch) {
      parts.push(<span key={key++} className="text-gray-400">{strMatch[1]}</span>)
      parts.push(<span key={key++} className="text-green-400">&quot;{strMatch[2]}&quot;</span>)
      parts.push(<span key={key++} className="text-gray-400">{strMatch[3]}</span>)
      remaining = ''
      continue
    }
    // Match boolean/number
    const boolMatch = remaining.match(/^(\s*)(true|false|null|\d+)(,?)(.*)/)
    if (boolMatch) {
      parts.push(<span key={key++} className="text-gray-400">{boolMatch[1]}</span>)
      parts.push(<span key={key++} className="text-yellow-400">{boolMatch[2]}</span>)
      parts.push(<span key={key++} className="text-gray-400">{boolMatch[3]}{boolMatch[4]}</span>)
      remaining = ''
      continue
    }
    // Match brackets/braces
    const bracketMatch = remaining.match(/^(\s*)([\[\]{},]+)(.*)/)
    if (bracketMatch) {
      parts.push(<span key={key++} className="text-gray-400">{bracketMatch[1]}{bracketMatch[2]}{bracketMatch[3]}</span>)
      remaining = ''
      continue
    }
    // Fallback
    parts.push(<span key={key++} className="text-gray-400">{remaining}</span>)
    remaining = ''
  }

  return <div>{parts}{'\n'}</div>
}
