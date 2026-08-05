# ADR-001 — Idioma dos dados oficiais

**Data:** 30/07/2026
**Status:** decidido
**Pergunta:** para o site bilíngue (pt-BR / en), coletamos as descrições oficiais
nos dois idiomas ou mantemos só o original?

---

## Decisão

**A interface é traduzida. Os dados oficiais permanecem em inglês, sempre.**

Nenhuma descrição, action, permission ou role name é traduzida — nem por nós,
nem coletando a versão localizada da documentação.

---

## Por quê

### 1. As traduções dos três provedores são feitas por máquina, e eles mesmos dizem isso

**AWS** — no rodapé de cada página `docs.aws.amazon.com/pt_br/`:

> As traduções são geradas por tradução automática. Em caso de conflito entre o
> conteúdo da tradução e da versão original em inglês, a versão em inglês prevalecerá.

**Microsoft** — o metadado da página `learn.microsoft.com/pt-br/` declara:

```
meta-ms.translationtype: MT
```

`MT` = Machine Translation.

Coletar essas versões significaria publicar tradução automática sob o rótulo de
"dado oficial da Microsoft/AWS" — exatamente o que a regra do projeto proíbe.
E o próprio provedor se recusa a garantir o conteúdo traduzido.

### 2. A tradução automática corrompe identificadores técnicos

Este é o argumento decisivo. Na página pt-BR das built-in roles do Azure, a
tabela de Actions mostra:

| Ações | Descrição |
|---|---|
| `*/leitura` | Leia as informações do plano de controle para todos os recursos do Azure. |

A action real é `*/read`. **A tradução traduziu o identificador.** Um scraper
que lesse a versão pt-BR gravaria `*/leitura` no dataset — uma action que não
existe em lugar nenhum do Azure.

O mesmo risco vale para GCP (`storage.buckets.get`) e AWS (`s3:GetObject`).

### 3. A própria Microsoft não traduz o dado autoritativo

Na mesma página pt-BR, o bloco JSON da role permanece em inglês:

```json
{
  "description": "View all resources, but does not allow you to make any changes.",
  "roleName": "Reader"
}
```

A Microsoft traduz a prosa ao redor e deixa o dado intacto. É o mesmo critério
que adotamos aqui.

### 4. O profissional de IAM trabalha em inglês

`Global Administrator`, `storage.buckets.get`, `AmazonS3ReadOnlyAccess` são o
que aparece no portal do Azure, no console da AWS e no `gcloud`. Traduzir o nome
da role tornaria impossível casar o que o site diz com o que a pessoa vê na
ferramenta — e quebraria a busca, que é o principal uso do site.

### 5. Custo de manutenção

Coletar em dois idiomas dobraria o volume de `public/` (hoje ~25 MB), dobraria o
tempo de cada coleta e criaria uma segunda fonte que sai de sincronia quando o
provedor atualiza só o inglês — que é o caso normal, já que a tradução é gerada
depois.

---

## O que É traduzido

| Camada | Idioma | Exemplo |
|---|---|---|
| Navegação, botões, filtros, cabeçalhos de tabela | pt-BR / en | "Buscar", "Exportar", "Privilegiada" |
| Textos explicativos do site | pt-BR / en | descrição do tier, avisos, páginas de referência |
| Classificação editorial do IAM Scope | pt-BR / en | rótulos de tier e categoria |
| **Descrições oficiais** | **inglês, sempre** | "View all resources, but does not allow you to make any changes." |
| **Nomes de role / policy** | **inglês, sempre** | `Reader`, `AmazonS3ReadOnlyAccess` |
| **Actions e permissions** | **inglês, sempre** | `*/read`, `storage.buckets.get` |

Onde houver descrição oficial em inglês numa interface em português, a UI marca
a origem (badge "Microsoft" / "AWS" / "Google") — o usuário entende que aquele
texto é citação, não falta de tradução.

---

## Consequências

- `hl=en` continua fixado no coletor do GCP (já estava, por este motivo).
- O coletor da AWS continua usando `docs.aws.amazon.com/.../reference/` sem
  prefixo de locale.
- O coletor do Azure continua lendo `MicrosoftDocs/azure-docs` (repositório em
  inglês), não o repositório localizado.
- Se um dia algum provedor publicar tradução humana revisada e marcar como
  autoritativa, esta decisão pode ser revista para aquele provedor.
