# Prompt para a próxima sessão — concluir a tradução da interface

Copie o bloco abaixo inteiro na nova sessão.

---

Estou continuando a internacionalização do **IAM Scope**, um site estático
(Next.js 15, App Router, `output: 'export'`) que é referência de roles e
permissões de IAM em 6 clouds. Trabalhe direto em
`F:\Downloads\entraid-permissions-update` — sem gerar .zip.

## O que já existe (não refazer)

A infraestrutura de i18n está pronta e funcionando:

- `src/i18n/LanguageProvider.tsx` — provider client-side, `useT()` e
  `useLanguage()`. A escolha fica no localStorage; **não** há rotas /pt e /en
  (com 7.796 páginas estáticas, rotear por idioma dobraria a árvore).
- `src/i18n/dictionary.ts` — 110 chaves com `{ pt, en }`. `TranslationKey` é
  derivado do objeto, então chave inexistente quebra no typecheck.
- `src/components/LanguageSwitcher.tsx` — bandeiras em SVG (emoji de bandeira
  não renderiza no Windows), já montado no header via `AppShell`.
- Sidebar, Pagination e ~30 telas já traduzidas.

## Regra inegociável sobre os dados

**Só a INTERFACE é traduzida. Dados oficiais permanecem em inglês, sempre** —
descrições de role/policy, nomes e identificadores (`Global Administrator`,
`storage.buckets.get`, `AmazonS3ReadOnlyAccess`).

O porquê está em `docs/ADR-001-idioma-dos-dados.md`: AWS e Microsoft traduzem
por máquina e dizem isso explicitamente, e a versão pt-BR do Azure chega a
traduzir o identificador da action — publica "leitura" onde o Azure publica
"read". Leia o ADR antes de mexer.

## O trabalho desta sessão

Faltam **492 strings em 72 arquivos**. Rode para ver o estado atual:

```
node scripts/find-untranslated.js              # resumo por arquivo
node scripts/find-untranslated.js --list       # cada ocorrência
node scripts/find-untranslated.js --file=info  # filtra um arquivo
```

O grosso está em **10 páginas que são Server Components** e concentram ~250
strings de prosa:

```
entraid/(content)/reference   49      gcp/reference              22
aws/scp-vs-identity-policies  34      google-workspace/reference  ~
entraid/pim                   33      ibm-cloud/reference        11
info                          33      tier-comparison            18
aws/reference                 28      azure-rbac/reference       22
```

Elas exportam `export const metadata`, o que é **incompatível com
`'use client'`** — não dá para colocar hook nelas como estão. Cada uma precisa
ser dividida em:

- `page.tsx` — Server Component, só com `metadata` e renderizando o filho
- `XClient.tsx` — `'use client'`, com o conteúdo e o `useT()`

Esse padrão já existe no projeto: veja `src/app/sod/page.tsx` +
`src/app/sod/SodClient.tsx`.

**Ordem sugerida:** `/info` primeiro (mais visível), depois as `reference` de
cada cloud, e por último `scp-vs-identity-policies` e `tier-comparison`.

Trate isso como **redação técnica nos dois idiomas**, não tradução mecânica.
São parágrafos explicativos num site que se apresenta como referência técnica;
inglês ruim ali custa credibilidade. Escreva o inglês como um profissional de
IAM escreveria, não como tradução literal do português.

## Ferramentas de verificação (use sempre)

```
node scripts/check-i18n-scope.js    # t() fora do escopo do hook — segundos
node scripts/check-syntax.cjs <arquivos...>
node scripts/typecheck.cjs          # completo, alguns minutos
npm run build                       # a prova final
```

`check-i18n-scope.js` existe porque `const t = useT()` no lugar errado é
sintaxe válida: passa no parser e só quebra no build com "Cannot find name 't'".
Ele considera múltiplas declarações por arquivo — subcomponentes definidos
no fim do arquivo precisam do próprio hook.

Há também `scripts/apply-i18n-labels.js` para rótulos curtos que se repetem
entre arquivos. Ele já pula Server Components automaticamente. **Não use em
prosa** — regex em parágrafo faz estrago.

## Armadilhas que já custaram build quebrado

1. **`'use client'` em Server Component com `metadata`** — quebrou 4 páginas.
2. **Hook inserido na função errada** — o wrapper `XPage()` que só devolve
   `<Suspense>` não é onde os `t()` estão; eles ficam no `XContent()`.
3. **Subcomponentes no fim do arquivo** precisam do próprio `useT()`.
4. **`*/` dentro de bloco `/** */`** fecha o comentário antes da hora — evite
   escrever caminhos de action em comentário de bloco.

## Como quero que você trabalhe

- Verifique antes de afirmar. Se disser que algo funciona, tenha rodado.
- Diga o que **não** validou. Se o typecheck não rodou, diga.
- Se eu sugerir algo que os dados contradigam, me corrija com a evidência.
- Comentários no código explicam **por que**, não o que — especialmente onde
  houver decisão não óbvia.
- Prefira concisão. Sem recapitular o que já está na tela.

Comece rodando `node scripts/find-untranslated.js` para confirmar o estado, e
me diga o plano antes de editar em massa.
