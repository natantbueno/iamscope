# Security Assessment — IAM Scope (entra-permissions)

**Data:** 2026-07-01
**Escopo:** Código-fonte, dependências e infraestrutura/configuração
**Tipo de app:** Next.js 15 App Router, `output: 'export'` (site 100% estático), deploy Vercel
**Método:** Revisão manual de código (todos os arquivos de `src/`, `scripts/` e configuração raiz), `npm audit`, análise do `package-lock.json`, pesquisa de advisories públicos (jul/2026)

> Divergências em relação ao briefing: **não existem** no projeto atual `.github/workflows/`, `vercel.json`, `src/middleware.ts`, `scripts/sync/` nem qualquer referência a credenciais (`ENTRA_CLIENT_SECRET`, `GITHUB_TOKEN`, `process.env.*`). O "pipeline de sync" hoje são os scripts em `scripts/` que baixam **fontes públicas** (docs AWS, azure-docs no GitHub) sem autenticação. Ver Seção 6.

---

## Seção 1 — Executive Summary

```
Total de findings: 11
- Critical:      0
- High:          1
- Medium:        2
- Low:           3
- Informational: 5

Risco geral do projeto: BAIXO-MÉDIO
Domínio com maior risco: Infraestrutura (ausência total de security headers)
```

O projeto está em boa forma de segurança para sua classe (site estático, sem autenticação, sem backend). Não foram encontrados secrets hardcoded, uso de `eval`, variáveis `NEXT_PUBLIC_*`, storage client-side ou endpoints expostos. As dependências estão **atualizadas em relação ao security release de maio/2026 do Next.js/React** (next 15.5.19 ≥ 15.5.18 patched; react 19.2.7 ≥ 19.2.6 patched).

O gap dominante é de **infraestrutura**: não há `vercel.json` nem qualquer configuração de headers HTTP — sem CSP, sem `X-Frame-Options`/`frame-ancestors`, sem `X-Content-Type-Options`. Como `output: 'export'` ignora `headers()` do `next.config.js`, hoje o site vai ao ar apenas com os defaults da Vercel. Os demais findings são defesa em profundidade, com atenção especial à integridade do pipeline de dados (o principal ativo do site é a **credibilidade dos dados IAM exibidos**).

---

## Seção 2 — Findings por Severidade

---
**[SEV-001] Ausência total de HTTP security headers (sem CSP, sem anti-framing, sem nosniff)**

| Campo | Valor |
|---|---|
| **Severidade** | High |
| **Domínio** | Infraestrutura |
| **OWASP** | A05:2021 — Security Misconfiguration |
| **CWE** | CWE-693 (Protection Mechanism Failure) / CWE-1021 (Improper Restriction of Rendered UI Layers) |
| **CVSS Score** | 6.1 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N — como amplificador de XSS/clickjacking) |
| **Arquivo/Local** | `vercel.json` (inexistente); `next.config.js` (sem headers — e `headers()` é ignorado em `output: 'export'`) |
| **Exploitabilidade** | Média (não é vulnerabilidade por si; remove todas as barreiras caso qualquer XSS/injeção surja) |

**Descrição:**
O projeto não define nenhum header de segurança. Não existe `vercel.json`, e o `next.config.js` não tem (nem poderia ter, em modo export) a função `headers()` — em `output: 'export'` ela é silenciosamente ignorada pelo Next.js. Resultado em produção: sem `Content-Security-Policy`, sem `X-Frame-Options`, sem `X-Content-Type-Options`, sem `Referrer-Policy`, sem `Permissions-Policy`. A Vercel aplica HSTS por padrão nos domínios servidos por ela, mas os demais headers precisam ser configurados explicitamente.

**Evidência:**
```
$ ls vercel.json          → não existe
$ cat next.config.js      → apenas output/'export', images.unoptimized, trailingSlash
$ ls src/middleware.ts    → não existe (e não funcionaria em export)
```

**Impacto:**
(1) **Clickjacking/UI redress:** o site pode ser embutido em iframe por qualquer origem. Dado o público (profissionais de IAM) e o conteúdo (classificação de risco de roles), um overlay malicioso sobre o site real é um vetor de engenharia social credível. (2) **Sem CSP como última linha de defesa:** qualquer XSS que venha a existir (ex.: regressão nos 4 usos de `dangerouslySetInnerHTML`, ou dado envenenado via pipeline) executa sem restrição, inclusive exfiltrando para qualquer origem via `connect-src` livre. (3) Sem `nosniff`, respostas podem ser reinterpretadas por MIME sniffing.

**Recomendação:**
Criar `vercel.json` na raiz (funciona para output estático na Vercel):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

Notas: `script-src 'unsafe-inline'` é necessário porque o export estático do Next.js injeta scripts inline de hidratação (sem nonce possível em site estático); `style-src 'unsafe-inline'` é necessário pelos `style={{...}}` inline dos componentes. **Não** incluir `'unsafe-eval'` (nada no bundle exige). `img-src` não precisa de `https:` genérico — o site não carrega imagens externas. Publicar primeiro com `Content-Security-Policy-Report-Only` por alguns dias se quiser validar sem risco de quebrar páginas. Testar depois com securityheaders.com.

**Referências:**
- https://owasp.org/Top10/A05_2021-Security_Misconfiguration/
- https://cwe.mitre.org/data/definitions/1021.html
- https://vercel.com/docs/projects/project-configuration#headers
- https://nextjs.org/docs/app/building-your-application/deploying/static-exports (limitações de `headers()`)

---
**[SEV-002] Integridade do pipeline de dados: fontes externas sem validação viram conteúdo do site**

| Campo | Valor |
|---|---|
| **Severidade** | Medium |
| **Domínio** | Código / Dependências (supply chain de dados) |
| **OWASP** | A08:2021 — Software and Data Integrity Failures |
| **CWE** | CWE-494 (Download of Code Without Integrity Check) / CWE-345 (Insufficient Verification of Data Authenticity) |
| **CVSS Score** | N/A (risco de integridade de conteúdo, não vulnerabilidade direta) |
| **Arquivo/Local** | `scripts/fetch-aws-managed-policies.js` (L35-36), `scripts/fetch-azure-roles.js` (L48), `scripts/convert-*.py`, `scripts/generate-azure-rbac.js` |
| **Exploitabilidade** | Baixa (exige comprometer a fonte upstream ou MITM) |

**Descrição:**
Os scripts de atualização baixam HTML/JSON de fontes públicas (`docs.aws.amazon.com`, `raw.githubusercontent.com/MicrosoftDocs/azure-docs`, e datasets do EntraOps/AzurePrivilegedIAM conforme `src/data/syncMeta.ts`) e regeneram os arquivos `src/data/*.ts` que são o coração do site. Não há verificação de integridade (hash/commit pinning), validação de schema, nem limites de sanidade (ex.: variação abrupta de contagem de roles/tiers) antes do dado entrar no bundle. O ponto positivo: os componentes renderizam esses dados via JSX (auto-escape do React), e os 4 usos de `dangerouslySetInnerHTML` escapam `&<>` antes do highlight — então o caminho "dado envenenado → XSS" está fechado hoje. O risco real é **desinformação**: alterar silenciosamente tiers, permissões ou mitigações exibidas.

**Evidência:**
```js
// scripts/fetch-aws-managed-policies.js:35
const INDEX_URL = 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html'
// scripts/fetch-azure-roles.js:48
const BASE_URL = 'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/...'
```
Nenhum dos scripts valida schema, compara contra baseline ou fixa commit/ref da fonte (`main` é uma ref móvel).

**Impacto:**
Comprometimento (ou vandalismo/erro) da fonte upstream propagaria dados IAM incorretos para um público que toma decisões de segurança com base neles — ex.: rebaixar "Privileged Role Administrator" para tier não-privilegiado. É exatamente o cenário 1 do contexto do projeto: enganar profissionais sobre permissões reais.

**Recomendação:**
1. Nos fetches do GitHub, **pinar por commit SHA** em vez de `main` e registrar o SHA em `syncMeta.ts` (`sourceRef` já existe para isso — preenchê-lo sempre).
2. Adicionar etapa de validação pós-geração: schema (campos obrigatórios/tipos), invariantes (`GUID` válido, tier ∈ conjunto conhecido, URL `https://` em `docUrl`) e *diff budget* (abortar se >N% das entradas mudarem numa execução).
3. Manter os `.ts` gerados sob revisão de diff em PR (nunca commit direto pós-sync).
4. Manter o padrão atual de nunca renderizar dado de pipeline via `dangerouslySetInnerHTML` sem escape prévio.

**Referências:**
- https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/
- https://cwe.mitre.org/data/definitions/494.html

---
**[SEV-003] npm audit: postcss < 8.5.10 embutido no Next.js (GHSA-qx2v-qp2m-jg93)**

| Campo | Valor |
|---|---|
| **Severidade** | Medium (Moderate no advisory; exploitabilidade Baixa neste contexto) |
| **Domínio** | Dependências |
| **OWASP** | A06:2021 — Vulnerable and Outdated Components |
| **CWE** | CWE-79 (XSS) |
| **CVSS Score** | 6.1 (do advisory) |
| **Arquivo/Local** | `node_modules/next/node_modules/postcss` (cópia interna do next 15.5.19) |
| **Exploitabilidade** | Baixa/Teórica (postcss roda só em build, processando CSS do próprio projeto) |

**Descrição:**
`npm audit` reporta 2 findings *moderate*, ambos a mesma causa-raiz: a cópia de `postcss` embutida no `next` está abaixo de 8.5.10 ("XSS via Unescaped `</style>` in CSS Stringify Output"). A dependência **direta** `postcss` do projeto já está em 8.5.15 (corrigida) — o alerta é só para a cópia vendorizada dentro do pacote `next`. O `fixAvailable: next@9.3.3` sugerido pelo npm é um artefato do resolvedor (downgrade absurdo) e **não deve ser seguido**.

**Evidência:**
```
npm audit → 2 moderate
postcss <8.5.10 — GHSA-qx2v-qp2m-jg93 — nodes: node_modules/next/node_modules/postcss
```

**Impacto:**
Para explorar, um atacante precisaria injetar conteúdo malicioso no CSS processado no build — o CSS aqui é o do próprio repositório (globals.css + Tailwind). Sem input externo no CSS, o risco prático é residual.

**Recomendação:**
Acompanhar os patch releases da linha 15.5.x do Next.js e atualizar quando a cópia interna do postcss for bumpada (`npm update next` periódico). Não aplicar `npm audit fix --force`. Registrar exceção com justificativa (build-time only, sem CSS externo) se houver processo de gestão de vulnerabilidades.

**Referências:**
- https://github.com/advisories/GHSA-qx2v-qp2m-jg93
- https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/

---
**[SEV-004] Export CSV/Excel sem neutralização de fórmulas (CSV Injection)**

| Campo | Valor |
|---|---|
| **Severidade** | Low |
| **Domínio** | Código |
| **OWASP** | A03:2021 — Injection (variante) |
| **CWE** | CWE-1236 (Improper Neutralization of Formula Elements in a CSV File) |
| **CVSS Score** | 3.3 |
| **Arquivo/Local** | `src/lib/export.ts` — `toCSV()` (L54-70) e `exportExcel()` (L93-141) |
| **Exploitabilidade** | Baixa (depende de dado envenenado no pipeline — encadeia com SEV-002) |

**Descrição:**
`toCSV()` faz quoting correto de `,`, `"` e quebras de linha, mas não neutraliza células iniciadas em `=`, `+`, `-`, `@`, TAB ou CR — que o Excel interpreta como fórmula (DDE/WEBSERVICE etc.). Hoje os dados exportados vêm do catálogo local (curado), então não há vetor direto; mas como esses arquivos são regenerados por pipeline a partir de fontes externas (descrições de roles/policies), uma descrição envenenada chegaria ao Excel de quem usa o botão "Exportar".

**Evidência:**
```ts
// src/lib/export.ts:57
const escapeCell = (val: unknown) => {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s   // ← "=HYPERLINK(...)" passa intacto
}
```

**Impacto:**
Execução de fórmula no Excel/LibreOffice da vítima ao abrir o CSV exportado (com prompts de aviso do Office, mas o público confia no site — ver contexto 3).

**Recomendação:**
Prefixar com `'` células cujo primeiro caractere seja `=`, `+`, `-`, `@`, `\t` ou `\r`:

```ts
const needsFormulaEscape = /^[=+\-@\t\r]/
const s0 = String(val ?? '')
const s = needsFormulaEscape.test(s0) ? `'${s0}` : s0
```

**Referências:**
- https://owasp.org/www-community/attacks/CSV_Injection
- https://cwe.mitre.org/data/definitions/1236.html

---
**[SEV-005] Inputs do SoD Analyzer e Role Evaluator sem limite de tamanho (auto-DoS client-side)**

| Campo | Valor |
|---|---|
| **Severidade** | Low |
| **Domínio** | Código |
| **OWASP** | A04:2021 — Insecure Design |
| **CWE** | CWE-400 (Uncontrolled Resource Consumption) / CWE-20 |
| **CVSS Score** | N/A (afeta apenas a aba do próprio usuário) |
| **Arquivo/Local** | `src/components/SoDUserEvaluator.tsx` (textarea L68, sem `maxLength`), `src/lib/sod.ts` (`evaluateUserRoles` L178-183, loop O(n²)), `src/lib/evaluate.ts` (`JSON.parse` L581 sem limite) |
| **Exploitabilidade** | Baixa (o "atacante" só trava o próprio navegador) |

**Descrição:**
Os dois pontos que processam input do usuário fazem `JSON.parse`/parsing de texto sem limite de tamanho, e `evaluateUserRoles` compara todos os pares (O(n²) sobre roles resolvidas). Como tudo é client-side e não há persistência nem envio a servidor, o impacto se restringe a travar a própria aba (colar 100 MB de JSON, ou milhares de linhas repetidas). As regex de parsing analisadas (`parseRoleListInput`, tokenizer de `RoleInput.tsx`, `UUID_RE` em evaluate.ts) são lineares — **sem padrão vulnerável a ReDoS** (nenhum quantificador aninhado/alternância ambígua).

**Evidência:**
```tsx
// SoDUserEvaluator.tsx:68 — <textarea ... sem maxLength
// sod.ts:178 — for i / for j sobre matched × matched
// evaluate.ts:581 — parsed = JSON.parse(rawText) direto do textarea
```

**Impacto:**
Congelamento da aba do próprio usuário; nenhum impacto a terceiros ou ao site.

**Recomendação:**
`maxLength={200_000}` nos textareas; rejeitar input > ~1 MB antes do `JSON.parse` com mensagem amigável; cap de roles avaliadas (ex.: 200) em `evaluateUserRoles` com aviso de truncamento.

**Referências:**
- https://cwe.mitre.org/data/definitions/400.html

---
**[SEV-006] Highlight de JSON via regex + dangerouslySetInnerHTML — padrão frágil (hoje seguro)**

| Campo | Valor |
|---|---|
| **Severidade** | Low (boa prática não seguida; sem vulnerabilidade ativa) |
| **Domínio** | Código |
| **OWASP** | A03:2021 — Injection (potencial futuro) |
| **CWE** | CWE-79 |
| **CVSS Score** | N/A |
| **Arquivo/Local** | `src/components/GcpRoleClient.tsx` L179-184, `GwsRoleClient.tsx` L187-192, `IbmCloudRoleClient.tsx` L166-171, `OciPolicyClient.tsx` L199-204 |
| **Exploitabilidade** | Teórica (exigiria regressão no escape + dado envenenado) |

**Descrição:**
Quatro componentes montam HTML de syntax highlight com cadeia de `.replace()` e injetam via `dangerouslySetInnerHTML`. A implementação atual escapa `&`, `<`, `>` **antes** das substituições de highlight — verificado nos 4 arquivos — portanto não há XSS explorável hoje, mesmo com dado malicioso no dataset. O problema é a fragilidade: a segurança depende da **ordem** das chamadas `.replace()` duplicadas em 4 lugares; uma refatoração que mova/remova o escape em um deles reabre XSS alimentado pelo pipeline (SEV-002). O projeto já tem a solução pronta: `RoleInput.tsx` contém `HighlightedJson` (tokenizer + text nodes React, sem HTML string).

**Evidência:**
```tsx
// GcpRoleClient.tsx:179
dangerouslySetInnerHTML={{ __html: visibleJson
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')   // escape OK
  .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')  // highlight
  ...
```

**Impacto:**
Nenhum hoje. Em caso de regressão: XSS armazenado servido a todos os visitantes das páginas de role GCP/GWS/IBM/OCI.

**Recomendação:**
Extrair `HighlightedJson` de `RoleInput.tsx` para componente compartilhado e substituir os 4 usos de `dangerouslySetInnerHTML`, eliminando a classe de risco (e a duplicação). Ganho extra: CSP fica mais fácil de endurecer no futuro.

**Referências:**
- https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html
- https://cwe.mitre.org/data/definitions/79.html

---
**[SEV-007] Next.js 15 em fim de ciclo — planejar migração para a linha 16.x (LTS)**

| Campo | Valor |
|---|---|
| **Severidade** | Info |
| **Domínio** | Dependências |
| **OWASP** | A06:2021 |
| **CWE** | CWE-1104 (Use of Unmaintained Third Party Components — preventivo) |
| **Arquivo/Local** | `package.json` (`next: ^15.0.0` → instalado 15.5.19) |
| **Exploitabilidade** | N/A |

**Descrição:**
O projeto está na última patch da linha 15.5 (15.5.19, posterior ao security release de mai/2026 que corrigiu 13 advisories nas versões 15.5.18/16.2.6). Está **em dia** — porém a linha atual do Next.js é a 16.x (16.2.7, Active LTS com suporte de segurança projetado até out/2027). Quando a 15.x sair de suporte, patches de segurança param de chegar.

**Recomendação:**
Planejar upgrade para 16.x em janela tranquila (mudanças relevantes: Turbopack default, `async params` — o projeto já usa client components para rotas dinâmicas, o esforço tende a ser baixo). Reavaliar também `lucide-react` 0.469.0 (dez/2024 — sem CVEs conhecidos, mas ~18 meses atrás da linha atual; atualizar junto).

**Referências:**
- https://vercel.com/changelog/next-js-may-2026-security-release
- https://endoflife.date/nextjs

---
**[SEV-008] `.gitignore` sem padrões para chaves/certificados**

| Campo | Valor |
|---|---|
| **Severidade** | Info |
| **Domínio** | Infraestrutura |
| **OWASP** | A05:2021 |
| **CWE** | CWE-312 / CWE-538 |
| **Arquivo/Local** | `.gitignore` |
| **Exploitabilidade** | Teórica (preventivo) |

**Descrição:**
O `.gitignore` cobre corretamente `.env`, `.env*.local`, `node_modules/`, `.next/`, `/out` e os artefatos de scratch dos scripts (`scripts/debug-*.html`, `scripts/*-raw.json`). Faltam padrões preventivos para material criptográfico: `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.cert`. Hoje nenhum arquivo desse tipo existe no projeto, mas o custo de prevenir é zero.

Observação relacionada: `auditoria-multicloud-iam-2026-06-30.docx` está na raiz do projeto. Se o repositório for/ficar público, esse documento será publicado junto. Confirmar se é intencional (ou adicionar `*.docx` ao `.gitignore`).

**Recomendação:**
Acrescentar ao `.gitignore`:
```
*.pem
*.key
*.p12
*.pfx
*.cert
```
E decidir explicitamente o destino do `.docx` da auditoria.

---
**[SEV-009] Sem CI/CD auditável no repositório (deploy implícito via integração Vercel)**

| Campo | Valor |
|---|---|
| **Severidade** | Info |
| **Domínio** | Infraestrutura |
| **OWASP** | A08:2021 / OWASP CI/CD Top 10 |
| **CWE** | CWE-1357 (Reliance on Insufficiently Trustworthy Component — cadeia de build) |
| **Arquivo/Local** | `.github/workflows/` (inexistente) |
| **Exploitabilidade** | N/A |

**Descrição:**
Não há workflows de GitHub Actions — o deploy descrito em `DEPLOY.md` usa a integração Git da Vercel (push em `main` → build → publish). Isso elimina os riscos clássicos de Actions (injection via `${{ github.event.* }}`, `pull_request_target`, actions não pinadas) simplesmente por não existirem, mas também significa: sem gate de build/lint/audit antes do deploy, e qualquer push em `main` publica direto.

**Recomendação:**
1. Proteger a branch `main` no GitHub (require PR + review).
2. Se/quando criar workflows: `permissions: contents: read` no topo, actions pinadas por SHA, `npm ci` (a Vercel já usa lockfile por padrão — `package-lock.json` está presente e deve permanecer commitado).
3. Considerar um workflow simples de PR com `npm run build` + `npm audit --audit-level=high` como gate.

**Referências:**
- https://owasp.org/www-project-top-10-ci-cd-security-risks/

---
**[SEV-010] Dependências com scripts de instalação (sharp, fsevents)**

| Campo | Valor |
|---|---|
| **Severidade** | Info |
| **Domínio** | Dependências (supply chain) |
| **OWASP** | A06:2021 |
| **CWE** | CWE-1395 |
| **Arquivo/Local** | `package-lock.json` — `node_modules/sharp` 0.34.5, `node_modules/fsevents` 2.3.3 (`hasInstallScript: true`) |
| **Exploitabilidade** | Teórica |

**Descrição:**
Das 137 dependências resolvidas, apenas 2 têm install scripts — ambas legítimas e de baixo risco (sharp é dependência opcional do Next para otimização de imagem — nem usada com `images.unoptimized`; fsevents é opcional/macOS). Nenhuma dependência do projeto consta em históricos de comprometimento tipo event-stream/ua-parser-js. Árvore pequena (16 prod / 85 dev / 38 optional) é um ponto forte.

**Recomendação:**
Manter a árvore mínima como está. Opcional: `npm ci --ignore-scripts` no CI de verificação (não no build da Vercel, que pode precisar do sharp em outros contextos). Habilitar Dependabot/Renovate para PRs de atualização.

---
**[SEV-011] Endurecimentos menores de configuração (`poweredByHeader`, `reactStrictMode`, source maps)**

| Campo | Valor |
|---|---|
| **Severidade** | Info |
| **Domínio** | Infraestrutura |
| **OWASP** | A05:2021 |
| **CWE** | CWE-16 |
| **Arquivo/Local** | `next.config.js` |
| **Exploitabilidade** | N/A |

**Descrição:**
Estado atual verificado: `productionBrowserSourceMaps` **não** está habilitado (default false — correto; sem source maps em produção). `poweredByHeader` não se aplica na prática: com `output: 'export'` não há servidor Next servindo respostas (a Vercel serve arquivos estáticos), então o header `X-Powered-By: Next.js` não é emitido. `reactStrictMode`: no App Router o Strict Mode já é aplicado por default, mas explicitá-lo documenta a intenção.

**Recomendação:**
```js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,     // explícito
  poweredByHeader: false,    // inócuo em export, mas protege se o modo mudar
}
```

---

## Seção 3 — Matriz de Risco

| Finding | Probabilidade | Impacto | Risco resultante |
|---|---|---|---|
| SEV-001 Headers/CSP ausentes | Média (condição permanente; explorável quando combinada) | Alto (anula defesa em profundidade; clickjacking direto) | **Alto** |
| SEV-002 Integridade do pipeline de dados | Baixa | Alto (desinformação IAM em escala) | **Médio** |
| SEV-003 postcss vendorizado no next | Muito baixa (build-time, sem CSS externo) | Médio | **Médio-Baixo** |
| SEV-004 CSV Injection no export | Baixa (requer SEV-002 antes) | Médio (execução de fórmula no Excel do usuário) | **Baixo** |
| SEV-005 Input sem limite (SoD/Evaluator) | Média (trivial de acionar) | Muito baixo (só a própria aba) | **Baixo** |
| SEV-006 dangerouslySetInnerHTML frágil | Baixa (exige regressão futura) | Alto (XSS armazenado) | **Baixo** |
| SEV-007 Next 15 fim de ciclo | Certa (com o tempo) | Médio (perda de patches) | **Baixo (crescente)** |
| SEV-008 .gitignore incompleto | Baixa | Médio | **Baixo** |
| SEV-009 Sem CI auditável | Baixa | Médio | **Baixo** |
| SEV-010 Install scripts | Muito baixa | Médio | **Baixo** |
| SEV-011 Config hardening | N/A | Muito baixo | **Info** |

---

## Seção 4 — Roadmap de Remediação

| Prioridade | Finding | Esforço | Impacto | Prazo sugerido |
|---|---|---|---|---|
| 1 | [SEV-001] Criar `vercel.json` com CSP + headers | Baixo (1 arquivo, testar em preview) | Alto | Imediato |
| 2 | [SEV-004] Neutralizar fórmulas no `toCSV()` | Baixo (5 linhas) | Médio | 1 semana |
| 3 | [SEV-006] Trocar os 4 `dangerouslySetInnerHTML` pelo `HighlightedJson` | Baixo-Médio | Médio | 1-2 semanas |
| 4 | [SEV-002] Pinning por SHA + validação de schema/diff no pipeline | Médio | Alto | 2-4 semanas |
| 5 | [SEV-005] Limites de input (maxLength / cap de roles) | Baixo | Baixo | 2-4 semanas |
| 6 | [SEV-008] Padrões `*.pem`/`*.key` no `.gitignore` + decidir `.docx` | Trivial | Baixo | Imediato (carona na PR 1) |
| 7 | [SEV-011] `reactStrictMode`/`poweredByHeader` explícitos | Trivial | Baixo | Carona em qualquer PR |
| 8 | [SEV-009] Branch protection + CI de PR (build + audit) | Baixo | Médio | 1 mês |
| 9 | [SEV-003] Acompanhar patches do next (postcss interno) | Contínuo | Baixo | Contínuo |
| 10 | [SEV-007] Migração Next 15 → 16 LTS | Médio | Médio | Próximo trimestre |
| 11 | [SEV-010] Dependabot/Renovate | Baixo | Médio | 1 mês |

---

## Seção 5 — Positivos (o que está bem)

1. **Zero secrets no código.** Nenhum `process.env`, nenhum `NEXT_PUBLIC_*`, nenhum token/credencial hardcoded em `src/` ou `scripts/`. Os scripts de dados usam exclusivamente fontes públicas sem autenticação.
2. **Dependências em dia com o security release de mai/2026:** next 15.5.19 (≥ 15.5.18 patched), react/react-dom 19.2.7 (≥ 19.2.6 patched). `npm audit`: 0 critical / 0 high.
3. **Superfície mínima:** site estático sem backend, sem formulários com submit, sem cookies, sem `localStorage`/`sessionStorage` (verificado — nem o tema usa storage), sem chamadas de rede externas no client (os 2 únicos `fetch` são same-origin para `/azure-perms/*.json`).
4. **Sem `eval`/`new Function`/`innerHTML`/`document.write`** em todo o código.
5. **Escape correto nos 4 usos de `dangerouslySetInnerHTML`** (`&<>` antes do highlight) e renderização de todo o resto via JSX (auto-escape do React).
6. **Sem recursos de CDN externos:** nenhuma fonte do Google, nenhum `<script src>` de terceiros — nada exigindo SRI; isso também permite uma CSP `default-src 'self'` limpa.
7. **Todos os `target="_blank"` têm `rel`** (`noopener` e/ou `noreferrer` — ambos suficientes; navegadores modernos ainda aplicam `noopener` implícito).
8. **Regex de parsing lineares** — tokenizer de `RoleInput.tsx` e parsers de `sod.ts`/`evaluate.ts` sem padrões de backtracking catastrófico (sem ReDoS).
9. **CSV com quoting correto** de aspas/vírgulas/quebras (falta só o caso de fórmula — SEV-004); export Excel escapa XML corretamente.
10. **`package-lock.json` presente** (build reprodutível), árvore de dependências pequena (4 deps de produção diretas), TypeScript `strict: true`.
11. **Sem source maps de produção**, sem middleware fantasma (nada sendo silenciosamente ignorado pelo modo export), `.env*` no `.gitignore`.
12. **Transparência de dados:** `syncMeta.ts` rastreia fonte/data de cada dataset — boa base para o pinning por SHA recomendado em SEV-002.

---

## Seção 6 — Fora do Escopo / Divergências do Briefing

**Não avaliado (e por quê):**
- **Headers em produção ao vivo** — a pasta analisada não contém a URL de produção confirmada nem acesso ao projeto Vercel; a análise de headers é baseada na ausência de configuração no repositório. Após criar o `vercel.json`, validar com `curl -I` / securityheaders.com no domínio real.
- **Configuração do projeto na Vercel** (branch de produção, proteção de push, env vars no dashboard) — requer acesso ao dashboard.
- **Penetration test / análise dinâmica (DAST)** — assessment foi estático (SAST manual + SCA).
- **O que está de fato commitado no GitHub** — a pasta local **não é um repositório git** (sem `.git/`); não foi possível confirmar histórico, se `scripts/*-raw.json`/`debug-*.html` já foram commitados no passado, nem se o `.docx` está no repo remoto. Recomenda-se `git log --all --stat` no repo real para confirmar que nenhum artefato ignorado hoje foi commitado antes de entrar no `.gitignore`.

**Divergências em relação ao briefing do assessment:**
- `scripts/sync/`, `.github/workflows/`, `vercel.json`, `src/middleware.ts` e `SoDUserEvaluator` com "JSON colado" — o briefing menciona esses itens, mas: os scripts de dados vivem em `scripts/` (não `scripts/sync/`); não há workflows nem vercel.json; o SoD Analyzer aceita **lista de roles** (linhas/CSV/array JSON), não JSON complexo — o JSON complexo é do Role Evaluator (`/evaluate`).
- **Nenhuma credencial Entra ID em uso:** não existe `ENTRA_CLIENT_SECRET` (nem qualquer env var) no código atual. O item do briefing "pipeline usa credenciais reais do Entra ID" não se materializou no código analisado — se esse pipeline autenticado for adicionado no futuro, tratar as credenciais exclusivamente via env vars/secrets do CI e nunca em arquivos versionados (isso seria, aí sim, o cenário Critical descrito no briefing).

---

*Assessment gerado em 2026-07-01. Ferramentas: revisão manual de código, npm audit (npm 10.9.8), análise de package-lock.json, pesquisa de advisories públicos.*
