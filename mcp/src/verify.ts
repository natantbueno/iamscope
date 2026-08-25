// verify.ts — o guardrail, como código em vez de como pedido.
//
// O QUE ESTE ARQUIVO IMPEDE
//   `roles/bigquery.readOnly`. É plausível: o GCP tem roles/bigquery.dataViewer,
//   roles/bigquery.metadataViewer, roles/bigquery.jobUser, e "readOnly" é o
//   sufixo que existe em outras famílias. Não existe. Um modelo que responde
//   sobre GCP sem consultar nada produz esse nome mais cedo ou mais tarde, e
//   quem lê não tem como saber — o nome é indistinguível de um verdadeiro.
//
// POR QUE O ÍNDICE INCLUI O IDENTIFICADOR NATIVO, E NÃO SÓ O NOME
//   O nome de exibição da role do GCP é "BigQuery Data Viewer". O que o modelo
//   escreve num manifesto de Terraform é `roles/bigquery.dataViewer`. Verificar
//   só nomes de exibição deixaria passar exatamente a forma que vai para
//   produção — que é a única que quebra um `terraform apply`.
//
//   Então: nome, slug e id nativo (roleId do GCP, ARN e nome da AWS, GUID do
//   Entra e do Azure) entram todos no mesmo índice, com a forma de origem
//   registrada em `matchedAs`.
//
// O QUE ESTE ARQUIVO NÃO FAZ, E VALE DIZER EM VOZ ALTA
//   Um servidor MCP não vê a prosa do modelo. Ele não pode "derrubar" um nome
//   de dentro de uma frase já escrita, como o agente do navegador podia — lá o
//   IAM Scope renderizava a saída e tinha a última palavra. Aqui o que existe é
//   (a) nenhuma ferramenta devolve um nome que não esteja no catálogo, (b) uma
//   ferramenta barata de verificação, e (c) a regra dita nas instruções do
//   servidor e no envelope de toda resposta.
//
//   É menos garantia do que o desenho do agente tinha. Chamar de igual seria
//   repetir o defeito que este projeto passou o mês corrigindo.

export type VerifyPlatform =
  | 'entraId' | 'azureRbac' | 'aws' | 'gcp' | 'googleWorkspace' | 'ibmCloud'

export interface CatalogEntry {
  platform: VerifyPlatform
  name: string
  slug: string
  /** Identificador nativo: roleId do GCP, ARN da AWS, GUID do Entra/Azure. */
  nativeId?: string
}

export type Verdict = 'IN_CATALOG' | 'NOT_IN_CATALOG'

export interface VerifyResult {
  query: string
  verdict: Verdict
  matchedAs?: 'name' | 'slug' | 'nativeId'
  /** Todas as entradas que casaram — nome de role não é chave única no GCP. */
  matches: CatalogEntry[]
  /** Só quando NOT_IN_CATALOG: o "você quis dizer". Nunca é resposta, é pista. */
  didYouMean: CatalogEntry[]
}

let INDEX: CatalogEntry[] | null = null
let BY_KEY: Map<string, { entry: CatalogEntry; via: 'name' | 'slug' | 'nativeId' }[]> | null = null

const norm = (s: string) => s.trim().toLowerCase()

async function build(): Promise<void> {
  if (INDEX) return

  const [
    { ROLES },
    { AZURE_ROLES },
    { AWS_POLICIES },
    { GCP_ROLES },
    { GWS_ROLES },
    { IBM_ROLES },
  ] = await Promise.all([
    import('@/data/roles'),
    import('@/data/azureRbac'),
    import('@/data/aws'),
    import('@/data/gcp'),
    import('@/data/googleWorkspace'),
    import('@/data/ibmCloud'),
  ])

  const out: CatalogEntry[] = []
  for (const r of ROLES)        out.push({ platform: 'entraId',         name: r.name, slug: r.slug, nativeId: r.id })
  for (const r of AZURE_ROLES)  out.push({ platform: 'azureRbac',       name: r.name, slug: r.slug, nativeId: r.id })
  for (const p of AWS_POLICIES) out.push({ platform: 'aws',             name: p.name, slug: p.slug, nativeId: p.arn })
  for (const r of GCP_ROLES)    out.push({ platform: 'gcp',             name: r.name, slug: r.slug, nativeId: r.roleId })
  for (const r of GWS_ROLES)    out.push({ platform: 'googleWorkspace', name: r.name, slug: r.slug })
  for (const r of IBM_ROLES)    out.push({ platform: 'ibmCloud',        name: r.name, slug: r.slug })

  const map = new Map<string, { entry: CatalogEntry; via: 'name' | 'slug' | 'nativeId' }[]>()
  const put = (k: string, entry: CatalogEntry, via: 'name' | 'slug' | 'nativeId') => {
    const key = norm(k)
    if (!key) return
    const arr = map.get(key)
    if (arr) arr.push({ entry, via }); else map.set(key, [{ entry, via }])
  }
  for (const e of out) {
    put(e.name, e, 'name')
    put(e.slug, e, 'slug')
    if (e.nativeId) put(e.nativeId, e, 'nativeId')
  }

  INDEX = out
  BY_KEY = map
}

export async function catalogSize(): Promise<number> {
  await build()
  return INDEX!.length
}

/**
 * "Você quis dizer" — prefixo e substring, sem fuzzy.
 *
 * Deliberadamente burro. Distância de edição traria `roles/bigquery.dataViewer`
 * para `roles/bigquery.readOnly` com confiança alta, e um modelo que recebe uma
 * sugestão confiante a trata como confirmação. O que ele precisa receber é uma
 * negativa com pistas fracas, não um substituto.
 */
function similar(q: string, limit: number): CatalogEntry[] {
  const n = norm(q)
  if (n.length < 3) return []
  // O pedaço mais informativo do que foi digitado: para roles/bigquery.readOnly
  // isso é "bigquery", que é o que aproxima da família certa.
  const parts = n.split(/[\/.:\-_\s]+/).filter((p) => p.length >= 4)
  const hits: CatalogEntry[] = []
  const seen = new Set<string>()
  for (const e of INDEX!) {
    const hay = `${norm(e.name)} ${norm(e.slug)} ${norm(e.nativeId ?? '')}`
    const ok = hay.includes(n) || parts.some((p) => hay.includes(p))
    if (!ok) continue
    const key = `${e.platform}|${e.slug}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push(e)
    if (hits.length >= limit * 4) break
  }
  return hits.slice(0, limit)
}

export async function verifyNames(
  names: string[],
  platform?: VerifyPlatform,
): Promise<VerifyResult[]> {
  await build()
  return names.map((raw) => {
    const hits = BY_KEY!.get(norm(raw)) ?? []
    const scoped = platform ? hits.filter((h) => h.entry.platform === platform) : hits
    if (scoped.length === 0) {
      return {
        query: raw,
        verdict: 'NOT_IN_CATALOG' as const,
        matches: [],
        didYouMean: similar(raw, 3).filter((e) => !platform || e.platform === platform),
      }
    }
    // Preferência de forma: id nativo > nome > slug. O id é inequívoco.
    const order = { nativeId: 0, name: 1, slug: 2 } as const
    const best = [...scoped].sort((a, b) => order[a.via] - order[b.via])[0]
    return {
      query: raw,
      verdict: 'IN_CATALOG' as const,
      matchedAs: best.via,
      matches: scoped.map((h) => h.entry),
      didYouMean: [],
    }
  })
}
