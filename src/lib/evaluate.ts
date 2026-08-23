// ── Role Evaluator — detecção de cloud + matching, 100% client-side ─────────
// Nenhuma chamada de rede externa. A única exceção é um fetch same-origin
// opcional para public/azure-perms/{slug}.json — o mesmo asset estático que
// /azure-rbac/roles/[slug] já usa para exibir a lista de Actions do Azure RBAC
// (esse dataset não guarda a lista de actions no bundle TypeScript, só o
// permissionCount). Não é uma API externa, é um JSON do próprio site.
//
// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISE PRÉVIA — achados que orientam este arquivo
// ═══════════════════════════════════════════════════════════════════════════
// 1. Nenhum dos 7 datasets em src/data/ tem campos "risk" ou "mitigations"
//    por role/policy. Esses dados só existem em src/data/compare/equivalences.json,
//    curado para ~23 funções críticas (global-admin, billing-admin, security-admin,
//    privileged-role-admin, conditional-access-admin, entre outras) — no máximo
//    1 role por cloud por função. A Seção "Riscos e Mitigações" só terá dados
//    reais quando o slug do role encontrado bater com um slug cadastrado em
//    equivalences.json; caso contrário, mostra aviso honesto de indisponibilidade.
//
// 2. Identificador nativo da plataforma (o que aparece no JSON exportado da
//    API real) só é armazenado no dataset do site para 4 das 6 clouds:
//      Entra ID    → id (GUID / roleTemplateId)
//      Azure RBAC  → id (GUID do roleDefinition)
//      AWS         → arn
//      GCP         → roleId (formato "roles/xxx")
//    As outras 3 só têm slug/name no dataset do site — sem roleId numérico
//    (Google Workspace) e sem CRN (IBM Cloud). Nesses casos
//    clouds o matching é necessariamente por nome (case-insensitive),
//    nunca por ID nativo da plataforma.
//
// 3. Lista de permissões granulares no bundle:
//      Entra ID           → permissions[] (action + category + tier individual)
//      AWS / GCP / GWS /
//      IBM Cloud           → privileges[] (texto) e um array bruto opcional
//                            (actions / permissions / apiPrivileges / verbActions)
//      Azure RBAC          → NÃO tem lista no bundle .ts, só permissionCount.
//                            A lista real mora em public/azure-perms/{slug}.json,
//                            buscada sob demanda via fetchExternalPermissions().
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// FRONT LEVE — O CATÁLOGO ENTRA POR IMPORT DINÂMICO
// ═══════════════════════════════════════════════════════════════════════════
// Este módulo não importa nenhum dataset. Fica aqui só o que não precisa deles:
// tipos, a detecção de cloud (que lê a forma do JSON colado, não o catálogo) e
// o fetch de permissões que já vinha de public/.
//
// O matching contra os 6 catálogos mora em ./evaluateCatalog, carregado com
// `await import()` na primeira avaliação. Antes desta separação, importar
// qualquer coisa daqui arrastava roles.ts + azureRbac.ts + aws.ts + gcp.ts +
// googleWorkspace.ts + ibmCloud.ts + equivalences.json — ~450 kB no First Load
// JS da rota /evaluate, e também em quem só queria `detectCloud` (RoleInput).
//
// Custo: evaluateRole() e getResultForSlug() passaram a ser assíncronos.
// ═══════════════════════════════════════════════════════════════════════════

import { CloudId, RiskLevel } from '@/data/compare/types'
// `import type` de propósito: é apagado na compilação, então tipar o retorno
// do fetch de public/azure-perms/{slug}.json NÃO traz azureRbac.ts de volta
// para o bundle desta rota — que é o ponto todo desta separação.
import type { AzureRbacPermission } from '@/data/azureRbac'

export type EvaluateCloud = CloudId

export const EVALUATE_CLOUDS: EvaluateCloud[] = ['entraId', 'azureRbac', 'aws', 'gcp', 'googleWorkspace', 'ibmCloud']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Tipos de resultado ───────────────────────────────────────────────────────

export interface DetectionResult {
  cloud: EvaluateCloud | null
  reason: string
}

export interface EvaluatedPermission {
  name: string
  tier?: string // sub-tier individual — só disponível para Entra ID
}

export interface EvaluationTier {
  level: 0 | 1 | 2 | null
  rawTier: string | null
  label: string
  color: string
  bg: string
  justification: string
}

export interface EvaluationRisk {
  available: boolean
  level?: RiskLevel
  functionName?: string
  keyPermissions?: string[]
  mitigations?: string[]
  notes?: string
}

export interface EvaluationResultData {
  cloud: EvaluateCloud
  matched: boolean
  matchedBy: 'id' | 'name' | null
  identity: {
    name: string
    id: string | null
    description: string | null
    sourceUrl: string | null
    slug: string | null
  }
  tier: EvaluationTier
  permissions: EvaluatedPermission[]
  permissionCountHint: number | null // usado quando a lista completa não está no bundle (Azure RBAC)
  /** Sinaliza a UI para buscar as permissões fora do bundle (Azure RBAC, GCP). */
  needsPermFetch: boolean
  permFetchSlug: string | null
  risk: EvaluationRisk
}

/**
 * O resultado tem TRÊS saídas, não duas.
 *
 * A terceira ('choose') nasceu da medição: `az role definition list` e
 * `aws iam list-policies` devolvem uma lista, e a versão anterior respondia
 * "o JSON precisa ser um objeto único" — recusando a saída literal do comando
 * mais comum de cada uma das duas plataformas. Agora a lista vira escolha.
 *
 * O discriminante é `status`, e não o antigo `ok`, porque com três saídas
 * `if (!outcome.ok)` deixaria a terceira cair silenciosamente no ramo do
 * sucesso — e o erro só apareceria como `undefined` na tela.
 */
export type EvaluateOutcome =
  | { status: 'ok'; result: EvaluationResultData; notes: string[] }
  | { status: 'choose'; candidates: RoleCandidate[]; notes: string[] }
  | { status: 'error'; error: string; code: 'invalid_json' | 'not_object' | 'cloud_not_detected' }

// ── Detecção automática de cloud ────────────────────────────────────────────

export function detectCloud(json: unknown): DetectionResult {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) {
    return { cloud: null, reason: 'JSON não é um objeto único' }
  }
  const j = json as Record<string, any>

  // Azure RBAC — assinatura ARM bem específica
  if (j.type === 'Microsoft.Authorization/roleDefinitions' || j.properties?.roleName) {
    return { cloud: 'azureRbac', reason: '"type": "Microsoft.Authorization/roleDefinitions" ou "properties.roleName" encontrado' }
  }
  // Azure RBAC — a forma ACHATADA do `Get-AzRoleDefinition` (Az PowerShell).
  //
  // Ela não tem `type` nem `properties`: os arrays saem na raiz e as chaves em
  // PascalCase (`Name`, `Id`, `Actions`, `AssignableScopes`). Era o formato de
  // um print que o Natan mandou em 21/08 — uma role CATALOGADA que o avaliador
  // não reconhecia. `assignableScopes` não existe em nenhuma outra plataforma,
  // então serve de assinatura sozinho.
  if (Array.isArray(j.assignableScopes)) {
    return { cloud: 'azureRbac', reason: '"assignableScopes" encontrado (formato do Get-AzRoleDefinition)' }
  }

  // AWS — ARN ou Policy Document
  const arn = j.Arn ?? j.arn ?? j.Policy?.Arn
  if (typeof arn === 'string' && arn.startsWith('arn:aws:iam')) {
    return { cloud: 'aws', reason: `ARN com prefixo "arn:aws:iam" encontrado` }
  }
  if (j.PolicyDocument || Array.isArray(j.Statement)) {
    return { cloud: 'aws', reason: 'Estrutura de Policy Document (Statement) da AWS encontrada' }
  }

  // GCP — role name no formato roles/xxx ou projects/.../roles/xxx
  if (typeof j.name === 'string' && /(^roles\/)|(\/roles\/)/.test(j.name)) {
    return { cloud: 'gcp', reason: `"name" no formato de role do GCP ("${j.name}")` }
  }

  // Google Workspace — roleId + isSuperAdminRole, ou kind do Directory API
  if ((typeof j.roleId === 'string' || typeof j.roleId === 'number') && typeof j.isSuperAdminRole === 'boolean') {
    return { cloud: 'googleWorkspace', reason: '"roleId" + "isSuperAdminRole" encontrados (Directory API)' }
  }
  if (j.kind === 'admin#directory#role') {
    return { cloud: 'googleWorkspace', reason: '"kind": "admin#directory#role" encontrado' }
  }


  // IBM Cloud — CRN
  const crn = j.crn ?? j.id
  if (typeof crn === 'string' && crn.startsWith('crn:v1:bluemix')) {
    return { cloud: 'ibmCloud', reason: '"crn"/"id" com prefixo "crn:v1:bluemix" encontrado' }
  }

  // Entra ID — campos explícitos de directory role
  if (typeof j.roleTemplateId === 'string' || typeof j.directoryRoleId === 'string') {
    return { cloud: 'entraId', reason: '"roleTemplateId"/"directoryRoleId" encontrado' }
  }

  // Entra ID — fallback fraco: UUID + displayName, sem sinal de nenhuma outra cloud
  if (typeof j.id === 'string' && UUID_RE.test(j.id) && typeof j.displayName === 'string') {
    return { cloud: 'entraId', reason: '"id" em formato UUID + "displayName" (padrão de directory role do Entra ID)' }
  }

  return { cloud: null, reason: 'Nenhuma assinatura de cloud reconhecida' }
}

/**
 * Enriquecimento sob demanda para as clouds cujas permissões não vivem no
 * bundle — hoje Azure RBAC e GCP. Usa os mesmos assets estáticos das páginas
 * de detalhe: public/azure-perms/{slug}.json e public/gcp-perms/{slug}.json.
 *
 * Chamar apenas quando needsPermFetch === true.
 */
export interface ExternalPermissions {
  /** O que a role CONCEDE. */
  granted: EvaluatedPermission[]
  /**
   * O que ela explicitamente NÃO pode: `NotActions` do Azure, statements
   * `Effect: Deny` da AWS.
   *
   * Estavam misturados em `granted` até 21/08/2026, e o efeito era grotesco: o
   * Contributor do Azure aparecia com 12 "permissões-chave", das quais 11 são
   * justamente o que ele não faz; a `AWSCompromisedKeyQuarantineV3` aparecia
   * com 99, todas negadas. Mesma correção que o índice e as páginas de
   * referência já receberam — faltava o avaliador.
   */
  denied: EvaluatedPermission[]
}

export async function fetchExternalPermissions(
  cloud: EvaluateCloud, slug: string,
): Promise<ExternalPermissions> {
  const vazio: ExternalPermissions = { granted: [], denied: [] }
  try {
    if (cloud === 'azureRbac') {
      const res = await fetch(`/azure-perms/${slug}.json`)
      if (!res.ok) return vazio
      const data = (await res.json()) as AzureRbacPermission[]
      const negativo = (t: string) => t === 'NotActions' || t === 'NotDataActions'
      return {
        granted: data.filter((p) => !negativo(p.type)).map((p) => ({ name: p.action, tier: p.type })),
        denied: data.filter((p) => negativo(p.type)).map((p) => ({ name: p.action, tier: p.type })),
      }
    }
    if (cloud === 'gcp') {
      const res = await fetch(`/gcp-perms/${slug}.json`)
      if (!res.ok) return vazio
      const data = (await res.json()) as string[]
      return { granted: data.map((a) => ({ name: a })), denied: [] }
    }
    if (cloud === 'aws') {
      const res = await fetch(`/aws-policy-docs/${slug}.json`)
      if (!res.ok) return vazio
      const data = (await res.json()) as { actions?: string[]; document?: any }
      // Deriva do `document`, e NÃO do campo `actions`.
      //
      // O campo é gravado pelo coletor, e os arquivos que estão no disco hoje
      // vieram da versão dele que ainda não olhava o `Effect` — então `actions`
      // carrega as ações negadas. Ler o documento faz o resultado ficar certo
      // independentemente de quando a policy foi coletada.
      //
      // É o gêmeo de scripts/lib/aws-effects.js. Os dois existem porque um roda
      // no Node na coleta e o outro no navegador; se mexer em um, olhe o outro.
      const doc = data.document
      if (doc) {
        const st = Array.isArray(doc.Statement) ? doc.Statement : doc.Statement ? [doc.Statement] : []
        const allow = new Set<string>()
        const deny = new Set<string>()
        for (const stmt of st) {
          const alvo = stmt?.Effect === 'Deny' ? deny : allow
          for (const a of [].concat(stmt?.Action ?? [])) alvo.add(a as string)
        }
        return {
          granted: [...allow].sort().map((a) => ({ name: a })),
          denied: [...deny].sort().map((a) => ({ name: a })),
        }
      }
      return { granted: (data.actions ?? []).map((a) => ({ name: a })), denied: [] }
    }
    return vazio
  } catch {
    return vazio
  }
}

// ── Ponte para o catálogo ───────────────────────────────────────────────────
// Import dinâmico: o chunk pesado só é baixado quando alguém de fato avalia.

/** Avalia o JSON colado contra os catálogos das 6 clouds. */
export async function evaluateRole(
  rawText: string, manualCloud?: EvaluateCloud | null,
): Promise<EvaluateOutcome> {
  const { evaluateRoleSync } = await import('./evaluateCatalog')
  return evaluateRoleSync(rawText, manualCloud)
}

/** Avalia uma das roles escolhidas na lista, sem reparsear o texto colado. */
export async function evaluateRoleCandidate(
  json: Record<string, any>, manualCloud?: EvaluateCloud | null,
): Promise<EvaluateOutcome> {
  const { evaluateObjectSync } = await import('./evaluateCatalog')
  return evaluateObjectSync(json, manualCloud)
}

/** Reconstrói o resultado a partir de cloud+slug, para /evaluate?cloud=&role=. */
export async function getResultForSlug(
  cloud: EvaluateCloud, slug: string,
): Promise<EvaluationResultData | null> {
  const { getResultForSlugSync } = await import('./evaluateCatalog')
  return getResultForSlugSync(cloud, slug)
}

// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO DA ENTRADA — o que os primeiros usuários colaram de verdade
// ═══════════════════════════════════════════════════════════════════════════
// Medição de 20/08/2026, 19 payloads reais rodados contra o detector e os seis
// catálogos: 4 deles não eram sequer DETECTADOS, e nenhum dos quatro tinha
// nada de errado — eram a saída literal de um comando que qualquer pessoa que
// administra IAM roda todo dia:
//
//   {"@odata.context":…,"value":[…]}        resposta de coleção do Graph
//   {"Id":…,"DisplayName":…}                ConvertTo-Json do PowerShell
//   {"PolicyVersion":{"Document":{…}}}      aws iam get-policy-version
//   {"Role":{…}}                            aws iam get-role
//   [ {…}, {…} ]                            az role definition list
//
// Três problemas distintos, e cada um tem um remédio próprio aqui:
//
//   1. EMBRULHO   O objeto certo está lá dentro, sob uma chave de envelope.
//   2. CAIXA      O PowerShell serializa em PascalCase; o detector procurava
//                 camelCase. `DisplayName` e `displayName` são a mesma coisa
//                 para quem colou e coisas diferentes para o `??`.
//   3. LISTA      Vieram N roles, não uma. Recusar é a resposta errada: a
//                 pessoa escolhe qual quer avaliar.
//
// REGRA DE OURO DESTE ARQUIVO — desembrulhar só depois de falhar.
//   `prepareRoleJson` tenta detectar o objeto como ele veio ANTES de mexer em
//   qualquer envelope. Assim nenhum dos casos que já funcionavam muda de
//   comportamento: o desembrulho só roda no caminho que hoje dá erro.

/** Uma das roles encontradas quando o JSON colado tem mais de uma. */
export interface RoleCandidate {
  label: string
  json: Record<string, any>
}

export interface PreparedInput {
  /** O objeto pronto para detecção/matching, ou null se não houver um. */
  json: Record<string, any> | null
  /** Preenchido quando o JSON traz VÁRIAS roles — a pessoa escolhe. */
  candidates: RoleCandidate[] | null
  /**
   * O que foi feito com a entrada, em forma TÉCNICA e sem prosa
   * (`PolicyVersion.Document`, `"value" \u2192 3`).
   *
   * Sem prosa de propósito: o rótulo que introduz a lista vem do dicionário e
   * troca de idioma; identificador de campo de API não troca — é dado, e o
   * ADR-001 manda deixar em inglês nos dois idiomas.
   */
  notes: string[]
}

// ── Caixa das chaves ────────────────────────────────────────────────────────
// Mapa `chave em minúsculas` -> grafias canônicas que precisam existir.
//
// POR QUE ADICIONA EM VEZ DE RENOMEAR
//   `roleName` (Azure) e `RoleName` (AWS) são chaves DIFERENTES em plataformas
//   diferentes e viram a mesma coisa em minúsculas. Renomear uma quebraria a
//   outra. Como daqui em diante o objeto só é lido, nunca reescrito, deixar as
//   duas grafias convivendo não custa nada e não tem ambiguidade.
const KEY_ALIASES: Record<string, string[]> = {
  displayname:            ['displayName'],
  roletemplateid:         ['roleTemplateId'],
  directoryroleid:        ['directoryRoleId'],
  templateid:             ['templateId'],
  id:                     ['id'],
  description:            ['description'],
  name:                   ['name'],
  title:                  ['title'],
  type:                   ['type'],
  properties:             ['properties'],
  rolename:               ['roleName', 'RoleName'],
  assignablescopes:       ['assignableScopes'],
  iscustom:               ['isCustom'],
  policyname:             ['PolicyName'],
  roledefinitionid:       ['roleDefinitionId'],
  roledescription:        ['roleDescription'],
  permissions:            ['permissions'],
  rolepermissions:        ['rolePermissions'],
  allowedresourceactions: ['allowedResourceActions'],
  includedpermissions:    ['includedPermissions'],
  actions:                ['actions'],
  notactions:             ['notActions'],
  dataactions:            ['dataActions'],
  notdataactions:         ['notDataActions'],
  roleid:                 ['roleId'],
  issuperadminrole:       ['isSuperAdminRole'],
  kind:                   ['kind'],
  roleprivileges:         ['rolePrivileges'],
  privilegename:          ['privilegeName'],
  crn:                    ['crn'],
  arn:                    ['Arn', 'arn'],
  policydocument:         ['PolicyDocument'],
  statement:              ['Statement'],
  action:                 ['Action'],
  effect:                 ['Effect'],
}

/** Profundidade 3 cobre `properties.permissions[0].actions`, que é o mais fundo que se lê. */
function addAliases(node: any, depth = 0): void {
  if (depth > 3 || node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const el of node) addAliases(el, depth + 1)
    return
  }
  // Snapshot antes do laço: as chaves adicionadas aqui dentro não devem
  // realimentar a iteração.
  for (const k of Object.keys(node)) {
    const canon = KEY_ALIASES[k.toLowerCase()]
    if (canon) for (const c of canon) if (!(c in node)) node[c] = node[k]
    addAliases(node[k], depth + 1)
  }
}

// ── Envelopes ───────────────────────────────────────────────────────────────
// `properties` NÃO entra: a detecção do Azure depende de `properties.roleName`
// e o extractIdentity lê `properties.*`. Desembrulhar quebraria os dois.
const WRAPPER_KEYS = ['Policy', 'PolicyVersion', 'Document', 'Role', 'RoleDefinition']

/** Chaves sob as quais uma plataforma devolve VÁRIAS roles. */
const LIST_KEYS = ['value', 'items', 'Policies', 'Roles', 'AttachedPolicies']

function unwrap(node: any, depth: number): { json: Record<string, any>; path: string[] } | null {
  if (depth > 3 || node == null || typeof node !== 'object') return null
  for (const k of WRAPPER_KEYS) {
    const v = node[k]
    if (v == null || typeof v !== 'object' || Array.isArray(v)) continue
    addAliases(v)
    if (detectCloud(v).cloud) return { json: v, path: [k] }
    const deeper = unwrap(v, depth + 1)
    if (deeper) return { json: deeper.json, path: [k, ...deeper.path] }
  }
  return null
}

/** Como chamar esta role na lista de escolha. */
export function describeCandidate(j: Record<string, any>): string {
  const name = j.displayName ?? j.properties?.roleName ?? j.roleName ?? j.PolicyName
    ?? j.RoleName ?? j.title ?? j.display_name ?? j.roleDescription ?? j.name ?? j.Arn ?? j.id
  return typeof name === 'string' && name.trim() ? name.trim() : '(sem nome no JSON)'
}

/** Máximo de roles oferecidas na escolha — uma lista maior que isso não se lê. */
const MAX_CANDIDATES = 50

function fromList(list: any[], origin: string, notes: string[]): PreparedInput | null {
  const objs = list.filter((e) => e != null && typeof e === 'object' && !Array.isArray(e))
  if (objs.length === 0) return null
  for (const o of objs) addAliases(o)

  if (objs.length === 1) {
    notes.push(`${origin} \u2192 1`)
    const single = objs[0] as Record<string, any>
    if (detectCloud(single).cloud) return { json: single, candidates: null, notes }
    const un = unwrap(single, 0)
    return { json: un ? un.json : single, candidates: null, notes }
  }

  notes.push(`${origin} \u2192 ${objs.length}`)
  return {
    json: null,
    candidates: objs.slice(0, MAX_CANDIDATES).map((o) => ({ label: describeCandidate(o), json: o })),
    notes,
  }
}

/**
 * Prepara o JSON já parseado para detecção e matching.
 *
 * Ordem, e ela importa: lista primeiro (para não desembrulhar o envelope de uma
 * coleção como se fosse role), depois caixa das chaves, depois — só se a
 * detecção falhar — envelope.
 */
export function prepareRoleJson(parsed: unknown): PreparedInput {
  const notes: string[] = []

  if (Array.isArray(parsed)) {
    return fromList(parsed, 'array', notes) ?? { json: null, candidates: null, notes }
  }
  if (parsed == null || typeof parsed !== 'object') {
    return { json: null, candidates: null, notes }
  }

  const node = parsed as Record<string, any>
  addAliases(node)

  for (const k of LIST_KEYS) {
    if (Array.isArray(node[k])) {
      const r = fromList(node[k], `"${k}"`, notes)
      if (r) return r
    }
  }

  if (detectCloud(node).cloud) return { json: node, candidates: null, notes }

  const un = unwrap(node, 0)
  if (un) {
    notes.push(un.path.join('.'))
    return { json: un.json, candidates: null, notes }
  }
  return { json: node, candidates: null, notes }
}

/** O que a caixa de entrada mostra enquanto a pessoa digita. */
export interface InputPreview {
  cloud: EvaluateCloud | null
  reason: string
  notes: string[]
  candidateCount: number
}

/**
 * Detecção ao vivo, com a MESMA normalização da avaliação.
 *
 * Antes o RoleInput chamava `detectCloud(JSON.parse(value))` cru. Com o
 * desembrulho só do lado da avaliação, a caixa diria "cloud não detectada" em
 * amarelo para um JSON que o botão Avaliar processaria sem reclamar — dois
 * veredictos diferentes para a mesma entrada, na mesma tela.
 */
export function previewInput(rawText: string): InputPreview | null {
  let parsed: unknown
  try { parsed = JSON.parse(rawText) } catch { return null }
  const prep = prepareRoleJson(parsed)
  if (prep.candidates) {
    return { cloud: null, reason: '', notes: prep.notes, candidateCount: prep.candidates.length }
  }
  if (!prep.json) {
    return { cloud: null, reason: 'Nenhuma assinatura de cloud reconhecida', notes: prep.notes, candidateCount: 0 }
  }
  const d = detectCloud(prep.json)
  return { cloud: d.cloud, reason: d.reason, notes: prep.notes, candidateCount: 0 }
}
