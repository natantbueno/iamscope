# Google Search Console — passo a passo para o IAM Scope

Preparado em 13/08/2026. A ordem importa: os passos 0 e 1 precisam vir antes do resto.

---

## 0. Antes de tudo: consertar a URL canônica

**Não envie o sitemap antes disso.** O `robots.txt` que está no ar hoje diz:

```
Host: https://entraid-permissions-knf5wo4rt-iamcloud1.vercel.app
Sitemap: https://entraid-permissions-knf5wo4rt-iamcloud1.vercel.app/sitemap.xml
```

Esse endereço é a URL **única do deploy** — muda a cada push. O sitemap lista as 7.600 URLs
nesse mesmo host, e as tags Open Graph também. Registrar o site no Search Console nesse
estado ensina o Google a consolidar autoridade num endereço que morre no próximo deploy.

A causa está em `src/lib/siteUrl.ts`: `VERCEL_URL` vinha antes do padrão, e a Vercel
define essa variável em produção também — não só em previews de PR.

**O que fazer**, em qualquer ordem (os dois juntos é cinto e suspensório):

1. Aplicar o patch `iamscope-analytics-e-canonical.patch` na cópia versionada.
   A nova ordem é: `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` (só em preview) →
   `VERCEL_PROJECT_PRODUCTION_URL` → `https://iamscope.cloud`.
2. Na Vercel: **Settings → Environment Variables**, adicionar
   `NEXT_PUBLIC_SITE_URL = https://iamscope.cloud` no escopo **Production**.
   Isso resolve mesmo sem o patch, e protege caso as system environment variables
   estejam desabilitadas no projeto.

**Verificação depois do deploy** — abrir `https://iamscope.cloud/robots.txt` e conferir:

```
Host: https://iamscope.cloud
Sitemap: https://iamscope.cloud/sitemap.xml
```

Se ainda aparecer o hash, o deploy não pegou a mudança.

---

## 1. Criar a propriedade

<https://search.google.com/search-console> → **Adicionar propriedade**.

Duas opções, e a escolha tem consequência:

| | Propriedade de **Domínio** | Prefixo de URL |
|---|---|---|
| Cobre | `iamscope.cloud` + todos os subdomínios, http e https | só o prefixo exato |
| Verificação | registro **TXT no DNS** | arquivo HTML, meta tag, GA, GTM |
| Recomendado aqui | **sim** | só se não tiver acesso ao DNS |

**Domínio é a escolha certa** porque você tem domínio próprio e não vai querer refazer
isso quando surgir um `www.` ou um subdomínio.

### Caminho A — verificação por DNS (recomendado)

1. Escolher **Domínio**, digitar `iamscope.cloud`.
2. O Google mostra um valor `google-site-verification=XXXXXXXX`.
3. Adicionar um registro **TXT** no DNS do domínio: host `@` (ou vazio, conforme o
   provedor), valor exatamente a string acima.
   - Se o DNS estiver na Vercel: **Domains → iamscope.cloud → DNS Records → Add**.
   - Se estiver no registrador (Registro.br, Cloudflare, Namecheap…): no painel de DNS de lá.
4. Voltar e clicar em **Verificar**. Costuma levar de minutos a algumas horas.
   Se falhar na primeira, esperar e tentar de novo — não recriar o registro.

### Caminho B — sem acesso ao DNS

Propriedade de **Prefixo de URL** com `https://iamscope.cloud/` e verificação por meta tag.
No Next isso é uma linha no `metadata` do `src/app/layout.tsx`:

```ts
verification: { google: 'CÓDIGO_QUE_O_GOOGLE_DER' },
```

Precisa de um deploy para valer. Uma vez verificado, **não remova a linha** — o Google
revalida periodicamente.

---

## 2. Enviar o sitemap

Menu lateral → **Sitemaps** → campo "Adicionar novo sitemap" → digitar apenas:

```
sitemap.xml
```

Não a URL completa — o campo já vem com o domínio preenchido.

O sitemap tem ~7.600 URLs. O limite do Google é 50.000 URLs ou 50 MB descomprimido por
arquivo, então um único sitemap está confortável e não precisa de índice.

Status esperado logo depois: "Êxito" com o número de URLs descobertas. Se aparecer
"Não foi possível buscar", quase sempre é o passo 0 mal resolvido.

---

## 3. Conferir o robots.txt no relatório

**Configurações → robots.txt**. Confirmar que o Google leu a versão nova e que os
`Disallow` são os pretendidos:

```
Disallow: /roles/            (stubs de redirect do Entra ID antigo)
Disallow: /role-actions/
Disallow: /api-permissions/
Disallow: /pim/
Disallow: /ibm-cloud/actions/
```

Ver a nota sobre esses bloqueios no fim deste documento — há uma decisão pendente ali.

---

## 4. Inspecionar quatro URLs representativas

Ferramenta **Inspeção de URL** (barra no topo) → colar a URL → **Testar URL ativa** →
**Ver página testada** → aba **HTML**.

Vale testar estas quatro, porque elas se comportam de forma diferente:

| URL | O que confirmar |
|---|---|
| `https://iamscope.cloud/` | conteúdo no HTML, canônica correta |
| `https://iamscope.cloud/aws/` | landing de cloud, conteúdo estático |
| `https://iamscope.cloud/entraid/roles/global-administrator/` | página de detalhe, uma das 7.600 |
| `https://iamscope.cloud/sod/` | **renderiza no cliente** — o HTML estático vem vazio |

A última é o teste que importa: o Googlebot executa JavaScript, mas numa segunda passada
e com atraso. Se o conteúdo aparecer no "Testar URL ativa", está tudo bem. Se não
aparecer, `/sod`, `/compare` e `/permission-scope` não vão render nada em busca — e aí é
decidir se vale pré-renderizar o conteúdo delas.

---

## 5. O que olhar, e quando

Search Console não é tempo real. Indexar 7.600 URLs leva **semanas**.

**Depois de ~1 semana** — relatório **Páginas**: quantas indexadas vs. não indexadas, e
os motivos. Espere ver muita coisa em **"Descoberta – no momento não indexada"**: é o
comportamento normal do Google com sites grandes de páginas estruturalmente parecidas.
Ele não é uma falha técnica; é o Google racionando o orçamento de rastreio.

**Depois de ~1 mês** — relatório **Desempenho**: as queries reais. É aqui que você
descobre com quais termos as pessoas chegam, e provavelmente vai ser algo específico
("what is Global Administrator tier 0", nomes de role, nomes de permissão) e não o
genérico. Essa lista é o melhor insumo que existe para decidir o que escrever depois.

**Cruzar com o Vercel Analytics:** o Search Console conta impressões e cliques *na busca*;
o Vercel conta visitas *no site*. Divergência grande entre cliques e pageviews costuma ser
adblock (o Vercel subconta) ou tráfego direto/de outras fontes (o Search Console não vê).

---

## 6. Bing (opcional, 5 minutos)

<https://www.bing.com/webmasters> → criar conta → **Importar do Google Search Console**.
Puxa propriedade e sitemap prontos. O volume é uma fração do Google, mas o custo é
próximo de zero e alimenta também o Copilot/ChatGPT search.

---

## Uma decisão pendente que o Search Console vai expor

As rotas antigas do Entra ID (`/roles/`, `/pim/`, `/role-actions/`, `/api-permissions/`)
estão em `Disallow`. A razão registrada é boa: são stubs de meta refresh, e rastreá-las
gastaria orçamento com milhares de redirecionamentos.

O efeito colateral: se algum link externo já aponta para, digamos,
`/roles/global-administrator`, o Google **não pode** ler a página para descobrir que ela
aponta para o destino novo — bloqueio no robots impede a leitura, não só a indexação. Essa
autoridade se perde no caminho.

Se esses links externos existirem (o relatório **Links** do Search Console vai mostrar),
vale reconsiderar: liberar o crawl dessas rotas e pôr um `canonical` apontando para o
destino novo transfere o valor em vez de descartá-lo. Decisão para depois de ver os dados,
não agora.
