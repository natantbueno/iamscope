# Auditoria UI/UX — Multi-Cloud IAM Reference

**Data:** 02/08/2026
**Base:** skill `ui-ux-pro-max` (67 estilos, 161 paletas, 99 diretrizes de UX), rodada com
`--design-system --variance 3 --motion 3 --density 8` para o perfil do produto
(ferramenta de referência, densa em dados, uso profissional).
**Escopo pedido:** design system e consistência visual.
**Superfície analisada:** 142 arquivos `.tsx`, `tailwind.config.js`, `globals.css`.

---

## Veredito

O projeto **já tinha um design system** — `tailwind.config.js` define tokens de marca,
superfície, cores por cloud e uma escala tipográfica nomeada. O problema não é ausência
de sistema: é **adoção zero**.

| Token definido | Usos no código |
|---|---|
| `text-2xs`, `text-3xs`, `text-tiny`, `text-body`, `text-lead`, `text-stat`, `text-title` | **0** |
| `text-brand`, `bg-brand` | **0** |
| `rounded-card` | **0** |
| `bg-surface-subtle` | **0** |
| `border-surface-border` | 5 (contra 197 usos do hex cru equivalente) |

Enquanto isso, os componentes carregavam **1.211 tamanhos de texto arbitrários**
(`text-[13px]`, em 16 valores distintos) e **587 hex crus em classe** — sendo que
`#dde3ec` aparecia 197 vezes e `#0078d4` 100 vezes, ambos já existentes como token.

O efeito prático: nenhuma mudança visual global era possível sem um find-and-replace de
centenas de ocorrências, e o sistema divergiu sozinho em três pontos que viraram bug real
de acessibilidade (detalhados em P0).

Regra do skill que resume o diagnóstico: `color-semantic` — *"Define semantic color tokens,
not raw hex in components"*.

---

## P0 — Crítico (corrigido)

### 1. Foco invisível em 22 controles
`focus:outline-none` aparecia 27 vezes; só 5 devolviam um anel com `focus-visible:ring`.
Nos outros 22 — inputs de busca do Advisor, do Permission Scope, filtros do Azure/GCP,
selects de paginação — quem navega por teclado ficava sem nenhuma indicação de onde está.

É o anti-padrão nº 1 da tabela de prioridades do skill (`Accessibility / CRITICAL`:
*"Removing focus rings"*).

**Correção:** garantia global em `globals.css`. Qualquer elemento focado por teclado recebe
anel de 2px na cor `--c-ring`. O `!important` é deliberado e está comentado no arquivo:
`.classe:focus` do Tailwind tem especificidade maior que `:focus-visible`, então sem ele a
garantia não valeria. Componentes que já desenham o próprio anel usam `ring-*` (box-shadow),
que convive com o outline sem conflito.

### 2. Nenhum suporte a `prefers-reduced-motion`
263 transições e vários hovers com `-translate-y-0.5` / `scale-125` rodavam idênticos para
quem marcou "reduzir movimento" no sistema operacional. Zero ocorrências de `motion-reduce`
ou da media query no projeto inteiro. Falha de WCAG 2.3.3.

**Correção:** bloco `@media (prefers-reduced-motion: reduce)` em `globals.css`. Anula o
movimento, não o feedback: hover e foco continuam mudando de cor, só param de deslizar.

### 3. Roxo do Azure RBAC ilegível no tema escuro — 1.89:1
O `CloudNav` pintava o texto do item ativo com a cor de marca da cloud via
`--cloud-color`. Para o Azure RBAC isso é `#5c2d91` sobre `#111827`: **1.89:1**, contra
o mínimo de 4.5:1 do WCAG AA para texto de 13px. O Entra ID também não passava (3.92:1).

**Correção:** cada cloud agora tem **duas** cores, e a distinção é acessibilidade, não estética:

| Token | Papel | Requisito |
|---|---|---|
| `csp-<cloud>` | marca — ponto, barra, fundo de badge | 3:1 contra o fundo |
| `csp-<cloud>-onDark` | texto sobre superfície escura | 4.5:1 (AA, 13px) |

Azure RBAC passou de 1.89:1 para **5.3:1** (`#a479d5`); Entra ID, de 3.92:1 para **8.4:1**
(`#85b7eb`, token que já existia e não estava sendo usado para isso).

### 4. A mesma cloud tinha três identidades visuais diferentes
Existiam três listas de cor por cloud, e elas divergiam:

| Cloud | `tailwind.config` / cards | `CloudNav` / `Sidebar` / `/compare` |
|---|---|---|
| GCP | `#4285f4` azul | `#0f9d58` verde |
| IBM Cloud | `#0f62fe` azul | `#08bdba` teal |
| Azure RBAC | *(sem cor própria — herdava o azul do Entra)* | `#5c2d91` roxo |

Além da divergência, o conjunto do menu tinha uma colisão própria: GCP `#0f9d58` e Google
Workspace `#34a853` são dois verdes praticamente indistinguíveis, lado a lado num menu de
7 itens.

**Correção:** `src/lib/cloudColors.ts` é a fonte única; `CloudNav`, `Sidebar` e
`data/compare/types.ts` consomem de lá, e nenhum deles declara mais hex. Conjunto adotado
(o híbrido que você escolheu): GCP `#4285f4` azul oficial (resolve a colisão com o verde do
Workspace) e IBM `#08bdba` teal do Carbon (evita o terceiro azul no mesmo menu).

> **Isso é a mudança visual mais visível deste trabalho.** As páginas de IBM Cloud passam de
> azul para teal, e o menu/sidebar do GCP passa de verde para azul. Reverter é trocar dois
> valores em `cloudColors.ts` e dois em `tailwind.config.js`.

### 5. Texto branco sobre card branco na home
`src/app/(home)/HomeClient.tsx` tinha `text-white` nas métricas de um card
`bg-white dark:bg-gray-900`. Hoje não aparece porque o tema escuro está forçado — é uma
bomba-relógio que estoura no instante em que o tema claro voltar. Corrigido para `text-fg-muted`,
que resolve nos dois temas (6.1:1 no claro, 8.8:1 no escuro).

### 6. Sem skip link e sem landmark de conteúdo
Quem navega por teclado atravessava os 7 itens do menu de clouds **mais a sidebar inteira**
antes de chegar ao conteúdo — em toda página. Adicionado skip link no `AppShell` e
`id="main-content"` no `<main>`.

### 7. `<html lang="pt-BR">` fixo com i18n ativo
O site tem `LanguageSwitcher` e dicionário, mas o atributo `lang` estava travado em pt-BR.
Leitor de tela lê o conteúdo inteiro com a pronúncia errada. Mudado para o neutro do
conteúdo (`en`); o ajuste por idioma no client fica como tarefa de continuação (ver P2).

---

## P1 — Alto impacto (corrigido)

### 8. Escala tipográfica: 1.211 valores ad-hoc → tokens
Migrados todos os `text-[Npx]` para a escala nomeada. **Sobrou zero.**

A escala foi completada (faltavam 14px, 18px, 20px, 26px, 28px, 32px, 9px) e as
entre-linhas foram calibradas para **não mudar altura de linha nenhuma** no corpo do texto:
até 15px o token usa `line-height: 1.5`, que é exatamente o que o preflight do Tailwind já
aplicava nas classes arbitrárias. Nenhuma tabela mudou de altura. Acima de 18px as
entre-linhas fecham progressivamente, como manda a tipografia de título.

### 9. Cores: 587 hex crus em classe → tokens
`[#dde3ec]` → `surface-border`, `[#0078d4]` → `brand`, `[#85b7eb]` → `brand-onDark`,
`[#ff9900]` → `csp-aws`, e assim por diante — 76 arquivos tocados, sem mudança de valor
(exceto GCP/IBM, decisão do item 4). Sobraram 12 hex verdadeiramente pontuais, que não
justificam token.

### 10. Números não tabulares num produto que é 100% coluna de contagem
`permissionCount`, número de roles, paginação — com figuras proporcionais os dígitos têm
larguras diferentes e a coluna se desloca a cada troca de página. Regra `number-tabular`.
Aplicado `font-variant-numeric: tabular-nums` em toda `<table>` e na classe utilitária
`.tabular`.

### 11. Sem escala de movimento nem de camadas
263 transições, mas só dois valores de duração no projeto inteiro (`duration-150` e um
`duration-200` solto) e `z-10`/`z-50` disputando com o `thead` sticky das tabelas.
Adicionados tokens: `duration-fast|base|slow`, `ease-enter|exit`,
`z-sticky|header|drawer|overlay|toast`. (Regras `motion-consistency`, `z-index-management`.)

### 12. Busca global só existia no tema escuro
`GlobalSearch` tinha `bg-gray-800 border-gray-700 text-gray-100` fixos — sem par claro,
dentro de um contêiner `bg-white dark:bg-gray-900`. E o anel de foco era de 1px (o skill
pede 2–4px). Migrado para tokens semânticos e anel de 2px.

### 13. Scrim do drawer mobile em 50%
Limite inferior da faixa recomendada (40–60%). Subido para 60%, que isola melhor o menu do
fundo escuro do app.

---

## P2 — Recomendado, **não** implementado

Estes eu deixei de fora de propósito: ou são decisão de produto sua, ou o risco de mexer
sem verificação visual página a página não compensa.

### 14. ~~O tema claro é código morto~~ — **implementado na 2ª rodada**

Ver a seção "Tema claro" no fim deste documento.

### 15. `Sidebar.tsx` com 43 KB
~1.100 linhas num componente só, que carrega em toda página. Vale quebrar em
`PlatformList` / `ViewNav` / `ToolsSection`, mas é refactor de estrutura, não de visual.

### 16. Idioma misturado dentro da mesma tela
`RolesTable.tsx` tem `'Todas'`, `'Privilegiadas'`, `'Descrição'` e `'Filtrar por categoria'`
em português hardcoded, ao lado de chamadas `t()` e de rótulos em inglês (`Role`, `EAM Tier`,
`Priv.`) — tudo na mesma barra de filtros. Some com o `LanguageSwitcher` ligado. Vale uma
passada levando o texto solto para o dicionário.

### 17. 20 `aria-label` em 142 arquivos
Há vários botões só-ícone (resize de coluna, chevrons de ordenação, ações de tabela) sem
rótulo acessível. Regra `aria-labels`.

### 18. Texto de 9px e 10px em conteúdo real
O ID da role na tabela usa 10px (`text-2xs`) e há badges em 9px (`text-micro`). Para uma
ferramenta de consulta densa isso é defensável em *metadado*, mas o ID da role é conteúdo
que as pessoas leem e copiam — 11px ou 12px seria mais honesto. Deixei os tokens no lugar
sem mudar o tamanho porque isso mexe na densidade de todas as tabelas e precisa do seu olho.

### 19. Tipografia de dados
A pilha atual é a de sistema. Para dashboards densos o skill recomenda o par
**Fira Sans + Fira Code** (*"Fira family cohesion. Code for data, Sans for labels"*) — Fira
Code nos identificadores (IDs, ARNs, strings de permissão) e Fira Sans nos rótulos. É ganho
real de legibilidade em coluna de dado técnico, mas adiciona peso de fonte: só vale com
`font-display: swap` e preload da variante crítica. Deixei a pilha de sistema como token
`font-sans`/`font-mono` — trocar depois é mexer em um lugar.

---

## Como isso se mantém

A regra está escrita no topo do `tailwind.config.js`, e é curta:

> Componentes não escrevem hex cru nem `text-[13px]`. Cor, tamanho de texto, sombra, raio,
> duração e camada saem do config. Se o valor não existe como token, adiciona-se o token —
> não se escreve o valor solto no `className`.

Uma regra de lint (`eslint-plugin-tailwindcss` com `no-arbitrary-value`) fecha isso
mecanicamente e impede a regressão. Recomendo ligar: sem ela, os 1.798 valores ad-hoc voltam
em alguns meses.

---

## Verificação

| Item | Estado |
|---|---|
| `tsc --noEmit --skipLibCheck` | ✅ exit 0, zero erro de tipo |
| Parse de sintaxe dos 172 arquivos `.ts`/`.tsx` | ✅ 0 erros |
| Toda classe utilitária usada no código gera CSS (Tailwind 3.4.17) | ✅ **497/497**, incluindo as 142 de design system |
| Contraste WCAG de todos os pares fg/bg, nos dois temas | ✅ calculado; os valores estão nos comentários do `globals.css` |
| Nenhum `text-[Npx]` restante | ✅ 0 ocorrências |
| Hex crus em classe | ✅ 587 → 12 pontuais |
| Inspeção visual página a página | ❌ não feita — ver ressalvas abaixo |

A checagem de classes é a que mais importa depois de um codemod desse tamanho: se a
substituição tivesse gerado um nome de token inexistente (`text-surface-border` em vez de
`border-surface-border`, por exemplo), o Tailwind ignoraria a classe em silêncio e o
elemento apareceria sem estilo. Das 497 classes utilitárias presentes no código, todas as
497 produzem CSS.

**Ressalvas honestas:**

- **Não rodei o `next build` nem abri o site.** O `node_modules` da pasta foi instalado no
  Windows e os binários não executam no ambiente Linux em que trabalhei — consegui rodar o
  `tsc` chamando o compilador direto por Node, mas o Next depende de binários nativos SWC.
  O `npm run build` local é seu passo seguinte.
- As duas mudanças com efeito visual real são as **cores de GCP e IBM** (item 4) e o
  **anel de foco global** (item 1). O resto é substituição de valor por token equivalente.
- Há backup íntegro em `_backup-ui-ux-20260802-232301/` (a pasta não é um repositório git
  no caminho montado, então fiz cópia manual antes de qualquer alteração).


---

# 2ª rodada — Tema claro

Decisão tomada: reativar o tema claro em vez de assumir dark-only.

## Por que valia a pena

`<html className="dark">` estava cravado, `ThemeProvider` devolvia `'dark'` fixo e
`ThemeToggle` retornava `null` — mas cinco componentes ainda chamavam `useTheme()` para
escolher cor, e metade de cada `className` do projeto carregava um par `x dark:x` que
nunca era avaliado. Era código morto ocupando espaço em todo arquivo, e a origem
comprovada de dois bugs de contraste.

## O que foi feito

**Infraestrutura**

- `ThemeProvider` de verdade: lê a escolha do `localStorage`, cai na preferência do
  sistema quando não há escolha, e acompanha a troca de preferência com a página aberta.
- Script inline síncrono no `<head>` decide o tema **antes da primeira pintura** — é o que
  elimina o flash. O HTML estático continua saindo com `dark`, e o script remove a classe
  quando o tema resolvido é o claro (ordem escolhida para que um eventual flash atingisse
  a minoria).
- `ThemeToggle` funcional no canto superior direito, ao lado do seletor de idioma, com
  `aria-label`, `title` e `aria-pressed`.

**Os vazamentos que impediam o tema claro de funcionar** — 329 ocorrências em 44 arquivos
de classes que só existiam na versão escura (`bg-gray-900`, `text-gray-300`,
`border-gray-700`…), sem par claro. Todas migradas para token semântico, que resolve os
dois temas de uma vez.

**As superfícies coloridas** — os cards de ferramenta e os avisos de "privilegiada" usavam
`bg-violet-950/60` e afins, sem contrapartida clara: virariam blocos escuros no meio de uma
página clara. Ganharam par (`bg-violet-50 dark:bg-violet-950/60`), junto com bordas e texto.

**Uma terceira variante por cloud.** Nenhuma cor de marca serve como texto nos dois temas —
o roxo do Azure RBAC dá 1.89:1 no escuro, o azul do Entra dá 2.1:1 no claro. Agora cada
cloud tem `mark` (fundo/ponto), `onDark` e `onLight`, e quem escolhe entre as duas últimas
é o seletor `.dark` no CSS, não o JavaScript.

**Cor vinda do dado.** Tier de role e severidade de SoD trazem a própria cor
(`GCP_TIER_META`, `SOD_SEVERITY_META`), aplicada por `style` inline — e aí cor única é
impossível, não por gosto mas por aritmética: 4.5:1 sobre branco exige luminância abaixo de
0,183; 4.5:1 sobre a superfície escura exige acima de 0,245. O badge "Critical" falhava nos
**dois** temas (3,6:1 e 4,2:1). `src/lib/readableColor.ts` deriva as duas variantes
preservando matiz e saturação, publica-as como custom properties, e o CSS escolhe. Sem
JavaScript no caminho — com `useTheme()` haveria um quadro com a cor errada a cada carga.

**Correções de cor que o codemod da 1ª rodada não alcançou** — ele só reescrevia a forma de
classe `-[#hex]`; sobraram 85 hexes em `style` inline e em props. Os obsoletos foram
corrigidos: IBM `#0f62fe`/`#4589ff` → teal, GCP `#0f9d58` → azul, e o Azure RBAC, que no
card da home ainda herdava o azul do Entra e no badge de SoD usava um `#008ad7`
praticamente idêntico ao dele — derrotando o propósito de um badge que existe para
distinguir as duas plataformas.

## Verificação

Compilei o projeto num container Linux limpo (`npm install` + `next build`, 7.797 páginas)
e rodei uma auditoria de contraste **no DOM renderizado**: para cada nó de texto de 6
páginas, nos 2 temas, o script mede a cor computada contra o fundo real compositado e
compara com o mínimo WCAG AA aplicável ao tamanho e peso daquele texto.

| Rodada | Tema claro | Tema escuro |
|---|---|---|
| Antes das correções | 152 nós abaixo do mínimo (56 classes) | 55 nós (19 classes) |
| Depois | **0** | **0** |

Páginas auditadas: home, Entra ID roles, GCP, IBM Cloud, SoD, Advisor.

Também verificado: build limpo, `tsc --noEmit` sem erros, nenhum erro de console nas 10
combinações página × tema, e a classe do `<html>` correta em cada uma.

## O que continua fora

- **Auditoria só nas 6 páginas.** São as de maior densidade e cobrem todos os padrões de
  componente, mas o site tem ~20 rotas distintas. O script de auditoria está em
  `/tmp/build/audit.js` do meu ambiente — se quiser, ele vira um teste de CI e passa a
  cobrir todas.
- **Os itens 15 a 19 do P2** seguem valendo: `Sidebar.tsx` com 43 KB, idioma misturado na
  mesma tela, poucos `aria-label`, texto de 9–10px em conteúdo real, e a troca da pilha de
  fontes.
- **Contraste não é a acessibilidade inteira.** Ordem de foco, navegação por teclado nas
  tabelas com coluna redimensionável e anúncio de leitor de tela não foram testados.
