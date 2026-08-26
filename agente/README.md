# iamscope-agente

Um agente de linha de comando que responde perguntas de IAM em linguagem natural, usando o
servidor MCP [`iamscope-mcp`](https://www.npmjs.com/package/iamscope-mcp) como sua única fonte.

```
$ node agente.mjs "qual a role equivalente ao Owner do Azure no GCP?"

  subindo iamscope-mcp (npx)...
  7 ferramentas · modelo claude-sonnet-5
  · compare_equivalent_roles {"query":"Owner","clouds":["gcp"]}

O equivalente catalogado é `roles/resourcemanager.organizationAdmin`.

Vale a ressalva: a equivalência é aproximada por desenho. O Owner do Azure e o
Organization Admin do GCP não têm o mesmo escopo — o do GCP é por organização,
enquanto o Owner do GCP (`roles/owner`) é por projeto.

  1 chamada(s) · 2 volta(s) · 4.3s · 1 identificador(es) conferido(s)
```

## O que ele faz que o MCP sozinho não faz

O desenho aprovado do agente diz: *toda role citada tem que vir de retorno de ferramenta, com
verificação depois; nome ausente do catálogo é derrubado, não devolvido.*

**Um servidor MCP não consegue cumprir a segunda metade.** Ele devolve JSON e some — nunca vê a
prosa do modelo, então não pode remover um nome de dentro de uma frase já escrita. O que ele faz é
não produzir nome falso, oferecer `verify_role_names`, e declarar a regra nas instruções.

O agente vê a resposta final. É aqui que a regra fecha:

1. Toda chamada de ferramenta tem seu retorno varrido, e **todo nome, slug e identificador nativo
   que ele afirma** entra num conjunto de nomes confirmados.
2. No fim, os identificadores que o modelo escreveu são extraídos da resposta.
3. O que já está no conjunto passa direto. O que não está vai para `verify_role_names`.
4. `NOT_IN_CATALOG` vira um aviso em cima da resposta, com os nomes parecidos do catálogo como
   pista.

```
  ATENCAO: a resposta acima cita nome que NAO existe no catalogo.

    roles/bigquery.readOnly
      parecidos no catalogo: roles/bigquery.dataViewer, roles/bigquery.metadataViewer

  Nome plausivel e inexistente e o defeito que este agente existe para pegar.
```

Isso separa duas coisas que se confundem: **"não veio de ferramenta"** e **"não existe"**. Um nome
verdadeiro que o modelo citou de memória passa na verificação — não é ideal, mas não é mentira. Um
nome inventado não passa.

### O que a checagem alcança, e o que não

Ela extrai **identificador**: `roles/x.y`, ARN, e o que o modelo põe em crase. É de propósito —
essa é a forma que vai para um `terraform apply`, e é onde a invenção custa caro.

Nome de exibição solto no meio de uma frase ("use a Password Administrator") ela **não** tenta
extrair. Adivinhar onde um nome próprio começa e termina em texto livre daria falso positivo em
toda frase, e um alarme que dispara sempre é um alarme desligado. Esse caso é coberto pela outra
metade: nomes de exibição vêm dos retornos de ferramenta, e todos eles ficam registrados.

## Uso

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...        # PowerShell: $env:ANTHROPIC_API_KEY = "sk-ant-..."

node agente.mjs "que role deixa resetar senha sem dar Global Admin?"
node agente.mjs                            # modo conversa
```

| Opção | Para quê |
|---|---|
| `--modelo <id>` | outro modelo (ou `IAMSCOPE_MODELO` no ambiente) |
| `--servidor <caminho>` | usa um `dist/server.mjs` local em vez do pacote do npm |
| `--estrito` | sai com código 1 se a resposta citar nome inexistente |
| `--verboso` | mostra o stderr do servidor MCP |

Códigos de saída: **2** = não deu para começar (falta chave, servidor não subiu). **1** = o
comando não fez o trabalho (modelo recusou, laço estourou), ou `--estrito` pegou um nome inventado.
**0** = respondeu.

O `--estrito` existe para uso em script: `node agente.mjs --estrito "..." > resposta.txt` só grava
o que passou na verificação.

## Como funciona

Três arquivos, e a divisão importa:

| Arquivo | Responsabilidade |
|---|---|
| `lib/mcp.mjs` | sobe o servidor e traduz `inputSchema` → `input_schema`. Não conhece IAM |
| `lib/loop.mjs` | o laço de ferramentas. O modelo entra por injeção |
| `lib/guardrail.mjs` | extração de identificador e a verificação depois |

**O agente não conhece IAM.** Ele pergunta ao servidor quais ferramentas existem e repassa. Se o
pacote ganhar uma oitava ferramenta amanhã, nada aqui muda.

**A regra do guardrail vem do servidor.** O `iamscope-mcp` publica um texto de instruções no
handshake, e é ele que vai no `system`, não uma cópia reescrita aqui. Quando o pacote endurecer a
regra, este agente herda sem release.

**O modelo entra por injeção** (`modelo.criar`). Não é purismo: é o que permite testar o laço
inteiro sem chave e sem rede.

## Testes

```bash
npm test
```

26 casos. O **servidor MCP é real** — sobe o pacote e responde do catálogo de verdade. O que é
falso é o modelo, roteirizado para devolver blocos escolhidos.

O caso que vale por todos:

```
── o guardrail: modelo inventa um nome na resposta final ──
  ✓ a resposta NAO passa limpa
  ✓   → e o nome inventado é nomeado
  ✓   → com parecidos do catálogo como pista
```

**O que os testes NÃO cobrem:** se um modelo de verdade escolhe a ferramenta certa para cada
pergunta. Isso só se sabe com a chave, rodando de verdade. Tudo em volta — tradução de
ferramentas, `tool_use_id`, acúmulo de nomes citados, erro de ferramenta chegando ao modelo,
teto de voltas, e o guardrail — é testado sem gastar um token.

## Limites

- **Uma pergunta por vez.** O modo conversa mantém histórico dentro de uma pergunta (o laço de
  ferramentas), mas não entre perguntas. Cada `>` começa do zero.
- **Sem cache.** Toda pergunta paga as chamadas de novo.
- **O JSON que você colar em `evaluate_role_json` vai para o modelo.** O servidor MCP processa
  localmente, mas o agente manda a resposta para a API. Se o JSON tiver identificador de tenant,
  ele sai da máquina — o que não acontece quando você usa o MCP direto num cliente que roda local.
