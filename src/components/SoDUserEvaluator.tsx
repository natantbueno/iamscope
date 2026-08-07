'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Play, ScanLine, Trash2, Download, ChevronDown, ChevronUp, AlertTriangle, CheckCheck, Info } from 'lucide-react'
import {
  SoDPlatformScope, parseRoleListInput, evaluateUserRoles, generateSoDReportText,
  SOD_RISK_META, SOD_EXAMPLES, SoDEvaluationResult, findSimilarRoleNames,
} from '@/lib/sod'
import { SOD_RULES, SOD_PROVIDER_META, SOD_PROVIDERS } from '@/data/sod/rules'
import SoDSeverityBadge from './SoDSeverityBadge'
import SoDCloudBadge from './SoDCloudBadge'
import SoDRuleDetailCard from './SoDRuleDetailCard'
import { useT } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'

/* Os exemplos vivem em lib/sod.ts (dado) e o rótulo aqui (interface). Cada um
   é um conjunto real que dispara conflitos catalogados na plataforma indicada
   — sem exemplo por provedor, quem chega para testar AWS ou GCP cola nomes do
   Entra ID e conclui que a ferramenta não funciona. */
const EXAMPLE_LABELS: Record<string, TranslationKey> = {
  'entra-critical': 'sod.exEntraCritical',
  'entra-typical': 'sod.exEntraTypical',
  aws: 'sod.exAws',
  gcp: 'sod.exGcp',
  gws: 'sod.exGoogle',
}

export default function SoDUserEvaluator() {
  const t = useT()
  const [rawInput, setRawInput] = useState('')
  const [scope, setScope] = useState<SoDPlatformScope>('all')
  const [result, setResult] = useState<SoDEvaluationResult | null>(null)
  const [expandedConflict, setExpandedConflict] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState(false)

  const runEvaluation = () => {
    const names = parseRoleListInput(rawInput)
    setResult(evaluateUserRoles(names, scope))
    setExpandedConflict(new Set())
  }

  const loadExample = (id: string) => {
    const ex = SOD_EXAMPLES.find((e) => e.id === id)
    if (!ex) return
    setRawInput(ex.roles.join('\n'))
    setScope(ex.scope)
    setResult(null)
  }

  const clear = () => { setRawInput(''); setResult(null) }

  const toggleConflict = (i: number) => {
    setExpandedConflict((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const exportReport = () => {
    if (!result) return
    navigator.clipboard.writeText(generateSoDReportText(result))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const SCOPES: { value: SoDPlatformScope; label: string }[] = useMemo(() => [
    { value: 'all', label: t('filter.all') },
    ...SOD_PROVIDERS.map((p) => ({ value: p as SoDPlatformScope, label: SOD_PROVIDER_META[p].label })),
  ], [t])

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-y-auto flex-1">
      {/* Coluna esquerda — input */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <label className="text-3xs font-semibold text-fg-muted uppercase tracking-wider block" htmlFor="sod-roles-input">
          {t('sod.assignedRoles')}
        </label>
        <textarea
          id="sod-roles-input"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          rows={14}
          placeholder={'Global Administrator\nSecurity Reader\nPrivileged Role Administrator'}
          spellCheck={false}
          className="w-full font-mono text-tiny leading-relaxed p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 resize-y focus:outline-none focus:ring-1 focus:ring-brand"
        />

        <div>
          <label className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">{t('sod.provider')}</label>
          <div className="flex items-center gap-2 flex-wrap">
            {SCOPES.map((s) => (
              <button key={s.value} onClick={() => setScope(s.value)}
                className={`text-3xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  scope === s.value ? 'bg-brand-soft dark:bg-brand-activeBg text-brand-strong dark:text-brand-onDark border-brand-mid dark:border-brand-activeRing'
                                    : 'text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={runEvaluation} disabled={!rawInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand hover:bg-[#006cbe] disabled:opacity-40 disabled:cursor-not-allowed text-white text-body font-medium transition-colors">
            <Play size={14} /> {t('action.evaluate')}
          </button>
          <button onClick={clear}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-fg-muted text-body font-medium transition-colors">
            <Trash2 size={14} /> {t('action.clear')}
          </button>
        </div>

        <div>
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">{t('sod.examples')}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {SOD_EXAMPLES.map((ex) => (
              <button key={ex.id} onClick={() => loadExample(ex.id)}
                className="text-3xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-fg-muted font-medium transition-colors">
                {t(EXAMPLE_LABELS[ex.id])}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna direita — resultado */}
      <div className="lg:col-span-3">
        {!result && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6 py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <ScanLine size={28} className="text-fg-subtle mb-3" />
            <p className="text-note font-medium text-gray-600 dark:text-gray-300 mb-1">{t('sod.pasteToStart')}</p>
            <p className="text-tiny text-fg-muted max-w-sm">
              {t('sod.evaluatorIntroA')} {SOD_RULES.length} {t('sod.evaluatorIntroB')}
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-5">
            {/* Score geral */}
            <div className="rounded-xl p-5 border" style={{
              background: SOD_RISK_META[result.riskLevel].bg,
              borderColor: SOD_RISK_META[result.riskLevel].color + '60',
            }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span
                  className={`text-base font-bold px-4 py-2 rounded-lg ${SOD_RISK_META[result.riskLevel].pulse ? 'animate-pulse' : ''}`}
                  style={{ color: SOD_RISK_META[result.riskLevel].color, background: 'white' }}
                >
                  {SOD_RISK_META[result.riskLevel].label}
                </span>
                <button onClick={exportReport}
                  className="flex items-center gap-1.5 text-tiny px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-900/60 hover:bg-white dark:hover:bg-gray-900 transition-colors">
                  {copied ? <CheckCheck size={13} className="text-green-600" /> : <Download size={13} />}
                  {copied ? t('sod.copied') : t('action.exportReport')}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <Metric label={t('sod.mRolesEvaluated')} value={result.totalRoles} />
                <Metric label={t('sod.mConflicts')} value={result.conflictsFound} />
                <Metric label="Critical / High" value={`${result.severityBreakdown.critical} / ${result.severityBreakdown.high}`} />
                <Metric label={t('sod.mFrameworks')} value={result.frameworksImpacted.length} />
              </div>
            </div>

            {/*
              Lista com mais de um provedor: o catálogo não cruza provedores, e
              sem dizer isso aqui o "0 conflitos" entre AWS e Entra ID é lido
              como resultado, quando é a ausência de uma pergunta.
            */}
            {result.providersMatched.length > 1 && (
              <div className="rounded-lg p-3 bg-surface-faint dark:bg-gray-800/60 border border-surface-border dark:border-gray-700 flex items-start gap-2">
                <Info size={13} className="text-fg-subtle shrink-0 mt-0.5" />
                <p className="text-3xs text-fg-muted leading-relaxed">
                  <span className="font-semibold text-fg">
                    {result.providersMatched.map((p) => SOD_PROVIDER_META[p].label).join(' + ')}.
                  </span>{' '}
                  {t('sod.crossProviderBody')}
                </p>
              </div>
            )}

            {/* Conflitos */}
            {result.conflicts.length > 0 && (
              <div>
                <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{t('sod.conflictsFound')}</p>
                <div className="space-y-2">
                  {result.conflicts.map((c, i) => {
                    const isOpen = expandedConflict.has(i)
                    return (
                      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button onClick={() => toggleConflict(i)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <SoDSeverityBadge severity={c.rule.severity} />
                          <span className="flex-1 text-tiny text-gray-700 dark:text-gray-300 flex items-center gap-1.5 flex-wrap">
                            {c.roleA.name} <SoDCloudBadge cloud={c.roleA.cloud} /> + {c.roleB.name} <SoDCloudBadge cloud={c.roleB.cloud} />
                          </span>
                          {isOpen ? <ChevronUp size={14} className="text-fg-subtle shrink-0" /> : <ChevronDown size={14} className="text-fg-muted shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 bg-gray-50/60 dark:bg-gray-900/40">
                            <SoDRuleDetailCard rule={c.rule} compact />
                            <Link href={`/sod/rules/${c.rule.id}`} className="inline-block mt-3 text-tiny text-brand-strong dark:text-brand-onDark hover:underline">
                              {t('sod.seeFullRule')} →
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Roles não reconhecidas */}
            {result.rolesNotFound.length > 0 && (
              <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={13} className="text-amber-700 dark:text-amber-400" />
                  <p className="text-3xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t('sod.unknownRoles')}</p>
                </div>
                <p className="text-3xs text-amber-700 dark:text-amber-400 mb-2">{t('sod.unknownRolesBody')}</p>
                <ul className="text-tiny text-fg-muted space-y-1.5">
                  {result.rolesNotFound.map((r, i) => {
                    const suggestions = findSimilarRoleNames(r, scope, 3)
                    return (
                      <li key={i}>
                        <span>• {r}</span>
                        {suggestions.length > 0 && (
                          <span className="block pl-3 text-3xs text-fg-muted">
                            {t('sod.didYouMean')} {suggestions.map((s, si) => (
                              <span key={`${s.cloud}-${s.slug}`}>
                                {si > 0 && ', '}
                                <button
                                  onClick={() => setRawInput((prev) => prev.replace(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), s.name))}
                                  className="text-brand-strong dark:text-brand-onDark hover:underline"
                                >
                                  {s.name}
                                </button>
                              </span>
                            ))}?
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sub font-bold text-gray-800 dark:text-gray-100">{value}</p>
      <p className="text-2xs text-fg-muted uppercase tracking-wider">{label}</p>
    </div>
  )
}
