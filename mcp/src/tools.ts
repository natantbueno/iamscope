// tools.ts — as sete ferramentas.
//
// Cinco delas são as funções puras do site, chamadas sem uma linha de lógica
// reimplementada. As outras duas existem porque o canal mudou:
//
//   verify_role_names      — o guardrail precisa de uma porta para o modelo bater.
//   compare_equivalent_roles — é a pergunta que só este catálogo responde, e no
//                              site ela mora numa página, não numa função.
//
// UMA COISA QUE ESTA CAMADA CORRIGE, E NÃO SÓ EMBRULHA
//   `findConflictsForRole('roles/bigquery.readOnly', 'gcp')` devolve `[]`.
//   `[]` e "essa role não existe" são a mesma coisa para quem lê o retorno, e a
//   diferença entre as duas é um atestado de saúde falso: o modelo escreve
//   "nenhum conflito de SoD encontrado" para uma role inventada.
//
//   No site isso nunca aparece porque a role vem de um seletor com autocomplete
//   — o nome já foi resolvido antes de chegar na função. Aqui a entrada é texto
//   livre de um modelo, então a resolução tem de ser explícita: nome que não
//   resolve vira erro, nunca lista vazia. Mesma coisa em evaluate_user_roles,
//   onde `riskLevel: 'approved'` sobre zero roles resolvidas é o mesmo atestado.

import { z } from 'zod'
import { searchRoles, type AdvisorPlatform } from '@/lib/roleAdvisor'
import { searchLocalPermissions, ensureLocalPermissionIndex, getLocalIndexStats, CLOUD_TERMS } from '@/lib/permissionScope'
import {
  findConflictsForRole, evaluateUserRoles, matchRoleByName, findSimilarRoleNames,
  type SoDPlatformScope,
} from '@/lib/sod'
import type { SoDPlatform } from '@/data/sod/rules'
import { evaluateRoleSync } from '@/lib/evaluateCatalog'
import equivalences from '@/data/compare/equivalences.json'
import { EAM_META, GCP_TIER_META, AWS_TIER_META, AZURE_TIER_META, GWS_TIER_META, IBM_TIER_META } from '@/data/tierMeta'
import { getLatestSync } from '@/data/syncMeta'
import { getCloudUrl, type CloudId } from '@/data/compare/types'
import { envelope } from './provenance'
import { CATALOG_STATS, CATALOG_TEXT } from './catalogStats'
import { verifyNames, catalogSize, type VerifyPlatform } from './verify'
import { universo, buscarAcoes, expandir, verificarCustomRole, ESCALADA_CURADA } from './azure'

const PLATFORMS = ['entraId', 'azureRbac', 'aws', 'gcp', 'googleWorkspace', 'ibmCloud'] as const
const SOD_PLATFORMS = ['entra-id', 'azure-rbac', 'aws', 'gcp', 'google-workspace'] as const
const SOD_SCOPES = ['all', 'microsoft', 'aws', 'google', ...SOD_PLATFORMS] as const

export interface ToolDef {
  name: string
  title: string
  description: string
  schema: Record<string, z.ZodTypeAny>
  run: (args: any, version: string) => Promise<unknown>
}

const catalogDate = () => getLatestSync()

/** Toda resposta sai com envelope. Nenhuma exceção — é o que carrega a atribuição. */
function wrap(version: string, platforms: string[], payload: Record<string, unknown>) {
  return { _iamscope: envelope(version, catalogDate(), platforms), ...payload }
}

// ── 1. search_roles ─────────────────────────────────────────────────────────

const searchRolesTool: ToolDef = {
  name: 'search_roles',
  title: 'Buscar role por descrição da tarefa',
  description:
    `Busca por termo entre as ${CATALOG_TEXT.roles} roles das seis plataformas (Entra ID, Azure RBAC, AWS IAM, GCP IAM, ` +
    'Google Workspace, IBM Cloud). Aceita a tarefa em linguagem natural — "resetar senha sem dar global admin", ' +
    '"kubernetes sem billing" — e entende exclusão ("sem", "não quero") e escopo de plataforma ("no Azure"). ' +
    'NÃO é busca semântica: não há modelo nem embedding, é BM25F sobre nome, descrição e permissões. ' +
    'Devolve um "plan" com os termos que entendeu e o que não casou — leia-o antes de concluir que algo não existe. ' +
    'Use esta ferramenta antes de citar qualquer nome de role.',
  schema: {
    query: z.string().min(1).describe('A tarefa em linguagem natural, ou o termo. Português ou inglês.'),
    platform: z.enum(['all', ...PLATFORMS]).default('all')
      .describe('Restringe a uma plataforma. Deixe "all" — a busca deduz o escopo do próprio texto.'),
    limit: z.number().int().min(1).max(50).default(10).describe('Máximo de resultados.'),
  },
  async run({ query, platform = 'all', limit = 10 }, version) {
    const res = await searchRoles(query, platform as AdvisorPlatform | 'all', limit)
    return wrap(version, platform === 'all' ? [] : [platform], {
      query,
      confidence: res.confidence,
      candidatesBeforeCutoff: res.candidates,
      plan: {
        terms: res.plan.terms,
        scopedPlatforms: res.plan.scopedPlatforms,
        excluded: res.plan.excluded,
        unmatched: res.plan.unmatched,
        note: res.plan.unmatched.length
          ? `Estes termos não casaram com nada no catálogo: ${res.plan.unmatched.join(', ')}. Diga isso na resposta em vez de preencher a lacuna.`
          : undefined,
      },
      results: res.results.map((r) => ({
        name: r.role.name,
        platform: r.role.platform,
        platformLabel: r.role.platformLabel,
        description: r.role.description,
        tier: r.role.tier,
        isPrivileged: r.role.isPrivileged,
        relevance: Number(r.relevance.toFixed(3)),
        matchedTerms: r.matchedTerms,
        url: `https://iamscope.cloud${r.role.href}`,
      })),
      method:
        'BM25F com IDF real sobre três campos (nome 3,4 · descrição 1,5 · corpus 0,8). ' +
        'Sem IA, sem embedding, nada gerado. tier e isPrivileged são curadoria do IAM Scope.',
    })
  },
}

// ── 2. search_permissions ───────────────────────────────────────────────────

const searchPermissionsTool: ToolDef = {
  name: 'search_permissions',
  title: 'Busca reversa: quem concede esta permissão',
  description:
    'Dada uma permissão, devolve as roles/policies que a concedem — e as que a NEGAM explicitamente. ' +
    'Cobre AWS IAM actions, permissões do GCP, role actions do Entra ID e privilégios do Google Workspace. ' +
    'Expande wildcard quando o texto parece uma action completa: buscar "iam:CreateUser" encontra a ' +
    'AdministratorAccess, que concede "*". O campo deniedBy é o mais acionável do retorno — uma policy que ' +
    'nega a action responde à pergunta tanto quanto uma que concede. ' +
    'Azure RBAC fica de fora deste índice: as permissões dele vivem em arquivos separados que não entram neste pacote.',
  schema: {
    permission: z.string().min(1).describe('A permissão. Ex.: "iam:CreateUser", "storage.buckets.delete", "listKeys".'),
    limitPerCloud: z.number().int().min(1).max(100).default(20).describe('Teto por nuvem, para uma não afogar as outras.'),
    includeWildcard: z.boolean().default(true).describe('Expandir padrões com "*". Só age quando o texto parece uma action completa.'),
  },
  async run({ permission, limitPerCloud = 20, includeWildcard = true }, version) {
    await ensureLocalPermissionIndex()

    // ÍNDICE QUE NÃO CARREGOU NÃO É "NENHUM RESULTADO".
    //
    // `ensureLocalPermissionIndex` usa `Promise.allSettled` — desenho do site, e
    // certo lá: se o índice de uma nuvem falhar, as outras continuam valendo numa
    // página que já está aberta. O efeito colateral é que a falha some, e a busca
    // devolve zero.
    //
    // Medido: com `data/` ausente (é saída de build, não vem no git), o servidor
    // subia normalmente e `iam:CreateUser` respondia `totalMatches: 0` — a mesma
    // resposta que "esta permissão não existe". Um modelo lendo isso conclui a
    // segunda, que é falsa, e diz que ninguém concede a action.
    //
    // Aqui a distinção precisa ser explícita: falta de índice é ERRO, não vazio.
    const stats = getLocalIndexStats()
    const ausentes = (['aws', 'gcp'] as const).filter((c) => !stats[c])
    if (ausentes.length) {
      return wrap(version, [], {
        error: 'INDEX_NOT_LOADED',
        permission,
        missingClouds: ausentes,
        message:
          `Os índices de permissão de ${ausentes.join(' e ')} não carregaram, então esta busca não tem resposta — ` +
          `NÃO conclua que a permissão não existe. Falta a pasta data/ do pacote, que é gerada pelo build: ` +
          `rode \`npm run build\` dentro de mcp/, ou reinstale o pacote do npm.`,
      })
    }

    const raw = searchLocalPermissions(permission, limitPerCloud, includeWildcard)
    const { hits, suppressed } = dropCrossCloudWildcards(raw, permission)
    return wrap(version, [], {
      permission,
      totalMatches: hits.length,
      matches: hits.map((m) => ({
        cloud: m.cloud,
        permission: m.permission,
        termFor: CLOUD_TERMS[m.cloud],
        viaWildcard: m.viaWildcard ?? false,
        grantedBy: m.roles.map((r) => ({ name: r.name, slug: r.slug, isPrivileged: r.isPrivileged })),
        deniedBy: (m.deniedBy ?? []).map((r) => ({ name: r.name, slug: r.slug })),
      })),
      suppressedCrossCloudWildcards: suppressed.length
        ? {
            count: suppressed.length,
            entries: suppressed.map((m) => ({ cloud: m.cloud, pattern: m.permission, wouldHaveClaimed: m.roles.map((r) => r.name) })),
            reason:
              `"${permission}" não tem a forma de uma action da AWS (serviço:Ação), então padrões wildcard da AWS ` +
              `não a concedem. Foram removidos da lista porque afirmariam algo falso — a AdministratorAccess da AWS ` +
              `não concede permissão de GCP nem do Entra ID.`,
          }
        : undefined,
      note: hits.length === 0
        ? 'Nenhuma role do catálogo concede esta permissão. Isso pode significar que ela não existe, ou que nenhuma role gerenciada a cobre — não conclua a primeira sem dizer que é uma hipótese.'
        : 'Azure RBAC não está neste índice. A ausência de resultado do Azure não significa que nenhuma role do Azure conceda a permissão.',
    })
  },
}


/**
 * Tira da lista o wildcard da AWS casando permissão que não é da AWS.
 *
 * O DEFEITO, MEDIDO
 *   `search_permissions("storage.buckets.delete")` trazia `aws:*`, concedido por
 *   AdministratorAccess. Idem para `microsoft.directory/users/password/update` e
 *   para qualquer permissão do GCP ou do Entra. A AdministratorAccess da AWS não
 *   concede permissão de GCP — a afirmação é simplesmente falsa, e um modelo que
 *   lê o JSON a repete com a autoridade de quem consultou a fonte.
 *
 *   A origem é `looksLikeConcreteAction()`, que aprova qualquer identificador com
 *   cara de action; o `*` da AWS então casa com tudo. Na tela do site a nuvem
 *   aparece agrupada e a linha se denuncia. Num retorno de ferramenta, não.
 *
 * A REGRA, CONFERIDA CONTRA OS DOIS ÍNDICES EMBUTIDOS
 *   Das 16.423 actions da AWS, todas têm `:` — a única exceção é o próprio `*`.
 *   Das 13.701 permissões do GCP, nenhuma tem `:`. A separação é exata, não
 *   heurística: sem `:` no que foi digitado, wildcard da AWS não se aplica.
 *
 *   Só a AWS tem padrões wildcard nestes índices (medido), então a regra começa e
 *   termina nela. Se outra nuvem passar a ter, isto precisa ser revisto — e o
 *   `suppressed` no retorno é o que torna a revisão possível: o que foi removido
 *   fica visível em vez de sumir.
 *
 * REPORTADO PARA O SITE. Esta camada não corrige `permissionScope.ts` — corrigir
 * ali é decisão de quem mantém a busca, e uma correção duplicada aqui viraria
 * duas verdades sobre a mesma pergunta.
 */
function dropCrossCloudWildcards(hits: ScopeMatchLike[], query: string) {
  const pareceAws = query.includes(':')
  if (pareceAws) return { hits, suppressed: [] as ScopeMatchLike[] }
  const suppressed = hits.filter((m) => m.viaWildcard && m.cloud === 'aws')
  if (suppressed.length === 0) return { hits, suppressed: [] as ScopeMatchLike[] }
  return { hits: hits.filter((m) => !(m.viaWildcard && m.cloud === 'aws')), suppressed }
}

type ScopeMatchLike = ReturnType<typeof searchLocalPermissions>[number]

// ── 3. find_role_conflicts ──────────────────────────────────────────────────

const findRoleConflictsTool: ToolDef = {
  name: 'find_role_conflicts',
  title: 'Conflitos de SoD de uma role',
  description:
    `Todas as regras de segregação de funções (SoD) em que a role aparece. ${CATALOG_TEXT.sodRules} regras curadas em cinco ` +
    'plataformas, com severidade e frameworks (SOX, ISO 27001, PCI-DSS, LGPD/GDPR). ' +
    'Nome que não existe no catálogo devolve ERRO, não lista vazia — "nenhum conflito" sobre uma role ' +
    'inventada é um atestado de saúde falso. ' +
    'NENHUMA regra cruza provedores: acumular AdministratorAccess na AWS e Global Administrator no Entra ID ' +
    'é fato de governança, não conflito de segregação. As regras e as severidades são curadoria do IAM Scope.',
  schema: {
    role: z.string().min(1).describe('Nome exato da role/policy, como aparece na plataforma.'),
    platform: z.enum(SOD_PLATFORMS).describe('Plataforma da role. IBM Cloud está fora do escopo de SoD por decisão de produto.'),
  },
  async run({ role, platform }, version) {
    const resolved = matchRoleByName(role, platform as SoDPlatformScope)
    if (!resolved) {
      const near = findSimilarRoleNames(role, platform as SoDPlatformScope, 3)
      return wrap(version, [platform], {
        error: 'ROLE_NOT_IN_CATALOG',
        query: role,
        platform,
        message:
          `"${role}" não existe no catálogo de ${platform}. Não conclua que ela não tem conflitos de SoD — ` +
          `este servidor não sabe nada sobre ela. Não cite este nome na sua resposta.`,
        didYouMean: near.map((r) => ({ name: r.name, cloud: r.cloud, slug: r.slug })),
      })
    }
    const rules = findConflictsForRole(resolved.name, platform as SoDPlatform)
    return wrap(version, [platform], {
      role: { name: resolved.name, platform: resolved.cloud, slug: resolved.slug, url: `https://iamscope.cloud${resolved.url}` },
      conflictsFound: rules.length,
      conflicts: rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        severity: r.severity,
        category: r.category,
        cloud: r.cloud,
        rationale: r.rationale,
        risk: r.risk,
        mitigation: r.mitigation,
        references: r.references,
        frameworks: r.frameworks,
        roleA: { name: r.roleA.name, cloud: r.roleA.cloud },
        roleB: { name: r.roleB.name, cloud: r.roleB.cloud },
      })),
      note: rules.length === 0
        ? `A role existe e não aparece em nenhuma das ${CATALOG_TEXT.sodRules} regras. Isso quer dizer "não catalogada como conflitante", não "segura".`
        : undefined,
    })
  },
}

// ── 4. evaluate_user_roles ──────────────────────────────────────────────────

const evaluateUserRolesTool: ToolDef = {
  name: 'evaluate_user_roles',
  title: 'Avaliar o conjunto de roles de um usuário',
  description:
    `Cruza todos os pares de uma lista de roles contra as ${CATALOG_TEXT.sodRules} regras de SoD e devolve o nível de risco. ` +
    'Roles que não resolvem saem em rolesNotFound e SUSPENDEM o veredito: um "aprovado" calculado sobre ' +
    'nomes que não existem não é uma avaliação. ' +
    'Se a lista misturar provedores, lembre na resposta que nenhuma regra cruza entre eles.',
  schema: {
    roles: z.array(z.string().min(1)).min(1).max(200).describe('Nomes das roles atribuídas ao usuário.'),
    scope: z.enum(SOD_SCOPES).default('all').describe('Restringe a resolução a um provedor ou plataforma.'),
  },
  async run({ roles, scope = 'all' }, version) {
    const r = evaluateUserRoles(roles, scope as SoDPlatformScope)
    const unresolved = r.rolesNotFound.length > 0
    const nothingResolved = r.matchedRoles.length === 0

    return wrap(version, [], {
      totalRolesSubmitted: r.totalRoles,
      // O veredito só vale sobre o que foi resolvido. Quando nada resolveu, ele
      // não é 'approved' — ele não existe.
      riskLevel: nothingResolved ? 'INDETERMINATE' : r.riskLevel,
      verdictCoversOnlyResolvedRoles: unresolved,
      matchedRoles: r.matchedRoles.map((m) => ({ name: m.name, platform: m.cloud, url: `https://iamscope.cloud${m.url}` })),
      rolesNotFound: r.rolesNotFound.map((name) => ({
        name,
        didYouMean: findSimilarRoleNames(name, scope as SoDPlatformScope, 3).map((s) => ({ name: s.name, cloud: s.cloud })),
      })),
      conflictsFound: r.conflictsFound,
      severityBreakdown: r.severityBreakdown,
      frameworksImpacted: r.frameworksImpacted,
      providersMatched: r.providersMatched,
      conflicts: r.conflicts.map((c) => ({
        roleA: { name: c.roleA.name, platform: c.roleA.cloud },
        roleB: { name: c.roleB.name, platform: c.roleB.cloud },
        id: c.rule.id, name: c.rule.name, description: c.rule.description,
        severity: c.rule.severity, category: c.rule.category,
        rationale: c.rule.rationale, risk: c.rule.risk,
        mitigation: c.rule.mitigation, references: c.rule.references, frameworks: c.rule.frameworks,
      })),
      note: [
        nothingResolved
          ? 'NENHUMA das roles enviadas existe no catálogo. Não há avaliação a reportar — diga isso, não diga "aprovado".'
          : unresolved
            ? `${r.rolesNotFound.length} role(s) não foram encontradas e ficaram FORA do cruzamento. O veredito cobre só as ${r.matchedRoles.length} resolvidas — diga isso na resposta.`
            : null,
        r.providersMatched.length > 1
          ? 'A lista atravessa mais de um provedor. Nenhuma regra de SoD cruza provedores: acúmulo entre eles é fato de governança, não conflito catalogado.'
          : null,
      ].filter(Boolean).join(' '),
    })
  },
}

// ── 5. evaluate_role_json ───────────────────────────────────────────────────

const evaluateRoleJsonTool: ToolDef = {
  name: 'evaluate_role_json',
  title: 'Avaliar um JSON de role exportado',
  description:
    'Recebe o JSON de uma role/policy exportado de qualquer uma das seis plataformas, detecta a nuvem sozinho, ' +
    'e devolve a classificação de risco cruzando com o catálogo. Aceita a resposta bruta da API, um objeto ' +
    'único ou uma lista. O JSON é processado inteiramente na máquina de quem chama e não sai para lugar nenhum.',
  schema: {
    json: z.string().min(1).describe('O JSON da role, como texto.'),
    cloud: z.enum(PLATFORMS).optional().describe('Força a nuvem, quando a detecção automática errar.'),
  },
  async run({ json, cloud }, version) {
    const out = evaluateRoleSync(json, cloud ?? null)
    if (out.status === 'error') {
      return wrap(version, cloud ? [cloud] : [], { error: out.code, message: out.error })
    }
    if (out.status === 'choose') {
      return wrap(version, cloud ? [cloud] : [], {
        status: 'MULTIPLE_ROLES_IN_JSON',
        candidates: out.candidates.map((c: Record<string, any>, i: number) => ({ index: i, name: c?.displayName ?? c?.name ?? c?.PolicyName ?? '(sem nome)' })),
        message: 'O JSON tem mais de uma role. Envie o objeto de uma só.',
        notes: out.notes,
      })
    }
    const r: any = out.result
    return wrap(version, [r.cloud], {
      cloud: r.cloud,
      matchedInCatalog: r.matched,
      matchedBy: r.matchedBy,
      identity: r.identity,
      tier: r.tier ?? null,
      eamLevel: r.eamLevel ?? null,
      risk: r.risk ?? null,
      isPrivileged: r.isPrivileged ?? null,
      notes: out.notes,
      details: r,
      note: r.matched
        ? undefined
        : 'A role NÃO foi encontrada no catálogo — pode ser custom, ou nova. A classificação de risco abaixo, quando existe, foi derivada das permissões do próprio JSON, não do catálogo.',
    })
  },
}

// ── 6. compare_equivalent_roles ─────────────────────────────────────────────
//
// A pergunta do argumento nº 1: "qual a role equivalente a Owner no GCP".
// No site isso é a página /compare. Aqui precisa ser ferramenta, porque é a
// única resposta que seis nuvens dão e uma não dá.

type EqCloud = { role?: string; slug?: string; risk?: string; keyPermissions?: string[]; mitigations?: string[]; note?: string }
type Eq = { id: string; function: string; tier: number; name: string; description: string; clouds: Record<string, EqCloud> }
const EQUIVALENCES = equivalences as unknown as Eq[]

const compareTool: ToolDef = {
  name: 'compare_equivalent_roles',
  title: 'Role equivalente entre as seis nuvens',
  description:
    'Dada uma função administrativa — ou uma role concreta de qualquer plataforma — devolve a role equivalente ' +
    `em cada uma das seis nuvens, com risco, permissões-chave e mitigações. ${CATALOG_TEXT.equivalences} funções mapeadas. ` +
    'É a resposta para "qual o equivalente a Owner no GCP" ou "quem é o Global Administrator na AWS". ' +
    'O mapeamento inteiro é curadoria do IAM Scope: os provedores não publicam correspondência entre si, ' +
    'e a equivalência é aproximada por desenho — os modelos de permissão não são isomórficos.',
  schema: {
    query: z.string().min(1).describe('Função ("global admin", "billing"), ou uma role concreta ("Owner", "Global Administrator", "AdministratorAccess").'),
    clouds: z.array(z.enum(PLATFORMS)).optional().describe('Restringe as nuvens do retorno. Omita para receber as seis.'),
  },
  async run({ query, clouds }, version) {
    const q = query.trim().toLowerCase()
    const scored = EQUIVALENCES.map((e) => {
      let s = 0
      if (e.id === q || e.function === q) s += 100
      if (e.name.toLowerCase().includes(q)) s += 40
      if (e.id.includes(q.replace(/\s+/g, '-'))) s += 30
      for (const [cloud, c] of Object.entries(e.clouds)) {
        const role = (c.role ?? '').toLowerCase()
        if (!role) continue
        if (role === q) s += 90
        else if (role.includes(q)) s += 25
        void cloud
      }
      if (e.description.toLowerCase().includes(q)) s += 5
      return { e, s }
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3)

    if (scored.length === 0) {
      return wrap(version, [], {
        error: 'NO_EQUIVALENCE_MAPPED',
        query,
        message:
          `Nenhuma das ${CATALOG_TEXT.equivalences} funções mapeadas casa com "${query}". Não invente uma equivalência — ` +
          `use search_roles em cada nuvem e apresente os resultados como candidatos, dizendo que a correspondência não está catalogada.`,
        availableFunctions: EQUIVALENCES.map((e) => ({ id: e.id, name: e.name, tier: e.tier })),
      })
    }

    const pick: readonly CloudId[] = clouds && clouds.length ? (clouds as CloudId[]) : PLATFORMS
    return wrap(version, [], {
      query,
      compareUrl: 'https://iamscope.cloud/compare',
      matches: scored.map(({ e }) => ({
        function: e.id,
        name: e.name,
        tier: e.tier,
        description: e.description,
        clouds: Object.fromEntries(
          pick.filter((c) => e.clouds[c]).map((c) => [c, {
            role: e.clouds[c].role,
            risk: e.clouds[c].risk,
            keyPermissions: e.clouds[c].keyPermissions,
            mitigations: e.clouds[c].mitigations,
            note: e.clouds[c].note,
            // getCloudUrl é a rota real da página de detalhe; /compare/<id> não
            // foi confirmada como rota do site, então não é inventada aqui.
            url: e.clouds[c].slug ? `https://iamscope.cloud${getCloudUrl(c, e.clouds[c].slug!)}` : undefined,
          }]),
        ),
      })),
      caveat:
        'Equivalência é aproximação editorial, não identidade. Os modelos de permissão das seis plataformas não são ' +
        'isomórficos — o Owner do GCP é por projeto, o Organization Admin é por organização, e nenhum dos dois é ' +
        'exatamente o Global Administrator do Entra ID. Diga isso ao apresentar o mapeamento.',
    })
  },
}

// ── 7. verify_role_names ────────────────────────────────────────────────────

const verifyTool: ToolDef = {
  name: 'verify_role_names',
  title: 'Verificar que uma role existe antes de citá-la',
  description:
    'Confere uma lista de nomes contra o catálogo inteiro — nome de exibição, slug e identificador nativo ' +
    '(roleId do GCP, ARN da AWS, GUID do Entra e do Azure). Devolve IN_CATALOG ou NOT_IN_CATALOG por nome. ' +
    'CHAME ANTES DE ESCREVER qualquer nome de role que não tenha vindo de outra ferramenta deste servidor. ' +
    'Nome com veredito NOT_IN_CATALOG não entra na resposta: as sugestões em didYouMean são pistas para nova ' +
    'busca, nunca substitutos para citar no lugar.',
  schema: {
    names: z.array(z.string().min(1)).min(1).max(50).describe('Os nomes ou identificadores a verificar.'),
    platform: z.enum(PLATFORMS).optional().describe('Restringe a verificação a uma plataforma.'),
  },
  async run({ names, platform }, version) {
    const results = await verifyNames(names, platform as VerifyPlatform | undefined)
    const bad = results.filter((r) => r.verdict === 'NOT_IN_CATALOG')
    return wrap(version, platform ? [platform] : [], {
      catalogSize: await catalogSize(),
      catalogByPlatform: CATALOG_STATS.rolesByPlatform,
      checked: results.length,
      notInCatalog: bad.length,
      results,
      note: bad.length
        ? `${bad.length} nome(s) não existem no catálogo: ${bad.map((b) => b.query).join(', ')}. Não os cite.`
        : 'Todos os nomes existem no catálogo.',
    })
  },
}

// ── Metadados de tier, disponíveis como recurso ─────────────────────────────

export const ESCALADA_REFERENCE = {
  classification: 'iamscope-editorial',
  note:
    'Acoes do Azure cuja concessao permite ESCALAR privilegio. Nao e lista de "acao perigosa" em geral — ' +
    'e a lista curta do que deixa quem tem a role conceder mais acesso a si mesmo, que e o defeito que ' +
    'uma custom role introduz sem querer. Curadoria do IAM Scope, nao classificacao da Microsoft.',
  actions: ESCALADA_CURADA,
}

export const TIER_REFERENCE = {
  classification: 'iamscope-editorial',
  note: 'Nenhum provedor publica estas escadas. São classificação editorial do IAM Scope, CC BY 4.0.',
  eam: Object.fromEntries(Object.entries(EAM_META).map(([k, v]) => [k, { label: v.label, short: v.short, description: v.description }])),
  gcp: GCP_TIER_META,
  aws: AWS_TIER_META,
  azureRbac: AZURE_TIER_META,
  googleWorkspace: GWS_TIER_META,
  ibmCloud: IBM_TIER_META,
}


// ── 8-11. As acoes do Azure: escrever custom role ───────────────────────────
//
// O `search_permissions` cobre AWS, GCP, Entra ID e Google Workspace, e nao o
// Azure — as permissoes dele nao vivem num indice invertido, vivem nas 504
// definicoes de role e num universo de 17.591 acoes documentadas.
//
// Para PERGUNTAR "quem concede X" a lacuna era aceitavel. Para ESCREVER uma
// custom role e o dado principal, e e por isso que estas quatro existem.
//
// Nenhuma delas ESCREVE a role. O modelo escreve — ele e bom nisso. O que ele
// nao pode fazer e saber se a acao existe e o que o wildcard alcanca.

const listarProvidersTool: ToolDef = {
  name: 'list_azure_providers',
  title: 'Resource providers do Azure',
  description:
    'Lista os 151 resource providers do Azure com quantas acoes cada um tem, quebradas por verbo ' +
    '(read/write/delete/action). E o ponto de partida para escrever uma custom role: primeiro se ' +
    'descobre em que provider a capacidade mora, depois se busca a acao dentro dele. ' +
    'Sao 151 e nao 158 porque 14 chaves sao a mesma acao escrita em dois cases.',
  schema: {
    contains: z.string().optional().describe('Filtra por trecho do nome. Ex.: "storage", "compute", "authorization".'),
    limit: z.number().int().min(1).max(151).default(30).describe('Maximo de providers.'),
  },
  async run({ contains, limit = 30 }, version) {
    const { providers, meta } = await universo()
    const q = contains?.trim().toLowerCase()
    const lista = providers.filter((p) => !q || p.name.toLowerCase().includes(q))
    return wrap(version, ['azureRbac'], {
      totalProviders: providers.length,
      matched: lista.length,
      providers: lista.slice(0, limit).map((p) => ({
        provider: p.name,
        actions: p.actions,
        read: p.read, write: p.write, delete: p.delete, action: p.action,
        builtInRolesThatTouchIt: p.roles,
      })),
      universeActions: meta.universeActions,
      note:
        'O universo vem da DOCUMENTACAO da Microsoft. A Azure Management API expoe mais operacoes, ' +
        'entao toda contagem aqui e piso, nunca teto.',
    })
  },
}

const buscarAcoesTool: ToolDef = {
  name: 'search_azure_actions',
  title: 'Buscar acao do Azure pelo nome ou pelo que ela faz',
  description:
    'Busca nas 17.591 acoes documentadas do Azure, por trecho do identificador ou pela descricao. ' +
    'Aceita filtro por provider e por verbo. Devolve a descricao oficial, o plano (control/data) e ' +
    'QUAIS ROLES BUILT-IN ja concedem a acao. ' +
    'Use antes de escrever qualquer Actions[] de custom role: e assim que se descobre que a acao de ' +
    'reiniciar VM e Microsoft.Compute/virtualMachines/restart/action, em vez de adivinhar. ' +
    'O campo grantedBy responde "ja existe built-in que faz isso?" antes de a custom role existir.',
  schema: {
    query: z.string().describe('Trecho do identificador ou da descricao. Ex.: "restart", "listKeys", "reiniciar maquina virtual".'),
    provider: z.string().optional().describe('Restringe a um provider. Ex.: "Microsoft.Compute".'),
    verb: z.enum(['read', 'write', 'delete', 'action']).optional().describe('Ultimo segmento da acao.'),
    limit: z.number().int().min(1).max(60).default(20),
  },
  async run({ query, provider, verb, limit = 20 }, version) {
    const r = await buscarAcoes(query, { provider, verbo: verb, limite: limit })
    return wrap(version, ['azureRbac'], {
      query, provider: provider ?? null, verb: verb ?? null,
      totalMatches: r.total,
      actions: r.acoes.map((a) => ({
        action: a.action,
        description: a.description,
        provider: a.provider,
        plane: a.plane,
        grantedByBuiltIn: a.grantedBy.map((x) => x.name),
        deniedByBuiltIn: a.deniedBy.map((x) => x.name),
      })),
      note: r.total === 0
        ? 'Nenhuma acao casou. NAO invente o identificador — tente outro termo, ou use list_azure_providers para achar o provider primeiro.'
        : 'plane so e afirmado quando alguma definicao de role declara a acao por extenso; "nao-declarado" e o caso da maioria e NAO significa control plane.',
    })
  },
}

const expandirWildcardTool: ToolDef = {
  name: 'expand_azure_wildcard',
  title: 'O que este padrao REALMENTE concede',
  description:
    'Dado um ou mais padroes do Azure (com ou sem `*`), diz exatamente quantas e quais acoes eles ' +
    'cobrem contra o universo de 17.591. ' +
    'CHAME ANTES de colocar um wildcard numa custom role. Ninguem expande `Microsoft.Compute/*/read` ' +
    'de cabeca, e o erro aqui e sempre na direcao de conceder demais. ' +
    'Atencao a semantica: no Azure o `*` ATRAVESSA a barra — `Microsoft.Storage/*` cobre tambem ' +
    '`Microsoft.Storage/a/b/c/read`, nao so um nivel. ' +
    'Padrao literal que nao existe no universo volta em "inexistentes": e o erro que so apareceria ' +
    'no `az role definition create`, com uma mensagem que nao diz qual linha esta errada.',
  schema: {
    patterns: z.array(z.string().min(1)).min(1).max(50).describe('Os padroes. Ex.: ["Microsoft.Compute/*/read", "Microsoft.Storage/storageAccounts/listKeys/action"].'),
    sample: z.number().int().min(0).max(200).default(15).describe('Quantas acoes cobertas listar por inteiro.'),
  },
  async run({ patterns, sample = 15 }, version) {
    const r = await expandir(patterns)
    const { meta } = await universo()
    return wrap(version, ['azureRbac'], {
      totalCovered: r.cobertas.length,
      universeActions: meta.universeActions,
      perPattern: r.porPadrao.map((p) => ({ pattern: p.padrao, covers: p.cobre, examples: p.exemplos })),
      nonExistent: r.inexistentes,
      sample: r.cobertas.slice(0, sample).map((a) => ({ action: a.action, description: a.description })),
      note: r.inexistentes.length
        ? `ATENCAO: ${r.inexistentes.length} padrao(oes) literal(is) NAO existem no universo documentado: ${r.inexistentes.join(', ')}. Nao os inclua numa role definition.`
        : undefined,
    })
  },
}

const checarCustomRoleTool: ToolDef = {
  name: 'check_azure_custom_role',
  title: 'Conferir uma custom role antes de criar',
  description:
    'Recebe o JSON de uma role definition do Azure (Actions, NotActions, DataActions, NotDataActions) ' +
    'e responde cinco coisas que so se descobrem contra o universo: ' +
    '(1) acoes que NAO EXISTEM; (2) quantas acoes o conjunto realmente concede depois de subtrair ' +
    'NotActions; (3) NotActions que nao subtraem nada — quase sempre erro de digitacao, e a pessoa ' +
    'acha que fechou um buraco que continua aberto; (4) se o efetivo inclui acao de ESCALADA DE ' +
    'PRIVILEGIO, como roleAssignments/write, que faz a role parecer estreita sendo equivalente a ' +
    'Owner; (5) se algum built-in ja cobre tudo isso, caso em que a custom role nao precisa existir. ' +
    'CHAME DEPOIS de rascunhar a role e ANTES de mostra-la a quem pediu. Aceita o formato do Portal, ' +
    'do Azure CLI e do ARM/Bicep (properties.permissions[0]).',
  schema: {
    roleDefinition: z.string().min(2).describe('O JSON da role definition, como texto.'),
  },
  async run({ roleDefinition }, version) {
    let def: unknown
    try {
      def = JSON.parse(roleDefinition)
    } catch (e) {
      return wrap(version, ['azureRbac'], {
        error: 'INVALID_JSON',
        message: 'JSON invalido — confira virgulas, aspas e chaves. ' + (e instanceof Error ? e.message : ''),
      })
    }
    // O ARM embrulha em properties; o resto vem no topo.
    const alvo = (def as Record<string, any>)?.properties ?? def
    const r = await verificarCustomRole(alvo as any)

    const problemas: string[] = []
    if (r.inexistentes.length) problemas.push(`${r.inexistentes.length} acao(oes) inexistente(s)`)
    if (r.escaladaDePrivilegio.length) problemas.push(`${r.escaladaDePrivilegio.length} acao(oes) de escalada de privilegio`)
    if (r.notActionsInocuas.length) problemas.push(`${r.notActionsInocuas.length} NotActions que nao subtraem nada`)

    return wrap(version, ['azureRbac'], {
      roleName: r.nome,
      verdict: r.inexistentes.length ? 'NAO_CRIAR' : problemas.length ? 'REVISAR' : 'OK',
      problems: problemas,
      nonExistentActions: r.inexistentes,
      effective: r.efetivo,
      perPattern: r.porPadrao.map((p) => ({ pattern: p.padrao, covers: p.cobre })),
      ineffectiveNotActions: r.notActionsInocuas,
      privilegeEscalation: r.escaladaDePrivilegio.map((e) => ({ action: e.padrao, why: e.porque })),
      builtInRolesThatAlreadyCover: {
        total: r.builtInQueJaCobrem.total,
        narrowest: r.builtInQueJaCobrem.narrowest,
      },
      assignableScopes: r.assignableScopes,
      actionsWithUndeclaredPlane: r._naoDeclarado,
      note: [
        r.inexistentes.length
          ? 'As acoes inexistentes fazem o `az role definition create` falhar. Corrija antes de entregar o JSON.'
          : null,
        r.builtInQueJaCobrem.total
          ? `${r.builtInQueJaCobrem.total} role(s) built-in ja concedem TUDO que esta custom concede. As mais estreitas: ` +
            `${r.builtInQueJaCobrem.narrowest.map((b) => `${b.name} (${b.grantsInTotal} acoes)`).join(', ')}. ` +
            `Custom role tem custo permanente — versionamento, revisao, e mais um lugar onde privilegio cresce sem ninguem olhar. Diga isso antes de recomendar criar.`
          : null,
        r.escaladaDePrivilegio.length
          ? 'A lista de escalada de privilegio e curadoria do IAM Scope, nao classificacao da Microsoft.'
          : null,
      ].filter(Boolean).join(' '),
    })
  },
}

export const TOOLS: ToolDef[] = [
  searchRolesTool,
  searchPermissionsTool,
  compareTool,
  findRoleConflictsTool,
  evaluateUserRolesTool,
  evaluateRoleJsonTool,
  verifyTool,
  listarProvidersTool,
  buscarAcoesTool,
  expandirWildcardTool,
  checarCustomRoleTool,
]
