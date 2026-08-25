# Nove prompts — propostas do RBAC Catalog

Cada bloco é autossuficiente: cole numa sessão nova do Cowork dentro do projeto **IAM SCOPE** e rode.
A ordem é de dependência real — P1 destrava P5 e P8, e melhora P2.

---

## P1 — Permissões efetivas do Azure (correção de dado)
meta: correção · 2–3 dias · sem fonte nova · destrava P5 e P8

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `concorrente-rbac-catalog.md`, `build-gotchas.md` e `api-publica.md`.

**O problema.** `permissionCount` no `src/data/azureRbac.ts` conta entradas da definição, não permissões concedidas. `public/azure-perms/owner.json` é `[{"action":"*","type":"Actions"}]` e por isso Owner aparece no site com **1 permissão** — igual à AcrPull. Confirmei em 22/08/2026: **56 das 504 roles** têm `permissionCount: 1`, entre elas Owner, Contributor e Reader, e o máximo do dataset inteiro é 103. Qualquer ordenação por "menor privilégio" hoje está invertida.

**O que fazer.** Um script novo `scripts/build-effective-perms.js` que, para cada uma das 504 roles, expande os padrões contra o universo de ações e aplica as exclusões:

- Universo: `public/azure-action-descriptions.json` — 17.605 chaves, **em MAIÚSCULAS**, no formato `MICROSOFT.HDINSIGHT/CLUSTERS/AVAILABLEUPGRADES/READ`, 158 provedores distintos, zero wildcards. Comparação tem que ser case-insensitive.
- Definição por role: `public/azure-perms/{slug}.json`, array de `{action, type}` com os quatro tipos `Actions`, `NotActions`, `DataActions`, `NotDataActions`.
- Índice auxiliar: `public/azure-perms-index.json` tem `slugs` (504), `index` (2.697 ações referenciadas) e `denied` (180).
- No Azure o `*` casa qualquer sequência, **incluindo `/`** — `Microsoft.Authorization/*/read` casa `Microsoft.Authorization/roleAssignments/read`. Converta o padrão para regex ancorada, não use glob de shell.

**Antes de calcular, resolva uma pergunta e escreva a resposta no cabeçalho do arquivo gerado:** o store de 17.605 ações mistura control plane e data plane, ou só control? Isso decide se `effectiveDataActions` tem universo próprio ou fica sem denominador. Se não houver universo de data actions, emita o campo como `null` e diga por quê — não invente um número.

**Regras inegociáveis do projeto:**

1. **Emitir ao lado, nunca no lugar.** `permissionCount` continua exatamente como está; entram `effectiveActions` e `effectiveDataActions`. É a mesma regra de "nativo E normalizado" que governa o `eamLevel` na API.
2. O efetivo é um **piso**, não o número real: nosso universo tem 17.605 ações e 158 provedores, e a Azure Management API expõe mais. Isso tem que aparecer na interface junto do número, não só num comentário de código.
3. Contagem no site sai de runtime, nunca escrita no texto. `scripts/check-stale-numbers.js` varre `src/i18n` — rode depois.

**Verificação obrigatória, nessa ordem:** Owner > Contributor > Reader; Contributor = Owner menos exatamente os padrões de `NotActions` do `contributor.json`; Reader ≈ o subconjunto que termina em `/read`; AcrPull continua 1 (a definição dela é literal, não tem wildcard); e as 56 roles que hoje marcam 1 não podem continuar todas em 1.

**Ambiente:** `tsc` roda no próprio device — `node node_modules/typescript/lib/tsc.js --noEmit --skipLibCheck --incremental false -p tsconfig.json`, menos de 40 s. O `next build` **não** roda no device (SWC compilado para Windows), precisa do container. Para gravar no mount, `tar x` falha com `File exists`; use Python com `open(path,'w')`.

Entregue: o script, o campo novo nas telas do Azure que hoje mostram contagem, e um resumo com os cinco números de verificação acima.

---

## P2 — Painel de estatísticas cross-cloud (`/stats`)
meta: 1–2 dias · dado que já está no disco · melhor depois de P1

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `site-iam-scope.md`, `estado-ui.md` e `concorrente-rbac-catalog.md`.

**Contexto.** O `rbac-catalog.dev` tem uma página Analytics que é a mais compartilhável do site dele, toda derivada de dado que ele já tinha. Ele cobre uma nuvem. Nós cobrimos seis, e nunca publicamos um panorama.

**Construa `/stats`** — página nova, estática, bilíngue, usando só o que já existe em `src/data/` e `public/`:

- Distribuição de roles por tier em cada nuvem, as seis lado a lado (`src/data/tierMeta.ts`, `src/lib/eamLevels.ts`).
- Quantas roles são privilegiadas por nuvem, em número e em proporção.
- As 10 permissões concedidas pelo maior número de roles, por nuvem — o `grantedBy` já existe em `src/lib/permissionScope.ts` e `src/lib/gcpPermissions.ts`.
- Tamanho de role: mediana e máximo de permissões por nuvem. **Se a P1 já entrou, use o efetivo do Azure e diga na página que é efetivo**; se não entrou, use `permissionCount` e imprima a ressalva de que wildcard conta como 1 — não publique o número cru sem o aviso.
- Cobertura de SoD por plataforma a partir das 190 regras (`src/data/sod/`).
- Frescor por dataset, lendo `src/data/syncMeta.ts` — a página de estatísticas é o lugar natural para isso aparecer inteiro.

**Regras do projeto que valem aqui:**

- **Nenhum número escrito à mão.** Tudo de `src/data/counts.ts` ou calculado em build time. Foi assim que "1.700 roles" e "926 roles built-in do Azure" passaram despercebidos antes; `scripts/check-stale-numbers.js` existe por causa disso e tem que passar.
- Paleta: o site é monocromático por decisão de 06/08. Gráfico não é exceção — não reintroduza escala de matiz por categoria. As exceções permitidas estão listadas em `estado-ui.md` e nenhuma delas é gráfico de estatística.
- Nome próprio de plataforma fica em inglês nos dois idiomas; rótulo e contador passam pelo dicionário `src/i18n`.
- A rota nova é global, não de nuvem: adicione o href em `GLOBAL_HREFS` no `Sidebar.tsx`, senão ela cai no fallback e mostra o menu do Entra ID ao lado de uma tela multi-cloud.
- Comparação de rota **normaliza a barra final** antes de comparar (`trailingSlash: true` no `next.config`).

Verifique com `scripts/check-stale-numbers.js`, `check-sidebar-focus.js`, `check-links.js` e `check-site-index.js`, e com um build no container.

---

## P3 — Índice de provedores do Azure (`/azure-rbac/providers`)
meta: 1 dia · ~158 páginas novas · maior ganho de SEO por hora gasta

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `site-iam-scope.md` e `estado-ui.md`.

**A lacuna.** Temos `/aws/actions` por serviço (451 serviços) e `/gcp/permissions` por serviço (317). **O Azure é a única nuvem grande sem índice por serviço.** Hoje, quem busca "o que é `Microsoft.Storage/blobServices/containers/write`" não encontra o IAM Scope.

**O dado já está no disco.** `public/azure-action-descriptions.json` tem 17.605 ações com a descrição oficial da Microsoft, agrupáveis por namespace — são **158 provedores distintos**. O `grantedBy` (quais roles concedem uma permissão) já existe em `src/lib/permissionScope.ts`.

**Construa:**

1. `/azure-rbac/providers` — índice dos 158, com contagem de ações por provedor e ordenação por tamanho.
2. `/azure-rbac/providers/[slug]` — uma página por provedor: as ações, a descrição oficial, o tipo (control/data se o store distinguir) e **quais das 504 roles concedem cada uma**.

Espelhe a estrutura de `/aws/actions` e `/gcp/permissions` em vez de inventar um layout — são as páginas irmãs e a inconsistência entre elas seria mais cara que a economia.

**Cuidados:**

- Isso soma ~158 rotas ao export estático (hoje ~7.625 páginas). Confirme que o `next build` no container ainda fecha e que `scripts/check-static-export.js` passa.
- O nome do provedor (`Microsoft.Storage`) é nome próprio: fica em inglês nos dois idiomas. Rótulos e contadores passam pelo dicionário.
- Nome de item de lista usa `text-accent` — é a padronização de 21/08, e vale para estas páginas também.
- `sitemap.xml` e `src/data/siteIndex.ts` precisam das rotas novas; `check-site-index.js` cobre isso.

Entregue as duas rotas, o registro no siteIndex, e o número real de páginas que o build passou a gerar.

---

## P4 — Changelog multi-cloud com feed Atom (`/changelog`)
meta: 3–5 dias · a maior lacuna estrutural · o diff já é calculado, falta persistir

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `pipeline-de-atualizacao.md`, `concorrente-rbac-catalog.md` e `api-publica.md`.

**A situação.** O `rbac-catalog.dev` guarda histórico de Azure RBAC desde 15/12/2025 e publica "105 roles criadas, 226 atualizadas, 2 apagadas". Nós não guardamos nada — mas **os nossos coletores já calculam o diff**: o dry-run de 16/08/2026 reportou "0 novas, 0 descontinuadas, 3 descrições alteradas" no Azure e detectou a 1.505ª permissão do Graph. O resultado vai para o terminal e morre ali.

**Construa a persistência e as páginas:**

1. **Snapshot por coleta.** Cada coletor grava `data/snapshots/{cloud}/{YYYY-MM-DD}.json` com **id + hash do conteúdo por item**, não o dataset inteiro — senão o repositório cresce megabytes por dia. Decida e documente o que entra no hash (nome, descrição, lista de permissões, tier).
2. **`scripts/build-changelog.js`** deriva os eventos entre dois snapshots: `criada`, `removida`, `descrição alterada`, `permissões +N/−M`, e — o que só nós podemos emitir — **`mudou de tier`** e **`entrou/saiu de uma regra de SoD`**.
3. **Páginas** `/changelog` (global, as seis nuvens) e `/changelog/{cloud}`, com filtro por tipo de evento e por período.
4. **Feed Atom por nuvem.** "Me avise quando uma role privilegiada do GCP mudar" não existe em lugar nenhum hoje. O feed é o que traz a pessoa de volta sem ela precisar ter um problema.
5. **`/api/v1/changes.json`** no mesmo envelope da Fase 1 da API, com `classification: "iamscope-editorial"` nos campos que são curadoria nossa.

**Ressalva a escrever na própria página, não só no commit:** o histórico começa no dia em que isto ligar. Os oito meses de dianteira dele não se recuperam — o que se recupera é a largura, seis nuvens contra uma.

**Armadilhas conhecidas do pipeline, que valem para o backfill:**

- `fetch-aws-policies-official.js` e `fetch-gcp-roles-from-docs.js` levam **403 no container** (egress do sandbox). Só rodam na máquina do Natan.
- `fetch-azure-action-descriptions.js` **precisa de `public/` staged**; sem isso o store lê 0 e o dry-run reporta "+17605 novas", que é falso positivo.
- A coleta do Entra ID está **travada por decisão humana**: `PreAuthorizationGrant.Read.All` não tem entrada em `PREFIX_CLASSIFICATION`. Classificar o prefixo é pré-requisito para o changelog do Entra ID ter primeira linha.
- `fetch-azure-roles-official.js` reporta 3 páginas em 404 (`mixed-reality`, `virtual-desktop-infrastructure`, `other`). Com snapshot, essa ambiguidade vira detectável — trate 404 de página como **desconhecido**, nunca como "roles removidas", ou o primeiro changelog vai anunciar uma exclusão em massa que não aconteceu.

A receita canônica de atualização está no `README.md`, seção "Fluxo de atualização". Leia de lá, não reescreva de memória.

---

## P5 — Diff de roles com URL própria e indexável
meta: 2 dias · depende de P1 · SEO

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `site-iam-scope.md` e `concorrente-rbac-catalog.md`.

**O problema.** O nosso `/compare` renderiza no cliente: no HTML estático não há markup, então **para busca a página não existe**. O `rbac-catalog.dev` pré-gera `/compare/{idA}/{idB}` e coloca no sitemap.

Atenção para não confundir: já temos `/compare/[tier]/[function]`, que é a equivalência entre nuvens e é **melhor** que o que ele faz. O que falta é o par role-contra-role com URL compartilhável.

**Construa** uma rota estática de comparação por par de roles, com três blocos: **concedido pelas duas**, **só pela A**, **só pela B** — mais `assignableScopes` de cada uma.

**Não gere todos os pares.** 504² é inviável e página vazia indexada machuca mais do que ajuda. Gere só onde há resposta real:

- As roles privilegiadas de cada nuvem entre si (`isPrivileged`).
- Pares dentro da mesma família — Owner/Contributor/Reader, os três Storage Blob Data, e assim por diante.
- Os pares que já aparecem nas 29 equivalências de `equivalences.json`.

Devem ser algumas centenas de páginas, não milhares. Diga no fim quantas foram e qual foi o critério exato aplicado.

**Depende da P1.** Com o dado de hoje o diff diria "Owner concede 1 permissão a mais que Reader", o que é pior que não ter a página. Se a P1 ainda não entrou, **pare e diga isso** em vez de gerar as páginas com o número cru.

Verifique com `check-links.js`, `check-site-index.js` e `check-static-export.js`, mais o build no container. Confirme no `out/` que a página tem markup real — é o ponto inteiro da proposta.

---

## P6 — Catálogo-sombra: o que existe na API e não está documentado
meta: exige credencial Azure · muda a operação do projeto · a informação mais original da lista

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `concorrente-rbac-catalog.md`, `pipeline-de-atualizacao.md` e `api-publica.md`.

**O achado.** O `rbac-catalog.dev` tem 944 roles de Azure porque lê a Azure Management API; nós temos 504 porque lemos a documentação da Microsoft — e o critério está escrito no `syncMeta.ts`, é deliberado. Validado em 22/08/2026 que a fonte dele é mesmo a API: ele publica a role *Microsoft Cloud Security Arc Machine Operator*, ausente de toda a documentação, e o provider `Anyscale.Platform`, que é de marketplace.

**A diferença entre os dois catálogos — ~440 roles que a Microsoft opera e não documenta — é um achado de auditoria, e nenhum dos dois sites publica isso hoje.** Ele lista as 944 misturadas; nós não vemos as 440. São roles atribuíveis num tenant que ninguém revisou porque não aparecem em lugar nenhum.

**Antes de escrever código, confirme comigo que a credencial existe.** Esta é a única proposta da lista que muda a operação do projeto:

- App registration no Entra ID com **Reader** numa assinatura Azure.
- Segredo em CI (a coleta **não roda no container** — os endpoints exigem bearer token, e dois coletores já levam 403 lá por egress).
- Endpoints: `Microsoft.Authorization/roleDefinitions` (filtrar `type: BuiltInRole`) e `Microsoft.Authorization/providerOperations`.

**O que construir, se a credencial existir:**

1. `scripts/fetch-azure-roles-api.js` — coletor novo, **ao lado** do `fetch-azure-roles-official.js`, não no lugar dele.
2. Campo `documented: true | false` por role, cruzando por **GUID** (nossos GUIDs e slugs já batem com os da Microsoft, o casamento é direto).
3. Página `/azure-rbac/undocumented` respondendo: "estas N roles existem na sua assinatura e não têm documentação pública". Com a data da coleta e o aviso de que preview e roles de serviço entram nessa conta.
4. O mesmo eixo para operations: 23,5k na API contra os nossos 17,6k, 312 provedores contra 158.

**Mantenha os 504 como o catálogo.** O valor está na separação, não no volume — misturar dá tamanho, separar dá informação. E a classificação editorial (tier, EAM, categoria) não se estende automaticamente às roles não documentadas: decida e escreva se elas entram sem tier ou ficam fora do Advisor e do SoD até serem classificadas.

---

## P7 — Antecipar o MCP server para a v1 da API
meta: 2 dias · é o único canal que a gente consegue medir

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `api-publica.md`, `role-advisor.md` e `promessa-do-produto.md`.

**O contexto.** O MCP está na Fase 3 do plano da API, marcado como opcional. O `rbac-catalog.dev` já tem o dele no ar — confirmei em 22/08: `GET https://rbac-catalog.dev/mcp` devolve **406, não 404**, e o About documenta a configuração via `.vscode/mcp.json` para Copilot, Claude e Cursor.

**Dois argumentos para antecipar, e o segundo é o que decide:**

1. É o canal onde seis nuvens ganham de uma com folga. "Qual a role equivalente a Owner no GCP" não tem outra resposta possível no mercado.
2. **É o único canal que conseguimos medir.** Está registrado: o Vercel Web Analytics é cego para a API (é script de navegador; `curl`, CI e MCP não executam JS), Runtime Logs no Hobby duram 1 hora e arquivo estático nem gera log, e Log Drains não existe no Hobby. O que mede de graça é `download_count` de asset de GitHub Release e download de npm.

**Construa** um pacote npm que embute o catálogo e expõe um MCP server via stdio, rodando na máquina de quem usa. As ferramentas **já existem como função pura** — não reimplemente:

- `searchRoles` (`src/lib/roleAdvisor.ts`)
- `searchLocalPermissions` (`src/lib/permissionScope.ts`)
- `findConflictsForRole` e `evaluateUserRoles` (`src/data/sod/`, 190 regras)
- `evaluateRoleSync` (`src/lib/evaluateCatalog.ts`)
- `equivalences.json` (29 funções × 6 nuvens) e `src/lib/tierMeta.ts`

**Guardrails que vêm do desenho já aprovado do agente e valem igual aqui:**

- As ferramentas rodam na máquina de quem usa. **O catálogo não sobe para lugar nenhum** — é a promessa do `PRODUCT.md`.
- Toda role citada tem que vir de retorno de ferramenta, com verificação depois. Nome ausente do catálogo é derrubado, não devolvido. Sem isso o modelo inventa `roles/bigquery.readOnly`, que é plausível e não existe.
- Todo campo de curadoria sai marcado `classification: "iamscope-editorial"` — tier, EAM, categoria e as regras de SoD não são publicados pelos provedores.
- Atribuição obrigatória de EntraOps e merill/microsoft-info (ambos MIT) e da licença CC BY 4.0 do dado derivado, conforme o `DATA-LICENSE.md`.

Entregue o pacote, o `README` com o snippet de `.vscode/mcp.json`, e o plano de como o `download_count` vai ser lido — a instrumentação entra junto, não depois.

---

## P8 — Desempate por menor privilégio no Role Advisor
meta: horas · depende de P1 · a única ideia do motor de busca dele que vale copiar

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `role-advisor.md`.

**A ideia.** O *Recommend* do `rbac-catalog.dev` ordena por "fewest total permissions first". O nosso Advisor ordena por relevância BM25F, o que é certo para achar o assunto e **indiferente ao tamanho da role**. Entre dois resultados de pontuação equivalente, o menor privilégio deveria vir primeiro — é literalmente a pergunta que a pessoa está fazendo quando abre o Advisor.

**O que fazer.** Em `src/lib/roleAdvisor.ts`, aplicar contagem de permissões como **desempate**, não como peso somado ao score. Defina e documente a faixa em que dois scores contam como equivalentes; um desempate largo demais vira um segundo ranking escondido dentro do primeiro.

**Depende da P1.** Com o dado de hoje, Owner (`permissionCount: 1`) subiria acima de Storage Blob Data Reader (4) — o desempate inverteria exatamente o que se propõe a corrigir. Se a P1 não entrou, **pare e diga isso**.

**Regra da casa, obrigatória:** rodar as 9 consultas de referência antes e depois, e comparar top-3. Mudança de ordenação sem medição já custou tempo aqui. As consultas estão no `role-advisor.md` com o antes/depois de 07/08; o arquivo de teste era Playwright contra o `out/` servido e é fácil de refazer. Duas dessas consultas são o alvo direto: "resetar senha, não quero global admin" e "somente leitura auditar no Azure" — se a `Reader` do Azure subir das posições de baixo sem que outra coisa piore, o desempate está fazendo o que promete.

**Não mexa no léxico junto.** `src/lib/advisorLexicon.ts` é curadoria e tem as cinco armadilhas medidas documentadas — mudar ordenação e léxico na mesma rodada torna a medição ilegível.

E mantenha a linha de linguagem: nada de chamar isso de "semântico" ou "inteligente". A Fase 1 tirou essa palavra do produto de propósito e o dicionário tem comentário proibindo.

---

## P9 — Declaração de privacidade explícita
meta: horas · o argumento mais forte que temos e não dizemos

Projeto IAM SCOPE, pasta `F:\Downloads\entraid-permissions-update`. Leia a memória do projeto antes de começar — em especial `promessa-do-produto.md`, `analytics-e-deploy.md` e `concorrente-rbac-catalog.md`.

**Por que agora.** O `rbac-catalog.dev` transforma privacidade em argumento de venda no About: sem cookies e sem banner de consentimento, sem Google Analytics, sem conta de usuário, IP mascarado na telemetria, log de 30 dias. Para quem cola um JSON de role numa ferramenta na web, isso não é detalhe jurídico — é a razão de colar ou não colar.

**Nós temos o argumento mais forte e não dizemos na cara do usuário:** o Evaluator e o SoD Analyzer processam **no navegador**; o JSON e a lista de roles nunca saem da máquina. Isso está no `PRODUCT.md` e não está no site.

**Escreva** uma seção curta na `/info` ou uma rota `/privacidade` própria — decida qual e justifique — cobrindo, em português e inglês:

- O que roda no navegador e nunca é transmitido, nomeando as ferramentas uma a uma.
- O que o site coleta de fato: Vercel Web Analytics, sem cookie, sem custom event, cota Hobby de 50.000 eventos/mês. Não prometa menos nem mais do que está instalado — confira no `src/app/layout.tsx` antes de escrever.
- **A linha do que sai do navegador quando o agente da Fase 2 entrar no ar.** Está desenhada: as ferramentas rodam no cliente e só o resultado vai para o modelo. Escrever isso agora é mais fácil que reescrever depois que alguém perguntar.
- A licença do dado, com link para o `DATA-LICENSE.md`: fato bruto dos provedores nos termos deles, curadoria do IAM Scope em CC BY 4.0, e as duas fontes MIT com atribuição.

**Tom:** afirmação verificável, não selo de confiança. "O JSON que você cola no Evaluator não é transmitido; o código que o lê não fala com a rede" é melhor que qualquer distintivo. Nada de emoji nem de linguagem de marketing.

Se algo do `PRODUCT.md` já não corresponder ao que está no ar, **aponte a divergência em vez de publicar a versão antiga** — a página só vale se for auditável.
