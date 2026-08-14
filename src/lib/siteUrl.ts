/**
 * URL canônica do site.
 *
 * POR QUE UM MÓDULO SÓ PARA ISSO
 *   O endereço aparece em quatro lugares que precisam concordar: `metadataBase`
 *   do layout, o sitemap, o robots.txt e as tags Open Graph. Divergência entre
 *   eles produz canonical apontando para um domínio e sitemap para outro — o
 *   buscador trata como conteúdo duplicado e o efeito é o oposto do pretendido.
 *
 * A ARMADILHA DO VERCEL_URL (corrigida em 13/08/2026)
 *   `VERCEL_URL` é a URL **única do deploy** — `projeto-<hash>-time.vercel.app`,
 *   diferente a cada push. A Vercel a define em produção também, não só em
 *   preview. Enquanto ela vinha antes do padrão, o robots.txt no ar anunciava
 *   `Host: https://entraid-permissions-knf5wo4rt-iamcloud1.vercel.app` e o
 *   sitemap listava 7.600 URLs nesse mesmo host — que deixa de existir no
 *   próximo deploy. Canonical instável é pior do que canonical ausente: o
 *   buscador consolida a autoridade num endereço descartável.
 *
 *   O certo em produção é `VERCEL_PROJECT_PRODUCTION_URL`: a Vercel preenche
 *   com o domínio de produção do projeto (o custom domain mais curto, ou o
 *   `.vercel.app` se não houver nenhum). É estável entre deploys.
 *
 * COMO SOBRESCREVER
 *   Defina NEXT_PUBLIC_SITE_URL no ambiente de build. É o que manda em tudo, e
 *   serve para publicar num endereço próprio sem tocar no código.
 *
 * NOTA SOBRE O PREFIXO
 *   `VERCEL_ENV` e `VERCEL_PROJECT_PRODUCTION_URL` não têm `NEXT_PUBLIC_`, então
 *   só existem no servidor. Aqui isso basta: os três consumidores deste módulo
 *   — layout.tsx (metadata), sitemap.ts e robots.ts — são todos server-side e
 *   avaliados em build time. Se algum dia um componente `'use client'` importar
 *   SITE_URL, o valor sairá `undefined` no browser e cairá no padrão.
 */
function resolver(): string {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL
  if (explicito) return semBarraFinal(explicito)

  // Preview de PR: cada deploy tem endereço próprio, e é esse que deve aparecer
  // nas tags — o preview não deve se anunciar como se fosse produção.
  if (process.env.VERCEL_ENV === 'preview') {
    const preview = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
    if (preview) return `https://${semBarraFinal(preview)}`
  }

  // Produção na Vercel. Estável entre deploys, ao contrário de VERCEL_URL.
  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (producao) return `https://${semBarraFinal(producao)}`

  return 'https://iamscope.cloud'
}

function semBarraFinal(valor: string): string {
  return valor.replace(/\/+$/, '')
}

export const SITE_URL = resolver()

/**
 * Monta a URL absoluta de uma rota.
 *
 * `trailingSlash: true` no next.config: toda rota vira pasta com index.html, e
 * o sitemap precisa listar exatamente a forma que o servidor entrega, senão o
 * buscador segue um redirect a cada URL e desconta isso do orçamento de rastreio.
 */
export function urlDe(caminho: string): string {
  if (caminho === '/') return `${SITE_URL}/`
  const limpo = `/${caminho.replace(/^\/+|\/+$/g, '')}/`
  return `${SITE_URL}${limpo}`
}
