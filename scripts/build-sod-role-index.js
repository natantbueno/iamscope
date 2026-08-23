#!/usr/bin/env node
/**
 * Gera src/data/sod/roleIndex.ts — só [nome, slug] por plataforma.
 *
 * POR QUE ISTO EXISTE
 *   src/lib/sod.ts precisa de duas coisas dos datasets: resolver um NOME de
 *   role para um slug (para linkar a página de detalhe) e listar nomes nos
 *   seletores da matriz e do avaliador. Nada além disso.
 *
 *   Importar os datasets completos para obter esses dois campos levaria
 *   aws.ts (871 KB), gcp.ts (762 KB), roles.ts (392 KB) e azureRbac.ts
 *   (181 KB) para o bundle de /sod e /sod/rules/[id] — cerca de 2,2 MB de JS
 *   numa página cujo trabalho todo é comparar dois nomes.
 *
 *   Mesmo desenho de scripts/build-counts.js: um módulo derivado e pequeno
 *   para que o código compartilhado não arraste os datasets inteiros.
 *
 * Rode depois de qualquer coletor que altere src/data/.
 *
 * Uso: node scripts/build-sod-role-index.js [--dry-run]
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'src', 'data', 'sod', 'roleIndex.ts')
const DRY = process.argv.includes('--dry-run')

const { ROLES } = loadTs('src/data/roles.ts')
const { AZURE_ROLES } = loadTs('src/data/azureRbac.ts')
const { AWS_POLICIES } = loadTs('src/data/aws.ts')
const { GCP_ROLES } = loadTs('src/data/gcp.ts')
const { GWS_ROLES } = loadTs('src/data/googleWorkspace.ts')

// A ordem aqui define a ordem de resolução por nome quando duas plataformas
// têm uma role de mesmo nome (Owner existe no Azure RBAC e no GCP). Como
// matchRoleByName recebe um escopo, isso só decide o desempate em 'all'.
// IBM Cloud não entra: está fora do escopo do catálogo — ver o cabeçalho de
// src/data/sod/rules.ts.
const SOURCES = [
  ['entra-id',         'src/data/roles.ts → ROLES',               ROLES],
  ['azure-rbac',       'src/data/azureRbac.ts → AZURE_ROLES',     AZURE_ROLES],
  ['aws',              'src/data/aws.ts → AWS_POLICIES',          AWS_POLICIES],
  ['gcp',              'src/data/gcp.ts → GCP_ROLES',             GCP_ROLES],
  ['google-workspace', 'src/data/googleWorkspace.ts → GWS_ROLES', GWS_ROLES],
]

const esc = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

let ambiguous = 0
const blocks = SOURCES.map(([platform, origem, arr]) => {
  const sorted = [...arr].sort((a, b) => a.name.localeCompare(b.name))
  const counts = new Map()
  for (const r of sorted) {
    const k = r.name.toLowerCase()
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  const amb = [...counts.values()].filter((v) => v > 1).length
  ambiguous += amb
  console.log(`  ${platform.padEnd(18)} ${String(arr.length).padStart(5)} itens${amb ? `  (${amb} nomes ambíguos)` : ''}`)
  const rows = sorted.map((r) => `[${esc(r.name)},${esc(r.slug)}]`).join(',')
  return `  // ${origem} — ${arr.length} itens${amb ? `, ${amb} nomes ambíguos` : ''}\n  ${esc(platform)}: [${rows}],`
}).join('\n')

const total = SOURCES.reduce((n, [, , arr]) => n + arr.length, 0)

const out = `// ── Índice enxuto de roles/policies para o SoD Analyzer ──────────────────────
// AUTO-GERADO por scripts/build-sod-role-index.js — não editar à mão.
//
// POR QUE EXISTE
//   src/lib/sod.ts precisa resolver um NOME de role para um slug (para linkar
//   a página de detalhe) e listar nomes nos seletores da matriz e do avaliador.
//   Só isso. Importar os datasets completos para conseguir esses dois campos
//   levaria aws.ts (871 KB), gcp.ts (762 KB), roles.ts (392 KB) e
//   azureRbac.ts (181 KB) para o bundle de /sod — cerca de 2,2 MB de JS numa
//   página cujo trabalho todo é comparar dois nomes.
//
//   Este arquivo tem os mesmos ${total.toLocaleString('pt-BR')} itens com dois campos cada.
//
//   Mesmo desenho de src/data/counts.ts: um módulo derivado e minúsculo para
//   que componentes compartilhados não arrastem os datasets inteiros.
//
// AMBIGUIDADE DE NOME
//   Nome de role não é chave em toda plataforma. O GCP publica pares distintos
//   com o mesmo nome de exibição (roles/cloudbuild.editor e
//   roles/cloudbuild.builds.editor são os dois "Cloud Build Editor"). A
//   resolução por nome devolve a PRIMEIRA em ordem alfabética de nome; as
//   regras do catálogo apontam para o slug, que é inequívoco.
//   Total de nomes ambíguos hoje: ${ambiguous}.
//
// Rode de novo depois de qualquer coleta que altere os datasets de origem.

import type { SoDPlatform } from './rules'

/** [nome, slug] por plataforma, ordenado por nome. */
export const SOD_ROLE_INDEX: Record<SoDPlatform, [string, string][]> = {
${blocks}
}

export const SOD_ROLE_INDEX_TOTAL = ${total}
`

console.log(`\n  total ${total} itens, ${ambiguous} nomes ambíguos, ${Math.round(out.length / 1024)} KB`)

if (DRY) {
  console.log('\n--dry-run: nada escrito.')
} else {
  fs.writeFileSync(OUT, out)
  console.log(`\nEscrito: ${path.relative(ROOT, OUT)}`)
}
