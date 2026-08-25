#!/usr/bin/env node
// metrics.mjs — o único jeito de saber se alguém está usando isto.
//
// O PROBLEMA, REGISTRADO EM 22/08 E QUE NÃO MUDOU
//   O Vercel Web Analytics é script de navegador. `curl`, CI e servidor MCP não
//   executam JS, então a ferramenta que já está instalada no iamscope.cloud é
//   cega para todo tráfego de API. Somado ao resto do plano Hobby — Runtime
//   Logs de 1 hora, arquivo estático que nem gera log, Log Drains inexistente,
//   Edge Requests só no agregado sem quebra por rota — o CDN não mede nada por
//   rota, de graça.
//
//   A inversão que vale guardar: o canal que parecia extra é o único que mede.
//
// POR QUE npm É O CANAL PRIMÁRIO, E NÃO O ASSET DE RELEASE
//   O plano original media pelos dois. Mas o repositório está PRIVADO desde o
//   reset de 23/08, e asset de release em repo privado exige autenticação para
//   baixar — o que quebra o canal como distribuição e como métrica ao mesmo
//   tempo: um contador que só conta quem tem token não conta o público.
//
//   `api.npmjs.org` não pede token, não pede chave, e conta o download de
//   verdade. É a medição que existe hoje. O leitor do GitHub está escrito e
//   testado abaixo, atrás de uma flag — ligue quando o repo virar público.
//
// USO
//   node scripts/metrics.mjs                     últimos 30 dias
//   node scripts/metrics.mjs --days 90
//   node scripts/metrics.mjs --json              para gravar série histórica
//   node scripts/metrics.mjs --github            liga o leitor de Release
//
// A SÉRIE HISTÓRICA IMPORTA MAIS QUE O NÚMERO
//   A API do npm devolve os últimos 18 meses, então perder um dia não perde o
//   dado. O que ela NÃO dá é de onde veio o download nem quem é. Se um dia a
//   pergunta virar "quem está usando", a resposta não está aqui — está em
//   pedir contato em troca de algo, que é a alavanca já registrada
//   (equivalências e SoD ficaram fora da v1 da API justamente para isso).

const PKG = 'iamscope-mcp'
const GH_OWNER = 'natantbueno'
const GH_REPO = 'iamscope'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const withGithub = args.includes('--github')
const days = Number(args[args.indexOf('--days') + 1]) || 30

const NPM = 'https://api.npmjs.org'

const ymd = (d) => d.toISOString().slice(0, 10)

async function getJson(url) {
  let res
  try {
    res = await fetch(url, { headers: { accept: 'application/json' } })
  } catch (e) {
    // Rede indisponível, proxy corporativo, DNS. Vale distinguir de "pacote não
    // existe": as duas coisas dão zero, e só uma delas é notícia.
    throw new Error(
      `Não consegui falar com ${new URL(url).host}. ` +
      `Isso é rede, não medição — o número não é zero, é desconhecido. (${e instanceof Error ? e.message : e})`,
    )
  }
  if (res.status === 404) return { _notFound: true }
  if (res.status === 429) throw new Error(`${new URL(url).host} respondeu 429 (limite de taxa). Tente de novo em alguns minutos.`)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.json()
}

// ── npm ─────────────────────────────────────────────────────────────────────

async function npmDownloads() {
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * 86400_000)
  const range = `${ymd(start)}:${ymd(end)}`

  // Campos conforme a doc oficial do npm (npm/registry, docs/download-counts.md):
  // point  → { downloads, start, end, package }
  // range  → { downloads: [{ day, downloads }], start, end, package }
  const [point, series] = await Promise.all([
    getJson(`${NPM}/downloads/point/${range}/${PKG}`),
    getJson(`${NPM}/downloads/range/${range}/${PKG}`),
  ])

  if (point._notFound || series._notFound) {
    return {
      published: false,
      note:
        `O npm não conhece "${PKG}" ainda. Isso é o esperado antes do primeiro publish — ` +
        `não é falha do script. Depois de publicar, a contagem leva algumas horas para aparecer.`,
    }
  }

  const byDay = (series.downloads ?? []).map((d) => ({ day: d.day, downloads: d.downloads }))
  const active = byDay.filter((d) => d.downloads > 0)

  // Por versão: só os últimos 7 dias, e o formato não está na doc oficial —
  // então é lido defensivamente e some do relatório se vier diferente.
  let byVersion = null
  try {
    const v = await getJson(`${NPM}/versions/${encodeURIComponent(PKG)}/last-week`)
    if (v && typeof v.downloads === 'object' && !Array.isArray(v.downloads)) byVersion = v.downloads
  } catch { /* opcional por desenho */ }

  return {
    published: true,
    package: PKG,
    window: { start: series.start, end: series.end, days },
    total: point.downloads ?? 0,
    perDay: byDay,
    daysWithAnyDownload: active.length,
    peakDay: active.sort((a, b) => b.downloads - a.downloads)[0] ?? null,
    byVersionLast7Days: byVersion,
  }
}

// ── GitHub Release: escrito, e desligado por um motivo ──────────────────────

async function githubReleases() {
  // assets[].download_count e assets[].name conforme a REST API de releases.
  const releases = await getJson(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases?per_page=20`)
  if (releases._notFound || releases.message) {
    return {
      readable: false,
      note:
        `A API respondeu 404/erro para ${GH_OWNER}/${GH_REPO}. Num repositório privado é isso que acontece sem token — ` +
        `e é exatamente por isso que este canal não é a medição primária: um contador que só ` +
        `responde a quem tem credencial não mede adoção pública.`,
    }
  }
  return {
    readable: true,
    releases: releases.map((r) => ({
      tag: r.tag_name,
      published: r.published_at,
      assets: (r.assets ?? []).map((a) => ({ name: a.name, downloads: a.download_count, size: a.size })),
      totalDownloads: (r.assets ?? []).reduce((s, a) => s + (a.download_count ?? 0), 0),
    })),
  }
}

// ── Saída ───────────────────────────────────────────────────────────────────

let report
try {
  report = {
    measuredAt: new Date().toISOString(),
    npm: await npmDownloads(),
    github: withGithub ? await githubReleases() : { skipped: true, reason: 'repositório privado — rode com --github depois de torná-lo público' },
  }
} catch (e) {
  console.error(`\n  medição falhou: ${e instanceof Error ? e.message : e}\n`)
  process.exit(1)
}

if (asJson) {
  // Uma linha por execução, para `>> metrics.jsonl` virar série sem banco.
  console.log(JSON.stringify(report))
  process.exit(0)
}

const n = report.npm
console.log(`\n  ${PKG} — downloads`)
console.log('  ' + '─'.repeat(52))
if (!n.published) {
  console.log(`  ${n.note}\n`)
} else {
  console.log(`  janela        ${n.window.start} → ${n.window.end}  (${n.window.days} dias)`)
  console.log(`  total         ${n.total.toLocaleString('pt-BR')}`)
  console.log(`  dias com uso  ${n.daysWithAnyDownload} de ${n.window.days}`)
  if (n.peakDay) console.log(`  pico          ${n.peakDay.downloads} em ${n.peakDay.day}`)

  // Sparkline. Um total sozinho não distingue "trinta pessoas instalaram" de
  // "uma CI rodou trinta vezes"; a forma da série distingue.
  const vals = n.perDay.map((d) => d.downloads)
  if (vals.length) {
    const max = Math.max(...vals, 1)
    const blocks = '▁▂▃▄▅▆▇█'
    console.log(`  série         ${vals.map((v) => blocks[Math.min(7, Math.floor((v / max) * 7))]).join('')}`)
  }
  if (n.byVersionLast7Days) {
    const rows = Object.entries(n.byVersionLast7Days).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (rows.length) {
      console.log('  por versão (últimos 7 dias)')
      for (const [v, c] of rows) console.log(`    ${v.padEnd(12)} ${c}`)
    }
  }
  console.log('')
}

if (withGithub) {
  const g = report.github
  console.log(`  GitHub Release — ${GH_OWNER}/${GH_REPO}`)
  console.log('  ' + '─'.repeat(52))
  if (!g.readable) console.log(`  ${g.note}\n`)
  else {
    for (const r of g.releases) console.log(`  ${r.tag.padEnd(12)} ${String(r.totalDownloads).padStart(6)}  (${r.assets.length} assets)`)
    console.log('')
  }
} else {
  console.log(`  GitHub Release: ${report.github.reason}\n`)
}
