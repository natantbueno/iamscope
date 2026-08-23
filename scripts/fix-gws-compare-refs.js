#!/usr/bin/env node
/**
 * Corrige as referências a Google Workspace em src/data/compare/equivalences.json
 * depois da recoleta oficial das admin roles.
 *
 * CONTEXTO
 *   O Compare apontava para roles que não existem no Google Workspace — Gmail
 *   Admin, Vault Admin, Security Admin, Reports Admin, Domain Admin, Audit
 *   Admin, Billing Admin. Elas vinham do dataset antigo, que tinha 30 roles
 *   inventadas. Ver scripts/gws-official-source.json.
 *
 * CRITÉRIO
 *   Só aponta para uma role quando a documentação oficial sustenta a
 *   equivalência. Onde o Google resolve a função por PRIVILÉGIO e não por role
 *   pré-construída, a entrada vira 'N/A' e o texto passa a nomear o privilégio
 *   oficial que cobre o caso — isso é mais útil que apontar para uma role
 *   inexistente, e é honesto.
 *
 * Uso:
 *   node scripts/fix-gws-compare-refs.js --dry-run
 *   node scripts/fix-gws-compare-refs.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const FILE = path.join(ROOT, 'src', 'data', 'compare', 'equivalences.json')
const DRY = process.argv.includes('--dry-run')
const { loadTs } = require('./lib/load-ts')

const { GWS_ROLES } = loadTs('src/data/googleWorkspace.ts')
const porNome = new Map(GWS_ROLES.map((r) => [r.name, r]))

/**
 * função do Compare -> como o Google Workspace realmente resolve.
 * `role: null` significa que não existe role pré-construída equivalente.
 */
const MAPA = {
  'Storage / Object Storage Administrator': {
    role: 'Storage Admin',
    notes: 'Storage Admin é role pré-construída oficial: define limites de armazenamento e '
      + 'concede acesso total a Reports e às configurações do Drive.',
  },
  'Exchange / Email Administrator': {
    role: 'Services Admin',
    notes: 'Não existe role de Gmail. A administração das configurações do Gmail é feita pelo '
      + 'Services Admin, ou por custom role com o privilégio Gmail (Settings, Email Log Search, '
      + 'Access Admin Quarantine).',
  },
  'Billing Administrator': {
    role: null,
    notes: 'Não há role pré-construída de faturamento. O privilégio oficial é Billing Management, '
      + 'atribuível por custom role. Reseller Admin cobre faturamento apenas no contexto de revenda.',
  },
  'Read-Only / Viewer (Global)': {
    role: null,
    notes: 'Não há role somente-leitura global. Groups Reader é a única read-only pré-construída e '
      + 'alcança apenas grupos. Para leitura ampla, use custom role com os privilégios Read de '
      + 'Users, Groups e Organizational Units.',
  },
  'Security Administrator': {
    role: null,
    notes: 'Não há role pré-construída de segurança. Os privilégios oficiais são Security '
      + '(User Security Management, Security Settings) e Security Center, atribuíveis por custom role.',
  },
  'Conditional Access Administrator': {
    role: null,
    notes: 'Não há role pré-construída. O equivalente é o privilégio Data Security '
      + '(Access level management, Rule management), que controla o context-aware access.',
  },
  'Audit & Compliance Administrator': {
    role: null,
    notes: 'Não há role pré-construída. Os privilégios oficiais são Reports (logs de auditoria) e '
      + 'Google Vault (retenção, holds, eDiscovery) — este último não vem junto com Service Settings.',
  },
  'DNS Administrator': {
    role: null,
    notes: 'Não há role pré-construída. O privilégio oficial é Domains (Domain Settings, '
      + 'Domain Management), que inclui adicionar e remover domínios e aliases.',
  },
  'Backup & Recovery Administrator': {
    role: null,
    notes: 'Não há role pré-construída. O privilégio oficial é Google Vault, que cobre retenção, '
      + 'holds e exportação. Restaurar usuários excluídos é exclusivo do Super Admin.',
  },
  'Log Analytics / Monitoring Administrator': {
    role: null,
    notes: 'Não há role pré-construída. O privilégio oficial é Reports, que dá acesso a relatórios '
      + 'de uso e logs de auditoria e não pode ser limitado a unidades organizacionais.',
  },
}

const eq = JSON.parse(fs.readFileSync(FILE, 'utf8'))
const mudancas = []
const naoAplicados = new Set(Object.keys(MAPA))

for (const e of eq) {
  const c = e.clouds?.googleWorkspace
  if (!c) continue

  const regra = MAPA[e.name]
  if (!regra) continue
  naoAplicados.delete(e.name)

  const antes = c.role
  if (regra.role) {
    const r = porNome.get(regra.role)
    if (!r) {
      console.error(`Role de destino não existe no dataset: ${regra.role}`)
      process.exitCode = 1
      return
    }
    c.role = r.name
    c.slug = r.slug
  } else {
    c.role = 'N/A'
    delete c.slug
  }
  c.notes = regra.notes
  mudancas.push({ func: e.name, antes, depois: c.role })
}

// Validação final: nenhuma referência a role inexistente pode sobrar
const restantes = []
for (const e of eq) {
  const c = e.clouds?.googleWorkspace
  if (!c || c.role === 'N/A') continue
  if (!porNome.has(c.role)) restantes.push(`${e.name} -> ${c.role}`)
  else if (c.slug && porNome.get(c.role).slug !== c.slug) restantes.push(`${e.name} -> slug errado (${c.slug})`)
}

for (const m of mudancas) {
  console.log(`  ${m.func.padEnd(42)} ${String(m.antes).padEnd(46)} -> ${m.depois}`)
}
console.log(`\n${mudancas.length} entrada(s) corrigida(s).`)

if (naoAplicados.size) {
  console.log(`\nRegras não aplicadas (função sumiu do Compare?): ${[...naoAplicados].join(', ')}`)
}
if (restantes.length) {
  console.error(`\n${restantes.length} referência(s) ainda inválida(s) — nada foi escrito:`)
  for (const r of restantes) console.error(`  - ${r}`)
  process.exitCode = 1
  return
}
console.log('Nenhuma referência inválida a role do Google Workspace.')

if (DRY) { console.log('\n--dry-run: nada escrito.'); return }
fs.writeFileSync(FILE, `${JSON.stringify(eq, null, 2)}\n`)
console.log(`\nEscrito: src/data/compare/equivalences.json`)
