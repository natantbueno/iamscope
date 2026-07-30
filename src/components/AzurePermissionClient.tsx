'use client'

// Detalhe de uma permissão do Azure RBAC — mesmo layout da página de role:
// cabeçalho com o identificador, cards de fato, descrição oficial e a tabela
// de quem concede. Aqui a relação é invertida: em vez de listar as permissões
// de uma role, lista as roles que concedem esta permissão.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Copy, CheckCheck, ExternalLink, ShieldAlert, Hash, Tag, Layers, Asterisk,
} from 'lucide-react'

import AppShell from '@/components/AppShell'
import PermissionsTable from '@/components/PermissionsTable'
import { AZURE_TIER_META } from '@/data/azureRbac'
import {
  AzurePermIndexFile, AzurePermissionEntry,
  buildAzurePermissionCatalog, getAzurePermissionBySlug,
} from '@/lib/azurePermissions'

export default function AzurePermissionClient({ slug }: { slug: string }) {
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
      <AppShell headerTitle="Carregando..." headerSub="Azure RBAC — Permissão">
        <div className="flex-1 flex items-center justify-center text-gray-400 text-[13px]">Carregando permissão…</div>
      </AppShell>
    )
  }

  if (!entry) {
    return (
      <AppShell headerTitle="Permissão não encontrada" headerSub="Azure RBAC">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Permissão não encontrada.</p>
            <Link href="/azure-rbac/permissions" className="text-[#85b7eb] hover:underline text-[13px]">
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
      headerBack={
        <Link href="/azure-rbac/permissions"
          className="flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
      }
    >
      <div className="flex-1 overflow-y-auto bg-gray-950">
        <div className="max-w-5xl px-6 py-6">

          {/* Título */}
          <div className="mb-5">
            <div className="flex items-start gap-3 flex-wrap mb-2">
              <h1 className="text-[20px] font-semibold text-gray-100 font-mono break-all">{entry.action}</h1>
              {entry.isWildcard && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-400 mt-1 shrink-0">
                  <Asterisk size={12} /> Wildcard
                </span>
              )}
            </div>
            {entry.isWildcard && (
              <p className="text-[12px] text-amber-400/80">
                Contém <code className="font-mono">*</code> — concede todas as operações que casam com o padrão,
                inclusive as que a Microsoft adicionar no futuro.
              </p>
            )}
          </div>

          {/* Números */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <StatCard label="Roles que concedem" value={entry.roles.length} accent="#0078d4" />
            <StatCard label="Privilegiadas" value={privileged} accent={privileged > 0 ? '#f87171' : '#6b7280'} />
            <StatCard label="Risk Tiers" value={tierBreakdown.length} accent="#a78bfa" />
            <StatCard label="Segmentos" value={entry.action.split('/').length} accent="#34d399" />
          </div>

          {/* Fatos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-6">
            <FactCard icon={<Hash size={14} />} label="Action">
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-[11px] text-gray-300 break-all">{entry.action}</code>
                <button onClick={copy} className="text-gray-400 hover:text-gray-200 shrink-0" title="Copiar" aria-label="Copiar action">
                  {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                </button>
              </div>
            </FactCard>
            <FactCard icon={<Tag size={14} />} label="Resource provider">
              <span className="text-[12px] font-mono text-gray-200 break-all">{entry.provider}</span>
            </FactCard>
            <FactCard icon={<Layers size={14} />} label="Recurso / verbo">
              <span className="text-[12px] font-mono text-gray-200 break-all">
                {entry.resource || '—'} <span className="text-gray-500">/</span> {entry.verb || '—'}
              </span>
            </FactCard>
          </div>

          {/* Descrição oficial */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-[14px] font-semibold text-gray-100">Descrição</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                Microsoft
              </span>
              <a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions"
                target="_blank" rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#85b7eb] hover:underline">
                Referência de permissões <ExternalLink size={11} />
              </a>
            </div>
            {entry.description ? (
              <p className="text-[13px] text-gray-300 leading-relaxed">{entry.description}</p>
            ) : (
              <p className="text-[13px] text-gray-500 leading-relaxed">
                A descrição oficial desta action ainda não foi coletada. A carga é incremental a partir da
                referência de permissões da Microsoft — enquanto isso, o alcance da permissão pode ser lido
                pelo próprio nome: <code className="font-mono text-[12px] text-gray-400">{entry.provider}</code>{' '}
                {entry.resource && <>sobre <code className="font-mono text-[12px] text-gray-400">{entry.resource}</code></>}{' '}
                {entry.verb && <>na operação <code className="font-mono text-[12px] text-gray-400">{entry.verb}</code></>}.
              </p>
            )}
          </section>

          {/* Distribuição por tier */}
          {tierBreakdown.length > 0 && (
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
              <h2 className="text-[14px] font-semibold text-gray-100 mb-3">Distribuição por Risk Tier</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {tierBreakdown.map(([tier, n]) => {
                  const meta = AZURE_TIER_META[tier as keyof typeof AZURE_TIER_META]
                  return (
                    <span key={tier} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                      style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
                      {n} {meta.label}
                    </span>
                  )
                })}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Risk Tier é classificação do IAM Scope, derivada das permissões da role — não é publicada pela Microsoft.
              </p>
            </section>
          )}

          {/* Roles que concedem */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <h2 className="text-[14px] font-semibold text-gray-100 mb-4">
              Roles que concedem esta permissão
              <span className="ml-2 text-[12px] font-normal text-gray-500">({entry.roles.length})</span>
            </h2>
            <PermissionsTable
              rows={entry.roles.map((r) => ({
                permission: r.name,
                tier: AZURE_TIER_META[r.tier]?.label ?? r.tier,
                categoria: r.category,
                privilegiada: r.isPrivileged ? 'Sim' : 'Não',
                totalPermissoes: String(r.permissionCount),
              }))}
              columns={[
                { key: 'permission',      label: 'Role' },
                { key: 'tier',            label: 'Risk Tier', badge: true, width: 'w-40' },
                { key: 'categoria',       label: 'Categoria', width: 'w-32' },
                { key: 'privilegiada',    label: 'Privilegiada', badge: true, width: 'w-28' },
                { key: 'totalPermissoes', label: 'Permissões', width: 'w-24' },
              ]}
              filterKey="tier"
              colors={{ Sim: '#f87171', 'Não': '#6b7280', 'Full Control': '#fca5a5', 'Access Management': '#fdba74', Contributor: '#fde047', 'Data Plane': '#7dd3fc', Reader: '#86efac', Specialized: '#c4b5fd' }}
              accent="#85b7eb"
              filename={`azure-permissao-${entry.slug}-roles`}
              noun="roles"
              searchPlaceholder="Filtrar roles..."
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.roles.slice(0, 40).map((r) => (
                <Link key={r.slug} href={`/azure-rbac/roles/${r.slug}`}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-[#85b7eb] transition-colors">
                  {r.isPrivileged && <ShieldAlert size={10} className="text-red-500 shrink-0" />}
                  {r.name}
                </Link>
              ))}
              {entry.roles.length > 40 && (
                <span className="text-[11px] text-gray-500 self-center">+{entry.roles.length - 40} outras</span>
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
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[20px] font-bold tabular-nums" style={{ color: accent }}>{value.toLocaleString('pt-BR')}</p>
    </div>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1.5 text-gray-500">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}
