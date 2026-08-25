/**
 * Leitura de public/changelog.json — SÓ EM BUILD TIME.
 *
 * Separado de ./changelog.ts porque usa `fs`: um componente `'use client'` que
 * importasse este módulo (mesmo indiretamente, por um import de valor) faria o
 * webpack tentar empacotar o `fs` do Node para o navegador, e o build morre com
 * "Module not found: Can't resolve 'fs'". Só componente de servidor importa
 * daqui.
 *
 * POR QUE LÊ DE public/ EM VEZ DE IMPORTAR UM .ts
 *   O changelog cresce indefinidamente: um evento por mudança de catálogo, para
 *   sempre. Se ele virasse `src/data/changelog.ts`, cada evento novo entraria
 *   no bundle de TODA página que o importasse — o mesmo caminho que levou o
 *   `aws.ts` a 871 KB e obrigou a existir o `roleIndex.ts` do SoD.
 *
 *   Aqui é o desenho do sitemap.ts: a leitura acontece no Node, em build time,
 *   e o resultado é fatiado antes de chegar ao componente cliente. O arquivo
 *   inteiro fica em public/ e é servido como URL para quem quiser tudo.
 */
import fs from 'fs'
import path from 'path'
import type { Changelog } from './changelog'

const VAZIO: Changelog = {
  meta: {
    historyStartsAt: null, firstObservedAt: null, clouds: {},
    counts: { total: 0, derived: 0, attested: 0, byType: {} },
    quarantineOpen: 0,
    disclosure: {
      pt: 'O changelog ainda não foi gerado. Rode scripts/build-snapshot.js e scripts/build-changelog.js.',
      en: 'The changelog has not been generated yet. Run scripts/build-snapshot.js and scripts/build-changelog.js.',
    },
    typeLabels: {}, typeLabelsEn: {}, cloudLabels: {},
  },
  events: [],
}

/**
 * Lê public/changelog.json. Só em build time — a função usa `fs`.
 *
 * Devolve um changelog vazio quando o arquivo não existe, em vez de estourar:
 * o arquivo está no .gitignore (é derivado), então um clone novo que ainda não
 * rodou os scripts precisa buildar mesmo assim. A página trata o vazio como
 * estado legítimo e diz o que fazer.
 */
export function loadChangelog(): Changelog {
  try {
    const p = path.join(process.cwd(), 'public', 'changelog.json')
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Changelog
    if (!raw?.events) return VAZIO
    return raw
  } catch {
    return VAZIO
  }
}

