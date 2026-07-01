'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, ShieldQuestion, Copy, CheckCheck, ChevronDown, ChevronUp, Github } from 'lucide-react'
import { EvaluationResultData, EvaluatedPermission, fetchAzurePermissions } from '@/lib/evaluate'
import { CLOUD_META, RISK_META } from '@/data/compare/types'
import MitigationList from './MitigationList'

const PAGE_SIZE = 25

const TIER_SUBLABEL: Record<number, string> = {
  0: 'Control Plane — Risco Crítico',
  1: 'Management Plane — Risco Alto',
  2: 'Workload Plane — Risco Moderado',
}

export default function EvaluationResult({ data }: { data: EvaluationResultData }) {
  const [azurePerms, setAzurePerms] = useState<EvaluatedPermission[] | null>(null)
  const [loadingAzure, setLoadingAzure] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setAzurePerms(null)
    setExpanded(false)
    if (data.needsAzurePermFetch && data.azureSlug) {
      setLoadingAzure(true)
      fetchAzurePermissions(data.azureSlug).then((perms) => {
        setAzurePerms(perms)
        setLoadingAzure(false)
      })
    }
  }, [data])

  const permissions = data.needsAzurePermFetch ? (azurePerms ?? []) : data.permissions
  const visiblePermissions = expanded ? permissions : permissions.slice(0, PAGE_SIZE)
  const cloudMeta = CLOUD_META[data.cloud]

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Seção 1 — Identidade do Role ─────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ background: cloudMeta.color }}>
                {cloudMeta.shortLabel}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{cloudMeta.label}</span>
              {!data.matched && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
                  Não encontrado na base
                </span>
              )}
              {data.matched && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                  Match por {data.matchedBy === 'id' ? 'ID nativo' : 'nome'}
                </span>
              )}
            </div>
            <h2 className="text-[18px] font-semibold text-gray-800 dark:text-gray-100">{data.identity.name || '(nome não encontrado no JSON)'}</h2>
          </div>
          {data.identity.sourceUrl && (
            <Link href={data.identity.sourceUrl}
              className="shrink-0 flex items-center gap-1 text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline">
              Ver página completa <ExternalLink size={12} />
            </Link>
          )}
        </div>
        {data.identity.id && (
          <div className="flex items-center gap-1.5 mb-2">
            <code className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded break-all">{data.identity.id}</code>
            <button onClick={() => copy(data.identity.id!)} className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 shrink-0" title="Copiar">
              {copied === data.identity.id ? <CheckCheck size={12} className="text-green-600" /> : <Copy size={12} />}
            </button>
          </div>
        )}
        {data.identity.description && (
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{data.identity.description}</p>
        )}
      </section>

      {/* ── Seção 2 — Tier de Risco ───────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tier de Risco</p>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-[15px] font-bold px-4 py-2 rounded-lg shrink-0" style={{ background: data.tier.bg, color: data.tier.color }}>
            {data.tier.level != null ? `Tier ${data.tier.level}` : 'N/D'}
          </span>
          <span className="text-[14px] font-semibold" style={{ color: data.tier.color }}>
            {data.tier.level != null ? TIER_SUBLABEL[data.tier.level] : data.tier.label}
          </span>
        </div>
        <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{data.tier.justification}</p>
        {!data.matched && (
          <div className="mt-3 flex items-start gap-2 text-[12px] px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
            <ShieldQuestion size={14} className="shrink-0 mt-0.5" />
            <span>
              Role não encontrado na base — classificação não disponível. Contribua com os dados via{' '}
              <a href="https://github.com/natebzurg/entraid.permissions" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
                GitHub <Github size={11} />
              </a>.
            </span>
          </div>
        )}
      </section>

      {/* ── Seção 3 — Permissões-Chave ────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Permissões-Chave</p>
          {data.permissionCountHint != null && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{data.permissionCountHint} no total (Azure RBAC)</span>
          )}
        </div>
        {loadingAzure && <p className="text-[12px] text-gray-400 dark:text-gray-500">Carregando permissões detalhadas do Azure RBAC...</p>}
        {!loadingAzure && permissions.length === 0 && (
          <p className="text-[12px] text-gray-400 dark:text-gray-500">Nenhuma permissão granular disponível para este role.</p>
        )}
        {!loadingAzure && permissions.length > 0 && (
          <>
            <ul className="space-y-1.5 max-h-[360px] overflow-auto pr-1">
              {visiblePermissions.map((p, i) => (
                <li key={p.name + i} className="flex items-center gap-2 text-[12px] border-b border-gray-50 dark:border-gray-800/60 last:border-0 pb-1.5 last:pb-0">
                  <code className="font-mono text-gray-600 dark:text-gray-300 break-all flex-1">{p.name}</code>
                  {p.tier && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">{p.tier}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{visiblePermissions.length} de {permissions.length} permissões exibidas</p>
              {permissions.length > PAGE_SIZE && (
                <button onClick={() => setExpanded(!expanded)}
                  className="text-[11px] text-[#0078d4] dark:text-[#85b7eb] hover:underline flex items-center gap-1">
                  {expanded ? <>Recolher <ChevronUp size={12} /></> : <>Ver todas as permissões <ChevronDown size={12} /></>}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Seção 4 — Riscos e Mitigações ─────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Riscos e Mitigações</p>
        {data.risk.available ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: RISK_META[data.risk.level!].bg, color: RISK_META[data.risk.level!].color }}>
                {RISK_META[data.risk.level!].label}
              </span>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">função catalogada: {data.risk.functionName}</span>
            </div>
            {data.risk.keyPermissions && data.risk.keyPermissions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Riscos conhecidos</p>
                <ul className="space-y-1">
                  {data.risk.keyPermissions.map((k, i) => (
                    <li key={i} className="text-[12px] text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                      <span className="text-gray-300 dark:text-gray-600 mt-0.5 shrink-0">▸</span>{k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.risk.mitigations && data.risk.mitigations.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Mitigações recomendadas</p>
                <MitigationList items={data.risk.mitigations} color={cloudMeta.color} />
              </div>
            )}
            {data.risk.notes && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800 rounded p-2">{data.risk.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed">
            Dados de risco não disponíveis para este role. Riscos e mitigações neste site só estão catalogados para um
            conjunto curado de funções críticas cross-cloud (ex.: Global Admin, Billing Admin, Security Admin) — ver{' '}
            <Link href="/compare" className="text-[#0078d4] dark:text-[#85b7eb] hover:underline">comparativo multi-cloud</Link>.
          </p>
        )}
        {data.identity.sourceUrl && (
          <Link href={data.identity.sourceUrl}
            className="mt-4 inline-flex items-center gap-1 text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline">
            Ver página completa deste role <ExternalLink size={12} />
          </Link>
        )}
      </section>
    </div>
  )
}
