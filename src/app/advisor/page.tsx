'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Search, ShieldAlert, Compass, ChevronRight, X, Loader2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { searchRoles, AdvisorPlatform, AdvisorResult } from '@/lib/roleAdvisor'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'
import type { TranslationKey } from '@/i18n/dictionary'

// Só o rótulo de "todas" é texto — os demais são nomes de plataforma.
const PLATFORMS: { value: AdvisorPlatform | 'all'; label: TranslationKey | null; color: string }[] = [
  { value: 'all',             label: 'adv.allPlatforms', color: '#6b7280' },
  { value: 'entraId',         label: null,               color: '#0078d4' },
  { value: 'azureRbac',       label: null,               color: '#5c2d91' },
  { value: 'googleWorkspace', label: null,               color: '#34a853' },
  { value: 'ibmCloud',        label: null,               color: '#08bdba' },
  { value: 'gcp',             label: null,               color: '#4285f4' },
  { value: 'aws',             label: null,               color: '#ff9900' },
]

const PLATFORM_NAME: Record<string, string> = {
  all: '', entraId: 'Entra ID', azureRbac: 'Azure RBAC', googleWorkspace: 'Google Workspace',
  ibmCloud: 'IBM Cloud', gcp: 'GCP IAM', aws: 'AWS IAM',
}

// O exemplo vira a consulta digitada, então precisa sair no idioma da pessoa —
// e a busca é por substring sobre dado em inglês, o que já é dito na dica de
// "nenhum resultado".
const EXAMPLES: TranslationKey[] = [
  'adv.exOne', 'adv.exTwo', 'adv.exThree', 'adv.exFour', 'adv.exFive',
  'adv.exSix', 'adv.exSeven', 'adv.exFifteen', 'adv.exEight', 'adv.exNine',
  'adv.exTen', 'adv.exEleven', 'adv.exTwelve', 'adv.exThirteen', 'adv.exFourteen',
]

export default function AdvisorPage() {
  const t = useT()
  const [query, setQuery]           = useState('')
  const [platform, setPlatform]     = useState<AdvisorPlatform | 'all'>('all')
  const [results, setResults]       = useState<AdvisorResult[]>([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)
  const debounce                    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef                    = useRef<HTMLTextAreaElement>(null)

  const runSearch = useCallback(async (q: string, p: AdvisorPlatform | 'all') => {
    if (q.trim().length < 3) { setResults([]); setSearched(false); return }
    setLoading(true)
    try {
      const res = await searchRoles(q, p, 30)
      setResults(res)
      setSearched(true)
    } catch (err) {
      console.error('[RoleAdvisor] search error:', err)
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => runSearch(q, platform), 350)
  }

  const handlePlatform = (p: AdvisorPlatform | 'all') => {
    setPlatform(p)
    runSearch(query, p)
  }

  const handleExample = (ex: string) => {
    setQuery(ex)
    inputRef.current?.focus()
    if (debounce.current) clearTimeout(debounce.current)
    runSearch(ex, platform)
  }

  const clear = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    inputRef.current?.focus()
  }

  // Group results by platform
  const byPlatform = results.reduce<Record<string, AdvisorResult[]>>((acc, r) => {
    const k = r.role.platformLabel
    if (!acc[k]) acc[k] = []
    acc[k].push(r)
    return acc
  }, {})

  return (
    <AppShell
      headerTitle="Role Advisor"
      headerSub={t('adv.headerSub')}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">

        {/* ── Search area ─────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">

          {/* Intro banner */}
          {!searched && (
            <div className="mb-4 flex items-start gap-3 p-4 rounded-lg bg-surface-alt border border-line">
              <Compass size={18} className="text-fg-subtle mt-0.5 shrink-0" />
              <div>
                <p className="text-body font-medium text-gray-800 dark:text-gray-200">{t('adv.pageTitle')}</p>
                <p className="text-tiny text-fg-muted mt-0.5">
                  <Rich text={t('adv.introBody')} />
                </p>
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-fg-muted shrink-0" />
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => handleChange(e.target.value)}
              placeholder={t('ph.advisorExample')}
              rows={2}
              className="w-full pl-9 pr-10 py-3 text-body rounded-lg border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
            {query && (
              <button onClick={clear} className="absolute right-3 top-3 text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Platform filter pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {PLATFORMS.map(p => (
              <button key={p.value} onClick={() => handlePlatform(p.value)}
                className={`text-tiny px-3 py-1 rounded-full border transition-colors font-medium ${
                  platform === p.value
                    ? 'text-white border-transparent'
                    : 'bg-transparent text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                style={platform === p.value ? { background: p.color, borderColor: p.color } : {}}>
                {p.label ? t(p.label) : PLATFORM_NAME[p.value]}
              </button>
            ))}
            {loading && <Loader2 size={14} className="ml-2 text-fg-subtle animate-spin" />}
            {searched && !loading && (
              <span className="ml-auto text-tiny text-fg-muted">
                {results.length} {results.length === 1 ? t('adv.resultOne') : t('adv.resultMany')}
              </span>
            )}
          </div>
        </div>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        <div className="flex-1 px-6 py-5">

          {/* Idle state — examples */}
          {!searched && !loading && (
            <div>
              <p className="text-tiny text-fg-muted mb-3 font-medium uppercase tracking-wider">{t('adv.examplesTitle')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLES.map(exKey => (
                  <button key={exKey} onClick={() => handleExample(t(exKey))}
                    className="text-left text-body px-4 py-3 rounded-lg border border-dashed border-line-strong text-fg-muted hover:border-accent hover:text-fg hover:bg-surface-alt transition-all flex items-center gap-2">
                    <ChevronRight size={12} className="shrink-0 opacity-60" />
                    {t(exKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {searched && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
              <Search size={32} className="mb-3 opacity-40" />
              <p className="text-note font-medium">{t('adv.emptyTitle')}</p>
              <p className="text-tiny mt-1">{t('adv.emptyHint')}</p>
            </div>
          )}

          {/* Results grouped by platform */}
          {searched && !loading && results.length > 0 && (
            <div className="space-y-6">
              {Object.entries(byPlatform).map(([platformLabel, items]) => {
                const platformColor = items[0].role.platformColor
                return (
                  <div key={platformLabel}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xs font-semibold px-2 py-0.5 rounded text-white" style={{ background: platformColor }}>
                        {platformLabel}
                      </span>
                      <span className="text-3xs text-fg-muted">{items.length} {items.length === 1 ? t('adv.roleOne') : t('noun.roles')}</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map(({ role, score, matchedTerms }) => (
                        <Link key={role.key} href={role.href}
                          className="group flex items-start gap-3 px-4 py-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all">

                          {/* Score bar */}
                          <div className="w-1 self-stretch rounded-full shrink-0 opacity-60"
                            style={{ background: platformColor, minHeight: 16 }} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-body font-medium text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                {role.name}
                              </span>
                              {role.isPrivileged && <ShieldAlert size={12} className="text-red-500 shrink-0" />}
                              <span className="text-3xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: role.tierColor + '20', color: role.tierColor }}>
                                {role.tier}
                              </span>
                            </div>
                            <p className="text-tiny text-fg-muted mt-0.5 line-clamp-2">
                              {role.description}
                            </p>
                            {matchedTerms.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-2xs text-fg-subtle dark:text-gray-600">{t('adv.termsLabel')}</span>
                                {matchedTerms.slice(0, 6).map(term => (
                                  <span key={term} className="text-2xs px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 font-mono">
                                    {term}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Relevance */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <ChevronRight size={14} className="text-fg-muted dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
                            <span className="text-2xs text-fg-muted dark:text-gray-600 font-mono">{Math.round(score)}</span>
                          </div>
                        </Link>
                      ))}
                             </div>
                  </div>
                )
                        })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
