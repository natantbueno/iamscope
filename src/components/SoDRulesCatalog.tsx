'use client'

import { useMemo, useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react'
import {
  SOD_RULES, SoDCategory, SoDSeverity, SoDFramework, SoDCloud,
  SOD_CATEGORY_META, SOD_SEVERITY_META, SOD_FRAMEWORK_META, SOD_CLOUD_META, SOD_SEVERITY_ORDER,
} from '@/data/sod/rules'
import SoDSeverityBadge from './SoDSeverityBadge'
import SoDRuleDetailCard from './SoDRuleDetailCard'

const ALL_CATEGORIES = Object.keys(SOD_CATEGORY_META) as SoDCategory[]
const ALL_SEVERITIES = Object.keys(SOD_SEVERITY_META) as SoDSeverity[]
const ALL_FRAMEWORKS = Object.keys(SOD_FRAMEWORK_META) as SoDFramework[]
const ALL_CLOUDS: SoDCloud[] = ['entra-id', 'azure-rbac', 'both']

type SortKey = 'severity' | 'category'

export default function SoDRulesCatalog() {
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

  const cloud = searchParams.get('cloud') as SoDCloud | null
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

  const toggleSeverity = (sev: SoDSeverity) => {
    const next = severities.includes(sev) ? severities.filter((s) => s !== sev) : [...severities, sev]
    update('sev', next.join(','))
  }

  const hasFilters = !!cloud || !!category || severities.length > 0 || !!framework || !!q
  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    ;['cloud', 'cat', 'sev', 'fw', 'q'].forEach((k) => params.delete(k))
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const filtered = useMemo(() => {
    return SOD_RULES.filter((r) => {
      if (cloud && r.cloud !== cloud) return false
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
  }, [cloud, category, severities, framework, q, sortKey, sortDir])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filtros */}
      <div className="px-4 py-3 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filtros</span>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400 w-16 shrink-0">Cloud</span>
          {ALL_CLOUDS.map((c) => (
            <button key={c} onClick={() => update('cloud', cloud === c ? '' : c)}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                cloud === c ? 'bg-[#e8f1fb] dark:bg-[#0c2a47] text-[#0078d4] dark:text-[#85b7eb] border-[#9dc3e8] dark:border-[#185fa5]'
                             : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {SOD_CLOUD_META[c].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400 w-16 shrink-0">Severidade</span>
          {ALL_SEVERITIES.map((s) => {
            const active = severities.includes(s)
            const meta = SOD_SEVERITY_META[s]
            return (
              <button key={s} onClick={() => toggleSeverity(s)}
                className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${active ? 'text-white border-transparent' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                style={active ? { background: meta.color, borderColor: meta.color } : {}}>
                {meta.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400 w-16 shrink-0">Categoria</span>
          <select value={category ?? ''} onChange={(e) => update('cat', e.target.value)}
            className="text-[12px] px-2 py-1 rounded border border-[#dde3ec] dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
            <option value="">Todas as categorias</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{SOD_CATEGORY_META[c].label}</option>
            ))}
          </select>
          <select value={framework ?? ''} onChange={(e) => update('fw', e.target.value)}
            className="text-[12px] px-2 py-1 rounded border border-[#dde3ec] dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
            <option value="">Todos os frameworks</option>
            {ALL_FRAMEWORKS.map((f) => (
              <option key={f} value={f}>{SOD_FRAMEWORK_META[f].label}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[160px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={q} onChange={(e) => update('q', e.target.value)} placeholder="Buscar por nome ou role..."
              className="w-full text-[12px] pl-7 pr-2 py-1 rounded border border-[#dde3ec] dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">Exibindo {filtered.length} de {SOD_RULES.length} regras</p>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 dark:text-gray-500 text-[13px]">
            <span>Nenhuma regra encontrada com os filtros selecionados.</span>
            {hasFilters && (
              <button onClick={resetFilters}
                className="flex items-center gap-1 text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline">
                <X size={12} /> Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-[#dde3ec] dark:border-gray-700">
              <tr>
                <Th sortDir={sortKey === 'severity' ? sortDir : undefined} onClick={() => toggleSort('severity')}>Severidade</Th>
                <Th>Regra</Th>
                <Th>Role A</Th>
                <Th>Role B</Th>
                <Th sortDir={sortKey === 'category' ? sortDir : undefined} onClick={() => toggleSort('category')}>Categoria</Th>
                <Th>Frameworks</Th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((rule) => {
                const isOpen = expanded.has(rule.id)
                return (
                  <>
                    <tr key={rule.id}
                      onClick={() => toggleExpand(rule.id)}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer">
                      <td className="px-4 py-2.5 align-top"><SoDSeverityBadge severity={rule.severity} /></td>
                      <td className="px-4 py-2.5 align-top">
                        <Link href={`/sod/rules/${rule.id}`} onClick={(e) => e.stopPropagation()}
                          className="font-medium text-[#0078d4] dark:text-[#85b7eb] hover:underline">
                          {rule.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 align-top text-gray-600 dark:text-gray-300">{rule.roleA.name}</td>
                      <td className="px-4 py-2.5 align-top text-gray-600 dark:text-gray-300">{rule.roleB.name}</td>
                      <td className="px-4 py-2.5 align-top text-gray-500 dark:text-gray-400">{SOD_CATEGORY_META[rule.category].label}</td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-wrap gap-1">
                          {rule.frameworks.slice(0, 3).map((f) => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{f}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 align-top text-right">
                        {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-300 dark:text-gray-600" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${rule.id}-detail`}>
                        <td colSpan={7} className="px-4 pb-4 pt-0 bg-gray-50/60 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
                          <div className="pt-3">
                            <SoDRuleDetailCard rule={rule} compact />
                            <Link href={`/sod/rules/${rule.id}`} className="inline-block mt-3 text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline">
                              Ver página completa da regra →
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
    </div>
  )
}

function Th({ children, onClick, sortDir }: { children: React.ReactNode; onClick?: () => void; sortDir?: 'asc' | 'desc' }) {
  return (
    <th
      onClick={onClick}
      className={`text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2.5 ${onClick ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && (
          <span className="text-[9px]">
            {sortDir === 'asc' ? <ChevronUp size={10} /> : sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronDown size={10} className="opacity-30" />}
          </span>
        )}
      </span>
    </th>
  )
}
