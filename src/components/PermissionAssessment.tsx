'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ShieldAlert, ExternalLink } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'
import type { TranslationKey } from '@/i18n/dictionary'
import type { EvaluateCloud } from '@/lib/evaluate'
import { analyzeByPermissions, type PermissionAnalysis } from '@/lib/evaluateByPermissions'

/**
 * A seção que responde "e quando a role não está no catálogo?".
 *
 * Só aparece quando o matching falhou — para role catalogada o veredito do
 * catálogo é melhor do que qualquer estimativa, e mostrar os dois lado a lado
 * só criaria dúvida sobre qual vale.
 *
 * O tom aqui é deliberadamente mais contido do que o do resultado catalogado:
 * tudo vem rotulado como estimativa, com o denominador na frente (quantas
 * permissões foram reconhecidas). Uma estimativa sobre 3 de 40 ações não vale
 * o mesmo que uma sobre 38 de 40, e quem lê precisa conseguir ver a diferença
 * sem abrir o código.
 */

const TIER_SUBLABEL: Record<number, TranslationKey> = {
  0: 'eval.tierZeroSub',
  1: 'eval.tierOneSub',
  2: 'eval.tierTwoSub',
}

export default function PermissionAssessment({
  cloud, permissions,
}: { cloud: EvaluateCloud; permissions: string[] }) {
  const t = useT()
  const [analise, setAnalise] = useState<PermissionAnalysis | null>(null)
  const [carregando, setCarregando] = useState(true)

  // A lista chega como array novo a cada render; sem uma chave estável o
  // efeito re-dispararia para sempre.
  const chave = useMemo(() => permissions.join('|'), [permissions])

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    setAnalise(null)
    analyzeByPermissions(cloud, chave ? chave.split('|') : [])
      .then((r) => { if (vivo) { setAnalise(r); setCarregando(false) } })
      .catch(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [cloud, chave])

  return (
    <section className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
      <p className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
        {t('eval.byPermsTitle')}
      </p>

      {carregando && <p className="text-tiny text-fg-muted">{t('eval.analyzingPerms')}</p>}

      {!carregando && analise && !analise.supported && (
        <p className="text-tiny text-fg-muted leading-relaxed">{t('eval.byPermsUnsupported')}</p>
      )}

      {!carregando && analise && analise.supported && (
        <div className="space-y-4">
          <p className="text-tiny text-fg-muted leading-relaxed max-w-3xl">
            <Rich text={t('eval.byPermsLead')} className="text-fg" />
          </p>

          {analise.recognised === 0 ? (
            <p className="text-tiny text-fg-muted leading-relaxed">{t('eval.nothingRecognised')}</p>
          ) : (
            <>
              {/* Tier estimado */}
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <span className={`text-lead font-bold px-4 py-2 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800 ${
                    analise.level === 0 ? 'text-danger' : 'text-fg'}`}>
                    {analise.level != null ? `Tier ${analise.level}` : 'N/D'}
                  </span>
                  <div>
                    {analise.level != null && (
                      <p className={`text-note font-semibold ${analise.level === 0 ? 'text-danger' : 'text-fg'}`}>
                        {t(TIER_SUBLABEL[analise.level])}
                      </p>
                    )}
                    <p className="text-3xs text-fg-muted">
                      {t('eval.estimatedTier')} — {t('eval.fromRecognised')
                        .replace('{n}', String(analise.recognised))
                        .replace('{m}', String(analise.analyzed))}
                    </p>
                  </div>
                </div>
                <p className="text-3xs text-fg-muted leading-relaxed max-w-3xl">
                  <Rich text={t('eval.howEstimated')} className="text-fg" />
                </p>
              </div>

              {/* Permissões que puxam a role para cima */}
              {analise.controlPlane.length > 0 && (
                <div>
                  <p className="text-2xs font-semibold text-danger uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <ShieldAlert size={12} /> {t('eval.controlPlanePerms')} ({analise.controlPlane.length})
                  </p>
                  <p className="text-3xs text-fg-muted mb-1.5">{t('eval.controlPlaneBody')}</p>
                  <ul className="space-y-0.5">
                    {analise.controlPlane.slice(0, 12).map((p) => (
                      <li key={p} className="text-tiny font-mono text-gray-600 dark:text-gray-300 break-all">{p}</li>
                    ))}
                  </ul>
                  {analise.controlPlane.length > 12 && (
                    <p className="text-3xs text-fg-muted mt-1">
                      +{analise.controlPlane.length - 12} {t('perm.othersSuffix')}
                    </p>
                  )}
                </div>
              )}

              {/* Roles mais próximas */}
              {analise.nearest.length > 0 && (
                <div>
                  <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wider mb-1">
                    {t('eval.nearestTitle')}
                  </p>
                  <p className="text-3xs text-fg-muted mb-2 max-w-3xl leading-relaxed">
                    <Rich text={t('eval.nearestBody')} className="text-fg" />
                  </p>
                  <ul className="space-y-1">
                    {analise.nearest.map((n) => (
                      <li key={n.slug}>
                        <Link href={n.url}
                          className="flex items-center gap-2 text-tiny px-3 py-2 rounded-lg border border-surface-border dark:border-gray-800 hover:border-accent transition-colors">
                          <ChevronRight size={13} className="text-fg-subtle shrink-0" />
                          <span className="font-medium truncate">{n.name}</span>
                          {n.isPrivileged && <ShieldAlert size={11} className="text-danger shrink-0" />}
                          <span className="ml-auto text-3xs text-fg-muted whitespace-nowrap">
                            {t('eval.coversLabel')} {Math.round(n.coverage * 100)}% {t('eval.ofYours')}
                            {' · '}
                            {t('eval.grantsLabel')} {n.total}
                            {n.excess > 0 && ` (+${n.excess} ${t('eval.excessSuffix')})`}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SoD da role vizinha */}
              {analise.sod && (
                <div>
                  <p className="text-2xs font-semibold text-fg-subtle uppercase tracking-wider mb-1">
                    {t('eval.sodTitle')} ({analise.sod.rules.length})
                  </p>
                  <p className="text-3xs text-fg-muted mb-2 max-w-3xl leading-relaxed">
                    <Rich text={t('eval.sodBody').replace('{role}', analise.sod.roleName)} className="text-fg" />
                  </p>
                  <ul className="space-y-0.5">
                    {analise.sod.rules.map((r) => (
                      <li key={r.id} className="text-tiny">
                        <Link href={`/sod/rules/${r.id}`} className="text-fg-muted hover:text-fg hover:underline inline-flex items-center gap-1">
                          {r.name} <ExternalLink size={10} className="shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Rodapé: o que ficou de fora. Nada disso pode sumir em silêncio. */}
          <div className="text-3xs text-fg-muted space-y-0.5 border-t border-line pt-2.5">
            {analise.unknown.length > 0 && (
              <p>{analise.unknown.length} {t('eval.notRecognised')}</p>
            )}
            {analise.blanketRoles.length > 0 && (
              <p>{analise.blanketRoles.length} {t('eval.blanketNote')}</p>
            )}
            {analise.truncated && (
              <p>{t('eval.truncatedNote').replace('{n}', String(analise.analyzed))}</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
