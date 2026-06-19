# entra.permissions — Referência de Roles do Microsoft Entra ID

Site de referência para roles, permissões e API permissions do Microsoft Entra ID, com classificação por **Enterprise Access Model (EAM)**. Inspirado no [azure.permissions.cloud](https://azure.permissions.cloud), [AzAdvertizer](https://www.azadvertizer.net) e nas classificações do [EntraOps / AzurePrivilegedIAM](https://github.com/Cloud-Architekt/AzurePrivilegedIAM).

## Funcionalidades

- 📋 **144 roles built-in** completas do Entra ID (dataset oficial do EntraOps)
- 📄 **Página individual para cada role** (`/roles/[slug]`) com descrição completa da Microsoft Learn, todas as role actions e roles relacionadas
- 🔑 **692 API Permissions** do Microsoft Graph com classificação EAM
- 🏛️ Classificação por **tier do Enterprise Access Model**: Control Plane, Management Plane, Workload Plane, User Access
- 📥 **Exportação** em CSV, Excel (.xls) e JSON — lista de roles ou permissões expandidas
- 🌙 **Modo escuro** com toggle e persistência
- 🔍 Busca por nome, descrição, Template ID ou permissão
- 🏷️ Filtros por tier EAM, categoria e nível de privilégio — **refletidos na URL** (compartilháveis)
- 🔗 Dashboard com números clicáveis que levam às listas filtradas
- ⚠️ Identificação de roles privilegiadas (flag oficial `isPrivileged`)
- 📋 Lista completa de role actions por role, filtráveis por tier, com botão de copiar

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard com estatísticas clicáveis |
| `/roles` | Lista de todas as roles (aceita `?tier=`, `?category=`, `?filter=privileged`, `?q=`) |
| `/roles/[slug]` | Página de detalhe de uma role específica |
| `/api-permissions` | Lista de API permissions do Graph (aceita `?tier=`, `?q=`) |

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
│   │   ├── layout.tsx        # Layout raiz + ThemeProvider
│   │   ├── page.tsx          # Shell principal (3 views)
│   │   └── globals.css       # Estilos globais + Tailwind
│   ├── components/
│   │   ├── ThemeProvider.tsx     # Contexto de tema (dark/light)
│   │   ├── Sidebar.tsx           # Navegação + busca + toggle de tema
│   │   ├── Dashboard.tsx         # Dashboard com breakdown EAM
│   │   ├── RolesTable.tsx        # Tabela de roles
│   │   ├── ApiPermissionsTable.tsx  # Tabela de API permissions
│   │   ├── RoleDetailPanel.tsx   # Painel de detalhes
│   │   ├── CategoryBadge.tsx     # Badge de categoria
│   │   └── EamTierBadge.tsx      # Badge de tier EAM
│   └── data/
│       ├── roles.ts             # Dataset de roles + metadados EAM
│       └── apiPermissions.ts    # Dataset de API permissions
├── package.json
├── tailwind.config.js           # darkMode: 'class'
├── tsconfig.json
└── next.config.js
```

## Sobre o Enterprise Access Model (EAM)

O EAM classifica privilégios em planos de isolamento para prevenir escalada:

| Tier | Plano | Descrição |
|------|-------|-----------|
| **Tier 0** | Control Plane | Controle total do tenant. Comprometimento = takeover completo. |
| **Tier 1** | Management Plane | Gestão de TI enterprise-wide. Alto impacto, sem controle total. |
| — | Workload Plane | Gestão por workload (Exchange, SharePoint, Teams). |
| **Tier 2** | User Access | Acesso de usuário e leitura básica. |

A classificação neste projeto segue o modelo do [EntraOps](https://github.com/Cloud-Architekt/EntraOps) de Thomas Naunheim. Para um cenário de produção, recomenda-se sincronizar com os arquivos `Classification_AadResources.json` e `Classification_AppRoles.json` do repositório AzurePrivilegedIAM.

## Como adicionar/atualizar dados

Os datasets são **gerados automaticamente** a partir dos arquivos de classificação do EntraOps / AzurePrivilegedIAM, usando os scripts em `scripts/`.

### Regenerar as roles (144 roles)

```bash
python3 scripts/convert-roles.py \
  /caminho/AzurePrivilegedIAM/Classification/Classification_EntraIdDirectoryRoles.json \
  src/data/roles.ts
```

### Regenerar as API permissions (692 permissões)

```bash
python3 scripts/convert-api-permissions.py \
  /caminho/AzurePrivilegedIAM/Classification/Classification_MsGraphAppRoles.json \
  src/data/apiPermissions.ts
```

Para atualizar quando a Microsoft adicionar roles novas: baixe a versão mais recente do repositório [AzurePrivilegedIAM](https://github.com/Cloud-Architekt/AzurePrivilegedIAM), rode os scripts acima, e os arquivos `roles.ts` e `apiPermissions.ts` são reescritos com os dados frescos — incluindo a classificação EAM oficial de cada role action.

### Edição manual

Também é possível editar `src/data/roles.ts` e `src/data/apiPermissions.ts` diretamente, mas mudanças serão sobrescritas na próxima execução dos scripts.

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

Funciona no **Vercel** (recomendado), Netlify ou qualquer host com Node.js. Para Vercel: push para GitHub → importe em vercel.com → deploy automático.

## Créditos / fontes

- [azure.permissions.cloud](https://azure.permissions.cloud) (Ian McKay) — inspiração de UX
- [AzAdvertizer](https://www.azadvertizer.net) (Julian Hayward) — referência de roles e API permissions
- [AzurePrivilegedIAM / EntraOps](https://github.com/Cloud-Architekt/AzurePrivilegedIAM) (Thomas Naunheim) — classificação EAM
- [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference) — dados oficiais
