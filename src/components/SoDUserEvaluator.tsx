'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Sparkles, Trash2, Download, ChevronDown, ChevronUp, AlertTriangle, CheckCheck } from 'lucide-react'
import {
  SoDCloudScope, parseRoleListInput, evaluateUserRoles, generateSoDReportText,
  SOD_RISK_META, SOD_EXAMPLE_ROLES, SOD_EXAMPLE_ROLES_TYPICAL, SoDEvaluationResult,
  findSimilarRoleNames,
} from '@/lib/sod'
import SoDSeverityBadge from './SoDSeverityBadge'
import SoDCloudBadge from './SoDCloudBadge'
import SoDRuleDetailCard from './SoDRuleDetailCard'
import { useT } from '@/i18n/LanguageProvider'

export default function SoDUserEvaluator() {
  const t = useT()
  const [rawInput, setRawInput] = useState('')
  const [cloudScope, setCloudScope] = useState<SoDCloudScope>('both')
  const [result, setResult] = useState<SoDEvaluationResult | null>(null)
  const [expandedConflict, setExpandedConflict] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState(false)

  const runEvaluation = () => {
    const names = parseRoleListInput(rawInput)
    setResult(evaluateUserRoles(names, cloudScope))
    setExpandedConflict(new Set())
  }

  const loadExampleCritical = () => {
    setRawInput(SOD_EXAMPLE_ROLES.join('\n'))
    setCloudScope('entra-id')
    setResult(null)
  }

  const loadExampleTypical = () => {
    setRawInput(SOD_EXAMPLE_ROLES_TYPICAL.join('\n'))
    setCloudScope('entra-id')
    setResult(null)
  }

  const clear = () => {
    setRawInput('')
    setResult(null)
  }

  const toggleConflict = (i: number) => {
    setExpandedConflict((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const exportReport = () => {
    if (!result) return
    const text = generateSoDReportText(result)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-y-auto flex-1">
      {/* Coluna esquerda — input */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <label className="text-3xs font-semibold text-fg-muted uppercase tracking-wider block">
          Roles atribuídas (uma por linha, JSON array ou CSV)
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          rows={14}
          placeholder={'Global Administrator\nSecurity Reader\nPrivileged Role Administrator'}
          spellCheck={false}
          className="w-full font-mono text-tiny leading-relaxed p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 resize-y focus:outline-none focus:ring-1 focus:ring-brand"
        />

        <div>
          <label className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">Cloud</label>
          <div className="flex items-center gap-2">
            {(['both', 'entra-id', 'azure-rbac'] as SoDCloudScope[]).map((c) => (
              <button key={c} onClick={() => setCloudScope(c)}
                className={`text-3xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  cloudScope === c ? 'bg-brand-soft dark:bg-brand-activeBg text-brand-strong dark:text-brand-onDark border-brand-mid dark:border-brand-activeRing'
                                    : 'text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                {c === 'both' ? 'Ambos' : c === 'entra-id' ? 'Entra ID' : 'Azure RBAC'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={runEvaluation} disabled={!rawInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand hover:bg-[#006cbe] disabled:opacity-40 disabled:cursor-not-allowed text-white text-body font-medium transition-colors">
            <Sparkles size={14} /> Avaliar
          </button>
          <button onClick={loadExampleCritical}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-fg-muted text-body font-medium transition-colors">
            Exemplo — Cenário Crítico
          </button>
          <button onClick={loadExampleTypical}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-fg-muted text-body font-medium transition-colors">
            Exemplo — Cenário Típico
          </button>
          <button onClick={clear}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-fg-muted text-body font-medium transition-colors">
            <Trash2 size={14} /> Limpar
          </button>
        </div>
      </div>

      {/* Coluna direita — resultado */}
      <div className="lg:col-span-3">
        {!result && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6 py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <Sparkles size={28} className="text-fg-muted dark:text-gray-700 mb-3" />
            <p className="text-note font-medium text-gray-600 dark:text-gray-300 mb-1">{t('sod.pasteToStart')}</p>
            <p className="text-tiny text-fg-muted max-w-sm">
              O avaliador cruza todos os pares da lista contra o catálogo de {`>`}40 regras SoD e calcula um score de risco geral — 100% client-side.
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
                <Metric label="Roles avaliadas" value={result.totalRoles} />
                <Metric label="Conflitos" value={result.conflictsFound} />
                <Metric label="Critical / High" value={`${result.severityBreakdown.critical} / ${result.severityBreakdown.high}`} />
                <Metric label="Frameworks impactados" value={result.frameworksImpacted.length} />
              </div>
            </div>

            {/* Conflitos */}
            {result.conflicts.length > 0 && (
              <div>
                <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Conflitos encontrados</p>
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
                              Ver página completa da regra →
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
                    const suggestions = findSimilarRoleNames(r, cloudScope, 3)
                    return (
                      <li key={i}>
                        <span>• {r}</span>
                        {suggestions.length > 0 && (
                          <span className="block pl-3 text-3xs text-fg-muted">
                            Você quis dizer: {suggestions.map((s, si) => (
                              <span key={s.slug}>
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
