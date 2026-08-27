'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  History, Rss, FileJson, AlertTriangle, HelpCircle, ArrowRight,
  Plus, Minus, PenLine, Tag, ShieldAlert, Flag, EyeOff, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppShell from '@/components/AppShell'
import ClassificationBadge from '@/components/ClassificationBadge'
import { useT, useLanguage } from '@/i18n/LanguageProvider'
import type { TranslationKey } from '@/i18n/dictionary'
import type {
  ChangeEvent, ChangelogMeta, ChangeCloud, ChangeType,
} from '@/lib/changelog'
import { CHANGE_CLOUDS, CLOUD_ROUTE } from '@/lib/changelog'

/**
 * A página do changelog — global (`/changelog`) e por nuvem (`/changelog/[cloud]`).
 *
 * UM COMPONENTE, DUAS ROTAS
 *   A diferença entre as duas telas é um filtro de nuvem travado e a lista de
 *   feeds. Duplicar o componente garantiria que as duas divergissem na primeira
 *   mudança de filtro — foi exatamente o que aconteceu com os mapas de tier
 *   antes de existir o eamLevels.ts.
 *
 * A RESSALVA FICA NA PÁGINA, NÃO NO COMMIT
 *   O histórico começa no dia em que a captura foi ligada. Um changelog que não
 *   diz isso deixa o leitor supor que "nenhuma mudança listada antes de agosto"
 *   significa "nada mudou antes de agosto". O texto vem do próprio
 *   changelog.json, e não daqui, para que página, feed e API não possam
 *   divergir dele.
 *
 * TRÊS PROCEDÊNCIAS, TRÊS MARCAS
 *   provider-fact      a Microsoft/AWS/Google/IBM mudou algo
 *   iamscope-editorial a nossa classificação mudou — nenhum provedor publica isso
 *   iamscope-process   fato sobre a coleta (início do histórico, cobertura, dúvida)
 *   Misturar os três sem marcar seria o mesmo defeito que o ClassificationBadge
 *   existe para corrigir nas páginas de detalhe.
 */

const ICONE: Record<ChangeType, LucideIcon> = {
  'created': Plus,
  'removed': Minus,
  'renamed': PenLine,
  'description-changed': PenLine,
  'permissions-changed': Tag,
  'tier-changed': ArrowRight,
  'category-changed': Tag,
  'privilege-changed': ShieldAlert,
  'sod-changed': ShieldAlert,
  'genesis': Flag,
  'coverage-changed': EyeOff,
  'unknown': HelpCircle,
  'dataset-recollected': History,
  'dataset-corrected': Wrench,
}

/**
 * Os três tipos que ganham cor.
 *
 * O site é monocromático desde 06/08/2026 — cor de decoração saiu inteira. A
 * exceção registrada é a escala de severidade do SoD, "onde a escala inteira é
 * a informação". Aqui vale o mesmo raciocínio, e só para o que é AVISO:
 * `unknown` e `coverage-changed` dizem que o dado pode estar errado, e
 * `removed` é a única mudança irreversível. Neutralizar um aviso real é perda
 * de sinal. Os outros onze tipos são neutros.
 */
const DESTAQUE: Partial<Record<ChangeType, string>> = {
  'unknown': 'text-danger',
  'coverage-changed': 'text-danger',
  'removed': 'text-danger',
}

const PERIODOS = [
  { id: 'all', dias: null },
  { id: '30', dias: 30 },
  { id: '90', dias: 90 },
  { id: '365', dias: 365 },
] as const
type PeriodoId = typeof PERIODOS[number]['id']

const PERIODO_LABEL: Record<PeriodoId, TranslationKey> = {
  'all': 'chg.periodAll', '30': 'chg.periodThirty', '90': 'chg.periodNinety', '365': 'chg.periodYear',
}

export default function ChangelogView({
  events, meta, cloud, truncated,
}: {
  events: ChangeEvent[]
  meta: ChangelogMeta
  /** Travado numa nuvem em /changelog/[cloud]; nulo na página global. */
  cloud: ChangeCloud | null
  /** O build cortou eventos para não inchar o HTML? */
  truncated: number
}) {
  const t = useT()
  const { lang } = useLanguage()

  const [tipos, setTipos] = useState<Set<ChangeType>>(new Set())
  const [nuvens, setNuvens] = useState<Set<ChangeCloud>>(new Set())
  const [periodo, setPeriodo] = useState<PeriodoId>('all')
  const [origem, setOrigem] = useState<'all' | 'derived' | 'attested'>('all')

  /**
   * O corte de período usa a data do evento mais NOVO como referência, não
   * `Date.now()`.
   *
   * Com `output: 'export'` o HTML é gerado uma vez, no build. Se o corte
   * dependesse do relógio do visitante, "últimos 30 dias" mostraria uma lista
   * cheia no dia do deploy e vazia três meses depois, sem nada ter mudado — e
   * o filtro pareceria quebrado. Ancorar no dado torna o filtro reprodutível.
   */
  const dataMaisNova = events[0]?.date ?? null

  const tiposPresentes = useMemo(() => {
    const vistos = new Map<ChangeType, number>()
    for (const e of events) vistos.set(e.type, (vistos.get(e.type) ?? 0) + 1)
    return [...vistos.entries()].sort((a, b) => b[1] - a[1])
  }, [events])

  const filtrados = useMemo(() => {
    let limite: string | null = null
    const dias = PERIODOS.find((p) => p.id === periodo)?.dias
    if (dias && dataMaisNova) {
      const d = new Date(`${dataMaisNova}T00:00:00Z`)
      d.setUTCDate(d.getUTCDate() - dias)
      limite = d.toISOString().slice(0, 10)
    }
    return events.filter((e) => {
      if (tipos.size && !tipos.has(e.type)) return false
      if (!cloud && nuvens.size && !nuvens.has(e.cloud)) return false
      if (origem !== 'all' && e.origin !== origem) return false
      if (limite && e.date < limite) return false
      return true
    })
  }, [events, tipos, nuvens, origem, periodo, dataMaisNova, cloud])

  const porData = useMemo(() => {
    const mapa = new Map<string, ChangeEvent[]>()
    for (const e of filtrados) {
      const lista = mapa.get(e.date)
      if (lista) lista.push(e); else mapa.set(e.date, [e])
    }
    return [...mapa.entries()]
  }, [filtrados])

  const rotuloTipo = (tipo: string) =>
    (lang === 'en' ? meta.typeLabelsEn?.[tipo] : meta.typeLabels?.[tipo]) ?? tipo

  const alterna = <T,>(conjunto: Set<T>, valor: T, set: (s: Set<T>) => void) => {
    const novo = new Set(conjunto)
    if (novo.has(valor)) novo.delete(valor); else novo.add(valor)
    set(novo)
  }

  const nomeDaNuvem = cloud ? (meta.cloudLabels?.[cloud] ?? cloud) : null
  const feedBase = cloud ?? 'all'

  // O AppShell não recebe plataforma por prop: ele deriva do pathname, e página
  // global é a que está em GLOBAL_HREFS (Sidebar.tsx). É por isso que
  // '/changelog' foi acrescentado à lista TOOLS de lá — sem isso a rota cairia
  // no fallback 'entraId' e a sidebar mostraria Built-in Roles e PIM do Entra
  // ID ao lado de uma tela das seis nuvens.
  return (
    <AppShell
      headerTitle={cloud ? `${t('chg.title')} — ${nomeDaNuvem}` : t('chg.title')}
      headerSub={cloud ? t('chg.subCloud') : t('chg.sub')}
      headerActions={
        <div className="flex items-center gap-3">
          <ClassificationBadge className="hidden sm:inline-flex" />
          <a
            href={`/feeds/${feedBase}.xml`}
            className="flex items-center gap-1.5 text-3xs text-fg-muted hover:text-accent transition-colors duration-fast"
          >
            <Rss size={14} />
            <span className="hidden sm:inline">{t('chg.feedLink')}</span>
          </a>
        </div>
      }
    >
      {/* AppShell's <main> is `flex flex-1 min-h-0` — it deliberately has no
          overflow of its own; every page supplies its own scroll region as the
          direct child. This one didn't, so content past the viewport was
          silently clipped by the shell's outer `overflow-hidden` with no
          scrollbar at all. Same wrapper every other AppShell page uses. */}
      <div className="flex-1 overflow-y-auto">
      <div className="space-y-6">

        {/* ── A ressalva. Primeiro elemento da página, de propósito. ───────── */}
        <section
          aria-labelledby="chg-ressalva"
          className="rounded-card border border-line bg-surface-alt p-4"
        >
          <h2 id="chg-ressalva" className="flex items-center gap-2 text-note font-semibold text-fg mb-2">
            <Flag size={15} className="shrink-0 text-fg-subtle" />
            {t('chg.disclosureTitle')}
          </h2>
          <p className="text-body text-fg-muted max-w-3xl">
            {meta.disclosure?.[lang] ?? meta.disclosure?.pt}
          </p>
        </section>

        {/* ── Números do processo ──────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Estatistica rotulo={t('chg.statEvents')} valor={String(meta.counts?.total ?? 0)} />
          <Estatistica
            rotulo={t('chg.statSince')}
            valor={meta.firstObservedAt ?? '—'}
            nota={t('chg.statSinceNote')}
          />
          <Estatistica
            rotulo={t('chg.statAttested')}
            valor={String(meta.counts?.attested ?? 0)}
            nota={t('chg.statAttestedNote')}
          />
          <Estatistica
            rotulo={t('chg.statQuarantine')}
            valor={String(meta.quarantineOpen ?? 0)}
            nota={t('chg.statQuarantineNote')}
            alerta={(meta.quarantineOpen ?? 0) > 0}
          />
        </section>

        {/* ── Assinar ──────────────────────────────────────────────────────── */}
        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 text-note font-semibold text-fg mb-1">
            <Rss size={15} className="shrink-0 text-fg-subtle" />
            {t('chg.feedTitle')}
          </h2>
          <p className="text-tiny text-fg-muted mb-3 max-w-3xl">{t('chg.feedHint')}</p>
          <div className="flex flex-wrap gap-2">
            <LinkDeFeed href={`/feeds/${feedBase}.xml`} rotulo={cloud ? `${nomeDaNuvem}` : t('chg.feedAll')} />
            {cloud && <LinkDeFeed href={`/feeds/${cloud}-privileged.xml`} rotulo={t('chg.feedPriv')} destaque />}
            {!cloud && CHANGE_CLOUDS.map((c) => (
              <LinkDeFeed key={c} href={`/feeds/${c}-privileged.xml`}
                rotulo={`${meta.cloudLabels?.[c] ?? c} · ${t('chg.feedPrivShort')}`} destaque />
            ))}
            <Link
              href="/api/v1/changes.json"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-alt
                         px-3 py-1 text-3xs text-fg-muted hover:text-fg hover:border-line-strong
                         transition-colors duration-fast"
            >
              <FileJson size={12} />
              {t('chg.apiLink')}
            </Link>
          </div>
        </section>

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <section aria-label={t('chg.filters')} className="space-y-3">
          {!cloud && (
            <GrupoDeFiltro rotulo={t('chg.filterCloud')}>
              {CHANGE_CLOUDS.map((c) => (
                <Chip
                  key={c}
                  ativo={nuvens.has(c)}
                  onClick={() => alterna(nuvens, c, setNuvens)}
                  rotulo={meta.cloudLabels?.[c] ?? c}
                  contagem={events.filter((e) => e.cloud === c).length}
                />
              ))}
            </GrupoDeFiltro>
          )}

          <GrupoDeFiltro rotulo={t('chg.filterType')}>
            {tiposPresentes.map(([tipo, n]) => (
              <Chip
                key={tipo}
                ativo={tipos.has(tipo)}
                onClick={() => alterna(tipos, tipo, setTipos)}
                rotulo={rotuloTipo(tipo)}
                contagem={n}
                alerta={!!DESTAQUE[tipo]}
              />
            ))}
          </GrupoDeFiltro>

          <div className="flex flex-wrap gap-6">
            <GrupoDeFiltro rotulo={t('chg.filterPeriod')}>
              {PERIODOS.map((p) => (
                <Chip
                  key={p.id}
                  ativo={periodo === p.id}
                  onClick={() => setPeriodo(p.id)}
                  rotulo={t(PERIODO_LABEL[p.id])}
                />
              ))}
            </GrupoDeFiltro>

            <GrupoDeFiltro rotulo={t('chg.filterOrigin')}>
              {(['all', 'derived', 'attested'] as const).map((o) => (
                <Chip
                  key={o}
                  ativo={origem === o}
                  onClick={() => setOrigem(o)}
                  rotulo={o === 'all' ? t('chg.originAll') : o === 'derived' ? t('chg.originDerived') : t('chg.originAttested')}
                />
              ))}
            </GrupoDeFiltro>
          </div>

          <p className="text-3xs text-fg-subtle">
            {t('chg.showing').replace('{n}', String(filtrados.length)).replace('{total}', String(events.length))}
            {periodo !== 'all' && dataMaisNova && (
              <> · {t('chg.periodAnchor').replace('{d}', dataMaisNova)}</>
            )}
          </p>
        </section>

        {/* ── A lista ──────────────────────────────────────────────────────── */}
        {porData.length === 0 ? (
          <p className="rounded-card border border-line bg-surface p-6 text-body text-fg-muted">
            {events.length === 0 ? t('chg.emptyBuild') : t('chg.noResults')}
          </p>
        ) : (
          <div className="space-y-5">
            {porData.map(([data, doDia]) => (
              <section key={data}>
                <h2 className="sticky top-0 z-sticky -mx-1 mb-2 bg-app/95 px-1 py-1.5 text-3xs font-semibold uppercase tracking-wider text-fg-subtle backdrop-blur">
                  {data}
                </h2>
                <ul className="divide-y divide-line rounded-card border border-line bg-surface">
                  {doDia.map((e) => (
                    <LinhaDeEvento key={e.id} evento={e} rotuloTipo={rotuloTipo} meta={meta} mostraNuvem={!cloud} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {truncated > 0 && (
          <p className="text-tiny text-fg-muted">
            {t('chg.truncated').replace('{n}', String(truncated))}{' '}
            <Link href="/api/v1/changes.json" prefetch={false} className="text-accent hover:underline">
              /api/v1/changes.json
            </Link>
          </p>
        )}

        {cloud && (
          <p className="text-tiny text-fg-muted">
            <Link href={CLOUD_ROUTE[cloud]} className="text-accent hover:underline">
              {t('chg.backToCloud').replace('{c}', nomeDaNuvem ?? cloud)}
            </Link>
            {' · '}
            <Link href="/changelog" className="text-accent hover:underline">{t('chg.allClouds')}</Link>
          </p>
        )}
      </div>
      </div>
    </AppShell>
  )
}

// ── Peças ────────────────────────────────────────────────────────────────────

function LinhaDeEvento({
  evento, rotuloTipo, meta, mostraNuvem,
}: {
  evento: ChangeEvent
  rotuloTipo: (tipo: string) => string
  meta: ChangelogMeta
  mostraNuvem: boolean
}) {
  // `t` e `lang` vêm dos hooks aqui dentro, não por prop. Passá-los por prop
  // era sintaxe válida e o TypeScript aprovava — mas o check-i18n-scope.js
  // reprova, e com razão: a regra do projeto é que todo t('...') viva no mesmo
  // escopo do `const t = useT()` que o declara, porque hook no lugar errado só
  // aparece como erro no next build.
  const t = useT()
  const { lang } = useLanguage()
  const Icone = ICONE[evento.type] ?? History
  const destaque = DESTAQUE[evento.type] ?? 'text-fg-subtle'
  const texto = evento.summary?.[lang] ?? evento.summary?.pt ?? ''

  return (
    <li className="flex gap-3 p-3">
      <Icone size={15} className={`mt-0.5 shrink-0 ${destaque}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {mostraNuvem && (
            <span className="text-3xs font-medium text-fg-subtle">
              {meta.cloudLabels?.[evento.cloud] ?? evento.cloud}
            </span>
          )}
          <span className={`text-3xs font-semibold ${DESTAQUE[evento.type] ?? 'text-fg-muted'}`}>
            {rotuloTipo(evento.type)}
          </span>
          {evento.route ? (
            <Link href={evento.route} className="truncate text-body font-medium text-accent hover:underline">
              {evento.itemName}
            </Link>
          ) : (
            <span className="truncate text-body font-medium text-fg">{evento.itemName}</span>
          )}
          {/* Procedência: sempre visível, nunca só no tooltip. */}
          {evento.classification === 'iamscope-editorial' && (
            <Marca titulo={t('chg.editorialTip')}>{t('chg.editorialTag')}</Marca>
          )}
          {evento.classification === 'iamscope-process' && (
            <Marca titulo={t('chg.processTip')}>{t('chg.processTag')}</Marca>
          )}
          {evento.origin === 'attested' && (
            <Marca titulo={t('chg.attestedTip')}>{t('chg.attestedTag')}</Marca>
          )}
        </div>

        <p className="text-tiny text-fg-muted">{texto}</p>

        {/* Amostra do que ficou retido — sem ela o `unknown` é só uma contagem. */}
        {evento.sample && evento.sample.length > 0 && (
          <p className="mt-1 font-mono text-2xs text-fg-subtle">
            {evento.sample.join(' · ')}
            {evento.count && evento.count > evento.sample.length && ` … +${evento.count - evento.sample.length}`}
          </p>
        )}

        {evento.source && (
          <p className="mt-1 text-2xs text-fg-subtle">
            {t('chg.sourceLabel')}: <span className="font-mono">{evento.source.path}</span>
          </p>
        )}
      </div>
    </li>
  )
}

function Marca({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <span
      title={titulo}
      className="inline-flex cursor-help items-center rounded-full border border-line bg-surface-alt
                 px-1.5 py-0.5 text-micro font-medium text-fg-subtle"
    >
      {children}
    </span>
  )
}

function Estatistica({ rotulo, valor, nota, alerta }: {
  rotulo: string; valor: string; nota?: string; alerta?: boolean
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <p className="text-3xs uppercase tracking-wider text-fg-subtle">{rotulo}</p>
      <p className={`text-stat font-semibold ${alerta ? 'text-danger' : 'text-fg'}`}>
        {alerta && <AlertTriangle size={16} className="mr-1 inline align-baseline" aria-hidden />}
        {valor}
      </p>
      {nota && <p className="mt-0.5 text-2xs text-fg-subtle">{nota}</p>}
    </div>
  )
}

function GrupoDeFiltro({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-3xs font-semibold uppercase tracking-wider text-fg-subtle">{rotulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({ ativo, onClick, rotulo, contagem, alerta }: {
  ativo: boolean; onClick: () => void; rotulo: string; contagem?: number; alerta?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-3xs
                  transition-colors duration-fast
                  ${ativo
                    ? 'border-accent bg-accent text-fg-onAccent'
                    : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg'}`}
    >
      {alerta && !ativo && <AlertTriangle size={10} className="text-danger" aria-hidden />}
      {rotulo}
      {contagem !== undefined && (
        <span className={ativo ? 'opacity-75' : 'text-fg-subtle'}>{contagem}</span>
      )}
    </button>
  )
}

function LinkDeFeed({ href, rotulo, destaque }: { href: string; rotulo: string; destaque?: boolean }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-3xs
                  transition-colors duration-fast
                  ${destaque
                    ? 'border-line-strong bg-surface text-fg hover:border-accent'
                    : 'border-line bg-surface-alt text-fg-muted hover:text-fg hover:border-line-strong'}`}
    >
      <Rss size={12} className="shrink-0" />
      {rotulo}
    </a>
  )
}
