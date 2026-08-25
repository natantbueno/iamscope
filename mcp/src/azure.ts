// azure.ts — o universo de ações do Azure, para escrever custom role.
//
// POR QUE ISTO PRECISOU EXISTIR
//   O `search_permissions` cobre AWS, GCP, Entra ID e Google Workspace, e deixa
//   o Azure de fora — as permissões dele não vivem num índice invertido, vivem
//   nas 504 definições de role e num universo de 17.591 ações documentadas.
//
//   Para PERGUNTAR "quem concede X" isso era uma lacuna aceitável. Para
//   ESCREVER uma custom role é o dado principal: você não escreve
//   `Microsoft.Compute/virtualMachines/restart/action` de cabeça, e não sabe de
//   cabeça que `Microsoft.Compute/*/read` cobre 400 e poucas ações.
//
// O QUE ESTE MÓDULO NÃO FAZ
//   Não escreve a role. O modelo escreve — ele é bom nisso. O que ele não pode
//   fazer é saber se a ação existe e o que o wildcard realmente alcança, e é
//   exatamente essa metade que mora aqui.
//
// O MOTOR DE WILDCARD É O DO SITE
//   `wildcardMatches` de src/lib/wildcardMatch.ts: escapa tudo que é meta em
//   regex menos o `*`, que vira `.*` — e `.*` ATRAVESSA a barra. Conferido linha
//   a linha contra `patternToRegex` de scripts/build-azure-providers.js, que é o
//   motor que gerou este dado: são idênticos. Escrever um terceiro seria a mesma
//   armadilha do vendor, na semântica em vez de nos bytes.
//
//   Isso importa porque a semântica errada não dá erro, dá NÚMERO ERRADO: com
//   `*` que não atravessa `/`, `Microsoft.Compute/*/read` casaria quase nada, e
//   uma custom role sairia parecendo mais estreita do que é.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { dataDir } from './runtime'
import { wildcardMatches, isWildcardPattern } from '@/lib/wildcardMatch'

/** [slug, nome, tier, privilegiada] */
type RoleRef = [string, string, string, number]
/** [ação, descrição, concedem[], concedemComoDado[], negam[], plano] */
type AcaoTupla = [string, string, number[], number[], number[], number]

interface ArquivoProvider {
  slug: string
  provider: string
  roles: RoleRef[]
  actions: AcaoTupla[]
}

interface Embutido {
  _meta: Record<string, unknown>
  providers: { slug: string; name: string; actions: number; roles: number; read: number; write: number; delete: number; action: number; typed: number }[]
  porProvider: Record<string, ArquivoProvider>
}

export interface Acao {
  action: string
  description: string
  provider: string
  /** 'control' | 'data' | 'ambos' | 'nao-declarado' */
  plane: string
  /** Roles built-in que concedem no control plane. */
  grantedBy: { name: string; slug: string; tier: string; isPrivileged: boolean }[]
  /** Roles que concedem como DataAction. */
  grantedAsDataBy: { name: string; slug: string }[]
  /** Roles que NEGAM (NotActions/NotDataActions). */
  deniedBy: { name: string; slug: string }[]
}

const PLANO = ['nao-declarado', 'control', 'data', 'ambos']

let CACHE: { acoes: Acao[]; porUpper: Map<string, Acao>; meta: Record<string, unknown>; providers: Embutido['providers']; alcance: Map<string, number> } | null = null

/**
 * Carrega e achata na primeira chamada.
 *
 * São 3,2 MB de JSON e ~17,6 mil ações. Fica atrás de `await` de propósito: quem
 * pergunta só sobre GCP nunca paga por isto.
 */
export async function universo() {
  if (CACHE) return CACHE

  const arquivo = path.join(dataDir(), 'azure-actions.json')
  let bruto: Embutido
  try {
    bruto = JSON.parse(await readFile(arquivo, 'utf8'))
  } catch (e) {
    throw new Error(
      `iamscope-mcp: nao consegui ler ${arquivo}. ` +
      `Este indice e gerado pelo build a partir de ../public/azure-providers/ — rode \`npm run build\` dentro de mcp/. ` +
      `(${e instanceof Error ? e.message : e})`,
    )
  }

  const acoes: Acao[] = []
  const porUpper = new Map<string, Acao>()

  for (const arq of Object.values(bruto.porProvider)) {
    const papel = (i: number) => {
      const r = arq.roles[i]
      return r ? { name: r[1], slug: r[0], tier: r[2], isPrivileged: r[3] === 1 } : null
    }
    for (const [action, description, g, dg, x, plano] of arq.actions) {
      const a: Acao = {
        action,
        description,
        provider: arq.provider,
        plane: PLANO[plano] ?? 'nao-declarado',
        grantedBy: g.map(papel).filter(Boolean) as Acao['grantedBy'],
        grantedAsDataBy: (dg.map(papel).filter(Boolean) as Acao['grantedBy']).map((r) => ({ name: r.name, slug: r.slug })),
        deniedBy: (x.map(papel).filter(Boolean) as Acao['grantedBy']).map((r) => ({ name: r.name, slug: r.slug })),
      }
      acoes.push(a)
      porUpper.set(action.toUpperCase(), a)
    }
  }

  // Alcance de cada built-in: em quantas acoes do universo ela aparece como
  // concedente. E o mesmo numero que build-effective-perms calcula, derivado
  // aqui do mesmo dado — serve para ordenar sugestao por ESTREITEZA.
  const alcance = new Map<string, number>()
  for (const a of acoes) for (const r of a.grantedBy) alcance.set(r.slug, (alcance.get(r.slug) ?? 0) + 1)

  CACHE = { acoes, porUpper, meta: bruto._meta, providers: bruto.providers, alcance }
  return CACHE
}

// ── Busca ────────────────────────────────────────────────────────────────────

const VERBOS = ['read', 'write', 'delete', 'action'] as const

/** Verbo é o ÚLTIMO segmento da ação, não uma substring dela. */
function verboDe(action: string): string {
  const v = action.split('/').pop()?.toLowerCase() ?? ''
  return (VERBOS as readonly string[]).includes(v) ? v : 'outro'
}

export async function buscarAcoes(
  consulta: string,
  { provider, verbo, limite = 40 }: { provider?: string; verbo?: string; limite?: number } = {},
) {
  const { acoes } = await universo()
  const q = consulta.trim().toLowerCase()
  const p = provider?.trim().toLowerCase()

  const pontuar = (a: Acao): number => {
    const act = a.action.toLowerCase()
    if (!q) return 1
    if (act === q) return 100
    // O último segmento é o que a pessoa costuma saber ("listKeys", "restart").
    const ultimo = act.split('/').slice(-2).join('/')
    if (ultimo.includes(q)) return 50
    if (act.includes(q)) return 30
    if (a.description.toLowerCase().includes(q)) return 10
    return 0
  }

  const candidatos = acoes
    .filter((a) => !p || a.provider.toLowerCase() === p || a.provider.toLowerCase().includes(p))
    .filter((a) => !verbo || verboDe(a.action) === verbo.toLowerCase())
    .map((a) => ({ a, s: pontuar(a) }))
    .filter((x) => x.s > 0)

  candidatos.sort((x, y) => y.s - x.s || x.a.action.length - y.a.action.length || x.a.action.localeCompare(y.a.action))
  return { total: candidatos.length, acoes: candidatos.slice(0, limite).map((x) => x.a) }
}

// ── Expansão de padrão ───────────────────────────────────────────────────────

/**
 * O que um conjunto de padrões realmente cobre.
 *
 * Aceita literal e wildcard misturados. Literal que não existe no universo é
 * devolvido em `inexistentes` — e essa é a informação mais valiosa da ferramenta:
 * ação inventada num `roleDefinition` só falha na hora do `az role definition
 * create`, com uma mensagem que não diz qual das trinta linhas está errada.
 */
export async function expandir(padroes: string[]) {
  const { acoes, porUpper } = await universo()
  const cobertas = new Map<string, Acao>()
  const inexistentes: string[] = []
  const porPadrao: { padrao: string; cobre: number; exemplos: string[] }[] = []

  for (const padrao of padroes) {
    const bruto = padrao.trim()
    if (!bruto) continue
    if (!isWildcardPattern(bruto)) {
      const a = porUpper.get(bruto.toUpperCase())
      if (a) { cobertas.set(a.action.toUpperCase(), a); porPadrao.push({ padrao: bruto, cobre: 1, exemplos: [a.action] }) }
      else { inexistentes.push(bruto); porPadrao.push({ padrao: bruto, cobre: 0, exemplos: [] }) }
      continue
    }
    const casadas = acoes.filter((a) => wildcardMatches(bruto, a.action))
    for (const a of casadas) cobertas.set(a.action.toUpperCase(), a)
    porPadrao.push({ padrao: bruto, cobre: casadas.length, exemplos: casadas.slice(0, 5).map((a) => a.action) })
  }

  return { cobertas: [...cobertas.values()], inexistentes, porPadrao }
}

// ── Verificação de uma custom role ───────────────────────────────────────────

export interface DefinicaoRole {
  Name?: string
  name?: string
  Description?: string
  Actions?: string[]
  NotActions?: string[]
  DataActions?: string[]
  NotDataActions?: string[]
  AssignableScopes?: string[]
  actions?: string[]
  notActions?: string[]
  dataActions?: string[]
  notDataActions?: string[]
  assignableScopes?: string[]
  permissions?: { actions?: string[]; notActions?: string[]; dataActions?: string[]; notDataActions?: string[] }[]
}

/** Aceita as três formas em que uma role definition aparece na prática. */
function extrairListas(def: DefinicaoRole) {
  const p = def.permissions?.[0]
  const pega = (a?: string[], b?: string[], c?: string[]) => a ?? b ?? c ?? []
  return {
    actions: pega(def.Actions, def.actions, p?.actions),
    notActions: pega(def.NotActions, def.notActions, p?.notActions),
    dataActions: pega(def.DataActions, def.dataActions, p?.dataActions),
    notDataActions: pega(def.NotDataActions, def.notDataActions, p?.notDataActions),
    assignableScopes: def.AssignableScopes ?? def.assignableScopes ?? [],
    nome: def.Name ?? def.name ?? null,
  }
}

/**
 * Ações cuja concessão permite ESCALAR privilégio.
 *
 * Não é lista de "ação perigosa" em geral — é a lista curta do que deixa quem
 * tem a role conceder mais acesso a si mesmo, que é o defeito que uma custom
 * role introduz sem querer. `roleAssignments/write` é o caso clássico: a role
 * parece estreita e é equivalente a Owner, porque quem a tem pode se dar Owner.
 *
 * Curadoria do IAM Scope. Sai marcada como tal no retorno.
 */
const ESCALADA = [
  { padrao: 'Microsoft.Authorization/roleAssignments/write', porque: 'permite atribuir QUALQUER role a qualquer principal, inclusive Owner para si mesmo' },
  { padrao: 'Microsoft.Authorization/roleDefinitions/write', porque: 'permite criar ou alterar definicoes de role, contornando qualquer limite desta' },
  { padrao: 'Microsoft.Authorization/elevateAccess/action', porque: 'concede User Access Administrator no escopo raiz do tenant' },
  { padrao: 'Microsoft.Authorization/denyAssignments/write', porque: 'permite remover bloqueios de negacao' },
  { padrao: 'Microsoft.ManagedIdentity/userAssignedIdentities/assign/action', porque: 'permite anexar uma identidade gerenciada mais poderosa a um recurso que voce controla' },
]

export async function verificarCustomRole(def: DefinicaoRole) {
  const l = extrairListas(def)
  const { porUpper } = await universo()

  const exp = await expandir(l.actions)
  const expNot = await expandir(l.notActions)
  const expData = await expandir(l.dataActions)
  const expNotData = await expandir(l.notDataActions)

  // Efetivo = concedido menos negado. Mesma regra do Azure: NotActions subtrai.
  const negadas = new Set(expNot.cobertas.map((a) => a.action.toUpperCase()))
  const efetivas = exp.cobertas.filter((a) => !negadas.has(a.action.toUpperCase()))
  const negadasData = new Set(expNotData.cobertas.map((a) => a.action.toUpperCase()))
  const efetivasData = expData.cobertas.filter((a) => !negadasData.has(a.action.toUpperCase()))

  // NotActions que não subtrai nada é quase sempre erro de digitação — a pessoa
  // acha que fechou um buraco e não fechou.
  const notInocuas = expNot.porPadrao.filter((p) => {
    if (p.cobre === 0) return true
    const cobre = expandirSincrono(p, exp.cobertas)
    return !cobre
  }).map((p) => p.padrao)

  const efetivasUpper = new Set(efetivas.map((a) => a.action.toUpperCase()))
  const escalada = ESCALADA.filter((e) => efetivasUpper.has(e.padrao.toUpperCase()))

  const inexistentes = [
    ...exp.inexistentes.map((a) => ({ acao: a, onde: 'Actions' })),
    ...expNot.inexistentes.map((a) => ({ acao: a, onde: 'NotActions' })),
    ...expData.inexistentes.map((a) => ({ acao: a, onde: 'DataActions' })),
    ...expNotData.inexistentes.map((a) => ({ acao: a, onde: 'NotDataActions' })),
  ]

  // Built-in que já cobre tudo isto: motivo para NÃO criar a custom role.
  const { alcance } = await universo()
  const cobrem = builtInQueCobrem(efetivas, alcance)

  return {
    nome: l.nome,
    inexistentes,
    efetivo: {
      controlPlane: efetivas.length,
      dataPlane: efetivasData.length,
      amostra: efetivas.slice(0, 25).map((a) => a.action),
    },
    porPadrao: exp.porPadrao,
    notActionsInocuas: notInocuas,
    escaladaDePrivilegio: escalada,
    builtInQueJaCobrem: cobrem,
    assignableScopes: l.assignableScopes,
    _naoDeclarado: efetivas.filter((a) => a.plane === 'nao-declarado').length,
    _acoesConhecidas: porUpper.size,
  }
}

/** O padrão de NotActions subtrai alguma coisa do que foi concedido? */
function expandirSincrono(p: { padrao: string; cobre: number }, concedidas: Acao[]): boolean {
  if (p.cobre === 0) return false
  return concedidas.some((a) => (isWildcardPattern(p.padrao) ? wildcardMatches(p.padrao, a.action) : a.action.toUpperCase() === p.padrao.toUpperCase()))
}

/**
 * Built-in roles que concedem TODAS as ações efetivas da custom.
 *
 * A pergunta que isto responde é "preciso mesmo de uma custom role?". Uma custom
 * role tem custo permanente — versionamento, revisão, e um lugar a mais onde
 * privilégio cresce sem ninguém olhar.
 */
function builtInQueCobrem(efetivas: Acao[], alcance: Map<string, number>) {
  if (efetivas.length === 0) return { total: 0, narrowest: [] }
  const contagem = new Map<string, { nome: string; slug: string; tier: string; isPrivileged: boolean; n: number }>()
  for (const a of efetivas) {
    for (const r of a.grantedBy) {
      const e = contagem.get(r.slug) ?? { nome: r.name, slug: r.slug, tier: r.tier, isPrivileged: r.isPrivileged, n: 0 }
      e.n++
      contagem.set(r.slug, e)
    }
  }
  const cobrem = [...contagem.values()].filter((e) => e.n === efetivas.length)

  // ORDENA POR ESTREITEZA, nao por nome.
  //
  // Para uma acao comum como storageAccounts/read, centenas de built-in cobrem.
  // Ordenado por nome, a resposta era "Avere Contributor" — inutil. A sugestao
  // que serve e a role que concede o MENOS alem do que foi pedido, e o alcance
  // (quantas acoes do universo ela concede) e exatamente essa medida.
  //
  // Empate resolvido por nao-privilegiada primeiro: entre duas do mesmo tamanho,
  // a que nao e Tier 0 e a recomendacao melhor.
  return {
    total: cobrem.length,
    narrowest: cobrem
      .map((e) => ({ ...e, alcance: alcance.get(e.slug) ?? Number.POSITIVE_INFINITY }))
      .sort((a, b) => a.alcance - b.alcance || Number(a.isPrivileged) - Number(b.isPrivileged) || a.nome.localeCompare(b.nome))
      .slice(0, 6)
      .map((e) => ({ name: e.nome, slug: e.slug, tier: e.tier, isPrivileged: e.isPrivileged, grantsInTotal: e.alcance })),
  }
}

export const ESCALADA_CURADA = ESCALADA
