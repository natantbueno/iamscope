/** @type {import('tailwindcss').Config} */

// -----------------------------------------------------------------------------
// Design tokens — fonte única de verdade do sistema visual.
//
// Regra do projeto: componentes NÃO usam hex cru nem `text-[13px]`. Tudo que é
// cor, tamanho de texto, sombra, raio, duração ou z-index sai daqui. Se um valor
// não existe como token, o certo é adicioná-lo aqui — não escrever o valor solto
// no className (ver docs/DESIGN-SYSTEM.md).
//
// As cores semânticas (surface/fg/line/accent) são resolvidas em runtime a
// partir das CSS custom properties definidas em src/app/globals.css. Isso é o
// que permite trocar tema (dark/light) sem duplicar `x dark:x` em cada classe.
// O formato `rgb(var(--token) / <alpha-value>)` preserva os modificadores de
// opacidade do Tailwind (ex.: `bg-surface/60`).
// -----------------------------------------------------------------------------
const semantic = (v) => `rgb(var(${v}) / <alpha-value>)`

module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------------
        // Camada semântica (theme-aware). Prefira SEMPRE estes tokens a
        // pares `bg-white dark:bg-gray-900`: um token = um conceito, e o
        // tema é trocado em um lugar só.
        // ---------------------------------------------------------------
        app: semantic('--c-bg-app'),           // fundo da aplicação
        surface: {
          DEFAULT: semantic('--c-bg-surface'),  // cards, header, sidebar
          alt: semantic('--c-bg-surface-alt'),  // linhas zebradas, thead
          hover: semantic('--c-bg-surface-hover'),
          // Mantidos do config anterior para não quebrar classes existentes.
          border: '#dde3ec',
          muted: '#eef1f5',
          subtle: '#f5f8fc',
          faint: '#f7f9fc',
        },
        fg: {
          DEFAULT: semantic('--c-fg'),          // texto primário
          muted: semantic('--c-fg-muted'),      // texto secundário (>= 4.5:1)
          subtle: semantic('--c-fg-subtle'),    // metadados (>= 3:1, nunca corpo)
          onAccent: semantic('--c-fg-on-accent'),
        },
        line: {
          DEFAULT: semantic('--c-line'),        // divisórias e bordas de card
          strong: semantic('--c-line-strong'),  // bordas de input/controle
        },

        // Acento de interface — o ÚNICO realce cromático da navegação.
        // Resolve de --c-accent, que já existe nos dois temas e está
        // verificado (5.4:1 no claro, 8.4:1 no escuro). Serve ao estado
        // "selecionado"; decoração não usa cor (ver ROTEIRO-UI-ANTI-IA.md).
        accent: semantic('--c-accent'),

        // Estado — cor NUNCA é o único portador de significado (regra
        // `color-not-only`): sempre acompanhada de ícone ou rótulo.
        success: { DEFAULT: '#1a7f4b', fg: '#4ade80', soft: '#0a2a1a' },
        warning: { DEFAULT: '#a16207', fg: '#fbbf24', soft: '#2a1800' },
        // DEFAULT resolve de --c-danger: um `text-danger` serve os dois temas,
        // sem par `x dark:x`. `fg`/`soft` continuam fixos para quem já os usa.
        danger:  { DEFAULT: semantic('--c-danger'), fg: '#f87171', soft: '#2a1010' },
        info:    { DEFAULT: '#0078d4', fg: '#85b7eb', soft: '#0a1a38' },

        // Cor de marca (Entra/Azure blue) e seus estados.
        brand: {
          DEFAULT: '#0078d4',
          // Variante para TEXTO sobre superficie clara: o #0078d4 rende 4.0:1
          // sobre as superficies claras reais do app (nao sobre branco puro),
          // abaixo do minimo. Par natural do `onDark`.
          strong: '#006cbe',
          hover: '#106ebe',
          soft: '#e8f1fb',     // fundo claro (hover/realce)
          mid: '#9dc3e8',      // borda de realce
          onDark: '#85b7eb',   // texto azul sobre superficies escuras
          activeBg: '#0c2a47', // fundo do item de navegacao ativo (dark)
          activeRing: '#185fa5',
          activeText: '#85b7eb',   // texto do item ativo na sidebar (dark)
          activeBorder: '#185fa5', // borda/underline do item ativo
          hoverBg: '#0d1f33',      // fundo do item em hover (dark, mais sutil que activeBg)
        },

        // ---------------------------------------------------------------
        // Cores por Cloud Solution Provider — NEUTRALIZADAS (nível 3).
        //
        // Histórico: existiam três listas divergentes; foram unificadas aqui em
        // agosto/2026, com uma cor de marca por cloud e variantes onDark/onLight
        // para texto. Em 06/08/2026 o site passou a ser monocromático e os
        // tokens foram REAPONTADOS para a escala neutra, em vez de removidos —
        // são 221 usos em 26 arquivos, e apagá-los seria churn sem ganho.
        //
        // Por que a cor de cloud saiu, e não é gosto:
        //   1. Três das seis não cumpriam o próprio requisito de 3:1 declarado
        //      logo acima — AWS #ff9900 dava 2.14:1 no tema claro, IBM #08bdba
        //      2.33:1, e o roxo do Azure RBAC 1.89:1 no escuro.
        //   2. A identidade da cloud já está no nome, na rota e na posição do
        //      menu. A cor era redundante com três sinais mais fortes.
        //
        // Os quatro papéis continuam existindo para que nenhum `className`
        // quebre, mas os quatro resolvem da mesma escala neutra e theme-aware.
        // Voltar atrás é reescrever este bloco — e só ele.
        // ---------------------------------------------------------------
        csp: (() => {
          const mark    = semantic('--c-fg-subtle')  // ponto, barra, fundo de badge
          const onText  = semantic('--c-fg-muted')   // texto sobre qualquer superfície
          const hover   = semantic('--c-fg')
          const out = {}
          for (const c of ['azure', 'azure-rbac', 'aws', 'gcp', 'gws', 'ibm']) {
            out[c] = mark
            out[`${c}-hover`] = hover
            out[`${c}-onDark`] = onText
            out[`${c}-onLight`] = onText
          }
          return out
        })(),

        // Mantido para compatibilidade com classes existentes (entra-blue etc.).
        entra: {
          blue: '#0078d4',
          'blue-light': '#e8f1fb',
          'blue-mid': '#9dc3e8',
        },
      },

      // -----------------------------------------------------------------
      // Escala tipográfica — nomes ADITIVOS (não sobrescrevem xs/sm/base do
      // Tailwind). Substituem os text-[9px]...[32px] ad-hoc.
      //
      // Corpo (<=15px): line-height 1.5, idêntico ao que o preflight do
      // Tailwind já aplicava nas classes arbitrárias — a migração não muda
      // altura de linha em tabela nenhuma.
      // Títulos (>=18px): line-height progressivamente mais fechado, como
      // manda a tipografia (1.5 em título grande abre buraco no layout).
      // -----------------------------------------------------------------
      fontSize: {
        micro: ['9px', '14px'],  // badges de sigla (SoD cloud, tier)
        '2xs': ['10px', '15px'], // metadados, IDs
        '3xs': ['11px', '16px'], // legendas, cabeçalho de tabela
        tiny: ['12px', '18px'],  // texto secundario
        body: ['13px', '20px'],  // corpo padrao do app
        note: ['14px', '21px'],  // rótulo de card, corpo de leitura
        lead: ['15px', '22px'],  // titulos de header
        sub: ['18px', '26px'],   // subtítulo de seção
        heading: ['20px', '28px'],
        stat: ['22px', '28px'],  // numeros de StatCard
        title: ['24px', '30px'], // titulo de pagina de detalhe
        'display-sm': ['26px', '32px'],
        display: ['28px', '34px'],
        'display-lg': ['32px', '38px'],
      },

      fontFamily: {
        // A pilha de sistema estava só no body do globals.css, fora do
        // alcance do Tailwind. Aqui ela vira token — e `font-mono` passa a
        // ser explicitamente a fonte de dados (IDs, ARNs, permissões).
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
          'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        mono: [
          'ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas',
          'Liberation Mono', 'monospace',
        ],
      },

      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        raised: '0 4px 12px -2px rgb(0 0 0 / 0.18)',
        dropdown: '0 10px 24px -6px rgb(0 0 0 / 0.35)',
      },

      borderRadius: {
        card: '0.5rem',
      },

      // Escala de movimento — regra `motion-consistency`: todas as transições
      // do produto compartilham o mesmo ritmo. 150ms para micro-interação,
      // 200ms para mudança de estado, 300ms para entrada de painel.
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',  // ease-out para entrada
        exit: 'cubic-bezier(0.4, 0, 1, 1)',      // ease-in para saída
      },

      // Escala de camadas — regra `z-index-management`. Evita o z-10/z-50
      // solto disputando com sticky header de tabela.
      zIndex: {
        base: '0',
        sticky: '20',   // thead sticky, barras de filtro
        header: '30',
        drawer: '40',
        overlay: '50',
        toast: '60',
      },
    },
  },
  plugins: [],
}
