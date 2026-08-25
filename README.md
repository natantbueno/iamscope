# iamscope.cloud — Referência Multi-Cloud de IAM

Site de referência estático para roles, permissões, policies e API permissions de **seis plataformas de IAM** — Entra ID, Azure RBAC, AWS, GCP, Google Workspace e IBM Cloud — com classificação por tier de privilégio em cada uma.

A classificação de tier do Entra ID parte do [EntraOps / AzurePrivilegedIAM](https://github.com/Cloud-Architekt/AzurePrivilegedIAM); as demais são classificação editorial do próprio IAM Scope, documentada nas páginas de referência.

> **Princípio do projeto:** nome, descrição, action e permission vêm sempre do texto oficial publicado pelo provedor, em inglês. Nada é reescrito. O que é nosso — tier e categoria — aparece rotulado como classificação editorial. Ver [`docs/ADR-001-idioma-dos-dados.md`](docs/ADR-001-idioma-dos-dados.md).

## Os dados

| Plataforma | Roles / Policies | Actions / Permissions | Outros |
|---|---:|---:|---|
| **Entra ID** | 144 roles built-in | 670 role actions | 854 API permissions (Microsoft Graph) |
| **Azure RBAC** | 504 roles built-in | 2.697 actions | — |
| **AWS IAM** | 1.553 managed policies | 16.117 actions | 448 serviços |
| **GCP IAM** | 2.381 predefined roles | 13.590 permissions | 314 serviços |
| **Google Workspace** | 14 prebuilt roles | 120 privilégios do Admin console | 60 OAuth scopes |
| **IBM Cloud** | 7 roles do IAM (4 platform + 3 service) | — (a IBM não publica ação por role) | 71 permissões clássicas em 6 categorias · 2 access primitives |

Além disso: **190 regras de Segregation of Duties** e **29 equivalências** de função entre as seis clouds.

As contagens vivem em `src/data/counts.ts`, gerado por `scripts/build-counts.js` — não edite à mão. A Sidebar e o AppShell leem dali em vez dos datasets, senão os 2,5 MB de `src/data/*.ts` entrariam no chunk compartilhado de todas as páginas.

## Ferramentas

Além das listas de referência, o site tem sete ferramentas:

- 🛡️ **SoD Analyzer** (`/sod`) — 190 regras de Segregation of Duties em cinco plataformas (Entra ID, Azure RBAC, AWS IAM, GCP IAM, Google Workspace), com catálogo filtrável por provedor e plataforma, matriz de conflito e avaliação de uma lista de roles colada. 100% client-side. Duas delimitações ficam explícitas na própria tela: IBM Cloud está fora — o SoD real da IBM vive nas 71 permissões da infraestrutura clássica, que não são roles — e nenhuma regra cruza provedores diferentes, porque não existe caminho técnico entre eles. Cruzamento só dentro do provedor: Entra ID + Azure RBAC e GCP + Google Workspace.
- 📊 **Assessment do Tenant** (`/assessment`) — script PowerShell **somente leitura** que o usuário baixa e roda no próprio tenant. Lê as atribuições reais de Entra ID e Azure RBAC, cruza com este catálogo e gera Excel, CSV e um dashboard HTML local com três abas (Visão geral, Entra ID, Azure RBAC). Nenhum dado sai da máquina de quem roda.
- 🔍 **Permission Scope** (`/permission-scope`) — busca uma permission ou action nas seis clouds ao mesmo tempo e mostra quais roles a concedem.
- 🔀 **Multi-Cloud Compare** (`/compare`) — equivalência de função entre as seis plataformas, navegável por tier e por função.
- 🧭 **Role Evaluator** (`/evaluate`) — detecta a cloud de uma role colada e mostra o resultado da classificação.
- ✨ **Role Advisor** (`/advisor`) — sugere a role de menor privilégio para uma intenção descrita.
- 🔐 **Tier 0 Comparison** (`/tier-comparison`) — o que é Tier 0 em cada cloud, lado a lado.

### Scripts para rodar no seu ambiente

Ficam em `public/tools/`, servidos como download estático:

| Script | O que faz |
|---|---|
| `Invoke-IAMScopeAssessment.ps1` | Assessment completo: inventário, tier, achados, SoD e score de risco. Absorve a análise de SoD. |
| `Invoke-IAMScopeSoDAnalysis.ps1` | Só a análise de segregação de funções, para quem quer o recorte menor. |

Ambos são **somente leitura** — autenticam com escopos `*.Read.*` e não criam, alteram nem removem nada. Requerem `Microsoft.Graph.Authentication` e `Microsoft.Graph.Identity.Governance`; para a parte de Azure RBAC, também `Az.Accounts` e `Az.Resources`. Sem estes últimos o script roda só o Entra ID e **declara isso no relatório**, na linha *Cobertura Azure RBAC*.

O catálogo que os scripts consomem (`public/iamscope-catalog.json`) é gerado por `scripts/build-assessment-catalog.js` a partir dos mesmos datasets do site — não há segunda cópia dos dados dentro do `.ps1`, que sairia de sincronia na primeira atualização.

## Outras funcionalidades

- 🌍 **Dois idiomas** (pt/en) com seletor de bandeiras. A **interface** é traduzida; os **dados oficiais permanecem em inglês** — decisão documentada na [ADR-001](docs/ADR-001-idioma-dos-dados.md), porque a tradução automática da Microsoft chega a traduzir identificadores de action (`*/read` → `*/leitura`), o que quebraria a utilidade da referência.
- 📄 Página individual para cada role, policy, permission e action, com o texto oficial, as permissões relacionadas e os equivalentes em outras clouds.
- 📥 Exportação em CSV, Excel (.xls) e JSON — lista corrente ou permissões expandidas.
- 📑 Paginação em todas as tabelas (20 por padrão; 25/50/100/tudo).
- 🔍 Busca global abaixo do menu superior, com estado na URL (`?q=`) — o link é compartilhável.
- 🏷️ Filtros por tier, categoria e privilégio, também refletidos na URL.
- ⚠️ Marcação de roles privilegiadas e de roles/policies **descontinuadas** pelo provedor.
- 🌙 Tema escuro.

## Rotas

### Entra ID
| Rota | Descrição |
|------|-----------|
| `/entraid` | Dashboard |
| `/entraid/roles` · `/entraid/roles/[slug]` | Roles built-in (aceita `?tier=`, `?category=`, `?filter=privileged`, `?q=`) |
| `/entraid/role-actions` | Role actions, filtráveis por tier |
| `/entraid/api-permissions` | API permissions do Microsoft Graph |
| `/entraid/pim` | Privileged Identity Management |
| `/entraid/reference` | Referência rápida — abre com o índice de navegação da cloud |

### Azure RBAC
| Rota | Descrição |
|------|-----------|
| `/azure-rbac` | Dashboard |
| `/azure-rbac/roles` · `/azure-rbac/roles/[slug]` | Roles built-in |
| `/azure-rbac/permissions` · `/azure-rbac/permissions/[slug]` | Catálogo de actions |
| `/azure-rbac/reference` | Referência rápida |

### AWS IAM
| Rota | Descrição |
|------|-----------|
| `/aws` | Dashboard |
| `/aws/policies` · `/aws/policies/[slug]` | Managed policies, com o JSON oficial do documento |
| `/aws/actions` | Catálogo de actions |
| `/aws/scp-vs-identity-policies` | Comparação SCP vs. Identity Policies |
| `/aws/reference` | Referência rápida |

### GCP IAM
| Rota | Descrição |
|------|-----------|
| `/gcp` | Dashboard |
| `/gcp/roles` · `/gcp/roles/[slug]` | Predefined roles |
| `/gcp/permissions` | Catálogo de permissions |
| `/gcp/reference` | Referência rápida |

### Google Workspace
| Rota | Descrição |
|------|-----------|
| `/google-workspace` | Dashboard |
| `/google-workspace/roles` · `/google-workspace/roles/[slug]` | Admin roles |
| `/google-workspace/privileges` | Privileges |
| `/google-workspace/api-permissions` | API permissions delegadas |
| `/google-workspace/reference` | Referência rápida |

### IBM Cloud
| Rota | Descrição |
|------|-----------|
| `/ibm-cloud` | Dashboard |
| `/ibm-cloud/roles` · `/ibm-cloud/roles/[slug]` | Roles |
| `/ibm-cloud/classic` | Infraestrutura clássica — as 71 permissões, em 6 categorias; não roles |
| `/ibm-cloud/access-groups` | Access Groups & Trusted Profiles |
| `/ibm-cloud/reference` | Referência rápida |

### Ferramentas e geral
| Rota | Descrição |
|------|-----------|
| `/` | Home com as seis clouds |
| `/sod` · `/sod/rules` · `/sod/rules/[id]` | SoD Analyzer |
| `/assessment` | Assessment do tenant (download do script) |
| `/search` | Busca global — todas as roles e policies das 6 clouds |
| `/permission-scope` | Busca de permission cross-cloud |
| `/compare` · `/compare/[tier]` · `/compare/[tier]/[function]` | Multi-Cloud Compare |
| `/evaluate` | Role Evaluator |
| `/advisor` | Role Advisor |
| `/tier-comparison` | Comparação de Tier 0 |
| `/reference` | Referência geral consolidada |
| `/info` | Sobre o projeto, fontes e changelog |

### Rotas antigas (redirect)

As rotas do Entra ID viviam na raiz até 07/2026. Os caminhos antigos continuam existindo como stub de redirect permanente, para não quebrar links já compartilhados: `/roles`, `/roles/[slug]`, `/role-actions`, `/api-permissions` e `/pim` apontam para o equivalente em `/entraid/*`.

Com `output: 'export'` não há redirect de servidor — o `redirect()` em Server Component gera HTML estático com meta refresh.

## Como rodar localmente

### Pré-requisitos

Node.js 18.18+ ou 20+ ([nodejs.org](https://nodejs.org)) — instale a versão **LTS**. O Next.js 15 exige Node 18.18 no mínimo.

> **Nota de segurança:** o projeto usa Next.js 15.5.9, versão estável com os patches de RSC de dezembro/2025. Se o `npm audit` sugerir `npm audit fix --force`, **não rode** — isso forçaria o salto para o Next 16, um breaking change desnecessário aqui. As vulnerabilidades reportadas afetam apps em produção expostos na internet, não o uso local em `localhost`.

### ⚠️ Erro comum no Windows (PowerShell)

Se aparecer `npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada`, rode antes:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Isso libera scripts só para a sessão atual. Alternativamente, use o **Prompt de Comando (cmd)**, que não tem essa restrição.

### Instalação

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000**.

## Estrutura do projeto

```
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Layout raiz + LanguageProvider
│   │   ├── (home)/                   # Home com as 6 clouds
│   │   ├── entraid/                  # Entra ID
│   │   ├── azure-rbac/               # Azure RBAC
│   │   ├── aws/  gcp/  google-workspace/  ibm-cloud/
│   │   ├── sod/  assessment/  permission-scope/  compare/
│   │   └── evaluate/  advisor/  tier-comparison/  info/
│   ├── components/                   # Sidebar, AppShell, GlobalSearch, Pagination,
│   │                                 # PermissionsTable, ExportMenu, tabelas por cloud
│   ├── hooks/                        # usePagination, useColumnResize
│   ├── i18n/                         # LanguageProvider + dicionário (232 chaves)
│   ├── lib/                          # Lógica client-side (sod.ts, evaluate.ts...)
│   └── data/
│       ├── counts.ts                 # AUTO-GERADO — só contagens
│       ├── tierMeta.ts               # TIER_META das 6 clouds, isolado do dataset
│       ├── roles.ts / apiPermissions.ts        # Entra ID
│       ├── azureRbac.ts / aws.ts / gcp.ts      # Azure, AWS, GCP
│       ├── googleWorkspace.ts / ibmCloud.ts    # GWS, IBM
│       ├── compare/  sod/            # Equivalências e regras de SoD
│       └── syncMeta.ts               # Quando cada dataset foi sincronizado
├── public/
│   ├── tools/                        # Scripts PowerShell para download
│   ├── iamscope-catalog.json         # Catálogo consumido pelos scripts
│   └── *-perms/  *-perms-index.json  # Permissões fora do bundle, buscadas sob demanda
├── scripts/                          # Coletores e ferramentas de build
└── docs/                             # ADRs e design system
```

### Por que as permissões ficam em `public/`

Os conjuntos de permissions (Azure, GCP, AWS) são grandes demais para o bundle JavaScript. Ficam como JSON em `public/`, com um índice separado, e são buscados por `fetch` só quando a página de detalhe precisa. Sem isso, o First Load JS passava de 400 kB.

### ⚠️ `public/*.json` é formato interno, não API

Como o site é `output: 'export'`, tudo que está em `public/` vai para `out/` e **é servido por URL pública**. `https://iamscope.cloud/gcp-roles-official.json` responde, e o mesmo vale para os outros índices e para os 4.475 arquivos em `azure-perms/`, `gcp-perms/` e `aws-policy-docs/`.

Isso é consequência do export estático, **não é uma interface**. Esses arquivos:

- têm a forma que o coletor que os escreveu deu a eles, e mudam quando o coletor muda;
- carregam campos derivados que podem estar defasados — o `actions` de `aws-policy-docs/*.json` ainda vem do coletor antigo e inclui `Deny`, e é por isso que `src/lib/awsActions.ts` lê o `document`, não esse campo;
- respondem com o cabeçalho `X-IAMScope-Contract: internal-unstable`;
- **não têm CORS, de propósito** — um navegador de terceiro não consegue lê-los, e é isso que impede uma dependência acidental de virar quebra silenciosa na próxima coleta.

O contrato público será `/api/v1/`: CORS aberto, versionado no caminho, com checador travando o build. O `vercel.json` já está preparado para ele. **Enquanto `/api/v1/` não existir, não há interface pública de dados neste projeto** — quem precisa de dado estável usa os exports em CSV/JSON da própria interface.

## Coleta de dados

Todos os datasets vêm de fontes oficiais. Os coletores ficam em `scripts/`:

| Script | Fonte oficial |
|---|---|
| `fetch-azure-roles-official.js` | [MicrosoftDocs/azure-docs — built-in-roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles) |
| `fetch-azure-action-descriptions.js` | [Azure resource provider operations](https://learn.microsoft.com/en-us/azure/role-based-access-control/resource-provider-operations) |
| `fetch-aws-policies-official.js` | [AWS Managed Policy Reference](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html) |
| `fetch-gcp-roles-from-docs.js` | [Google Cloud IAM roles & permissions](https://docs.cloud.google.com/iam/docs/roles-permissions) |
| `convert-roles.py` · `convert-api-permissions.py` | [EntraOps / AzurePrivilegedIAM](https://github.com/Cloud-Architekt/AzurePrivilegedIAM) |
| `fetch-gws-roles.js` | [Prebuilt administrator roles](https://support.google.com/a/answer/2405986) + [Administrator privilege definitions](https://knowledge.workspace.google.com/admin/users/administrator-privilege-definitions) |
| `fetch-ibm-roles.js` | [IBM Cloud IAM roles](https://cloud.ibm.com/docs/iam?topic=iam-userroles) + [Managing classic infrastructure access](https://cloud.ibm.com/docs/iam?topic=iam-mngclassicinfra) |

Ferramentas de apoio:

| Script | O que faz |
|---|---|
| `build-counts.js` | Regenera `src/data/counts.ts`. **Rode depois de qualquer coleta.** |
| `build-azure-perms-index.js` | Índice invertido action → roles do Azure |
| `build-effective-perms.js` | Expande os wildcards das roles do Azure e gera `src/data/azureEffective.ts` + `public/azure-effective-perms.json`. `permissionCount` conta ENTRADAS da definição (a Owner é `{"action":"*"}` e contava 1); o efetivo é o que aquilo concede. **É um piso** — o universo vem da documentação, não da Management API. |
| `build-assessment-catalog.js` | Gera `public/iamscope-catalog.json` para os scripts PowerShell |
| `build-sod-rules-json.js` | Exporta as 123 regras Microsoft do SoD para consumo externo — o `.ps1` não alcança AWS/GCP/Workspace |
| `build-sod-role-index.js` | Gera `src/data/sod/roleIndex.ts` (nome+slug das 4.596 roles) para o SoD não arrastar 2,2 MB de datasets |
| `build-search-index.js` | Gera `public/search-index.json`, o índice da busca global |
| `check-syntax.cjs` | Sintaxe e redeclaração — o parser sozinho deixa passar |
| `check-imports.js` | Símbolo do projeto usado sem import. O `tsc` pega, mas leva minutos por causa dos datasets; este roda em segundos |
| `check-static-export.js` | Regras do `output: 'export'` que só falham na fase "Collecting page data" do build |
| `check-sidebar-focus.js` | Qual item da sidebar acende em cada rota — erro que compila e renderiza, só destaca o item errado |
| `check-stale-numbers.js` | Contagem obsoleta na tela, label de `syncMeta` fora de sincronia e ferramenta que existe na sidebar mas não no `/info` |
| `check-site-index.js` | Índice de navegação das Reference: rota inexistente, listagem esquecida, contagem literal errada |
| `typecheck.cjs` | Verificação de tipos completa |
| `check-i18n-scope.js` | Garante que todo `t()` está no escopo de um hook — erro que só aparece no build |
| `find-untranslated.js` | Lista strings fixas ainda não traduzidas |

### Fluxo de atualização

```bash
node scripts/fetch-gcp-roles-from-docs.js --write-ts   # (ou outro coletor)
node scripts/build-counts.js                            # sempre depois
node scripts/build-azure-perms-index.js                 # se mexeu no Azure
node scripts/build-effective-perms.js                   # idem — depende do índice acima
node scripts/build-effective-perms.js --verify          # as 6 verificações, sem gravar
node scripts/build-assessment-catalog.js                # se mexeu em roles ou SoD
node scripts/build-search-index.js                      # sempre que roles mudarem
node scripts/check-imports.js                           # segundos; pega import faltando
node scripts/check-static-export.js                      # regras do output: export
node scripts/check-sidebar-focus.js                      # destaque da sidebar por rota
node scripts/check-stale-numbers.js                      # números e conteúdo desatualizados
node scripts/check-site-index.js                         # índice das páginas de Reference
node scripts/build-snapshot.js                           # grava o estado, para o changelog
node scripts/build-changelog.js                          # deriva os eventos, feeds e a API
node scripts/check-changelog.js                          # barra quarentena aberta e cadeia quebrada
npm run build
```

Todo coletor aceita `--dry-run`: imprime o que encontrou sem escrever nada. Use antes de sobrescrever um dataset.

### Changelog e snapshots

`build-snapshot.js` grava `data/snapshots/{cloud}/{AAAA-MM-DD}.json` com **id e hash por item**, nunca o dataset inteiro. Ele lê os datasets, não a rede — assim AWS e GCP têm histórico mesmo quando os coletores deles só rodam na máquina do Natan.

O hash de cada item cobre **sete campos**, e só eles: `name`, `description`, a lista **ordenada** de permissões, `tier`, `category`, `isPrivileged` e as regras de SoD que citam o item. A ordenação da lista não é detalhe: o parser do Azure emite na ordem do bloco JSON da doc e o da AWS na ordem do documento de policy, então sem o `sort` um reordenamento publicaria "permissões alteradas" no catálogo inteiro. O `slug` fica fora do hash porque **é** a identidade do item.

**Só grava quando muda.** Toda execução acrescenta uma linha a `data/snapshots/{cloud}/runs.jsonl` (~100 bytes) — é a evidência de que o catálogo foi olhado e estava igual. Um `{data}.json` só nasce quando o hash agregado difere, e dentro dele uma coleção que não mudou vira `{ unchanged, since }` apontando para o snapshot que a guarda por extenso. Sem isso o repositório cresceria ~500 KB por dia de conteúdo quase idêntico.

**O que é versionado e o que não é:** `data/snapshots/` e `data/changelog/attested.json` entram no git — são o histórico, e sem eles não há changelog. `public/changelog.json`, `public/feeds/` e `public/api/` são derivados, estão no `.gitignore`, e o `npm run build` os regenera.

**A defesa contra a exclusão em massa que não aconteceu.** `fetch-azure-roles-official.js` reporta HTTP 404 em três páginas (`mixed-reality`, `virtual-desktop-infrastructure`, `other`) e reescreve o dataset assim mesmo. No dia em que essas páginas guardarem roles que só elas listam, o dataset encolhe — e um changelog ingênuo anunciaria uma exclusão em massa. Duas defesas, independentes de propósito:

1. **Cobertura declarada.** O coletor escreve em `data/collector-health.json` o que não conseguiu ler. `build-changelog.js` recusa emitir `removida` a partir de uma coleção incompleta e emite `desconhecido`, nomeando as páginas que faltaram.
2. **Limiar de remoção em massa.** Remoções acima de `max(5, 2% do catálogo)` numa única transição são retidas em `data/changelog/quarantine.json` e **não** são publicadas. Não depende de coletor nenhum — é a defesa que funciona hoje, com os oito como estão.

`check-changelog.js` falha enquanto houver quarentena aberta. Para liberar, acrescente a chave `{cloud}:{collection}:{data}` a `data/changelog/confirmed-removals.json`.

Testes do diff: `node scripts/test-changelog.cjs` — 22 casos, cada um uma forma conhecida de o changelog mentir.

### O que o changelog publica

Quatorze tipos de evento, em três procedências, marcadas na página, no feed e na API:

| Procedência | Tipos |
|---|---|
| `provider-fact` | `created` · `removed` · `renamed` · `description-changed` · `permissions-changed` |
| `iamscope-editorial` | `tier-changed` · `category-changed` · `privilege-changed` · `sod-changed` · `dataset-recollected` · `dataset-corrected` |
| `iamscope-process` | `genesis` · `coverage-changed` · `unknown` |

Os quatro do meio são o que **só nós** temos como emitir: nenhum provedor publica tier nem regra de segregação de funções.

Cada evento também carrega `origin`: `derived` quando saiu da comparação de dois snapshots, `attested` quando veio de um registro datado que já existia no repositório antes de a captura ser ligada (esses estão em `data/changelog/attested.json`, cada um com a fonte no próprio repo).

**Páginas:** `/changelog` e `/changelog/{cloud}`, com filtro por tipo, período e procedência.

**Feeds Atom:** 13 arquivos em `public/feeds/` — `all.xml`, um por nuvem, e um `{cloud}-privileged.xml` por nuvem. Saem em inglês: leitor de feed não tem seletor de idioma.

**API:** `/api/v1/changes.json`, no envelope de `scripts/lib/api-envelope.js` — o mesmo que a Fase 1 vai usar nos outros 14 arquivos.

## Modelos de tier por cloud

Cada plataforma tem seu próprio vocabulário de privilégio. Todos são mapeados para a mesma lógica: *quanto mais próximo do Tier 0, maior o risco de takeover do ambiente*.

| Cloud | Modelo | Tier mais crítico |
|-------|--------|--------------------|
| Entra ID | Enterprise Access Model (EAM) | Control Plane |
| Azure RBAC | Tiers do projeto | FullControl / AccessManagement |
| AWS | Managed Policies | Policies com `iam:*` / `*:*` |
| GCP | Predefined Roles | Owner e roles `iam.*` / `resourcemanager.*` |
| Google Workspace | Admin Roles | Super Admin |
| IBM Cloud | Platform / Service Roles | Administrator |

A classificação do Entra ID segue o modelo do [EntraOps](https://github.com/Cloud-Architekt/EntraOps), de Thomas Naunheim.

**Tier e categoria são classificação editorial do IAM Scope**, derivada das permissões oficiais de cada role — não são classificação do provedor. O site diz isso onde a informação aparece, e os relatórios gerados pelos scripts repetem o aviso.

## Build e deploy

```bash
npm run build
```

Gera um site 100% estático (`output: 'export'`) com cerca de **7.800 páginas** — dashboards, listas e uma página de detalhe para cada role, policy, permission e action das seis clouds, mais o catálogo de regras do SoD.

Funciona no **Vercel** (recomendado), Netlify ou qualquer host estático. Para Vercel: push para o GitHub → importe em vercel.com → deploy automático.

### `vercel.json`

Só cabeçalhos — não altera build command nem diretório de saída. Faz duas coisas:

1. **Abre CORS em `/api/(.*)`**, com cache curto no manifesto (`index.json`, 5 min) e longo nos dados (1 h + `stale-while-revalidate`). Sem essa configuração nenhum navegador de terceiro consegue ler a API, por mais pública que a URL seja.
2. **Marca os arquivos internos** de `public/` com `X-IAMScope-Contract: internal-unstable`, e deliberadamente **não** dá CORS a eles.

Em host que não seja Vercel, esses cabeçalhos precisam ser reproduzidos na configuração equivalente (`_headers` no Netlify e no Cloudflare Pages), senão a API sai sem CORS e sem cache.

### Restrições de arquitetura

Quem for mexer no código precisa saber:

- `output: 'export'` — **sem** rotas de API, sem middleware, sem ISR. Toda página dinâmica precisa de `generateStaticParams`.
- `'use client'` é incompatível com `export const metadata` e `generateStaticParams`. Componentes que precisam dos dois se dividem em `page.tsx` (servidor, com metadata) + `XClient.tsx` (cliente) — padrão usado em `/sod` e `/assessment`.
- Nada que a Sidebar ou o AppShell importem pode puxar um dataset: eles envolvem todas as páginas e o import iria para o chunk compartilhado. Daí existirem `counts.ts` e `tierMeta.ts`.
- O tema é permanentemente escuro; só as variantes `dark:` são renderizadas.

## Créditos e fontes

- [AzurePrivilegedIAM / EntraOps](https://github.com/Cloud-Architekt/AzurePrivilegedIAM) (Thomas Naunheim) — classificação EAM
- [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference) — Entra ID e Azure RBAC
- Documentação oficial da [AWS](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html), [Google Cloud](https://docs.cloud.google.com/iam/docs/roles-permissions), Google Workspace e IBM Cloud — demais datasets

A data da última sincronização de cada dataset fica em `src/data/syncMeta.ts` e é exibida na interface.

## Licença

Os **dados** estão em [`DATA-LICENSE.md`](DATA-LICENSE.md), em três camadas:

| Camada | O que é | Licença |
|---|---|---|
| Fato bruto dos provedores | Nomes, IDs, ações, descrições oficiais | Termos de Microsoft / AWS / Google / IBM — não relicenciado aqui |
| Curadoria do IAM Scope | `eamLevel`, tiers, categorias, as 190 regras de SoD, as 29 equivalências | **CC BY 4.0** — uso comercial permitido, crédito e link obrigatórios |
| Derivado de terceiros | `eamTier` do Entra (EntraOps), API permissions do Graph (microsoft-info) | MIT, atribuição mantida |

O **código-fonte não tem licença**, o que por padrão significa todos os direitos reservados. É decisão em aberto, não posição — quem quiser contribuir ou fazer fork precisa que um `LICENSE` seja adicionado primeiro.
