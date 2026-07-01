# iamscope.cloud — Referência Multi-Cloud de IAM — Entra ID, Azure RBAC, AWS, GCP, Google Workspace, OCI e IBM Cloud

Site de referência estático para roles, permissões, políticas e API permissions de sete plataformas de IAM, com classificação por tier de privilégio em cada uma. Inspirado no [azure.permissions.cloud](https://azure.permissions.cloud), [AzAdvertizer](https://www.azadvertizer.net) e nas classificações do [EntraOps / AzurePrivilegedIAM](https://github.com/Cloud-Architekt/AzurePrivilegedIAM).

## Funcionalidades

- 📋 **144 roles built-in** do Microsoft Entra ID (dataset oficial do EntraOps), classificadas pelo **Enterprise Access Model (EAM)**: Control Plane, Management Plane, Workload Plane, User Access
- ☁️ **926 built-in roles** do Azure RBAC, com tiers próprios (FullControl, AccessManagement, Contributor, DataPlane, Reader, Specialized)
- 🟠 **1526+ Managed Policies** da AWS (IAM), incluindo comparação SCP vs. Identity Policies e Permission Boundaries
- 🔵 **232 predefined roles** do GCP (IAM), com catálogo de permissões `iam.*`/`security.*`
- 🟢 **44 roles e privileges** do Google Workspace, incluindo API Permissions delegadas
- 🔷 **157 roles** do IBM Cloud, com Access Groups & Trusted Profiles e Permission Boundaries equivalentes
- 🔴 **126 policies** da OCI (Oracle Cloud Infrastructure), com catálogo de verbs
- 🛡️ **SoD Analyzer** (`/sod`) — 96 regras de Segregation of Duties cobrindo Entra ID, Azure RBAC e combinações cross-cloud, com catálogo filtrável, matriz de conflito e avaliação de lista de roles, 100% client-side
- 🔀 **Multi-Cloud Compare** (`/compare`) — equivalência de roles entre as 7 plataformas, por tier e por função
- 🧭 **Role Evaluator** (`/evaluate`) — detecta a cloud de uma role colada e mostra o resultado da classificação
- 📄 **Página individual para cada role/policy** com descrição completa, permissões/actions relacionadas e roles/policies equivalentes
- 📥 **Exportação** em CSV, Excel (.xls) e JSON — lista de roles ou permissões expandidas
- 🌙 **Modo escuro** com toggle e persistência
- 🔍 Busca por nome, descrição, ID/slug ou permissão em cada plataforma
- 🏷️ Filtros por tier, categoria e nível de privilégio — **refletidos na URL** (compartilháveis)
- 🔗 Dashboard com números clicáveis que levam às listas filtradas
- ⚠️ Identificação de roles privilegiadas
- 🔐 Página de **PIM** (Privileged Identity Management) e de **comparação de Tiers** entre clouds

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard com estatísticas clicáveis |
| `/roles` | Lista de roles do Entra ID (aceita `?tier=`, `?category=`, `?filter=privileged`, `?q=`) |
| `/roles/[slug]` | Página de detalhe de uma role do Entra ID |
| `/role-actions` | Lista de role actions do Entra ID, filtráveis por tier |
| `/api-permissions` | Lista de API permissions do Microsoft Graph (aceita `?tier=`, `?q=`) |
| `/azure-rbac` | Dashboard do Azure RBAC |
| `/azure-rbac/roles` | Lista de roles built-in do Azure RBAC |
| `/azure-rbac/roles/[slug]` | Página de detalhe de uma role do Azure RBAC |
| `/azure-rbac/reference` | Referência rápida do Azure RBAC |
| `/aws` | Dashboard do AWS IAM |
| `/aws/policies` | Lista de Managed Policies da AWS |
| `/aws/policies/[slug]` | Página de detalhe de uma Managed Policy |
| `/aws/actions` | Lista de actions do AWS IAM |
| `/aws/reference` | Referência rápida do AWS IAM |
| `/aws/scp-vs-identity-policies` | Comparação SCP vs. Identity Policies |
| `/gcp` | Dashboard do GCP IAM |
| `/gcp/roles` | Lista de predefined roles do GCP |
| `/gcp/roles/[slug]` | Página de detalhe de uma role do GCP |
| `/gcp/permissions` | Catálogo de permissões `iam.*`/`security.*` |
| `/gcp/reference` | Referência rápida do GCP |
| `/google-workspace` | Dashboard do Google Workspace |
| `/google-workspace/roles` | Lista de roles do Google Workspace |
| `/google-workspace/roles/[slug]` | Página de detalhe de uma role do Google Workspace |
| `/google-workspace/privileges` | Lista de privileges do Google Workspace |
| `/google-workspace/api-permissions` | API Permissions delegadas |
| `/google-workspace/reference` | Referência rápida do Google Workspace |
| `/ibm-cloud` | Dashboard do IBM Cloud |
| `/ibm-cloud/roles` | Lista de roles do IBM Cloud |
| `/ibm-cloud/roles/[slug]` | Página de detalhe de uma role do IBM Cloud |
| `/ibm-cloud/access-groups` | Access Groups & Trusted Profiles |
| `/ibm-cloud/actions` | Lista de actions do IBM Cloud |
| `/ibm-cloud/reference` | Referência rápida do IBM Cloud |
| `/oci` | Dashboard da OCI |
| `/oci/policies` | Lista de policies da OCI |
| `/oci/policies/[slug]` | Página de detalhe de uma policy da OCI |
| `/oci/verbs` | Catálogo de verbs da OCI |
| `/oci/reference` | Referência rápida da OCI |
| `/compare` | Multi-Cloud Compare — equivalência de roles entre as 7 clouds |
| `/compare/[tier]` | Equivalência filtrada por tier |
| `/compare/[tier]/[function]` | Equivalência filtrada por tier e função |
| `/sod` | SoD Analyzer — catálogo, matriz e avaliação de usuário |
| `/sod/rules` | Alias para a aba de catálogo do SoD Analyzer |
| `/sod/rules/[id]` | Página de detalhe de uma regra SoD |
| `/evaluate` | Role Evaluator — detecção automática de cloud |
| `/pim` | Privileged Identity Management |
| `/reference` | Referência geral consolidada |
| `/tier-comparison` | Comparação de Tiers entre clouds |
| `/advisor` | Role Advisor |
| `/info` | Sobre o projeto |

## Como rodar localmente

### Pré-requisitos

- Node.js 18.18+ ou 20+ instalado ([nodejs.org](https://nodejs.org)) — instale a versão **LTS**. O Next.js 15 exige Node 18.18 no mínimo.

> **Nota de segurança:** o projeto usa Next.js 15.5.9, versão estável com os patches de RSC de dezembro/2025. Se o `npm audit` sugerir `npm audit fix --force`, **não rode** — isso forçaria o salto para o Next 16 (breaking change desnecessário aqui). As vulnerabilidades reportadas afetam apps em produção expostos na internet, não o uso local em `localhost`.

### ⚠️ Erro comum no Windows (PowerShell)

Se aparecer `npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada`, rode antes:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Isso libera scripts só para a sessão atual. Alternativamente, use o **Prompt de Comando (cmd)** em vez do PowerShell, que não tem essa restrição.

### Instalação

```bash
cd entra-permissions
npm install
npm run dev
```

Acesse: **http://localhost:3000**

## Estrutura do projeto

```
entra-permissions/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout raiz + ThemeProvider
│   │   ├── page.tsx                # Dashboard principal
│   │   ├── globals.css             # Estilos globais + Tailwind
│   │   ├── roles/, role-actions/, api-permissions/   # Entra ID
│   │   ├── azure-rbac/             # Azure RBAC
│   │   ├── aws/                    # AWS IAM
│   │   ├── gcp/                    # GCP IAM
│   │   ├── google-workspace/       # Google Workspace
│   │   ├── ibm-cloud/              # IBM Cloud
│   │   ├── oci/                    # OCI
│   │   ├── compare/                # Multi-Cloud Compare
│   │   ├── sod/                    # SoD Analyzer
│   │   ├── evaluate/, pim/, reference/, tier-comparison/, advisor/, info/
│   ├── components/                 # ~34 componentes (Sidebar, Dashboard, tabelas
│   │                                # e clients por cloud, SoD*, Compare*, etc.)
│   ├── lib/                        # Lógica client-side (sod.ts, roles.ts, roleActions.ts...)
│   └── data/
│       ├── roles.ts                 # Entra ID — roles + metadados EAM
│       ├── apiPermissions.ts        # Entra ID — API permissions
│       ├── azureRbac.ts             # Azure RBAC — roles built-in
│       ├── aws.ts                   # AWS — Managed Policies
│       ├── gcp.ts                   # GCP — predefined roles + permissions
│       ├── googleWorkspace.ts       # Google Workspace — roles + privileges
│       ├── ibmCloud.ts / ibmAccessPrimitives.ts  # IBM Cloud
│       ├── oci.ts                   # OCI — policies + verbs
│       ├── compare/                 # Dataset de equivalência multi-cloud
│       ├── sod/                     # Dataset de regras SoD
│       └── syncMeta.ts              # Data/versão de sincronização por plataforma
├── package.json
├── tailwind.config.js               # darkMode: 'class', tokens brand/csp/surface
├── tsconfig.json
└── next.config.js                   # output: 'export' (site estático)
```

## Sobre os modelos de tier por cloud

Cada plataforma tem seu próprio modelo de classificação de privilégio, todos mapeados para uma lógica comum de "quanto mais próximo do Tier 0, maior o risco de takeover do ambiente":

| Cloud | Modelo | Tier mais crítico |
|-------|--------|--------------------|
| Entra ID | Enterprise Access Model (EAM) | Control Plane |
| Azure RBAC | Tiers internos do projeto | FullControl / AccessManagement |
| AWS | IAM Managed Policies | Policies com `iam:*`/`*:*` |
| GCP | Predefined Roles | Roles `iam.*`/`security.*` de owner |
| Google Workspace | Admin Roles | Super Admin |
| IBM Cloud | Platform/Service Roles | Administrator |
| OCI | Policies | Policies com verb `manage` em `tenancy` |

A classificação do Entra ID segue o modelo do [EntraOps](https://github.com/Cloud-Architekt/EntraOps) de Thomas Naunheim. Para um cenário de produção, recomenda-se sincronizar com os arquivos `Classification_AadResources.json` e `Classification_AppRoles.json` do repositório AzurePrivilegedIAM.

## Como adicionar/atualizar dados

Os datasets do Entra ID são **gerados automaticamente** a partir dos arquivos de classificação do EntraOps / AzurePrivilegedIAM, usando os scripts em `scripts/`. Os demais datasets (Azure RBAC, AWS, GCP, Google Workspace, IBM Cloud, OCI, SoD) são mantidos manualmente em `src/data/`, com scripts auxiliares de conversão quando aplicável (ex.: `scripts/` para AWS Managed Policies).

### Regenerar as roles do Entra ID (144 roles)

```bash
python3 scripts/convert-roles.py \
  /caminho/AzurePrivilegedIAM/Classification/Classification_EntraIdDirectoryRoles.json \
  src/data/roles.ts
```

### Regenerar as API permissions do Entra ID (692 permissões)

```bash
python3 scripts/convert-api-permissions.py \
  /caminho/AzurePrivilegedIAM/Classification/Classification_MsGraphAppRoles.json \
  src/data/apiPermissions.ts
```

Para atualizar quando a Microsoft adicionar roles novas: baixe a versão mais recente do repositório [AzurePrivilegedIAM](https://github.com/Cloud-Architekt/AzurePrivilegedIAM), rode os scripts acima, e os arquivos `roles.ts` e `apiPermissions.ts` são reescritos com os dados frescos — incluindo a classificação EAM oficial de cada role action.

### Edição manual

Também é possível editar os arquivos em `src/data/` diretamente, mas mudanças em `roles.ts`/`apiPermissions.ts` serão sobrescritas na próxima execução dos scripts do Entra ID.

## Sincronizar com Microsoft Graph

```powershell
Connect-MgGraph -Scopes "RoleManagement.Read.Directory"

# Roles
Get-MgRoleManagementDirectoryRoleDefinition |
  Select-Object DisplayName, Id, Description, IsBuiltIn, IsPrivileged |
  Export-Csv roles.csv -NoTypeInformation

# Catálogo de permissões para custom roles
Get-MgRoleManagementDirectoryResourceAction
```

## Build para produção e deploy

```bash
npm run build
npm start
```

O build gera um site 100% estático (`output: 'export'`) com aproximadamente **3311 páginas** (dashboard, listas e páginas de detalhe individuais de cada role/policy/permission das 7 clouds, mais o catálogo de regras do SoD Analyzer). Funciona no **Vercel** (recomendado), Netlify ou qualquer host com Node.js. Para Vercel: push para GitHub → importe em vercel.com → deploy automático.

## Créditos / fontes

- [azure.permissions.cloud](https://azure.permissions.cloud) (Ian McKay) — inspiração de UX
- [AzAdvertizer](https://www.azadvertizer.net) (Julian Hayward) — referência de roles e API permissions
- [AzurePrivilegedIAM / EntraOps](https://github.com/Cloud-Architekt/AzurePrivilegedIAM) (Thomas Naunheim) — classificação EAM
- [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference) — dados oficiais do Entra ID e Azure RBAC
- Documentação oficial da AWS, Google Cloud, Google Workspace, IBM Cloud e Oracle Cloud Infrastructure — dados dos demais datasets
