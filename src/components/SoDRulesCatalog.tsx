'use client'

import { useMemo, useCallback, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import {
  SOD_RULES, SoDCategory, SoDSeverity, SoDFramework, SoDPlatform, SoDProvider,
  SOD_CATEGORY_META, SOD_SEVERITY_META, SOD_FRAMEWORK_META, SOD_SEVERITY_ORDER,
  SOD_PLATFORM_META, SOD_PROVIDER_META, SOD_PROVIDERS,
  ruleProvider, rulePlatforms, isCrossPlatform,
} from '@/data/sod/rules'
import SoDSeverityBadge from './SoDSeverityBadge'
import SoDCloudBadge from './SoDCloudBadge'
import SoDRuleDetailCard from './SoDRuleDetailCard'
import ExportButton from './ExportButton'

const ALL_CATEGORIES = Object.keys(SOD_CATEGORY_META) as SoDCategory[]
const ALL_SEVERITIES = Object.keys(SOD_SEVERITY_META) as SoDSeverity[]
const ALL_FRAMEWORKS = Object.keys(SOD_FRAMEWORK_META) as SoDFramework[]

type SortKey = 'severity' | 'category'

export default function SoDRulesCatalog() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const provider = searchParams.get('prov') as SoDProvider | null
  const platform = searchParams.get('cloud') as SoDPlatform | null
  const category = searchParams.get('cat') as SoDCategory | null
  const severities = useMemo(() => {
    const raw = searchParams.get('sev')
    return raw ? (raw.split(',') as SoDSeverity[]) : []
  }, [searchParams])
  const framework = searchParams.get('fw') as SoDFramework | null
  const q = searchParams.get('q') ?? ''

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  /* Trocar de provedor limpa a plataforma: manter "AWS IAM" selecionado
     enquanto o provedor vira Google devolveria zero resultados sem explicar
     por quê. */
  const setProvider = useCallback((value: SoDProvider | '') => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('prov', value); else params.delete('prov')
    params.delete('cloud')
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const toggleSeverity = (sev: SoDSeverity) => {
    const next = severities.includes(sev) ? severities.filter((s) => s !== sev) : [...severities, sev]
    update('sev', next.join(','))
  }

  /* As plataformas oferecidas seguem o provedor selecionado. Sem provedor,
     todas — e a linha só aparece quando há mais de uma opção real. */
  const platformOptions: SoDPlatform[] = useMemo(() => (
    provider ? SOD_PROVIDER_META[provider].platforms
             : SOD_PROVIDERS.flatMap((p) => SOD_PROVIDER_META[p].platforms)
  ), [provider])

  const hasFilters = !!provider || !!platform || !!category || severities.length > 0 || !!framework || !!q
  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    ;['prov', 'cloud', 'cat', 'sev', 'fw', 'q'].forEach((k) => params.delete(k))
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const filtered = useMemo(() => {
    return SOD_RULES.filter((r) => {
      if (provider && ruleProvider(r) !== provider) return false
      /* Casa por PLATAFORMA TOCADA, não por igualdade com rule.cloud. Antes,
         filtrar "Entra ID" escondia as regras cross — que envolvem Entra ID.
         Quem filtra por uma plataforma quer tudo que a envolve. */
      if (platform && !rulePlatforms(r).includes(platform)) return false
      if (category && r.category !== category) return false
      if (severities.length > 0 && !severities.includes(r.severity)) return false
      if (framework && !r.frameworks.includes(framework)) return false
      if (q) {
        const query = q.toLowerCase()
        const haystack = `${r.name} ${r.roleA.name} ${r.roleB.name}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    }).sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'severity') {
        return (SOD_SEVERITY_ORDER[a.severity] - SOD_SEVERITY_ORDER[b.severity]) * dir || a.name.localeCompare(b.name)
      }
      if (sortKey === 'category') {
        return SOD_CATEGORY_META[a.category].label.localeCompare(SOD_CATEGORY_META[b.category].label) * dir || a.name.localeCompare(b.name)
      }
      return SOD_SEVERITY_ORDER[a.severity] - SOD_SEVERITY_ORDER[b.severity] || a.name.localeCompare(b.name)
    })
  }, [provider, platform, category, severities, framework, q, sortKey, sortDir])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(filtered)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filtros */}
      <div className="px-4 py-3 border-b border-surface-border dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-3xs font-semibold text-fg-muted uppercase tracking-wider">{t('sod.filters')}</span>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-3xs text-fg-subtle hover:text-danger transition-colors">
              <X size={12} /> {t('action.clear')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-3xs text-fg-subtle w-16 shrink-0">{t('sod.provider')}</span>
          {SOD_PROVIDERS.map((p) => (
            <Chip key={p} active={provider === p} onClick={() => setProvider(provider === p ? '' : p)}>
              {SOD_PROVIDER_META[p].label}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-3xs text-fg-subtle w-16 shrink-0">{t('sod.platform')}</span>
          {platformOptions.map((p) => (
            <Chip key={p} active={platform === p} onClick={() => update('cloud', platform === p ? '' : p)}>
              {SOD_PLATFORM_META[p].label}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-3xs text-fg-subtle w-16 shrink-0">{t('table.severity')}</span>
          {ALL_SEVERITIES.map((s) => {
            const active = severities.includes(s)
            const meta = SOD_SEVERITY_META[s]
            return (
              <button key={s} onClick={() => toggleSeverity(s)}
                className={`text-3xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${active ? 'text-white border-transparent' : 'text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                style={active ? { background: meta.color, borderColor: meta.color } : {}}>
                {meta.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-3xs text-fg-subtle w-16 shrink-0">{t('table.category')}</span>
          <select value={category ?? ''} onChange={(e) => update('cat', e.target.value)}
            className="text-tiny px-2 py-1 rounded border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
            <option value="">{t('filter.allCategories')}</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{SOD_CATEGORY_META[c].label}</option>
            ))}
          </select>
          <select value={framework ?? ''} onChange={(e) => update('fw', e.target.value)}
            className="text-tiny px-2 py-1 rounded border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
            <option value="">{t('filter.allFrameworks')}</option>
            {ALL_FRAMEWORKS.map((f) => (
              <option key={f} value={f}>{SOD_FRAMEWORK_META[f].label}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[160px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input type="text" value={q} onChange={(e) => update('q', e.target.value)} placeholder={t('ph.searchRuleOrRole')}
              className="w-full text-tiny pl-7 pr-2 py-1 rounded border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-3xs text-fg-muted">
            {t('sod.showing')} {filtered.length} {t('sod.outOf')} {SOD_RULES.length} {t('noun.rules')}
          </p>
          <ExportButton
            filename="sod-rules"
            data={filtered.map((r) => ({
              id: r.id, name: r.name, severity: r.severity, category: r.category,
              provider: ruleProvider(r), cloud: r.cloud,
              roleA: r.roleA.name, roleAPlatform: r.roleA.cloud,
              roleB: r.roleB.name, roleBPlatform: r.roleB.cloud,
              frameworks: r.frameworks,
            }))}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-fg-muted text-body">
            <span>{t('sod.noRulesMatch')}</span>
            {hasFilters && (
              <button onClick={resetFilters}
                className="flex items-center gap-1 text-tiny text-brand-strong dark:text-brand-onDark hover:underline">
                <X size={12} /> {t('action.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-body border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
              <tr>
                <Th sortDir={sortKey === 'severity' ? sortDir : undefined} onClick={() => toggleSort('severity')}>{t('table.severity')}</Th>
                <Th>{t('sod.colRule')}</Th>
                <Th>Role A</Th>
                <Th>Role B</Th>
                <Th sortDir={sortKey === 'category' ? sortDir : undefined} onClick={() => toggleSort('category')}>{t('table.category')}</Th>
                <Th>Frameworks</Th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((rule) => {
                const isOpen = expanded.has(rule.id)
                /* O badge de plataforma só aparece nas regras que cruzam
                   plataformas. Numa regra de uma plataforma só, repeti-lo em
                   toda linha é ruído: a coluna de provedor já foi filtrada e o
                   detalhe expandido diz de onde cada role vem. */
                const cross = isCrossPlatform(rule)
                return (
                  <>
                    <tr key={rule.id}
                      onClick={() => toggleExpand(rule.id)}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer">
                      <td className="px-4 py-2.5 align-top"><SoDSeverityBadge severity={rule.severity} /></td>
                      <td className="px-4 py-2.5 align-top">
                        <Link href={`/sod/rules/${rule.id}`} onClick={(e) => e.stopPropagation()}
                          className="font-medium text-brand-strong dark:text-brand-onDark hover:underline">
                          {rule.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 align-top text-gray-600 dark:text-gray-300">
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          {rule.roleA.name}
                          {cross && <SoDCloudBadge cloud={rule.roleA.cloud} />}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-top text-gray-600 dark:text-gray-300">
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          {rule.roleB.name}
                          {cross && <SoDCloudBadge cloud={rule.roleB.cloud} />}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-top text-fg-muted">{SOD_CATEGORY_META[rule.category].label}</td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-wrap gap-1">
                          {rule.frameworks.slice(0, 3).map((f) => (
                            <span key={f} className="text-micro px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-fg-muted">{f}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 align-top text-right">
                        {isOpen ? <ChevronUp size={14} className="text-fg-subtle" /> : <ChevronDown size={14} className="text-fg-muted dark:text-gray-600" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${rule.id}-detail`}>
                        <td colSpan={7} className="px-4 pb-4 pt-0 bg-gray-50/60 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
                          <div className="pt-3">
                            <SoDRuleDetailCard rule={rule} compact />
                            <Link href={`/sod/rules/${rule.id}`} className="inline-block mt-3 text-tiny text-brand-strong dark:text-brand-onDark hover:underline">
                              {t('sod.seeFullRule')} →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <Pagination
        total={filtered.length} page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.rules"
      />
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-3xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
        active ? 'bg-brand-soft dark:bg-brand-activeBg text-brand-strong dark:text-brand-onDark border-brand-mid dark:border-brand-activeRing'
               : 'text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}>
      {children}
    </button>
  )
}

function Th({ children, onClick, sortDir }: { children: React.ReactNode; onClick?: () => void; sortDir?: 'asc' | 'desc' }) {
  return (
    <th
      onClick={onClick}
      className={`text-left text-3xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 ${onClick ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && (
          <span className="text-micro">
            {sortDir === 'asc' ? <ChevronUp size={10} /> : sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronDown size={10} className="opacity-30" />}
          </span>
        )}
      </span>
    </th>
  )
}
