#!/usr/bin/env node
/**
 * Procura número FIXO na interface que deveria vir dos datasets.
 *
 * POR QUE EXISTE
 *   Os datasets mudam — GCP saiu de 232 para 2.381 roles, Azure de 926 para
 *   504, Google Workspace de 44 para 14. Todo número escrito à mão numa tela
 *   vira mentira silenciosa nessa hora: não quebra o build, não falha em
 *   nenhum verificador, e continua exibido com ar de dado oficial.
 *
 *   `src/data/counts.ts` existe justamente para isso. O que este script faz é
 *   achar quem não o usa.
 *
 * COMO FUNCIONA
 *   Varre src/app e src/components procurando literais numéricos em contexto
 *   de TEXTO (dentro de JSX, em string, em prop de badge) e compara com as
 *   contagens reais. Reporta:
 *
 *     ERRO   — número igual a uma contagem ANTIGA conhecida, ou próximo de uma
 *              contagem atual mas diferente dela. É quase certo que devia ser
 *              dinâmico.
 *     AVISO  — número solto grande (>= 10) em contexto de texto, sem
 *              correspondência. Pode ser legítimo; vale o olho.
 *
 * Uso: node scripts/check-stale-numbers.js [--tudo]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const TUDO = process.argv.includes('--tudo')

const counts = {}
for (const [, nome, valor] of fs.readFileSync(path.join(ROOT, 'src', 'data', 'counts.ts'), 'utf8')
  .matchAll(/export const (\w+) = (\d+)/g)) {
  counts[nome] = Number(valor)
}
// Não está em counts.ts: vem do índice em public/.
try {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'azure-perms-index.json'), 'utf8'))
  counts.AZURE_ACTIONS_COUNT = Object.keys(idx.index).length
} catch { /* opcional */ }

const atuais = new Map(Object.entries(counts).map(([k, v]) => [v, k]))

/**
 * Contagens que JÁ foram verdade e não são mais. Um número destes na tela é
 * quase sempre resquício, não coincidência.
 */
const OBSOLETOS = {
  926: 'Azure RBAC roles (hoje 504)',
  937: 'Azure RBAC roles do AzAdvertizer (nunca foi a nossa contagem)',
  925: 'Azure RBAC roles (hoje 504)',
  1526: 'AWS policies (hoje 1553)',
  232: 'GCP roles (hoje 2381)',
  5128: 'Azure actions (hoje 2697)',
  692: 'Entra API permissions (hoje 854)',
  132: 'Entra roles (hoje 144)',
  44: 'Google Workspace roles (hoje 14)',
  84: 'Google Workspace privileges (hoje 120)',
  15: 'roles GWS com privileges (dataset foi reconstruído)',
  3311: 'páginas do build (hoje ~7.769)',
  7796: 'páginas do build (hoje 7.769)',
  1700: 'roles no índice do Role Advisor (hoje 4.603) — a frase dizia "mais de 1.700"',
}

const arquivos = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.tsx$/.test(e.name)) arquivos.push(p)
  }
})(path.join(ROOT, 'src', 'app'))
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.tsx$/.test(e.name)) arquivos.push(p)
  }
})(path.join(ROOT, 'src', 'components'))

/*
  O DICIONÁRIO TAMBÉM É TELA — e era o buraco.

  Em 07/08 a frase de abertura do Role Advisor anunciava "mais de 1.700 roles"
  enquanto o índice tinha 4.603. Passou meses porque este script varria só
  src/app e src/components, e só .tsx: `src/i18n/pages.ts` é onde mora a prosa
  longa das páginas, e nunca foi olhado.

  Estes entram como `.ts`, e a prosa deles é justamente o que a pessoa lê.
*/
for (const nome of ['dictionary.ts', 'pages.ts']) {
  const p = path.join(ROOT, 'src', 'i18n', nome)
  if (fs.existsSync(p)) arquivos.push(p)
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')

/*
  NÚMERO FIXO QUE PODE FICAR — com o motivo, sempre.

  Sem esta lista o script fica vermelho por prosa legítima e vira ruído que
  ninguém lê, que é o pior destino de um verificador. Com ela, cada exceção
  precisa ser defendida por escrito.

  Duas naturezas, e a diferença importa:

  PROSA_HISTORICA — o número descreve o passado ("das 44 admin roles listadas,
                    só 14 existem"). Trocar por dinâmico destruiria a frase.
                    Fica para sempre.
  A_INTERPOLAR    — o número é a contagem de HOJE, escrita à mão dentro de
                    prosa. Está certo agora e vai apodrecer em silêncio. É
                    dívida registrada, não isenção: o alvo é a frase receber
                    {n} e o chamador preencher de counts.ts, como já faz
                    `adv.howCoverage` no Role Advisor.
*/
const PROSA_HISTORICA = {
  'chlog.entraDescBody':  '130 de 132 roles — narrativa do que mudou, é o passado',
  'chlog.gwsRebuildBody': '44 → 14 roles e 84 → 120 privilégios — mesma coisa',
  'chlog.gcpFullBody':     '2.381 roles do GCP na narrativa da recoleta completa',
  'chlog.azureCountTitle': '"Azure RBAC reconciliado em 504 roles" — o número É o título',
  'chlog.azureCountBody':  'a divergência 504 × 937 do AzAdvertizer É o assunto da frase',
  'chlog.awsOfficialBody': '1.553 policies — narrativa da recoleta das descrições oficiais',
}
const A_INTERPOLAR = {
  'pim.whatTwo':     'as 144 directory roles — deveria ler ENTRA_ROLES_COUNT',
  'sod.scopeIbm':    'as 71 permissões clássicas — deveria ler IBM_CLASSIC_PERMISSIONS_COUNT',
  'ibm.classicDesc': 'as 71 permissões clássicas — idem',
}

/** Qual chave do dicionário contém um dado deslocamento do arquivo. */
function chaveDoDicionario(src, idx) {
  const antes = src.slice(0, idx)
  const m = [...antes.matchAll(/^\s+'([a-zA-Z]+\.[a-zA-Z]+)':/gm)]
  return m.length ? m[m.length - 1][1] : null
}

const erros = []
const avisos = []
// Número certo hoje, escrito à mão em prosa. Não falha o build; aparece sempre.
const divida = []

for (const abs of arquivos) {
  // Separador de milhar vira nada antes de qualquer coisa: sem isto "1.700"
  // era lido como o número 700 e nenhuma regra pegava. O texto que aparece no
  // relatório sai já normalizado, o que é aceitável — o que importa ali é o
  // número, e o arquivo/linha levam ao original.
  const src = fs.readFileSync(abs, 'utf8').replace(/(\d)[.,\u00a0](\d{3})\b/g, '$1$2')

  /*
    Extrai só o que a pessoa LÊ na tela. A primeira versão limpava className e
    style e olhava o resto da linha — e afogou o relatório em falso positivo,
    porque a opacidade do Tailwind (`bg-violet-950/60`) casava como o número 60,
    e as classes moram em objeto literal, não no atributo className.

    Agora a extração é positiva em vez de negativa: pega texto entre tags JSX e
    strings que parecem prosa. O que não for isso, não entra.
  */
  const ehClasseTailwind = (str) =>
    /\b(bg|text|border|hover|dark|ring|from|to|via|p|px|py|m|mx|my|w|h|gap|rounded|opacity|z|grid|flex|col|row)-/.test(str)

  const trechos = []
  // `d="M14 3.2..."` de SVG e `size={14}` de ícone não são texto de tela
  /*
    Comentários saem; strings ficam.

    A distinção importa. A prosa de um comentário pode citar um número obsoleto
    DE PROPÓSITO — este projeto documenta em vários lugares que "o syncMeta
    anunciava GCP (232)" — e isso não é a interface mentindo, é o código se
    explicando. Foi este próprio script que se acusou: ele apontou o comentário
    de ReferenceIndex.tsx como se fosse conteúdo de tela.

    As strings, ao contrário, precisam ser preservadas: é nelas que o texto
    exibido mora.
  */
  const semRuido = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))   // preserva as linhas
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\bd=(["'])[^"']*\1/g, '')
    .replace(/\bsize=\{?\d+\}?/g, '')
  // texto entre tags: >Foo 504 bar<
  for (const m of semRuido.matchAll(/>([^<>{}]*\d{2,5}[^<>{}]*)</g)) trechos.push([m[1], m.index])
  // strings de prosa: têm espaço, letra e não são lista de classe
  for (const m of semRuido.matchAll(/(['"`])((?:[^'"`\\\n]|\\.)*\d{2,5}(?:[^'"`\\\n]|\\.)*)\1/g)) {
    const txt = m[2]
    if (!/[a-zA-Zà-ú]/.test(txt)) continue
    if (!/\s/.test(txt)) continue
    if (ehClasseTailwind(txt)) continue
    if (/^https?:/.test(txt)) continue
    trechos.push([txt, m.index])
  }

  for (const [txt, idx] of trechos) {
    const linha = semRuido.slice(0, idx).split('\n').length
    for (const m of txt.matchAll(/\b(\d{2,5})\b/g)) {
      const n = Number(m[1])
      // Abaixo de 20 é ruído: tamanho de ícone (size={14}), coordenada de SVG,
      // ano abreviado. O menor dataset real tem 14 itens, mas essa colisão
      // custa mais em falso positivo do que vale em cobertura.
      if (n < 20) continue
      const ctx = { arquivo: rel(abs), linha, valor: n, texto: txt.trim().slice(0, 100) }
      // Prosa do dicionário passa pelas exceções antes de virar erro.
      if (ctx.arquivo.startsWith('src/i18n/')) {
        const chave = chaveDoDicionario(semRuido, idx)
        if (chave && PROSA_HISTORICA[chave]) continue
        if (chave && A_INTERPOLAR[chave]) { divida.push({ ...ctx, chave }); continue }
      }
      if (OBSOLETOS[n]) erros.push({ ...ctx, motivo: `valor obsoleto — ${OBSOLETOS[n]}` })
      else if (atuais.has(n)) erros.push({ ...ctx, motivo: `igual a ${atuais.get(n)} — deveria vir de counts.ts` })
      else if (TUDO) avisos.push(ctx)
    }
  }
}

// ── syncMeta: o número no label tem de bater com o dataset ──────────────────
//
// Esta era a lacuna real. A tabela de frescor aparece nas 6 páginas de
// Reference e no /info, e o número vive dentro do `label` — string, em .ts,
// fora de src/app. Em 03/08 ela anunciava "Azure RBAC (926)", "AWS (1526)" e
// "GCP (232)" quando os datasets já estavam em 504, 1.553 e 2.381.
const SYNC_ESPERADO = {
  'entra-directory-roles': 'ENTRA_ROLES_COUNT',
  'azure-rbac-roles': 'AZURE_ROLES_COUNT',
  'azure-rbac-actions': 'AZURE_ACTIONS_COUNT',
  'aws-policies': 'AWS_POLICIES_COUNT',
  'gcp-roles': 'GCP_ROLES_COUNT',
  'ibm-roles': 'IBM_ROLES_COUNT',
}
{
  const sync = fs.readFileSync(path.join(ROOT, 'src', 'data', 'syncMeta.ts'), 'utf8')
  for (const m of sync.matchAll(/id: '([^']+)',\s*\n\s*label: '([^']*)'/g)) {
    const [, id, label] = m
    const chave = SYNC_ESPERADO[id]
    if (!chave) continue
    const num = label.match(/\(([\d.]+)\)/)
    if (!num) continue
    const declarado = Number(num[1].replace(/\./g, ''))
    const real = counts[chave]
    if (real !== undefined && declarado !== real) {
      erros.push({
        arquivo: 'src/data/syncMeta.ts',
        linha: sync.slice(0, m.index).split('\n').length,
        valor: declarado,
        motivo: `label do dataset "${id}" diz ${declarado}, o real é ${real} (${chave})`,
        texto: label,
      })
    }
  }
}

// ── /info tem de listar as mesmas ferramentas da sidebar ────────────────────
//
// Em 03/08 o /info listava 6 ferramentas e o site tinha 8: Assessment e a busca
// global entraram na sidebar e ninguém lembrou da página que se propõe a
// explicar o site. É deriva silenciosa — a página fica errada por omissão.
{
  const sidebar = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Sidebar.tsx'), 'utf8')
  const info = fs.readFileSync(path.join(ROOT, 'src', 'app', 'info', 'InfoClient.tsx'), 'utf8')

  const naSidebar = new Set(
    [...sidebar.matchAll(/router\.push\('(\/(?:advisor|compare|evaluate|sod|assessment|permission-scope|tier-comparison|search))'\)/g)]
      .map((m) => m[1]),
  )
  const noInfo = new Set([...info.matchAll(/href: '([^']+)'/g)].map((m) => m[1]))

  for (const rota of naSidebar) {
    if (!noInfo.has(rota)) {
      erros.push({
        arquivo: 'src/app/info/InfoClient.tsx',
        linha: 0,
        valor: rota,
        motivo: `ferramenta ${rota} está na sidebar mas não na lista do /info`,
        texto: 'a página que explica o site não menciona esta ferramenta',
      })
    }
  }
}

if (erros.length) {
  console.error(`\n${erros.length} problema(s) de conteúdo desatualizado:\n`)
  for (const e of erros) {
    console.error(`  ${e.arquivo}:${e.linha}`)
    console.error(`    ${e.valor} — ${e.motivo}`)
    console.error(`    ${e.texto}\n`)
  }
} else {
  console.log('OK — contagens, syncMeta e lista de ferramentas do /info conferem.')
}

if (divida.length) {
  console.log(`\n${divida.length} contagem(ns) escritas à mão em prosa (dívida conhecida, ver A_INTERPOLAR):`)
  const vistos = new Set()
  for (const d of divida) {
    if (vistos.has(d.chave)) continue
    vistos.add(d.chave)
    console.log(`  ${d.chave}  —  ${A_INTERPOLAR[d.chave]}`)
  }
}

if (TUDO && avisos.length) {
  console.log(`\n${avisos.length} número(s) solto(s) para conferir à mão:`)
  for (const a of avisos) console.log(`  ${a.arquivo}:${a.linha}  ${a.valor}  ${a.texto}`)
}

if (erros.length) process.exitCode = 1
