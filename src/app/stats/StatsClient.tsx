'use client'

/**
 * /stats — o panorama cross-cloud do catálogo.
 *
 * POR QUE ESTA PÁGINA EXISTE
 *   O site cobre seis plataformas e nunca tinha publicado o que isso soma. Cada
 *   landing mostra a sua cloud; nenhuma tela respondia "onde o acesso se
 *   concentra, e como as seis se comparam". A resposta já estava toda em
 *   src/data/ — o que faltava era a página.
 *
 * DE ONDE VÊM OS NÚMEROS
 *   Todos de `src/data/stats.ts`, que é GERADO por scripts/build-stats.js a
 *   partir dos datasets e dos índices invertidos em public/. Nada é calculado
 *   aqui, nada é escrito à mão, e nenhum dataset entra no bundle desta rota —
 *   mesmo desenho de counts.ts. A prosa recebe `{n}` e o chamador preenche.
 *
 * COR
 *   O site é monocromático por decisão de 06/08/2026, e gráfico não é exceção.
 *   As barras de tier usam a cor que o próprio TIER_META da plataforma declara
 *   (vermelho só no topo, um cinza único no resto); as demais usam token
 *   semântico. Nenhuma escala de matiz por categoria é introduzida aqui — foi
 *   justamente ela que saiu, depois de se medir que `#7c3aed` significava
 *   "Specialized" em quatro clouds e "Developer" no GCP.
 */

import AppShell from '@/components/AppShell'
import ClassificationBadge from '@/components/ClassificationBadge'
import ExportButton from '@/components/ExportButton'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, Info } from 'lucide-react'
import {
  STATS_CLOUDS, STATS_ORDER, STATS_SOD, STATS_TOTALS, STATS_AZURE_UNIVERSE,
  type StatsCloud, type StatsCloudId, type StatsTier,
} from '@/data/stats'
import { DATA_SYNC } from '@/data/syncMeta'
import { SOD_RULES_COUNT } from '@/data/counts'
import { KPI_TONE } from '@/lib/kpiTone'
import { useT } from '@/i18n/LanguageProvider'
import { useNumberFormat } from '@/i18n/useNumberFormat'
import { Rich } from '@/i18n/Rich'
import type { TranslationKey } from '@/i18n/dictionary'

/**
 * Os três níveis do EAM, com o tom de cada um.
 *
 * Tier 0 é o único com marcação de risco, e nunca sozinho: o rótulo ao lado
 * carrega o significado (regra `color-not-only`). Os outros dois são o MESMO
 * token em duas opacidades — um degrau de valor, não de matiz. Com três
 * segmentos e um vão entre eles isso se lê; com cinco não se lia, que foi o
 * motivo de a rampa de cinzas ter sido abandonada em 06/08.
 */
const EAM_FILL: Record<0 | 1 | 2, string> = {
  0: 'rgb(var(--c-danger))',
  1: 'rgb(var(--c-fg-muted))',
  2: 'rgb(var(--c-fg-muted) / 0.35)',
}

const EAM_LABEL: Record<0 | 1 | 2, TranslationKey> = {
  0: 'tier.controlPlane',
  1: 'tier.managementPlane',
  2: 'tier.userAccess',
}

const BASIS_KEY: Record<string, TranslationKey> = {
  exact: 'stats.basisExact',
  effective: 'stats.basisEffective',
  entries: 'stats.basisEntries',
  declared: 'stats.basisDeclared',
  none: 'stats.basisNone',
}

const NIVEIS: (0 | 1 | 2)[] = [0, 1, 2]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-body font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-line rounded-xl p-5 ${className}`}>{children}</div>
  )
}

/** Aviso de leitura — ícone SEMPRE junto: o texto é que carrega o sentido. */
function Nota({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <p className="flex items-start gap-2 text-3xs text-fg-muted leading-relaxed">
      <Icon size={13} className={`shrink-0 mt-0.5 ${tone === 'warn' ? 'text-danger' : ''}`} />
      <span>{children}</span>
    </p>
  )
}

/** Barra simples sobre trilho. A largura é o dado; a cor não distingue itens. */
function Barra({ pct, fill }: { pct: number; fill: string }) {
  return (
    <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, pct > 0 ? 1.5 : 0)}%`, background: fill }} />
    </div>
  )
}

export default function StatsClient() {
  const t = useT()
  const fmt = useNumberFormat()

  const clouds = STATS_ORDER.map((id) => [id, STATS_CLOUDS[id]] as const)

  const rotuloTier = (tier: StatsTier) =>
    tier.labelKey ? t(tier.labelKey as TranslationKey) : tier.label

  // Datas de frescor: a mais antiga é a garantia real do catálogo, não a mais bonita.
  const datas = DATA_SYNC.map((d) => d.lastSynced).sort()
  const sync = [...DATA_SYNC].sort((a, b) => a.lastSynced.localeCompare(b.lastSynced))

  const pctPriv = (c: StatsCloud) => (c.total ? (c.privileged / c.total) * 100 : 0)

  // Uma linha por cloud, no idioma em que a pessoa está lendo.
  const exportRows = clouds.map(([id, c]) => ({
    platform: c.label,
    unit: c.unit,
    total: c.total,
    privileged: c.privileged,
    privilegedShare: `${pctPriv(c).toFixed(1)}%`,
    tier0: c.eam[0],
    tier1: c.eam[1],
    tier2: c.eam[2],
    sizeMedian: c.size.median ?? '',
    sizeMax: c.size.max ?? '',
    sizeBasis: c.size.basis,
    sizeBasisNote: t(BASIS_KEY[c.size.basis]),
    indexedPermissions: c.top.permissions,
    topPermission: c.top.items[0]?.permission ?? '',
    topPermissionRoles: c.top.items[0]?.roles ?? '',
    sodRules: STATS_SOD.platforms.find((p) => p.label === c.label)?.rules ?? 0,
    id,
  }))

  return (
    <AppShell
      headerTitle={t('stats.headerTitle')}
      headerSub={t('stats.headerSub')}
      headerActions={
        <div className="flex items-center gap-3">
          <ClassificationBadge className="hidden sm:inline-flex" />
          <ExportButton filename="iam-scope-stats" data={exportRows} />
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl px-4 sm:px-6 py-6 space-y-10">

          {/* ── Panorama ───────────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-note text-fg-muted leading-relaxed">
              <Rich text={t('stats.lead')} className="text-fg" />
            </p>
            <Nota>
              <Rich text={t('stats.leadCaveat')} className="text-fg" codeClassName="font-mono text-3xs" />
            </Nota>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              {[
                { label: t('stats.kpiClouds'),     value: STATS_TOTALS.clouds,     href: '/info',     tone: 'neutral' as const },
                { label: t('stats.kpiCatalog'),    value: STATS_TOTALS.roles,      href: '/search',   tone: 'accent'  as const },
                { label: t('stats.kpiPrivileged'), value: STATS_TOTALS.privileged, href: '/search',   tone: 'danger'  as const },
                { label: t('stats.kpiTierZero'),   value: STATS_TOTALS.tierZero,   href: '/tier-comparison', tone: 'neutral' as const },
                { label: t('stats.kpiSod'),        value: SOD_RULES_COUNT,         href: '/sod',      tone: 'neutral' as const },
              ].map((s) => (
                <Link key={s.label} href={s.href}
                  className="flex flex-col justify-between gap-2 min-w-0 bg-surface border border-line rounded-lg p-3 sm:p-4 hover:border-line-strong transition-colors group">
                  <p className="text-3xs text-fg-muted uppercase tracking-wider flex items-start gap-1 leading-snug">
                    <span className="min-w-0 break-words">{s.label}</span>
                    <ChevronRight size={10} className="reveal-on-hover shrink-0 mt-0.5" />
                  </p>
                  <p className={`text-stat font-bold leading-none ${KPI_TONE[s.tone]}`}>{fmt(s.value)}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Enterprise Access Model ────────────────────────────────── */}
          <Section title={t('stats.eamTitle')}>
            <p className="text-note text-fg-muted leading-relaxed">
              {t('stats.eamIntro').split('{compare}')[0]}
              <Link href="/tier-comparison" className="text-accent hover:underline">Tier 0 Comparison</Link>
              {t('stats.eamIntro').split('{compare}')[1]}
            </p>

            <Card className="space-y-4">
              {/* Legenda antes das barras: o rótulo precede a cor, nunca o contrário. */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {NIVEIS.map((n) => (
                  <span key={n} className="flex items-center gap-1.5 text-3xs text-fg-muted">
                    <span className="w-3 h-2 rounded-sm shrink-0" style={{ background: EAM_FILL[n] }} />
                    <span className="font-medium text-fg">Tier {n}</span>
                    <span>· {t(EAM_LABEL[n])}</span>
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                {clouds.map(([id, c]) => (
                  <div key={id}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <Link href={c.href} className="text-tiny font-medium text-fg hover:text-accent hover:underline">{c.label}</Link>
                      <span className="text-3xs text-fg-muted tabular-nums">
                        {NIVEIS.map((n) => `${fmt(c.eam[n])}`).join(' · ')}
                        <span className="text-fg-subtle"> / {fmt(c.total)}</span>
                      </span>
                    </div>
                    {/* Vão de 2px entre segmentos: é ele que separa os dois neutros. */}
                    <div className="flex gap-0.5 h-2">
                      {NIVEIS.map((n) => {
                        const pct = c.total ? (c.eam[n] / c.total) * 100 : 0
                        if (!pct) return null
                        return (
                          <span key={n} className="h-full rounded-sm first:rounded-l-full last:rounded-r-full"
                            style={{ width: `${pct}%`, background: EAM_FILL[n] }}
                            title={`Tier ${n} — ${fmt(c.eam[n])}`} />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Nota>
              <Rich text={t('stats.eamCaveat')} className="text-fg" codeClassName="font-mono text-3xs" />
            </Nota>
          </Section>

          {/* ── Tiers nativos ──────────────────────────────────────────── */}
          <Section title={t('stats.tierTitle')}>
            <p className="text-note text-fg-muted leading-relaxed">{t('stats.tierIntro')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {clouds.map(([id, c]) => {
                const visiveis = c.tiers.filter((x) => x.count > 0)
                const maior = Math.max(1, ...visiveis.map((x) => x.count))
                return (
                  <Card key={id} className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={c.href} className="text-tiny font-semibold text-fg hover:text-accent hover:underline">{c.label}</Link>
                      <span className="text-3xs text-fg-muted tabular-nums">{fmt(c.total)}</span>
                    </div>
                    <div className="space-y-2">
                      {visiveis.map((tier) => (
                        <div key={tier.tier}>
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="text-3xs text-fg-muted truncate">{rotuloTier(tier)}</span>
                            <span className="text-3xs font-semibold text-fg tabular-nums">{fmt(tier.count)}</span>
                          </div>
                          <Barra pct={(tier.count / maior) * 100} fill={tier.color} />
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          </Section>

          {/* ── Privilegiadas ──────────────────────────────────────────── */}
          <Section title={t('stats.privTitle')}>
            <p className="text-note text-fg-muted leading-relaxed">
              {t('stats.privIntro')}
            </p>

            <Card>
              <div className="space-y-3">
                {clouds.map(([id, c]) => {
                  const pct = pctPriv(c)
                  return (
                    <div key={id}>
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <Link href={c.href} className="text-tiny font-medium text-fg hover:text-accent hover:underline">{c.label}</Link>
                        <span className="text-3xs tabular-nums">
                          <span className="font-semibold text-danger">{fmt(c.privileged)}</span>
                          <span className="text-fg-muted"> / {fmt(c.total)} · {pct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <Barra pct={pct} fill="rgb(var(--c-danger))" />
                    </div>
                  )
                })}
              </div>
            </Card>
          </Section>

          {/* ── Top de permissões ──────────────────────────────────────── */}
          <Section title={t('stats.topTitle')}>
            <p className="text-note text-fg-muted leading-relaxed">{t('stats.topIntro')}</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {clouds.map(([id, c]) => {
                const maior = Math.max(1, ...c.top.items.map((i) => i.roles))
                return (
                  <Card key={id} className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={c.href} className="text-tiny font-semibold text-fg hover:text-accent hover:underline">{c.label}</Link>
                      {c.top.permissions > 0 && (
                        <span className="text-3xs text-fg-muted tabular-nums">
                          {fmt(c.top.permissions)} {t('noun.permissions')}
                        </span>
                      )}
                    </div>

                    {c.top.basis === 'none' ? (
                      <Nota>
                        {t('stats.topBasisNone').split('{scope}')[0]}
                        <Link href="/permission-scope" className="text-accent hover:underline">Permission Scope</Link>
                        {t('stats.topBasisNone').split('{scope}')[1]}
                      </Nota>
                    ) : (
                      <>
                        <ol className="space-y-1.5">
                          {c.top.items.map((item) => (
                            <li key={item.permission}>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-mono text-3xs text-fg-muted truncate min-w-0" title={item.permission}>
                                  {item.permission}
                                  {item.isPattern && (
                                    <span className="ml-1.5 font-sans not-italic text-2xs uppercase tracking-wider text-fg-subtle border border-line rounded px-1 py-px align-middle">
                                      {t('stats.topPattern')}
                                    </span>
                                  )}
                                </span>
                                <span className="text-3xs font-semibold text-fg tabular-nums shrink-0">{fmt(item.roles)}</span>
                              </div>
                              <Barra pct={(item.roles / maior) * 100} fill="rgb(var(--c-fg-muted))" />
                            </li>
                          ))}
                        </ol>
                        {c.top.basis === 'declared' && (
                          <Nota>
                            {t('stats.topBasisDeclared')
                              .replace('{n}', fmt(c.size.patternRoles))
                              .replace('{a}', fmt(c.total))}
                          </Nota>
                        )}
                      </>
                    )}
                  </Card>
                )
              })}
            </div>

            <Nota>
              <Rich text={t('stats.topPatternNote')} className="text-fg" codeClassName="font-mono text-3xs" />
            </Nota>
          </Section>

          {/* ── Tamanho de role ────────────────────────────────────────── */}
          <Section title={t('stats.sizeTitle')}>
            <p className="text-note text-fg-muted leading-relaxed">{t('stats.sizeIntro')}</p>
            <Nota tone="warn"><Rich text={t('stats.sizeWarn')} className="text-fg" /></Nota>

            <div className="overflow-x-auto border border-line rounded-xl">
              <table className="w-full text-tiny">
                <thead className="bg-surface-alt">
                  <tr className="text-left text-3xs uppercase tracking-wider text-fg-muted">
                    <th className="px-4 py-2 font-semibold">{t('stats.colCloud')}</th>
                    <th className="px-4 py-2 font-semibold text-right">{t('stats.colMedian')}</th>
                    <th className="px-4 py-2 font-semibold text-right">{t('stats.colMax')}</th>
                    <th className="px-4 py-2 font-semibold">{t('stats.colBasis')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clouds.map(([id, c]) => {
                    // O `≥` do Azure não é enfeite: o efetivo é um piso, e a
                    // interface diz isso onde o número aparece — não só no tooltip.
                    const prefixo = c.size.basis === 'effective' ? '≥ ' : ''
                    return (
                      <tr key={id} className="border-t border-line align-top">
                        <td className="px-4 py-2.5">
                          <Link href={c.href} className="font-medium text-fg hover:text-accent hover:underline">{c.label}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-fg whitespace-nowrap">
                          {c.size.median === null ? <span className="text-fg-subtle font-normal">—</span> : `${prefixo}${fmt(c.size.median)}`}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-fg whitespace-nowrap">
                          {c.size.max === null ? <span className="text-fg-subtle font-normal">—</span> : `${prefixo}${fmt(c.size.max)}`}
                        </td>
                        <td className="px-4 py-2.5 text-3xs text-fg-muted">
                          <Rich text={t(BASIS_KEY[c.size.basis])} className="text-fg" codeClassName="font-mono" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <Nota>
                <Rich
                  text={t('stats.sizeEffective')
                    .replace('{n}', fmt(STATS_AZURE_UNIVERSE.actions))
                    .replace('{p}', fmt(STATS_AZURE_UNIVERSE.providers))}
                  className="text-fg" codeClassName="font-mono text-3xs"
                />
              </Nota>
              <Nota tone="warn">
                <Rich
                  text={t('stats.sizeEntries')
                    .replace('{n}', fmt(STATS_CLOUDS.aws.size.patternRoles))
                    .replace('{a}', fmt(STATS_CLOUDS.aws.total))}
                  className="text-fg" codeClassName="font-mono text-3xs"
                />
              </Nota>
              {clouds.filter(([, c]) => c.size.excluded > 0 && c.size.basis !== 'none').map(([id, c]) => (
                <Nota key={id}>
                  <span className="font-medium text-fg">{c.label}</span>{' — '}
                  {t('stats.sizeExcluded').replace('{n}', fmt(c.size.excluded))}
                </Nota>
              ))}
            </div>
          </Section>

          {/* ── SoD ────────────────────────────────────────────────────── */}
          <Section title={t('stats.sodTitle')}>
            <p className="text-note text-fg-muted leading-relaxed">
              <Rich text={t('stats.sodIntro')} className="text-fg" />
            </p>

            <Card>
              <div className="space-y-3">
                {STATS_SOD.platforms.map((p) => (
                  <div key={p.platform}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <Link href="/sod/rules" className="text-tiny font-medium text-fg hover:text-accent hover:underline">{p.label}</Link>
                      <span className="text-3xs text-fg-muted tabular-nums">
                        <span className="font-semibold text-fg">{fmt(p.rules)}</span> {t('noun.rules')}
                        {p.cross > 0 && <> · {fmt(p.cross)} {t('stats.sodCross')}</>}
                        {' · '}{fmt(p.roles)} {t('stats.sodRolesCovered')}
                      </span>
                    </div>
                    <Barra pct={(p.rules / STATS_SOD.total) * 100} fill="rgb(var(--c-fg-muted))" />
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-2">
              <Nota><Rich text={t('stats.sodNoCross')} className="text-fg" /></Nota>
              <Nota><Rich text={t('stats.sodSample')} className="text-fg" /></Nota>
              <Nota tone="warn">
                {t('stats.sodUncovered').replace(
                  '{n}',
                  STATS_SOD.uncoveredClouds.map((c) => STATS_CLOUDS[c as StatsCloudId].label).join(', '),
                )}
              </Nota>
            </div>
          </Section>

          {/* ── Frescor ────────────────────────────────────────────────── */}
          <Section title={t('stats.freshTitle')}>
            <p className="text-note text-fg-muted leading-relaxed">{t('stats.freshIntro')}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-3xs text-fg-muted">
              <span>{t('stats.freshOldest')}: <span className="font-mono text-fg">{datas[0]}</span></span>
              <span>{t('stats.freshNewest')}: <span className="font-mono text-fg">{datas[datas.length - 1]}</span></span>
            </div>

            <div className="overflow-x-auto border border-line rounded-xl">
              <table className="w-full text-tiny">
                <thead className="bg-surface-alt">
                  <tr className="text-left text-3xs uppercase tracking-wider text-fg-muted">
                    <th className="px-4 py-2 font-semibold">{t('stats.colDataset')}</th>
                    <th className="px-4 py-2 font-semibold whitespace-nowrap">{t('stats.colChecked')}</th>
                    <th className="px-4 py-2 font-semibold">{t('stats.colSource')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sync.map((d) => (
                    <tr key={d.id} className="border-t border-line align-top">
                      {/* `label` é dado do syncMeta e sai verbatim: é ele que o
                          check-stale-numbers confere contra counts.ts. */}
                      <td className="px-4 py-2.5 text-fg">{d.label}</td>
                      <td className="px-4 py-2.5 font-mono text-3xs text-fg-muted whitespace-nowrap">{d.lastSynced}</td>
                      <td className="px-4 py-2.5 text-3xs text-fg-muted">
                        <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          {d.sourceLabel}
                        </a>
                        {d.sourceRef && <span className="block text-fg-subtle">{d.sourceRef}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

        </div>
      </div>
    </AppShell>
  )
}
