#!/usr/bin/env node
/**
 * Verifica as regras do `output: 'export'` que só falham no build.
 *
 * POR QUE EXISTE
 *   Com export estático o Next impõe restrições que nenhum verificador de
 *   sintaxe ou de tipo enxerga — o erro aparece na fase "Collecting page data",
 *   depois de compilar tudo. Em 03/08 o build quebrou duas vezes seguidas por
 *   isso. Cada ciclo de descoberta custa um build inteiro.
 *
 * O QUE ELE CHECA
 *
 * 1. ROUTE HANDLERS DE METADADOS precisam de `export const dynamic =
 *    'force-static'`. robots.ts, sitemap.ts, manifest.ts e opengraph-image.tsx
 *    não são páginas: viram handlers, e handler é dinâmico por padrão.
 *
 * 2. ROTA DINÂMICA precisa de `generateStaticParams`. Sem servidor em runtime,
 *    o Next não tem como resolver [slug] sob demanda.
 *
 * 3. `'use client'` é INCOMPATÍVEL com `export const metadata` e com
 *    `generateStaticParams` — ambos só existem em Server Component. Esse erro
 *    já quebrou 4 páginas de referência numa passagem de i18n.
 *
 * Uso: node scripts/check-static-export.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const APP = path.join(ROOT, 'src', 'app')

/** Arquivos de metadados que o Next compila como Route Handler. */
const HANDLERS = ['robots.ts', 'robots.js', 'sitemap.ts', 'sitemap.js',
                  'manifest.ts', 'manifest.js']

const arquivos = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(tsx?|jsx?)$/.test(e.name)) arquivos.push(p)
  }
})(APP)

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')
const problemas = []

for (const abs of arquivos) {
  const nome = path.basename(abs)
  const src = fs.readFileSync(abs, 'utf8')
  const r = rel(abs)

  // 1. handler de metadados sem force-static
  if (HANDLERS.includes(nome) && !/export\s+const\s+dynamic\s*=\s*['"]force-static['"]/.test(src)) {
    problemas.push({
      arquivo: r,
      erro: "falta export const dynamic = 'force-static'",
      dica: 'Route Handler é dinâmico por padrão; com output: export o build aborta.',
    })
  }

  if (nome.startsWith('page.') || nome.startsWith('layout.')) {
    const ehClient = /^\s*['"]use client['"]/m.test(src)
    const temMetadata = /export\s+const\s+metadata\b/.test(src)
    const temParams = /export\s+(?:async\s+)?function\s+generateStaticParams/.test(src)

    // 3. 'use client' com metadata / generateStaticParams
    if (ehClient && temMetadata) {
      problemas.push({
        arquivo: r,
        erro: "'use client' com export const metadata",
        dica: 'Divida em page.tsx (servidor, com metadata) + XClient.tsx.',
      })
    }
    if (ehClient && temParams) {
      problemas.push({
        arquivo: r,
        erro: "'use client' com generateStaticParams",
        dica: 'generateStaticParams só existe em Server Component.',
      })
    }

    // 2. rota dinâmica sem generateStaticParams
    if (nome.startsWith('page.')) {
      const temSegmentoDinamico = rel(path.dirname(abs)).includes('[')
      if (temSegmentoDinamico && !temParams) {
        problemas.push({
          arquivo: r,
          erro: 'rota dinâmica sem generateStaticParams',
          dica: 'Com output: export toda [slug] precisa da lista completa em build time.',
        })
      }
    }
  }
}

if (problemas.length === 0) {
  console.log(`OK — ${arquivos.length} arquivo(s) de rota compatíveis com output: 'export'.`)
  return
}

console.error(`\n${problemas.length} incompatibilidade(s) com output: 'export':\n`)
for (const p of problemas) {
  console.error(`  ${p.arquivo}`)
  console.error(`    ${p.erro}`)
  console.error(`    → ${p.dica}\n`)
}
process.exitCode = 1
