# PRODUCT.md — IAM Scope

> Contexto durável de produto. Descreve **o que é verdade sobre o produto**, não como ele
> está pintado hoje. Decisões visuais vivem no `DESIGN.md` e nos relatórios de UI/UX.
> Escrito em 06/08/2026, a partir do código, do README, do `ADR-001` e de duas decisões
> do Natan registradas abaixo.

---

## O que é

Site de referência estático que reúne roles, policies, permissions e API permissions de
**seis plataformas de IAM** — Entra ID, Azure RBAC, AWS IAM, GCP IAM, Google Workspace e
IBM Cloud — cada uma com classificação por tier de privilégio, mais análise de Segregation
of Duties e equivalência de função entre clouds.

A documentação oficial de cada provedor existe, é completa e é **dispersa**. O produto não
compete com ela em profundidade: compete em **tempo até a resposta** quando a pergunta
atravessa mais de uma cloud.

## Para quem

**Persona primária: o arquiteto ou engenheiro de cloud** desenhando role customizada ou
migrando acesso entre plataformas.

O que isso implica, e que não é óbvio:

- Ele **fica**. Não bate e sai — compara, abre duas abas, volta.
- Ele **copia identificadores**. ARNs, GUIDs, strings de permission, nomes de role. O
  identificador não é metadado nessa tela; é o produto que ele veio buscar.
- Ele **precisa de link estável**. Manda a URL de uma role para um colega ou cola num
  ticket de mudança.
- Ele **desconfia**. Vai querer saber de onde veio o número antes de usá-lo num desenho de
  acesso que outra pessoa vai revisar.

Personas secundárias, atendidas mas não priorizadas: quem faz revisão de acesso (chega com
pergunta fechada, quer sair rápido — servido por `/permission-scope` e `/sod`), quem está
aprendendo o modelo de cada cloud (servido pelas páginas `/reference` e `/tier-comparison`),
e auditoria (servida pelo `syncMeta` e pelas fontes citadas).

## O que precisa acontecer para ter valido a pena

**Ser a referência pública que a comunidade de IAM manda para colega.** Sucesso é tráfego
recorrente e citação por terceiros — não conversão, não cadastro, não retenção.

Isso tem três consequências diretas de produto:

1. **Citabilidade é feature.** Rota estável por role, `sitemap.xml` completo, `robots.ts`
   configurado, e a proveniência visível. Um link que quebra ou um número sem fonte custa
   a credibilidade que é o produto inteiro.
2. **Não há login, e não deve haver.** Nada do que o site faz exige identidade. O
   Assessment do tenant roda na máquina de quem baixa, justamente para não pedir acesso.
3. **O concorrente é a aba da documentação oficial que ele já tem aberta.** O site só é
   escolhido se responder mais rápido do que trocar de aba — e se ele confiar na resposta.

## Verdade dos dados — inegociável

Está no `ADR-001` e é o princípio central do projeto:

- **Nome, descrição, action e permission vêm do texto oficial do provedor, em inglês.
  Nada é reescrito, traduzido ou resumido.**
- **Tier e categoria são classificação editorial do IAM Scope**, não do provedor, e
  precisam aparecer rotuladas como tal.
- Contagens vivem em `src/data/counts.ts`, gerado por `scripts/build-counts.js`. Não são
  escritas à mão, e o texto da interface nunca deve repetir um número cravado.
- `src/data/syncMeta.ts` registra quando cada dataset foi verificado contra a fonte. É o
  que sustenta a citabilidade — mantenha atualizado ao re-sincronizar.

Regra de idioma que decorre disso, consolidada em 06/08/2026:

- **Nome próprio de plataforma fica em inglês nos dois idiomas** — role, policy, action, e
  os nomes de tier (Control Plane, Full Access, Super Admin).
- **Contador e rótulo de interface passam pelo dicionário** — Total, Privilegiadas,
  Categorias, Serviços.

## O que o produto faz

**Listas de referência** por plataforma, com filtro por tier, categoria e privilégio.

**Sete ferramentas**, todas client-side:

| Ferramenta | Rota | O que resolve |
|---|---|---|
| SoD Analyzer | `/sod` | 190 regras de Segregation of Duties em 5 plataformas e 3 provedores (escopo rotulado na tela), matriz de conflito e avaliação de uma lista de roles colada |
| Assessment do Tenant | `/assessment` | Script PowerShell somente leitura, baixado e rodado pelo usuário. Nenhum dado sai da máquina dele |
| Permission Scope | `/permission-scope` | Busca reversa: uma permission, todas as roles que a concedem, nas seis clouds |
| Multi-Cloud Compare | `/compare` | 29 equivalências de função entre plataformas |
| Role Evaluator | `/evaluate` | Detecta a cloud pelo JSON colado e classifica |
| Role Advisor | `/advisor` | Sugere a role de menor privilégio para uma intenção descrita |
| Tier 0 Comparison | `/tier-comparison` | O que é Tier 0 em cada cloud, lado a lado |

O **Role Advisor é heurística determinística, não modelo.** Nada no produto chama IA em
runtime. A interface não deve sugerir o contrário — foi por isso que o ícone `Sparkles`
saiu de todas as seis ocorrências em 05/08.

## Modo por superfície

| Superfície | Modo | Por quê |
|---|---|---|
| Home `/` | **Operate** | É o ponto de partida de uma consulta, não uma peça de venda. Não há o que converter |
| Listas e detalhes de role | **Operate** | Densidade, escaneabilidade e cópia de identificador ganham de expressão |
| Ferramentas | **Operate** | Entrada, resultado, exportação |
| `/reference`, `/tier-comparison`, `/info` | **Read** | Existem para explicar o modelo de cada cloud |

**Nenhuma superfície é Persuade.** O produto não vende nada; a única "conversão" é a pessoa
achar a resposta e voltar. Tratar a home como landing page foi o erro corrigido na fase 3.

## Não-objetivos

- **Não substituir a documentação oficial.** Quando o provedor é a única fonte de verdade
  sobre um detalhe, o produto linka em vez de reescrever.
- **Não inventar dado que o provedor não publica.** A IBM não publica ação por role; o
  card mostra o que existe e explica a ausência, em vez de preencher.
- **Não pedir credencial nem receber dado do tenant do usuário.** Esta não mudou e não vai
  mudar. Ver "A linha do que sai do navegador" abaixo.
- **Não ter conta nem estado remoto.** Não há login, o site não sabe quem você é, e nada do
  que você faz aqui é guardado do lado de servidor.

## A linha do que sai do navegador

Registrada em 07/08/2026, quando o Role Advisor foi aprovado para virar agente com um
endpoint próprio. Até aqui este documento prometia "sem backend", e o
`SECURITY-ASSESSMENT` listava como positivo a ausência de chamada de rede externa. Isso
deixa de valer para **uma** superfície, e a promessa precisa ficar exata em vez de
confortável.

**O que passa a sair:** só a frase que a pessoa escreve no Role Advisor, quando ela usa o
modo agente, e só para o endpoint do IAM Scope. Nada mais.

**O que não sai, nunca:**

- O JSON colado no **Role Evaluator**. Continua lido e avaliado no navegador.
- A lista de roles do **SoD Analyzer**. Idem.
- Qualquer identificador de tenant, assinatura, projeto ou conta.
- Credencial de qualquer tipo — o produto continua não tendo onde recebê-las.

**Como o desenho garante isso, e não só a intenção:** as ferramentas do agente rodam no
CLIENTE. O servidor guarda a chave e o system prompt; quando o modelo pede uma busca, um
conflito de SoD ou uma avaliação, quem executa é o navegador, sobre o catálogo que já está
nele, e devolve ao modelo apenas o resultado. O catálogo nunca precisa subir; o JSON colado
não tem por onde vazar, porque o código que o lê nunca fala com a rede.

**O guardrail do conteúdo:** o modelo só pode citar role devolvida por chamada de
ferramenta, e a resposta passa por uma verificação que derruba qualquer nome ausente do
catálogo. Sem isso ele inventa `roles/bigquery.readOnly` — plausível e inexistente — e a
moeda deste produto é citabilidade.

O Advisor sem o modo agente, e todo o resto do site, seguem export estático sem servidor.

## Forma técnica

Next.js 15 · React 19 · Tailwind 3.4 · TypeScript · `output: 'export'`, ~7.625 páginas
estáticas · sem backend · i18n pt/en client-side com dicionário próprio · tema claro e
escuro, resolvidos por custom property antes da primeira pintura.

Restrições que moldam decisões de UI:

- **O peso do dado é o orçamento.** `src/data/*.ts` soma ~2,5 MB. Por isso `tierMeta.ts`
  existe separado dos datasets: Sidebar e AppShell precisam só dos metadados de tier, e
  importá-los do arquivo de dados arrastaria tudo para o chunk compartilhado.
- **O HTML estático sai sempre com o tema escuro.** Qualquer decisão de cor que dependa de
  JavaScript pisca um quadro errado a cada carga. Cor que muda com o tema resolve no CSS.
- Páginas client-rendered (`/sod`, `/compare`, `/permission-scope`, `/entraid/roles`) têm
  casca vazia no HTML estático — relevante para SEO e para qualquer inspeção visual.

## Tensões abertas

Registradas porque são decisões de produto, não bugs:

1. **O identificador da role é renderizado em 10px** (`text-2xs`, `RolesTable.tsx:138`).
   Para a persona primária — que veio copiar esse identificador — é o conteúdo mais
   importante da linha exibido no menor tamanho da tela. Sinalizado no `RELATORIO-UI-UX`
   como item 18 e ainda não resolvido, porque mexer nele muda a densidade de todas as
   tabelas.
2. **Frescor não aparece na página de dado.** O `syncMeta` existe, mas quem abre a role não
   vê quando aquele dado foi verificado. Para um produto cuja moeda é citabilidade, é a
   informação que falta mais perto de onde ela importa.
3. **~178 matizes decorativos restantes em estados semânticos** (avisos de "deprecated",
   estados do avaliador, SoD Matrix). O site passou a monocromático em 06/08 exceto por
   risco e pela severidade de SoD; esses estados não foram decididos.

---

## Decisões registradas

| Data | Decisão | Quem |
|---|---|---|
| 05/08/2026 | Escopo do trabalho visual é **cirúrgico**: remover os padrões que denunciam geração automática, sem trocar a identidade | Natan |
| 06/08/2026 | O grid "Por Categoria" da AWS **fica como grid com ícones** — a lista ordenada foi revertida | Natan |
| 06/08/2026 | Site **monocromático (nível 3)**: cor só para risco. Ícones ficam, a cor deles sai | Natan |
| 06/08/2026 | **`SOD_SEVERITY_META` continua colorida** — ali a escala inteira é a informação | Natan |
| 06/08/2026 | Objetivo é **referência pública da comunidade**; persona primária é **arquiteto/engenheiro de cloud** | Natan |
