# Dados oficiais para GCP e AWS, marcação de deprecated e script SoD para tenant

Substitui dado gerado por dado oficial em duas clouds, tira ~9 MB do bundle do
cliente e adiciona um script PowerShell que roda a análise de SoD no tenant do
próprio usuário.

---

## Por que

Auditoria de proveniência encontrou três problemas de integridade:

| Problema | Antes | Agora |
|---|---|---|
| Descrições da AWS | **100% inventadas** — as 1.553 seguiam o template `"<Nome> — AWS managed policy."` | 1.553 descrições literais da referência oficial |
| Documento JSON da AWS | **Sintetizado** na UI: `Version` fixa, 1 statement, `Resource: "*"` sempre | Documento real da AWS, com Condition, NotAction e múltiplos statements |
| Permissões do GCP | 232 roles, apenas 15 com permissões | 2.381 roles, 13.590 permissões |

O campo `privileges` da AWS também saiu: era um prefixo do array `actions`
(399 de 400 amostrados), não texto de capacidades.

E a categoria da AWS era escolhida pelo serviço da **primeira** action em ordem
alfabética — `AccessAnalyzerServiceRolePolicy` caía em `Database` porque
`dynamodb:` vinha antes de tudo.

---

## Mudanças

### Dados

- **GCP**: 232 → **2.381 roles**, 13.590 permissões, 314 serviços. Confere
  exatamente com o gcp.permissions.cloud (2.378 ativas + 3 deprecated).
- **AWS**: 1.553 policies com descrição oficial, tipo, datas de criação/edição,
  versão e documento JSON. 16.117 actions (antes 8.182).
- **Azure RBAC**: mantido em 504. Ver "Decisões" abaixo.
- **Basic roles do GCP**: o Google reclassificou Owner/Editor/Viewer como
  *legacy basic roles* e criou Admin/Writer/Reader. As 6 entraram com
  `kind: 'basic' | 'legacy-basic'`.

### Arquitetura — permissões fora do bundle

`gcp.ts` iria para ~5 MB e `aws.ts` estava em 1,7 MB, tudo indo para o JS do
cliente. Agora seguem o desenho que a Azure já usava: metadados no `.ts`,
permissões em `public/`, buscadas sob demanda.

```
public/gcp-perms/<slug>.json        2.381 arquivos
public/gcp-perms-index.json         índice invertido permissão -> roles
public/aws-policy-docs/<slug>.json  1.553 arquivos (documento oficial + actions)
public/aws-actions-index.json       índice invertido action -> policies
```

`getGcpPermissions()` e `getAwsActions()` viraram assíncronos.
`GCP_PERMISSION_COUNT`, `GCP_SERVICE_COUNT`, `AWS_ACTION_COUNT` e
`AWS_SERVICE_COUNT` são constantes geradas, para a sidebar e a home mostrarem
números sem baixar índice.

### Deprecated

Detector em `scripts/lib/deprecation.js`, compartilhado por AWS e GCP, mais o
componente `DeprecatedBadge`. Resultado: **AWS 6**, GCP 1 (após regerar — ver
pendências).

Um `/deprecat/i` solto produziria falso positivo: no GCP,
`roles/recommender.cloudDeprecationRecommendationAdmin` é uma role **ativa**
cujo assunto é depreciação; na AWS, a seção "Learn more" linka guias de
depreciação em páginas de policies ativas. O detector olha só a descrição.

### SoD Analyzer — script para o tenant

`public/tools/Invoke-IAMScopeSoDAnalysis.ps1` (somente leitura) aplica as 96
regras às atribuições reais e gera Excel, dashboard HTML autocontido e CSV.

Considera atribuições ativas, elegíveis via PIM e herdadas de grupos aninhados,
no Entra ID e no Azure RBAC.

As regras **não** estão dentro do `.ps1` — seriam uma segunda cópia que sairia
de sincronia. `scripts/build-sod-rules-json.js` gera `public/sod-rules.json` a
partir do TypeScript e resolve slug → `roleTemplateId` / `roleDefinitionId`.

### Correções de UI

- `/gcp/permissions` estava inutilizável: 314 chips de serviço e milhares de
  chips de verbo empurravam a tabela para fora da tela. Viraram `<select>`.
- `AZURE_ACTIONS_COUNT` na sidebar estava hardcoded em 5128 com o índice em 2697.
- Bloco "Capabilities" da AWS (que exibia o `privileges` falso) → detalhes
  oficiais: tipo, criação, última edição, versão.

### Novos scripts

| Script | O que faz |
|---|---|
| `fetch-gcp-roles-from-docs.js` | Coleta o GCP das docs públicas, **sem credencial** |
| `fetch-aws-policies-official.js` | Coleta a AWS da referência oficial |
| `build-sod-rules-json.js` | Gera o catálogo SoD com GUIDs resolvidos |
| `lib/gcp-classify.js`, `lib/aws-classify.js`, `lib/deprecation.js` | Classificação e detecção compartilhadas |
| `test-gcp-docs-parser.js`, `test-aws-parser.js` | Testes offline dos parsers |

---

## Decisões que valem revisão

**Azure RBAC fica em 504, não 937.** O AzAdvertizer mostra 937, mas contei na
fonte oficial (`MicrosoftDocs/azure-docs`, 19 arquivos `built-in-roles/*.md`):
são exatamente 504, confirmado por dois métodos (504 blocos `"roleName"`, 504
GUIDs únicos no índice). As 937 incluem roles que a Microsoft não documenta mais
— o próprio AzAdvertizer marca várias com *"No official Microsoft reference
seems to exist, yet"*. É acervo histórico deles; nós publicamos o estado atual.

**GCP: as docs não publicam flag de depreciação.** O launch stage só assume GA
ou Beta — `roles/aiplatform.featurestoreUser` aparece como "Beta" mesmo com
"Deprecated." na descrição. Quem tem `stage: DEPRECATED` é a IAM API. Por isso
detectamos 1 e o gcp.permissions.cloud reporta 3.

**Basic roles do GCP saem com `permissionCount: 0`.** O Google não publica a
lista delas em lugar nenhum da doc — manda usar `gcloud iam roles describe`.
Preencher com estimativa seria pior; há um `permissionsNote` explicando.

**`hl=en` fixado nas docs do Google.** A doc responde no idioma do leitor; sem
fixar, o dataset mudaria de língua conforme quem rodou o script.

---

## Validação

- `node scripts/typecheck.cjs` → **147 arquivos, 0 erros**
- `node scripts/test-aws-parser.js` → 26 testes
- `node scripts/test-gcp-docs-parser.js` → 22 testes
- Dashboard HTML testado com DOM stub: filtro, toggle, busca, ordenação, estado
  vazio e escaping de XSS (`<img onerror>` e `</td><script>` injetados)
- `permissionCount` conferido contra os 2.381 JSONs do GCP: zero divergência

**Não validado:** a execução do `.ps1` contra um tenant real — não havia
PowerShell disponível no ambiente. Sintaxe verificada estaticamente (chaves
balanceadas, terminador de here-string na coluna 0, sem aspas tipográficas).
Cmdlets do Graph/Az e comportamento sem licença P2 só a primeira execução real
confirma.

---

## Pendências antes do merge

1. **Regerar o GCP** para o deprecated entrar (os dados atuais são anteriores ao
   detector):
   ```
   node scripts/fetch-gcp-roles-from-docs.js --write-ts
   node scripts/typecheck.cjs
   ```
2. **`npm run build`** — são 2.381 páginas de detalhe do GCP contra 232 antes; o
   tempo do export estático não foi medido.
3. Decidir se `public/gcp-roles-official.json` (5,6 MB, dump bruto da coleta)
   entra no repositório. O site não depende dele.
