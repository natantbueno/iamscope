'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SITE_INDEX, SITE_TOOLS, type SiteIndexEntry } from '@/data/siteIndex'
import { CLOUD_COLORS, type CloudId } from '@/lib/cloudColors'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'

/**
 * Índice de navegação no topo de cada página de Reference.
 *
 * POR QUE ISSO ENTROU
 *   As Reference eram só conceituais: tiers, boas práticas e links para a
 *   documentação do provedor. Não diziam o que o próprio site tem — quem caía
 *   em /aws/reference vindo de uma busca não descobria ali que existem 16.117
 *   actions catalogadas a um clique de distância. A página falava da AWS, não
 *   do IAM Scope.
 *
 *   Agora ela abre com o que existe NESTA cloud dentro do site, com as
 *   contagens reais, e fecha com as ferramentas multi-cloud — que não têm outra
 *   porta de entrada para quem chega direto numa página interna.
 *
 * As contagens vêm de src/data/siteIndex.ts, que lê counts.ts. Nenhum número
 * escrito à mão: foi assim que o syncMeta passou meses anunciando "GCP (232)".
 */
export default function ReferenceIndex({ cloud }: { cloud: CloudId }) {
  const t = useT()
  const nf = useNumberFormat()
  const entradas = SITE_INDEX[cloud] ?? []
  const cor = CLOUD_COLORS[cloud]

  return (
    <>
      <section>
        <h2 className="text-sub font-semibold text-fg mb-1">{t('idx.title')}</h2>
        <p className="text-note text-fg-subtle leading-relaxed mb-4">{t('idx.intro')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entradas.map((e) => (
            <Card key={e.href} entry={e} cor={cor.mark} texto={cor.onDark} t={t} nf={nf} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sub font-semibold text-fg mb-1">{t('idx.toolsTitle')}</h2>
        <p className="text-note text-fg-subtle leading-relaxed mb-4">{t('idx.toolsIntro')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SITE_TOOLS.map((e) => (
            // Ferramenta é multi-cloud: cor neutra, para não sugerir que
            // pertence à cloud desta página.
            <Card key={e.href} entry={e} cor="#64748b" texto="#93a3bd" t={t} nf={nf} />
          ))}
        </div>
      </section>
    </>
  )
}

function Card({ entry, cor, texto, t, nf }: {
  entry: SiteIndexEntry
  cor: string
  texto: string
  t: (k: Parameters<ReturnType<typeof useT>>[0]) => string
  nf: (n: number) => string
}) {
  return (
    <Link href={`${entry.href}/`}
      className="group flex items-start gap-3 rounded-lg border border-line-strong bg-surface-alt
                 hover:bg-surface hover:border-gray-500 transition-colors p-3">
      <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: cor }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-body font-medium" style={{ color: texto }}>{entry.label}</span>
          {/* -1 marca página sem contagem — conceitual, dashboard, ferramenta */}
          {entry.count >= 0 && (
            <span className="text-tiny text-fg-muted tabular-nums">
              {nf(entry.count)} {t(entry.noun)}
            </span>
          )}
        </div>
        <p className="text-tiny text-fg-subtle leading-snug mt-0.5">{t(entry.desc)}</p>
      </div>
      <ArrowRight size={14} className="text-fg-subtle group-hover:text-fg-muted transition-colors shrink-0 mt-1" />
    </Link>
  )
}
