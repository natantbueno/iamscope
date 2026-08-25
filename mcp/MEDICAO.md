# Como o número vai ser lido

A instrumentação entra junto com o pacote, não depois. Este arquivo é o plano — o que medir,
com que frequência, e o que fazer com o resultado.

## Por que este canal e não o outro

Está registrado desde 22/08 e não mudou: **o CDN é cego para a API.**

| Fonte | Vê o tráfego de API? | Por quê |
|---|---|---|
| Vercel Web Analytics | Não | É script de navegador. `curl`, CI e MCP não executam JS. |
| Runtime Logs (Hobby) | Não | Duram 1 hora, e arquivo estático nem gera log. |
| Log Drains | Não existe | Fora do plano Hobby. |
| Edge Requests | Só o total | Sem quebra por rota. |
| **`api.npmjs.org`** | **Sim** | Público, sem token, sem chave. |
| `download_count` de Release | Sim, **se o repo for público** | Asset em repo privado exige autenticação para baixar. |

A inversão que vale guardar: **o canal que parecia extra é o único que mede.** O MCP não é um
acessório da API — é a parte dela que dá para saber se alguém usa.

**O repositório está privado desde o reset de 23/08.** Isso mata o canal de Release como
distribuição e como métrica ao mesmo tempo: um contador que só responde a quem tem credencial não
mede adoção pública. Por isso o npm é primário. O leitor do GitHub está escrito e testado em
`scripts/metrics.mjs`, atrás da flag `--github` — ligue no dia em que o repo virar público.

## O comando

```bash
npm run metrics                    # últimos 30 dias, legível
node scripts/metrics.mjs --days 90
node scripts/metrics.mjs --json    # uma linha JSON, para série histórica
node scripts/metrics.mjs --github  # liga o leitor de Release
```

Os campos vêm da doc oficial do npm (`npm/registry`, `docs/download-counts.md`):

- `GET /downloads/point/{início}:{fim}/{pacote}` → `{ downloads, start, end, package }`
- `GET /downloads/range/{início}:{fim}/{pacote}` → `{ downloads: [{ day, downloads }], start, end, package }`
- `GET /versions/{pacote}/last-week` → quebra por versão, só 7 dias. **O formato desta não está
  na doc oficial** — o script a lê defensivamente e a omite do relatório se vier diferente.

A janela do npm é de 18 meses. Perder um dia não perde o dado — mas gravar a série localmente
protege contra mudança de política.

## A cadência

Rode **semanal**, na segunda. Guarde a linha:

```powershell
node scripts\metrics.mjs --json >> metrics.jsonl
```

No Windows, via Agendador de Tarefas:

```
Programa:    node
Argumentos:  scripts\metrics.mjs --json
Iniciar em:  C:\Users\User\Documents\IAMSCOPE\REPO\mcp
```
com a saída redirecionada para `metrics.jsonl`.

**Isto tem de rodar na sua máquina, não na nuvem.** O container das sessões tem `api.npmjs.org`
fora da allowlist de saída (verificado: HTTP 403 no CONNECT), então uma tarefa agendada em nuvem
não consegue ler o número.

## O que o número diz, e o que ele não diz

O relatório imprime uma sparkline da série diária, e não só o total, de propósito: **um total
sozinho não distingue "trinta pessoas instalaram" de "uma CI rodou trinta vezes".** A forma da
série distingue — instalação humana é esparsa e irregular, CI é plana e diária.

O que o npm **não** dá: quem baixou, de onde, e se chegou a usar. Se um dia a pergunta virar
"quem está usando", a resposta não está nesta API — está em pedir contato em troca de algo. A
alavanca já está guardada: equivalências e SoD ficaram fora da v1 da API estática exatamente para
isso. Catálogo qualquer um raspa; a classificação cruzada, não.

## Os números de referência

Anote a linha de base na primeira semana depois de publicar. Sem ela, todo número seguinte é
absoluto e não diz nada.

Gatilhos que valem uma decisão, e não só uma anotação:

| Sinal | O que significa | O que fazer |
|---|---|---|
| Downloads planos e diários desde o primeiro dia | É CI, não gente | Não comemore; procure o repo que o instalou |
| Série esparsa subindo semana a semana | Adoção humana | Vale escrever sobre |
| Zero por 4 semanas depois de divulgar | O canal não pegou | O problema é distribuição, não produto |
| Quebra por versão mostrando gente presa numa antiga | `npx -y` não está atualizando | Verifique o `dist-tag` `latest` |

E os gatilhos que já estavam escritos para reabrir a decisão de chave/backend continuam valendo:
Edge Requests passando de ~300 mil/mês, um consumidor comercial identificado, ou qualquer pedido
pelos motores — esse último não é cota, é a linha do `PRODUCT.md`.

## O primeiro publish

O pacote não existe no npm ainda. `npm run metrics` antes de publicar responde exatamente isso,
e não confunde com zero:

```
O npm não conhece "iamscope-mcp" ainda. Isso é o esperado antes do primeiro publish —
não é falha do script. Depois de publicar, a contagem leva algumas horas para aparecer.
```

Essa distinção importa: **rede indisponível, pacote inexistente e zero download são três coisas
diferentes que dariam o mesmo número.** O script separa as três.
