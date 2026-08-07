# Roteiro — tirar a cara de IA

**Data:** 05/08/2026
**Escopo pedido:** cirúrgico. Remover os padrões que denunciam geração automática, sem
mudar a identidade do produto.
**Base:** build estático de `out/` servido e capturado em 1440×900 nos dois temas, mais
leitura de `src/` (142 `.tsx`).
**Continuação de:** `RELATORIO-UI-UX.md` (design system, contraste, tema claro). Aquele
trabalho resolveu a camada técnica. Este resolve a camada de gosto — são problemas
diferentes e não se sobrepõem.

---

## O diagnóstico em uma frase

O acabamento está bom; o que denuncia geração automática é **cor usada como decoração**,
e daí decorrem quase todos os outros sintomas.

Um produto de referência técnica — AzAdvertizer, o portal do Azure, a documentação da AWS —
usa uma cor de acento e nada mais. Cor extra só aparece quando **significa** alguma coisa:
vermelho é risco, cinza é neutro. Quando cada item de menu ganha um matiz próprio, a cor
para de carregar informação e vira textura. É esse o padrão que o olho treinado lê como
"gerado", antes mesmo de saber por quê.

E a prova de que a cor aqui é decorativa não é estética, é aritmética. O mesmo conceito
tem duas cores diferentes dependendo da página:

| Métrica | Entra ID | Azure RBAC | G. Workspace | AWS | GCP | IBM |
|---|---|---|---|---|---|---|
| **Privilegiadas** | `#6b7280` cinza | `#6b7280` cinza | `#6b7280` cinza | `#dc2626` **vermelho** | `#dc2626` **vermelho** | `#dc2626` **vermelho** |
| **Categorias** | — | `#6b7280` cinza | — | `#7c3aed` **roxo** | `#7c3aed` **roxo** | `#7c3aed` **roxo** |

São 24 hex escritos à mão em 6 arquivos de landing, sem regra que os ligue. Ninguém
decidiu que "privilegiada" é vermelha — em metade das páginas ela é cinza. Se a cor
significasse, isso não aconteceria.

---

## Fase 1 — Matar o arco-íris

**Esforço:** 2–3 h · **Risco:** baixo · **Impacto visual:** é 70% do problema

Sete botões de ferramenta na sidebar, cada um com fundo, borda, ícone e texto na sua
própria cor: violeta, azul, esmeralda, âmbar, sky, teal, vermelho. E os mesmos itens
repetidos como cards pastel na home.

| O que | Onde |
|---|---|
| 7 botões coloridos da sidebar | `src/components/Sidebar.tsx:216–300` |
| Mapa `TOOL_COLORS` (6 paletas × 5 slots) | `src/app/(home)/HomeClient.tsx:184–191` |
| 6 cards pastel que consomem o mapa | `src/app/(home)/HomeClient.tsx:93–133` |

**O que fazer**

1. Na sidebar, os botões de ferramenta passam a ter o mesmo tratamento dos outros itens de
   navegação: fundo transparente, ícone em `text-fg-subtle`, rótulo em `text-fg`. O estado
   ativo é o único que ganha cor — `bg-surface-alt` com uma barra de 2px em `--c-accent` à
   esquerda. Isso substitui ~85 classes de cor por uma regra.
2. `TOOL_COLORS` sai inteiro. Os cards da home ficam com a mesma superfície dos cards de
   cloud, que já existe e já está tokenizada: `bg-surface border border-line`.
3. **Enquanto isso, decida se o card da home deve existir.** Hoje ele repete a sidebar item
   por item — a mesma navegação, duas vezes, na mesma tela. Se ficar, é porque tem descrição
   (a sidebar não tem); se sair, a home ganha uma dobra inteira de volta.

**Bônus que aparece de graça:** a sidebar lista 7 ferramentas e a home mostra 6 —
`/assessment` está só na sidebar. Ao unificar, some com a divergência.

### 1b. Os selos BETA

Seis "Beta" idênticos na sidebar (`Sidebar.tsx:224, 237, 250, 263, 276, 289`) e cinco na
home (`HomeClient.tsx:97, 105, 113, 121, 129`). Quando quase tudo é beta, o selo deixa de
avisar e vira ruído — repetido onze vezes na mesma tela.

Escolha uma:

- **Tirar todos.** Se as ferramentas estão em produção e funcionando, o selo não protege
  ninguém.
- **Manter em duas, no máximo**, e como texto neutro — `text-3xs text-fg-subtle` com a
  palavra "beta" em minúscula, sem pílula colorida.

### 1c. O ícone ✨

`Sparkles` aparece em 6 arquivos. Em três deles é o ícone de "avaliar/analisar"
(`RoleInput.tsx:226`, `SoDUserEvaluator.tsx:97 e 118`) e em três é o ícone do Role Advisor
(`HomeClient.tsx:98`, `advisor/page.tsx:109 e 170`, `Sidebar.tsx:220`).

Esse ícone virou sinônimo visual de "isto foi feito com IA". Como o Advisor é uma
heurística determinística e não um modelo, ele está entregando uma promessa que o produto
não faz. Trocas diretas dentro do lucide que você já usa:

| Onde | Hoje | Sugestão | Por quê |
|---|---|---|---|
| Role Advisor | `Sparkles` | `Compass` ou `Lightbulb` | é orientação, não geração |
| Avaliar role / SoD | `Sparkles` | `Play` ou `ScanLine` | é executar uma análise |

---

## Fase 2 — Idioma

**Esforço:** 2–3 h · **Risco:** nenhum · **Impacto:** é o tell mais barato de matar

Texto que mistura dois idiomas dentro do mesmo componente lê como saída não revisada. E
tem um erro de concordância visível na home.

### 2a. "13 Categoria"

Em `src/app/(home)/clouds.ts:39, 57, 66`, os rótulos das métricas reaproveitam chaves de
cabeçalho de tabela:

```ts
{ n: ..., label: 'filter.privileged' }   // → "Privilegiadas"
{ n: ..., label: 'table.category' }      // → "Categoria"  ← singular
```

`table.category` é o título de uma coluna, que é singular por definição. Usado depois de um
número vira "13 Categoria". Crie chaves próprias de contagem — `count.categories`,
`count.privileged` — em vez de reciclar as de tabela.

### 2b. Rótulos em português dentro de linhas em inglês

Na mesma linha de KPI: `Total Policies · Privileged · FullAccess · **Categorias**`
(`app/aws/page.tsx:51–54`). "FullAccess" ainda vem sem espaço, colado do nome do enum.

24 ocorrências de `'Todas'`, `'Privilegiadas'` e `'Categorias'` cravadas em `.tsx`,
espalhadas por 16 arquivos — a lista completa sai com:

```bash
grep -rnE "'(Todas|Privilegiadas|Categorias)'" --include=*.tsx src/
```

Todas devem virar chamada `t()`. Enquanto elas existirem, o `LanguageSwitcher` mente:
trocar para EN deixa metade da tela em português.

### 2c. Descrições de card em inglês sob cabeçalho em português

"Ferramentas" (`HomeClient.tsx:92`) com "Get role recommendations based on job function and
access needs" logo abaixo. Além do idioma, o registro é de marketing — num produto de
consulta, a descrição deveria dizer o que a ferramenta faz, não vendê-la.

---

## Fase 3 — O hero e o gráfico que não informa

**Esforço:** 2 h · **Risco:** baixo · **Impacto:** devolve a primeira dobra

### 3a. Hero centralizado

`HomeClient.tsx:30–39`. Um `<h1>` em `text-display-lg` centralizado, com subtítulo de duas
linhas, ocupando ~260px acima da dobra — e repetindo palavra por palavra o `headerTitle` que
o `AppShell` já renderiza 40px acima. O mesmo texto, duas vezes, com dois pesos diferentes.

Somado aos dois gradientes decorativos de `h-72` (`linhas 25–26`), é meia tela antes do
primeiro dado.

**O que colocar no lugar:** a busca. Hoje o `GlobalSearch` está no topo do `AppShell` como
um campo estreito de 445px. Numa ferramenta cujo uso real é "achar a role X", a home deveria
abrir com esse campo em destaque e alguns atalhos de consulta frequente abaixo. É a mudança
que mais diferencia um produto pensado de um template.

Se preferir o mínimo: apague o `<h1>` e os dois gradientes, mantenha o resto. A home começa
nos cards e ganha 300px.

### 3b. "Itens catalogados por cloud"

`HomeClient.tsx:67–88`. Escala linear com AWS em 1.553 e IBM Cloud em 7. Na prática:
GCP e AWS ocupam a barra toda, Entra ID vira um traço, e Google Workspace e IBM viram um
quadradinho de 3px. Quatro das seis barras não comunicam magnitude nenhuma.

E o gráfico responde a uma pergunta que ninguém faz. "Qual cloud tem mais roles no
catálogo" não é uma questão de IAM — é uma consequência de como cada fornecedor modela
permissão. GCP tem 2.381 roles porque granulariza; IBM tem 7 porque usa primitivas. O
gráfico faz isso parecer um ranking.

**Três saídas, em ordem de preferência:**

1. **Remover.** Os números já estão nos cards acima, e ali eles têm rótulo.
2. Trocar por escala logarítmica, com o eixo dito explicitamente — resolve a legibilidade,
   mas não resolve o fato de a pergunta ser fraca.
3. Trocar a métrica por uma que se compare de verdade: **% de roles privilegiadas por
   cloud**. Aí a escala é 0–100 nos seis, a comparação é honesta e a resposta interessa a
   quem trabalha com IAM.

---

## Fase 4 — Cor com significado nos KPI

**Esforço:** 3–4 h · **Risco:** médio (mexe em 6 landings) · **Impacto:** consistência

As linhas de 4 KPI no topo de cada landing (`Dashboard.tsx:48–53` e as 5 irmãs em
`app/*/page.tsx`) pintam cada número de uma cor diferente, com hex cravado no array. O
resultado é a tabela do começo deste documento: a mesma métrica muda de cor conforme a
página.

**Regra a adotar — três estados, e só:**

| Estado | Cor | Quando |
|---|---|---|
| Neutro | `text-fg` | contagem que não implica risco (total de roles, categorias, scopes) |
| Risco | `text-danger` / `text-danger-fg` | privilegiada, Tier 0, Full Access, Control Plane |
| Marca | `text-accent` | o número que é a identidade daquela página (o total da cloud) |

O token de risco **já existe e nunca foi usado**: `tailwind.config.js:60` define
`danger: { DEFAULT: '#b42318', fg: '#f87171', soft: '#2a1010' }` — um par claro/escuro
pronto. Ocorrências no código hoje: **zero**. As seis landings preferiram escrever
`#dc2626` à mão, e é exatamente por isso que metade delas escreveu outra coisa.

Na prática, numa linha de 4 KPI, **no máximo um fica vermelho e um fica azul**; os outros
dois são texto normal. O número deixa de gritar e o vermelho volta a significar alguma coisa
— hoje ele compete com um roxo e um laranja pela atenção.

Junto disso, dois ajustes pequenos:

- **`text-display` para contagem é grande demais.** Um número de 4 dígitos em display bold
  ocupa mais espaço vertical que a informação merece. `text-stat` já existe no config.
- **O grid de 15 categorias** na página da AWS (`app/aws/page.tsx`, seção "Por Categoria")
  tem um ícone lucide decorativo em cada caixa — cadeado para Security, raio para
  Serverless. Nenhum ajuda a escanear; a leitura real é pelo nome e pela contagem. Uma
  lista de duas colunas ordenada por contagem, com barra fina, cabe em metade do espaço e
  responde mais rápido.

---

## Fase 5 — Opcional: uma escolha tipográfica

**Esforço:** 1–2 h · **Risco:** baixo · **Impacto:** sutil, mas é o que separa "neutro" de "pensado"

A pilha hoje é a do sistema (`globals.css:58–61`). Não tem nada errado — mas também não tem
nenhuma escolha dentro dela, e num produto denso de identificadores técnicos (ARNs, strings
de permissão, IDs de role) a fonte de interface é a decisão de leitura mais importante que
existe.

Se quiser dar um passo aqui, o par que o `ui-ux-pro-max` recomenda para dashboard denso é
**Fira Sans para rótulo + Fira Code para identificador**. Com `font-display: swap` e preload
só da variante 400, o custo é aceitável. Os tokens `font-sans` e `font-mono` já existem no
config — é mudar em um lugar.

Isto está fora do "cirúrgico" que você escolheu. Deixo registrado porque, das cinco fases,
é a única que **adiciona** identidade em vez de remover ruído.

---

## O que **não** fazer

Registro porque são as reações mais comuns a "está com cara de IA", e todas pioram:

- **Trocar o esquema de cor inteiro.** O problema não é o azul; é haver sete cores.
- **Adicionar ilustração, glassmorphism, gradiente animado ou "hero mais bonito".** Isso é
  mais decoração — a mesma doença com sintoma diferente.
- **Diminuir a densidade.** A densidade alta é o acerto do produto. AzAdvertizer é denso;
  é por isso que profissional usa.
- **Mexer nos tokens do `RELATORIO-UI-UX.md`.** Contraste e escala tipográfica estão
  verificados. Este roteiro só troca *quais* tokens cada componente usa.

---

## Ordem sugerida e custo

| Fase | O que resolve | Esforço | Risco |
|---|---|---|---|
| 1 | arco-íris, BETA, ✨ | 2–3 h | baixo |
| 2 | idioma misturado e "13 Categoria" | 2–3 h | nenhum |
| 3 | hero e gráfico decorativo | 2 h | baixo |
| 4 | cor dos KPI, grid de ícones | 3–4 h | médio |
| 5 | tipografia (opcional) | 1–2 h | baixo |

Fases 1 e 2 sozinhas resolvem a maior parte da percepção, e nenhuma das duas tem risco
real. Se o tempo for curto, é onde ele rende mais.

---

## Como verificar

O erro clássico depois de uma passada dessas é achar que ficou melhor porque você mexeu.
Três checagens objetivas:

1. **Contagem de matizes.** Antes de fechar cada fase:
   ```bash
   grep -roE "(violet|emerald|amber|teal|sky|fuchsia|rose|lime|indigo)-[0-9]{2,3}" --include=*.tsx src/ | wc -l
   ```
   **Marca de hoje: 371.** Deve cair para perto de zero fora dos componentes onde a cor é
   dado (`SoDSeverityBadge`, `EamTierBadge`, `ClassificationBadge` — esses são legítimos, a
   cor ali vem do dataset).

2. **Captura antes/depois no mesmo viewport.** O script que usei está reproduzível: sirva
   `out/` com `python3 -m http.server` e rode Playwright em 1440×900 nos dois temas. Comparar
   PNG lado a lado pega regressão que o olho perde entre uma sessão e outra.

3. **O teste do estranho.** Mostre a home para alguém que não viu o projeto e pergunte o que
   a ferramenta faz. Se a primeira resposta descrever o que se consulta ali, funcionou. Se
   for "parece um dashboard", ainda tem decoração sobrando.

---

## Ressalvas

- As capturas vieram do `out/` que estava na pasta (build de 04/08). Se `src/` mudou depois,
  os números de linha podem ter deslizado — todos foram conferidos contra o `src/` atual em
  05/08, mas vale reconferir antes de editar.
- As páginas `/sod`, `/compare`, `/permission-scope` e `/entraid/roles` renderizam no
  cliente; o HTML estático delas é uma casca vazia, então não entraram na inspeção visual.
  O diagnóstico nelas vem só da leitura do código.
- Não rodei `next build` depois de nenhuma mudança, porque não fiz mudança nenhuma — este
  documento é diagnóstico e plano.
