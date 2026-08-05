# IAM Scope vs. referências de mercado

Comparação com AzAdvertizer e a família permissions.cloud (AWS, Azure, GCP).

- **Data:** 29/07/2026
- **Método:** navegação direta nos quatro sites, leitura dos contadores exibidos por eles; contagens do IAM Scope extraídas dos arquivos em `src/data/` e `public/`.
- **Escopo:** ferramentas, volume de conteúdo e integridade dos dados.

Todo número abaixo foi lido na fonte, não estimado. Onde não consegui medir, está escrito que não consegui.

---

## 1. Resumo executivo

O IAM Scope **ganha em amplitude** (6 clouds num só lugar, e ferramentas de análise que nenhum dos dois concorrentes tem) e **perde em profundidade por permissão** e em **rastreio de mudanças**.

Três achados que exigem ação antes do lançamento:

1. ~~**Azure RBAC está com 504 roles; o correto são 937.**~~ **CORRIGIDO EM 30/07 — a conclusão estava errada.** Ver a seção 3.1: 504 é o número oficial da Microsoft. O AzAdvertizer mantém roles históricas que a Microsoft não documenta mais.
2. **GCP está correto.** Nossas 2.381 roles batem exatamente com as 2.381 do gcp.permissions.cloud (2.378 ativas + 3 deprecated). A migração para as docs oficiais funcionou.
3. **Nenhum concorrente tem SoD, comparação multi-cloud ou busca reversa cross-cloud.** É aí que o site se diferencia — e é o que deveria estar em destaque no lançamento.

---

## 2. Quem é cada um

| | Cobertura | Modelo | Sincronização |
|---|---|---|---|
| **IAM Scope** | Entra ID, Azure RBAC, AWS, GCP, Google Workspace, IBM Cloud | Site estático, dados versionados no repo | Manual, via scripts |
| **AzAdvertizer** | Azure + Entra ID (e Azure Policy, Aliases, Resource Types, REST) | Projeto pessoal de um funcionário da Microsoft | **Diária** — visto "last sync: 2026-Jul-29 17:45 UTC" |
| **permissions.cloud** | Três sites separados: AWS, Azure, GCP | Open source, comunidade, alimentado pelo IAM Dataset | Contínua, via repositório |

Diferença estrutural que importa: o permissions.cloud são **três sites que não se falam** — não há como comparar uma role da AWS com uma do GCP. O AzAdvertizer só cobre o mundo Microsoft. O IAM Scope é o único que atravessa clouds.

---

## 3. Conteúdo e quantidade

### 3.1 Azure RBAC

| Item | IAM Scope | AzAdvertizer | azure.permissions.cloud |
|---|---|---|---|
| Built-in roles | **504** | **937** | **919** ativas, 0 deprecated |
| Actions / operations | 2.697 | **22.474 únicas** (24.628 total) | por serviço (321 páginas) |

Duas lacunas distintas aqui, e vale não confundi-las:

- **Roles (504 vs 937): não é bug nosso — revisto em 30/07.** Contei as roles na fonte oficial (`MicrosoftDocs/azure-docs`, 19 arquivos `built-in-roles/*.md`): **exatamente 504**, confirmado por dois métodos independentes (504 blocos `"roleName"` e 504 GUIDs únicos no índice). O `fetch-azure-roles-official.js` está fiel à Microsoft.

  As 937 do AzAdvertizer incluem roles que a Microsoft **não documenta mais** — o próprio site marca várias com *"No official Microsoft reference seems to exist, yet"* (ex.: `Access Review Operator Service Role`). É acervo histórico, e é um recorte legítimo: eles rastreiam mudanças desde 2019, então preservam o que saiu. Nós publicamos o estado atual.

  A diferença de 919 do azure.permissions.cloud para os nossos 504 provavelmente tem a mesma origem: eles vêm do IAM Dataset, que enxerga roles pela API do Azure, e a API expõe roles que a documentação não descreve.

  **Decisão:** manter 504 e o critério "só o que a Microsoft documenta". Vale exibir no site de onde vem o número, para quem comparar com o AzAdvertizer entender a diferença em vez de achar que falta dado.
- **Actions (2.697 vs 22.474):** decisão de escopo. Nós listamos apenas as actions **referenciadas por alguma built-in role**; o AzAdvertizer lista **todo o catálogo de resource provider operations** que o Azure expõe. São coisas diferentes — mas para quem monta uma custom role, o catálogo completo é o que interessa.

### 3.2 Entra ID

| Item | IAM Scope | AzAdvertizer |
|---|---|---|
| Built-in roles | 144 | **145** |
| Role actions | 670 únicas | **893 actions / 939 operations** |
| API permissions | 855 (692 Application / 162 Delegated) | **182 apps, 1.123 Application, 1.558 Delegated** |

Roles praticamente empatadas. Nas **API permissions estamos bem atrás**: 855 contra 2.681. Eles ainda quebram por aplicação (182 apps), nós não.

### 3.3 AWS

| Item | IAM Scope | aws.permissions.cloud |
|---|---|---|
| Managed policies | 1.553 | **1.539 ativas + 74 deprecated = 1.613** |
| Actions únicas | 8.182 | por serviço (452 páginas) |

Volume comparável. A diferença é que eles **separam deprecated de ativas** e nós não — nossas 1.553 provavelmente misturam as duas.

### 3.4 GCP

| Item | IAM Scope | gcp.permissions.cloud |
|---|---|---|
| Predefined roles | **2.381** | **2.381** (2.378 ativas + 3 deprecated) |
| Permissões únicas | 13.590 | por serviço |
| Serviços | 314 | ~350 páginas |

**Bate exatamente.** Único ponto: eles marcam as 3 deprecated, nós não.

### 3.5 O que só nós temos

Google Workspace (44 roles) e IBM Cloud (157 roles) não existem em nenhum dos concorrentes.

---

## 4. Ferramentas

### 4.1 O que eles têm e nós não

| Recurso | Onde | Por que importa |
|---|---|---|
| **Rastreio de mudanças** | AzAdvertizer | Histórico diário desde 2019, com create/update/delete por dia e página de "Changes" por tipo. É a razão de existir do site deles. |
| **Assinatura de mudanças** | AzAdvertizer | "Subscribe for changes" — o usuário é avisado quando algo muda. |
| **Mapeamento permissão ↔ método de API** | permissions.cloud (3) | Mostra quais chamadas de API consomem cada permissão. Ex.: `s3:GetObject` ← `AppTest.StartTestRun`, `CodeGuruReviewer...`. Resposta direta para "que permissão eu preciso para essa chamada?". |
| **Access level por permissão** | permissions.cloud (3) | Read / Write / List / Permissions management / Tagging. Nós classificamos a *role*, não a *permissão*. |
| **Condition keys** | aws.permissions.cloud | `s3:authType`, `s3:TlsVersion`, `s3:ResourceAccount`… essenciais para policy fina. |
| **Resource ARN template** | aws.permissions.cloud | `arn:${Partition}:s3::${Account}:accesspoint/${AccessPointAlias}`, com marcação de `required`. |
| **Tags de risco por action** | permissions.cloud (3) | `credentials exposure`, `resource exposure`, `data access`, `possible privesc`. Análise comportamental, não só catalogação. |
| **Tags de qualidade** | permissions.cloud (3) | `undocumented`, `unknown`, `malformed`, `deprecated`, `grantless`, `external actions`, `beta`. Eles marcam o que a documentação oficial **não** cobre. |
| **Download em massa** | ambos | AzAdvertizer: CSV. permissions.cloud: "Download JSON". Nós exportamos por página. |
| **Policy Evaluator** | azure.permissions.cloud | Equivalente ao nosso Role Evaluator — aqui estamos empatados. |
| **Azure Policy / Initiatives / Aliases** | AzAdvertizer | 6.640 policies, 12.842 initiatives, 68.435 aliases. Fora do nosso escopo, e tudo bem. |

O item mais incômodo dessa lista é o **`undocumented`**. Eles conseguem marcar permissões que existem mas não estão na documentação oficial. Nossa regra de "só dado oficial" nos deixa cegos para exatamente essa categoria — que é justo onde mora risco de segurança.

### 4.2 O que nós temos e eles não

| Ferramenta | Nota |
|---|---|
| **SoD Analyzer** — 291 regras | Nenhum dos quatro sites tem nada parecido. Diferencial mais forte. |
| **Multi-Cloud Compare** — 25 funções equivalentes | Nenhum concorrente atravessa clouds. |
| **Permission Scope** — busca reversa cross-cloud | Uma permissão → todas as roles que a concedem, em 6 clouds. |
| **Role Advisor** | Busca em linguagem natural → role recomendada. |
| **Tier 0 / modelo EAM** | Classificação de risco por role. Eles têm tags por *action*; nós temos tier por *role*. São complementares, não concorrentes. |
| **6 clouds num só lugar** | AzAdvertizer: 2. permissions.cloud: 3 sites isolados. |
| **Português** | Nenhum concorrente. |

---

## 5. Integridade dos dados

| Aspecto | Situação |
|---|---|
| Azure RBAC roles | **Quebrado.** 504 contra 937 oficiais. |
| GCP roles | **Correto.** Confere com fonte independente. |
| Entra roles | Correto (144 vs 145 — vale conferir qual falta). |
| AWS policies | Provavelmente correto, mas sem separar deprecated. |
| Marcação de deprecated | **Ausente** em todas as clouds. Os dois concorrentes marcam. |
| Rastreio de mudança | **Ausente.** Não há como saber o que mudou entre duas coletas. |
| Origem do dado | **Forte.** Todos os scripts documentam a fonte oficial no cabeçalho; tier/categoria estão marcados como classificação editorial. Isso é melhor do que o permissions.cloud, que mistura dado oficial e derivado da comunidade sem distinção visível. |
| Google Workspace / IBM | **Fraco.** 44 e 157 itens com permissões parciais, sem script de coleta oficial. Sem fonte externa para conferir. |

---

## 6. Recomendações priorizadas (15 dias)

### Bloqueia o lançamento

1. ~~Corrigir o Azure RBAC para 937 roles.~~ **Resolvido em 30/07: não havia o que corrigir.** 504 é o número oficial. Fica no lugar uma tarefa menor: **explicar a proveniência no site** (algo como "504 roles documentadas pela Microsoft"), para que a comparação com o AzAdvertizer não pareça dado faltando.
2. ~~Marcar deprecated em AWS e GCP.~~ **Feito em 30/07.** Detector em `scripts/lib/deprecation.js`, badge em `DeprecatedBadge.tsx`, aviso nas páginas de detalhe. Resultado: AWS 7, GCP 1.

   Cuidado que isso exigiu: um `/deprecat/i` solto produz falso positivo. No GCP, `roles/recommender.cloudDeprecationRecommendationAdmin` e a variante Viewer são roles **ativas** cujo assunto é depreciação. Na AWS, a seção "Learn more" linka guias de depreciação em páginas de policies ativas. O detector olha só a descrição e exige redação de depreciação de fato.

   Limite conhecido: a doc do Google **não publica** flag de depreciação — o launch stage só assume GA ou Beta, e `roles/aiplatform.featurestoreUser` aparece como "Beta" mesmo com "Deprecated." na descrição. Quem tem `stage: DEPRECATED` é a IAM API. Por isso nosso 1 é piso e o gcp.permissions.cloud reporta 3.

### Alto valor, cabe no prazo

3. **Download em massa por cloud** (JSON/CSV do dataset inteiro). Já temos os JSONs em `public/` — falta expor o link. Custo baixo, valor alto.
4. **Reconciliação automática** — um script por cloud que compara nosso dataset com a fonte oficial e falha se divergir. Teria pego o 504 sozinho.
5. **Destacar SoD, Compare e Permission Scope na home.** São o diferencial e hoje estão como BETA na sidebar, abaixo de páginas de catálogo que os concorrentes fazem melhor.

### Depois do lançamento

6. **Access level por permissão** (Read/Write/List/Permissions management). É a lacuna de profundidade mais visível, e dá para derivar do verbo em GCP/Azure.
7. **Catálogo completo de resource provider operations do Azure** (22.474), não só o que as built-in roles usam.
8. **Entra API permissions** — de 855 para as ~2.681 que o AzAdvertizer lista.
9. **Rastreio de mudanças.** Guardar um snapshot por coleta e gerar o diff. É o que sustenta o AzAdvertizer há 7 anos e é o caminho natural da V2 que já foi desenhada no ROADMAP.
10. **Mapeamento permissão ↔ método de API.** O mais caro da lista; avaliar se vale.

---

## 7. Posicionamento

Não dá para vencer o AzAdvertizer em Azure nem o permissions.cloud em profundidade de permissão — os dois são especialistas com anos de vantagem e sincronização automática.

O espaço que está vago é **governança de identidade multi-cloud**: SoD, equivalência de roles entre clouds, busca reversa cross-cloud, classificação de risco por tier. Nenhum dos quatro sites disputa esse terreno.

A implicação prática é que o catálogo precisa estar **correto**, não necessariamente mais completo que o dos especialistas. Corrigir as 937 roles do Azure vale mais do que adicionar 20 mil operations que ninguém vai comparar entre clouds.
