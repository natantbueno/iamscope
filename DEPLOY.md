# Guia de Deploy — entra.permissions

Este projeto é um site **estático** (HTML/CSS/JS puro depois do build), o que torna o deploy simples e gratuito. Abaixo, três caminhos do mais fácil ao mais flexível.

---

## Pré-requisito: subir o código para o GitHub

Os métodos de deploy automático puxam o código de um repositório. Se ainda não tem:

```bash
# Na pasta do projeto
git init
git add .
git commit -m "Primeira versão do entra.permissions"

# Crie um repositório vazio em github.com/new, depois:
git remote add origin https://github.com/SEU_USUARIO/entra-permissions.git
git branch -M main
git push -u origin main
```

> Se preferir não usar GitHub, pule para a **Opção C** (deploy manual por upload).

---

## Opção A — Vercel (recomendado)

A Vercel é quem desenvolve o Next.js. Deploy gratuito, com HTTPS e atualização automática a cada `git push`.

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub.
2. Clique em **Add New → Project**.
3. Selecione o repositório `entra-permissions`.
4. A Vercel detecta o Next.js sozinha — **não precisa configurar nada**. Clique em **Deploy**.
5. Em ~1 minuto o site está no ar numa URL tipo `entra-permissions.vercel.app`.

**Domínio próprio (opcional):** em Project → Settings → Domains, você pode apontar um domínio como `entra.permissions.cloud` se tiver um registrado.

A partir daí, todo `git push` na branch `main` republica automaticamente.

---

## Opção B — Cloudflare Pages

Alternativa gratuita com CDN global muito rápida.

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages**.
2. Conecte sua conta GitHub e selecione o repositório.
3. Configure o build:
   - **Framework preset:** Next.js (Static HTML Export)
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
4. Clique em **Save and Deploy**.

---

## Opção C — Deploy manual (sem GitHub)

Como o site é estático, você pode gerar os arquivos e subir em qualquer hospedagem.

```bash
npm install
npm run build
```

Isso cria a pasta **`out/`** com o site completo em HTML. Daí:

- **Netlify Drop:** arraste a pasta `out/` em [app.netlify.com/drop](https://app.netlify.com/drop) — deploy instantâneo, sem conta.
- **Qualquer hospedagem:** envie o conteúdo de `out/` para a pasta pública do servidor (via FTP, painel, etc.).
- **GitHub Pages:** suba o conteúdo de `out/` na branch `gh-pages`.

---

## Notas

- **Custo:** todas as opções acima têm plano gratuito suficiente para este projeto.
- **HTTPS:** Vercel, Cloudflare e Netlify fornecem certificado SSL automático.
- **Atualizar dados:** quando rodar os scripts de conversão (ver README) e regenerar `roles.ts`/`apiPermissions.ts`, basta fazer `git push` (Opções A/B) ou refazer o build e re-upload (Opção C).
- **Performance:** por ser estático, o site carrega instantaneamente e aguenta tráfego alto sem custo de servidor.

---

## Verificação antes do deploy

Rode localmente uma vez para garantir que o build passa:

```bash
npm run build
```

Se aparecer `✓ Generating static pages (148/148)` ou similar, está tudo certo — são as ~4 páginas principais + 144 páginas de roles. A pasta `out/` estará pronta.
