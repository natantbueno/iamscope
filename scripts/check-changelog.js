#!/usr/bin/env node
/**
 * Verifica a integridade do changelog antes de publicar.
 *
 * POR QUE EXISTE
 *   O changelog é a única parte do site que faz uma AFIRMAÇÃO SOBRE O TEMPO —
 *   "isto mudou nesta data". Todo o resto é um catálogo: se estiver errado, é
 *   um número errado. Aqui, se estiver errado, é uma notícia falsa, e ela sai
 *   também no feed de quem assinou, onde não dá para corrigir depois.
 *
 *   Os outros seis checadores conferem coerência interna. Este confere que o
 *   changelog não está prestes a afirmar algo que não pode sustentar.
 *
 * O QUE CONFERE
 *   1. Não há quarentena aberta e não confirmada.
 *   2. A cadeia de snapshots é resolvível — nenhum `unchanged/since` apontando
 *      para um arquivo que não existe.
 *   3. Todo id de evento é único (o feed usa como <id>; id duplicado faz leitor
 *      de Atom esconder uma das entradas).
 *   4. Todo evento tem resumo nos DOIS idiomas.
 *   5. Todo evento atestado tem `source` apontando para um arquivo que existe.
 *   6. Nenhum evento tem data no futuro.
 *   7. Todo `route` de evento aponta para uma rota que o build gera.
 *   8. As nuvens declaradas em COLLECTIONS têm página de changelog.
 *
 * Uso: node scripts/check-changelog.js
 * Sai com código 1 se houver problema.
 */
const fs = require('fs')
const path = require('path')
const S = require('./lib/snapshot-schema')
const { snapshotDates, readSnapshot, resolveCollection } = require('./build-snapshot')

const ROOT = path.join(__dirname, '..')
const CHG_DIR = path.join(ROOT, 'data', 'changelog')
const PUBLIC = path.join(ROOT, 'public')

const readJson = (p, fb = null) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fb }
}

const problemas = []
const avisos = []
let conferidos = 0

// ── 1. Quarentena aberta ────────────────────────────────────────────────────
const quarentena = readJson(path.join(CHG_DIR, 'quarantine.json'), { open: [] })
const confirmadas = new Set(readJson(path.join(CHG_DIR, 'confirmed-removals.json'), []))
for (const q of quarentena.open ?? []) {
  if (confirmadas.has(q.key)) continue
  problemas.push(
    `QUARENTENA ABERTA: ${q.key} — ${q.count} remoções retidas (${q.detail}).\n`
    + `      Revise data/changelog/quarantine.json. Se as remoções forem reais, acrescente\n`
    + `      "${q.key}" a data/changelog/confirmed-removals.json. Se forem falso positivo de\n`
    + `      coleta, conserte o coletor e rode build-snapshot.js de novo.`,
  )
}

// ── 2. Cadeia de snapshots resolvível ───────────────────────────────────────
for (const cloud of S.CLOUDS) {
  const datas = snapshotDates(cloud)
  if (!datas.length) {
    avisos.push(`${cloud}: nenhum snapshot ainda — o changelog desta nuvem começa vazio.`)
    continue
  }
  for (const data of datas) {
    const snap = readSnapshot(cloud, data)
    if (!snap) { problemas.push(`${cloud}/${data}.json não é JSON válido.`); continue }
    for (const meta of S.COLLECTIONS[cloud]) {
      const coll = snap.collections?.[meta.id]
      if (!coll) {
        problemas.push(`${cloud}/${data}.json não tem a coleção '${meta.id}'.`)
        continue
      }
      const resolvida = resolveCollection(cloud, data, meta.id)
      if (!resolvida) {
        problemas.push(
          `${cloud}/${data}.json: a coleção '${meta.id}' referencia `
          + `'${coll.since ?? '?'}', que não resolve. A cadeia está quebrada — `
          + 'o diff a partir daqui seria contra o vazio, e todo item viraria "criada".',
        )
        continue
      }
      // O hash gravado tem de bater com o hash dos itens que estão lá.
      if (resolvida.items) {
        const recalculado = S.collectionHash(resolvida.items)
        if (recalculado !== resolvida.hash) {
          problemas.push(
            `${cloud}/${resolvida.resolvedFrom}.json, coleção '${meta.id}': hash gravado `
            + `${resolvida.hash} não bate com o recalculado ${recalculado}. `
            + 'O arquivo foi editado à mão ou o schema mudou sem regerar.',
          )
        }
        if (resolvida.items.length !== resolvida.count) {
          problemas.push(
            `${cloud}/${resolvida.resolvedFrom}.json, coleção '${meta.id}': count diz `
            + `${resolvida.count} e há ${resolvida.items.length} itens.`,
          )
        }
      }
      conferidos++
    }
  }
}

// ── 3-7. O changelog gerado ─────────────────────────────────────────────────
const changelog = readJson(path.join(PUBLIC, 'changelog.json'))
if (!changelog) {
  avisos.push('public/changelog.json não existe — rode node scripts/build-changelog.js.')
} else {
  const vistos = new Set()
  const hoje = new Date().toISOString().slice(0, 10)

  // As rotas que o build realmente gera, para conferir os links dos eventos.
  const rotasDeDetalhe = new Set()
  const APP = path.join(ROOT, 'src', 'app')
  ;(function walk(dir, rota) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      // Grupos de rota — (home), (legacy) — não entram na URL.
      const seg = e.name.startsWith('(') ? '' : `/${e.name}`
      walk(path.join(dir, e.name), rota + seg)
    }
    if (fs.existsSync(path.join(dir, 'page.tsx'))) rotasDeDetalhe.add(rota || '/')
  })(APP, '')

  for (const ev of changelog.events ?? []) {
    if (vistos.has(ev.id)) {
      problemas.push(
        `id de evento duplicado: ${ev.id}. O feed usa o id como <id> de entrada — `
        + 'duplicado faz leitor de Atom esconder uma das duas.',
      )
    }
    vistos.add(ev.id)

    if (!ev.summary?.pt || !ev.summary?.en) {
      problemas.push(`${ev.id}: resumo faltando em ${!ev.summary?.pt ? 'pt' : 'en'}.`)
    } else if (ev.summary.pt === ev.summary.en) {
      avisos.push(`${ev.id}: resumo idêntico nos dois idiomas — tradução esquecida?`)
    }

    if (ev.date > hoje) {
      problemas.push(`${ev.id}: data ${ev.date} está no futuro (hoje é ${hoje}).`)
    }

    if (ev.origin === 'attested') {
      if (!ev.source?.path) {
        problemas.push(
          `${ev.id}: evento atestado sem \`source\`. Um atestado sem fonte verificável `
          + 'é exatamente o que a distinção derivado/atestado existe para impedir.',
        )
      } else if (!fs.existsSync(path.join(ROOT, ev.source.path))) {
        problemas.push(`${ev.id}: source aponta para ${ev.source.path}, que não existe.`)
      }
    }

    // Rota de detalhe: só confere o PREFIXO estático, porque o slug final vem
    // de generateStaticParams e não está no disco.
    if (ev.route) {
      const prefixo = ev.route.split('/').slice(0, -1).join('/')
      if (prefixo && !rotasDeDetalhe.has(`${prefixo}/[slug]`) && !rotasDeDetalhe.has(prefixo)) {
        const temDinamica = [...rotasDeDetalhe].some((r) => r.startsWith(`${prefixo}/[`))
        if (!temDinamica) {
          problemas.push(`${ev.id}: route ${ev.route} não corresponde a rota nenhuma do build.`)
        }
      }
    }
    conferidos++
  }

  // ── 8. Página de changelog para cada nuvem ────────────────────────────────
  if (!rotasDeDetalhe.has('/changelog')) problemas.push('a rota /changelog não existe.')
  if (![...rotasDeDetalhe].some((r) => r.startsWith('/changelog/['))) {
    problemas.push('não há rota dinâmica /changelog/[cloud].')
  }

  // ── Os feeds ──────────────────────────────────────────────────────────────
  const esperados = ['all', ...S.CLOUDS, ...S.CLOUDS.map((c) => `${c}-privileged`)]
  for (const nome of esperados) {
    const p = path.join(PUBLIC, 'feeds', `${nome}.xml`)
    if (!fs.existsSync(p)) { avisos.push(`feed ausente: public/feeds/${nome}.xml`); continue }
    const xml = fs.readFileSync(p, 'utf8')
    // XML mal formado num feed quebra o leitor sem mensagem útil. As duas
    // formas mais prováveis de quebrar aqui são '&' cru e '<' cru vindos de
    // uma descrição oficial — o xmlEsc cobre, e este teste prova que cobriu.
    const cruzes = xml.replace(/&(amp|lt|gt|quot|apos);/g, '').match(/&/g)
    if (cruzes) problemas.push(`public/feeds/${nome}.xml tem ${cruzes.length} '&' não escapado.`)
    if (!xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')) {
      problemas.push(`public/feeds/${nome}.xml não começa com a declaração XML.`)
    }
    conferidos++
  }

  // ── A API ─────────────────────────────────────────────────────────────────
  const api = readJson(path.join(PUBLIC, 'api', 'v1', 'changes.json'))
  if (!api) {
    avisos.push('public/api/v1/changes.json não existe.')
  } else {
    if (api.contract !== 'public-v1') problemas.push('changes.json: contract não é public-v1.')
    if (api.classification?.value !== 'iamscope-editorial') {
      problemas.push('changes.json: falta classification.value = iamscope-editorial.')
    }
    if (!api.classification?.fields?.length) {
      problemas.push(
        'changes.json: classification.fields está vazio. Dizer "algo aqui é editorial" '
        + 'sem dizer QUAIS campos não serve para o consumidor.',
      )
    }
    if (!api.license?.id) problemas.push('changes.json: falta a licença.')
    if (!api.sources?.length) {
      problemas.push('changes.json: falta `sources`. A atribuição do EntraOps e do '
        + 'merill/microsoft-info é exigência da licença MIT dos dois, não cortesia.')
    }
    if ((api.changes?.length ?? 0) !== (changelog.events?.length ?? 0)) {
      problemas.push(
        `changes.json tem ${api.changes?.length ?? 0} eventos e changelog.json tem `
        + `${changelog.events?.length ?? 0}. Foram gerados em execuções diferentes.`,
      )
    }
    conferidos++
  }
}

// ── Relatório ───────────────────────────────────────────────────────────────
for (const a of avisos) console.log(`AVISO   ${a}`)
if (problemas.length) {
  console.error(`\n${problemas.length} problema(s):\n`)
  for (const p of problemas) console.error(`   ${p}`)
  process.exitCode = 1
} else {
  console.log(`OK — ${conferidos} verificação(ões), 0 problemas`
    + (avisos.length ? `, ${avisos.length} aviso(s)` : '') + '.')
}
