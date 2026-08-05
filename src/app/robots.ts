import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'

/**
 * `dynamic = 'force-static'` é obrigatório com `output: 'export'`.
 *
 * robots.ts e sitemap.ts não são páginas: o Next os compila como Route
 * Handlers, e handler é dinâmico por padrão. No export estático não existe
 * servidor para atendê-lo em runtime, então o build aborta com
 * "export const dynamic = force-static not configured on route".
 *
 * A diretiva manda avaliar a função uma vez, em build time, e materializar o
 * resultado como arquivo — que é o comportamento desejado aqui: o conteúdo só
 * muda quando os datasets mudam.
 */
export const dynamic = 'force-static'

/**
 * robots.txt.
 *
 * O QUE ESTÁ BLOQUEADO E POR QUÊ
 *   Só os stubs de redirect das rotas antigas do Entra ID (`/roles/`, `/pim/`,
 *   `/role-actions/`, `/api-permissions/`). São páginas de meta refresh que
 *   existem para não quebrar links já compartilhados; deixar o buscador
 *   rastreá-las gastaria orçamento em milhares de redirecionamentos e
 *   dividiria a autoridade entre o caminho velho e o novo.
 *
 *   O conteúdo real fica todo liberado — é um site de referência pública, e
 *   ser encontrado É o objetivo.
 *
 * ATENÇÃO ao editar: `/roles/` com barra bloqueia a pasta, não a raiz. Sem a
 * barra o prefixo pegaria qualquer caminho começado em "roles".
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/roles/',
          '/role-actions/',
          '/api-permissions/',
          '/pim/',
          // Descontinuada em 03/08 — ver o comentário em app/ibm-cloud/actions.
          '/ibm-cloud/actions/',
        ],
      },
    ],
    // Sem barra final: sitemap.xml é arquivo, não rota — o trailingSlash do
    // next.config não se aplica a ele.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
