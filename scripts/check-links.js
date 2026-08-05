#!/usr/bin/env node
/**
 * Verifica os links internos escritos à mão no código.
 *
 * POR QUE EXISTE
 *   A página de Access Groups apontava para `/ibm-cloud/roles/iam-administrator`
 *   — uma role que morreu junto com o dataset antigo de 157 roles inventadas.
 *   O link sobreviveu à recoleta, ao build e a `check-site-index.js`, porque
 *   aquele confere o ÍNDICE das Reference, não prosa com <Link> no meio. Só
 *   apareceu numa varredura do site já exportado, com o navegador tomando 404.
 *
 *   O risco é estrutural: todo recorte de dataset pode aposentar um slug, e
 *   links em prosa não têm quem os cubra. Este script fecha essa classe inteira
 *   sem precisar de build — roda em segundos, contra os minutos do export.
 *
 * O QUE CONFERE
 *   Todo `href="/..."` literal em src/**\/*.tsx aponta para:
 *     - uma rota estática que existe em src/app, ou
 *     - um slug que existe no dataset correspondente (roles/policies), ou
 *     - um arquivo em public/.
 *   Âncora (#), link externo e template string com ${} ficam de fora: o
 *   primeiro não é rota, o último não dá para resolver sem executar.
 *
 * Uso: node scripts/check-links.js
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const APP = path.join(ROOT, 'src', 'app')

// ── Rotas estáticas de src/app ──────────────────────────────────────────────
const rotas = new Set()
;(function walk(dir, rota) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) {
      if (e.name === 'page.tsx') rotas.add(rota || '/')
      continue
    }
    // (grupo) não entra na URL; [slug] é dinâmico e resolve pelo dataset.
    if (e.name.startsWith('[')) continue
    const seg = e.name.startsWith('(') ? '' : `/${e.name}`
    walk(path.join(dir, e.name), rota + seg)
  }
})(APP, '')

// ── Slugs das rotas dinâmicas ───────────────────────────────────────────────
// Cada par é: prefixo da rota -> os slugs que generateStaticParams vai gerar.
const dinamicas = [
  ['/entraid/roles', () => loadTs('src/data/roles.ts').ROLES.map((r) => r.slug)],
  ['/roles',         () => loadTs('src/data/roles.ts').ROLES.map((r) => r.slug)],
  ['/azure-rbac/roles', () => loadTs('src/data/azureRbac.ts').AZURE_ROLES.map((r) => r.slug)],
  ['/azure-rbac/permissions', () => loadTs('src/lib/azurePermissions.ts').AZURE_PERMISSION_SLUGS ?? []],
  ['/aws/policies',  () => loadTs('src/data/aws.ts').AWS_POLICIES.map((p) => p.slug)],
  ['/gcp/roles',     () => loadTs('src/data/gcp.ts').GCP_ROLES.map((r) => r.slug)],
  ['/google-workspace/roles', () => loadTs('src/data/googleWorkspace.ts').GWS_ROLES.map((r) => r.slug)],
  ['/ibm-cloud/roles', () => loadTs('src/data/ibmCloud.ts').IBM_ROLES.map((r) => r.slug)],
  ['/sod/rules',     () => loadTs('src/data/sod/rules.ts').SOD_RULES.map((r) => r.id)],
]

const slugsPor = new Map()
for (const [prefixo, carrega] of dinamicas) {
  try { slugsPor.set(prefixo, new Set(carrega())) }
  catch { /* dataset ausente: o prefixo simplesmente não é validado */ }
}

// ── Coleta os href literais ─────────────────────────────────────────────────
const arquivos = []
;(function walkSrc(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkSrc(p)
    else if (e.name.endsWith('.tsx')) arquivos.push(p)
  }
})(path.join(ROOT, 'src'))

const problemas = []
const HREF = /href=(?:"(\/[^"]*)"|\{`(\/[^`]*)`\})/g

for (const arq of arquivos) {
  const texto = fs.readFileSync(arq, 'utf8')
  const linhas = texto.split('\n')
  for (const [, aspas, crase] of texto.matchAll(HREF)) {
    const bruto = aspas ?? crase
    if (bruto.includes('${')) continue          // dinâmico: só executando
    const alvo = bruto.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/'

    if (rotas.has(alvo)) continue
    if (fs.existsSync(path.join(ROOT, 'public', alvo.replace(/^\//, '')))) continue

    const prefixo = alvo.slice(0, alvo.lastIndexOf('/'))
    const slug = alvo.slice(alvo.lastIndexOf('/') + 1)
    const conhecidos = slugsPor.get(prefixo)
    if (conhecidos?.has(slug)) continue

    const linha = linhas.findIndex((l) => l.includes(bruto)) + 1
    problemas.push({
      arquivo: path.relative(ROOT, arq),
      linha,
      alvo: bruto,
      motivo: conhecidos ? `slug inexistente em ${prefixo}` : 'rota inexistente',
    })
  }
}

const total = arquivos.length
if (problemas.length) {
  console.error(`\n${problemas.length} link(s) interno(s) quebrado(s):\n`)
  for (const p of problemas) {
    console.error(`  ${p.arquivo}:${p.linha}`)
    console.error(`    ${p.alvo} — ${p.motivo}\n`)
  }
  process.exitCode = 1
} else {
  console.log(`OK — links internos de ${total} arquivo(s) apontam para rota ou slug existente.`)
}
