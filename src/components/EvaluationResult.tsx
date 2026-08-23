'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import Link from 'next/link'
import { ExternalLink, ShieldQuestion, Copy, CheckCheck, ChevronDown, ChevronUp, Github, ShieldOff } from 'lucide-react'
import { EvaluationResultData, EvaluatedPermission, fetchExternalPermissions } from '@/lib/evaluate'
import { CLOUD_META, RISK_META } from '@/data/compare/types'
import MitigationList from './MitigationList'
import PermissionAssessment from './PermissionAssessment'
import type { TranslationKey } from '@/i18n/dictionary'

const PAGE_SIZE = 25

// Roda em nível de módulo, então guarda a chave; o t() acontece na renderização.
const TIER_SUBLABEL: Record<number, TranslationKey> = {
  0: 'eval.tierZeroSub',
  1: 'eval.tierOneSub',
  2: 'eval.tierTwoSub',
}

export default function EvaluationResult({ data }: { data: EvaluationResultData }) {
  const t = useT()
  const [azurePerms, setAzurePerms] = useState<EvaluatedPermission[] | null>(null)
  /** O que a role explicitamente NÃO pode — NotActions do Azure, Deny da AWS. */
  const [azureDenied, setAzureDenied] = useState<EvaluatedPermission[]>([])
  const [loadingAzure, setLoadingAzure] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setAzurePerms(null)
    setAzureDenied([])
    setExpanded(false)
    if (data.needsPermFetch && data.permFetchSlug) {
      setLoadingAzure(true)
      fetchExternalPermissions(data.cloud, data.permFetchSlug).then((r) => {
        setAzurePerms(r.granted)
        setAzureDenied(r.denied)
        setLoadingAzure(false)
      })
    }
  }, [data])

  const permissions = data.needsPermFetch ? (azurePerms ?? []) : data.permissions
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
      <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-2xs font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ background: cloudMeta.color }}>
                {cloudMeta.shortLabel}
              </span>
              <span className="text-3xs text-fg-muted">{cloudMeta.label}</span>
              {!data.matched && (
                <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
                  Não encontrado na base
                </span>
              )}
              {data.matched && (
                <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                  {t('eval.matchBy')} {data.matchedBy === 'id' ? t('eval.matchById') : t('eval.matchByName')}
                </span>
              )}
            </div>
            <h2 className="text-sub font-semibold text-gray-800 dark:text-gray-100">{data.identity.name || t('empty.nameNotInJson')}</h2>
          </div>
          {data.identity.sourceUrl && (
            <Link href={data.identity.sourceUrl}
              className="shrink-0 flex items-center gap-1 text-tiny text-brand-strong dark:text-brand-onDark hover:underline">
              Ver página completa <ExternalLink size={12} />
            </Link>
          )}
        </div>
        {data.identity.id && (
          <div className="flex items-center gap-1.5 mb-2">
            <code className="text-3xs font-mono text-fg-muted bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded break-all">{data.identity.id}</code>
            <button onClick={() => copy(data.identity.id!)} className="text-fg-muted hover:text-gray-600 dark:hover:text-gray-300 shrink-0" title={t('action.copy')}>
              {copied === data.identity.id ? <CheckCheck size={12} className="text-green-600" /> : <Copy size={12} />}
            </button>
          </div>
        )}
        {data.identity.description && (
          <p className="text-body text-fg-muted leading-relaxed">{data.identity.description}</p>
        )}
      </section>

      {/* ── Seção 2 — Tier de Risco ───────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
        <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-3">{t('label.riskTier')}</p>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-lead font-bold px-4 py-2 rounded-lg shrink-0" style={{ background: data.tier.bg, color: data.tier.color }}>
            {data.tier.level != null ? `Tier ${data.tier.level}` : 'N/D'}
          </span>
          <span className="text-note font-semibold" style={{ color: data.tier.color }}>
            {data.tier.level != null ? t(TIER_SUBLABEL[data.tier.level]) : data.tier.label}
          </span>
        </div>
        <p className="text-body text-fg-muted leading-relaxed">{data.tier.justification}</p>
        {!data.matched && (
          <div className="mt-3 flex items-start gap-2 text-tiny px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
            <ShieldQuestion size={14} className="shrink-0 mt-0.5" />
            <span>
              {t('eval.tierNotCatalogued')}{' '}
              <a href="https://github.com/natantbueno/entraid.permissions" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
                GitHub <Github size={11} />
              </a>.
            </span>
          </div>
        )}
      </section>

      {/*
        Seção 2b — a avaliação pelas permissões.

        Entra logo depois do tier e SÓ para role fora do catálogo: quando o
        matching acerta, o veredito catalogado é melhor do que qualquer
        estimativa, e os dois lado a lado só criariam dúvida sobre qual vale.
      */}
      {!data.matched && (
        <PermissionAssessment cloud={data.cloud} permissions={data.permissions.map((p) => p.name)} />
      )}

      {/* ── Seção 3 — Permissões-Chave ────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider">{t('label.keyPermissions')}</p>
          {data.permissionCountHint != null && (
            <span className="text-3xs text-fg-muted">{data.permissionCountHint} {t('eval.totalAzure')}</span>
          )}
        </div>
        {loadingAzure && <p className="text-tiny text-fg-muted">{t('state.loadingAzureDetail')}</p>}
        {!loadingAzure && permissions.length === 0 && (
          // Conceder ZERO é diferente de não haver dado, e a frase genérica
          // dizia a segunda coisa nos dois casos. Uma policy de quarentena
          // existe justamente para não conceder nada — chamar isso de
          // "permissão indisponível" esconde o que ela é.
          <p className="text-tiny text-fg-muted">
            {azureDenied.length > 0 ? t('eval.grantsNothing') : t('empty.noGranularPerms')}
          </p>
        )}
        {!loadingAzure && permissions.length > 0 && (
          <>
            <ul className="space-y-1.5 max-h-[360px] overflow-auto pr-1">
              {visiblePermissions.map((p, i) => (
                <li key={p.name + i} className="flex items-center gap-2 text-tiny border-b border-gray-50 dark:border-gray-800/60 last:border-0 pb-1.5 last:pb-0">
                  <code className="font-mono text-gray-600 dark:text-gray-300 break-all flex-1">{p.name}</code>
                  {p.tier && (
                    <span className="text-micro px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-fg-muted shrink-0">{p.tier}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mt-3">
              <p className="text-3xs text-fg-muted">{visiblePermissions.length} {t('pagination.of')} {permissions.length} {t('eval.permsShown')}</p>
              {permissions.length > PAGE_SIZE && (
                <button onClick={() => setExpanded(!expanded)}
                  className="text-3xs text-brand-strong dark:text-brand-onDark hover:underline flex items-center gap-1">
                  {expanded ? <>{t('action.showLess')} <ChevronUp size={12} /></> : <>{t('action.seeAllPerms')} <ChevronDown size={12} /></>}
                </button>
              )}
            </div>
          </>
        )}
        {/*
          O que a role NÃO pode.

          `NotActions` do Azure e statements `Effect: Deny` da AWS vinham
          misturados na lista de cima: o Contributor aparecia com 12
          "permissões-chave", das quais 11 são exatamente o que ele não faz.
          Separado, isso deixa de ser erro e vira a informação mais útil da
          tela — é a linha que explica por que a Contributor não se
          auto-promove.
        */}
        {!loadingAzure && azureDenied.length > 0 && (
          <div className="mt-4 pt-3 border-t border-line">
            <p className="text-2xs font-semibold text-danger uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ShieldOff size={12} /> {t('eval.deniedTitle')} ({azureDenied.length})
            </p>
            <p className="text-3xs text-fg-muted mb-2 max-w-3xl leading-relaxed">{t('eval.deniedBody')}</p>
            <ul className="space-y-1 max-h-[200px] overflow-auto pr-1">
              {azureDenied.map((p, i) => (
                <li key={p.name + i} className="text-tiny">
                  <code className="font-mono text-gray-600 dark:text-gray-300 break-all">{p.name}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Seção 4 — Riscos e Mitigações ─────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
        <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-3">{t('eval.risksTitle')}</p>
        {data.risk.available ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: RISK_META[data.risk.level!].bg, color: RISK_META[data.risk.level!].color }}>
                {RISK_META[data.risk.level!].label}
              </span>
              <span className="text-tiny text-fg-muted">{t('eval.catalogedFn')} {data.risk.functionName}</span>
            </div>
            {data.risk.keyPermissions && data.risk.keyPermissions.length > 0 && (
              <div>
                <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wider mb-1.5">{t('eval.knownRisks')}</p>
                <ul className="space-y-1">
                  {data.risk.keyPermissions.map((k, i) => (
                    <li key={i} className="text-tiny text-fg-muted flex items-start gap-1.5">
                      <span className="text-fg-muted dark:text-gray-600 mt-0.5 shrink-0">▸</span>{k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.risk.mitigations && data.risk.mitigations.length > 0 && (
              <div>
                <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wider mb-1.5">{t('eval.mitigations')}</p>
                <MitigationList items={data.risk.mitigations} color={cloudMeta.color} />
              </div>
            )}
            {data.risk.notes && (
              <p className="text-3xs text-fg-muted italic bg-gray-50 dark:bg-gray-800 rounded p-2">{data.risk.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-tiny text-fg-muted leading-relaxed">
            {/*
              Estado vazio honesto (E5): para role fora do catálogo, apontar
              para o que o site CONSEGUE dizer é melhor do que repetir que não
              tem dado. A frase antiga era a mesma nos dois casos, e para quem
              acabou de colar uma role custom soava como "o site não sabe nada
              sobre isso" — logo acima de uma seção inteira sobre isso.
            */}
            {!data.matched ? t('eval.riskFromPerms') : (<>
              {t('eval.riskNotCatalogued')}{' '}
              <Link href="/compare" className="text-brand-strong dark:text-brand-onDark hover:underline">{t('eval.compareLink')}</Link>.
            </>)}
          </p>
        )}
        {data.identity.sourceUrl && (
          <Link href={data.identity.sourceUrl}
            className="mt-4 inline-flex items-center gap-1 text-tiny text-brand-strong dark:text-brand-onDark hover:underline">
            Ver página completa deste role <ExternalLink size={12} />
          </Link>
        )}
      </section>
    </div>
  )
}
