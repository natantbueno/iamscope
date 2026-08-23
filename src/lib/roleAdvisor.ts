// ── Role Advisor — recuperação léxica sobre as 6 clouds ──────────────────────
//
// Roda 100% no cliente, sem backend.
//
// POR QUE ISTO FOI REESCRITO EM 07/08/2026
//   A versão anterior somava pesos na mão (+12 se o termo aparecia no nome, +6
//   na descrição, +2 no corpus, +0,5 × frequência). Medida contra o build, ela
//   errava de quatro jeitos — e os quatro eram consequência do desenho:
//
//   1. A NEGAÇÃO ERA IGNORADA. "sem" e "não" são stop words, então "Kubernetes
//      sem billing" pontuava "billing" normalmente e devolvia Project Billing
//      Manager em primeiro. Pior caso medido: "não quero dar global admin"
//      trazia Global Administrator em segundo. Isso não é resultado ruim, é o
//      oposto do pedido — num produto de IAM, é perigoso.
//   2. A PALAVRA DA PLATAFORMA VIRAVA ÍMÃ. Sem IDF, "azure" valia +12 nas ~300
//      roles cujo nome começa com "Azure". "somente leitura para auditar no
//      Azure" devolvia Azure Information Protection Administrator; a `Reader`
//      certa não aparecia em lugar nenhum.
//   3. NÃO HAVIA PONTE ENTRE INTENÇÃO E CAPACIDADE. "terraform" devolvia dois
//      resultados, ambos sem relação: nenhuma role de nenhuma cloud tem essa
//      palavra. E a consulta em português não tocava um corpus todo em inglês.
//   4. NUNCA EXISTIA "NÃO SEI". Devolvia 30 resultados sempre, com um score de
//      escala desconhecida (18, 19, 20) ao lado.
//
//   O desenho novo ataca os quatro: BM25F com IDF real (1 e 2), léxico de
//   conceito e de intenção (3), plano de consulta com exclusão e escopo (1), e
//   confiança derivada da cobertura dos termos, com corte relativo em vez de
//   topN fixo (4).
//
//   O PLANO DE CONSULTA VOLTA JUNTO COM OS RESULTADOS, de propósito: a
//   interface mostra o que foi entendido, o que virou escopo, o que foi
//   excluído e o que não casou com nada. Uma busca que erra e mostra o
//   raciocínio é corrigível por quem está lendo; uma que erra em silêncio, não.
//
// O QUE ISTO NÃO É: não há embedding, modelo nem semântica. É recuperação
// léxica com curadoria. O texto da interface precisa dizer isso — anunciar
// "busca semântica", como fazia até 07/08, é vender o que não existe.

import {
  PLATFORM_ALIASES, CONCEPT_LEXICON, INTENT_LEXICON,
  NEGATION_MARKERS, PRIVILEGE_INTENT, STRONG_WEIGHT, WEAK_WEIGHT,
} from './advisorLexicon'

export type AdvisorPlatform = 'entraId' | 'azureRbac' | 'googleWorkspace' | 'ibmCloud' | 'gcp' | 'aws'

export interface AdvisorRole {
  /** Chave única: plataforma:slug */
  key: string
  platform: AdvisorPlatform
  platformLabel: string
  platformColor: string
  name: string
  description: string
  tier: string
  tierColor: string
  href: string
  isPrivileged: boolean
  /** O provedor marca como descontinuada (AWS e GCP publicam isso). */
  deprecated?: boolean
  /** Corpus pesquisável pré-montado. */
  corpus: string
  /** Tokens por campo, calculados uma vez na montagem do índice. */
  nameTokens: string[]
  descTokens: string[]
  extraTokens: string[]
}

export interface AdvisorResult {
  role: AdvisorRole
  score: number
  /** 0–1 relativo ao melhor desta busca. É isto que vira rótulo na interface. */
  relevance: number
  /** Termos da consulta que esta role atendeu. */
  matchedTerms: string[]
}

/** O que o Advisor entendeu da frase. A interface mostra isto. */
export interface AdvisorQueryPlan {
  /** Termos que pontuam, já sem stop word, sem escopo e sem negação. */
  terms: string[]
  /** Termos que a pessoa pediu para EXCLUIR ("sem billing"). */
  excluded: string[]
  /** Plataformas deduzidas da frase. Vazio = todas. */
  scopedPlatforms: AdvisorPlatform[]
  /** Termos que nenhum resultado atendeu — a interface diz isso em voz alta. */
  unmatched: string[]
  /** A pessoa pediu poder alto explicitamente. */
  wantsPrivileged: boolean
}

export interface AdvisorResponse {
  results: AdvisorResult[]
  plan: AdvisorQueryPlan
  confidence: 'high' | 'medium' | 'low'
  /** Quantas roles pontuaram acima de zero, antes do corte de relevância. */
  candidates: number
}

// ── Stop words (EN + PT) ─────────────────────────────────────────────────────
// "sem", "não", "nem" e "exceto" NÃO entram aqui: são justamente os marcadores
// de negação, e removê-los antes da hora foi o que causou o defeito nº 1. Eles
// são consumidos em `planQuery` e só então descartados.
const STOP_WORDS = new Set([
  'a','an','the','and','or','of','to','in','for','with','on','at','by','from',
  'is','are','can','be','as','that','this','it','its','all','any','has','have',
  'do','will','would','could','should','was','were','been','want','need','please',
  'de','do','da','dos','das','e','em','um','uma','para','por','com','na','no',
  'os','as','que','se','ou','mais','tambem','quando','como','qual','cada',
  'sobre','entre','dentro','fora','apos','antes','durante','ate','meu','minha',
  'nosso','nossa','preciso','quero','queria','gostaria','poder','dar','ter',
  'acesso','permissao','permissoes','role','roles','papel','papeis',
  // Estas entraram depois do teste de 07/08: apareciam como termo nos chips de
  // "o que eu entendi", nunca casavam com nada, e ainda derrubavam a cobertura
  // — que é o que decide o rótulo de confiança. Palavra que não pode casar não
  // pode contar contra o encaixe.
  'mas','porem','quem','tem','tenho','temos','rodar','usar','fazer','mexer',
  'nada','ambiente','meu','minhas','meus','apenas','somente','tipo','coisa',
  'algo','alguem','pessoa','time','equipe','gente',
])

// "acesso", "permissão" e "role" entram como stop word por um motivo medido:
// aparecem em quase toda descrição do catálogo, então o IDF delas já é
// próximo de zero — mas continuavam custando uma passada de expansão e
// poluindo os chips de "o que eu entendi" na interface.

// ── Normalização e tokenização ───────────────────────────────────────────────

/** Tira acento sem depender de `localeCompare` — o corpus é todo em inglês. */
function deburr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalize(text: string): string {
  return deburr(text.toLowerCase())
    .replace(/[—–\-\/\\|_.]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Plural fora, dos dois lados.
 *
 * Sem isto, "recursos" não casava com "resources" e a role `Reader` do Azure —
 * cuja descrição é "View all resources, but does not allow you to make any
 * changes" — ficava fora de "somente leitura para auditar recursos no Azure",
 * que é literalmente a definição dela.
 *
 * Não é stemmer de verdade e não precisa ser: a mesma função roda na consulta e
 * no corpus, então o que importa é ser CONSISTENTE, não linguisticamente certa.
 * "kubernetes" vira "kubernete" nos dois lados e casa igual.
 *
 * As guardas existem por casos reais: 4 caracteres para não destruir siglas de
 * três ("dns", "aws", "gcp"), e 'ss'/'us' preservados para não quebrar "access"
 * e "status", que aparecem em milhares de descrições.
 */
function stem(w: string): string {
  if (w.length >= 4 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) {
    return w.slice(0, -1)
  }
  return w
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ')
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
    .map(stem)
}

/** Tokens sem filtro de stop word — o plano de consulta precisa deles inteiros. */
function rawTokens(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean)
}

// ── Plano de consulta ────────────────────────────────────────────────────────
//
// Ordem importa e não é arbitrária:
//   1. escopo de plataforma (casa expressões de várias palavras, então vem antes
//      de qualquer coisa que quebre a frase em tokens soltos);
//   2. negação (precisa da ordem original das palavras para saber o que "sem"
//      alcança);
//   3. o que sobrou vira termo de pontuação.
export function planQuery(
  raw: string,
  explicitPlatform: AdvisorPlatform | 'all' = 'all',
): AdvisorQueryPlan {
  let text = ' ' + normalize(raw) + ' '
  const scoped = new Set<AdvisorPlatform>()

  // 1. Plataforma vira escopo e SAI do texto.
  for (const { alias, platforms } of PLATFORM_ALIASES) {
    const needle = ' ' + alias + ' '
    if (text.includes(needle)) {
      platforms.forEach((p) => scoped.add(p))
      text = text.split(needle).join(' ')
    }
  }

  // 2. Negação. Varre a frase da esquerda para a direita, e cada marcador leva
  //    os próximos `span` termos úteis para a lista de exclusão.
  const words = rawTokens(text)
  const excluded: string[] = []
  const kept: string[] = []
  for (let i = 0; i < words.length; i++) {
    const marker = NEGATION_MARKERS.find((m) => {
      const parts = m.marker.split(' ')
      return parts.every((p, k) => words[i + k] === p)
    })
    if (marker) {
      const parts = marker.marker.split(' ').length
      let taken = 0
      let j = i + parts
      while (j < words.length && taken < marker.span) {
        const w = words[j]
        // Stop word no meio ("sem permissão DE billing") não gasta o alcance.
        if (w.length > 2 && !STOP_WORDS.has(w)) { excluded.push(w); taken++ }
        j++
      }
      i = j - 1
      continue
    }
    kept.push(words[i])
  }

  const terms = kept.filter((w) => w.length > 2 && !STOP_WORDS.has(w))

  // Só o que a pessoa PEDIU conta como intenção de privilégio. Ler de
  // `rawTokens(raw)`, como estava, fazia "não quero dar global admin" desligar
  // a penalidade de role privilegiada — usando contra ela a palavra que ela
  // acabou de negar.
  const wantsPrivileged = terms.some((w) => PRIVILEGE_INTENT.has(w))

  // O filtro escolhido no chip manda no que foi deduzido da frase: é escolha
  // explícita contra palpite.
  const scopedPlatforms = explicitPlatform !== 'all' ? [explicitPlatform] : [...scoped]

  return { terms, excluded, scopedPlatforms, unmatched: [], wantsPrivileged }
}

/**
 * Expansões de um termo, com peso: conceito PT→EN e intenção→capacidade.
 * Tradução direta (`strong`) e vizinhança (`weak`) NÃO podem valer o mesmo —
 * ver o comentário de `Expansion` em advisorLexicon.ts para o caso medido.
 */
function expand(term: string): { word: string; weight: number }[] {
  const seen = new Map<string, number>()
  for (const src of [CONCEPT_LEXICON[term], INTENT_LEXICON[term]]) {
    if (!src) continue
    for (const w of src.strong) if (w !== term) seen.set(w, Math.max(seen.get(w) ?? 0, STRONG_WEIGHT))
    for (const w of src.weak)   if (w !== term) seen.set(w, Math.max(seen.get(w) ?? 0, WEAK_WEIGHT))
  }
  return [...seen].map(([word, weight]) => ({ word, weight }))
}

// ── Índice ───────────────────────────────────────────────────────────────────
// Montado sob demanda na primeira busca, para não pesar no carregamento.

interface AdvisorIndex {
  roles: AdvisorRole[]
  /** Em quantos documentos cada termo aparece — o IDF sai daqui. */
  df: Map<string, number>
  avgName: number
  avgDesc: number
  avgExtra: number
}

let INDEX: AdvisorIndex | null = null

async function buildIndex(): Promise<AdvisorIndex> {
  if (INDEX) return INDEX

  // Imports dinâmicos para não inchar o bundle inicial.
  const [
    { ROLES },
    { AZURE_ROLES },
    { GWS_ROLES },
    { IBM_ROLES, IBM_TIER_META },
    { GCP_ROLES, GCP_TIER_META },
    { AWS_POLICIES, AWS_TIER_META },
  ] = await Promise.all([
    import('@/data/roles'),
    import('@/data/azureRbac'),
    import('@/data/googleWorkspace'),
    import('@/data/ibmCloud'),
    import('@/data/gcp'),
    import('@/data/aws'),
  ])

  const entraColors: Record<string, string> = {
    ControlPlane: '#dc2626', ManagementPlane: '#ea580c',
    UserAccess: '#ca8a04', Unclassified: '#6b7280',
  }
  const azureColors: Record<string, string> = {
    FullControl: '#dc2626', AccessManagement: '#ea580c',
    Contributor: '#ca8a04', DataPlane: '#0891b2',
    Reader: '#16a34a', Specialized: '#7c3aed',
  }
  const gwsColors: Record<string, string> = {
    SuperAdmin: '#dc2626', DelegatedAdmin: '#ea580c',
    ServiceAdmin: '#0891b2', SpecializedAdmin: '#7c3aed', ReadOnly: '#16a34a',
  }

  type Draft = Omit<AdvisorRole, 'nameTokens' | 'descTokens' | 'extraTokens'> & { extra: string }
  const drafts: Draft[] = []

  // ── Entra ID ──
  for (const r of ROLES) {
    const perms = (r.permissions ?? []).map((p: { action: string }) => p.action).join(' ')
    drafts.push({
      key: `entraId:${r.slug}`,
      platform: 'entraId',
      platformLabel: 'Entra ID',
      platformColor: '#0078d4',
      name: r.name,
      description: r.description,
      tier: r.eamTier,
      tierColor: entraColors[r.eamTier] ?? '#6b7280',
      href: `/entraid/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      corpus: [r.name, r.description, r.richDescription ?? '', perms].join(' '),
      extra: [r.richDescription ?? '', perms].join(' '),
    })
  }

  // ── Azure RBAC ──
  for (const r of AZURE_ROLES) {
    drafts.push({
      key: `azureRbac:${r.slug}`,
      platform: 'azureRbac',
      platformLabel: 'Azure RBAC',
      platformColor: '#5c2d91',
      name: r.name,
      description: r.description,
      tier: r.tier,
      tierColor: azureColors[r.tier] ?? '#6b7280',
      href: `/azure-rbac/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      corpus: [r.name, r.description, r.category].join(' '),
      extra: r.category,
    })
  }

  // ── Google Workspace ──
  for (const r of GWS_ROLES) {
    drafts.push({
      key: `gws:${r.slug}`,
      platform: 'googleWorkspace',
      platformLabel: 'Google Workspace',
      platformColor: '#34a853',
      name: r.name,
      description: r.description,
      tier: r.tier,
      tierColor: gwsColors[r.tier] ?? '#6b7280',
      href: `/google-workspace/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      corpus: [r.name, r.description, ...(r.privileges ?? [])].join(' '),
      extra: (r.privileges ?? []).join(' '),
    })
  }

  // ── IBM Cloud ──
  for (const r of IBM_ROLES) {
    const meta = IBM_TIER_META[r.tier]
    drafts.push({
      key: `ibm:${r.slug}`,
      platform: 'ibmCloud',
      platformLabel: 'IBM Cloud',
      platformColor: '#08bdba',
      name: r.name,
      description: r.description,
      tier: meta?.label ?? r.tier,
      tierColor: meta?.color ?? '#6b7280',
      href: `/ibm-cloud/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      // `privileges` saiu do IbmRole na recoleta de 03/08; `actions` vem vazio
      // de propósito (a IBM mapeia ação por serviço, não por role).
      corpus: [r.name, r.description, r.category, ...(r.actions ?? [])].join(' '),
      extra: [r.category, ...(r.actions ?? [])].join(' '),
    })
  }

  // ── GCP IAM ──
  for (const r of GCP_ROLES) {
    const meta = GCP_TIER_META[r.tier]
    drafts.push({
      key: `gcp:${r.slug}`,
      platform: 'gcp',
      platformLabel: 'GCP IAM',
      platformColor: '#4285f4',
      name: r.name,
      description: r.description,
      tier: meta?.label ?? r.tier,
      tierColor: meta?.color ?? '#6b7280',
      href: `/gcp/roles/${r.slug}`,
      isPrivileged: r.isPrivileged,
      deprecated: r.deprecated,
      // As permissões do GCP saíram do bundle (public/gcp-perms/), então o
      // corpus usa só os metadados. Buscar por permissão é papel do
      // Permission Scope, que carrega o índice sob demanda.
      corpus: [r.name, r.description, r.category, r.roleId].join(' '),
      extra: [r.category, r.roleId].join(' '),
    })
  }

  // ── AWS IAM ──
  for (const p of AWS_POLICIES) {
    const meta = AWS_TIER_META[p.tier]
    drafts.push({
      key: `aws:${p.slug}`,
      platform: 'aws',
      platformLabel: 'AWS IAM',
      platformColor: '#ff9900',
      name: p.name,
      description: p.description,
      tier: meta?.label ?? p.tier,
      tierColor: meta?.color ?? '#6b7280',
      href: `/aws/policies/${p.slug}`,
      isPrivileged: p.isPrivileged,
      deprecated: p.deprecated,
      // As actions da AWS saíram do bundle (public/aws-policy-docs/), então o
      // corpus usa só metadados. Busca por action é papel do Permission Scope.
      corpus: [p.name, p.description, p.category, p.arn, p.type].join(' '),
      extra: [p.category, p.arn, p.type].join(' '),
    })
  }

  // Tokeniza uma vez e guarda. A versão anterior tokenizava o corpus inteiro
  // de TODAS as roles a cada tecla digitada — 4.603 documentos por busca.
  const df = new Map<string, number>()
  let sumName = 0, sumDesc = 0, sumExtra = 0

  const roles: AdvisorRole[] = drafts.map((d) => {
    const nameTokens  = tokenize(d.name)
    const descTokens  = tokenize(d.description)
    const extraTokens = tokenize(d.extra)
    sumName += nameTokens.length
    sumDesc += descTokens.length
    sumExtra += extraTokens.length

    // DF conta DOCUMENTO, não ocorrência: um termo repetido 40 vezes na mesma
    // role conta 1. É o que faz "azure" valer pouco e "kubernetes" valer muito.
    const seen = new Set([...nameTokens, ...descTokens, ...extraTokens])
    seen.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1))

    const { extra: _drop, ...rest } = d
    return { ...rest, nameTokens, descTokens, extraTokens }
  })

  const n = roles.length || 1
  INDEX = {
    roles,
    df,
    avgName: sumName / n,
    avgDesc: sumDesc / n,
    avgExtra: sumExtra / n,
  }
  return INDEX
}

/** Quantas roles o índice cobre. A interface precisa do número certo. */
export async function getIndexSize(): Promise<number> {
  return (await buildIndex()).roles.length
}

// ── BM25F ────────────────────────────────────────────────────────────────────
// Três campos com pesos diferentes: o nome vale mais que a descrição, que vale
// mais que o resto. A saturação do BM25 é o que impede o defeito antigo de
// "frequência × 0,5" — uma role cujo corpus repete o termo 40 vezes não pode
// enterrar a role cujo NOME é o termo.

const K1 = 1.2
const W_NAME = 3.4
const W_DESC = 1.5
const W_EXTRA = 0.8

// `b` POR CAMPO, e não um 0,75 para todos.
//
// Achado de 07/08: com b único, "resetar senha de usuário" devolvia "Azure
// Kubernetes Service Cluster User Role" em primeiro e NENHUMA role do Entra no
// top 14 — enquanto "senha" sozinha acertava Password Administrator em
// primeiro. A causa é a descrição da AKS: "List cluster user credential
// action", quatro palavras. Normalizar por comprimento com b alto multiplicava
// esse campo por ~5, e três termos fracos num texto curtíssimo passavam à
// frente de dois termos fortes numa descrição de tamanho normal.
//
// Nome quase não varia de tamanho, então normalizar pouco (0,5). Descrição
// varia por estilo de redação do provedor, não por relevância — normaliza menos
// ainda (0,35). O corpus extra varia de zero a milhares de tokens (as
// permissões das roles do Entra vão nele), e aí a normalização precisa ser
// forte (0,9).
const B_NAME = 0.5
const B_DESC = 0.35
const B_EXTRA = 0.9

// Piso do normalizador: nenhum campo pode valer mais que o dobro por ser curto.
const NORM_FLOOR = 0.5

function count(tokens: string[], term: string): number {
  let c = 0
  for (const t of tokens) if (t === term) c++
  return c
}

function idf(df: number, n: number): number {
  return Math.log(1 + (n - df + 0.5) / (df + 0.5))
}

/** Contribuição de um único termo para uma role. */
function termScore(role: AdvisorRole, rawTerm: string, ix: AdvisorIndex): number {
  // O índice guarda token stemizado; a expansão vem crua do léxico.
  const term = stem(rawTerm)
  const d = ix.df.get(term)
  if (!d) return 0

  const tfName  = count(role.nameTokens, term)
  const tfDesc  = count(role.descTokens, term)
  const tfExtra = count(role.extraTokens, term)
  if (tfName + tfDesc + tfExtra === 0) return 0

  const norm = (len: number, avg: number, b: number) =>
    Math.max(NORM_FLOOR, 1 - b + b * (len / (avg || 1)))
  const tf =
    W_NAME  * tfName  / norm(role.nameTokens.length,  ix.avgName,  B_NAME) +
    W_DESC  * tfDesc  / norm(role.descTokens.length,  ix.avgDesc,  B_DESC) +
    W_EXTRA * tfExtra / norm(role.extraTokens.length, ix.avgExtra, B_EXTRA)

  return idf(d, ix.roles.length) * (tf * (K1 + 1)) / (tf + K1)
}

/**
 * Um termo pontua pelo melhor entre ele mesmo e as expansões dele — nunca pela
 * soma. "leitura" abre em read/reader/viewer; somar daria pontos em dobro a uma
 * role chamada "Storage Blob Data Reader", que casa com dois deles pelo mesmo
 * motivo.
 */
function scoreTermWithExpansion(role: AdvisorRole, term: string, ix: AdvisorIndex): number {
  let best = termScore(role, term, ix)
  for (const { word, weight } of expand(term)) {
    const s = termScore(role, word, ix) * weight
    if (s > best) best = s
  }
  return best
}

/** A role toca um conceito excluído? Nome e descrição pesam mais que o resto. */
function exclusionHit(role: AdvisorRole, excluded: string[], ix: AdvisorIndex): 'name' | 'body' | null {
  for (const term of excluded) {
    // Só a tradução DIRETA elimina. Vizinhança fraca ("billing" → "budget")
    // eliminando role seria censura por palpite: derrubar por engano é pior que
    // mostrar de menos, porque o que sumiu não aparece em lugar nenhum.
    const variants = [term, ...expand(term).filter((e) => e.weight >= STRONG_WEIGHT).map((e) => e.word)]
      .map(stem)
    for (const v of variants) {
      if (role.nameTokens.includes(v)) return 'name'
    }
    for (const v of variants) {
      if (role.descTokens.includes(v) || role.extraTokens.includes(v)) return 'body'
    }
  }
  void ix
  return null
}

// ── Busca ────────────────────────────────────────────────────────────────────

/** Abaixo desta fração do melhor resultado, a role não entra na lista. */
const RELEVANCE_FLOOR = 0.30

export async function searchRoles(
  query: string,
  platformFilter: AdvisorPlatform | 'all' = 'all',
  topN = 30,
): Promise<AdvisorResponse> {
  const ix = await buildIndex()
  const plan = planQuery(query, platformFilter)

  const empty: AdvisorResponse = { results: [], plan, confidence: 'low', candidates: 0 }
  if (plan.terms.length === 0) return empty

  const pool = plan.scopedPlatforms.length
    ? ix.roles.filter((r) => plan.scopedPlatforms.includes(r.platform))
    : ix.roles

  const scored: AdvisorResult[] = []
  const termHits = new Set<string>()

  for (const role of pool) {
    // Exclusão vem antes da pontuação: gastar cálculo numa role que a pessoa
    // já disse que não quer é desperdício, e deixá-la na lista é o defeito nº 1.
    const hit = exclusionHit(role, plan.excluded, ix)
    if (hit === 'name') continue

    let score = 0
    const matched: string[] = []
    for (const term of plan.terms) {
      const s = scoreTermWithExpansion(role, term, ix)
      if (s > 0) { score += s; matched.push(term); termHits.add(term) }
    }
    if (score <= 0) continue

    // COORDENAÇÃO: quem atende mais partes do pedido sobe.
    // Sem isto, a soma pura deixa uma role que casa um termo muito forte
    // empatar com outra que casa a frase inteira — e a frase inteira é o
    // pedido. O fator é suave de propósito (0,5 a 1,0): frase longa quase nunca
    // tem uma role que cubra tudo, e um fator agressivo esvaziaria a lista.
    score *= 0.5 + 0.5 * (matched.length / plan.terms.length)

    // O conceito excluído aparece só no corpo: não dá para afirmar que a role
    // concede aquilo (pode ser menção de passagem), então penaliza forte em vez
    // de eliminar.
    if (hit === 'body') score *= 0.2

    // Penalidade de privilégio só quando NÃO foi pedido poder alto.
    if (role.isPrivileged && !plan.wantsPrivileged) score *= 0.88

    // Recomendar role que o provedor descontinuou é defeito, não preferência.
    if (role.deprecated) score *= 0.45

    scored.push({ role, score, relevance: 0, matchedTerms: matched })
  }

  scored.sort((a, b) => b.score - a.score)
  const candidates = scored.length
  if (candidates === 0) {
    return { ...empty, plan: { ...plan, unmatched: plan.terms } }
  }

  const top = scored[0].score
  const results = scored
    .filter((r) => r.score >= top * RELEVANCE_FLOOR)
    .slice(0, topN)
    .map((r) => ({ ...r, relevance: r.score / top }))

  // Confiança = quanto do que a pessoa pediu o PRIMEIRO resultado atende. É
  // uma medida do encaixe, não do tamanho da lista: 30 resultados que atendem
  // um terço da frase são 30 respostas erradas.
  const coverage = results[0].matchedTerms.length / plan.terms.length
  const confidence = coverage >= 0.67 ? 'high' : coverage >= 0.34 ? 'medium' : 'low'

  return {
    results,
    plan: { ...plan, unmatched: plan.terms.filter((t) => !termHits.has(t)) },
    confidence,
    candidates,
  }
}

export type { AdvisorRole as Role }
