'use client'

// Detalhe de uma permissão do Azure RBAC — mesmo layout da página de role:
// cabeçalho com o identificador, cards de fato, descrição oficial e a tabela
// de quem concede. Aqui a relação é invertida: em vez de listar as permissões
// de uma role, lista as roles que concedem esta permissão.

import { useEffect, useMemo, useState } from 'react'
import { KPI_TONE_VALUE } from '@/lib/kpiTone'
import ClassificationBadge from '@/components/ClassificationBadge'
import { useT } from '@/i18n/LanguageProvider'
import Link from 'next/link'
import { BackToList, formatarData } from './RoleDetailHeader'
import { getPlatformSync } from '@/data/syncMeta'
import { Copy, CheckCheck, ExternalLink, ShieldAlert, Hash, Tag, Layers, Asterisk,
  CalendarCheck } from 'lucide-react'

import AppShell from '@/components/AppShell'
import PermissionsTable from '@/components/PermissionsTable'
// TIER_META vem de '@/data/tierMeta', não do módulo de dados. Os dois exportam
// o mesmo objeto, mas importar pelo módulo de dados arrasta o dataset inteiro
// para o bundle desta rota — que é justamente o que tierMeta.ts foi criado
// para evitar. Ver o cabeçalho de src/data/tierMeta.ts.
import { AZURE_TIER_META } from '@/data/tierMeta'
import {
  AzurePermIndexFile, AzurePermissionEntry,
  buildAzurePermissionCatalog, getAzurePermissionBySlug,
} from '@/lib/azurePermissions'
import { Rich } from '@/i18n/Rich'
import { useNumberFormat } from '@/i18n/useNumberFormat'

export default function AzurePermissionClient({ slug }: { slug: string }) {
  const t = useT()
  // As permissions do Azure vêm de dois datasets (roles e actions); o
  // getPlatformSync devolve a verificação mais antiga entre eles.
  const sync = getPlatformSync('Azure RBAC')
  const [entry, setEntry] = useState<AzurePermissionEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/azure-perms-index.json').then((r) => { if (!r.ok) throw new Error(); return r.json() }),
      fetch('/azure-action-descriptions.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ])
      .then(([idx, desc]: [AzurePermIndexFile, Record<string, string>]) => {
        buildAzurePermissionCatalog(idx, desc)
        setEntry(getAzurePermissionBySlug(slug))
      })
      .catch(() => setEntry(null))
      .finally(() => setLoading(false))
  }, [slug])

  const tierBreakdown = useMemo(() => {
    if (!entry) return []
    const m = new Map<string, number>()
    for (const r of entry.roles) m.set(r.tier, (m.get(r.tier) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [entry])

  if (loading) {
    return (
      <AppShell headerTitle={t('state.loading')} headerSub={t('perm.azureDetailSub')}>
        <div className="flex-1 flex items-center justify-center text-fg-subtle text-body">{t('state.loading')}</div>
      </AppShell>
    )
  }

  if (!entry) {
    return (
      <AppShell headerTitle={t('perm.notFoundTitle')} headerSub="Azure RBAC">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-fg-subtle mb-4">{t('perm.notFoundTitle')}</p>
            <Link href="/azure-rbac/permissions" className="text-brand-onDark hover:underline text-body">
              ← Voltar para permissões
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const privileged = entry.roles.filter((r) => r.isPrivileged).length
  const copy = () => {
    navigator.clipboard.writeText(entry.action)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell
      headerTitle={entry.action}
      headerSub={`Azure RBAC · ${entry.provider} · concedida por ${entry.roles.length} role(s)`}
      headerBack={<BackToList href="/azure-rbac/permissions" />}
      pageHasOwnHeading
    >
      <div className="flex-1 overflow-y-auto bg-app">
        <div className="max-w-5xl px-6 py-6">

          {/* Título */}
          <div className="mb-5">
            <div className="flex items-start gap-3 flex-wrap mb-2">
              <h1 className="text-heading font-semibold text-fg font-mono break-all">{entry.action}</h1>
              {entry.isWildcard && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mt-1 shrink-0">
                  <Asterisk size={12} /> Wildcard
                </span>
              )}
            </div>
            {entry.isWildcard && (
              <p className="text-tiny text-amber-400/80">
                <Rich text={t('perm.wildcardNote')} />
              </p>
            )}

            {/*
              Frescor do dado. Esta página não usa o RoleDetailHeader — tem
              cabeçalho próprio porque o título é uma action em monoespaçada —
              e por isso ficou de fora quando as outras seis passaram a mostrar
              a verificação. São 2.698 páginas, o maior conjunto do site.
            */}
            {sync && (
              <p className="mt-2 flex items-center gap-1.5 text-3xs text-fg-subtle">
                <CalendarCheck size={11} className="shrink-0" aria-hidden="true" />
                <span>
                  {t('sync.verifiedOn')}{' '}
                  <time dateTime={sync.lastSynced}>{formatarData(sync.lastSynced)}</time>
                  {' · '}
                  <a href={sync.sourceUrl} target="_blank" rel="noopener noreferrer"
                     className="underline decoration-dotted underline-offset-2 hover:text-fg-muted"
                     title={sync.sourceLabel}>
                    {t('sync.source')}
                  </a>
                </span>
              </p>
            )}
          </div>

          {/* Números */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <StatCard label={t('perm.rolesGranting')} value={entry.roles.length} accent={KPI_TONE_VALUE.accent} />
            <StatCard label={t('filter.privileged')} value={privileged} accent={privileged > 0 ? KPI_TONE_VALUE.danger : KPI_TONE_VALUE.neutral} />
            <StatCard label="Risk Tiers" value={tierBreakdown.length} accent={KPI_TONE_VALUE.neutral} />
            <StatCard label={t('perm.segments')} value={entry.action.split('/').length} accent={KPI_TONE_VALUE.neutral} />
          </div>

          {/* Fatos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-6">
            <FactCard icon={<Hash size={14} />} label="Action">
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-3xs text-fg-muted break-all">{entry.action}</code>
                <button onClick={copy} className="text-fg-subtle hover:text-fg shrink-0" title={t('action.copy')} aria-label={t('perm.copyAction')}>
                  {copied ? <CheckCheck size={13} className="text-fg" /> : <Copy size={13} />}
                </button>
              </div>
            </FactCard>
            <FactCard icon={<Tag size={14} />} label="Resource provider">
              <span className="text-tiny font-mono text-fg break-all">{entry.provider}</span>
            </FactCard>
            <FactCard icon={<Layers size={14} />} label={`${t('table.resource')} / ${t('table.verb')}`}>
              <span className="text-tiny font-mono text-fg break-all">
                {entry.resource || '—'} <span className="text-fg-muted">/</span> {entry.verb || '—'}
              </span>
            </FactCard>
          </div>

          {/* Descrição oficial */}
          <section className="bg-surface border border-line rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-note font-semibold text-fg">{t('table.description')}</h2>
              <span className="text-micro font-bold uppercase tracking-wider text-fg-muted bg-surface-alt border border-line-strong px-1.5 py-0.5 rounded">
                Microsoft
              </span>
              <a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions"
                target="_blank" rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-3xs text-brand-onDark hover:underline">
                {t('perm.msReference')} <ExternalLink size={11} />
              </a>
            </div>
            {entry.description ? (
              <p className="text-body text-fg-muted leading-relaxed">{entry.description}</p>
            ) : (
              <p className="text-body text-fg-muted leading-relaxed">
                A descrição oficial desta action ainda não foi coletada. A carga é incremental a partir da
                referência de permissões da Microsoft — enquanto isso, o alcance da permissão pode ser lido
                pelo próprio nome: <code className="font-mono text-tiny text-fg-subtle">{entry.provider}</code>{' '}
                {entry.resource && <>sobre <code className="font-mono text-tiny text-fg-subtle">{entry.resource}</code></>}{' '}
                {entry.verb && <>{t('label.inOperation')} <code className="font-mono text-tiny text-fg-subtle">{entry.verb}</code></>}.
              </p>
            )}
          </section>

          {/* Distribuição por tier */}
          {tierBreakdown.length > 0 && (
            <section className="bg-surface border border-line rounded-lg p-5 mb-6">
              <h2 className="text-note font-semibold text-fg mb-3 flex items-center gap-2">{t('section.riskTierDist')} <ClassificationBadge size="sm" /></h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {tierBreakdown.map(([tier, n]) => {
                  const meta = AZURE_TIER_META[tier as keyof typeof AZURE_TIER_META]
                  return (
                    <span key={tier} className="text-3xs font-semibold px-2.5 py-1 rounded-full border"
                      style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
                      {n} {meta.label}
                    </span>
                  )
                })}
              </div>
              <p className="text-3xs text-fg-muted mt-2">
                Risk Tier é classificação do IAM Scope, derivada das permissões da role — não é publicada pela Microsoft.
              </p>
            </section>
          )}

          {/* Roles que concedem */}
          <section className="bg-surface border border-line rounded-lg p-5 mb-6">
            <h2 className="text-note font-semibold text-fg mb-4">
              {t('perm.rolesGrantingThis')}
              <span className="ml-2 text-tiny font-normal text-fg-muted">({entry.roles.length})</span>
            </h2>
            <PermissionsTable
              rows={entry.roles.map((r) => ({
                permission: r.name,
                tier: AZURE_TIER_META[r.tier]?.label ?? r.tier,
                categoria: r.category,
                privilegiada: r.isPrivileged ? t('label.yes') : t('label.no'),
                totalPermissoes: String(r.permissionCount),
              }))}
              columns={[
                { key: 'permission',      label: 'Role' },
                { key: 'tier',            label: 'Risk Tier', badge: true, width: 'w-40' },
                { key: 'categoria',       label: t('table.category'), width: 'w-32' },
                { key: 'privilegiada',    label: t('label.privilegedAdj'), badge: true, width: 'w-28' },
                { key: 'totalPermissoes', label: t('table.permissions'), width: 'w-24' },
              ]}
              filterKey="tier"
              riskValues={[t('label.yes'), 'Full Control']}
              filename={`azure-permissao-${entry.slug}-roles`}
              noun="noun.roles"
              searchPlaceholder="ph.filterRoles"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.roles.slice(0, 40).map((r) => (
                <Link key={r.slug} href={`/azure-rbac/roles/${r.slug}`}
                  className="inline-flex items-center gap-1 text-3xs px-2 py-0.5 rounded border bg-surface-alt border-line-strong text-fg-muted hover:border-brand-onDark transition-colors">
                  {r.isPrivileged && <ShieldAlert size={10} className="text-danger shrink-0" />}
                  {r.name}
                </Link>
              ))}
              {entry.roles.length > 40 && (
                <span className="text-3xs text-fg-muted self-center">+{entry.roles.length - 40} {t('perm.othersSuffix')}</span>
              )}
            </div>
          </section>

          <div className="pb-8" />
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  const fmt = useNumberFormat()
  return (
    <div className="bg-surface border border-line rounded-lg px-4 py-3">
      <p className="text-2xs text-fg-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-heading font-bold tabular-nums" style={{ color: accent }}>{fmt(value)}</p>
    </div>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-lg px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1.5 text-fg-muted">
        {icon}
        <span className="text-2xs uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}
