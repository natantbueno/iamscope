'use client'

import Link from 'next/link'
import { ExternalLink, ShieldAlert, AlertTriangle, Shield, BookOpen, ChevronRight, Link2 } from 'lucide-react'
import { SoDRule } from '@/data/sod/rules'
import { resolveRoleRef, findConflictsForRole } from '@/lib/sod'
import SoDSeverityBadge from './SoDSeverityBadge'
import SoDCloudBadge from './SoDCloudBadge'
import { SOD_FRAMEWORK_META } from '@/data/sod/rules'
import MitigationList from './MitigationList'

export default function SoDRuleDetailCard({ rule, compact = false }: { rule: SoDRule; compact?: boolean }) {
  const roleA = resolveRoleRef(rule.roleA)
  const roleB = resolveRoleRef(rule.roleB)

  const relatedRules = !compact
    ? [...findConflictsForRole(rule.roleA.name, rule.roleA.cloud), ...findConflictsForRole(rule.roleB.name, rule.roleB.cloud)]
        .filter((r) => r.id !== rule.id)
        .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
    : []

  return (
    <div className={compact ? '' : 'space-y-5'}>
      {!compact && (
        <nav className="flex items-center gap-1 text-[12px] text-gray-400 dark:text-gray-500">
          <Link href="/sod" className="hover:text-[#0078d4] dark:hover:text-[#85b7eb] hover:underline">SoD Analyzer</Link>
          <ChevronRight size={12} />
          <Link href="/sod/rules" className="hover:text-[#0078d4] dark:hover:text-[#85b7eb] hover:underline">Catálogo</Link>
          <ChevronRight size={12} />
          <span className="text-gray-600 dark:text-gray-300 truncate max-w-[240px]">{rule.name}</span>
        </nav>
      )}
      {!compact && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SoDSeverityBadge severity={rule.severity} />
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {rule.cloud === 'both' ? 'Entra ID + Azure RBAC' : rule.cloud === 'entra-id' ? 'Entra ID' : 'Azure RBAC'}
              </span>
            </div>
            <h1 className="text-[19px] font-semibold text-gray-800 dark:text-gray-100">{rule.name}</h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{rule.description}</p>
          </div>
        </div>
      )}

      {/* Roles em conflito */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[{ ref: rule.roleA, resolved: roleA }, { ref: rule.roleB, resolved: roleB }].map((r, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#f7f9fc] dark:bg-gray-800 border border-[#dde3ec] dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1.5">
              <SoDCloudBadge cloud={r.ref.cloud} />
            </div>
            {r.resolved ? (
              <Link href={r.resolved.url} className="text-[13px] font-medium text-[#0078d4] dark:text-[#85b7eb] hover:underline inline-flex items-center gap-1">
                {r.ref.name} <ExternalLink size={11} />
              </Link>
            ) : (
              <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{r.ref.name}</span>
            )}
          </div>
        ))}
      </div>

      {/* Por que é um conflito */}
      <Section icon={<ShieldAlert size={14} />} title="Por que é um conflito">
        <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{rule.rationale}</p>
      </Section>

      {/* Risco */}
      <Section icon={<AlertTriangle size={14} />} title="Risco">
        <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{rule.risk}</p>
      </Section>

      {/* Mitigação */}
      <Section icon={<Shield size={14} />} title="Como mitigar">
        <MitigationList items={rule.mitigation} color="#0078d4" />
      </Section>

      {/* Frameworks */}
      <Section icon={<BookOpen size={14} />} title="Frameworks aplicáveis">
        <div className="flex flex-wrap gap-1.5">
          {rule.frameworks.map((f) => (
            <span key={f} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {SOD_FRAMEWORK_META[f].label}
            </span>
          ))}
        </div>
      </Section>

      {/* Referências */}
      {rule.references.length > 0 && (
        <Section icon={<ExternalLink size={14} />} title="Referências">
          <ul className="space-y-1">
            {rule.references.map((ref) => (
              <li key={ref}>
                <a href={ref} target="_blank" rel="noreferrer" className="text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline break-all">
                  {ref}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Roles relacionados */}
      {!compact && relatedRules.length > 0 && (
        <Section icon={<Link2 size={14} />} title="Roles relacionados">
          <div className="space-y-1.5">
            {relatedRules.map((r) => (
              <Link key={r.id} href={`/sod/rules/${r.id}`}
                className="flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-lg border border-[#dde3ec] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ShieldAlert size={12} className="text-red-400 shrink-0" />
                <span className="text-gray-600 dark:text-gray-300">{r.roleA.name} + {r.roleB.name}</span>
                <span className="ml-auto shrink-0"><SoDSeverityBadge severity={r.severity} /></span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-2 pt-2">
          {roleA && (
            <Link href={roleA.url} className="text-[12px] px-3 py-1.5 rounded-md border border-[#dde3ec] dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5">
              Ver Role A no site <ExternalLink size={12} />
            </Link>
          )}
          {roleB && (
            <Link href={roleB.url} className="text-[12px] px-3 py-1.5 rounded-md border border-[#dde3ec] dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5">
              Ver Role B no site <ExternalLink size={12} />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  )
}
