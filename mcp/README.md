# iamscope-mcp

Um servidor MCP com o catálogo do [IAM Scope](https://iamscope.cloud): **4.640 roles** e
**30.865 permissões** de seis nuvens, **190 regras de segregação de funções** e
**29 equivalências entre plataformas** — respondendo na sua máquina.

| Plataforma | Roles |
|---|--:|
| Entra ID | 144 |
| Azure RBAC | 504 |
| AWS IAM (managed policies) | 1.582 |
| GCP IAM | 2.389 |
| Google Workspace | 14 |
| IBM Cloud | 7 |

O catálogo vem embutido no pacote. O servidor não abre conexão de rede — o dado que você
manda para ele não sai da sua máquina, porque não há para onde sair.

---

## A pergunta que motiva isto

> "Qual a role equivalente ao Owner no GCP?"

Um modelo sem ferramenta responde `roles/owner`, ou inventa. A resposta catalogada é
`roles/resourcemanager.organizationAdmin` — e vem com a ressalva de que o Owner do GCP é por
projeto enquanto o Organization Admin é por organização, então a equivalência é aproximada por
desenho. Uma nuvem só não responde isso. Seis, sim.

---

## Instalação

Nada para instalar antes. `npx` baixa e roda.

### VS Code — GitHub Copilot

`.vscode/mcp.json` no seu projeto:

```json
{
  "servers": {
    "iamscope": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "iamscope-mcp"]
    }
  }
}
```

Para deixar disponível em todos os workspaces, abra a paleta de comandos e rode
**MCP: Open User Configuration**, colando o mesmo bloco no `mcp.json` do seu perfil.

### Cursor

`.cursor/mcp.json` no projeto (ou `~/.cursor/mcp.json` para valer em todos):

```json
{
  "mcpServers": {
    "iamscope": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "iamscope-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add iamscope -- npx -y iamscope-mcp
```

### Claude Desktop

No `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iamscope": {
      "command": "npx",
      "args": ["-y", "iamscope-mcp"]
    }
  }
}
```

> **Windows:** se o `npx` não for encontrado, troque `"command": "npx"` por
> `"command": "npx.cmd"`. Requer Node 18.17 ou superior.

Para fixar a versão e não depender do registry a cada início:
`npm i -g iamscope-mcp` e depois `"command": "iamscope-mcp", "args": []`.

---

## As sete ferramentas

| Ferramenta | Responde |
|---|---|
| `search_roles` | "que role deixa resetar senha sem dar global admin?" — busca por termo nas seis plataformas |
| `search_permissions` | "quem concede `iam:CreateUser`?" — busca reversa, incluindo quem **nega** |
| `compare_equivalent_roles` | "qual o equivalente a Owner no GCP?" — 29 funções × 6 nuvens |
| `find_role_conflicts` | "esta role conflita com o quê?" — as 190 regras de SoD |
| `evaluate_user_roles` | "este conjunto de roles viola segregação de funções?" |
| `evaluate_role_json` | cole o JSON exportado de uma role e receba a classificação de risco |
| `verify_role_names` | "esta role existe mesmo?" — o guardrail contra nome inventado |

Mais dois recursos legíveis: `iamscope://license` e `iamscope://tiers`.

### `search_roles` não é busca semântica

Não há modelo, embedding nem nada gerado. É BM25F com IDF real sobre três campos — nome (peso
3,4), descrição (1,5) e o corpus de permissões (0,8) — com `b` calibrado por campo. Entende
exclusão (`"kubernetes sem billing"`) e escopo de plataforma (`"somente leitura no Azure"`).

Toda resposta traz um campo `plan` com os termos que a busca entendeu, o escopo que deduziu, o
que excluiu e **o que não casou com nada**. Busca que erra em silêncio não é corrigível por quem
lê; esta diz onde errou.

### O guardrail: `roles/bigquery.readOnly`

Esse nome não existe. É plausível — o GCP tem `roles/bigquery.dataViewer`,
`roles/bigquery.metadataViewer`, `roles/bigquery.jobUser`, e `readOnly` é sufixo real em outras
famílias — e é indistinguível de um nome verdadeiro para quem lê a resposta.

O pacote reage a isso em quatro lugares:

1. **Nenhuma ferramenta devolve um nome que não esteja no catálogo.** Toda role citada num
   retorno veio do dado.
2. **`verify_role_names` confere nome de exibição, slug e identificador nativo** — `roleId` do
   GCP, ARN da AWS, GUID do Entra e do Azure. Verificar só nome de exibição deixaria passar
   justamente a forma que vai para um `terraform apply`.
3. **Nome que não resolve vira erro, nunca lista vazia.** `find_role_conflicts` sobre uma role
   inventada devolve `ROLE_NOT_IN_CATALOG`, não `[]` — "nenhum conflito encontrado" sobre uma
   role que não existe é um atestado de saúde falso. Pelo mesmo motivo,
   `evaluate_user_roles` devolve `riskLevel: "INDETERMINATE"`, não `"approved"`, quando nada
   resolveu, e marca `verdictCoversOnlyResolvedRoles` quando resolveu só uma parte.
4. **A regra viaja no envelope de toda resposta** e nas instruções do servidor, que os clientes
   MCP entregam ao modelo antes da primeira chamada.

O que isto **não** é: um servidor MCP não vê a prosa do modelo, e não pode remover um nome de
dentro de uma frase já escrita. O que existe aqui é um catálogo que não produz nomes falsos, uma
porta barata para conferir, e a regra dita onde o modelo lê. É menos garantia do que um agente
que renderiza a própria saída teria — e vale dizer isso em vez de fingir o contrário.

### O que é curadoria, e sai marcado

`tier`, `nativeTier`, `eamLevel`, `category`, `isPrivileged`, `severity`, `riskLevel`, `risk`,
`mitigations`, `frameworks` e `richDescription` são **classificação editorial do IAM Scope**.
Nenhum provedor publica isso. Toda resposta carrega um envelope `_iamscope` que nomeia esses
campos, para o modelo não apresentá-los como posição oficial da Microsoft, AWS, Google ou IBM.

Nome, identificador, ação e descrição oficial, esses são fato do provedor.

---

## Onde o dado fica

Na sua máquina. O servidor fala por **stdio** com o cliente MCP, lê o catálogo de arquivos que
vieram no pacote, e não abre socket.

Isso não é configuração — é ausência de código de rede. O `npm run smoke` inclui um teste que
varre o bundle publicado atrás de qualquer `fetch` de URL absoluta e falha se achar um.

O JSON que você colar em `evaluate_role_json` e a lista de roles que passar para
`evaluate_user_roles` são processados no processo local e descartados. É a mesma promessa do
[`PRODUCT.md`](https://iamscope.cloud) do site, aqui garantida pelo desenho em vez da política.

---

## Licença e atribuição

Três camadas, com origens diferentes — misturá-las é o que torna licença de dataset inaplicável
na prática. O detalhamento está em [`DATA-LICENSE.md`](./DATA-LICENSE.md).

**1. Fato bruto dos provedores** — nomes, identificadores, ARNs, GUIDs, listas de ações e as
descrições oficiais. Não é nosso e não é relicenciado aqui; valem os termos de uso de Microsoft,
AWS, Google e IBM.

**2. A curadoria do IAM Scope** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Cobre tiers, `eamLevel`, categorização, `isPrivileged`, as 190 regras de SoD, as 29
equivalências, as descrições estendidas, e a seleção e estrutura do conjunto (o direito
*sui generis* de base de dados — que é por que a versão é 4.0 e não 3.0).

Crédito mínimo:

```
Classificação de risco e tiers: IAM Scope (https://iamscope.cloud), CC BY 4.0.
```

Em interface de software, o link precisa ficar acessível ao usuário final — não basta enterrar
num arquivo de dependências. A licença não exige pedir permissão, pagar, nem abrir seu código;
uso comercial é permitido.

**3. Terceiros, sob MIT.** A atribuição não é opcional, e este pacote redistribui o dado dos dois
em toda resposta que toca Entra ID:

| Origem | Licença | O que veio de lá |
|---|---|---|
| [AzurePrivilegedIAM / EntraOps](https://github.com/Cloud-Architekt/AzurePrivilegedIAM) — Thomas Naunheim | MIT | O `eamTier` das 144 directory roles do Entra ID |
| [merill/microsoft-info](https://github.com/merill/microsoft-info) — Merill Fernando | MIT | O inventário das API permissions do Microsoft Graph |

### Sem garantia

A classificação de risco é opinião editorial informada, não auditoria. Ela não substitui a
revisão do seu time de segurança, e uma decisão de concessão de acesso tomada só com base neste
catálogo é responsabilidade de quem a tomou.

---

## Limites conhecidos

- **Azure RBAC fica fora da busca reversa de permissão.** As permissões dele vivem em arquivos
  separados que não entram neste pacote. Ausência de resultado do Azure em `search_permissions`
  não significa que nenhuma role do Azure conceda a permissão.
- **IBM Cloud está fora das regras de SoD**, por decisão de produto: o IAM da IBM tem sete roles
  genéricas e o SoD real vive nas permissões da infraestrutura clássica, que não são roles. O
  modelo "regra = par de roles" não as representa sem distorcer o dado.
- **Nenhuma regra de SoD cruza provedores.** Acumular `AdministratorAccess` na AWS e Global
  Administrator no Entra ID é fato de governança, não conflito de segregação: não existe caminho
  técnico entre os dois. O que é modelado é o cruzamento *dentro* do provedor — Entra ID ↔ Azure
  RBAC no mesmo tenant, GCP ↔ Google Workspace na mesma Cloud Identity.
- **Equivalência é aproximação.** Os modelos de permissão das seis plataformas não são
  isomórficos.
- **Nome de role não é chave única.** O GCP publica pares distintos com o mesmo nome de exibição
  (`roles/cloudbuild.editor` e `roles/cloudbuild.builds.editor` são os dois "Cloud Build Editor").
  `verify_role_names` devolve todas as ocorrências, e o identificador nativo é o desempate.

---

## Desenvolvimento

```bash
npm install       # dentro de mcp/, separado das dependências do site
npm run build     # mede o catálogo, bundla, e materializa data/
npm run smoke     # sobe o servidor por stdio e conversa MCP com ele
npm run metrics   # downloads do npm
```

**Este pacote mora dentro do repositório do site e não se constrói fora dele.** O esbuild aponta
`@/lib` e `@/data` para `../src/`, e o `data/` que vai para o npm é copiado de `../public/` no
build — por isso `data/` está no `.gitignore`: ele é resultado, não fonte. Um `npm run build`
fora do repo para com a explicação em vez de um stack.

Isso é deliberado e substitui um arranjo anterior. Até 25/08 havia um espelho de `src/lib` e
`src/data` dentro do pacote, com um checador comparando os dois por sha256. A cópia fazia sentido
quando isto era uma pasta solta; dentro do repositório ela custava 3,3 MB em todo `git clone` e
criava um segundo lugar onde alguém podia corrigir um bug — com o checador avisando só depois.
**Sem cópia não há o que divergir**, e o que o site responde é o que o MCP responde, por
construção.

O `dist/` também não é versionado: quem clonar o repositório roda `npm install && npm run build`
dentro de `mcp/` antes de apontar um cliente MCP para `dist/server.mjs`.

As contagens deste README e das descrições das ferramentas são **geradas** por
`scripts/gen-stats.mjs` a partir do dado, e o `npm run smoke` falha se a descrição de
`search_roles` declarar um número diferente do que o catálogo devolve. Este projeto já deixou
"mais de 1.700 roles" e "926 roles built-in do Azure" no ar por meses; número escrito à mão não
sobrevive a uma coleta.

---

Feito por [IAM Scope](https://iamscope.cloud) · [Reportar um problema](https://github.com/natantbueno/iamscope/issues)
