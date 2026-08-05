# Roadmap — IAM Scope

Documento vivo. Objetivo: **publicar** com a garantia de que todo dado exibido é real
e rastreável até a fonte oficial do provedor.

Última revisão: 2026-08-05. Os números abaixo foram medidos no código, não estimados.

---

## 1. Estado atual — cobertura de dados

| Cloud | Itens | Roles com permissões | Situação |
|---|---:|---|---|
| **Entra ID — roles** | 144 | 138 / 144 — **95,8%** | ✅ Real (EntraOps + MS Learn) |
| **Entra — API permissions** | 854 | delegadas **162** | ⚠️ Parcial |
| **Azure RBAC — roles** | 504 | 504 / 504 — **100%** | ✅ Real (docs oficiais) |
| **Azure RBAC — actions** | 2.697 (1.947 concretas + 750 wildcards) | descrição em **95,2%** das concretas | ✅ Real |
| **AWS — policies** | 1.553 | 1.552 / 1.553 — **99,9%** | ✅ Real (AWS Managed Policy Reference) |
| **GCP — roles** | 2.381 | 2.360 / 2.381 — **99,1%** | ✅ Real (docs oficiais) |
| **IBM Cloud — roles** | 7 | capacidades no texto oficial | ✅ Real · ⚠️ IBM não publica ação por role |
| **IBM Cloud — permissões clássicas** | 71 | 71 / 71 — **100%** | ✅ Real (`ibm-cloud-docs/iam`) |
| **Google Workspace** | 14 | 14 / 14 capacidades — **100%** | ✅ Real · ⚠️ privilegeName da API em 2/14 |

O quadro mudou muito desde a versão anterior deste documento. GCP saiu de 232 roles com
6% de cobertura para 2.381 com 99%; Azure foi reconciliado para a contagem oficial de
504; AWS ganhou descrições oficiais no lugar das fabricadas.

**Google Workspace foi reconstruído em 03/08.** A auditoria mostrou que o problema não era
cobertura, e sim existência: das 44 roles, só 14 constam da documentação do Google, e 79
dos 84 nomes de privilégio não existiam na API. O catálogo agora tem as 14 roles oficiais,
com as capacidades no texto do provedor, mais 120 privilégios do Admin console.
Resta uma lacuna **declarada**: o Google publica o mapa role → `privilegeName` de apenas
2 das 14 roles; as outras exigem `privileges.list` do Admin SDK, com OAuth no tenant.

---

## 2. O que já foi entregue

### Dados
- **IBM Cloud reconstruído do zero** (03/08): o dataset tinha 157 "roles" e 619 "actions", das
  quais **502 eram prosa em português escrita por nós** — nas 83 roles clássicas, 243 de 243.
  150 das 157 descrições também estavam em português. As 4 platform roles e 3 service roles
  que a IBM publica não existiam com esse nome. O catálogo agora tem as 7 roles oficiais do
  IAM, e a infraestrutura clássica ganhou página própria (`/ibm-cloud/classic`) com o modelo
  correto: permissões individuais, não roles. Coletor em `scripts/fetch-ibm-roles.js`.
- **Lacuna do IBM clássico fechada** (05/08): as **71 permissões** individuais entraram, verbatim,
  com nome e descrição da IBM. Ela existia porque a página oficial é SPA — mas o doc-fonte
  **migrou de `ibm-cloud-docs/account` para `ibm-cloud-docs/iam`**, e lá `iam-mnginfra.md`
  (atualizado pela IBM em 04/06/2026) publica as seis tabelas em markdown. Na mesma coleta caiu
  um erro de estrutura que ninguém tinha visto: o site declarava **quatro** categorias inventadas
  por nós (Account, Devices, Network, Services) contra as **seis** reais — Administrative,
  Devices, Network, Sales, Security e Software. Os links de fonte `docs/account?topic=account-*`
  foram corrigidos para `docs/iam?topic=iam-*` em toda a interface, porque os antigos davam 404.
- **Google Workspace reconstruído do zero** (03/08): 14 prebuilt roles oficiais e 120
  privilégios do Admin console, no lugar de um catálogo com 30 roles e 79 privilégios
  que não existem. Coletor em `scripts/fetch-gws-roles.js`, fonte congelada e auditável
  em `scripts/gws-official-source.json`.
- **Azure RBAC — 504 roles, a contagem oficial.** A divergência com o AzAdvertizer (937)
  foi investigada e explicada: eles mantêm roles descontinuadas que já saíram da
  documentação da Microsoft. Optamos pelo que é oficial hoje.
- **GCP — 2.381 predefined roles** coletadas das docs públicas, sem credencial
  (`fetch-gcp-roles-from-docs.js`). Bate exatamente com o gcp.permissions.cloud.
- **AWS — 1.553 policies com descrição, tipo, datas, versão e o JSON real do documento.**
  As descrições anteriores eram fabricadas e o "Policy Document JSON" da UI era
  sintético. Ambos substituídos pelo texto oficial.
- **Marcação de descontinuadas** com detector estrito, para não gerar falso positivo
  (`recommender.cloudDeprecationRecommendationAdmin`, por exemplo, está ativa).
- **Descrições de action do Azure em 95,2%** das 1.947 actions concretas (03/08). O número
  antigo de 60,4% media a coisa errada: contava as 750 wildcards no denominador — que
  nunca terão descrição, por serem padrão e não operação — e comparava identificador
  respeitando maiúsculas, quando o ARM é case-insensitive e a doc da Microsoft diverge
  das definições de role. Só a normalização de caixa recuperou 225 actions que já tinham
  descrição no arquivo. Ver `src/lib/azureActionDocs.ts`.
- **Procedência do tier rotulada na interface** (03/08): badge `ClassificationBadge` em 14
  pontos — chips de tier das 6 listagens, páginas de detalhe e a de comparação de Tier 0.
  Distingue as duas origens: *IAM Scope* (nossa, 5 clouds) e *EntraOps · EAM* (Entra ID).
  Antes o aviso existia só no rodapé da sidebar, invisível para quem chega por busca.
- **Todo texto escrito por nós removido** dos campos de dado.

### Ferramentas
- **Assessment do Tenant** — script PowerShell somente leitura que lê Entra ID e Azure
  RBAC do ambiente do usuário, cruza com este catálogo e gera Excel, CSV e dashboard
  HTML com três abas (Visão geral / Entra ID / Azure RBAC).
- **SoD Analyzer** com script PowerShell próprio, além do catálogo online.
- **Permission Scope** — busca reversa de permissão nas 6 clouds.
- **Multi-Cloud Compare** com cores alinhadas ao menu e **29 equivalências, 0 célula
  sem destino**. Das 56 células que não linkavam, 30 eram `N/A` legítimas — a cloud
  não tem função equivalente — e agora dizem isso, em vez de mostrarem nome de role
  sem link. As outras 26 viraram link: 16 se resolveram sozinhas quando o dataset
  IBM foi regerado (83 "roles" clássicas inventadas → 7 oficiais) e 12 precisaram de
  correção de nome, registrada na tabela `ALIASES` de `scripts/fix-compare-slugs.js`
  com o motivo linha a linha.

### Plataforma
- **Busca global** (`/search`, 03/08) — 4.753 roles e policies das 6 clouds, com índice
  buscado sob demanda em vez de importar os datasets. É o destino da barra de busca nas
  páginas sem lista onde filtrar (home e ferramentas), que antes caíam em `/` e não
  reagiam.
- **Reference viraram índice do site** (03/08): cada uma abre com as páginas daquela cloud
  e as 8 ferramentas multi-cloud, com as contagens reais vindas de `counts.ts`. Antes eram
  só conceituais — quem caía em `/aws/reference` por busca não descobria ali que existem
  16.117 actions catalogadas a um clique. Fonte única em `src/data/siteIndex.ts`, coberta
  por `check-site-index.js`.
- **Páginas de Reference e `/info` atualizadas** (03/08): `syncMeta.ts` — exibido na tabela
  de frescor das 6 Reference e no `/info` — anunciava Azure 926, AWS 1.526 e GCP 232, com
  datas de junho/julho, quando os datasets já estavam em 504, 1.553 e 2.381, recoletados em
  31/07. A Reference do Google Workspace citava fontes que não eram as usadas e ignorava os
  120 privilégios. O `/info` listava 6 das 8 ferramentas e o changelog parava em 27/07.
- **Destaque da sidebar corrigido** (03/08): `trailingSlash: true` fazia `endsWith('/actions')`
  falhar, e 4 páginas acendiam o item errado. Mais 2 itens (SCP vs Policies, Access Groups)
  nunca acendiam por não terem `active`. Coberto por teste.
- **SEO completo** (03/08): `sitemap.xml` com 7.615 URLs, `robots.txt`, `metadataBase`,
  Open Graph e Twitter Card com imagem própria em `public/og.png`. Os stubs de redirect
  das rotas antigas ficam fora do sitemap e em `Disallow` — rastreá-los gastaria orçamento
  em páginas que só redirecionam. Domínio configurável por `NEXT_PUBLIC_SITE_URL`.
- **Dois idiomas (pt/en)** com seletor. Decisão registrada na
  [ADR-001](docs/ADR-001-idioma-dos-dados.md): interface traduzida, dado oficial sempre
  em inglês.
- **Paginação em todas as tabelas** (20 padrão; 25/50/100/tudo).
- **Busca global** abaixo do menu superior, com estado na URL.
- **First Load JS de 436 kB para 122 kB**, movendo contagens e `TIER_META` para fora dos
  componentes compartilhados.
- **Verificadores próprios**, cada um nascido de um build quebrado:
  `check-syntax.cjs` (redeclaração), `check-i18n-scope.js` (`t()` fora do escopo do hook),
  `check-imports.js` (símbolo do projeto usado sem import), `check-static-export.js`
  (regras do `output: 'export'` que só falham em "Collecting page data") e
  `check-sidebar-focus.js` (item destacado em cada uma das 38 rotas) e
  `check-stale-numbers.js` (contagem obsoleta, `syncMeta` fora de sincronia, ferramenta
  ausente do `/info`) e `check-site-index.js` (índice das Reference) e **`check-links.js`**
  (`href` literal apontando para rota ou slug que não existe). Juntos rodam em
  segundos, contra os minutos do `tsc` sobre os datasets.
- **Link quebrado em prosa, encontrado e coberto** (05/08): `/ibm-cloud/access-groups` apontava
  para `/ibm-cloud/roles/iam-administrator`, slug que morreu com o dataset antigo de 157 roles.
  Passou pelo build e por todos os verificadores — só apareceu numa varredura do site exportado.
  Corrigido para `platform-administrator` e coberto por `check-links.js`.

---

## 3. O que falta — por prioridade

### 🔴 Bloqueadores de lançamento

**1. Os dois scripts PowerShell nunca rodaram contra um tenant real por mim.**
Não há PowerShell no ambiente de desenvolvimento. Cada bug encontrado até aqui
(`$pid` read-only, `-TenantId` exigindo GUID) só apareceu na sua execução.
→ Validar as duas correções mais recentes num tenant com assinatura Azure.

**2. O export tem 19.810 arquivos — o limite do Cloudflare Pages é 20.000.**
Medido no build de 05/08: 7.622 HTML, 7.621 `.txt` (payload RSC, um por página) e
4.446 JSON, somando 554 MB. Faltam **190 arquivos** para bater no teto, e cada role
nova consome dois. A Opção B do [DEPLOY.md](DEPLOY.md) quebra no próximo dataset que
crescer. → Decidir entre Vercel (sem esse limite) ou reduzir a árvore estática.

**3. Host precisa servir `.txt` como `text/x-component`.**
O Next busca o payload RSC de cada rota em `<rota>/index.txt`. Servido como
`text/plain` — que é o padrão de nginx, Apache, IIS e S3 — o roteador do cliente não
reconhece a resposta e **link direto para página interna cai na home depois da
hidratação**. O HTML estático está correto, então o robô do Google indexa a página
certa e a pessoa vê a home: a falha não aparece em `npm run dev` nem em nenhum
verificador. Vercel e Cloudflare Pages já tratam isso; a Opção C do DEPLOY.md, não.
→ Se for deploy manual, configurar o MIME type antes de divulgar.

### 🟡 Importantes, não bloqueiam

**4. API permissions delegadas do Entra: 162.**
O AzAdvertizer lista ~2.681 permissions no total contra nossas 854. Vale medir a
diferença antes de decidir se é lacuna ou critério diferente de contagem.

**5. SoD Analyzer cobre só Entra ID e Azure RBAC.**
As 96 regras não tocam AWS, GCP, GWS nem IBM. Ou expandir, ou rotular o escopo na tela
— hoje o nome sugere cobertura total.

**6. i18n — 52 strings em 10 arquivos.**
Quase fechado. O que sobra são Server Components que precisam do split
`page.tsx` + `XClient.tsx`. Instruções em [`docs/PROMPT-continuar-i18n.md`](docs/PROMPT-continuar-i18n.md).

### 🟢 Melhorias

**7. Home** — os cards mostram contagem, mas não ajudam a escolher. Falta um caminho
de entrada por tarefa ("investigar uma permissão", "revisar acesso privilegiado").

**8. Detalhe de role** — cada cloud ainda tem cabeçalho levemente diferente. Unificar,
como já foi feito com a tabela de permissões.

**9. Role Advisor e Role Evaluator** — ambos em BETA sem explicar o que os alimenta.
Documentar o método ou tirar do lançamento.

**10. Mobile** — a sidebar colapsa, mas as tabelas largas não têm tratamento em telas
pequenas.

**11. `evaluate.ts` e `permissionScope.ts`** ainda carregam 450 kB / 416 kB. Aplicar o
mesmo lazy-load usado nas páginas de detalhe.

---

## 4. Ordem sugerida

| # | Ação | Esforço | Por quê agora |
|---|---|---|---|
| 1 | Escolher o host e conferir o MIME de `.txt` | baixo | Erra em silêncio: o build passa e o link direto cai na home |
| 2 | Validar os `.ps1` num tenant real | baixo | Só depende de você executar |
| 3 | Fechar as 52 strings de i18n | médio | Deixa o seletor de idioma coerente |
| 4 | Seguir expandindo o Compare | alto | 29 funções cobrem as famílias mais consultadas; o resto pode esperar |

Os bloqueadores de dado acabaram. Os três que restam são de publicação e de execução:
onde hospedar, como o host serve o payload RSC, e rodar os `.ps1` num tenant real.

---

## 5. V2 — manter os dados sempre atualizados

O problema estrutural: toda carga é manual e sem detecção de mudança. Roles nascem,
mudam de descrição e são depreciadas sem aviso.

### Princípio
Preferir **repositórios de documentação no GitHub** às APIs dos provedores: são
públicos, versionados, diffáveis e não exigem credencial — o que casa com um site
estático e evita guardar segredo no CI.

A exceção que motivava tratamento especial deixou de existir: a IAM API do GCP responde
403 sem autenticação, mas o coletor atual lê as **docs públicas** e não precisa de
credencial nenhuma. Hoje **nenhuma cloud do catálogo exige credencial** para a coleta.

### Fontes por cloud

| Cloud | Fonte automatizável | Auth | Frequência |
|---|---|---|---|
| Azure RBAC | `MicrosoftDocs/azure-docs` → `built-in-roles/*.md`, `permissions/*.md` | não | semanal |
| Entra ID | `MicrosoftDocs/entra-docs` → `permissions-reference.md` | não | semanal |
| Entra (classificação) | `Cloud-Architekt/AzurePrivilegedIAM` | não | mensal |
| AWS | AWS Managed Policy Reference | não | diária |
| GCP | `docs.cloud.google.com/iam/docs/roles-permissions` | não | semanal |
| IBM | `ibm-cloud-docs/iam` → `iam-mnginfra.md`, `iam-roles-overview.md`, `iam-service-roles.md` | não | semanal |
| GWS | Admin SDK `roles.list` | OAuth | mensal |

### Arquitetura proposta
1. **`scripts/sync/<cloud>.js`** — cada um baixa, normaliza e escreve em `src/data/`,
   sempre com o mesmo contrato de saída. Os coletores atuais já seguem esse formato,
   incluindo `--dry-run`.
2. **GitHub Action semanal** roda todos e **abre PR** com o diff, em vez de commitar
   direto. O diff vira a revisão editorial.
3. **Relatório de mudanças** no corpo do PR: roles novas, removidas, com descrição
   alterada, com permissões alteradas. É o que vira o changelog do site.
4. **Gate de qualidade** no CI: falha se a cobertura de permissões cair abaixo do
   limite, se aparecer role sem fonte, ou se houver GUID duplicado.
5. **`syncMeta.ts` e `counts.ts` gerados pelo pipeline**, nunca à mão — assim a data de
   frescor não mente. O `counts.ts` já é gerado; falta o `syncMeta.ts`.

### Ganho colateral
Com o diff semanal, o site passa a ter algo que praticamente nenhum concorrente tem:
**histórico de mudanças de IAM entre clouds** — "o que a Microsoft mudou em roles neste
mês". É conteúdo recorrente e um motivo real para o usuário voltar.

---

## 6. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Tier editorial confundido com oficial | ~~Alto~~ mitigado | Badge `ClassificationBadge` em 14 pontos da interface (03/08) |
| ~~Site não indexado no lançamento~~ | resolvido | sitemap.xml, robots.txt e Open Graph entregues em 03/08 |
| `.ps1` quebrar no ambiente do usuário | Alto | Validar em tenant real; os erros são de execução, não de parse |
| Outro dataset com dado inventado | **Médio** | A auditoria do GWS achou 30 roles fictícias. O IBM foi conferido item a item em 03/08 e 05/08, contra o markdown que gera a página oficial. Os 60 OAuth scopes do GWS continuam sem conferência item a item |
| Deploy estourar o limite de arquivos | **Alto** | 19.810 de 20.000 no Cloudflare Pages. Medir a cada coleta; ver bloqueador 2 |
| Host servir `.txt` como `text/plain` | **Alto** | Link direto cai na home e nenhum teste local pega. Ver bloqueador 3 |
| Slug aposentado deixando link morto | Baixo | `check-links.js` (05/08), nascido de um link que sobreviveu à recoleta do IBM |
| ~~Volume de descrições Azure~~ | resolvido | 95,2% das actions concretas; as 93 restantes são providers fora das tabelas da Microsoft |
| Arquivos sobrescritos por edição concorrente | Médio | Aconteceu em 01/08 com `AppShell.tsx` e a página de roles do Azure — conferir mtime após edições em lote |
