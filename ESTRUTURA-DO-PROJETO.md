# Estrutura do Projeto — IAM Scope (entra-permissions)

Este documento explica a árvore de arquivos do projeto: o que cada pasta faz, como as 7 clouds cobertas (Entra ID, Azure RBAC, AWS IAM, GCP IAM, Google Workspace, OCI IAM, IBM Cloud IAM) se encaixam na mesma arquitetura, e onde mexer quando for adicionar ou corrigir dados.

Stack: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS, exportado como site estático puro (`output: 'export'`), sem backend/servidor — todo o conteúdo é compilado em build time a partir de arrays TypeScript.

## Visão geral

```
entraid.permissions/
├── src/
│   ├── app/            # Rotas (Next.js App Router) — uma pasta por página
│   ├── components/     # Componentes React reutilizáveis
│   ├── data/            # Datasets (a fonte da verdade de todo o conteúdo)
│   ├── lib/             # Funções utilitárias e transformação de dados
│   └── hooks/           # React hooks customizados
├── scripts/             # Scripts Python/Node para gerar datasets a partir de fontes oficiais
├── public/              # Assets estáticos servidos como estão (favicon, JSON brutos do Azure)
├── out/                 # Saída do `next build` (site estático gerado — não editar à mão)
├── package.json         # Dependências e scripts npm (dev/build/start)
├── next.config.js       # Config do Next.js (export estático, trailingSlash)
├── tailwind.config.js   # Config do Tailwind (dark mode via classe)
├── tsconfig.json        # Config do TypeScript
├── postcss.config.js    # Config do PostCSS (usado pelo Tailwind)
├── README.md            # Documentação de uso/instalação
└── DEPLOY.md            # Instruções de deploy
```

## `src/app/` — Rotas (Next.js App Router)

Cada subpasta de `src/app/` é uma rota. Um arquivo `page.tsx` define o conteúdo daquela rota; pastas entre colchetes (`[slug]`) são rotas dinâmicas. Como o site é 100% estático (`output: 'export'`), toda rota dinâmica precisa de `generateStaticParams()` para que o Next.js saiba, em build time, quais páginas gerar (ex.: uma página HTML por role, por policy, etc.).

O projeto replica o mesmo padrão de rotas para cada uma das 7 clouds:

| Rota | O que é |
|---|---|
| `/<cloud>` | Dashboard daquela cloud (estatísticas, breakdown por tier) |
| `/<cloud>/roles` ou `/<cloud>/policies` | Lista completa com filtros (tier, categoria, busca) |
| `/<cloud>/roles/[slug]` ou `/policies/[slug]` | Página de detalhe de uma role/policy específica |
| `/<cloud>/actions`, `/verbs`, `/permissions` | Lista de actions/verbs/permissions granulares |
| `/<cloud>/reference` | Documentação técnica: tiers, tipos de permissão, boas práticas, fontes, frescor dos dados |

Arquivos e pastas específicos:

```
src/app/
├── layout.tsx                          # Layout raiz — ThemeProvider, <html>, fontes
├── page.tsx                            # Dashboard do Entra ID (rota "/")
├── not-found.tsx                       # Página 404
├── globals.css                         # Estilos globais + diretivas Tailwind
│
├── roles/                              # Entra ID — Built-in Roles
│   ├── page.tsx                        # Lista de roles (144 roles)
│   └── [slug]/
│       ├── page.tsx                    # Página de detalhe (server component, faz o redirect de slugs renomeados)
│       └── RolePageClient.tsx          # Conteúdo client-side da página de detalhe
├── api-permissions/page.tsx            # Entra ID — API Permissions do Microsoft Graph (Application + Delegated)
├── role-actions/page.tsx               # Entra ID — Role Actions granulares
├── pim/page.tsx                        # Entra ID — Privileged Identity Management (eligible vs active, JIT)
├── reference/page.tsx                  # Entra ID — Reference (tiers, custom roles, fontes, frescor dos dados)
├── info/page.tsx                       # Página "Sobre" — frescor de dados de todas as 7 clouds
├── advisor/page.tsx                    # Role Advisor — recomendação de roles por caso de uso
│
├── azure-rbac/                         # Azure RBAC
│   ├── page.tsx                        # Dashboard
│   ├── roles/page.tsx                  # Lista (923 built-in roles)
│   ├── roles/[slug]/page.tsx           # Detalhe de role
│   └── reference/page.tsx              # Reference + frescor dos dados
│
├── aws/                                 # AWS IAM
│   ├── page.tsx                        # Dashboard
│   ├── policies/page.tsx               # Lista de policies (managed, service-role, permission-set, permission-boundary)
│   ├── policies/[slug]/page.tsx        # Detalhe de policy
│   ├── actions/page.tsx                # IAM Actions granulares
│   ├── reference/page.tsx              # Reference (tiers, tipos de policy, boundaries, boas práticas) + frescor dos dados
│   └── scp-vs-identity-policies/page.tsx  # SCP vs Identity Policies — ordem de avaliação, exemplo prático
│
├── gcp/                                 # GCP IAM
│   ├── page.tsx, roles/page.tsx, roles/[slug]/page.tsx
│   ├── permissions/page.tsx            # IAM Permissions granulares
│   └── reference/page.tsx              # + frescor dos dados
│
├── google-workspace/                    # Google Workspace
│   ├── page.tsx, roles/page.tsx, roles/[slug]/page.tsx
│   ├── api-permissions/page.tsx        # OAuth Scopes
│   ├── privileges/page.tsx             # Admin Privileges
│   └── reference/page.tsx              # + frescor dos dados
│
├── oci/                                 # OCI IAM (Oracle Cloud)
│   ├── page.tsx, policies/page.tsx, policies/[slug]/page.tsx
│   ├── verbs/page.tsx                  # Verb-based access model (inspect/read/use/manage)
│   └── reference/page.tsx              # + frescor dos dados
│
├── ibm-cloud/                           # IBM Cloud IAM
│   ├── page.tsx, roles/page.tsx, roles/[slug]/page.tsx
│   ├── actions/page.tsx
│   ├── access-groups/page.tsx          # Access Groups & Trusted Profiles (primitivos de identidade/agrupamento)
│   └── reference/page.tsx              # + frescor dos dados
│
├── compare/                             # Comparativo multi-cloud (todas as 7 clouds lado a lado)
│   ├── page.tsx                        # Tabela filtrável por tier/cloud/função
│   └── [tier]/
│       ├── page.tsx, TierPageClient.tsx           # Página por tier (0, 1, 2)
│       └── [function]/page.tsx, FunctionPageClient.tsx  # Página por função dentro de um tier
│
└── tier-comparison/page.tsx             # Comparação dedicada de Tier 0 entre as 7 clouds
                                          # (root/OrganizationAccountAccessRole na AWS, Organization Admin no GCP, etc.)
```

## `src/components/` — Componentes React

```
src/components/
├── AppShell.tsx              # Casca de toda página: sidebar + header + CloudNav. Define o mapa de rotas
│                              # por plataforma (ROUTES) e detecta a view atual a partir da URL.
├── Sidebar.tsx                # Menu lateral — muda de conteúdo conforme a plataforma ativa (platform prop)
├── CloudNav.tsx                # Menu superior de troca entre as 7 clouds
├── Dashboard.tsx                # Dashboard genérico com breakdown por tier
├── ThemeProvider.tsx / ThemeToggle.tsx   # Modo escuro (contexto + toggle)
├── StatsBar.tsx                  # Barra de estatísticas clicáveis (usada nos dashboards)
├── ExportMenu.tsx                 # Exportação de listas em CSV/Excel/JSON
├── EamTierBadge.tsx / CategoryBadge.tsx  # Badges de tier EAM e categoria
├── RolesTable.tsx, ApiPermissionsTable.tsx, RoleActionsTable.tsx   # Tabelas do Entra ID
├── RolePermissionsList.tsx, MitigationList.tsx                     # Listas de permissões/mitigações
├── AzureRbacRoleClient.tsx, GcpRoleClient.tsx, GwsRoleClient.tsx,
│   IbmCloudRoleClient.tsx, AwsPolicyClient.tsx, OciPolicyClient.tsx # Página de detalhe client-side, uma por cloud
├── CompareFilters.tsx, CompareTable.tsx, CloudEquivalenceCard.tsx  # Componentes do comparativo multi-cloud
└── EntraScopeIcon.tsx             # Logo/ícone do site
```

Padrão importante: cada cloud tem seu próprio `*Client.tsx` para a página de detalhe (ex.: `AwsPolicyClient.tsx`, `GcpRoleClient.tsx`). O `page.tsx` do App Router faz o trabalho de servidor (gerar params estáticos, buscar o registro pelo slug) e delega a renderização interativa para esse componente client.

## `src/data/` — Datasets (a fonte da verdade)

Todo o conteúdo do site vem de arrays TypeScript tipados nesta pasta — não há CMS nem banco de dados. Para corrigir ou adicionar uma role/policy, o arquivo é editado diretamente aqui.

```
src/data/
├── roles.ts                # Entra ID — 144 built-in roles (id, nome, descrição, eamTier, permissões, slug...)
├── apiPermissions.ts        # Entra ID — API Permissions do Microsoft Graph (Application + Delegated), com tipo, tier, recurso
├── azureRbac.ts              # Azure RBAC — built-in roles (Actions/NotActions/DataActions/NotDataActions)
├── aws.ts                     # AWS IAM — policies (managed, service-role, permission-set, permission-boundary)
├── gcp.ts                      # GCP IAM — predefined roles
├── googleWorkspace.ts           # Google Workspace — admin roles + OAuth scopes
├── oci.ts                        # OCI IAM — policy patterns (verb-based: inspect/read/use/manage)
├── ibmCloud.ts                    # IBM Cloud IAM — roles (IAM, Classic Infrastructure, Cloud Foundry)
├── ibmAccessPrimitives.ts          # IBM Cloud — Access Groups & Trusted Profiles (primitivos de identidade, não são "roles")
├── syncMeta.ts                      # Metadados de frescor: quando cada dataset foi verificado contra a fonte oficial
└── compare/                          # Dados do comparativo multi-cloud
    ├── types.ts                      # Tipos compartilhados (CloudId, Tier, Equivalence, CLOUD_META, getCloudUrl)
    ├── tiers.json                    # Definição dos 3 tiers do modelo EAM (Tier 0/1/2)
    ├── equivalences.json             # Equivalências de função entre as 7 clouds (ex.: "global-admin" em cada cloud)
    └── functions.json                # Lista de funções catalogadas (billing-admin, security-admin, etc.)
```

Cada dataset segue o mesmo padrão interno: um `type` de Tier (union type, ex. `AwsTier`), um `*_TIER_META` (cores e descrições para os badges de UI) e um array principal de registros tipados (`AWS_POLICIES`, `GCP_ROLES`, etc.).

## `src/lib/` — Utilitários

```
src/lib/
├── roles.ts             # Helpers de slug do Entra ID (getRoleBySlug, SLUG_REDIRECTS para roles renomeadas)
├── roleActions.ts        # Deriva a lista de Role Actions a partir das roles do Entra ID
├── roleAdvisor.ts         # Lógica de recomendação do Role Advisor
├── descriptions.ts         # Descrições auxiliares/enriquecidas
├── export.ts                # Geração de CSV/Excel/JSON para o ExportMenu
├── awsActions.ts             # Deriva IAM Actions granulares a partir das policies da AWS
├── gcpPermissions.ts          # Deriva IAM Permissions granulares do GCP
├── ociVerbs.ts                 # Deriva verbs (inspect/read/use/manage) das policies OCI
└── ibmActions.ts                 # Deriva IAM Actions granulares do IBM Cloud
```

## `src/hooks/`

```
src/hooks/
└── useColumnResize.ts    # Hook para colunas redimensionáveis nas tabelas (arrastar borda do cabeçalho)
```

## `scripts/` — Geração de dados

Scripts usados para popular `src/data/` a partir de fontes oficiais (rodados manualmente, fora do build):

```
scripts/
├── convert-roles.py             # Converte Classification_EntraIdDirectoryRoles.json (EntraOps) → src/data/roles.ts
├── convert-api-permissions.py   # Converte Classification_MsGraphAppRoles.json (EntraOps) → src/data/apiPermissions.ts
├── fetch-azure-roles.js         # Busca as built-in roles do Azure RBAC direto da documentação oficial
└── generate-azure-rbac.js       # Gera src/data/azureRbac.ts a partir dos dados buscados, e os JSONs individuais em public/azure-perms/
```

## `public/` e `out/`

- **`public/`** — assets estáticos servidos como estão. Contém `favicon.svg` e a pasta `azure-perms/`, com um arquivo JSON por role do Azure RBAC (923 arquivos) — o detalhamento bruto de Actions/DataActions usado pela página de detalhe de cada role do Azure.
- **`out/`** — pasta gerada por `next build` (site estático final, pronto para deploy em Vercel/Netlify/Cloudflare Pages/GitHub Pages). É um espelho compilado de `src/app/` + `public/`; nunca deve ser editada manualmente, apenas regenerada via `npm run build`.

## Arquivos de configuração na raiz

| Arquivo | Função |
|---|---|
| `package.json` | Dependências (Next 15, React 19, Tailwind, lucide-react) e scripts (`dev`, `build`, `start`) |
| `next.config.js` | `output: 'export'` (site 100% estático), `images.unoptimized`, `trailingSlash: true` |
| `tailwind.config.js` | Tema do Tailwind, `darkMode: 'class'` |
| `tsconfig.json` | Configuração do compilador TypeScript |
| `postcss.config.js` | Pipeline do PostCSS usado pelo Tailwind |
| `README.md` | Instruções de instalação, funcionalidades e como regenerar os datasets |
| `DEPLOY.md` | Instruções de deploy |

## Como o site fica 100% estático

`next.config.js` define `output: 'export'`, então não existe servidor Node em produção: todas as rotas — inclusive as dinâmicas como `/roles/[slug]` — são pré-renderizadas em HTML durante `npm run build`, usando `generateStaticParams()` em cada `page.tsx` dinâmico para enumerar todos os slugs a partir dos arrays em `src/data/`. Páginas que usam `useSearchParams()` (filtros via URL) precisam envolver o conteúdo em `<Suspense>`, já que esse hook exige boundary explícita para pré-renderização estática.

## Onde mexer para tarefas comuns

- **Corrigir o nome/descrição de uma role ou policy** → editar o array correspondente em `src/data/*.ts`.
- **Adicionar uma nova página de referência ou conceito** (ex.: a página de PIM ou de SCP vs Identity Policies) → criar `src/app/<rota>/page.tsx`, e adicionar o item de navegação em `src/components/Sidebar.tsx` (e, se for uma view alternável dentro de uma plataforma, também em `ROUTES`/detecção de `view` em `src/components/AppShell.tsx`).
- **Atualizar a data de sincronização de um dataset** → editar `src/data/syncMeta.ts` (array `DATA_SYNC`).
- **Adicionar uma nova cloud inteira** → replicar o padrão de uma cloud existente (ex. `oci`): um arquivo em `src/data/`, uma pasta em `src/app/<cloud>/` com dashboard/lista/detalhe/reference, um `*Client.tsx` em `src/components/`, e o bloco de navegação correspondente em `Sidebar.tsx` + `AppShell.tsx`.
