'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Search, ShieldAlert, Sparkles, ChevronRight, X, Loader2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { searchRoles, AdvisorPlatform, AdvisorResult } from '@/lib/roleAdvisor'

const PLATFORMS: { value: AdvisorPlatform | 'all'; label: string; color: string }[] = [
  { value: 'all',              label: 'Todas as plataformas', color: '#6b7280' },
  { value: 'entraId',         label: 'Entra ID',             color: '#0078d4' },
  { value: 'azureRbac',       label: 'Azure RBAC',           color: '#008ad7' },
  { value: 'googleWorkspace', label: 'Google Workspace',     color: '#34a853' },
  { value: 'ibmCloud',        label: 'IBM Cloud',            color: '#0f62fe' },
  { value: 'gcp',             label: 'GCP IAM',              color: '#4285f4' },
  { value: 'aws',             label: 'AWS IAM',              color: '#ff9900' },
  { value: 'oci',             label: 'OCI IAM',              color: '#C74634' },
]

const EXAMPLES = [
  'Quero acesso de leitura somente para auditar recursos no Azure',
  'Preciso gerenciar DNS e rede na infraestrutura clássica IBM',
  'Administrar usuários e grupos no Google Workspace',
  'Gerenciar políticas IAM e identidades no Entra ID',
  'Acesso total ao Kubernetes sem permissão de billing',
  'Configurar regras de firewall e segurança de rede',
  'Monitorar e visualizar logs e métricas de observabilidade',
  'Gerenciar certificados SSL e chaves SSH',
  'Acesso somente leitura ao S3 e DynamoDB na AWS',
  'Administrar contas de serviço e funções no GCP IAM',
  'Permitir gerenciar compartments e policies no OCI',
  'Criar e rotacionar segredos no Key Vault do Azure',
  'Acesso a billing e custos sem tocar em recursos',
  'Gerenciar pipelines de CI/CD e repositórios de containers',
  'Conceder acesso just-in-time a roles privilegiadas via PIM',
  'Quem tem acesso equivalente a root/owner em cada cloud?',
]

export default function AdvisorPage() {
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
      headerSub="Descreva o que você precisa fazer — encontraremos a role ideal em todas as plataformas"
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">

        {/* ── Search area ─────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">

          {/* Intro banner */}
          {!searched && (
            <div className="mb-4 flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/40 dark:to-blue-950/40 border border-violet-200/60 dark:border-violet-800/40">
              <Sparkles size={18} className="text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Role Advisor — busca semântica cross-platform</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Descreva em linguagem natural o que você precisa fazer. O advisor pesquisa em <strong>{'>'}1.700 roles</strong> do Entra ID, Azure RBAC, Google Workspace, IBM Cloud, GCP IAM, AWS IAM e OCI IAM e retorna as mais relevantes para o seu contexto.
                </p>
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => handleChange(e.target.value)}
              placeholder="Ex: Preciso gerenciar registros DNS e configurar VPN na infraestrutura clássica IBM..."
              rows={2}
              className="w-full pl-9 pr-10 py-3 text-[13px] rounded-lg border border-[#dde3ec] dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
            {query && (
              <button onClick={clear} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Platform filter pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {PLATFORMS.map(p => (
              <button key={p.value} onClick={() => handlePlatform(p.value)}
                className={`text-[12px] px-3 py-1 rounded-full border transition-colors font-medium ${
                  platform === p.value
                    ? 'text-white border-transparent'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                style={platform === p.value ? { background: p.color, borderColor: p.color } : {}}>
                {p.label}
              </button>
            ))}
            {loading && <Loader2 size={14} className="ml-2 text-gray-400 animate-spin" />}
            {searched && !loading && (
              <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        <div className="flex-1 px-6 py-5">

          {/* Idle state — examples */}
          {!searched && !loading && (
            <div>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mb-3 font-medium uppercase tracking-wider">Exemplos de busca</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => handleExample(ex)}
                    className="text-left text-[13px] px-4 py-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-all flex items-center gap-2">
                    <Sparkles size={12} className="shrink-0 opacity-60" />
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {searched && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <Search size={32} className="mb-3 opacity-40" />
              <p className="text-[14px] font-medium">Nenhuma role encontrada</p>
              <p className="text-[12px] mt-1">Tente termos mais específicos ou em inglês</p>
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
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded text-white" style={{ background: platformColor }}>
                        {platformLabel}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{items.length} role{items.length !== 1 ? 's' : ''}</span>
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
                              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                {role.name}
                              </span>
                              {role.isPrivileged && <ShieldAlert size={12} className="text-red-500 shrink-0" />}
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: role.tierColor + '20', color: role.tierColor }}>
                                {role.tier}
                              </span>
                            </div>
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {role.description}
                            </p>
                            {matchedTerms.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-gray-400 dark:text-gray-600">termos:</span>
                                {matchedTerms.slice(0, 6).map(t => (
                                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 font-mono">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Relevance */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
                            <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono">{Math.round(score)}</span>
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
