'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { GWS_SCOPES, GWS_SCOPE_META, GwsService, GwsScopeSensitivity } from '@/data/googleWorkspace'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useColumnResize } from '@/hooks/useColumnResize'
import StatsBar from '@/components/StatsBar'
import ExportButton from '@/components/ExportButton'

type SortCol = 'name' | 'service' | 'sensitivity'
type SortDir = 'asc' | 'desc'

const ALL_SERVICES: GwsService[] = ['Gmail', 'Drive', 'Calendar', 'Admin SDK', 'Contacts', 'Chat', 'Meet', 'Docs', 'Sheets', 'Slides', 'Cloud Identity', 'Reports', 'Tasks', 'People']
const SENSITIVITIES: GwsScopeSensitivity[] = ['restricted', 'sensitive', 'standard']

const SERVICE_COLORS: Record<GwsService, { bg: string; text: string; border: string }> = {
  Gmail:          { bg: '#3b1a1a', text: '#f87171', border: '#7f1d1d' },
  Drive:          { bg: '#1a2f4a', text: '#60a5fa', border: '#1d4ed8' },
  Calendar:       { bg: '#2a1a00', text: '#fbbf24', border: '#b45309' },
  'Admin SDK':    { bg: '#3b1a1a', text: '#fb923c', border: '#c2410c' },
  Contacts:       { bg: '#0f2a2e', text: '#22d3ee', border: '#0e7490' },
  Chat:           { bg: '#162a22', text: '#34d399', border: '#065f46' },
  Meet:           { bg: '#251a40', text: '#a78bfa', border: '#5b21b6' },
  Docs:           { bg: '#1a2340', text: '#93c5fd', border: '#1e40af' },
  Sheets:         { bg: '#0a2010', text: '#4ade80', border: '#15803d' },
  Slides:         { bg: '#2a1a30', text: '#e879f9', border: '#a21caf' },
  'Cloud Identity': { bg: '#1a1a35', text: '#818cf8', border: '#3730a3' },
  Reports:        { bg: '#1f2937', text: '#9ca3af', border: '#374151' },
  Tasks:          { bg: '#302010', text: '#f97316', border: '#c2410c' },
  People:         { bg: '#1a2a20', text: '#6ee7b7', border: '#047857' },
}

function GwsScopesContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeService, setActiveService] = useState<GwsService | 'all'>('all')
  const [activeSens, setActiveSens]       = useState<GwsScopeSensitivity | 'all'>('all')
  const [sortCol, setSortCol]             = useState<SortCol>('sensitivity')
  const [sortDir, setSortDir]             = useState<SortDir>('asc')

  const { widths, onMouseDown } = useColumnResize([280, 180, 120, 90])

  useEffect(() => {
    const svc  = searchParams.get('service') ?? 'all'
    const sens = searchParams.get('sensitivity') ?? 'all'
    setActiveService(ALL_SERVICES.includes(svc as GwsService) ? (svc as GwsService) : 'all')
    setActiveSens(SENSITIVITIES.includes(sens as GwsScopeSensitivity) ? (sens as GwsScopeSensitivity) : 'all')
  }, [searchParams])

  const filtered = useMemo(() => GWS_SCOPES.filter((s) => {
    const matchSvc  = activeService === 'all' || s.service === activeService
    const matchSens = activeSens    === 'all' || s.sensitivity === activeSens
    return matchSvc && matchSens
  }), [activeService, activeSens])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const SENS_ORDER: Record<GwsScopeSensitivity, number> = { restricted: 0, sensitive: 1, standard: 2 }
    let cmp = 0
    if      (sortCol === 'name')        cmp = a.name.localeCompare(b.name)
    else if (sortCol === 'service')     cmp = a.service.localeCompare(b.service)
    else if (sortCol === 'sensitivity') cmp = (SENS_ORDER[a.sensitivity] ?? 99) - (SENS_ORDER[b.sensitivity] ?? 99)
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortCol, sortDir])

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const pushSvc = (svc: GwsService | 'all') => {
    setActiveService(svc)
    const p = new URLSearchParams(searchParams.toString())
    if (svc === 'all') p.delete('service'); else p.set('service', svc)
    router.replace(`/google-workspace/api-permissions?${p.toString()}`, { scroll: false })
  }

  const pushSens = (sens: GwsScopeSensitivity | 'all') => {
    setActiveSens(sens)
    const p = new URLSearchParams(searchParams.toString())
    if (sens === 'all') p.delete('sensitivity'); else p.set('sensitivity', sens)
    router.replace(`/google-workspace/api-permissions?${p.toString()}`, { scroll: false })
  }

  const { paginated, page, setPage, pageSize, setPageSize } = usePagination(sorted)


  return (
    <AppShell
      headerTitle="Google Workspace — OAuth Scopes"
      headerSub={t('sub.gwsScopes')}
      headerActions={<ExportButton filename="google-workspace-oauth-scopes" data={sorted.map((s) => ({
        name: s.name, scope: s.scope, service: s.service, sensitivity: s.sensitivity, description: s.description,
      }))} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: t('count.total'), value: GWS_SCOPES.length,                                              color: 'green',  href: '/google-workspace/api-permissions' },
          { label: 'Restricted', value: GWS_SCOPES.filter((s) => s.sensitivity === 'restricted').length, color: 'red',    href: '/google-workspace/api-permissions?sensitivity=restricted' },
          { label: 'Sensitive',  value: GWS_SCOPES.filter((s) => s.sensitivity === 'sensitive').length,  color: 'orange', href: '/google-workspace/api-permissions?sensitivity=sensitive' },
          { label: 'Standard',   value: GWS_SCOPES.filter((s) => s.sensitivity === 'standard').length,   color: 'gray',   href: '/google-workspace/api-permissions?sensitivity=standard' },
        ]} />

        <div className="px-4 pt-3 pb-2 border-b border-line bg-surface">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {SENSITIVITIES.map((sens) => {
              const m = GWS_SCOPE_META[sens]
              const active = activeSens === sens
              return (
                <button key={sens} onClick={() => pushSens(active ? 'all' : sens)}
                  className="text-3xs px-2.5 py-1 rounded-full border transition-colors font-medium whitespace-nowrap"
                  style={active
                    ? { backgroundColor: m.textColor + '30', color: m.darkText, borderColor: m.textColor + '80' }
                    : { color: '#6b7280', borderColor: '#374151' }
                  }>{m.label}</button>
              )
            })}
            <span className="text-tiny text-fg-muted ml-auto">{sorted.length}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => pushSvc('all')}
              className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                activeService === 'all' ? 'bg-csp-gws text-white border-csp-gws' : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg-muted'
              }`}>{t('filter.all')}</button>
            {ALL_SERVICES.map((svc) => (
              <button key={svc} onClick={() => pushSvc(activeService === svc ? 'all' : svc)}
                className={`text-3xs px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                  activeService === svc ? 'bg-csp-gws text-white border-csp-gws' : 'text-fg-muted border-line-strong hover:border-gray-500 hover:text-fg-muted'
                }`}>{svc}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="text-tiny border-collapse w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: widths[0] }} />
              <col style={{ width: widths[1] }} />
              <col style={{ width: widths[2] }} />
              <col style={{ width: widths[3] }} />
              <col />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-alt border-b border-line-strong">
                <RszTh col="name"        active={sortCol} dir={sortDir} onSort={toggleSort} idx={0} onMD={onMouseDown}>{t('table.scope')}</RszTh>
                <th className="relative px-4 py-2.5 text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider overflow-hidden select-none">
                  Descrição
                  <div onMouseDown={onMouseDown(1)} onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
                </th>
                <RszTh col="service"     active={sortCol} dir={sortDir} onSort={toggleSort} idx={2} onMD={onMouseDown}>{t('table.service')}</RszTh>
                <RszTh col="sensitivity" active={sortCol} dir={sortDir} onSort={toggleSort} idx={3} onMD={onMouseDown}>Sensibilidade</RszTh>
                <th className="px-4 py-2.5 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((scope) => {
                const sm = GWS_SCOPE_META[scope.sensitivity]
                const sc = SERVICE_COLORS[scope.service]
                return (
                  <tr key={scope.scope} className="border-b border-line hover:bg-surface-alt/60 transition-colors">
                    <td className="px-4 py-2.5 align-middle overflow-hidden">
                      <p className="text-tiny font-medium text-success-fg truncate">{scope.name}</p>
                      <code className="text-2xs font-mono text-fg-muted truncate block">{scope.scope}</code>
                    </td>
                    <td className="px-4 py-2.5 align-middle overflow-hidden">
                      <p className="text-3xs text-fg-subtle leading-snug line-clamp-2">{scope.description}</p>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}>
                        {scope.service}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        style={{ backgroundColor: sm.darkBg, color: sm.darkText, borderColor: sm.textColor + '40' }}>
                        {sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-middle"></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="flex items-center justify-center h-48 text-fg-muted text-note">{t('empty.scopes')}</div>
          )}
        </div>

        <Pagination
          total={sorted.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize} noun="noun.scopes"
        />
      </div>
    </AppShell>
  )
}

export default function GwsScopesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-muted">Carregando...</div>}>
      <GwsScopesContent />
    </Suspense>
  )
}

function RszTh({ col, active, dir, onSort, idx, onMD, children }: {
  col: SortCol; active: SortCol; dir: SortDir; onSort: (c: SortCol) => void
  idx: number; onMD: (i: number) => (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <th className="relative text-left text-2xs font-semibold text-fg-muted uppercase tracking-wider px-4 py-2.5 select-none overflow-hidden">
      <button onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-fg-muted">
        {children}
        {active === col ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronsUpDown size={11} className="opacity-30" />}
      </button>
      <div onMouseDown={onMD(idx)} onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors z-10" />
    </th>
  )
}
