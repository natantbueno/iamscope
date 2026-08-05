#!/usr/bin/env node
/**
 * Resolve os slugs de src/data/compare/equivalences.json contra os datasets.
 *
 * POR QUE PRECISOU
 *   As funções comparadas referenciam uma role por cloud. Muitas entradas
 *   tinham só o NOME da role, sem slug — então a página de comparação exibia o
 *   texto sem link para a página de detalhe. Outras tinham slug que deixou de
 *   existir depois de regerarmos os datasets (Azure 926 -> 504, GCP 232 -> 2381).
 *
 *   Auditoria de 30/07: 147 entradas, sendo 48 com slug válido, 22 "N/A"
 *   legítimas, 47 resolvíveis pelo nome e 30 sem correspondente.
 *
 *   Auditoria de 05/08: 56 células sem link. Duas causas distintas, que a
 *   contagem única escondia:
 *
 *     30  N/A legítimas — o conceito não existe naquela cloud. Não são bug.
 *     26  nome de role real sem slug. Dessas, 20 eram IBM Cloud: o dataset foi
 *         regerado em 03/08 e passou de 83 "roles" clássicas inventadas para as
 *         7 roles oficiais. O resolver sozinho recupera 16 delas.
 *
 *   As 12 restantes nunca casariam pelo nome, e é isso que a tabela ALIASES
 *   abaixo corrige.
 *
 * COMO RESOLVE
 *   Casa o campo `role` contra name / roleId / arn / slug do dataset da cloud,
 *   nesta ordem, sempre em minúsculas. Tenta também o nome sem o parêntese
 *   final ("Manager (Object Storage)" -> "Manager") e cada lado de um " / ".
 *
 *   NÃO inventa correspondência aproximada: se não bater exatamente, a entrada
 *   fica sem slug e é reportada. Vincular a role errada numa página de
 *   equivalência seria pior do que não vincular.
 *
 * Uso:
 *   node scripts/fix-compare-slugs.js --dry-run
 *   node scripts/fix-compare-slugs.js
 */
const fs = require('fs')
const path = require('path')
const { loadTs } = require('./lib/load-ts')

const ROOT = path.join(__dirname, '..')
const FILE = path.join(ROOT, 'src', 'data', 'compare', 'equivalences.json')
const DRY = process.argv.includes('--dry-run')

// ─── ALIASES ────────────────────────────────────────────────────────────────
//
// Correções de NOME, aplicadas antes da resolução.
//
// O resolver casa `role` contra o dataset. Doze entradas nunca casavam porque
// o texto escrito aqui não era o nome de nenhuma role: ou usava uma convenção
// nossa ("Billing — Editor"), ou nomeava um conceito que não é role ("Root
// User"), ou apontava para um privilégio que não existe naquela cloud
// (roles/chrome.management.admin não é role do GCP IAM).
//
// Cada linha diz o nome novo e por quê. Onde o conceito realmente não existe,
// o valor é N/A explícito — melhor do que um nome que não leva a lugar nenhum.
//
// Chave: `${equivalenciaId}:${cloud}`.
const ALIASES = {
  // AWS — o root user não é policy e não tem página. Quem tem é a policy que a
  // OrganizationAccountAccessRole anexa na conta-membro: AdministratorAccess.
  'global-admin:aws': {
    role: 'Root User / AdministratorAccess',
    notes: 'O root user da conta não é uma policy e não tem página de detalhe. ' +
           'A OrganizationAccountAccessRole, que o AWS Organizations cria na conta-membro, ' +
           'anexa AdministratorAccess — é essa a policy vinculada aqui.',
  },

  // GCP — o nome oficial é "Organization Administrator"; usamos o roleId, que é
  // a forma já adotada nas outras células GCP.
  'global-admin:gcp': { role: 'roles/resourcemanager.organizationAdmin' },

  // AWS — "IAM User Management (custom policy)" descrevia uma policy que não
  // existe no catálogo gerenciado. A gerenciada equivalente é IAMFullAccess.
  'user-admin:aws': {
    role: 'IAMFullAccess',
    notes: 'IAMFullAccess é a policy gerenciada mais próxima, e é ampla demais para o dia a dia: ' +
           'concede também iam:CreatePolicy e iam:AttachRolePolicy, o que permite escalar privilégio. ' +
           'Para gestão de usuários, prefira policy própria restrita a iam:*User* e iam:*Group*.',
  },

  // GCP — roles/chrome.management.admin não é role do GCP IAM. O privilégio de
  // gerenciar dispositivos vive no Google Workspace / Chrome Enterprise, que
  // já é a coluna GWS desta mesma linha.
  'intune-admin:gcp': {
    role: 'N/A',
    notes: 'O GCP IAM não gerencia endpoints. O privilégio equivalente é do Google Workspace / ' +
           'Chrome Enterprise — ver a coluna GWS desta mesma linha. Para dispositivos não-Chrome, ' +
           'a gestão é feita por MDM de terceiros integrado ao Workspace.',
  },

  // Azure — o nome oficial da built-in termina em "Role".
  'container-admin:azureRbac': { role: 'Azure Kubernetes Service Contributor Role' },

  // ─── IBM Cloud ────────────────────────────────────────────────────────────
  //
  // A IBM tem 7 roles e só 7: Viewer, Operator, Editor, Administrator
  // (plataforma) e Reader, Writer, Manager (serviço). O que varia é o SERVIÇO
  // sobre o qual a role é atribuída — e a IBM não publica a lista de ações por
  // role, porque cada serviço mapeia as próprias.
  //
  // Por isso a convenção aqui é `Role (Serviço)`: a role é o nome real e
  // linkável; o parêntese é o escopo. As entradas abaixo usavam nomes que a
  // IBM não publica ("Billing Manager", "Service ID Creator") ou uma pontuação
  // nossa ("Billing — Editor").
  'billing-admin:ibmCloud': {
    role: 'Administrator (Billing)',
    notes: 'A IBM não publica uma role "Billing Manager". Billing é um serviço de gerenciamento ' +
           'de conta, e o acesso a ele é a role de plataforma Administrator atribuída sobre esse serviço.',
  },
  'user-admin:ibmCloud': { role: 'Editor (User Management)' },
  'security-admin:ibmCloud': { role: 'Administrator (Security and Compliance Center)' },
  'compliance-admin:ibmCloud': { role: 'Administrator (Security and Compliance Center)' },
  'application-admin:ibmCloud': {
    role: 'Administrator (IAM Identity Service)',
    notes: 'Cobre registrar e gerenciar service IDs e suas API keys. Quando a conta restringe a ' +
           'criação de service IDs, a IBM exige adicionalmente a role Service ID Creator, que é ' +
           'específica desse serviço e não está entre as 7 roles canônicas do IAM.',
  },
  'cost-management-admin:ibmCloud': { role: 'Editor (Billing)' },
  'audit-log-admin:ibmCloud': { role: 'Administrator (Activity Tracker)' },

  // ─── Google Workspace ─────────────────────────────────────────────────────
  //
  // O Workspace tem 14 roles de admin e 120 privilégios. Security Center e
  // Billing Management são PRIVILÉGIOS: não existem como role, e /privileges é
  // página de lista, sem rota de detalhe. Linkar para a lista não seria link de
  // detalhe, e inventar uma role seria pior. Ficam N/A com a nota nomeando o
  // privilégio exato — o painel expandido continua mostrando permissões e
  // mitigações, que é onde a informação útil está.
  'security-operations:googleWorkspace': {
    role: 'N/A',
    notes: 'O Workspace não tem role de admin para operação de segurança. O privilégio é ' +
           'Security Center (painel + ferramenta de investigação), anexado a uma custom role. ' +
           'A ferramenta de investigação lê conteúdo de mensagem de qualquer usuário do domínio.',
  },
  'billing-reader:googleWorkspace': {
    role: 'N/A',
    notes: 'O Workspace não tem role de admin para billing, nem privilégio somente-leitura. ' +
           'O privilégio é Billing Management, anexado a uma custom role, e ele já permite ' +
           'alterar assinatura e contagem de licença — não existe leitura pura aqui.',
  },
}

// Nota padrão das células IBM no formato `Role (Serviço)`. Sem ela, o link
// parece errado: o texto diz "Manager (Backup for VPC)" e a página de destino
// se chama só "Manager". A nota explica que é o modelo da IBM, não um link
// trocado. Só é aplicada onde não existe nota escrita à mão.
const IBM_SCOPE_RE = /^(Viewer|Operator|Editor|Administrator|Reader|Writer|Manager) \((.+)\)$/
const ibmScopeNote = (role, servico) =>
  `A IBM tem 7 roles e nenhuma é específica de serviço: o que varia é o serviço sobre o qual a ` +
  `role é atribuída. Aqui é a role de ${role} sobre ${servico}. A IBM não publica a lista de ` +
  `ações por role — cada serviço mapeia as próprias.`

const ds = {
  entraId:         loadTs('src/data/roles.ts').ROLES,
  azureRbac:       loadTs('src/data/azureRbac.ts').AZURE_ROLES,
  aws:             loadTs('src/data/aws.ts').AWS_POLICIES,
  gcp:             loadTs('src/data/gcp.ts').GCP_ROLES,
  googleWorkspace: loadTs('src/data/googleWorkspace.ts').GWS_ROLES,
  ibmCloud:        loadTs('src/data/ibmCloud.ts').IBM_ROLES,
}

const idx = {}
for (const [cloud, rows] of Object.entries(ds)) {
  const m = new Map()
  for (const r of rows) {
    const add = (k) => { if (k) { const s = String(k).toLowerCase(); if (!m.has(s)) m.set(s, r) } }
    add(r.name); add(r.roleId); add(r.arn); add(r.slug)
  }
  idx[cloud] = m
}

function resolver(cloud, nome) {
  const m = idx[cloud]
  if (!m) return null
  const partes = nome.split(' / ').map(s => s.trim())
  const tentativas = [
    nome,
    nome.split(' (')[0].trim(),   // "Manager (Object Storage)"
    partes[0],                    // "Root User / AdministratorAccess"
    partes[partes.length - 1],    // idem, pelo outro lado
  ]
  for (const t of tentativas) {
    const hit = t && m.get(t.toLowerCase())
    if (hit) return hit
  }
  return null
}

const eq = JSON.parse(fs.readFileSync(FILE, 'utf8'))

let jaOk = 0, na = 0, corrigidos = 0, renomeados = 0, notasIbm = 0
const semCorrespondente = []
const aliasesNaoUsados = new Set(Object.keys(ALIASES))

for (const e of eq) {
  for (const [cloud, ent] of Object.entries(e.clouds || {})) {
    // 1. alias de nome, se houver
    const alias = ALIASES[`${e.id}:${cloud}`]
    if (alias) {
      aliasesNaoUsados.delete(`${e.id}:${cloud}`)
      if (alias.role && ent.role !== alias.role) {
        console.log(`  alias ${e.id.padEnd(24)} ${cloud.padEnd(16)} ${ent.role} -> ${alias.role}`)
        ent.role = alias.role
        renomeados++
      }
      if (alias.notes) ent.notes = alias.notes
    }

    const nome = (ent.role || '').trim()
    if (!nome || nome === 'N/A') { na++; delete ent.slug; continue }

    // 2. nota de escopo das células IBM no formato `Role (Serviço)`
    if (cloud === 'ibmCloud') {
      const m = nome.match(IBM_SCOPE_RE)
      if (m && !ent.notes) { ent.notes = ibmScopeNote(m[1], m[2]); notasIbm++ }
    }

    // 3. slug
    if (ent.slug && idx[cloud]?.has(ent.slug.toLowerCase())) { jaOk++; continue }

    const hit = resolver(cloud, nome)
    if (hit) {
      const antes = ent.slug
      ent.slug = hit.slug
      corrigidos++
      console.log(`  slug  ${e.id.padEnd(24)} ${cloud.padEnd(16)} ${antes ? `${antes} -> ` : ''}${hit.slug}`)
    } else {
      delete ent.slug // slug quebrado é pior que nenhum: gera link 404
      semCorrespondente.push(`${e.id.padEnd(24)} ${cloud.padEnd(16)} ${nome}`)
    }
  }
}

console.log(`\n${'='.repeat(62)}`)
console.log(`Já corretas          : ${jaOk}`)
console.log(`N/A (sem equivalente): ${na}`)
console.log(`Renomeadas por alias : ${renomeados}`)
console.log(`Notas IBM aplicadas  : ${notasIbm}`)
console.log(`Corrigidas           : ${corrigidos}`)
console.log(`Sem correspondente   : ${semCorrespondente.length}`)
console.log('='.repeat(62))

if (aliasesNaoUsados.size) {
  console.log('\nALIASES que não casaram com nenhuma entrada — provavelmente obsoletos:')
  for (const k of aliasesNaoUsados) console.log(`  ${k}`)
}

if (semCorrespondente.length) {
  console.log('\nSem correspondente no dataset — ficam sem link, precisam de revisão manual:')
  for (const l of semCorrespondente) console.log(`  ${l}`)
  console.log('\nQualquer linha aqui é uma célula que mostra nome de role e não leva a lugar')
  console.log('nenhum. Ou o nome está errado (corrigir em ALIASES), ou a role não existe')
  console.log('naquela cloud (marcar N/A, também em ALIASES).')
}

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }

fs.writeFileSync(FILE, JSON.stringify(eq, null, 2) + '\n')
console.log(`\nEscrito: src/data/compare/equivalences.json`)
