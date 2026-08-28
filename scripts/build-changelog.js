#!/usr/bin/env node
/**
 * Deriva os eventos do changelog a partir dos snapshots e publica as saídas.
 *
 * ENTRADA
 *   data/snapshots/{cloud}/{data}.json   estado gravado por build-snapshot.js
 *   data/changelog/attested.json         eventos históricos atestados à mão
 *
 * SAÍDA
 *   public/changelog.json                todos os eventos (as páginas leem daqui)
 *   public/feeds/*.xml                   13 feeds Atom
 *   public/api/v1/changes.json           a API, no envelope da Fase 1
 *   data/changelog/quarantine.json       remoções retidas para revisão humana
 *
 * OS QUATORZE TIPOS DE EVENTO, EM TRÊS PROCEDÊNCIAS
 *   provider-fact — qualquer catálogo poderia emitir, é fato de quem publica:
 *     created · removed · renamed · description-changed · permissions-changed
 *   iamscope-editorial — curadoria NOSSA, só nós temos como emitir:
 *     tier-changed · category-changed · privilege-changed · sod-changed
 *     dataset-recollected · dataset-corrected  (só em eventos atestados)
 *   iamscope-process — fato sobre a coleta, e existem para o changelog não mentir:
 *     genesis · coverage-changed · unknown
 *
 *   A procedência sai no evento, no feed (como <category>) e na API. Misturar
 *   as três sem marcar seria o mesmo defeito que o ClassificationBadge existe
 *   para corrigir nas páginas de detalhe.
 *
 * A REGRA QUE IMPEDE A MENTIRA MAIS CARA
 *   Um coletor que falha parcialmente produz um dataset menor, e um dataset
 *   menor parece "roles removidas". fetch-azure-roles-official.js já reporta
 *   404 em três páginas (mixed-reality, virtual-desktop-infrastructure, other)
 *   e reescreve o dataset assim mesmo. Se o primeiro changelog anunciar uma
 *   exclusão em massa que não aconteceu, o dano à credibilidade é maior do que
 *   o benefício de todo o resto — este é um site que existe para ser citado.
 *
 *   Duas defesas, deliberadamente independentes:
 *
 *   1. COBERTURA DECLARADA. Se a coleção do lado novo tem
 *      `coverage.complete === false`, nenhuma remoção sai dela. Sai um
 *      `unknown` dizendo quantos itens sumiram e o que o coletor não conseguiu
 *      ler. Depende de o coletor declarar.
 *
 *   2. LIMIAR DE REMOÇÃO EM MASSA. Remoções acima de max(5, 2% do catálogo)
 *      numa única transição são retidas em data/changelog/quarantine.json,
 *      viram um `unknown`, e NÃO são publicadas até um humano liberar. Não
 *      depende de coletor nenhum — é a defesa que já funciona hoje, com os
 *      oito coletores como estão.
 *
 *   Liberar: acrescente a chave `{cloud}:{collection}:{data}` a
 *   data/changelog/confirmed-removals.json e rode de novo. check-changelog.js
 *   falha enquanto houver quarentena aberta e não confirmada.
 *
 * O GENESIS NÃO É UM CATÁLOGO DE NASCIMENTOS
 *   O primeiro snapshot de uma nuvem tem 504 roles que não existiam no snapshot
 *   anterior — porque não havia snapshot anterior. Emitir 504 `created` seria
 *   dizer que a Microsoft criou 504 roles no dia em que ligamos isto. O genesis
 *   emite UM evento por nuvem, com a contagem, e diz que o histórico começa ali.
 *
 * Uso:
 *   node scripts/build-changelog.js
 *   node scripts/build-changelog.js --dry-run
 */
const fs = require('fs')
const path = require('path')
const S = require('./lib/snapshot-schema')
const { envelope, EDITORIAL_FIELDS } = require('./lib/api-envelope')
const { snapshotDates, readSnapshot, resolveCollection } = require('./build-snapshot')

const ROOT = path.join(__dirname, '..')
const CHG_DIR = path.join(ROOT, 'data', 'changelog')
const PUBLIC = path.join(ROOT, 'public')
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://iamscope.cloud'

const DRY = process.argv.includes('--dry-run')

const readJson = (p, fb = null) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fb }
}

/** Limiar de remoção em massa: 5 itens, ou 2% do catálogo, o que for maior. */
const massRemovalLimit = (previousCount) => Math.max(5, Math.ceil(previousCount * 0.02))

/**
 * Tipos que descrevem o PROCESSO, não o catálogo.
 *
 * Ficaram fora de 'provider-fact' porque não são fato de provedor nenhum:
 * genesis diz quando começamos a olhar, unknown diz que não sabemos, e
 * coverage-changed diz que a coleta enxergou menos. Chamar isso de fato da
 * Microsoft seria a mesma confusão que a API evita ao separar nativo de
 * normalizado.
 */
const PROCESS_TYPES = new Set(['genesis', 'unknown', 'coverage-changed'])

/** Tipos que são curadoria nossa. Vira `classification` no evento e na API. */
// `dataset-*` entram aqui porque descrevem o NOSSO processamento, não o
// catálogo do provedor: uma recoleta ou uma correção de parser é fato sobre o
// IAM Scope. Só aparecem em eventos atestados.
const EDITORIAL_TYPES = new Set(['tier-changed', 'category-changed', 'privilege-changed', 'sod-changed',
  'dataset-recollected', 'dataset-corrected'])

const TYPE_LABEL = {
  'created': 'criada',
  'removed': 'removida',
  'renamed': 'renomeada',
  'description-changed': 'descrição alterada',
  'permissions-changed': 'permissões alteradas',
  'tier-changed': 'mudou de tier',
  'category-changed': 'mudou de categoria',
  'privilege-changed': 'mudou de privilégio',
  'sod-changed': 'regra de SoD',
  'genesis': 'início do histórico',
  'coverage-changed': 'cobertura da coleta',
  'unknown': 'desconhecido',
  'dataset-recollected': 'dataset recoletado',
  'dataset-corrected': 'correção de dado',
}

/**
 * Os mesmos rótulos em inglês.
 *
 * O FEED É EM INGLÊS, E ISSO É DECISÃO, NÃO DESCUIDO
 *   A página tem seletor de idioma; leitor de Atom não tem. Um feed misturando
 *   título em português com conteúdo em inglês — que foi o primeiro resultado
 *   aqui — é pior que qualquer um dos dois puro. O feed é a superfície que sai
 *   do site e vai para leitores do mundo inteiro, no mesmo lado da linha em que
 *   o ADR-001 põe os dados oficiais. A página, essa sim, fala os dois idiomas.
 */
const TYPE_LABEL_EN = {
  'created': 'created',
  'removed': 'removed',
  'renamed': 'renamed',
  'description-changed': 'description changed',
  'permissions-changed': 'permissions changed',
  'tier-changed': 'tier changed',
  'category-changed': 'category changed',
  'privilege-changed': 'privilege changed',
  'sod-changed': 'SoD rule',
  'genesis': 'history starts',
  'coverage-changed': 'collection coverage',
  'unknown': 'unknown',
  'dataset-recollected': 'dataset re-collected',
  'dataset-corrected': 'data correction',
}

/**
 * Texto de evento nos dois idiomas.
 *
 * POR QUE O RESUMO É BILÍNGUE E O DADO NÃO
 *   O ADR-001 manda os dados OFICIAIS ficarem em inglês sempre — nome de role,
 *   description, action. Isto aqui não é dado oficial: é prosa nossa, escrita
 *   para explicar o evento, e prosa nossa é interface. Interface é traduzida.
 *   Guardar as duas versões no evento (e não montar a frase na página) mantém
 *   página, feed e API dizendo exatamente a mesma coisa — se a frase fosse
 *   montada em três lugares, os três divergiriam.
 *
 *   Os nomes de role interpolados no meio da frase continuam em inglês nos dois
 *   idiomas, como manda o ADR-001.
 */
const bi = (pt, en) => ({ pt, en })

/**
 * Número por extenso, no separador de cada idioma: 17.605 em pt, 17,605 em en.
 *
 * Sem isto o genesis dizia "with 17605 Resource Provider Actions" — legível,
 * mas destoa do resto do site, que formata todo número acima de mil (é o que o
 * useNumberFormat.ts faz na interface). Aqui a formatação tem de acontecer na
 * geração, e não na página, porque a frase inteira já vem pronta nos dois
 * idiomas: é o preço de manter página, feed e API dizendo o mesmo.
 */
const numPt = (n) => Number(n).toLocaleString('pt-BR')
const numEn = (n) => Number(n).toLocaleString('en-US')

/** Rota da página de detalhe de um item, quando existe uma. */
function routeFor(cloud, collection, itemId) {
  const base = {
    'entraid:roles': '/entraid/roles/',
    'azure-rbac:roles': '/azure-rbac/roles/',
    'aws:policies': '/aws/policies/',
    'gcp:roles': '/gcp/roles/',
    'google-workspace:roles': '/google-workspace/roles/',
    'ibm-cloud:roles': '/ibm-cloud/roles/',
  }[`${cloud}:${collection}`]
  return base ? base + itemId : null
}

function makeEvent(base) {
  const ev = {
    ...base,
    origin: base.origin ?? 'derived',
    classification: PROCESS_TYPES.has(base.type) ? 'iamscope-process'
      : EDITORIAL_TYPES.has(base.type) ? 'iamscope-editorial'
        : 'provider-fact',
  }
  // O id precisa ser estável entre execuções: o feed usa como <id> da entrada,
  // e leitor de Atom marca "lido" por id. Um id que muda republica tudo.
  ev.id = [ev.cloud, ev.collection, ev.itemId ?? '_', ev.date, ev.type].join(':')
  return ev
}

// ── Diff de uma coleção entre dois snapshots ─────────────────────────────────

function diffCollection(cloud, meta, date, prev, next) {
  const events = []
  const quarantine = []

  const prevItems = new Map((prev.items ?? []).map(S.readItem).map((i) => [i.id, i]))
  const nextItems = new Map((next.items ?? []).map(S.readItem).map((i) => [i.id, i]))

  const coverageIncomplete = next.coverage?.complete === false
  const removedIds = [...prevItems.keys()].filter((id) => !nextItems.has(id))
  const addedIds = [...nextItems.keys()].filter((id) => !prevItems.has(id))

  const base = { date, cloud, collection: meta.id, collectionLabel: meta.label }

  // ── Mudança de cobertura é fato do processo, e sai antes de tudo ───────────
  const prevComplete = prev.coverage?.complete !== false
  if (prevComplete === coverageIncomplete) {
    events.push(makeEvent({
      ...base, type: 'coverage-changed', itemId: null,
      itemName: meta.label,
      complete: !coverageIncomplete,
      missing: next.coverage?.missing ?? [],
      reason: next.coverage?.reason ?? null,
      summary: coverageIncomplete
        ? bi(`A coleta passou a não enxergar parte da fonte (${(next.coverage?.missing ?? []).join(', ') || 'origem não declarada'}). `
             + 'Remoções desta coleção estão suspensas até a cobertura voltar.',
             `Collection stopped seeing part of the source (${(next.coverage?.missing ?? []).join(', ') || 'origin not declared'}). `
             + 'Removals from this collection are suspended until coverage is restored.')
        : bi('A coleta voltou a enxergar a fonte inteira.',
             'Collection can see the whole source again.'),
    }))
  }

  // ── Remoções: as duas defesas ─────────────────────────────────────────────
  const limit = massRemovalLimit(prevItems.size)
  const suspect = removedIds.length > limit
  const blocked = coverageIncomplete || suspect

  if (removedIds.length && blocked) {
    const faltou = (next.coverage?.missing ?? []).join(', ')
    const motivo = coverageIncomplete
      ? `cobertura parcial declarada pelo coletor (faltou: ${faltou || 'não declarado'})`
      : `${removedIds.length} remoções numa única transição, acima do limiar de ${limit} `
        + `(max(5, 2% de ${prevItems.size}))`
    const motivoEn = coverageIncomplete
      ? `partial coverage declared by the collector (missing: ${faltou || 'not declared'})`
      : `${removedIds.length} removals in a single transition, above the threshold of ${limit} `
        + `(max(5, 2% of ${prevItems.size}))`
    events.push(makeEvent({
      ...base, type: 'unknown', itemId: null,
      itemName: meta.label,
      count: removedIds.length,
      reason: motivo,
      sample: removedIds.slice(0, 10).map((id) => prevItems.get(id).n),
      summary: bi(
        `${removedIds.length} ${removedIds.length === 1 ? 'item sumiu' : 'itens sumiram'} do catálogo `
        + `e NÃO ${removedIds.length === 1 ? 'está sendo reportado' : 'estão sendo reportados'} como ${removedIds.length === 1 ? 'removido' : 'removidos'}: ${motivo}. `
        + 'Sumiço de item numa coleta incompleta é indistinguível de remoção real pelo provedor — '
        + 'até que se saiba qual dos dois foi, o honesto é dizer que não se sabe.',
        `${removedIds.length} ${removedIds.length === 1 ? 'item disappeared' : 'items disappeared'} from the catalogue `
        + `and ${removedIds.length === 1 ? 'is' : 'are'} NOT being reported as removed: ${motivoEn}. `
        + 'An item missing from an incomplete collection is indistinguishable from a real removal by the provider — '
        + 'until we know which one it was, the honest answer is that we do not know.'),
    }))
    quarantine.push({
      key: `${cloud}:${meta.id}:${date}`,
      cloud, collection: meta.id, date,
      reason: coverageIncomplete ? 'coverage' : 'mass-removal',
      detail: motivo,
      count: removedIds.length,
      items: removedIds.map((id) => ({ id, name: prevItems.get(id).n })),
    })
  } else {
    for (const id of removedIds) {
      const it = prevItems.get(id)
      events.push(makeEvent({
        ...base, type: 'removed', itemId: id, itemName: it.n,
        tier: it.t, category: it.c, privileged: !!it.p,
        route: null, // a página de detalhe deixou de existir junto com o item
        summary: bi(`${it.n} saiu do catálogo.`, `${it.n} left the catalogue.`),
      }))
    }
  }

  for (const id of addedIds) {
    const it = nextItems.get(id)
    events.push(makeEvent({
      ...base, type: 'created', itemId: id, itemName: it.n,
      tier: it.t, category: it.c, privileged: !!it.p,
      permissionCount: it.pc,
      route: routeFor(cloud, meta.id, id),
      summary: bi(
        `${it.n} entrou no catálogo`
        + (it.t ? ` como ${it.t}` : '')
        + (it.pc != null ? ` (${numPt(it.pc)} ${it.pc === 1 ? 'permissão' : 'permissões'})` : '') + '.',
        `${it.n} entered the catalogue`
        + (it.t ? ` as ${it.t}` : '')
        + (it.pc != null ? ` (${numEn(it.pc)} ${it.pc === 1 ? 'permission' : 'permissions'})` : '') + '.'),
    }))
  }

  // ── Itens presentes dos dois lados ────────────────────────────────────────
  for (const [id, b] of nextItems) {
    const a = prevItems.get(id)
    if (!a || a.h === b.h) continue
    const route = routeFor(cloud, meta.id, id)
    const common = { ...base, itemId: id, itemName: b.n, route, privileged: !!b.p }

    if (a.n !== b.n) {
      events.push(makeEvent({ ...common, type: 'renamed', from: a.n, to: b.n,
        summary: bi(`Renomeada: "${a.n}" passou a se chamar "${b.n}".`,
                    `Renamed: "${a.n}" is now called "${b.n}".`) }))
    }
    if (a.hd !== b.hd && a.hd != null && b.hd != null) {
      events.push(makeEvent({ ...common, type: 'description-changed',
        summary: bi(`A descrição oficial de ${b.n} mudou.`,
                    `The official description of ${b.n} changed.`) }))
    }
    if (a.hp !== b.hp) {
      // pc null dos dois lados = a fonte não publica a lista. Sem contagem, o
      // evento não teria como dizer +N/−M e não é emitido.
      if (a.pc != null && b.pc != null) {
        const delta = b.pc - a.pc
        events.push(makeEvent({ ...common, type: 'permissions-changed',
          from: a.pc, to: b.pc, delta,
          summary: delta === 0
            ? bi(`A lista de permissões de ${b.n} mudou sem mudar de tamanho (${numPt(b.pc)}) — houve troca, não acréscimo.`,
                 `The permission list of ${b.n} changed without changing size (${numEn(b.pc)}) — a swap, not an addition.`)
            : bi(`Permissões de ${b.n}: ${numPt(a.pc)} → ${numPt(b.pc)} (${delta > 0 ? '+' : ''}${numPt(delta)}).`,
                 `Permissions of ${b.n}: ${numEn(a.pc)} → ${numEn(b.pc)} (${delta > 0 ? '+' : ''}${numEn(delta)}).`) }))
      } else if (a.pc == null && b.pc != null) {
        events.push(makeEvent({ ...common, type: 'permissions-changed',
          from: null, to: b.pc, delta: null,
          summary: bi(
            `A fonte passou a publicar a lista de permissões de ${b.n}: ${b.pc} ${b.pc === 1 ? 'permissão' : 'permissões'}. `
            + 'Não é um acréscimo de poder — é o fim de uma lacuna de documentação.',
            `The source started publishing the permission list of ${b.n}: ${b.pc} ${b.pc === 1 ? 'permission' : 'permissions'}. `
            + 'This is not added power — it is the end of a documentation gap.') }))
      } else if (a.pc != null && b.pc == null) {
        events.push(makeEvent({ ...common, type: 'permissions-changed',
          from: a.pc, to: null, delta: null,
          summary: bi(`A fonte deixou de publicar a lista de permissões de ${b.n} (tinha ${a.pc}).`,
                      `The source stopped publishing the permission list of ${b.n} (it had ${a.pc}).`) }))
      }
    }
    if (a.t !== b.t) {
      events.push(makeEvent({ ...common, type: 'tier-changed', from: a.t, to: b.t,
        summary: bi(`Tier de ${b.n}: ${a.t ?? '—'} → ${b.t ?? '—'}.`,
                    `Tier of ${b.n}: ${a.t ?? '—'} → ${b.t ?? '—'}.`) }))
    }
    if (a.c !== b.c) {
      events.push(makeEvent({ ...common, type: 'category-changed', from: a.c, to: b.c,
        summary: bi(`Categoria de ${b.n}: ${a.c ?? '—'} → ${b.c ?? '—'}.`,
                    `Category of ${b.n}: ${a.c ?? '—'} → ${b.c ?? '—'}.`) }))
    }
    if (a.p !== b.p) {
      events.push(makeEvent({ ...common, type: 'privilege-changed', from: !!a.p, to: !!b.p,
        summary: b.p
          ? bi(`${b.n} passou a ser classificada como privilegiada.`,
               `${b.n} is now classified as privileged.`)
          : bi(`${b.n} deixou de ser classificada como privilegiada.`,
               `${b.n} is no longer classified as privileged.`) }))
    }
    const sa = new Set(a.s ?? [])
    const sb = new Set(b.s ?? [])
    const sodAdded = [...sb].filter((r) => !sa.has(r))
    const sodRemoved = [...sa].filter((r) => !sb.has(r))
    if (sodAdded.length || sodRemoved.length) {
      const partes = []
      const partsEn = []
      if (sodAdded.length) {
        partes.push(`entrou em ${sodAdded.length} (${sodAdded.join(', ')})`)
        partsEn.push(`entered ${sodAdded.length} (${sodAdded.join(', ')})`)
      }
      if (sodRemoved.length) {
        partes.push(`saiu de ${sodRemoved.length} (${sodRemoved.join(', ')})`)
        partsEn.push(`left ${sodRemoved.length} (${sodRemoved.join(', ')})`)
      }
      events.push(makeEvent({ ...common, type: 'sod-changed', sodAdded, sodRemoved,
        summary: bi(`${b.n} e as regras de segregação de funções: ${partes.join('; ')}.`,
                    `${b.n} and the segregation-of-duties rules: ${partsEn.join('; ')}.`) }))
    }
  }

  return { events, quarantine }
}

// ── Percorre a cadeia de snapshots de uma nuvem ──────────────────────────────

function walkCloud(cloud, confirmed) {
  const dates = snapshotDates(cloud)
  const events = []
  const quarantine = []
  if (!dates.length) return { events, quarantine, dates }

  const first = dates[0]
  const firstSnap = readSnapshot(cloud, first)
  // Sem toLowerCase: 'IAM Permissions' viraria 'iam permissions', e nome
  // próprio de coleção é rótulo, não substantivo comum.
  const contagens = S.COLLECTIONS[cloud].map((m) => ({
    label: m.label, n: resolveCollection(cloud, first, m.id)?.count ?? 0,
  }))
  const totaisPt = contagens.map((c) => `${numPt(c.n)} ${c.label}`)
  const totaisEn = contagens.map((c) => `${numEn(c.n)} ${c.label}`)
  const nome = S.CLOUD_LABEL[cloud]
  events.push(makeEvent({
    date: first, cloud, collection: '_', collectionLabel: S.CLOUD_LABEL[cloud],
    type: 'genesis', itemId: null, itemName: S.CLOUD_LABEL[cloud],
    counts: Object.fromEntries(S.COLLECTIONS[cloud].map((m) => [m.id, resolveCollection(cloud, first, m.id)?.count ?? 0])),
    summary: bi(
      `O histórico de ${nome} começa aqui, com ${totaisPt.join(' e ')}. `
      + 'Mudanças anteriores a esta data não foram observadas por nós e não estão listadas.',
      `The history of ${nome} starts here, with ${totaisEn.join(' and ')}. `
      + 'Changes before this date were not observed by us and are not listed.'),
  }))

  for (let i = 1; i < dates.length; i++) {
    const [prevDate, date] = [dates[i - 1], dates[i]]
    for (const meta of S.COLLECTIONS[cloud]) {
      const prev = resolveCollection(cloud, prevDate, meta.id)
      const next = resolveCollection(cloud, date, meta.id)
      // `next` nulo = a coleção não mudou nesta data (virou referência) ou a
      // cadeia quebrou. Nos dois casos não há o que diferenciar aqui.
      if (!prev || !next) continue
      if (prev.hash === next.hash && prev.coverage?.complete === next.coverage?.complete) continue
      const r = diffCollection(cloud, meta, date, prev, next)
      // Quarentena liberada por um humano: as remoções passam a ser publicadas.
      const key = `${cloud}:${meta.id}:${date}`
      if (r.quarantine.length && confirmed.has(key)) {
        const q = r.quarantine[0]
        const semUnknown = r.events.filter((e) => e.type !== 'unknown')
        for (const it of q.items) {
          semUnknown.push(makeEvent({
            date, cloud, collection: meta.id, collectionLabel: meta.label,
            type: 'removed', itemId: it.id, itemName: it.name, route: null,
            confirmedByHuman: true,
            summary: bi(`${it.name} saiu do catálogo. Remoção retida pela quarentena e liberada manualmente.`,
                        `${it.name} left the catalogue. Removal held in quarantine and released manually.`),
          }))
        }
        events.push(...semUnknown)
      } else {
        events.push(...r.events)
        quarantine.push(...r.quarantine)
      }
    }
  }
  return { events, quarantine, dates }
}

// ── Atom ─────────────────────────────────────────────────────────────────────

const xmlEsc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/**
 * Um feed Atom.
 *
 * POR QUE ATOM E NÃO RSS
 *   Atom exige `<id>` único e estável por entrada, e `<updated>` com fuso —
 *   RSS 2.0 não exige nenhum dos dois. Para um feed cujo valor inteiro é "me
 *   avise quando mudar", entrada sem id estável significa republicar o
 *   histórico toda vez que o arquivo é regerado.
 *
 * O LIMITE DE 200
 *   Feed não é arquivo histórico: leitor busca o arquivo inteiro a cada
 *   verificação. O histórico completo vive em /api/v1/changes.json, e o feed
 *   aponta para lá com rel="alternate".
 */
function atomFeed({ id, title, subtitle, events, self }) {
  const updated = events[0]?.date ? `${events[0].date}T00:00:00Z` : new Date().toISOString()
  const entries = events.slice(0, 200).map((e) => {
    const link = e.route ? `${SITE}${e.route}/` : `${SITE}/changelog/${e.cloud}/`
    const rotulo = TYPE_LABEL_EN[e.type] ?? e.type
    const editorial = e.classification === 'iamscope-editorial'
    return `  <entry>
    <id>tag:iamscope.cloud,2026:changelog/${xmlEsc(e.id)}</id>
    <title>${xmlEsc(`[${S.CLOUD_LABEL[e.cloud]}] ${e.itemName ?? e.collectionLabel} — ${rotulo}`)}</title>
    <updated>${e.date}T00:00:00Z</updated>
    <link rel="alternate" href="${xmlEsc(link)}"/>
    <category term="${xmlEsc(e.type)}" label="${xmlEsc(rotulo)}"/>
    <category term="${xmlEsc(e.cloud)}" label="${xmlEsc(S.CLOUD_LABEL[e.cloud])}"/>
    <category term="${xmlEsc(e.classification)}"/>
    <category term="${xmlEsc(e.origin)}"/>
    <content type="text">${xmlEsc(e.summary?.en ?? e.summary)}${editorial
      ? ' — IAM Scope editorial classification, derived from the official permissions; not a provider classification.'
      : ''}</content>
  </entry>`
  }).join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>tag:iamscope.cloud,2026:feed/${xmlEsc(id)}</id>
  <title>${xmlEsc(title)}</title>
  <subtitle>${xmlEsc(subtitle)}</subtitle>
  <updated>${updated}</updated>
  <link rel="self" href="${xmlEsc(`${SITE}${self}`)}"/>
  <link rel="alternate" href="${xmlEsc(`${SITE}/changelog/`)}"/>
  <author><name>IAM Scope</name><uri>${SITE}</uri></author>
  <rights>IAM Scope curation licensed CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/. Provider facts are not relicensed here.</rights>
${entries}
</feed>
`
}

/** O item é privilegiado? É o filtro dos feeds -privileged. */
const isPriv = (e) => e.privileged === true || e.tier === 'ControlPlane'
  || e.tier === 'FullControl' || e.tier === 'AccessManagement' || e.tier === 'FullAccess'
  || e.tier === 'ProjectOwner' || e.tier === 'SuperAdmin' || e.tier === 'AccountAdmin'
  || e.type === 'genesis' || e.type === 'unknown' || e.type === 'coverage-changed'

// ── Principal ────────────────────────────────────────────────────────────────

function run() {
  fs.mkdirSync(CHG_DIR, { recursive: true })
  const confirmed = new Set(readJson(path.join(CHG_DIR, 'confirmed-removals.json'), []))
  const attested = readJson(path.join(CHG_DIR, 'attested.json'), { events: [] })

  let events = []
  const quarantine = []
  const porNuvem = {}

  for (const cloud of S.CLOUDS) {
    const r = walkCloud(cloud, confirmed)
    porNuvem[cloud] = { snapshots: r.dates.length, first: r.dates[0] ?? null, derived: r.events.length }
    events.push(...r.events)
    quarantine.push(...r.quarantine)
  }

  // Eventos atestados: o que já estava escrito e datado no repositório antes de
  // haver snapshot. Entram com origin 'attested' e a fonte no próprio evento —
  // nunca se misturam com o derivado sem dizer o que são.
  for (const e of attested.events ?? []) {
    events.push(makeEvent({ ...e, origin: 'attested' }))
  }

  events.sort((a, b) => (b.date.localeCompare(a.date)) || a.cloud.localeCompare(b.cloud) || a.id.localeCompare(b.id))

  const meta = {
    historyStartsAt: events.length ? events[events.length - 1].date : null,
    firstObservedAt: Object.values(porNuvem).map((p) => p.first).filter(Boolean).sort()[0] ?? null,
    clouds: porNuvem,
    counts: {
      total: events.length,
      derived: events.filter((e) => e.origin === 'derived').length,
      attested: events.filter((e) => e.origin === 'attested').length,
      byType: Object.fromEntries(Object.keys(TYPE_LABEL).map((t) => [t, events.filter((e) => e.type === t).length])),
    },
    quarantineOpen: quarantine.length,
    /**
     * A ressalva que precisa sair na PÁGINA, não só no commit. Fica aqui, no
     * dado, para que a página, o feed e a API não possam divergir dela.
     */
    disclosure: bi(
      'O histórico começa no dia em que a captura de snapshots foi ligada. '
      + 'Mudanças anteriores a essa data não foram observadas por nós: os eventos marcados como '
      + '"atestado" vêm de registros datados do próprio repositório, não de comparação de estado. '
      + 'Não há como recuperar retroativamente o que não foi capturado — o que este changelog tem '
      + 'de diferente não é profundidade, é largura: seis nuvens, não uma.',
      'The history starts on the day snapshot capture was switched on. '
      + 'Changes before that date were not observed by us: events marked "attested" come from dated '
      + 'records in the repository itself, not from comparing two states. '
      + 'What was not captured cannot be recovered retroactively — what makes this changelog different '
      + 'is not depth, it is breadth: six clouds, not one.'),
    typeLabels: TYPE_LABEL,
    typeLabelsEn: TYPE_LABEL_EN,
    cloudLabels: S.CLOUD_LABEL,
  }

  if (DRY) {
    console.log(JSON.stringify({ meta, quarantine: quarantine.map((q) => q.key) }, null, 2))
    console.log('\n--dry-run: nada escrito.')
    return
  }

  // ── public/changelog.json — o que as páginas leem ─────────────────────────
  fs.writeFileSync(path.join(PUBLIC, 'changelog.json'),
    JSON.stringify({ meta, events }, null, 0))

  // ── data/changelog/quarantine.json — fila de revisão humana ───────────────
  //
  // Só regrava quando a lista `open` de fato muda. Achado em 27/08/2026: o
  // arquivo é versionado (não está no .gitignore, ao contrário de
  // changelog.json e feeds/), mas `generatedAt` levava `new Date()` em TODA
  // execução — então todo `npm run verify` marcava o arquivo como modificado
  // mesmo sem nenhuma remoção nova retida. `generatedAt` passa a significar
  // "quando a quarentena mudou pela última vez", não "quando o script rodou".
  const quarantinePath = path.join(CHG_DIR, 'quarantine.json')
  let quarantineAnterior = null
  if (fs.existsSync(quarantinePath)) {
    try { quarantineAnterior = JSON.parse(fs.readFileSync(quarantinePath, 'utf8')).open } catch {}
  }
  if (JSON.stringify(quarantineAnterior) !== JSON.stringify(quarantine)) {
    fs.writeFileSync(quarantinePath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), open: quarantine }, null, 2)}\n`)
  }

  // ── public/feeds/*.xml — 13 feeds ─────────────────────────────────────────
  const feedsDir = path.join(PUBLIC, 'feeds')
  fs.mkdirSync(feedsDir, { recursive: true })
  let feeds = 0
  const escreveFeed = (nome, cfg) => {
    fs.writeFileSync(path.join(feedsDir, `${nome}.xml`), atomFeed({ ...cfg, self: `/feeds/${nome}.xml` }))
    feeds++
  }
  escreveFeed('all', {
    id: 'all', title: 'IAM Scope — changes across all clouds',
    subtitle: 'Roles, policies and permissions across Entra ID, Azure RBAC, AWS, GCP, Google Workspace and IBM Cloud. '
      + 'History starts on the day snapshot capture was switched on; nothing before it was observed by us.',
    events,
  })
  for (const cloud of S.CLOUDS) {
    const daNuvem = events.filter((e) => e.cloud === cloud)
    escreveFeed(cloud, {
      id: cloud, title: `IAM Scope — ${S.CLOUD_LABEL[cloud]}`,
      subtitle: `Every change observed in the ${S.CLOUD_LABEL[cloud]} catalogue.`,
      events: daNuvem,
    })
    escreveFeed(`${cloud}-privileged`, {
      id: `${cloud}-privileged`, title: `IAM Scope — ${S.CLOUD_LABEL[cloud]}, privileged only`,
      subtitle: `Changes to privileged ${S.CLOUD_LABEL[cloud]} roles — top tier or isPrivileged. `
        + 'The privilege cut is IAM Scope editorial classification, not a provider classification.',
      events: daNuvem.filter(isPriv),
    })
  }

  // ── public/api/v1/changes.json ────────────────────────────────────────────
  const apiDir = path.join(PUBLIC, 'api', 'v1')
  fs.mkdirSync(apiDir, { recursive: true })
  fs.writeFileSync(path.join(apiDir, 'changes.json'), JSON.stringify(envelope({
    resource: 'changes',
    description: 'Eventos de mudança no catálogo de IAM das seis nuvens, derivados de snapshots diários.',
    editorial: EDITORIAL_FIELDS.change,
    meta: {
      ...meta,
      feeds: Object.fromEntries([
        ['all', `${SITE}/feeds/all.xml`],
        ...S.CLOUDS.flatMap((c) => [
          [c, `${SITE}/feeds/${c}.xml`],
          [`${c}-privileged`, `${SITE}/feeds/${c}-privileged.xml`],
        ]),
      ]),
    },
    payload: { changes: events },
  }), null, 0))

  console.log(`Eventos: ${events.length} (${meta.counts.derived} derivados, ${meta.counts.attested} atestados)`)
  for (const [t, n] of Object.entries(meta.counts.byType)) if (n) console.log(`   ${TYPE_LABEL[t]}: ${n}`)
  console.log(`Escrito: public/changelog.json, public/api/v1/changes.json, public/feeds/ (${feeds} feeds)`)
  if (quarantine.length) {
    console.log(`\nQUARENTENA ABERTA — ${quarantine.length} transição(ões) com remoções retidas:`)
    for (const q of quarantine) console.log(`   ${q.key}  ${q.count} itens  (${q.detail})`)
    console.log('   Revise data/changelog/quarantine.json. Para publicar, acrescente a chave a')
    console.log('   data/changelog/confirmed-removals.json e rode de novo.')
  }
}

module.exports = { diffCollection, atomFeed, massRemovalLimit, TYPE_LABEL, TYPE_LABEL_EN, isPriv }

if (require.main === module) {
  try { run() } catch (e) {
    console.error('\nFALHOU:', e.message, '\n', e.stack)
    process.exitCode = 1
  }
}
