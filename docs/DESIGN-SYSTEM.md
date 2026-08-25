# Design System

Referência curta de como escrever estilo neste projeto. A fonte de verdade é
`tailwind.config.js` (tokens) + `src/app/globals.css` (variáveis de tema).

## A regra

**Componentes não escrevem valor solto.** Nada de `text-[13px]`, nada de `bg-[#0078d4]`.
Cor, tamanho de texto, sombra, raio, duração e camada saem de token. Se o valor que você
precisa não existe como token, o certo é **adicionar o token** — não escrever o valor no
`className`.

Motivo prático: em agosto/2026 o projeto tinha 1.211 tamanhos de texto arbitrários e 587 hex
crus em classe, com os tokens equivalentes já definidos e sem uso. Nenhuma mudança visual
global era possível sem find-and-replace, e o sistema divergiu sozinho até virar bug de
contraste (roxo do Azure RBAC a 1.89:1 no menu).

---

## Cor

### Semânticas — use estas por padrão

Resolvem tema claro e escuro sozinhas. Prefira sempre a `bg-white dark:bg-gray-900`.

| Token | Papel |
|---|---|
| `bg-app` | fundo da aplicação |
| `bg-surface` | cards, header, sidebar |
| `bg-surface-alt` | `thead`, linha zebrada |
| `bg-surface-hover` | hover de linha/item |
| `text-fg` | texto primário |
| `text-fg-muted` | texto secundário (≥ 4.5:1 — pode ser corpo) |
| `text-fg-subtle` | metadado (≥ 3:1 — **nunca** corpo de texto) |
| `border-line` | divisória, borda de card |
| `border-line-strong` | borda de input e controle |

Os valores vivem em `globals.css` como triplete RGB (`--c-fg: 243 244 246`). O formato
`rgb(var(--token) / <alpha-value>)` no config é o que mantém os modificadores de opacidade
funcionando: `bg-surface/60` e `text-fg-muted/70` funcionam normalmente.

### Marca e estado

`brand`, `brand-hover`, `brand-soft`, `brand-onDark`, `brand-activeBg`…
`success`, `warning`, `danger`, `info` — cada um com `-fg` (texto) e `-soft` (fundo).

> Cor nunca é o único portador de significado. Estado sempre acompanhado de ícone ou rótulo
> (regra `color-not-only`).

### Clouds — duas cores por cloud, e a distinção importa

| Token | Papel | Requisito de contraste |
|---|---|---|
| `csp-<cloud>` | marca: ponto, barra, fundo de badge | 3:1 contra o fundo |
| `csp-<cloud>-onDark` | texto sobre superfície escura | 4.5:1 (AA, 13px) |

Usar a cor de marca como **texto** no tema escuro é o erro que essa separação previne: o
roxo do Azure RBAC (`#5c2d91`) rende 1.89:1 como texto.

Quem precisa da cor como **classe** usa os tokens `csp-*`. Quem precisa dela como **valor**
(CSS custom property, `style` inline, SVG) importa de `src/lib/cloudColors.ts`. Esse arquivo
e o `tailwind.config.js` têm de espelhar um ao outro — são a fonte única desde que três
listas divergentes foram unificadas.

---

## Tipografia

Escala nomeada, aditiva (não sobrescreve `text-xs`/`text-base` do Tailwind).

| Token | px / line-height | Uso |
|---|---|---|
| `text-micro` | 9 / 14 | badge de sigla |
| `text-2xs` | 10 / 15 | metadado, ID |
| `text-3xs` | 11 / 16 | legenda, `th` de tabela |
| `text-tiny` | 12 / 18 | texto secundário |
| `text-body` | 13 / 20 | **corpo padrão do app** |
| `text-note` | 14 / 21 | rótulo de card, leitura |
| `text-lead` | 15 / 22 | título de header |
| `text-sub` | 18 / 26 | subtítulo de seção |
| `text-heading` | 20 / 28 | título de seção |
| `text-stat` | 22 / 28 | número de StatCard |
| `text-title` | 24 / 30 | título de página |
| `text-display-sm` / `display` / `display-lg` | 26 / 28 / 32 | hero |

Até 15px a entre-linha é 1.5 (leitura). Acima de 18px fecha progressivamente — 1.5 num
título grande abre buraco no layout.

Famílias: `font-sans` (pilha de sistema) e `font-mono` — mono é a **fonte de dado**: ID,
ARN, string de permissão.

Números em coluna são tabulares por padrão (`<table>` e a classe `.tabular` aplicam
`font-variant-numeric: tabular-nums`), para a coluna não dançar entre páginas.

---

## Movimento

`duration-fast` (150ms, micro-interação) · `duration-base` (200ms, mudança de estado) ·
`duration-slow` (300ms, entrada de painel).
`ease-enter` para entrada, `ease-exit` para saída.

Anime `transform` e `opacity` — nunca `width`/`height`/`top`/`left`.

`globals.css` já neutraliza movimento sob `prefers-reduced-motion`. O que é anulado é o
deslocamento, não o feedback: hover e foco continuam mudando de cor.

---

## Camadas

`z-sticky` (20, `thead` sticky e barras de filtro) · `z-header` (30) · `z-drawer` (40) ·
`z-overlay` (50) · `z-toast` (60). Não invente `z-[999]`.

---

## Foco

`globals.css` garante anel de 2px em qualquer elemento focado por teclado, **inclusive** onde
houver `focus:outline-none`. Não é preciso repetir `focus-visible:ring-*` em cada componente;
quem já tem, continua funcionando (o `ring` é box-shadow e convive com o outline).

Nunca remova o anel sem colocar outro no lugar.

---

## Checklist antes de abrir PR de UI

- [ ] Nenhum `text-[Npx]` nem `[#hex]` novo no diff
- [ ] Par foreground/background novo verificado: corpo ≥ 4.5:1, metadado ≥ 3:1
- [ ] Botão só-ícone tem `aria-label`
- [ ] Estado não depende só de cor (tem ícone ou texto junto)
- [ ] Alvo de toque ≥ 44×44px em telas pequenas
- [ ] Testado a 375px e com "reduzir movimento" ligado
