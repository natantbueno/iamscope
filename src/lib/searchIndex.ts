// Índice de busca global (roles + policies das 6 clouds) — compartilhado entre
// /search (SearchClient.tsx) e a paleta de comando (CommandPalette.tsx).
//
// Os dois liam public/search-index.json e reimplementavam a mesma pontuação
// e o mesmo teste "isso parece uma action?" de forma independente. Extraído
// para cá para as duas telas não divergirem silenciosamente.

export interface Indice {
  generatedAt: string
  campos: string[]
  clouds: Record<string, { label: string; base: string; noun: string; color: string; text: string; total: number }>
  tiers: Record<string, Record<string, { label: string; color: string }>>
  itens: [string, string, string, string, string, string, string, string, number, number][]
}

export interface Resultado {
  cloud: string
  name: string
  slug: string
  id: string
  description: string
  tier: string
  tierLabel: string
  category: string
  privileged: boolean
  deprecated: boolean
  /** Menor = melhor. Ver `pontuar`. */
  score: number
}

/**
 * Ordena por qualidade da correspondência, não alfabeticamente.
 *
 * Quem busca "global admin" espera Global Administrator primeiro, não a
 * primeira role em ordem alfabética que contenha "admin" na descrição. Sem
 * isso o resultado útil fica na página 4.
 */
export function pontuar(termo: string, nome: string, slug: string, id: string, desc: string): number {
  const n = nome.toLowerCase()
  if (n === termo) return 0                       // nome exato
  if (slug.toLowerCase() === termo) return 1      // slug exato
  if (id.toLowerCase() === termo) return 2        // GUID / ARN exato
  if (n.startsWith(termo)) return 3               // começa com
  if (n.includes(termo)) return 4                 // contém no nome
  if (slug.toLowerCase().includes(termo)) return 5
  if (id.toLowerCase().includes(termo)) return 6
  if (desc.toLowerCase().includes(termo)) return 7 // só na descrição

  /*
    Última tentativa: todas as palavras presentes, em qualquer ordem.

    Sem isto, "admin global" devolvia zero enquanto "global admin" achava a
    Global Administrator — a busca dependia da ordem em que a pessoa lembrou
    das palavras, o que não é razoável. Fica por último no ranking porque é a
    correspondência mais frouxa.
  */
  const palavras = termo.split(/\s+/).filter(Boolean)
  if (palavras.length > 1) {
    const texto = `${n} ${slug.toLowerCase()} ${desc.toLowerCase()}`
    if (palavras.every((p) => texto.includes(p))) return 8
  }
  return 99
}

/**
 * Parece identificador de action/permission? Então o lugar é o Permission Scope.
 *
 * O `[a-z][a-z0-9]*` do segundo padrão não é preciosismo: com `[a-z]+` o
 * `s3:GetObject` não casava, porque o `+` para no "s" e o dígito quebra a
 * sequência. Serviços da AWS com número no nome (s3, ec2, route53) são
 * exatamente os mais buscados.
 */
export function pareceAction(termo: string): boolean {
  return /^[a-z][\w.]*\/[\w*/.]+$/i.test(termo) || /^[a-z][a-z0-9]*:[a-zA-Z]/.test(termo)
}

/** Ranqueia e ordena os itens do índice contra um termo já em minúsculas/trim. */
export function ranquear(indice: Indice, termo: string): Resultado[] {
  const out: Resultado[] = []
  for (const [cloud, name, slug, id, description, tier, tierLabel, category, priv, dep] of indice.itens) {
    const score = pontuar(termo, name, slug, id, description)
    if (score === 99) continue
    out.push({
      cloud, name, slug, id, description, tier, tierLabel, category,
      privileged: !!priv, deprecated: !!dep, score,
    })
  }
  out.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
  return out
}

// Cache em memória do módulo — sobrevive entre aberturas da paleta e evita
// baixar de novo o índice (~1,2 MB) se /search também já buscou nesta sessão.
let indicePromise: Promise<Indice> | null = null

export function carregarIndice(): Promise<Indice> {
  if (!indicePromise) {
    indicePromise = fetch('/search-index.json').then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json() as Promise<Indice>
    }).catch((e) => {
      indicePromise = null // permite tentar de novo numa próxima abertura
      throw e
    })
  }
  return indicePromise
}
