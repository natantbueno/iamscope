'use client'

// Permission Scope — busca reversa de permissão em todas as 6 clouds.
//
// O usuário digita uma permissão qualquer (role action do Entra, action do
// Azure, ação IAM da AWS, permission do GCP, ação do IBM Cloud ou
// privilege do Google Workspace) e a página mostra todas as roles/policies que
// a concedem, agrupadas por cloud.
//
// Duas fontes se combinam aqui:
//  - 6 clouds vêm do índice em memória (lib/permissionScope.ts), já no bundle;
//  - Azure RBAC vem de public/azure-perms-index.json, carregado sob demanda,
//    porque suas permissões vivem fora do bundle (926 arquivos JSON).

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, ShieldAlert, ScanSearch, ChevronRight, ChevronDown, ChevronsDown, ChevronsUp, Asterisk, ShieldOff } from 'lucide-react'

import AppShell from '@/components/AppShell'
import ExportButton from '@/components/ExportButton'
import { BetaNotice } from '@/components/BetaBadge'
import {
  isUnanchoredPattern, looksLikeConcreteAction, namespaceKey, wildcardMatches,
} from '@/lib/wildcardMatch'
import { loadAwsUniverse, looksLikeAwsAction, isKnownAwsAction } from '@/lib/awsUniverse'
import { CloudId, CLOUD_META, CLOUD_ORDER, getCloudUrl } from '@/data/compare/types'
import {
  ScopeMatch, ScopeRoleRef, CLOUD_TERMS,
  searchLocalPermissions, countLocalMatches, getLocalIndexStats,
  ensureLocalPermissionIndex,
  getMissingPermissionIndexes,
} from '@/lib/permissionScope'

interface AzurePermIndex {
  slugs: string[]
  index: Record<string, number[]>
  /**
   * Pares action->role que vêm de `NotActions`/`NotDataActions` — o oposto de
   * uma concessão. `index` guarda o conjunto completo (é dele que saem as
   * ~2.700 páginas de permissão e as URLs do sitemap); quem quer a relação
   * correta subtrai isto. Ver scripts/build-azure-perms-index.js.
   */
  denied?: Record<string, number[]>
}

const PER_CLOUD_LIMIT = 40

function PermissionScopeContent() {
  const t = useT()
  const fmt = useNumberFormat()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [activeClouds, setActiveClouds] = useState<Set<CloudId>>(new Set(CLOUD_ORDER))

  // Concessões por wildcard entram LIGADAS por padrão. A pergunta que a página
  // faz é "quem concede esta permissão", e a AdministratorAccess concede — ela
  // só não dizia isso porque a busca era textual. O botão existe para quem
  // quer o casamento literal, não o contrário.
  const [includeWildcard, setIncludeWildcard] = useState(true)

  // Recolher/expandir. Guardamos o que está EXPANDIDO — o inverso do que esta
  // página fazia até 21/08.
  //
  // POR QUE INVERTEU
  //   Uma busca que casa em cinco clouds abria com dezenas de tabelas de roles
  //   escancaradas, e a visão geral — quantas permissões casaram em cada cloud
  //   — ficava soterrada. Recolhido por padrão, a primeira tela responde
  //   "onde isso existe" e o clique responde "quem concede".
  //
  //   Guardar o conjunto EXPANDIDO (e não o recolhido) faz o padrão cair do
  //   próprio estado inicial, em vez de depender de alguém preencher o
  //   conjunto certo. E mantém a garantia que a versão anterior tinha: um
  //   resultado novo não herda o estado do anterior, porque não há o que
  //   herdar num conjunto vazio.
  const [expandedClouds, setExpandedClouds] = useState<Set<CloudId>>(new Set())
  const [expandedPerms, setExpandedPerms] = useState<Set<string>>(new Set())

  const toggleCloudOpen = (c: CloudId) =>
    setExpandedClouds((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c); else next.add(c)
      return next
    })

  const togglePerm = (key: string) =>
    setExpandedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })

  const collapseAll = () => { setExpandedClouds(new Set()); setExpandedPerms(new Set()) }

  // Índice do Azure RBAC — carregado só quando o usuário busca de fato.
  const [azureIndex, setAzureIndex] = useState<AzurePermIndex | null>(null)
  const [azureBySlug, setAzureBySlug] = useState<Map<string, { name: string; isPrivileged: boolean }>>(new Map())
  const [azureLoading, setAzureLoading] = useState(false)
  const [azureError, setAzureError] = useState(false)

  useEffect(() => {
    if (!query.trim() || azureIndex || azureLoading) return
    setAzureLoading(true)
    // O catálogo de roles do Azure (azureRbac.ts, 180 kB) vem junto com o
    // índice, por import dinâmico: ele só serve para traduzir slug -> nome, e
    // isso só faz sentido quando o índice chega. Importado no topo, entrava no
    // First Load de quem talvez nunca buscasse nada.
    Promise.all([
      fetch('/azure-perms-index.json')
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<AzurePermIndex> }),
      import('@/data/azureRbac'),
    ])
      .then(([d, { AZURE_ROLES }]) => {
        const m = new Map<string, { name: string; isPrivileged: boolean }>()
        for (const r of AZURE_ROLES) m.set(r.slug, { name: r.name, isPrivileged: r.isPrivileged })
        setAzureBySlug(m)
        setAzureIndex(d)
        setAzureError(false)
      })
      .catch(() => setAzureError(true))
      .finally(() => setAzureLoading(false))
  }, [query, azureIndex, azureLoading])

  // As permissões do GCP também saíram do bundle (public/gcp-perms-index.json).
  // Sem esperar por elas, a busca voltaria sem nenhum resultado de GCP — e sem
  // avisar, que é pior do que demorar um instante a mais.
  const [gcpReady, setGcpReady] = useState(false)

  useEffect(() => {
    if (!query.trim() || gcpReady) return
    let alive = true
    ensureLocalPermissionIndex()
      .catch(() => { /* as outras clouds continuam respondendo */ })
      .finally(() => { if (alive) setGcpReady(true) })
    return () => { alive = false }
  }, [query, gcpReady])

  /**
   * Quais índices não chegaram, para a tela poder dizer isso.
   *
   * Depende de `gcpReady` porque só depois do `ensureLocalPermissionIndex` a
   * resposta vale — antes dele, "ausente" e "ainda carregando" são a mesma
   * coisa, e avisar cedo seria alarme falso a cada tecla.
   */
  const indicesAusentes = useMemo(
    () => (gcpReady ? getMissingPermissionIndexes() : []),
    [gcpReady],
  )
  const nomesAusentes = indicesAusentes.map((c) => CLOUD_META[c].label).join(', ')

  /**
   * Universo de actions da AWS — só entra em cena no estado VAZIO.
   *
   * É o único momento em que ele muda a resposta: com resultado na tela, saber
   * que a action existe na AWS não acrescenta nada; sem resultado, é a
   * diferença entre "não existe" e "existe, e nenhuma policy gerenciada
   * concede". O arquivo é opcional — enquanto não for gerado, este bloco
   * inteiro é inerte.
   */
  const [universoPronto, setUniversoPronto] = useState(false)

  // Mantém ?q= na URL para o resultado ser compartilhável.
  useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (current === query) return
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString())
      if (query.trim()) p.set('q', query); else p.delete('q')
      const qs = p.toString()
      router.replace(`/permission-scope${qs ? '?' + qs : ''}`, { scroll: false })
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  /**
   * Padrões negativos por role, invertidos de `denied`.
   *
   * POR QUE PRECISA SER POR ROLE, E NÃO POR ENTRADA DO ÍNDICE
   *   A Contributor concede a action `*` — isso é positivo e verdadeiro — e
   *   exclui, em NotActions, o padrão de escrita de Microsoft.Authorization.
   *   Descontar só a ENTRADA negativa não resolve: com a expansão de wildcard
   *   ligada, a Contributor voltava a aparecer em
   *   `Microsoft.Authorization/roleAssignments/write` pela via do `*`, que é o
   *   pior falso positivo possível no Azure RBAC — dizer que a Contributor
   *   atribui role é exatamente o contrário do que a Microsoft desenhou.
   *
   *   Então a regra certa é: a role concede a action procurada se algum padrão
   *   POSITIVO dela casa E nenhum padrão NEGATIVO dela casa.
   */
  const azureNegByRole = useMemo(() => {
    const m = new Map<number, string[]>()
    for (const [pattern, idxs] of Object.entries(azureIndex?.denied ?? {})) {
      for (const i of idxs) {
        const arr = m.get(i)
        if (arr) arr.push(pattern); else m.set(i, [pattern])
      }
    }
    return m
  }, [azureIndex])

  // Matches do Azure, no mesmo formato das demais clouds.
  //
  // As duas passadas de ./lib/permissionScope são repetidas aqui porque o
  // índice do Azure não está no mesmo formato: vem de azure-perms-index.json,
  // com os slugs numerados, e nunca passa pelo ScopeMatch[] em memória.
  const azureMatches = useMemo<ScopeMatch[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q || !azureIndex) return []
    const expand = includeWildcard && looksLikeConcreteAction(q)
    // Espaços de nomes que o índice do Azure ocupa, tirados dele mesmo. Sem
    // isto, o `*` da Owner responde a busca por permissão do GCP e por action
    // do Entra — o mesmo defeito que ./lib/permissionScope tinha. Ver
    // `namespaceKey`; note que `microsoft.insights` e `microsoft.edge` estão
    // no Azure E no Entra, e a consulta com esses prefixos é ambígua de fato.
    const qNs = namespaceKey(q)
    const nsAzure = new Set<string>()
    for (const a of Object.keys(azureIndex.index)) if (!a.includes('*')) nsAzure.add(namespaceKey(a))
    const out: ScopeMatch[] = []
    for (const action of Object.keys(azureIndex.index)) {
      const literal = action.toLowerCase().includes(q)
      // 750 das 2.697 actions deste índice são padrão. Sem esta linha, Owner e
      // Contributor (que concedem `*`) e Reader não aparecem em busca nenhuma
      // por action concreta — nem na busca pela action que a própria página usa
      // de exemplo no placeholder.
      const cobre = !isUnanchoredPattern(action) || nsAzure.has(qNs)
      const viaWildcard = !literal && expand && action.includes('*') && cobre && wildcardMatches(action, q)
      if (!literal && !viaWildcard) continue
      // Contra o que a exclusão é medida: a action concreta que a pessoa
      // digitou, quando ela digitou uma; senão a própria chave do índice, que
      // no casamento literal é exata.
      const target = (expand ? q : action).toLowerCase()
      const roles: ScopeRoleRef[] = []
      const negam: ScopeRoleRef[] = []
      for (const i of azureIndex.index[action]) {
        const slug = azureIndex.slugs[i]
        const meta = slug ? azureBySlug.get(slug) : undefined
        if (!slug || !meta) continue
        const ref = { name: meta.name, slug, isPrivileged: meta.isPrivileged }
        const neg = azureNegByRole.get(i)
        if (neg && neg.some((pat) => pat.toLowerCase() === target || wildcardMatches(pat, target))) negam.push(ref)
        else roles.push(ref)
      }
      // Zero concessões E zero exclusões é ruído. Zero concessões com exclusão
      // é resultado — e dos bons: "nenhuma role concede, e estas aqui proíbem".
      if (roles.length === 0 && negam.length === 0) continue
      out.push({ cloud: 'azureRbac', permission: action, roles, viaWildcard, deniedBy: negam })
    }
    const rank = (m: ScopeMatch) => {
      if (m.viaWildcard) return 3
      const s = m.permission.toLowerCase()
      return s === q ? 0 : s.startsWith(q) ? 1 : 2
    }
    out.sort((a, b) =>
      rank(a) - rank(b) ||
      b.roles.length - a.roles.length ||
      a.permission.localeCompare(b.permission))
    return out
  }, [query, azureIndex, azureBySlug, includeWildcard, azureNegByRole])

  // gcpReady entra nas dependências de propósito: quando o índice do GCP
  // termina de carregar, a busca precisa ser refeita para incluí-lo.
  const localMatches = useMemo(
    () => searchLocalPermissions(query, PER_CLOUD_LIMIT, includeWildcard),
    [query, gcpReady, includeWildcard])
  const localCounts  = useMemo(
    () => countLocalMatches(query, includeWildcard), [query, gcpReady, includeWildcard])

  // O índice das 6 clouds é construído na primeira vez que é tocado. Calcular o
  // total já na renderização inicial atrasaria o primeiro paint à toa, então
  // isso acontece logo depois da montagem.
  const [indexedTotal, setIndexedTotal] = useState<number | null>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      const stats = getLocalIndexStats()
      setIndexedTotal(Object.values(stats).reduce((a, b) => a + b, 0))
    }, 0)
    return () => clearTimeout(id)
  }, [])

  // Totais reais (antes do limite de exibição), por cloud.
  const totals = useMemo(() => {
    const t: Record<string, number> = { ...localCounts }
    if (azureMatches.length) t.azureRbac = azureMatches.length
    return t
  }, [localCounts, azureMatches])

  const grouped = useMemo(() => {
    const all = [...localMatches, ...azureMatches.slice(0, PER_CLOUD_LIMIT)]
    const g = new Map<CloudId, ScopeMatch[]>()
    for (const m of all) {
      if (!activeClouds.has(m.cloud)) continue
      const arr = g.get(m.cloud)
      if (arr) arr.push(m); else g.set(m.cloud, [m])
    }
    return g
  }, [localMatches, azureMatches, activeClouds])

  // Carrega o universo de actions só quando ele pode mudar a resposta: busca
  // que parece uma action da AWS e que não achou nada. Não é um índice barato,
  // e no caminho normal — busca com resultado — ele nunca é baixado.
  useEffect(() => {
    if (universoPronto || azureLoading) return
    if (grouped.size > 0) return
    if (!looksLikeAwsAction(query)) return
    let vivo = true
    loadAwsUniverse().finally(() => { if (vivo) setUniversoPronto(true) })
    return () => { vivo = false }
  }, [query, grouped, azureLoading, universoPronto])

  // Expandir tudo precisa conhecer o que está na tela agora.
  const expandAll = () => {
    setExpandedClouds(new Set(grouped.keys()))
    setExpandedPerms(new Set(
      [...grouped.entries()].flatMap(([cloud, ms]) => ms.map((m) => `${cloud}|${m.permission}`)),
    ))
  }

  // Uma busca nova começa toda RECOLHIDA — ver o bloco de estado lá em cima.
  useEffect(() => {
    setExpandedClouds(new Set())
    setExpandedPerms(new Set())
  }, [query])

  const totalRolesFound = useMemo(() => {
    let n = 0
    for (const list of grouped.values()) for (const m of list) n += m.roles.length
    return n
  }, [grouped])

  const totalPermsFound = useMemo(() => {
    let n = 0
    for (const [cloud, count] of Object.entries(totals)) {
      if (activeClouds.has(cloud as CloudId)) n += count
    }
    return n
  }, [totals, activeClouds])

  /**
   * Clicar num chip de cloud passa a FILTRAR só aquela cloud.
   *
   * Antes o clique REMOVIA a cloud clicada, porque o estado começa com todas
   * ligadas. Isso lê ao contrário: quem clica em "AWS" numa lista de seis
   * clouds quer ver a AWS, não escondê-la — e o que acontecia era sumir com
   * exatamente a cloud que a pessoa apontou.
   *
   * Clicar de novo no chip já isolado volta para todas: sem essa saída, tirar
   * o filtro exigiria clicar nos outros cinco.
   */
  const selectCloud = (c: CloudId) => {
    setActiveClouds((prev) => (prev.size === 1 && prev.has(c) ? new Set(CLOUD_ORDER) : new Set([c])))
  }

  const exportRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    for (const cloud of CLOUD_ORDER) {
      for (const m of grouped.get(cloud) ?? []) {
        for (const r of m.roles) {
          rows.push({
            cloud: CLOUD_META[cloud].label,
            permission: m.permission,
            // A origem vai junto no export: fora da tela, `*` ao lado de
            // AdministratorAccess não se explica sozinho.
            grantedVia: m.viaWildcard ? 'wildcard' : 'exact',
            role: r.name,
            isPrivileged: r.isPrivileged,
            url: getCloudUrl(cloud, r.slug),
          })
        }
      }
    }
    return rows
  }, [grouped])

  const hasQuery = query.trim().length > 0

  return (
    <AppShell
      headerTitle="Permission Scope"
      headerSub={t('perm.scopeLead')}
      headerActions={
        exportRows.length > 0
          ? <ExportButton filename="permission-scope" title="Permission Scope" data={exportRows} />
          : undefined
      }
      pageHasOwnHeading
      beta
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-6">

          {/* Busca */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ScanSearch size={18} className="text-brand-onDark" />
              <h1 className="text-sub font-semibold text-gray-800 dark:text-gray-100">
                Busca reversa de permissão
              </h1>
            </div>
            <p className="text-body text-fg-muted leading-relaxed mb-4">
              Cole uma permissão de qualquer plataforma e veja todas as roles e policies que a
              concedem. Aceita busca parcial — <code className="font-mono text-tiny">listKeys</code> encontra
              tanto <code className="font-mono text-tiny">Microsoft.Storage/storageAccounts/listKeys/action</code> quanto
              equivalentes em outras clouds.
            </p>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="ex.: listKeys · s3:GetObject · compute.instances.delete · microsoft.directory/users/create"
                aria-label={t('aria.searchPermAllClouds')}
                className="w-full text-body pl-9 pr-9 py-2.5 rounded-lg border border-surface-border dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label={t('action.clearSearch')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filtro por cloud */}
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              {CLOUD_ORDER.map((c) => {
                const active = activeClouds.has(c)
                const meta = CLOUD_META[c]
                const n = totals[c] ?? 0
                return (
                  <button
                    key={c}
                    onClick={() => selectCloud(c)}
                    aria-pressed={active}
                    title={activeClouds.size === 1 && active ? t('perm.cloudShowAll') : t('perm.cloudOnlyThis')}
                    className={`text-3xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                      active ? 'text-white border-transparent' : 'text-fg-subtle border-gray-300 dark:border-gray-700 hover:border-gray-500'
                    }`}
                    style={active ? { background: meta.color, borderColor: meta.color } : {}}
                  >
                    {meta.shortLabel}
                    {hasQuery && <span className="ml-1 opacity-80">{n}</span>}
                  </button>
                )
              })}
            </div>

            {/* Concessões por wildcard */}
            <div className="flex items-center gap-2 flex-wrap mt-2.5">
              <button
                onClick={() => setIncludeWildcard((v) => !v)}
                aria-pressed={includeWildcard}
                className={`inline-flex items-center gap-1.5 text-3xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                  includeWildcard
                    ? 'border-accent text-accent'
                    : 'border-gray-300 dark:border-gray-700 text-fg-subtle hover:border-gray-500'
                }`}
              >
                <Asterisk size={11} /> {t('perm.wildcardToggle')}
              </button>
              <span className="text-3xs text-fg-muted">{t('perm.wildcardHint')}</span>
            </div>

            <div className="mt-3">
              <BetaNotice items={['beta.scopeOne', 'beta.scopeTwo', 'beta.scopeThree', 'beta.scopeFour']} />
            </div>

            {/* Estado */}
            <div className="mt-3 text-tiny">
              {!hasQuery && (
                <span className="text-fg-muted">
                  {indexedTotal !== null
                    ? `${fmt(indexedTotal)} ${t('perm.indexedIn')}`
                    : t('state.indexingPerms')} · {t('perm.azureOnDemand')}
                </span>
              )}
              {hasQuery && azureLoading && (
                <span className="text-fg-muted">{t('state.loadingAzureIndex')}</span>
              )}
              {hasQuery && azureError && (
                <span className="text-red-500">
                  {t('perm.azureIndexFailed')}
                </span>
              )}
              {hasQuery && indicesAusentes.length > 0 && (
                <div className="mt-1 text-red-500">
                  {t('perm.indexesFailed')} <strong>{nomesAusentes}</strong>
                </div>
              )}
              {hasQuery && !azureLoading && !azureError && (
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>{fmt(totalPermsFound)}</strong> {t('perm.matchedPerms')} ·{' '}
                  <strong>{fmt(totalRolesFound)}</strong> {t('perm.roleGrants')}
                </span>
              )}
            </div>
          </section>

          {/* Resultados */}
          {hasQuery && grouped.size === 0 && !azureLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-body">{t('perm.noneFoundFor')} “{query}”.</p>
              {universoPronto && isKnownAwsAction(query.trim()) ? (
                <p className="text-tiny mt-2 max-w-lg text-center text-fg">{t('perm.notGrantedByManaged')}</p>
              ) : indicesAusentes.length > 0 ? (
                // "tente um termo mais curto" é conselho ERRADO quando o índice
                // é que não veio: encurtar não traz o que não foi carregado.
                <p className="text-tiny mt-2 max-w-lg text-center text-red-500">
                  {t('perm.indexesFailed')} <strong>{nomesAusentes}</strong>
                </p>
              ) : (
                <p className="text-tiny mt-1">{t('perm.scopeTryShorter')}</p>
              )}
            </div>
          )}

          {/* Controles de recolher/expandir — só aparecem quando há resultado */}
          {grouped.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={expandAll}
                className="inline-flex items-center gap-1.5 text-3xs px-2.5 py-1 rounded-md border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronsDown size={12} /> Expandir tudo
              </button>
              <button
                onClick={collapseAll}
                className="inline-flex items-center gap-1.5 text-3xs px-2.5 py-1 rounded-md border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronsUp size={12} /> Recolher tudo
              </button>
            </div>
          )}

          {CLOUD_ORDER.filter((c) => grouped.has(c)).map((cloud) => {
            const matches = grouped.get(cloud)!
            const meta = CLOUD_META[cloud]
            const terms = CLOUD_TERMS[cloud]
            const total = totals[cloud] ?? matches.length
            const cloudOpen = expandedClouds.has(cloud)
            return (
              <section key={cloud} className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl overflow-hidden">
                {/* Cabeçalho da cloud — recolhe a seção inteira */}
                <button
                  onClick={() => toggleCloudOpen(cloud)}
                  aria-expanded={cloudOpen}
                  className="w-full px-4 py-2.5 flex items-center gap-2 border-b border-surface-border dark:border-gray-800 text-left hover:brightness-95 transition-all"
                  style={{ background: meta.color + '14' }}
                >
                  {cloudOpen
                    ? <ChevronDown size={14} className="shrink-0" />
                    : <ChevronRight size={14} className="shrink-0" />}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                  <h2 className="text-body font-semibold">{meta.label}</h2>
                  <span className="text-3xs text-fg-muted">
                    {fmt(total)} {terms.permission.toLowerCase()}(s)
                    {total > matches.length && ` · ${t('perm.showing')} ${matches.length}`}
                  </span>
                </button>

                {cloudOpen && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {matches.map((m) => {
                      const key = `${cloud}|${m.permission}`
                      const open = expandedPerms.has(key)
                      return (
                        <div key={m.permission}>
                          {/* Linha da permissão — recolhe a tabela de roles */}
                          <button
                            onClick={() => togglePerm(key)}
                            aria-expanded={open}
                            className="w-full px-4 py-2.5 flex items-start gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            {open
                              ? <ChevronDown size={13} className="text-fg-subtle shrink-0 mt-0.5" />
                              : <ChevronRight size={13} className="text-fg-subtle shrink-0 mt-0.5" />}
                            {/*
                              A permissão em acento, o nome da role em texto
                              normal. São as duas colunas de informação da
                              tela, e no mesmo tom a linha inteira se lia como
                              um bloco só. `text-accent` é o azul único da
                              interface, verificado nos dois temas (5,4:1 no
                              claro, 8,4:1 no escuro).
                            */}
                            <code className="flex-1 text-tiny font-mono break-all text-accent">
                              {m.permission}
                            </code>
                            {m.viaWildcard && (
                              <span className="inline-flex items-center gap-1 text-micro font-semibold uppercase tracking-wider text-fg-muted bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 mt-0.5">
                                <Asterisk size={9} /> {t('perm.viaWildcard')}
                              </span>
                            )}
                            <span className="text-2xs text-fg-muted whitespace-nowrap shrink-0 mt-0.5">
                              {m.roles.length} {terms.principal}
                            </span>
                          </button>

                          {/* Roles em tabela */}
                          {open && (
                            <div className="px-4 pb-3">
                              {m.roles.length === 0 ? (
                                <p className="text-2xs text-fg-muted italic">{t('perm.noneGrant')}</p>
                              ) : (
                              <div className="border border-surface-border dark:border-gray-800 rounded-lg overflow-hidden">
                                <table className="w-full text-tiny border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-surface-border dark:border-gray-700">
                                      <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2">
                                        {terms.principal === 'policies' ? 'Policy' : 'Role'}
                                      </th>
                                      <th className="text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-2 w-32">
                                        Privilegiada
                                      </th>
                                      <th className="w-10" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.roles.map((r) => (
                                      <tr key={r.slug}
                                        className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                                        <td className="px-3 py-2">
                                          <Link href={getCloudUrl(cloud, r.slug)}
                                            className="text-tiny font-medium hover:underline"
                                           >
                                            {r.name}
                                          </Link>
                                        </td>
                                        <td className="px-3 py-2">
                                          {r.isPrivileged
                                            ? <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40">
                                                <ShieldAlert size={10} /> Sim
                                              </span>
                                            : <span className="text-3xs text-fg-subtle dark:text-gray-600">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                          <Link href={getCloudUrl(cloud, r.slug)}
                                            aria-label={`Abrir ${r.name}`}
                                            className="text-fg-muted dark:text-gray-600 hover:opacity-80 transition-opacity inline-block">
                                            <ChevronRight size={14} />
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              )}
                              {m.deniedBy && m.deniedBy.length > 0 && (
                                <div className="mt-2 flex items-start gap-1.5 text-2xs text-danger">
                                  <ShieldOff size={12} className="shrink-0 mt-0.5" />
                                  <span>
                                    <span className="font-semibold">{t('perm.deniedBy')}</span>{' '}
                                    {m.deniedBy.map((r, i) => (
                                      <span key={r.slug}>
                                        {i > 0 && ', '}
                                        <Link href={getCloudUrl(cloud, r.slug)} className="hover:underline">{r.name}</Link>
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          <div className="pb-8" />
        </div>
      </div>
    </AppShell>
  )
}

export default function PermissionScopePage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <PermissionScopeContent />
    </Suspense>
  )
}
