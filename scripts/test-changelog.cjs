#!/usr/bin/env node
/**
 * Testes de diffCollection — a função que decide o que o changelog anuncia.
 *
 * POR QUE ESTES TESTES E NÃO OUTROS
 *   O risco do changelog não é errar uma contagem: é ANUNCIAR COM CONFIANÇA
 *   algo que não aconteceu. Os casos abaixo são, um a um, uma forma conhecida
 *   de o changelog mentir — e o teste existe para provar que ele não mente.
 *
 *   O caso 4 é o mais caro: reproduz o cenário das três páginas em 404 do
 *   fetch-azure-roles-official.js. Sem a quarentena, o primeiro changelog do
 *   site anunciaria uma exclusão em massa que nunca aconteceu.
 *
 * node scripts/test-changelog.cjs
 */
const S = require('./lib/snapshot-schema')
const { diffCollection, massRemovalLimit, isPriv } = require('./build-changelog')

const META = { id: 'roles', label: 'Built-in Roles', kind: 'role', route: '/azure-rbac/roles' }

let passou = 0
let falhou = 0
function t(nome, fn) {
  try { fn(); passou++; console.log(`  ok   ${nome}`) }
  catch (e) { falhou++; console.log(`  FALHOU  ${nome}\n         ${e.message}`) }
}
function eq(a, b, msg) {
  const A = JSON.stringify(a); const B = JSON.stringify(b)
  if (A !== B) throw new Error(`${msg ?? ''} esperado ${B}, veio ${A}`)
}
const ok = (cond, msg) => { if (!cond) throw new Error(msg) }

/** Uma role de mentira, com os campos que o snapshot guarda. */
const role = (id, o = {}) => S.roleRecord({
  id, name: o.name ?? id, description: o.description ?? `desc de ${id}`,
  tier: o.tier ?? 'Contributor', category: o.category ?? 'Compute',
  isPrivileged: o.isPrivileged ?? false,
  // `in`, não `??`: `perms: null` é um caso de teste (fonte não publica a
  // lista), e `??` o trocaria pelo padrão silenciosamente.
  perms: 'perms' in o ? o.perms : ['a/read', 'b/write'],
  sod: o.sod,
})
const coll = (items, coverage = { complete: true }) => ({
  label: META.label, kind: 'role', route: META.route,
  count: items.length, hash: S.collectionHash(items), coverage, items,
})
const tipos = (evs) => evs.map((e) => e.type).sort()
const acha = (evs, tipo) => evs.find((e) => e.type === tipo)

console.log('\ndiffCollection\n')

// ── 1. Nada mudou ────────────────────────────────────────────────────────────
t('catálogo idêntico não gera evento nenhum', () => {
  const a = [role('r1'), role('r2')]
  const { events } = diffCollection('azure-rbac', META, '2026-09-01', coll(a), coll([role('r1'), role('r2')]))
  eq(tipos(events), [])
})

// ── 2. Os eventos simples ────────────────────────────────────────────────────
t('descrição alterada sai como description-changed, e sozinha', () => {
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1')]), coll([role('r1', { description: 'outra coisa' })]))
  eq(tipos(events), ['description-changed'])
})

t('role nova sai como created com tier e contagem', () => {
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1')]), coll([role('r1'), role('r2', { tier: 'Reader', perms: ['x/read'] })]))
  eq(tipos(events), ['created'])
  const e = acha(events, 'created')
  eq(e.tier, 'Reader'); eq(e.permissionCount, 1)
  eq(e.route, '/azure-rbac/roles/r2')
})

t('uma remoção abaixo do limiar sai como removed', () => {
  const antes = Array.from({ length: 100 }, (_, i) => role(`r${i}`))
  const depois = antes.slice(1)
  const { events, quarantine } = diffCollection('azure-rbac', META, '2026-09-01', coll(antes), coll(depois))
  eq(tipos(events), ['removed'])
  eq(quarantine.length, 0)
  eq(acha(events, 'removed').route, null, 'a página de detalhe morre com o item:')
})

// ── 3. Os eventos que só nós podemos emitir ──────────────────────────────────
t('mudança de tier sai separada da de categoria', () => {
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1')]),
    coll([role('r1', { tier: 'FullControl', category: 'Identity' })]))
  eq(tipos(events), ['category-changed', 'tier-changed'])
  const e = acha(events, 'tier-changed')
  eq([e.from, e.to], ['Contributor', 'FullControl'])
  eq(e.classification, 'iamscope-editorial', 'tier é curadoria nossa:')
})

t('entrar e sair de regra de SoD é um evento só, com os dois lados', () => {
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1', { sod: ['MS-001', 'MS-002'] })]),
    coll([role('r1', { sod: ['MS-002', 'MS-099'] })]))
  eq(tipos(events), ['sod-changed'])
  const e = acha(events, 'sod-changed')
  eq(e.sodAdded, ['MS-099']); eq(e.sodRemoved, ['MS-001'])
})

t('privilege-changed é o que alimenta o feed -privileged', () => {
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1')]), coll([role('r1', { isPrivileged: true })]))
  eq(tipos(events), ['privilege-changed'])
  ok(isPriv(acha(events, 'privilege-changed')), 'devia entrar no feed de privilegiadas')
})

// ── 4. A armadilha das três páginas em 404 ───────────────────────────────────
t('cobertura parcial NÃO vira exclusão em massa', () => {
  // 504 roles; a coleta seguinte perde 40 porque três páginas deram 404.
  const antes = Array.from({ length: 504 }, (_, i) => role(`r${i}`))
  const depois = antes.slice(40)
  const { events, quarantine } = diffCollection('azure-rbac', META, '2026-09-01',
    coll(antes),
    coll(depois, { complete: false, missing: ['mixed-reality', 'virtual-desktop-infrastructure', 'other'], reason: 'http-404' }))

  ok(!events.some((e) => e.type === 'removed'), 'nenhuma remoção pode ser publicada')
  const u = acha(events, 'unknown')
  ok(u, 'tem de sair um evento unknown')
  eq(u.count, 40)
  ok(/cobertura parcial/.test(u.reason), 'o motivo tem de citar a cobertura')
  ok(u.reason.includes('mixed-reality'), 'e tem de nomear a página que faltou')
  eq(quarantine.length, 1)
  eq(quarantine[0].key, 'azure-rbac:roles:2026-09-01')
  eq(quarantine[0].items.length, 40)
  ok(acha(events, 'coverage-changed'), 'a mudança de cobertura também é evento')
})

t('remoção em massa SEM cobertura declarada também é retida', () => {
  // Nenhum coletor declarou nada. É a defesa que funciona com os coletores
  // como eles estão hoje.
  const antes = Array.from({ length: 504 }, (_, i) => role(`r${i}`))
  const depois = antes.slice(40)
  const { events, quarantine } = diffCollection('azure-rbac', META, '2026-09-01', coll(antes), coll(depois))
  ok(!events.some((e) => e.type === 'removed'), 'nenhuma remoção publicada')
  const u = acha(events, 'unknown')
  ok(/limiar/.test(u.reason), 'o motivo tem de citar o limiar')
  eq(quarantine.length, 1)
})

t('o limiar é max(5, 2%) — e 2% de 504 é 11', () => {
  eq(massRemovalLimit(504), 11)
  eq(massRemovalLimit(10), 5, 'em catálogo pequeno vale o piso de 5:')
  eq(massRemovalLimit(2389), 48)
})

t('11 remoções passam, 12 são retidas — o limiar é exclusivo', () => {
  const antes = Array.from({ length: 504 }, (_, i) => role(`r${i}`))
  const onze = diffCollection('azure-rbac', META, '2026-09-01', coll(antes), coll(antes.slice(11)))
  eq(onze.events.filter((e) => e.type === 'removed').length, 11)
  eq(onze.quarantine.length, 0)
  const doze = diffCollection('azure-rbac', META, '2026-09-01', coll(antes), coll(antes.slice(12)))
  eq(doze.events.filter((e) => e.type === 'removed').length, 0)
  eq(doze.quarantine.length, 1)
})

// ── 5. Nulo não é vazio ──────────────────────────────────────────────────────
t('lista de permissões não publicada (null) não é lista vazia ([])', () => {
  ok(S.hashPerms(null) === null, 'null tem de hashear para null')
  ok(S.hashPerms([]) !== null, 'lista vazia tem hash de verdade')
})

t('a fonte passar a publicar a lista não é "ganhou N permissões"', () => {
  // O caso das basic roles do GCP: permissionCount 0 porque o Google não
  // publica a lista. No dia em que publicar, isso não é elevação de privilégio.
  const { events } = diffCollection('gcp', META, '2026-09-01',
    coll([role('owner', { perms: null })]),
    coll([role('owner', { perms: ['a', 'b', 'c'] })]))
  eq(tipos(events), ['permissions-changed'])
  const e = acha(events, 'permissions-changed')
  eq([e.from, e.to, e.delta], [null, 3, null])
  ok(/lacuna de documenta/.test(e.summary.pt) && /documentation gap/.test(e.summary.en),
    'o texto tem de dizer que é lacuna, não acréscimo — nos dois idiomas')
})

t('troca de permissão sem mudar a contagem é detectada', () => {
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1', { perms: ['a/read', 'b/write'] })]),
    coll([role('r1', { perms: ['a/read', 'c/delete'] })]))
  eq(tipos(events), ['permissions-changed'])
  eq(acha(events, 'permissions-changed').delta, 0)
})

t('reordenar a lista de permissões NÃO gera evento', () => {
  // O parser do Azure emite na ordem do bloco JSON da doc; o da AWS, na do
  // documento de policy. Sem o sort, um reordenamento publicaria "permissões
  // alteradas" no catálogo inteiro.
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1', { perms: ['a/read', 'b/write', 'c/delete'] })]),
    coll([role('r1', { perms: ['c/delete', 'a/read', 'b/write'] })]))
  eq(tipos(events), [])
})

// ── 6. Renomear ──────────────────────────────────────────────────────────────
t('renomear com o mesmo slug é renamed, não created+removed', () => {
  const { events } = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1', { name: 'Velho Nome' })]),
    coll([role('r1', { name: 'Nome Novo' })]))
  eq(tipos(events), ['renamed'])
  eq([acha(events, 'renamed').from, acha(events, 'renamed').to], ['Velho Nome', 'Nome Novo'])
})

// ── 7. Folhas em string nua ──────────────────────────────────────────────────
t('folha guardada como string nua compara igual a folha em objeto', () => {
  const leafMeta = { id: 'actions', label: 'Actions', kind: 'leaf', route: '/azure-rbac/permissions' }
  const antes = ['s3:GetObject', 's3:PutObject']
  const depois = ['s3:GetObject', 's3:DeleteObject']
  const { events } = diffCollection('aws', leafMeta, '2026-09-01',
    { count: 2, hash: S.collectionHash(antes), coverage: { complete: true }, items: antes },
    { count: 2, hash: S.collectionHash(depois), coverage: { complete: true }, items: depois })
  eq(tipos(events), ['created', 'removed'])
  eq(acha(events, 'created').itemName, 's3:DeleteObject')
})

t('folha com descrição detecta description-changed', () => {
  const leafMeta = { id: 'actions', label: 'Actions', kind: 'leaf', route: '/azure-rbac/permissions' }
  const a = [S.leafRecord({ id: 'X/READ', name: 'X/READ', description: 'Ler X' })]
  const b = [S.leafRecord({ id: 'X/READ', name: 'X/READ', description: 'Ler o recurso X' })]
  const { events } = diffCollection('azure-rbac', leafMeta, '2026-09-01',
    { count: 1, hash: S.collectionHash(a), coverage: { complete: true }, items: a },
    { count: 1, hash: S.collectionHash(b), coverage: { complete: true }, items: b })
  eq(tipos(events), ['description-changed'])
})

// ── 8. O hash cobre o que foi declarado, e só ────────────────────────────────
t('o hash do item cobre nome, descrição, tier, categoria, privilégio, permissões e SoD', () => {
  const base = role('r1')
  const variantes = {
    name: role('r1', { name: 'Outro' }),
    description: role('r1', { description: 'Outra' }),
    tier: role('r1', { tier: 'Reader' }),
    category: role('r1', { category: 'Storage' }),
    isPrivileged: role('r1', { isPrivileged: true }),
    perms: role('r1', { perms: ['z/read'] }),
    sod: role('r1', { sod: ['MS-001'] }),
  }
  for (const [campo, v] of Object.entries(variantes)) {
    ok(v.h !== base.h, `mudar ${campo} tinha de mudar o hash do item`)
  }
})

t('o id NÃO entra no hash — ele é a identidade, não conteúdo', () => {
  const a = S.roleRecord({ id: 'x', name: 'N', description: 'D', tier: 'Reader', category: 'C', isPrivileged: false, perms: ['p'] })
  const b = S.roleRecord({ id: 'y', name: 'N', description: 'D', tier: 'Reader', category: 'C', isPrivileged: false, perms: ['p'] })
  eq(a.h, b.h)
})

// ── 9. Ids de evento estáveis ────────────────────────────────────────────────
t('todo evento tem resumo nos dois idiomas', () => {
  const casos = [
    diffCollection('azure-rbac', META, '2026-09-01', coll([role('r1')]), coll([role('r1'), role('r2')])),
    diffCollection('azure-rbac', META, '2026-09-01', coll([role('r1', { tier: 'Reader' })]), coll([role('r1')])),
    diffCollection('azure-rbac', META, '2026-09-01',
      coll(Array.from({ length: 504 }, (_, i) => role(`r${i}`))),
      coll(Array.from({ length: 504 }, (_, i) => role(`r${i}`)).slice(40), { complete: false, missing: ['other'], reason: 'http-404' })),
  ]
  for (const { events } of casos) {
    for (const e of events) {
      ok(e.summary && typeof e.summary.pt === 'string' && e.summary.pt.length > 0, `${e.type} sem pt`)
      ok(typeof e.summary.en === 'string' && e.summary.en.length > 0, `${e.type} sem en`)
      ok(e.summary.pt !== e.summary.en, `${e.type}: pt e en idênticos — tradução esquecida?`)
    }
  }
})

t('o id do evento é estável entre execuções', () => {
  const um = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1')]), coll([role('r1', { tier: 'Reader' })])).events[0]
  const dois = diffCollection('azure-rbac', META, '2026-09-01',
    coll([role('r1')]), coll([role('r1', { tier: 'Reader' })])).events[0]
  eq(um.id, dois.id)
  eq(um.id, 'azure-rbac:roles:r1:2026-09-01:tier-changed')
})

console.log(`\n${passou} ok, ${falhou} falhou\n`)
process.exitCode = falhou ? 1 : 0
