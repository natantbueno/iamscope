'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ShieldAlert, ShieldCheck, Search, AlertCircle } from 'lucide-react'
import { RoleOption, SoDCloudScope, checkConflict, searchRoleOptions, findConflictsForRole } from '@/lib/sod'
import SoDRuleDetailCard from './SoDRuleDetailCard'
import SoDSeverityBadge from './SoDSeverityBadge'
import { useT } from '@/i18n/LanguageProvider'

// Roles Tier 0 / Tier 1 mais críticas de cada cloud — usadas na mini-matriz visual.
const MATRIX_ENTRA_ROLES = ['Global Administrator', 'Privileged Role Administrator', 'Security Administrator', 'User Administrator']
const MATRIX_AZURE_ROLES = ['Owner', 'User Access Administrator', 'Contributor', 'Key Vault Administrator']

interface MatrixRoleRef { name: string; cloud: 'entra-id' | 'azure-rbac' }
const MATRIX_ROLES: MatrixRoleRef[] = [
  ...MATRIX_ENTRA_ROLES.map((name) => ({ name, cloud: 'entra-id' as const })),
  ...MATRIX_AZURE_ROLES.map((name) => ({ name, cloud: 'azure-rbac' as const })),
]

export default function SoDMatrix() {
  const t = useT()
  const [cloudScope, setCloudScope] = useState<SoDCloudScope>('both')
  const [roleAQuery, setRoleAQuery] = useState('')
  const [roleBQuery, setRoleBQuery] = useState('')
  const [roleA, setRoleA] = useState<RoleOption | null>(null)
  const [roleB, setRoleB] = useState<RoleOption | null>(null)
  const [checked, setChecked] = useState(false)
  const [hoverCell, setHoverCell] = useState<string | null>(null)

  const sameRole = !!roleA && !!roleB && roleA.slug === roleB.slug && roleA.cloud === roleB.cloud

  const result = useMemo(() => {
    if (!roleA || !roleB || sameRole) return null
    return checkConflict(roleA.name, roleA.cloud, roleB.name, roleB.cloud) ?? null
  }, [roleA, roleB, sameRole])

  const otherConflicts = useMemo(() => {
    if (!roleA) return []
    return findConflictsForRole(roleA.name, roleA.cloud).filter((r) => r.id !== result?.id)
  }, [roleA, result])

  const verify = () => setChecked(true)

  return (
    <div className="p-6 space-y-8 overflow-y-auto flex-1">
      {/* Seletor de cloud */}
      <div className="flex items-center gap-2">
        <span className="text-3xs text-fg-muted w-20 shrink-0">Cloud</span>
        {(['both', 'entra-id', 'azure-rbac'] as SoDCloudScope[]).map((c) => (
          <button key={c} onClick={() => { setCloudScope(c); setRoleA(null); setRoleB(null); setChecked(false) }}
            className={`text-3xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
              cloudScope === c ? 'bg-brand-soft dark:bg-brand-activeBg text-brand-strong dark:text-brand-onDark border-brand-mid dark:border-brand-activeRing'
                                : 'text-fg-muted border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {c === 'both' ? 'Ambos' : c === 'entra-id' ? 'Entra ID' : 'Azure RBAC'}
          </button>
        ))}
      </div>

      {/* Seletores de role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RoleCombobox label="Role A" cloudScope={cloudScope} query={roleAQuery} onQueryChange={setRoleAQuery}
          selected={roleA} onSelect={(r) => { setRoleA(r); setChecked(false) }} />
        <RoleCombobox label="Role B" cloudScope={cloudScope} query={roleBQuery} onQueryChange={setRoleBQuery}
          selected={roleB} onSelect={(r) => { setRoleB(r); setChecked(false) }} />
      </div>

      <button onClick={verify} disabled={!roleA || !roleB}
        className="px-4 py-2 rounded-lg bg-brand hover:bg-[#006cbe] disabled:opacity-40 disabled:cursor-not-allowed text-white text-body font-medium transition-colors">
        Verificar Conflito
      </button>

      {/* Resultado */}
      {checked && roleA && roleB && sameRole && (
        <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 bg-amber-50/40 dark:bg-amber-950/20 flex items-center gap-2">
          <AlertCircle size={15} className="text-amber-500 shrink-0" />
          <span className="text-tiny text-amber-700 dark:text-amber-400">{t('sod.pickDifferent')}</span>
        </div>
      )}
      {checked && roleA && roleB && !sameRole && (
        result ? (
          <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-5 bg-red-50/40 dark:bg-red-950/20">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={16} className="text-red-500" />
              <span className="text-body font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Conflito Detectado</span>
              <SoDSeverityBadge severity={result.severity} />
            </div>
            <SoDRuleDetailCard rule={result} compact />
            <Link href={`/sod/rules/${result.id}`} className="inline-block mt-4 text-tiny text-brand-strong dark:text-brand-onDark hover:underline">
              Ver página completa da regra →
            </Link>
          </div>
        ) : (
          <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-5 bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span className="text-body font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t('sod.noConflictCaps')}</span>
            </div>
            <p className="text-tiny text-fg-muted">
              Não encontrado na base de regras. Isso não garante ausência de risco — verifique as permissões individuais manualmente.
            </p>
          </div>
        )
      )}

      {/* Outros conflitos conhecidos com Role A */}
      {checked && roleA && !sameRole && otherConflicts.length > 0 && (
        <div>
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
            Outros conflitos conhecidos com {roleA.name}
          </p>
          <div className="space-y-1.5">
            {otherConflicts.map((r) => {
              const other = r.roleA.name.toLowerCase() === roleA.name.toLowerCase() && r.roleA.cloud === roleA.cloud ? r.roleB : r.roleA
              return (
                <Link key={r.id} href={`/sod/rules/${r.id}`}
                  className="flex items-center gap-2 text-tiny px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <ShieldAlert size={12} className="text-red-400 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">+ {other.name}</span>
                  <span className="ml-auto shrink-0"><SoDSeverityBadge severity={r.severity} /></span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Mini-matriz visual */}
      <div>
        <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
          Mini-matriz — roles Tier 0 / Tier 1 mais críticas
        </p>
        <div className="overflow-x-auto">
          <table className="border-collapse text-3xs">
            <thead>
              <tr>
                <th className="p-1"></th>
                {MATRIX_ROLES.map((r) => (
                  <th key={r.name} className="p-1 align-bottom">
                    <div className="text-fg-muted font-medium whitespace-nowrap [writing-mode:vertical-rl] rotate-180 h-24 flex items-end justify-center">
                      {r.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROLES.map((rowRole) => (
                <tr key={rowRole.name}>
                  <td className="p-1 text-right text-fg-muted font-medium whitespace-nowrap pr-2">{rowRole.name}</td>
                  {MATRIX_ROLES.map((colRole) => {
                    const cellId = `${rowRole.name}|${colRole.name}`
                    if (rowRole.name === colRole.name) {
                      return <td key={cellId} className="p-0"><div className="w-8 h-8 bg-gray-100 dark:bg-gray-800" /></td>
                    }
                    const rule = checkConflict(rowRole.name, rowRole.cloud, colRole.name, colRole.cloud)
                    const bg = rule ? '#ef444440' : '#22c55e30'
                    return (
                      <td key={cellId} className="p-0">
                        <Link
                          href={rule ? `/sod/rules/${rule.id}` : '#'}
                          onClick={(e) => { if (!rule) e.preventDefault() }}
                          onMouseEnter={() => setHoverCell(rule ? rule.name : null)}
                          onMouseLeave={() => setHoverCell(null)}
                          title={rule ? rule.name : t('sod.noConflictCaps')}
                          className="w-8 h-8 flex items-center justify-center transition-transform hover:scale-110"
                          style={{ background: bg, cursor: rule ? 'pointer' : 'default' }}
                        >
                          {rule && <ShieldAlert size={11} className="text-red-500" />}
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

function RoleCombobox({ label, cloudScope, query, onQueryChange, selected, onSelect }: {
  label: string; cloudScope: SoDCloudScope; query: string; onQueryChange: (v: string) => void
  selected: RoleOption | null; onSelect: (r: RoleOption) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const results = useMemo(() => searchRoleOptions(query, cloudScope, 30), [query, cloudScope])

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
              <span className="text-micro text-fg-subtle shrink-0">{r.cloud === 'entra-id' ? 'Entra ID' : 'Azure RBAC'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
