'use client'

import { Info } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import { AZURE_EFFECTIVE, AZURE_EFFECTIVE_UNIVERSE, AzureEffective } from '@/data/azureEffective'

/**
 * Exibe as permissões EFETIVAS de uma role do Azure — e o fato de que o número
 * é um piso.
 *
 * POR QUE ISSO EXISTE
 *   `permissionCount` conta ENTRADAS DA DEFINIÇÃO. A Owner é uma linha só
 *   (`{"action":"*"}`), então aparecia com "1 permissão", empatada com a
 *   AcrPull. Quem ordenava por "menor privilégio" recebia a lista invertida.
 *   O efetivo expande o wildcard contra o universo de ações e subtrai as
 *   NotActions — ver scripts/build-effective-perms.js.
 *
 * POR QUE O `≥` NÃO É ENFEITE
 *   O universo é colhido da DOCUMENTAÇÃO da Microsoft. A Azure Management API
 *   (`providerOperations`) expõe mais ações e mais providers do que a doc
 *   publica, então o efetivo é sempre limite INFERIOR. Esconder isso e mostrar
 *   "17.591" seco seria trocar um número errado por outro número com ar de
 *   exato. O `≥` carrega a ressalva no próprio glifo, o tooltip carrega o
 *   porquê, e as telas maiores repetem em texto visível (`floorNote`).
 *
 *   Os números do universo saem de AZURE_EFFECTIVE_UNIVERSE em runtime, nunca
 *   escritos na frase traduzida — é a regra que scripts/check-stale-numbers.js
 *   protege.
 *
 * DATA PLANE NÃO TEM DENOMINADOR
 *   O store de ações mistura control plane e data plane sem marcar qual é
 *   qual, então não há universo contra o qual expandir `DataActions: *`.
 *   Nessas roles o dado é `null` e a tela diz isso com todas as letras, em vez
 *   de imprimir um número inventado.
 */

/** Preenche {n} (ações do universo) e {p} (providers) numa frase traduzida. */
export function useFloorNote() {
  const t = useT()
  const fmt = useNumberFormat()
  return (key: 'azeff.tip' | 'azeff.floor') =>
    t(key)
      .replace('{n}', fmt(AZURE_EFFECTIVE_UNIVERSE.actions))
      .replace('{p}', fmt(AZURE_EFFECTIVE_UNIVERSE.providers))
}

export function useAzureEffective(slug: string): AzureEffective | undefined {
  return AZURE_EFFECTIVE[slug]
}

/**
 * O número efetivo, com o `≥` e o tooltip.
 * `variant='cell'` cabe numa célula de tabela; `variant='stat'` é o número
 * grande do cartão da página de detalhe.
 */
export default function AzureEffectiveCount({
  slug,
  variant = 'cell',
  color,
  className = '',
}: {
  slug: string
  variant?: 'cell' | 'stat'
  /** Cor herdada do tier, quando a tela já colore por risco. */
  color?: string
  className?: string
}) {
  const t = useT()
  const fmt = useNumberFormat()
  const floor = useFloorNote()
  const eff = AZURE_EFFECTIVE[slug]

  if (!eff) return <span className={`text-fg-subtle ${className}`}>—</span>

  const tip = floor('azeff.tip')
  const size = variant === 'stat' ? 'text-stat font-extrabold' : 'text-tiny font-semibold tabular-nums'

  return (
    <span
      title={tip}
      aria-label={`${t('azeff.atLeast')} ${fmt(eff.effectiveActions)} — ${tip}`}
      className={`inline-flex items-baseline gap-0.5 cursor-help ${size} ${className}`}
      style={color ? { color } : undefined}
    >
      <span aria-hidden="true" className="opacity-60 font-normal">≥</span>
      {fmt(eff.effectiveActions)}
    </span>
  )
}

/**
 * O bloco da página de detalhe: os dois planos lado a lado, com a ressalva do
 * piso em texto visível — não só no tooltip.
 */
export function AzureEffectivePanel({
  slug, accent, nativeCount,
}: {
  slug: string
  accent: string
  /** `permissionCount` da definição — vem de fora para este componente não arrastar AZURE_ROLES. */
  nativeCount: number
}) {
  const t = useT()
  const fmt = useNumberFormat()
  const floor = useFloorNote()
  const eff = AZURE_EFFECTIVE[slug]

  if (!eff) return null

  return (
    <section className="bg-surface border border-line rounded-lg p-5 mb-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h2 className="text-note font-semibold text-fg">{t('azeff.panelTitle')}</h2>
        <span
          title={floor('azeff.tip')}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-alt
                     text-fg-muted font-medium text-micro px-1.5 py-0.5 cursor-help whitespace-nowrap"
        >
          <Info size={9} className="shrink-0 opacity-70" />
          {t('azeff.floorBadge')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-surface-alt border border-line rounded-lg p-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: accent }}>
            {t('azeff.controlPlane')}
          </p>
          <AzureEffectiveCount slug={slug} variant="stat" color={accent} />
        </div>

        <div className="bg-surface-alt border border-line rounded-lg p-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wider mb-1.5 text-fg-muted">
            {t('azeff.dataPlane')}
          </p>
          {eff.effectiveDataActions === null ? (
            <span title={t('azeff.dataTip')} className="text-body text-fg-muted cursor-help">
              {t('azeff.noDenominator')}
            </span>
          ) : (
            <span className="text-stat font-extrabold text-fg-muted">{fmt(eff.effectiveDataActions)}</span>
          )}
        </div>

        <div className="bg-surface-alt border border-line rounded-lg p-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wider mb-1.5 text-fg-subtle">
            {t('azeff.definitionLabel')}
          </p>
          <span title={t('azeff.nativeTip')} className="text-stat font-extrabold text-fg-subtle cursor-help">
            {fmt(nativeCount)}
          </span>
        </div>
      </div>

      <p className="text-3xs text-fg-muted mt-3 leading-relaxed">{floor('azeff.floor')}</p>
      {eff.effectiveDataActions === null && (
        <p className="text-3xs text-fg-muted mt-1.5 leading-relaxed">{t('azeff.dataTip')}</p>
      )}
    </section>
  )
}
