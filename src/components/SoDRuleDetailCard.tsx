'use client'

import Link from 'next/link'
import { ExternalLink, ShieldAlert, AlertTriangle, Shield, BookOpen, ChevronRight, Link2 } from 'lucide-react'
import { SoDRule, SOD_CLOUD_META, SOD_FRAMEWORK_META, SOD_PLATFORM_META } from '@/data/sod/rules'
import { resolveRoleRef, findConflictsForRole } from '@/lib/sod'
import SoDSeverityBadge from './SoDSeverityBadge'
import SoDCloudBadge from './SoDCloudBadge'
import MitigationList from './MitigationList'
import { useT } from '@/i18n/LanguageProvider'

export default function SoDRuleDetailCard({ rule, compact = false }: { rule: SoDRule; compact?: boolean }) {
  const t = useT()
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
        <nav className="flex items-center gap-1 text-tiny text-fg-muted">
          <Link href="/sod" className="hover:text-brand dark:hover:text-brand-onDark hover:underline">SoD Analyzer</Link>
          <ChevronRight size={12} />
          <Link href="/sod/rules" className="hover:text-brand dark:hover:text-brand-onDark hover:underline">{t('sod.catalogCrumb')}</Link>
          <ChevronRight size={12} />
          <span className="text-gray-600 dark:text-gray-300 truncate max-w-[240px]">{rule.name}</span>
        </nav>
      )}
      {!compact && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SoDSeverityBadge severity={rule.severity} />
              {/* Antes esta linha era um ternário sobre 'both'/'entra-id'/'azure-rbac'.
                  Com cinco plataformas e dois cruzamentos, o rótulo vem do metadado. */}
              <span className="text-3xs text-fg-muted">{SOD_CLOUD_META[rule.cloud].label}</span>
            </div>
            <h1 className="text-sub font-semibold text-gray-800 dark:text-gray-100">{rule.name}</h1>
            <p className="text-body text-fg-muted mt-1 max-w-2xl">{rule.description}</p>
          </div>
        </div>
      )}

      {/* Roles em conflito */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[{ ref: rule.roleA, resolved: roleA }, { ref: rule.roleB, resolved: roleB }].map((r, i) => (
          <div key={i} className="p-3 rounded-lg bg-surface-faint dark:bg-gray-800 border border-surface-border dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1.5">
              <SoDCloudBadge cloud={r.ref.cloud} />
              <span className="text-micro text-fg-subtle">{SOD_PLATFORM_META[r.ref.cloud].unit}</span>
            </div>
            {r.resolved ? (
              <Link href={r.resolved.url} className="text-body font-medium text-brand-strong dark:text-brand-onDark hover:underline inline-flex items-center gap-1">
                {r.ref.name} <ExternalLink size={11} />
              </Link>
            ) : (
              <span className="text-body font-medium text-gray-700 dark:text-gray-300">{r.ref.name}</span>
            )}
          </div>
        ))}
      </div>

      {/* Por que é um conflito */}
      <Section icon={<ShieldAlert size={14} />} title={t('sod.whyConflict')}>
        <p className="text-body text-fg-muted leading-relaxed">{rule.rationale}</p>
      </Section>

      {/* Risco */}
      <Section icon={<AlertTriangle size={14} />} title={t('sod.risk')}>
        <p className="text-body text-fg-muted leading-relaxed">{rule.risk}</p>
      </Section>

      {/* Mitigação */}
      <Section icon={<Shield size={14} />} title={t('sod.howToMitigate')}>
        <MitigationList items={rule.mitigation} color="#0078d4" />
      </Section>

      {/* Frameworks */}
      <Section icon={<BookOpen size={14} />} title={t('sod.frameworks')}>
        <div className="flex flex-wrap gap-1.5">
          {rule.frameworks.map((f) => (
            <span key={f} className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {SOD_FRAMEWORK_META[f].label}
            </span>
          ))}
        </div>
      </Section>

      {/* Referências */}
      {rule.references.length > 0 && (
        <Section icon={<ExternalLink size={14} />} title={t('sod.references')}>
          <ul className="space-y-1">
            {rule.references.map((ref) => (
              <li key={ref}>
                <a href={ref} target="_blank" rel="noreferrer" className="text-tiny text-brand-strong dark:text-brand-onDark hover:underline break-all">
                  {ref}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Roles relacionados */}
      {!compact && relatedRules.length > 0 && (
        <Section icon={<Link2 size={14} />} title={t('sod.relatedRoles')}>
          <div className="space-y-1.5">
            {relatedRules.map((r) => (
              <Link key={r.id} href={`/sod/rules/${r.id}`}
                className="flex items-center gap-2 text-tiny px-3 py-1.5 rounded-lg border border-surface-border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
            <Link href={roleA.url} className="text-tiny px-3 py-1.5 rounded-md border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5">
              {t('sod.seeRoleA')} <ExternalLink size={12} />
            </Link>
          )}
          {roleB && (
            <Link href={roleB.url} className="text-tiny px-3 py-1.5 rounded-md border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5">
              {t('sod.seeRoleB')} <ExternalLink size={12} />
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
        <span className="text-fg-muted">{icon}</span>
        <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  )
}
