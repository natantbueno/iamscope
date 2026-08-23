// ── Avaliar uma role que NÃO está no catálogo, pelas permissões dela ────────
//
// O PEDIDO QUE ISTO ATENDE
//   "Quando é incluído um JSON de uma role Custom (…) ele não traz a
//   informação. Gostaria que o site identificasse esses cenários e avaliasse
//   aquela role, mesmo não sendo uma que está dentro do Site. Seria legal
//   também o site sugerir um novo para essa role baseado nas permissões que
//   ela possui."
//
//   Antes, uma role custom rendia tier "N/D", seção de risco vazia e só a
//   lista crua de permissões. Este módulo responde três coisas usando
//   exclusivamente o que já está no navegador.
//
// A PROMESSA DO PRODUTO CONTINUA VALENDO
//   Nada aqui fala com a rede além dos MESMOS índices estáticos que o
//   Permission Scope já baixa do próprio site. O JSON colado não sai do
//   navegador — ver "A linha do que sai do navegador" no PRODUCT.md.
//
// ═══════════════════════════════════════════════════════════════════════════
// O MÉTODO, E POR QUE ELE É ESTE
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. NÍVEL DE UMA PERMISSÃO = o nível do papel MENOS privilegiado que a
//    concede.
//
//    A tentação é pegar o mais privilegiado, e ela está errada: a
//    AdministratorAccess concede `iam:ListUsers`, então pelo critério do mais
//    privilegiado TODA permissão seria Tier 0. Perguntar "qual é o papel mais
//    fraco que já dá isso?" é o que separa uma ação de leitura de uma ação de
//    controle: se só papel de plano de controle concede, a permissão é de
//    plano de controle.
//
// 2. NÍVEL DA ROLE = o da permissão MAIS perigosa que ela contém.
//
//    Uma role com noventa ações de leitura e uma de escrita em role
//    assignment é uma role de plano de controle. Média esconderia isso.
//
// 3. ROLE CATALOGADA MAIS PRÓXIMA = a que cobre mais permissões coladas, e
//    entre as empatadas, a que traz MENOS permissão a mais.
//
//    O segundo critério é o que transforma a sugestão em least privilege. Sem
//    ele, a resposta de toda role custom da AWS seria "AdministratorAccess",
//    que cobre 100% de qualquer coisa.
//
// O QUE ISTO NÃO É
//   Não é a classificação oficial de provedor nenhum, e não é a classificação
//   do catálogo: é uma ESTIMATIVA derivada do catálogo, e a interface precisa
//   dizer isso com todas as letras, junto de quantas permissões foram
//   reconhecidas — uma estimativa feita sobre 3 de 40 ações não vale o mesmo
//   que uma feita sobre 38 de 40.

import type { EvaluateCloud } from './evaluate'
import type { EamLevel } from './eamLevels'
import { isWildcardPattern, looksLikeConcreteAction, wildcardMatches } from './wildcardMatch'
import { getCloudUrl } from '@/data/compare/types'

/** Teto de permissões analisadas. Acima disso a interface avisa (nunca corta calada). */
export const MAX_PERMISSIONS_ANALYZED = 600

export interface NearestRole {
  name: string
  slug: string
  url: string
  tierLabel: string
  level: EamLevel | null
  isPrivileged: boolean
  /** Quantas das permissões coladas esta role concede. */
  covered: number
  /** Fração sobre as permissões RECONHECIDAS, não sobre as coladas. */
  coverage: number
  /** Quantas das coladas ela concede citando o nome da ação. */
  exact: number
  /** Padrões que cobriram o resto (`s3:Get*`). Vazio = cobertura toda por nome. */
  viaPatterns: string[]
  /** Ações que a role concede além das suas — o excesso de privilégio. */
  excess: number
  /** Abrangência da role: ações conhecidas que ela concede, com padrões expandidos. */
  total: number
}

export interface PermissionAnalysis {
  cloud: EvaluateCloud
  /** A plataforma publica ação por role? GWS e IBM não. */
  supported: boolean
  pasted: number
  analyzed: number
  truncated: boolean
  recognised: number
  unknown: string[]
  /** Nível estimado, ou null se nada foi reconhecido. */
  level: EamLevel | null
  /** Permissões que só aparecem em papéis de plano de controle. */
  controlPlane: string[]
  /** Permissões que só aparecem em papéis marcados como privilegiados. */
  onlyPrivileged: string[]
  nearest: NearestRole[]
  /**
   * Roles que cobrem as permissões coladas só porque concedem `*`.
   *
   * Ficam fora do ranking de proximidade de propósito — "a AdministratorAccess
   * cobre a sua role" é verdade e é inútil —, mas some-las da tela seria
   * esconder que elas concedem. Então aparecem contadas à parte.
   */
  blanketRoles: string[]
  /** Conflitos de SoD da role mais próxima — não da role colada. */
  sod: { roleName: string; coverage: number; rules: { id: string; name: string; severity: string }[] } | null
}

// ── Índice invertido, uniforme para as quatro clouds que têm dado ───────────

interface RoleMeta {
  name: string; slug: string; tierLabel: string
  level: EamLevel | null; isPrivileged: boolean; total: number
}

interface CloudIndex {
  /** permissão em minúsculas -> posições em `roles`. */
  byPermission: Map<string, Set<number>>
  /** Só as chaves que contêm `*`, na grafia original. */
  wildcards: string[]
  wildcardOwners: Map<string, Set<number>>
  /** posição -> padrões que a role NEGA (Deny da AWS, NotActions do Azure). */
  negByRole: Map<number, string[]>
  roles: RoleMeta[]
  /** posição -> tudo que a role concede, exato e padrão. Para medir abrangência. */
  keysByRole: string[][]
  /** Ações concretas (sem `*`) agrupadas pelo prefixo antes de `:` ou `/`. */
  concreteByBucket: Map<string, string[]>
  concreteAll: string[]
  /** Memo de `breadthOf`. */
  breadth: Map<number, number>
}

interface RawIndex { slugs: string[]; index: Record<string, number[]>; denied?: Record<string, number[]> }

const _cache = new Map<EvaluateCloud, CloudIndex | null>()

function addTo(map: Map<string, Set<number>>, key: string, i: number) {
  const k = key.toLowerCase()
  const s = map.get(k)
  if (s) s.add(i); else map.set(k, new Set([i]))
}

/**
 * Monta o índice a partir do formato `{ slugs, index, denied }` — o mesmo dos
 * três arquivos de public/ (aws-actions-index, azure-perms-index,
 * gcp-perms-index). O `denied` só existe nos dois primeiros.
 */
function fromRaw(raw: RawIndex, metaBySlug: Map<string, RoleMeta>): CloudIndex {
  const roles: RoleMeta[] = raw.slugs.map((s) => metaBySlug.get(s) ?? {
    name: s, slug: s, tierLabel: '', level: null, isPrivileged: false, total: 0,
  })
  const byPermission = new Map<string, Set<number>>()
  const wildcardOwners = new Map<string, Set<number>>()
  for (const [perm, idxs] of Object.entries(raw.index)) {
    for (const i of idxs) addTo(byPermission, perm, i)
    if (isWildcardPattern(perm)) {
      const s = wildcardOwners.get(perm) ?? new Set<number>()
      for (const i of idxs) s.add(i)
      wildcardOwners.set(perm, s)
    }
  }
  const negByRole = new Map<number, string[]>()
  for (const [pattern, idxs] of Object.entries(raw.denied ?? {})) {
    for (const i of idxs) {
      const arr = negByRole.get(i)
      if (arr) arr.push(pattern); else negByRole.set(i, [pattern])
    }
  }
  const keysByRole: string[][] = roles.map(() => [])
  for (const [perm, idxs] of Object.entries(raw.index)) for (const i of idxs) keysByRole[i]?.push(perm)
  return finish({ byPermission, wildcardOwners, negByRole, roles, keysByRole })
}

/** Prefixo antes de `:` (AWS) ou `/` (Azure/Entra). GCP não tem separador — cai no todo. */
function bucketOf(key: string): string {
  const i = key.search(/[:/]/)
  return (i > 0 ? key.slice(0, i) : key).toLowerCase()
}

function finish(parcial: {
  byPermission: Map<string, Set<number>>
  wildcardOwners: Map<string, Set<number>>
  negByRole: Map<number, string[]>
  roles: RoleMeta[]
  keysByRole: string[][]
}): CloudIndex {
  const concreteAll: string[] = []
  const concreteByBucket = new Map<string, string[]>()
  for (const k of parcial.byPermission.keys()) {
    if (isWildcardPattern(k)) continue
    concreteAll.push(k)
    const b = bucketOf(k)
    const arr = concreteByBucket.get(b)
    if (arr) arr.push(k); else concreteByBucket.set(b, [k])
  }
  return {
    ...parcial,
    wildcards: [...parcial.wildcardOwners.keys()],
    concreteAll, concreteByBucket, breadth: new Map(),
  }
}

/**
 * Quantas ações CONHECIDAS a role concede de fato, expandindo os padrões dela.
 *
 * POR QUE NÃO BASTA O `actionCount` / `permissionCount` DO CATÁLOGO
 *   Esses campos contam STRINGS ESCRITAS na definição da role. A
 *   `AmazonS3FullAccess` tem duas (`s3:*` e `s3-object-lambda:*`) e concede
 *   milhares de ações. Usar aquele número como "tamanho da role" fazia a
 *   sugestão de menor privilégio eleger justamente as roles mais amplas, que
 *   por acaso se escrevem em poucas linhas.
 *
 *   O denominador aqui são as ações que o catálogo conhece — não o universo do
 *   provedor. É o que dá para afirmar sem o arquivo do
 *   fetch-aws-actions-universe.js, e a interface diz isso.
 *
 * CUSTO
 *   Cada padrão só varre o balde do próprio serviço (`s3:*` olha as ações que
 *   começam com `s3:`), então a conta é local. Padrão que começa com `*`
 *   (o `*\/read` do Azure) varre a lista inteira, e são poucos. O resultado é
 *   memoizado por role, e só as candidatas mais bem colocadas são medidas.
 */
function breadthOf(ci: CloudIndex, i: number): number {
  const memo = ci.breadth.get(i)
  if (memo != null) return memo
  const vistas = new Set<string>()
  for (const k of ci.keysByRole[i] ?? []) {
    if (!isWildcardPattern(k)) { vistas.add(k.toLowerCase()); continue }
    const pool = k.startsWith('*') ? ci.concreteAll : (ci.concreteByBucket.get(bucketOf(k)) ?? [])
    for (const c of pool) if (wildcardMatches(k, c)) vistas.add(c)
  }
  ci.breadth.set(i, vistas.size)
  return vistas.size
}

async function loadCloudIndex(cloud: EvaluateCloud): Promise<CloudIndex | null> {
  if (_cache.has(cloud)) return _cache.get(cloud)!

  const built = await build(cloud)
  _cache.set(cloud, built)
  return built

  async function build(c: EvaluateCloud): Promise<CloudIndex | null> {
    if (c === 'entraId') {
      // Único caso em que as permissões estão no bundle: ROLES já traz
      // permissions[] por role. Nada é baixado.
      const [{ ROLES }, lv] = await Promise.all([import('@/data/roles'), import('./eamLevels')])
      const roles: RoleMeta[] = ROLES.map((r) => ({
        name: r.name, slug: r.slug, tierLabel: r.eamTier,
        level: lv.ENTRA_TIER_LEVEL[r.eamTier], isPrivileged: r.isPrivileged,
        total: r.permissions.length,
      }))
      const byPermission = new Map<string, Set<number>>()
      const wildcardOwners = new Map<string, Set<number>>()
      ROLES.forEach((r, i) => {
        for (const p of r.permissions) {
          addTo(byPermission, p.action, i)
          if (isWildcardPattern(p.action)) {
            const s = wildcardOwners.get(p.action) ?? new Set<number>()
            s.add(i); wildcardOwners.set(p.action, s)
          }
        }
      })
      const keysByRole: string[][] = ROLES.map((r) => r.permissions.map((p) => p.action))
      return finish({ byPermission, wildcardOwners, negByRole: new Map(), roles, keysByRole })
    }

    const arquivo = c === 'azureRbac' ? '/azure-perms-index.json'
      : c === 'aws' ? '/aws-actions-index.json'
      : c === 'gcp' ? '/gcp-perms-index.json'
      : null
    // Google Workspace e IBM Cloud ficam de fora, e não é omissão: o Google
    // publica a lista com identificador de API para 2 das 14 roles, e a IBM
    // não publica ação por role — cada serviço mapeia as próprias.
    if (!arquivo) return null

    try {
      const res = await fetch(arquivo)
      if (!res.ok) return null
      const raw = (await res.json()) as RawIndex
      const lv = await import('./eamLevels')
      const metaBySlug = new Map<string, RoleMeta>()

      if (c === 'azureRbac') {
        const { AZURE_ROLES, AZURE_TIER_META } = await import('@/data/azureRbac')
        for (const r of AZURE_ROLES) metaBySlug.set(r.slug, {
          name: r.name, slug: r.slug, tierLabel: AZURE_TIER_META[r.tier]?.label ?? r.tier,
          level: lv.AZURE_TIER_LEVEL[r.tier], isPrivileged: r.isPrivileged, total: r.permissionCount,
        })
      } else if (c === 'aws') {
        const { AWS_POLICIES, AWS_TIER_META } = await import('@/data/aws')
        for (const p of AWS_POLICIES) metaBySlug.set(p.slug, {
          name: p.name, slug: p.slug, tierLabel: AWS_TIER_META[p.tier]?.label ?? p.tier,
          level: lv.AWS_TIER_LEVEL[p.tier], isPrivileged: p.isPrivileged, total: p.actionCount,
        })
      } else {
        const { GCP_ROLES, GCP_TIER_META } = await import('@/data/gcp')
        for (const r of GCP_ROLES) metaBySlug.set(r.slug, {
          name: r.name, slug: r.slug, tierLabel: GCP_TIER_META[r.tier]?.label ?? r.tier,
          level: lv.GCP_TIER_LEVEL[r.tier], isPrivileged: r.isPrivileged, total: r.permissionCount,
        })
      }
      return fromRaw(raw, metaBySlug)
    } catch {
      return null
    }
  }
}

/**
 * O `*` sozinho, e por que ele é tratado à parte de todos os outros padrões.
 *
 * A primeira versão deste módulo tratava `*` como qualquer wildcard, e o
 * resultado foi absurdo nos dois sentidos:
 *
 *   - A **role mais próxima** de uma policy que só lê do S3 virava
 *     `AdministratorAccess`, com 100% de cobertura e zero excesso — porque o
 *     "excesso" é medido pela contagem de actions, e a AdministratorAccess tem
 *     UMA action escrita (`*`). O critério de menor privilégio elegia
 *     justamente o maior privilégio que existe.
 *   - Uma ação **inventada** (`foo:BarBaz`) aparecia como reconhecida e de
 *     plano de controle, porque `*` casa com ela.
 *
 * A causa é a mesma: `*` não diz nada sobre a ação específica. `s3:Get*` diz
 * ("é uma leitura do S3"); `*` não. Então ele fica fora do reconhecimento, do
 * nível estimado e do ranking — e é contado à parte, para a interface poder
 * dizer quantas roles concedem tudo.
 */
const BLANKET = '*'

interface Grantors {
  /** Concedem citando a ação pelo nome. */
  exact: Set<number>
  /** Concedem por padrão que nomeia serviço ou verbo -> o padrão usado. */
  viaPattern: Map<number, string>
  /** Concedem só porque concedem `*`. Não entram em nenhuma conta. */
  blanket: Set<number>
}

function grantorsOf(ci: CloudIndex, perm: string): Grantors {
  const alvo = perm.trim().toLowerCase()
  const exact = new Set<number>(ci.byPermission.get(alvo) ?? [])
  const viaPattern = new Map<number, string>()
  const blanket = new Set<number>()

  // Mesma regra do Permission Scope: padrão só é expandido quando o que se
  // procura parece o identificador COMPLETO de uma ação.
  if (looksLikeConcreteAction(alvo)) {
    for (const pat of ci.wildcards) {
      if (!wildcardMatches(pat, alvo)) continue
      const donos = ci.wildcardOwners.get(pat) ?? []
      if (pat === BLANKET) { for (const i of donos) blanket.add(i) }
      else for (const i of donos) { if (!exact.has(i) && !viaPattern.has(i)) viaPattern.set(i, pat) }
    }
  }

  // Negação vence concessão — inclusive a que veio por wildcard.
  const negada = (i: number) => {
    const neg = ci.negByRole.get(i)
    return !!neg && neg.some((p) => p.toLowerCase() === alvo || wildcardMatches(p, alvo))
  }
  for (const i of [...exact]) if (negada(i)) exact.delete(i)
  for (const i of [...viaPattern.keys()]) if (negada(i)) viaPattern.delete(i)
  for (const i of [...blanket]) if (negada(i) || exact.has(i) || viaPattern.has(i)) blanket.delete(i)
  return { exact, viaPattern, blanket }
}

const SOD_PLATFORM: Partial<Record<EvaluateCloud, 'entra-id' | 'azure-rbac' | 'aws' | 'gcp'>> = {
  entraId: 'entra-id', azureRbac: 'azure-rbac', aws: 'aws', gcp: 'gcp',
}

/** Abaixo disso, chamar os conflitos da role vizinha de "os seus" seria mentira. */
const SOD_COVERAGE_MIN = 0.6

export async function analyzeByPermissions(
  cloud: EvaluateCloud, permissions: string[],
): Promise<PermissionAnalysis> {
  const limpas = [...new Set(permissions.map((p) => p.trim()).filter(Boolean))]
  const analisadas = limpas.slice(0, MAX_PERMISSIONS_ANALYZED)

  const base: PermissionAnalysis = {
    cloud, supported: true,
    pasted: limpas.length, analyzed: analisadas.length,
    truncated: limpas.length > analisadas.length,
    recognised: 0, unknown: [], level: null,
    controlPlane: [], onlyPrivileged: [], nearest: [], blanketRoles: [], sod: null,
  }

  const ci = await loadCloudIndex(cloud)
  if (!ci) return { ...base, supported: false }
  if (analisadas.length === 0) return base

  const cobertura = new Map<number, number>()
  const exatas = new Map<number, number>()
  const padroes = new Map<number, Set<string>>()
  const blanket = new Set<number>()
  let nivel: EamLevel | null = null

  for (const p of analisadas) {
    const donos = grantorsOf(ci, p)
    for (const i of donos.blanket) blanket.add(i)
    const specific = new Set<number>([...donos.exact, ...donos.viaPattern.keys()])
    if (specific.size === 0) { base.unknown.push(p); continue }
    base.recognised++
    for (const i of donos.exact) exatas.set(i, (exatas.get(i) ?? 0) + 1)
    for (const [i, pat] of donos.viaPattern) {
      const s = padroes.get(i) ?? new Set<string>()
      s.add(pat); padroes.set(i, s)
    }

    let nivelDaPermissao: EamLevel | null = null
    let todosPrivilegiados = true
    for (const i of specific) {
      cobertura.set(i, (cobertura.get(i) ?? 0) + 1)
      const m = ci.roles[i]
      if (!m.isPrivileged) todosPrivilegiados = false
      // MAIOR nível = papel menos privilegiado que concede. Ver o cabeçalho.
      if (m.level != null && (nivelDaPermissao == null || m.level > nivelDaPermissao)) {
        nivelDaPermissao = m.level
      }
    }
    if (nivelDaPermissao === 0) base.controlPlane.push(p)
    if (todosPrivilegiados) base.onlyPrivileged.push(p)
    // MENOR nível entre as permissões = a mais perigosa manda na role.
    if (nivelDaPermissao != null && (nivel == null || nivelDaPermissao < nivel)) nivel = nivelDaPermissao
  }
  base.level = nivel

  base.blanketRoles = [...blanket].map((i) => ci.roles[i].name).sort()

  if (base.recognised > 0) {
    // Duas passadas: a cobertura é barata e ordena tudo; a abrangência é cara
    // e só é medida nas que já chegaram ao topo.
    const brutas = [...cobertura.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)

    const candidatas: NearestRole[] = brutas.map(([i, covered]) => {
      const m = ci.roles[i]
      const alcance = breadthOf(ci, i)
      return {
        name: m.name, slug: m.slug, url: getCloudUrl(cloud, m.slug),
        tierLabel: m.tierLabel, level: m.level, isPrivileged: m.isPrivileged,
        covered, coverage: covered / base.recognised,
        exact: exatas.get(i) ?? 0,
        viaPatterns: [...(padroes.get(i) ?? [])].sort(),
        // O excesso sai da abrangência REAL — padrões expandidos —, e não da
        // contagem de strings do catálogo. Ver breadthOf.
        excess: Math.max(0, alcance - covered),
        total: alcance,
      }
    })

    // Cobertura desc, depois MENOS excesso. O segundo critério é o que faz a
    // resposta ser de menor privilégio: sem ele, a role que concede tudo cobre
    // 100% de qualquer coisa e ganha sempre.
    candidatas.sort((a, b) =>
      b.coverage - a.coverage
      || (a.excess ?? 0) - (b.excess ?? 0)
      || a.name.localeCompare(b.name))
    base.nearest = candidatas.slice(0, 3)

    const topo = base.nearest[0]
    const plataforma = SOD_PLATFORM[cloud]
    if (topo && plataforma && topo.coverage >= SOD_COVERAGE_MIN) {
      try {
        const { findConflictsForRole } = await import('./sod')
        const regras = findConflictsForRole(topo.name, plataforma)
        if (regras.length) {
          base.sod = {
            roleName: topo.name, coverage: topo.coverage,
            rules: regras.slice(0, 8).map((r) => ({ id: r.id, name: r.name, severity: r.severity })),
          }
        }
      } catch { /* o SoD é enfeite aqui; falhar nele não derruba a análise */ }
    }
  }

  return base
}
