# Auditoria — API permissions do Entra ID (Microsoft Graph)

**Data:** 2026-08-04
**Escopo:** medir a diferença entre os 854 registros de `src/data/apiPermissions.ts` e os ~2.681 anunciados pelo AzAdvertizer, para decidir se é lacuna real ou critério de contagem diferente.

## Veredito

São as duas coisas, em proporções diferentes:

- **A comparação direta com os ~2.681 é inválida.** O AzAdvertizer cobre várias resource APIs (a página tem filtro `?targetAppId=`, ex.: `00000003-0000-0000-c000-000000000000` para o Microsoft Graph). Nosso dataset é 100% Microsoft Graph — `resource` é `'Microsoft Graph'` nos 854 registros. Comparar o total dele com o nosso é somar maçãs com laranjas.
- **Contra o denominador correto, existe lacuna real e ela é grande.** O universo do Microsoft Graph hoje é **1.504** permissions (707 app roles + 797 delegated scopes). Temos 854 → **cobertura de 56,8%**, faltando **650**.

## Números

| | Fonte oficial | Nosso dataset | Cobertura | Faltando |
|---|---|---|---|---|
| Application (app roles) | 707 | 692 | **97,9%** | 15 |
| Delegated (scopes) | 797 | 162 | **20,3%** | 635 |
| **Total** | **1.504** | **854** | **56,8%** | **650** |

Nomes únicos no Graph: 939 (a maioria existe nos dois tipos).

## Saúde do que já temos

Sinais bons, o dataset atual não tem sujeira:

- **0 órfãos** — nenhuma das 854 entradas deixou de existir na fonte. Não há permission renomeada ou removida arrastada do snapshot do EntraOps.
- **0 IDs divergentes** — os 854 GUIDs batem exatamente com os do service principal do Graph.
- **0 duplicatas** de nome ou de ID.

O problema é só de cobertura, não de qualidade. Um `git diff` de atualização vai ser puramente aditivo.

## Anatomia do gap

### 15 Application permissions (drift desde o snapshot do EntraOps)

`Calendars.Read.All`, `Calendars.ReadWrite.All`, `Calls.ReportSyntheticMedia.All`, `CaseManagement.Read.All`, `CaseManagement.ReadWrite.All`, `Group.ManageProtection.All`, `MailboxItem.ReadWrite.All`, `Policy.Read.CrossTenantAccess`, `Policy.Read.Recovery`, `RemoteTenantGroups.Read.All`, `SecurityAlert.Create.All`, `TeamworkCustomEmoji.Create.All`, `TeamworkCustomEmoji.Read.All`, `UserAuthMethod-ResourceKey.Read.All`, `UserAuthMethod-ResourceKey.ReadWrite.All`

Baixo esforço, alto valor: `Policy.Read.CrossTenantAccess`, `Policy.Read.Recovery` e as duas de `UserAuthMethod-ResourceKey` são material de ControlPlane.

### 635 Delegated permissions, em três baldes

| Balde | Qtd | O que exige |
|---|---|---|
| Já temos a Application de mesmo nome | **434** | Herança de `category`/`eamTier` — automatizável, mesma regra usada nos 162 atuais |
| A Application par também está faltando | 9 | Entra junto com os 15 acima |
| Não existe Application equivalente | **192** | Classificação nova de verdade — é aqui que mora o trabalho |

Os 192 sem par são majoritariamente escopos que só fazem sentido delegados: `Directory.AccessAsUser.All`, `EWS.AccessAsUser.All`, `EAS.AccessAsUser.All`, `Device.Command`, `Device.Read`, família `Edu*` inteira, família `UserAuthMethod-*` de auto-serviço.

Split de consentimento dos 635 faltantes: **521 Admin**, **114 User**. O sinal `Type` da fonte oficial dá o mesmo atalho de tiering que a auditoria de 30/06 usou (`User` → `UserAccess`).

Prefixos mais atingidos: `Policy` (29), `TeamsAppInstallation` (24), `User` (13), `RoleManagement` (9), `TeamsTab` (9), `PrintJob` (9), `Files` (8), `Mail` (8). `Policy` e `RoleManagement` faltando em delegated é a lacuna mais séria — são as famílias de ControlPlane que o site usa como vitrine.

## Fonte usada

`merill/microsoft-info`, arquivos `_info/GraphAppRoles.json` e `_info/GraphDelegateRoles.json` — dump diário automatizado do service principal do Microsoft Graph (`appId 00000003-0000-0000-c000-000000000000`), com `Id`, `Value`, `Type` (consentimento) e descrições de admin/user.

Vantagem sobre parsear `permissions-reference.md` (método da coleta de 30/06): traz o GUID e o tipo de consentimento estruturados, sem heurística de markdown.

## Recomendação

1. Corrigir o texto do site — se algum lugar compara com os ~2.681 do AzAdvertizer, a comparação está errada por construção. O número honesto para "cobertura do Microsoft Graph" é 854/1.504.
2. Escrever `scripts/fetch-graph-permissions.js` no padrão dos outros `fetch-*-official.js`, consumindo os dois JSON do `microsoft-info`. Isso substitui o `convert-api-permissions.py` (one-shot, dependente de um arquivo do EntraOps) por coleta reproduzível.
3. Aplicar tiering em ondas: 15 Application + 434 delegated com par herdado resolve 449 dos 650 (69%) com regra automática. Os 192 sem par pedem revisão manual.
4. Rodar `scripts/build-counts.js` e `scripts/check-stale-numbers.js` depois — `ENTRA_API_PERMISSIONS_COUNT` sai de 854 para 1.504.

O detalhamento item a item (nome, GUID, consentimento, balde) está em `scripts/graph-permissions-gap.json`.
