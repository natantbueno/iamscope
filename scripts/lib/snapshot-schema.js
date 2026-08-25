'use strict'
/**
 * Schema dos snapshots de catálogo — a base do changelog do IAM Scope.
 *
 * POR QUE ISTO EXISTE
 *   Os coletores já calculavam o diff. O dry-run de 16/08/2026 disse "0 novas,
 *   0 descontinuadas, 3 descrições alteradas" no Azure e viu a 1.505ª permissão
 *   do Graph — e o resultado morria no terminal, porque não havia estado
 *   anterior gravado em lugar nenhum. Um snapshot é esse estado anterior.
 *
 * O QUE ENTRA NO HASH — e por quê
 *   O hash `h` de cada item cobre exatamente sete coisas:
 *
 *     name           renomeação é evento publicável (e muda o slug/URL)
 *     description    é o texto oficial do provedor; mudou, mudou de fato
 *     tier           classificação editorial NOSSA — é o evento que só nós
 *                    podemos emitir, e por isso está no hash
 *     category       idem, editorial
 *     isPrivileged   idem, editorial; é o filtro dos feeds -privileged
 *     permissões     a lista ORDENADA, não a contagem: trocar uma action por
 *                    outra mantém a contagem e muda o poder da role
 *     regras de SoD  quais das 190 regras citam este item — editorial, e o
 *                    único campo cuja mudança vem de nós, não do provedor
 *
 *   NÃO entram: assignableScopes, docsSlug, stage, version, createdAt/editedAt,
 *   e qualquer campo derivado (permissionCount é derivado da lista). Campo
 *   derivado no hash produz evento duplicado — a mesma mudança apareceria duas
 *   vezes com nomes diferentes.
 *
 *   O slug NÃO entra no hash porque É a identidade: ele é a chave do item. Se o
 *   slug mudar, o diff vê uma remoção e uma criação, que é honesto — a URL
 *   antiga de fato deixou de existir.
 *
 * POR QUE SUB-HASHES E NÃO UM HASH SÓ
 *   Com um hash opaco por item você sabe que algo mudou, não O QUE mudou. Para
 *   emitir "descrição alterada" em vez de "permissões +3/−1" é preciso
 *   granularidade por campo. Daí `hd` (descrição) e `hp` (permissões) ao lado
 *   de `h`. Tier, categoria e isPrivileged ficam literais: são vocabulário
 *   fechado e curto, e o changelog precisa imprimir "Contributor → Reader", o
 *   que um hash não permite.
 *
 * POR QUE O NOME FICA LITERAL
 *   ~30 bytes por item. Sem ele o changelog e o feed dizem "acrdelete mudou" em
 *   vez de "AcrDelete mudou", e o título de uma entrada de Atom não pode ser um
 *   slug.
 *
 * COLEÇÕES DE UNIVERSO (>5.000 itens)
 *   As universais de ação/permissão — 17.591 actions do Azure, 16.423 da AWS,
 *   13.701 do GCP — guardam só `id` + `hd`. Não têm tier, categoria nem lista
 *   de permissões: são as folhas, não as roles. O registro reduzido derruba o
 *   arquivo de ~3,4 MB para ~1,9 MB nas raras vezes em que ele é reescrito.
 */
const crypto = require('crypto')

/** As seis nuvens, na ordem em que aparecem na sidebar. */
const CLOUDS = ['entraid', 'azure-rbac', 'aws', 'gcp', 'google-workspace', 'ibm-cloud']

const CLOUD_LABEL = {
  'entraid': 'Entra ID',
  'azure-rbac': 'Azure RBAC',
  'aws': 'AWS IAM',
  'gcp': 'GCP IAM',
  'google-workspace': 'Google Workspace',
  'ibm-cloud': 'IBM Cloud',
}

/**
 * A plataforma do SoD (`SoDRoleRef.cloud`, nome histórico) para a nuvem daqui.
 * IBM Cloud não tem regra de SoD por decisão de 07/08/2026 — ver a nota do
 * SoD Analyzer. Ausência aqui é intencional, não lacuna.
 */
const SOD_PLATFORM_TO_CLOUD = {
  'entra-id': 'entraid',
  'azure-rbac': 'azure-rbac',
  'aws': 'aws',
  'gcp': 'gcp',
  'google-workspace': 'google-workspace',
}

/**
 * Coleções por nuvem. `kind` decide o registro: 'role' (completo) ou 'leaf'
 * (reduzido).
 *
 * `label` fica em INGLÊS nos dois idiomas: é nome de catálogo, e a regra do
 * projeto é que nome próprio de plataforma e de conjunto não passa pelo
 * dicionário (só contador e rótulo de interface passam). Um rótulo em português
 * aqui vazava para dentro da frase em inglês do evento de genesis —
 * "1504 API Permissions do Microsoft Graph".
 */
const COLLECTIONS = {
  'entraid': [
    { id: 'roles', label: 'Directory Roles', kind: 'role', route: '/entraid/roles' },
    { id: 'api-permissions', label: 'Microsoft Graph API Permissions', kind: 'role', route: '/entraid/api-permissions' },
  ],
  'azure-rbac': [
    { id: 'roles', label: 'Built-in Roles', kind: 'role', route: '/azure-rbac/roles' },
    { id: 'actions', label: 'Resource Provider Actions', kind: 'leaf', route: '/azure-rbac/permissions' },
  ],
  'aws': [
    { id: 'policies', label: 'Managed Policies', kind: 'role', route: '/aws/policies' },
    { id: 'actions', label: 'IAM Actions', kind: 'leaf', route: '/aws/actions' },
  ],
  'gcp': [
    { id: 'roles', label: 'Predefined Roles', kind: 'role', route: '/gcp/roles' },
    { id: 'permissions', label: 'IAM Permissions', kind: 'leaf', route: '/gcp/permissions' },
  ],
  'google-workspace': [
    { id: 'roles', label: 'Admin Roles', kind: 'role', route: '/google-workspace/roles' },
    { id: 'privileges', label: 'Admin Privileges', kind: 'leaf', route: '/google-workspace/privileges' },
  ],
  'ibm-cloud': [
    { id: 'roles', label: 'Platform and Service Roles', kind: 'role', route: '/ibm-cloud/roles' },
    { id: 'classic-permissions', label: 'Classic Infrastructure Permissions', kind: 'leaf', route: '/ibm-cloud/classic' },
  ],
}

/** Hash curto e estável. Trunca sha256; 8 hex por campo, 12 no hash do item. */
function h(value, len) {
  return crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex').slice(0, len)
}
const hashField = (v) => h(v, 8)

/**
 * Hash da lista de permissões.
 *
 * ORDENA antes de hashear: a ordem em que um coletor emite as actions é
 * acidente do parser (a do Azure segue a ordem do bloco JSON da doc; a da AWS,
 * a ordem do documento de policy). Sem o sort, um reordenamento sem mudança
 * de conteúdo publicaria "permissões alteradas" para o catálogo inteiro.
 *
 * Devolve `null` quando não há lista — que é diferente de lista vazia. As basic
 * roles do GCP têm permissionCount 0 porque o Google não publica a lista; uma
 * role de verdade sem permissão nenhuma seria `[]`. Tratar os dois casos como
 * iguais faria o dia em que o Google publicar a lista parecer "+N permissões"
 * em vez de "a fonte passou a publicar".
 */
function hashPerms(list) {
  if (list == null) return null
  const arr = [...list].map(String).sort()
  return h(arr.join('\n'), 8)
}

/**
 * Registro completo de um item de catálogo (role, policy, permission do Graph).
 * `perms` é a lista de strings, ou null quando a fonte não a publica.
 */
function roleRecord({ id, name, description, tier, category, isPrivileged, perms, sod }) {
  const hd = hashField(description)
  const hp = hashPerms(perms)
  const rec = {
    id,
    n: name ?? '',
    t: tier ?? null,
    c: category ?? null,
    p: isPrivileged ? 1 : 0,
    hd,
    hp,
    pc: perms == null ? null : perms.length,
  }
  if (sod && sod.length) rec.s = [...sod].sort()
  // O hash do item cobre os SETE campos declarados no cabeçalho — e só eles.
  //
  // `s` (as regras de SoD que citam o item) esteve fora numa primeira versão e
  // o teste pegou: com ele fora, uma role que entrasse numa regra nova tinha o
  // MESMO hash de antes. O diff pula item de hash igual, então o evento
  // sod-changed nunca saía — e, pior, collectionHash não mudava, então
  // build-snapshot.js nem gravava snapshot novo. Editar rules.ts não produzia
  // changelog nenhum.
  rec.h = h([rec.n, hd, rec.t, rec.c, rec.p, hp, (rec.s ?? []).join(',')].join(' '), 12)
  return rec
}

/**
 * Registro reduzido de uma folha (action/permission do universo).
 *
 * DUAS FORMAS, E A DIFERENÇA IMPORTA
 *   Folha SEM descrição vira uma STRING nua com o id. O índice da AWS lista as
 *   actions usadas pelas policies e não publica texto para elas; o do GCP idem.
 *   Na forma de objeto, cada uma dessas ~30 mil folhas gastava ~100 bytes em que
 *   `n` repetia `id`, `hd` era o sha256 de string vazia em TODAS, e `h` era
 *   função pura do id — 100% de redundância. Em string, a mesma informação
 *   (a action existe) cabe em ~30 bytes: 3,1 MB viram ~600 KB.
 *
 *   Folha COM descrição — as 17.605 actions do Azure, os 120 privileges do
 *   Workspace, as 71 permissões clássicas da IBM — continua objeto, porque
 *   "descrição alterada" é evento que se quer publicar.
 *
 * readItem() abaixo normaliza as duas formas para quem compara.
 */
function leafRecord({ id, name, description }) {
  if (description == null || description === '') return id
  const rec = { id, hd: hashField(description) }
  // `n` só quando difere do id. Nas 17.605 actions do Azure o nome É o id, e
  // repetir a string dobrava o arquivo. Um `h` próprio também seria redundante:
  // para folha, o hash do item é o da descrição — readItem() faz essa ponte.
  if (name && name !== id) rec.n = name
  return rec
}

/**
 * Normaliza um item lido de um snapshot — string nua ou objeto — para a forma
 * que o diff usa. Quem compara nunca precisa saber qual das duas veio.
 */
function readItem(raw) {
  if (typeof raw === 'string') {
    return { id: raw, n: raw, t: null, c: null, p: 0, hd: null, hp: null, pc: null, h: null }
  }
  // Folha em objeto não guarda `n` igual ao id nem `h` próprio.
  if (raw.h === undefined) return { ...raw, n: raw.n ?? raw.id, h: raw.hd, t: null, c: null, p: 0, hp: null, pc: null }
  return raw
}

/**
 * Serializa um item por linha.
 *
 * O git delta-comprime por linha. Um `JSON.stringify(obj, null, 2)` gastaria 10
 * linhas por item e um `JSON.stringify(obj)` colocaria o catálogo inteiro numa
 * linha só — no primeiro caso o diff fica ilegível, no segundo o delta é o
 * arquivo inteiro. Um item por linha dá as duas coisas: diff legível no
 * GitHub e delta mínimo no pack.
 */
function serializeItems(items) {
  return `[\n${items.map((it) => JSON.stringify(it)).join(',\n')}\n]`
}

/** Hash agregado de uma coleção: é o que decide se vale gravar um snapshot novo. */
function collectionHash(items) {
  return h(items.map(readItem).map((it) => it.id + ':' + (it.h || '')).sort().join('|'), 16)
}

module.exports = {
  CLOUDS, CLOUD_LABEL, COLLECTIONS, SOD_PLATFORM_TO_CLOUD,
  hashField, hashPerms, roleRecord, leafRecord, readItem, serializeItems, collectionHash,
}
