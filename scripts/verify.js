'use strict'
/**
 * Verificação completa antes de subir. Roda pelo hook .githooks/pre-push e
 * também à mão: `npm run verify`.
 *
 * O QUE ELE FAZ, E O QUE DELIBERADAMENTE NÃO FAZ
 *   Faz duas coisas: confere que os índices derivados estão em dia com os
 *   datasets, e roda todos os checadores.
 *
 *   NÃO roda coletor. Os scripts fetch-* puxam rede e reescrevem src/data/;
 *   dispará-los em todo push reescreveria dado sozinho, sem ninguém olhar, e
 *   dois deles nem funcionam fora da máquina do mantenedor. Coleta é ato
 *   deliberado — ver a seção "Fluxo de atualização" do README.
 *
 * POR QUE OS ÍNDICES VÊM ANTES DOS CHECADORES
 *   A verificação de índice deixa o gerador escrever por um instante para
 *   comparar, e devolve o original em seguida. Os checadores leem esses mesmos
 *   arquivos, então rodar os dois ao mesmo tempo daria leitura suja. Índices
 *   em sequência primeiro; checadores em paralelo depois.
 *
 * POR QUE OS CHECADORES RODAM EM PARALELO
 *   São dez, somam ~30 s em sequência e ~7 s em paralelo. Um hook de 30 s é um
 *   hook que alguém desliga.
 *
 * O HOOK NÃO ALTERA ARQUIVO RASTREADO
 *   Quando um índice está velho, ele restaura o original e manda você rodar o
 *   gerador. Um pre-push que edita a árvore por conta própria muda o que você
 *   pensa que está empurrando.
 */
const { execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.join(__dirname, '..')

/**
 * Quantos checadores ao mesmo tempo.
 *
 * Cada um é um processo Node que transpila os datasets — trabalho de CPU, não
 * de espera. Soltar os dez de uma vez numa máquina de 2 núcleos não acelera
 * nada, só faz eles brigarem: medido, 3 em paralelo levou 21,9 s contra ~28 s
 * em sequência. Seguir o número de núcleos dá o ganho de verdade onde ele
 * existe e não piora onde não existe. O teto de 8 é porque acima disso o
 * gargalo passa a ser o disco.
 */
const PARALELO = Math.max(2, Math.min(os.cpus().length, 8))

/** Roda `tarefas` com no máximo `n` em voo, preservando a ordem do resultado. */
async function comLimite(itens, n, fn) {
  const saida = new Array(itens.length)
  let proximo = 0
  await Promise.all(
    Array.from({ length: Math.min(n, itens.length) }, async () => {
      while (proximo < itens.length) {
        const i = proximo++
        saida[i] = await fn(itens[i])
      }
    })
  )
  return saida
}

const SO_CHECADORES = process.argv.includes('--rapido')
const ESC = ''
const usarCor = process.stdout.isTTY && !process.env.NO_COLOR
const c = (n, s) => (usarCor ? `${ESC}[${n}m${s}${ESC}[0m` : s)
const verde = (s) => c(32, s)
const vermelho = (s) => c(31, s)
const amarelo = (s) => c(33, s)
const cinza = (s) => c(90, s)
const azul = (s) => c(36, s)

/**
 * Dívida conhecida: geradores que estão quebrados e cujo conserto foi adiado
 * de propósito. Eles avisam em toda execução mas não travam o push.
 *
 * REGRA PARA MEXER AQUI
 *   Entrar nesta lista é decisão consciente, com data e motivo escritos. Sair
 *   dela é automático: quando o script voltar a rodar, o verify avisa que a
 *   entrada pode ser removida. Sem esse aviso a lista vira gaveta e a dívida
 *   some de vista, que é o oposto do que ela serve.
 */
const CONHECIDOS_QUEBRADOS = {
  'build-assessment-catalog.js': {
    desde: '2026-08-25',
    porque:
      'refRole() so conhece entra-id e assume Azure para todo o resto. O SoD virou ' +
      'multi-cloud em 07/08 (190 regras em 5 plataformas), entao as referencias de ' +
      'AWS, GCP, Workspace e IBM caem no else, sao procuradas no mapa do Azure e nao ' +
      'resolvem — 133 no total. O prefixo "azure-rbac:" da mensagem e hardcoded, por ' +
      'isso a lista mostra slugs que obviamente nao sao do Azure.',
    efeito:
      'public/iamscope-catalog.json, que alimenta os dois .ps1 de assessment, esta ' +
      'sem as regras de SoD dessas quatro plataformas desde 07/08.',
    conserto: 'estender refRole() em scripts/build-assessment-catalog.js (~linha 87) para as 6 clouds',
  },
}

/**
 * Índices derivados, em ondas.
 *
 * A ordem não é estética: dois geradores leem a saída de outro.
 *   build-search-index   lê public/azure-perms-index.json
 *   build-sod-role-index lê src/data/counts.ts
 * Rodar tudo junto faria esses dois lerem um arquivo no meio da reescrita.
 * Dentro de uma onda os alvos são distintos, então pode ir em paralelo.
 */
const ONDAS = [
  [
    { script: 'build-counts.js', saida: 'src/data/counts.ts', quando: 'depois de qualquer coleta' },
    { script: 'build-azure-perms-index.js', saida: 'public/azure-perms-index.json', quando: 'se mexeu no Azure' },
    { script: 'build-assessment-catalog.js', saida: 'public/iamscope-catalog.json', quando: 'se mexeu em roles ou SoD' },
  ],
  [
    { script: 'build-search-index.js', saida: 'public/search-index.json', quando: 'sempre que roles mudarem' },
    { script: 'build-sod-role-index.js', saida: 'src/data/sod/roleIndex.ts', quando: 'se mexeu em roles do SoD' },
  ],
]
const INDICES = ONDAS.flat()

/** Checadores. `antes` roda primeiro quando o checador depende de um gerador. */
const CHECADORES = [
  { script: 'check-syntax.cjs' },
  { script: 'check-imports.js' },
  { script: 'check-static-export.js' },
  { script: 'check-sidebar-focus.js' },
  { script: 'check-stale-numbers.js' },
  { script: 'check-site-index.js' },
  { script: 'check-i18n-scope.js' },
  { script: 'check-links.js' },
  { script: 'check-changelog.js' },
  // A API é gerada e só então conferida: o contrato vale sobre a saída dela.
  // build-api escreve em public/api/, que é gitignored — não suja a árvore.
  { script: 'check-api-contract.js', antes: 'build-api.js' },
]

function rodar(script) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    execFile(
      process.execPath,
      [path.join(ROOT, 'scripts', script)],
      { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({ ok: !err, ms: Date.now() - t0, saida: `${stdout || ''}${stderr || ''}`.trimEnd() })
      }
    )
  })
}

const ms = (n) => `${String(n).padStart(5)}ms`
const ultimaLinha = (s) => (s.split('\n').filter((l) => l.trim()).pop() || '').slice(0, 68)

/**
 * Tira o carimbo de data antes de comparar.
 *
 * Três dos cinco geradores escrevem a hora da geração dentro do arquivo
 * (`// Gerado em:` no .ts, `generatedAt` no .json). Sem apagar isso, a
 * comparação byte a byte acusa "velho" em toda execução, o hook vira ruído e
 * alguém desliga. O que interessa é se o CONTEÚDO mudaria.
 */
function normalizar(buf) {
  return buf
    .toString('utf8')
    .replace(/^\/\/ Gerado em:.*$/gm, '// Gerado em: <ignorado>')
    .replace(/"(generatedAt|extractedAt|fetchedAt|builtAt)"\s*:\s*"[^"]*"/g, '"$1":"<ignorado>"')
}

async function conferirUm(idx) {
  const alvo = path.join(ROOT, idx.saida)

  if (!fs.existsSync(alvo)) return { idx, estado: 'AUSENTE', ms: 0, saida: '' }

  const original = fs.readFileSync(alvo)
  let r = null
  let gerado = null
  try {
    r = await rodar(idx.script)
    gerado = fs.existsSync(alvo) ? fs.readFileSync(alvo) : null
  } finally {
    // Devolve o original sempre que o gerador tiver mexido no arquivo. O
    // finally é o que garante isso mesmo se o gerador explodir no meio.
    if (!gerado || !gerado.equals(original)) fs.writeFileSync(alvo, original)
  }

  if (!r || !r.ok) return { idx, estado: 'ERRO', ms: r ? r.ms : 0, saida: r ? r.saida : '' }
  if (!gerado || normalizar(gerado) !== normalizar(original)) {
    return { idx, estado: 'VELHO', ms: r.ms, saida: '' }
  }
  return { idx, estado: 'ok', ms: r.ms, saida: '' }
}

const tolerados = []

async function conferirIndices() {
  console.log(azul('\n-- Indices derivados ' + '-'.repeat(49)))
  const velhos = []

  for (const onda of ONDAS) {
    const res = await Promise.all(onda.map(conferirUm))
    for (const { idx, estado, ms: t, saida } of res) {
      const rotulo = idx.saida.padEnd(34)
      const divida = CONHECIDOS_QUEBRADOS[idx.script]

      if (estado === 'ok' || estado === 'VELHO') {
        // Se está na lista de dívida e voltou a rodar, avise para tirar de lá.
        if (divida) {
          console.log(`  ${amarelo('CUROU  ')} ${rotulo} ${ms(t)}  ${cinza('roda de novo — remova de CONHECIDOS_QUEBRADOS')}`)
        }
        if (estado === 'ok') {
          if (!divida) console.log(`  ${verde('ok     ')} ${rotulo} ${ms(t)}`)
        } else {
          console.log(`  ${vermelho('VELHO  ')} ${rotulo} ${ms(t)}  ${cinza(idx.quando)}`)
          velhos.push({ idx, estado, saida })
        }
        continue
      }

      if (divida) {
        console.log(`  ${amarelo('DIVIDA ')} ${rotulo} ${ms(t)}  ${cinza(`quebrado desde ${divida.desde}`)}`)
        tolerados.push({ idx, divida })
      } else {
        console.log(`  ${vermelho(estado.padEnd(7))} ${rotulo} ${ms(t)}  ${ultimaLinha(saida)}`)
        velhos.push({ idx, estado, saida })
      }
    }
  }
  return velhos
}

async function rodarChecadores() {
  console.log(azul('\n-- Checadores ' + '-'.repeat(56)))

  const resultados = await comLimite(CHECADORES, PARALELO, async (ch) => {
    if (ch.antes) {
      const pre = await rodar(ch.antes)
      if (!pre.ok) {
        return { ch, r: { ok: false, ms: pre.ms, saida: `${ch.antes} falhou antes de ${ch.script}:\n${pre.saida}` } }
      }
    }
    return { ch, r: await rodar(ch.script) }
  })

  const falhas = []
  for (const { ch, r } of resultados) {
    const rotulo = ch.script.padEnd(24)
    if (r.ok) {
      console.log(`  ${verde('ok     ')} ${rotulo} ${ms(r.ms)}  ${cinza(ultimaLinha(r.saida))}`)
    } else {
      console.log(`  ${vermelho('FALHOU ')} ${rotulo} ${ms(r.ms)}`)
      falhas.push({ ch, r })
    }
  }
  return falhas
}

async function main() {
  const t0 = Date.now()
  console.log(cinza(`verify: ${os.cpus().length} nucleo(s), ate ${PARALELO} checador(es) em paralelo`))

  const problemas = SO_CHECADORES ? [] : await conferirIndices()
  const velhos = problemas.filter((p) => p.estado === 'VELHO' || p.estado === 'AUSENTE')
  const quebrados = problemas.filter((p) => p.estado === 'ERRO')
  if (SO_CHECADORES) console.log(cinza('\n(--rapido: verificacao de indice derivado pulada)'))

  const falhas = await rodarChecadores()
  const total = ((Date.now() - t0) / 1000).toFixed(1)

  const mostrarDivida = () => {
    for (const { idx, divida } of tolerados) {
      console.log(amarelo(`\n-- divida conhecida: ${idx.script} `) + cinza(`(desde ${divida.desde})`))
      console.log(cinza(`   ${divida.porque}`))
      console.log(cinza(`   Efeito:   ${divida.efeito}`))
      console.log(cinza(`   Conserto: ${divida.conserto}`))
    }
  }

  if (!velhos.length && !quebrados.length && !falhas.length) {
    const quantos = SO_CHECADORES ? `${CHECADORES.length} checadores` : `${INDICES.length} indices e ${CHECADORES.length} checadores`
    console.log(verde(`\nOK - ${quantos} em ${total}s`))
    mostrarDivida()
    if (tolerados.length) console.log(amarelo(`\n${tolerados.length} divida(s) tolerada(s) — o push passa, mas isso continua quebrado.\n`))
    else console.log('')
    process.exit(0)
  }

  console.log(vermelho(`\nPUSH INTERROMPIDO - ${total}s\n`))

  // VELHO e ERRO pedem coisas diferentes. Mandar rodar um gerador que está
  // quebrado só faz a pessoa ver o mesmo erro de novo.
  if (velhos.length) {
    console.log('Indice derivado fora de data. Rode, confira o diff e commite:\n')
    for (const v of velhos) console.log(`    node scripts/${v.idx.script}`)
    console.log(cinza('\n  (o hook nao altera arquivo rastreado; a regeneracao e sua)\n'))
  }

  for (const q of quebrados) {
    console.log(vermelho(`-- ${q.idx.script} nao roda ` + '-'.repeat(Math.max(4, 48 - q.idx.script.length))))
    console.log(cinza(`   (o indice ${q.idx.saida} nao pode ser regerado enquanto isso nao for corrigido)\n`))
    console.log(q.saida.split('\n').slice(-20).join('\n'))
    console.log('')
  }

  for (const { ch, r } of falhas) {
    console.log(vermelho(`-- ${ch.script} ` + '-'.repeat(Math.max(4, 58 - ch.script.length))))
    console.log(r.saida.split('\n').slice(-25).join('\n'))
    console.log('')
  }

  mostrarDivida()

  console.log(cinza('\nPara empurrar assim mesmo (e voce deve ter um bom motivo):'))
  console.log(cinza('    git push --no-verify\n'))
  process.exit(1)
}

main().catch((e) => {
  console.error(vermelho('\nverify.js quebrou:'), e)
  process.exit(1)
})
