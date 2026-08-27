'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ShieldAlert, ShieldCheck, Search, AlertCircle } from 'lucide-react'
import { RoleOption, SoDPlatformScope, checkConflict, searchRoleOptions, findConflictsForRole } from '@/lib/sod'
import {
  SoDPlatform, SoDProvider, SOD_PLATFORM_META, SOD_PROVIDER_META, SOD_PROVIDERS, platformProvider,
} from '@/data/sod/rules'
import SoDRuleDetailCard from './SoDRuleDetailCard'
import SoDSeverityBadge from './SoDSeverityBadge'
import SoDCloudBadge from './SoDCloudBadge'
import { useT } from '@/i18n/LanguageProvider'

/**
 * Mini-matriz: as roles mais críticas de cada provedor.
 *
 * É uma AMOSTRA curada, não o catálogo. Uma matriz de verdade com 4.596
 * roles teria 21 milhões de células — e mesmo por provedor seria ilegível.
 * O que ela faz é mostrar, de relance, que a ferramenta tem conteúdo e onde
 * estão os conflitos mais densos; a resposta precisa vem dos seletores acima.
 *
 * As roles abaixo são referenciadas por NOME porque é assim que checkConflict
 * casa. Um rename no dataset de origem quebra a célula em silêncio — por isso
 * scripts/check-sod-matrix.js confere que todas resolvem.
 */
const MATRIX_BY_PROVIDER: Record<SoDProvider, { name: string; cloud: SoDPlatform }[]> = {
  microsoft: [
    { name: 'Global Administrator', cloud: 'entra-id' },
    { name: 'Privileged Role Administrator', cloud: 'entra-id' },
    { name: 'Security Administrator', cloud: 'entra-id' },
    { name: 'User Administrator', cloud: 'entra-id' },
    { name: 'Owner', cloud: 'azure-rbac' },
    { name: 'User Access Administrator', cloud: 'azure-rbac' },
    { name: 'Contributor', cloud: 'azure-rbac' },
    { name: 'Key Vault Administrator', cloud: 'azure-rbac' },
  ],
  aws: [
    { name: 'AdministratorAccess', cloud: 'aws' },
    { name: 'IAMFullAccess', cloud: 'aws' },
    { name: 'PowerUserAccess', cloud: 'aws' },
    { name: 'AWSOrganizationsFullAccess', cloud: 'aws' },
    { name: 'AWSCloudTrail_FullAccess', cloud: 'aws' },
    { name: 'SecurityAudit', cloud: 'aws' },
    { name: 'AmazonS3FullAccess', cloud: 'aws' },
    { name: 'Billing', cloud: 'aws' },
  ],
  google: [
    { name: 'Owner', cloud: 'gcp' },
    { name: 'Security Admin', cloud: 'gcp' },
    { name: 'Service Account Admin', cloud: 'gcp' },
    { name: 'Service Account Key Admin', cloud: 'gcp' },
    { name: 'Logging Admin', cloud: 'gcp' },
    { name: 'Organization Administrator', cloud: 'gcp' },
    { name: 'Super Admin', cloud: 'google-workspace' },
    { name: 'User Management Admin', cloud: 'google-workspace' },
  ],
}

export default function SoDMatrix() {
  const t = useT()
  const [scope, setScope] = useState<SoDPlatformScope>('all')
  const [matrixProvider, setMatrixProvider] = useState<SoDProvider>('microsoft')
  const [roleAQuery, setRoleAQuery] = useState('')
  const [roleBQuery, setRoleBQuery] = useState('')
  const [roleA, setRoleA] = useState<RoleOption | null>(null)
  const [roleB, setRoleB] = useState<RoleOption | null>(null)
  const [checked, setChecked] = useState(false)
  const [hoverCell, setHoverCell] = useState<string | null>(null)

  const sameRole = !!roleA && !!roleB && roleA.slug === roleB.slug && roleA.cloud === roleB.cloud

  /* Provedores diferentes não têm regra por decisão de modelagem, não por
     lacuna. O resultado precisa dizer isso — senão "sem conflito" é lido como
     "checado e limpo". */
  const crossProvider = !!roleA && !!roleB && platformProvider(roleA.cloud) !== platformProvider(roleB.cloud)

  const result = useMemo(() => {
    if (!roleA || !roleB || sameRole || crossProvider) return null
    return checkConflict(roleA.name, roleA.cloud, roleB.name, roleB.cloud) ?? null
  }, [roleA, roleB, sameRole, crossProvider])

  const otherConflicts = useMemo(() => {
    if (!roleA) return []
    return findConflictsForRole(roleA.name, roleA.cloud).filter((r) => r.id !== result?.id)
  }, [roleA, result])

  const resetSelection = () => { setRoleA(null); setRoleB(null); setChecked(false) }
  const matrixRoles = MATRIX_BY_PROVIDER[matrixProvider]

  const SCOPES: { value: SoDPlatformScope; label: string }[] = [
    { value: 'all', label: t('filter.all') },
    ...SOD_PROVIDERS.map((p) => ({ value: p as SoDPlatformScope, label: SOD_PROVIDER_META[p].label })),
  ]

  return (
    <div className="p-4 sm:p-6 space-y-8 overflow-y-auto flex-1">
      {/* Escopo da busca */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-3xs text-fg-muted w-20 shrink-0">{t('sod.provider')}</span>
        {SCOPES.map((s) => (
          <Chip key={s.value} active={scope === s.value} onClick={() => { setScope(s.value); resetSelection() }}>
            {s.label}
          </Chip>
        ))}
      </div>

      {/* Seletores de role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RoleCombobox label="Role A" scope={scope} query={roleAQuery} onQueryChange={setRoleAQuery}
          selected={roleA} onSelect={(r) => { setRoleA(r); setChecked(false) }} />
        <RoleCombobox label="Role B" scope={scope} query={roleBQuery} onQueryChange={setRoleBQuery}
          selected={roleB} onSelect={(r) => { setRoleB(r); setChecked(false) }} />
      </div>

      <button onClick={() => setChecked(true)} disabled={!roleA || !roleB}
        className="px-4 py-2 rounded-lg bg-brand hover:bg-[#006cbe] disabled:opacity-40 disabled:cursor-not-allowed text-white text-body font-medium transition-colors">
        {t('sod.checkConflict')}
      </button>

      {/* Resultado */}
      {checked && roleA && roleB && sameRole && (
        <Callout tone="warn" icon={<AlertCircle size={15} />}>{t('sod.pickDifferent')}</Callout>
      )}
      {checked && roleA && roleB && !sameRole && crossProvider && (
        <Callout tone="warn" icon={<AlertCircle size={15} />}>
          <span className="font-semibold">
            {SOD_PROVIDER_META[platformProvider(roleA.cloud)].label} × {SOD_PROVIDER_META[platformProvider(roleB.cloud)].label}.
          </span>{' '}
          {t('sod.crossProviderBody')}
        </Callout>
      )}
      {checked && roleA && roleB && !sameRole && !crossProvider && (
        result ? (
          <div className="border border-danger/30 rounded-xl p-5 bg-danger/10">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={16} className="text-danger" />
              <span className="text-body font-bold uppercase tracking-wider text-danger">{t('sod.conflictFound')}</span>
              <SoDSeverityBadge severity={result.severity} />
            </div>
            <SoDRuleDetailCard rule={result} compact />
            <Link href={`/sod/rules/${result.id}`} className="inline-block mt-4 text-tiny text-brand-strong dark:text-brand-onDark hover:underline">
              {t('sod.seeFullRule')} →
            </Link>
          </div>
        ) : (
          <div className="border border-success/30 rounded-xl p-5 bg-success/10">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-fg-subtle" />
              {/* success.DEFAULT (#1a7f4b) only clears ~3.5:1 on the dark surface —
                  below the 4.5:1 body-text minimum. text-emerald-600/400 is the
                  verified pair already used elsewhere for this exact state. */}
              <span className="text-body font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t('sod.noConflictCaps')}</span>
            </div>
            <p className="text-tiny text-fg-muted">{t('sod.noConflictBody')}</p>
          </div>
        )
      )}

      {/* Outros conflitos conhecidos com Role A */}
      {checked && roleA && !sameRole && otherConflicts.length > 0 && (
        <div>
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
            {t('sod.otherConflictsWith')} {roleA.name}
          </p>
          <div className="space-y-1.5">
            {otherConflicts.map((r) => {
              const other = r.roleA.name.toLowerCase() === roleA.name.toLowerCase() && r.roleA.cloud === roleA.cloud ? r.roleB : r.roleA
              return (
                <Link key={r.id} href={`/sod/rules/${r.id}`}
                  className="flex items-center gap-2 text-tiny px-3 py-1.5 rounded-lg border border-line hover:bg-surface-alt transition-colors">
                  <ShieldAlert size={12} className="text-danger shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">+ {other.name}</span>
                  {other.cloud !== roleA.cloud && <SoDCloudBadge cloud={other.cloud} />}
                  <span className="ml-auto shrink-0"><SoDSeverityBadge severity={r.severity} /></span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Mini-matriz visual */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider">{t('sod.miniMatrix')}</p>
          <span className="text-3xs text-fg-subtle">·</span>
          {SOD_PROVIDERS.map((p) => (
            <Chip key={p} active={matrixProvider === p} onClick={() => setMatrixProvider(p)}>
              {SOD_PROVIDER_META[p].label}
            </Chip>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-3xs">
            <thead>
              <tr>
                <th className="p-1"></th>
                {matrixRoles.map((r) => (
                  <th key={`${r.cloud}-${r.name}`} className="p-1 align-bottom">
                    {/* h-40, não h-24 como na versão só-Microsoft: "Organization
                        Administrator" e "User Management Admin" são bem mais longos
                        que "Global Administrator" e ficavam cortados no meio. */}
                    <div className="text-fg-muted font-medium whitespace-nowrap [writing-mode:vertical-rl] rotate-180 h-40 flex items-end justify-center">
                      {r.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRoles.map((rowRole) => (
                <tr key={`${rowRole.cloud}-${rowRole.name}`}>
                  <td className="p-1 text-right text-fg-muted font-medium whitespace-nowrap pr-2">
                    {rowRole.name}
                    <span className="ml-1 text-micro text-fg-subtle">{SOD_PLATFORM_META[rowRole.cloud].label}</span>
                  </td>
                  {matrixRoles.map((colRole) => {
                    const cellId = `${rowRole.cloud}:${rowRole.name}|${colRole.cloud}:${colRole.name}`
                    if (rowRole.name === colRole.name && rowRole.cloud === colRole.cloud) {
                      return <td key={cellId} className="p-0"><div className="w-8 h-8 bg-surface-alt" /></td>
                    }
                    const rule = checkConflict(rowRole.name, rowRole.cloud, colRole.name, colRole.cloud)
                    return (
                      <td key={cellId} className="p-0">
                        {/* Only the real signal (a conflict) gets color; the majority
                            "no conflict" cells stay neutral so the eye lands on what
                            matters instead of reading a checkerboard of red/green. */}
                        <Link
                          href={rule ? `/sod/rules/${rule.id}` : '#'}
                          onClick={(e) => { if (!rule) e.preventDefault() }}
                          onMouseEnter={() => setHoverCell(rule ? rule.name : null)}
                          onMouseLeave={() => setHoverCell(null)}
                          title={rule ? rule.name : t('sod.noConflictCaps')}
                          className={`w-8 h-8 flex items-center justify-center transition-transform hover:scale-110 ${
                            rule ? 'bg-danger/25 cursor-pointer' : 'bg-surface-alt cursor-default'
                          }`}
                        >
                          {rule && <ShieldAlert size={11} className="text-danger" />}
                        </Link>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hoverCell && <p className="text-3xs text-fg-subtle mt-2">{hoverCell}</p>}
      </div>
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

function Callout({ tone, icon, children }: { tone: 'warn'; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 bg-amber-50/40 dark:bg-amber-950/20 flex items-start gap-2">
      <span className="text-amber-500 shrink-0 mt-0.5">{icon}</span>
      <span className="text-tiny text-amber-700 dark:text-amber-400 leading-relaxed">{children}</span>
    </div>
  )
}

function RoleCombobox({ label, scope, query, onQueryChange, selected, onSelect }: {
  label: string; scope: SoDPlatformScope; query: string; onQueryChange: (v: string) => void
  selected: RoleOption | null; onSelect: (r: RoleOption) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const results = useMemo(() => searchRoleOptions(query, scope, 30), [query, scope])

  return (
    <div className="relative">
      <label className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <input
          type="text"
          value={selected ? selected.name : query}
          onChange={(e) => { onQueryChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('ph.searchRole')}
          className="w-full text-body pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          {results.map((r) => (
            <button key={`${r.cloud}-${r.slug}`}
              onMouseDown={() => { onSelect(r); onQueryChange(''); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-tiny text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2">
              <span className="truncate">{r.name}</span>
              <span className="text-micro text-fg-subtle shrink-0">{SOD_PLATFORM_META[r.cloud].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
