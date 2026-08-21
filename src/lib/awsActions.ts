import type { AwsTier } from '@/data/aws'

/**
 * Índice de actions da AWS.
 *
 * MUDANÇA IMPORTANTE: as actions não vivem mais em AWS_POLICIES[].actions.
 * São 16.117 actions distintas espalhadas por 1.553 policies — no bundle isso
 * custava ~1,7 MB de JS. Ficam em public/aws-actions-index.json, gerado por
 * scripts/fetch-aws-policies-official.js e buscado sob demanda; o documento
 * JSON oficial de cada policy fica em public/aws-policy-docs/<slug>.json.
 * Mesmo desenho de Azure e GCP.
 *
 * Por isso getAwsActions() agora é assíncrono. Para exibir apenas a contagem,
 * use AWS_ACTION_COUNT / AWS_SERVICE_COUNT de '@/data/aws', que são constantes
 * e não disparam download.
 */

export interface AwsPolicyRef { name: string; slug: string; isPrivileged: boolean }

export interface AwsActionEntry {
  action: string        // ex.: s3:GetObject ou s3:* (wildcards preservados)
  service: string       // ex.: s3
  operation: string     // ex.: GetObject ou *
  isWildcard: boolean
  tier: AwsTier
  /** Policies que CONCEDEM (statement com Effect diferente de Deny). */
  usedByPolicies: AwsPolicyRef[]
  /**
   * Policies que NEGAM esta action explicitamente.
   *
   * Não é o mesmo que "não concede": é uma proibição declarada, que vence
   * qualquer concessão na avaliação do IAM. É o que as três
   * `AWSCompromisedKeyQuarantine` fazem, e até 21/08/2026 elas apareciam do
   * lado errado — como se concedessem as 99 actions que existem para bloquear.
   */
  deniedByPolicies: AwsPolicyRef[]
  isUsedByPrivileged: boolean
}

/** Formato de public/aws-actions-index.json — ver scripts/build-aws-actions-index.js */
interface AwsActionsIndex {
  slugs: string[]
  /** action -> policies que concedem */
  index: Record<string, number[]>
  /** action -> policies que negam. Ausente em índices gerados antes de 21/08/2026. */
  denied?: Record<string, number[]>
}

const TIER_ORDER: Record<AwsTier, number> = {
  FullAccess: 0, PowerUser: 1, Operator: 2, Specialized: 3, ReadOnly: 4,
}

let _cache: AwsActionEntry[] | null = null
let _inflight: Promise<AwsActionEntry[]> | null = null

/**
 * slug da policy -> padrões que ela NEGA.
 *
 * Invertido de `denied` e guardado por policy porque a pergunta que importa na
 * busca é por policy, não por entrada do índice: a `AdministratorAccess`
 * concede `*` e não nega nada; uma policy de quarentena pode conceder `*` num
 * statement e negar `iam:CreateUser` em outro. Sem esta inversão, a expansão
 * de wildcard afirmaria que ela concede exatamente o que ela existe para
 * bloquear.
 */
let _denyBySlug: Map<string, string[]> | null = null

/** null = índice ainda não carregado (ou gerado antes de existir `denied`). */
export function getAwsDenyBySlug(): Map<string, string[]> | null {
  return _denyBySlug
}

/** Já carregado? Devolve sem disparar rede. */
export function getAwsActionsSync(): AwsActionEntry[] | null {
  return _cache
}

export async function getAwsActions(): Promise<AwsActionEntry[]> {
  if (_cache) return _cache
  if (_inflight) return _inflight

  _inflight = (async () => {
    const res = await fetch('/aws-actions-index.json')
    if (!res.ok) throw new Error(`Falha ao carregar aws-actions-index.json (HTTP ${res.status})`)
    const data: AwsActionsIndex = await res.json()

    // aws.ts tem 871 kB e só é preciso para resolver slug -> nome/tier da
    // policy. Entra por import dinâmico: quem só monta o índice de actions não
    // paga o dataset no First Load.
    const { AWS_POLICIES } = await import('@/data/aws')
    const bySlug = new Map(AWS_POLICIES.map((p) => [p.slug, p]))
    const out: AwsActionEntry[] = []

    for (const [action, policyIdxs] of Object.entries(data.index)) {
      const colonIdx = action.indexOf(':')
      const entry: AwsActionEntry = {
        action,
        service: colonIdx === -1 ? action : action.substring(0, colonIdx),
        operation: colonIdx === -1 ? '' : action.substring(colonIdx + 1),
        isWildcard: action.includes('*'),
        tier: 'ReadOnly',
        usedByPolicies: [],
        deniedByPolicies: [],
        isUsedByPrivileged: false,
      }
      let best = Number.POSITIVE_INFINITY
      for (const i of policyIdxs) {
        const policy = bySlug.get(data.slugs[i])
        if (!policy) continue
        entry.usedByPolicies.push({
          name: policy.name, slug: policy.slug, isPrivileged: policy.isPrivileged,
        })
        if (policy.isPrivileged) entry.isUsedByPrivileged = true
        const order = TIER_ORDER[policy.tier]
        if (order < best) { best = order; entry.tier = policy.tier }
      }
      out.push(entry)
    }

    // Quem nega. Uma action que SÓ aparecia em Deny não está mais em `index`,
    // então não vira entrada — ela nunca foi concedida por policy nenhuma.
    const denyMap = new Map<string, string[]>()
    const byAction = new Map(out.map((e) => [e.action, e]))
    for (const [action, policyIdxs] of Object.entries(data.denied ?? {})) {
      for (const i of policyIdxs) {
        const policy = bySlug.get(data.slugs[i])
        if (!policy) continue
        const arr = denyMap.get(policy.slug)
        if (arr) arr.push(action); else denyMap.set(policy.slug, [action])
        byAction.get(action)?.deniedByPolicies.push({
          name: policy.name, slug: policy.slug, isPrivileged: policy.isPrivileged,
        })
      }
    }
    _denyBySlug = denyMap

    out.sort((a, b) => {
      // não-wildcards primeiro, depois alfabético
      if (a.isWildcard !== b.isWildcard) return a.isWildcard ? 1 : -1
      return a.action.localeCompare(b.action)
    })

    _cache = out
    _inflight = null
    return out
  })()

  return _inflight
}

export async function getAwsServices(): Promise<string[]> {
  return [...new Set((await getAwsActions()).map((a) => a.service).filter(Boolean))].sort()
}

/** Documento JSON oficial + actions de uma policy, sem baixar o índice inteiro. */
export interface AwsPolicyDoc {
  arn: string
  version?: string
  document: unknown
  actions: string[]
  notActions: string[]
}

export async function getAwsPolicyDoc(slug: string): Promise<AwsPolicyDoc> {
  const res = await fetch(`/aws-policy-docs/${slug}.json`)
  if (!res.ok) throw new Error(`Falha ao carregar o documento de ${slug} (HTTP ${res.status})`)
  return res.json()
}
