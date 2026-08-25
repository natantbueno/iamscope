import fs from 'fs'
import path from 'path'
import type { MetadataRoute } from 'next'
import { urlDe } from '@/lib/siteUrl'
import { ROLES } from '@/data/roles'
import { AZURE_ROLES } from '@/data/azureRbac'
import { AWS_POLICIES } from '@/data/aws'
import { GCP_ROLES } from '@/data/gcp'
import { GWS_ROLES } from '@/data/googleWorkspace'
import { IBM_ROLES } from '@/data/ibmCloud'
import { SOD_RULES } from '@/data/sod/rules'
import { actionToSlug } from '@/lib/azurePermissions'
import equivalences from '@/data/compare/equivalences.json'

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
 * Sitemap do site inteiro — cerca de 7.800 URLs.
 *
 * Roda em BUILD TIME, no Node: pode importar os datasets e ler public/ do
 * disco. Com `output: 'export'` o Next materializa isso em out/sitemap.xml.
 *
 * DUAS REGRAS QUE NÃO SÃO ÓBVIAS
 *
 * 1. Rotas de redirect ficam de fora. `/roles`, `/roles/[slug]`, `/pim`,
 *    `/role-actions` e `/api-permissions` existem só como stub de meta refresh
 *    para não quebrar links antigos. Listá-las faria o buscador rastrear
 *    milhares de páginas que só redirecionam, gastando orçamento de rastreio e
 *    diluindo a autoridade entre o caminho velho e o novo.
 *
 * 2. Barra no fim, sempre. `trailingSlash: true` no next.config faz o servidor
 *    entregar /aws/policies/ ; listar /aws/policies provocaria um redirect por
 *    URL. `urlDe()` cuida disso.
 *
 * PRIORIDADE
 *   Não é ranking — o Google praticamente ignora o campo. Usamos só para
 *   sinalizar a hierarquia interna: home > dashboards e ferramentas > listagens
 *   > páginas de detalhe.
 */

const AGORA = new Date()

/** Rotas fixas. Mantida à mão porque é curta e a intenção de cada uma difere. */
const ESTATICAS: [string, number][] = [
  ['/', 1.0],

  // Dashboards por cloud
  ['/entraid', 0.9], ['/azure-rbac', 0.9], ['/aws', 0.9],
  ['/gcp', 0.9], ['/google-workspace', 0.9], ['/ibm-cloud', 0.9],

  // Ferramentas — o que diferencia o site
  ['/search', 0.7],

  // Changelog. As sete URLs a mao porque sao poucas e a intencao difere: a
  // global e a porta de entrada, as seis por nuvem sao o que casa com busca do
  // tipo "azure rbac changelog". Os feeds Atom NAO entram: sitemap e para
  // paginas, e um .xml listado aqui gasta orcamento de rastreio sem nunca
  // virar resultado.
  ['/changelog', 0.9],
  ['/changelog/entraid', 0.7], ['/changelog/azure-rbac', 0.7], ['/changelog/aws', 0.7],
  ['/changelog/gcp', 0.7], ['/changelog/google-workspace', 0.7], ['/changelog/ibm-cloud', 0.7],
  ['/sod', 0.9], ['/sod/rules', 0.7], ['/assessment', 0.9],
  ['/permission-scope', 0.9], ['/compare', 0.9], ['/evaluate', 0.8],
  ['/advisor', 0.8], ['/tier-comparison', 0.8], ['/stats', 0.8],

  // Listagens
  ['/entraid/roles', 0.8], ['/entraid/role-actions', 0.7], ['/entraid/api-permissions', 0.7],
  ['/entraid/pim', 0.6],
  ['/azure-rbac/roles', 0.8], ['/azure-rbac/permissions', 0.8],
  ['/azure-rbac/providers', 0.8],
  ['/aws/policies', 0.8], ['/aws/actions', 0.8], ['/aws/scp-vs-identity-policies', 0.6],
  ['/gcp/roles', 0.8], ['/gcp/permissions', 0.8],
  ['/google-workspace/roles', 0.8], ['/google-workspace/privileges', 0.7],
  ['/google-workspace/api-permissions', 0.6],
  ['/ibm-cloud/roles', 0.8], ['/ibm-cloud/classic', 0.8], ['/ibm-cloud/access-groups', 0.6],

  // Referência
  ['/entraid/reference', 0.6], ['/azure-rbac/reference', 0.6], ['/aws/reference', 0.6],
  ['/gcp/reference', 0.6], ['/google-workspace/reference', 0.6], ['/ibm-cloud/reference', 0.6],
  ['/reference', 0.6], ['/info', 0.5],
]

/** Slugs de permission do Azure: vêm do índice em public/, não do bundle. */
function slugsDePermissaoAzure(): string[] {
  try {
    const p = path.join(process.cwd(), 'public', 'azure-perms-index.json')
    const idx = JSON.parse(fs.readFileSync(p, 'utf8')) as { index: Record<string, number[]> }

    // Mesma desambiguação — e MESMA ORDEM — de generateStaticParams e de
    // buildAzurePermissionCatalog. 57 actions colidem no slug; o sufixo depende
    // da ordem de iteração, então o `.sort()` é o que garante que o sitemap
    // aponte para as URLs que o build de fato gerou.
    const vistos = new Map<string, number>()
    const out: string[] = []
    for (const action of Object.keys(idx.index).sort()) {
      let slug = actionToSlug(action)
      const n = vistos.get(slug) ?? 0
      vistos.set(slug, n + 1)
      if (n > 0) slug = `${slug}-${n + 1}`
      out.push(slug)
    }
    return out
  } catch {
    return []
  }
}

/**
 * Slugs dos resource providers do Azure. Vêm do índice em public/, o mesmo que
 * generateStaticParams lê — sem desambiguação, porque os 151 nomes distintos
 * não colidem no slug (o gerador aborta se um dia colidirem).
 */
function slugsDeProviderAzure(): string[] {
  try {
    const p = path.join(process.cwd(), 'public', 'azure-providers', 'index.json')
    const idx = JSON.parse(fs.readFileSync(p, 'utf8')) as { providers: { slug: string }[] }
    return idx.providers.map((x) => x.slug)
  } catch {
    return []
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entradas: MetadataRoute.Sitemap = []
  const push = (caminho: string, priority: number) => {
    entradas.push({
      url: urlDe(caminho),
      lastModified: AGORA,
      changeFrequency: 'weekly',
      priority,
    })
  }

  for (const [rota, prio] of ESTATICAS) push(rota, prio)

  for (const r of ROLES) push(`/entraid/roles/${r.slug}`, 0.7)
  for (const r of AZURE_ROLES) push(`/azure-rbac/roles/${r.slug}`, 0.7)
  for (const s of slugsDePermissaoAzure()) push(`/azure-rbac/permissions/${s}`, 0.5)
  for (const s of slugsDeProviderAzure()) push(`/azure-rbac/providers/${s}`, 0.6)
  for (const p of AWS_POLICIES) push(`/aws/policies/${p.slug}`, 0.7)
  for (const r of GCP_ROLES) push(`/gcp/roles/${r.slug}`, 0.6)
  for (const r of GWS_ROLES) push(`/google-workspace/roles/${r.slug}`, 0.7)
  for (const r of IBM_ROLES) push(`/ibm-cloud/roles/${r.slug}`, 0.7)
  for (const r of SOD_RULES) push(`/sod/rules/${r.id}`, 0.6)

  const tiers = new Set<string>()
  for (const eq of equivalences as { id: string; tier: number }[]) {
    tiers.add(`tier${eq.tier}`)
    push(`/compare/tier${eq.tier}/${eq.id}`, 0.5)
  }
  for (const t of tiers) push(`/compare/${t}`, 0.6)

  return entradas
}
