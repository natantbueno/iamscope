/**
 * URL canônica do site.
 *
 * POR QUE UM MÓDULO SÓ PARA ISSO
 *   O endereço aparece em quatro lugares que precisam concordar: `metadataBase`
 *   do layout, o sitemap, o robots.txt e as tags Open Graph. Divergência entre
 *   eles produz canonical apontando para um domínio e sitemap para outro — o
 *   buscador trata como conteúdo duplicado e o efeito é o oposto do pretendido.
 *
 * COMO SOBRESCREVER
 *   Defina NEXT_PUBLIC_SITE_URL no ambiente de build. Serve para preview de PR
 *   na Vercel, onde o domínio muda a cada deploy, e para quem publicar num
 *   endereço próprio.
 *
 *   Vercel expõe VERCEL_URL sem esquema; tratamos isso.
 */
function resolver(): string {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL
  if (explicito) return explicito.replace(/\/+$/, '')

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`

  return 'https://iamscope.cloud'
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
