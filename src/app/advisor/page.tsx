'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, ShieldAlert, Compass, ChevronRight, X, Loader2,
  Ban, Filter, HelpCircle, AlertTriangle, ChevronDown, Clock,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import { BetaNotice } from '@/components/BetaBadge'
import { searchRoles, getIndexSize, AdvisorPlatform, AdvisorResponse } from '@/lib/roleAdvisor'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import { Rich } from '@/i18n/Rich'
import type { TranslationKey } from '@/i18n/dictionary'

// Só o rótulo de "todas" é texto — os demais são nomes de plataforma.
const PLATFORMS: { value: AdvisorPlatform | 'all'; label: TranslationKey | null }[] = [
  { value: 'all',             label: 'adv.allPlatforms' },
  { value: 'entraId',         label: null },
  { value: 'azureRbac',       label: null },
  { value: 'googleWorkspace', label: null },
  { value: 'ibmCloud',        label: null },
  { value: 'gcp',             label: null },
  { value: 'aws',             label: null },
]

const PLATFORM_NAME: Record<string, string> = {
  all: '', entraId: 'Entra ID', azureRbac: 'Azure RBAC', googleWorkspace: 'Google Workspace',
  ibmCloud: 'IBM Cloud', gcp: 'GCP IAM', aws: 'AWS IAM',
}

// O exemplo vira a consulta digitada, então precisa sair no idioma da pessoa.
const EXAMPLES: TranslationKey[] = [
  'adv.exOne', 'adv.exTwo', 'adv.exThree', 'adv.exFour', 'adv.exFive',
  'adv.exSix', 'adv.exSeven', 'adv.exFifteen', 'adv.exEight', 'adv.exNine',
  'adv.exTen', 'adv.exEleven', 'adv.exTwelve', 'adv.exThirteen', 'adv.exFourteen',
]

const CONF_KEY: Record<'high' | 'medium' | 'low', TranslationKey> = {
  high: 'adv.confHigh', medium: 'adv.confMedium', low: 'adv.confLow',
}

export default function AdvisorPage() {
  const t = useT()
  const fmt = useNumberFormat()
  const [query, setQuery]       = useState('')
  const [platform, setPlatform] = useState<AdvisorPlatform | 'all'>('all')
  const [res, setRes]           = useState<AdvisorResponse | null>(null)
  const [loading, setLoading]   = useState(false)
  const [howOpen, setHowOpen]   = useState(false)
  const [indexSize, setSize]    = useState<number | null>(null)
  const debounce                = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef                = useRef<HTMLTextAreaElement>(null)

  // A contagem do índice é lida do índice, nunca escrita à mão no texto: a
  // frase de abertura já anunciou "mais de 1.700" quando eram 4.603.
  useEffect(() => { getIndexSize().then(setSize).catch(() => {}) }, [])

  const runSearch = useCallback(async (q: string, p: AdvisorPlatform | 'all') => {
    if (q.trim().length < 3) { setRes(null); return }
    setLoading(true)
    try {
      setRes(await searchRoles(q, p, 30))
    } catch (err) {
      console.error('[RoleAdvisor] search error:', err)
      setRes(null)
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
    setRes(null)
    inputRef.current?.focus()
  }

  const results = res?.results ?? []
  const plan = res?.plan
  const searched = res !== null

  const byPlatform = results.reduce<Record<string, typeof results>>((acc, r) => {
    const k = r.role.platformLabel
    if (!acc[k]) acc[k] = []
    acc[k].push(r)
    return acc
  }, {})

  // A frase de cobertura tem um link no meio, então é montada em duas metades
  // em vez de virar três chaves de tradução (ver o cabeçalho de Rich.tsx).
  const coverage = t('adv.howCoverage').replace('{n}', indexSize ? fmt(indexSize) : '…')
  const [covA, covB] = coverage.split('{scope}')

  return (
    <AppShell headerTitle="Role Advisor" headerSub={t('adv.headerSub')} beta>
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">

        {/* ── Área de busca ───────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-line bg-surface shrink-0">

          {!searched && (
            <div className="mb-4 flex items-start gap-3 p-4 rounded-lg bg-surface-alt border border-line">
              <Compass size={18} className="text-fg-subtle mt-0.5 shrink-0" />
              <div>
                <p className="text-body font-medium text-fg">{t('adv.pageTitle')}</p>
                <p className="text-tiny text-fg-muted mt-0.5">
                  <Rich text={t('adv.introBody')} />
                </p>
              </div>
            </div>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-fg-muted shrink-0" />
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={t('ph.advisorExample')}
              rows={2}
              aria-label={t('adv.headerSub')}
              className="w-full pl-9 pr-10 py-3 text-body rounded-lg border border-line-strong bg-surface text-fg placeholder-fg-subtle resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
            {query && (
              <button onClick={clear} aria-label={t('action.clearSearch')}
                className="absolute right-3 top-3 text-fg-subtle hover:text-fg transition-colors">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {PLATFORMS.map((p) => (
              <button key={p.value} onClick={() => handlePlatform(p.value)}
                aria-pressed={platform === p.value}
                className={`text-tiny px-3 py-1 rounded-full border transition-colors font-medium ${
                  platform === p.value
                    ? 'bg-surface-alt text-fg border-accent'
                    : 'bg-transparent text-fg-muted border-line-strong hover:bg-surface-alt hover:text-fg'
                }`}>
                {p.label ? t(p.label) : PLATFORM_NAME[p.value]}
              </button>
            ))}
            {loading && <Loader2 size={14} className="ml-2 text-fg-subtle animate-spin" />}
          </div>

          <div className="mt-3">
            <BetaNotice items={['beta.advOne', 'beta.advTwo', 'beta.advThree']} />
          </div>

          {/*
            O PLANO DE CONSULTA.
            Existe porque a busca errada silenciosa é a pior das duas: quem lê
            "excluindo billing" e vê uma role de billing na lista sabe na hora
            que o parser falhou, e reescreve a frase. Sem esta faixa, a mesma
            pessoa concluiria que o catálogo é ruim.
          */}
          {plan && !loading && plan.terms.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-3xs">
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <span className="text-fg-subtle uppercase tracking-wider">{t('adv.planTerms')}</span>
                {plan.terms.map((term) => (
                  <code key={term} className="px-1.5 py-0.5 rounded bg-surface-alt text-fg-muted font-mono">{term}</code>
                ))}
              </span>

              {plan.scopedPlatforms.length > 0 && (
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  <Filter size={10} className="text-fg-subtle" />
                  <span className="text-fg-subtle uppercase tracking-wider">{t('adv.planScope')}</span>
                  {plan.scopedPlatforms.map((p) => (
                    <span key={p} className="px-1.5 py-0.5 rounded bg-surface-alt text-fg-muted">{PLATFORM_NAME[p]}</span>
                  ))}
                </span>
              )}

              {plan.excluded.length > 0 && (
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  <Ban size={10} className="text-danger" />
                  <span className="text-fg-subtle uppercase tracking-wider">{t('adv.planExcluded')}</span>
                  {plan.excluded.map((term) => (
                    <code key={term} className="px-1.5 py-0.5 rounded border border-danger/40 text-danger font-mono line-through">{term}</code>
                  ))}
                </span>
              )}

              {plan.unmatched.length > 0 && (
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  <AlertTriangle size={10} className="text-fg-subtle" />
                  <span className="text-fg-subtle uppercase tracking-wider">{t('adv.planUnmatched')}</span>
                  {plan.unmatched.map((term) => (
                    <code key={term} className="px-1.5 py-0.5 rounded bg-surface-alt text-fg-subtle font-mono">{term}</code>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Resultados ──────────────────────────────────────────────────── */}
        <div className="flex-1 px-6 py-5">

          {!searched && !loading && (
            <div>
              <p className="text-tiny text-fg-muted mb-3 font-medium uppercase tracking-wider">{t('adv.examplesTitle')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLES.map((exKey) => (
                  <button key={exKey} onClick={() => handleExample(t(exKey))}
                    className="text-left text-body px-4 py-3 rounded-lg border border-dashed border-line-strong text-fg-muted hover:border-accent hover:text-fg hover:bg-surface-alt transition-all flex items-center gap-2">
                    <ChevronRight size={12} className="shrink-0 opacity-60" />
                    {t(exKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted max-w-lg mx-auto text-center">
              <Search size={32} className="mb-3 opacity-40" />
              <p className="text-note font-medium">{t('adv.emptyTitle')}</p>
              <p className="text-tiny mt-1">{t('adv.emptyHint')}</p>
            </div>
          )}

          {searched && !loading && results.length > 0 && res && (
            <div className="space-y-6">

              {/* Cabeçalho de confiança. O aviso de encaixe fraco vale mais que
                  a lista: 30 resultados que atendem um terço da frase são 30
                  respostas erradas, e a versão anterior devolvia exatamente
                  isso, sempre, sem dizer. */}
              <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${
                // `danger.soft` é um hex só do tema escuro; no claro viraria uma
                // caixa vermelha escura. O aviso usa a borda para se distinguir.
                res.confidence === 'low'
                  ? 'border-danger/50 bg-surface-alt'
                  : 'border-line bg-surface-alt'
              }`}>
                <span className={`text-3xs font-semibold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${
                  res.confidence === 'low' ? 'border-danger/50 text-danger' : 'border-line-strong text-fg-muted'
                }`}>
                  {t(CONF_KEY[res.confidence])}
                </span>
                <div className="min-w-0">
                  <p className="text-3xs text-fg-muted">
                    {results.length} {results.length === 1 ? t('adv.resultOne') : t('adv.resultMany')}
                    {' '}{t('adv.candidates').replace('{n}', fmt(res.candidates))}
                  </p>
                  {res.confidence === 'low' && (
                    <p className="text-3xs text-fg-muted mt-0.5">{t('adv.confLowNote')}</p>
                  )}
                </div>
              </div>

              {Object.entries(byPlatform).map(([platformLabel, items]) => (
                <div key={platformLabel}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded border border-line-strong text-fg-muted">
                      {platformLabel}
                    </span>
                    <span className="text-3xs text-fg-muted">
                      {items.length} {items.length === 1 ? t('adv.roleOne') : t('noun.roles')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(({ role, relevance, matchedTerms }) => (
                      <Link key={role.key} href={role.href}
                        className="group flex items-start gap-3 px-4 py-3 rounded-lg border border-line bg-surface hover:border-accent hover:bg-surface-alt transition-all">

                        {/* Barra de relevância — proporção, não número solto.
                            O score cru (18, 19, 20) não tinha escala nenhuma. */}
                        <span className="w-0.5 self-stretch rounded-full shrink-0 bg-accent"
                          style={{ opacity: 0.25 + relevance * 0.75, minHeight: 16 }} aria-hidden />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-body font-medium text-fg">{role.name}</span>
                            {role.isPrivileged && <ShieldAlert size={12} className="text-danger shrink-0" />}
                            {role.deprecated && (
                              <span className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded-full border border-line-strong text-fg-muted">
                                <Clock size={9} /> deprecated
                              </span>
                            )}
                            <span className="text-3xs px-1.5 py-0.5 rounded-full border border-line-strong text-fg-muted">
                              {role.tier}
                            </span>
                          </div>
                          <p className="text-tiny text-fg-muted mt-0.5 line-clamp-2">{role.description}</p>
                          {matchedTerms.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <span className="text-2xs text-fg-subtle">{t('adv.termsLabel')}</span>
                              {matchedTerms.slice(0, 6).map((term) => (
                                <span key={term} className="text-2xs px-1.5 py-0.5 rounded bg-surface-alt text-fg-muted font-mono">
                                  {term}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <ChevronRight size={14} className="text-fg-subtle group-hover:text-fg shrink-0 mt-0.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/*
            COMO FUNCIONA — a dívida do item 8.
            Fica no fim e fechado por padrão: quem já sabe não tropeça nele, e
            quem duvida do resultado tem onde conferir o método sem sair da
            página. Uma ferramenta de IAM que não diz o que a alimenta não é
            citável, e citabilidade é a moeda deste site.
          */}
          <section className="mt-10 border-t border-line pt-5">
            <button
              onClick={() => setHowOpen((o) => !o)}
              aria-expanded={howOpen}
              className="flex items-center gap-2 text-tiny font-medium text-fg-muted hover:text-fg transition-colors">
              <HelpCircle size={14} />
              {t('adv.howTitle')}
              <ChevronDown size={13} className={`transition-transform ${howOpen ? 'rotate-180' : ''}`} />
            </button>

            {howOpen && (
              <div className="mt-3 max-w-3xl space-y-2.5 text-tiny text-fg-muted leading-relaxed">
                <p><Rich text={t('adv.howMethod')} className="text-fg" /></p>
                <p><Rich text={t('adv.howLexicon')} className="text-fg" /></p>
                <p><Rich text={t('adv.howNegation')} className="text-fg" /></p>
                <p><Rich text={t('adv.howNot')} className="text-fg" /></p>
                <p className="pt-1 border-t border-line">
                  <Rich text={covA} className="text-fg" />
                  <Link href="/permission-scope" className="text-brand-onDark hover:underline">Permission Scope</Link>
                  <Rich text={covB ?? ''} className="text-fg" />
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  )
}
