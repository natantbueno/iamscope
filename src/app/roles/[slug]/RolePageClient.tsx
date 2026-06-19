'use client'

import Link from 'next/link'
import {
  ArrowLeft, AlertTriangle, Copy, CheckCheck, ExternalLink, Shield, Hash, Tag, Layers, BookOpen,
} from 'lucide-react'
import { useState } from 'react'
import { getRoleBySlug, getRelatedRoles } from '@/lib/roles'
import { EAM_META } from '@/data/roles'
import { useTheme } from '@/components/ThemeProvider'
import CategoryBadge from '@/components/CategoryBadge'
import EamTierBadge from '@/components/EamTierBadge'
import RolePermissionsList from '@/components/RolePermissionsList'
import ThemeToggle from '@/components/ThemeToggle'

export default function RolePageClient({ slug }: { slug: string }) {
  const role = getRoleBySlug(slug)
  const [copied, setCopied] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!role) return null
  const eam = EAM_META[role.eamTier]
  const related = getRelatedRoles(role)
  const docsUrl = `https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#${role.docsSlug ?? slug}`

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/roles" className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 hover:text-[#0078d4] dark:hover:text-[#85b7eb] transition-colors">
            <ArrowLeft size={15} /> Voltar para roles
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Title block */}
        <div className="mb-6">
          <div className="flex items-start gap-3 flex-wrap mb-3">
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
            <span className="text-[12px] text-gray-400 dark:text-gray-500">
              {role.permissionCount} role actions
            </span>
          </div>
        </div>

        {/* Quick facts grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
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
        </section>

        {/* Description */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 mb-6">
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

        {/* Full permissions */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 mb-6">
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <h3 className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 mb-2">PowerShell</h3>
            <pre className="text-[11px] font-mono bg-gray-900 dark:bg-black text-green-400 rounded-md p-3 overflow-x-auto leading-relaxed border border-gray-800">
{`Get-MgRoleManagementDirectoryRoleDefinition \`
  -UnifiedRoleDefinitionId "${role.id}"`}
            </pre>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
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
                <Link key={r.slug} href={`/roles/${r.slug}`}
                  className="block bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg p-3 transition-colors">
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
      </main>
    </div>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}
