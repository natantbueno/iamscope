# Licença dos dados — IAM Scope

Decidido em 22/08/2026, como Fase 0 do plano da API pública.

Este arquivo cobre **os dados** do IAM Scope. Ele não cobre o código-fonte do
site — ver "O que este arquivo **não** cobre", no fim.

Os dados aqui não são uma camada só. São três, com origens e permissões
diferentes, e misturá-las é o erro que torna qualquer licença de dataset
inaplicável na prática.

---

## Camada 1 — O fato bruto dos provedores

Nomes de role, identificadores, ARNs, GUIDs, listas de ações e permissões, e as
descrições oficiais publicadas por Microsoft, Amazon, Google e IBM.

**Não é nosso e não é relicenciado aqui.** São dados factuais coletados de
documentação pública; as descrições literais continuam sendo texto dos
provedores, sob os termos de uso de cada um. Se o seu uso depende de
redistribuir a descrição oficial de uma role, a pergunta é para a Microsoft, a
AWS, o Google ou a IBM — não para nós.

A origem de cada conjunto, com URL e data da última sincronização, está em
`src/data/syncMeta.ts` e é exibida na interface do site.

## Camada 2 — A curadoria do IAM Scope

**Licença: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**

Esta camada é trabalho editorial nosso. Não é publicada por provedor nenhum, e
é o que existe de original neste projeto:

- **A classificação em níveis do Enterprise Access Model** (`eamLevel` 0/1/2) e
  os mapas por plataforma em `src/lib/eamLevels.ts`.
- **Os tiers por cloud** — `AwsTier`, `GcpTier`, `AzureRbacTier`, `GwsTier`,
  `IbmTier` — e seus metadados em `src/data/tierMeta.ts`.
- **A categorização** (`category`) e a marcação `isPrivileged` de cada role.
- **As 190 regras de segregação de funções** em `src/data/sod/`, incluindo a
  severidade atribuída a cada uma.
- **As 29 equivalências de função entre as seis clouds** em
  `src/data/compare/equivalences.json`, com seus riscos e mitigações.
- **As descrições estendidas** (`richDescription`) escritas por nós.
- **A seleção, a estrutura e a organização do conjunto como um todo** — o que a
  CC BY 4.0 chama de direito *sui generis* de base de dados, e que as versões
  anteriores da licença não cobriam. É por isso que a versão é 4.0 e não 3.0.

### Como atribuir

A CC BY 4.0 exige crédito ao autor, link para a licença, e indicação de
mudanças. O crédito mínimo aceitável:

```
Classificação de risco e tiers: IAM Scope (https://iamscope.cloud),
CC BY 4.0. Modificado. / Não modificado.
```

Em interface de software, o link para `https://iamscope.cloud` precisa estar
acessível ao usuário final — não basta enterrar num arquivo de dependências.

O que a licença **não** exige, e nós também não: pedir permissão, pagar, ou
abrir o seu código. Uso comercial é permitido.

## Camada 3 — Terceiros, sob MIT

Duas partes da camada 2 são derivadas de projetos abertos de terceiros. A
licença deles continua valendo, e a atribuição não é opcional:

| Origem | Licença | O que veio de lá |
|---|---|---|
| [AzurePrivilegedIAM / EntraOps](https://github.com/Cloud-Architekt/AzurePrivilegedIAM) — Thomas Naunheim | MIT | O `eamTier` das 144 directory roles do Entra ID |
| [merill/microsoft-info](https://github.com/merill/microsoft-info) — Merill Fernando | MIT | O inventário das 1.504 API permissions do Microsoft Graph |

Quem redistribuir o catálogo carrega essas atribuições junto. Elas estão no
`README.md`, seção "Créditos e fontes", e devem sair também em
`/api/v1/meta/sources.json` quando a API for publicada.

---

## O que este arquivo **não** cobre

**O código-fonte do site.** Não há licença de código neste repositório, o que
significa, por padrão, todos os direitos reservados — ninguém pode copiar,
modificar ou redistribuir o código legalmente. Isso é uma decisão em aberto,
não uma posição: se o objetivo for aceitar contribuição externa ou permitir
fork, é preciso adicionar um `LICENSE` de código (MIT ou Apache-2.0 são os
candidatos óbvios). Enquanto isso não acontece, o padrão restritivo continua
valendo.

**Os arquivos internos em `public/`.** `search-index.json`,
`gcp-roles-official.json`, `azure-perms-index.json`, `aws-policy-docs/` e os
demais são formato interno, respondem com o cabeçalho
`X-IAMScope-Contract: internal-unstable`, e podem mudar de forma sem aviso a
cada coleta. A licença acima vale para o conteúdo, mas **não há nenhuma
promessa de estabilidade sobre esses arquivos** — o contrato público é
`/api/v1/`, e só ele.

## Sem garantia

Os dados são fornecidos "como estão". A classificação de risco é opinião
editorial informada, não auditoria: ela não substitui a revisão do seu próprio
time de segurança, e uma decisão de concessão de acesso tomada só com base
neste catálogo é responsabilidade de quem a tomou.

Limites conhecidos do dado estão documentados no `README.md` e no `PRODUCT.md`
— entre eles as roles do IBM Cloud sem lista de ações publicada pelo provedor e
os privilégios do Google Workspace expressos em prosa.

---

*Este arquivo descreve a intenção de licenciamento do projeto e não é parecer
jurídico. Se o catálogo for embutido em produto comercial de terceiro, vale uma
revisão por advogado antes — sobretudo quanto à camada 1, que não é nossa para
licenciar.*
