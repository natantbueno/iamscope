#!/usr/bin/env node
/**
 * Teste offline do parser de scripts/fetch-gcp-roles-from-docs.js.
 *
 * O fixture abaixo reproduz o markup real das docs do Google, incluindo os
 * casos que já quebraram versões anteriores do parser:
 *   - <wbr> injetado no meio dos identificadores;
 *   - <span class="role-description"> e <span class="role-description custom">;
 *   - wildcard dentro de <devsite-expandable> com as permissões concretas em <li>;
 *   - launch stage (Beta) ao lado do título;
 *   - role sem "lowest-level resources".
 *
 * Uso: node scripts/test-gcp-docs-parser.js
 */
const { parseRoles, discoverServices, parseBasicRoles } = require('./fetch-gcp-roles-from-docs')

/** Markup real das duas tabelas de roles-overview. */
const OVERVIEW_FIXTURE = `
<table>
  <thead><tr><th>Basic role</th><th>Permissions</th></tr></thead>
  <tbody>
    <tr><td><strong>Reader</strong> (<code translate="no" dir="ltr">roles/reader</code>)</td>
        <td><p>Permissions for read-only actions that don't affect state.</p>
            <p>For a list of permissions in the Reader role, see the console:</p></td></tr>
    <tr><td><strong>Admin</strong> (<code translate="no" dir="ltr">roles/admin</code>)</td>
        <td><p>All Writer permissions, plus permissions for actions like the following:</p>
            <ul><li>Managing roles and permissions</li><li>Setting up billing</li></ul></td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th>Legacy basic role</th><th>Permissions</th></tr></thead>
  <tbody>
    <tr><td><strong>Viewer</strong> (<code translate="no" dir="ltr">roles/viewer</code>)</td>
        <td><p>Permissions for read-only actions.</p></td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th>Something else</th><th>Nope</th></tr></thead>
  <tbody><tr><td><strong>X</strong> (<code>roles/ignoreme</code>)</td><td><p>no</p></td></tr></tbody>
</table>
`

const FIXTURE = `
<table>
<tr>
  <td class="role-description">
    <h4 class="role-title add-link" id="storage.admin">Storage Admin</h4>
    <p class="iamperm-marginless">(<code translate="no" dir="ltr">roles/<wbr>storage.admin</code>)</p>
    <span class="role-description custom">
      <p>Grants full control of objects and buckets.</p>
      <p>When applied to an individual bucket, control applies only to that bucket.</p>
    </span>
    <p>Lowest-level resources where you can grant this role:</p>
    <ul class="role-lowest-resource"><li> Bucket </li></ul>
  </td>
  <td class="role-permissions">
    <p><code translate="no" dir="ltr">firebase.projects.get</code></p>
    <devsite-expandable id="expandable-storage.admin-storage.buckets.*" class="arrow-icon iamperm-wildcard-expandable">
      <p class="showalways iamperm-marginless">
        <span class="iamperm-wildcard"><code translate="no" dir="ltr">storage.buckets.*</code></span>
      </p>
      <ul class="iamperm-wildcard-list">
        <li><code translate="no" dir="ltr">storage.<wbr>buckets.<wbr>create</code></li>
        <li><code translate="no" dir="ltr">storage.buckets.get</code></li>
      </ul>
    </devsite-expandable>
    <p><code translate="no" dir="ltr">orgpolicy.policy.get</code></p>
  </td>
</tr>
<tr>
  <td class="role-description">
    <h4 class="role-title add-link" id="storage.bucketViewer">Storage Bucket Viewer</h4>
    <span class="launch-stage-pre-ga">Beta</span>
    <p class="iamperm-marginless">(<code translate="no" dir="ltr">roles/storage.bucketViewer</code>)</p>
    <span class="role-description"><p>Enables Get and List operations.</p></span>
  </td>
  <td class="role-permissions">
    <p><code translate="no" dir="ltr">storage.buckets.get</code></p>
  </td>
</tr>
</table>
<a href="/iam/docs/roles-permissions/compute">Compute</a>
<a href="/iam/docs/roles-permissions/bigquery">BigQuery</a>
`

let fails = 0
function check(label, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) { console.log(`  ok   ${label}`) } else {
    console.log(`  FALHA ${label}\n        esperado: ${e}\n        obtido  : ${a}`)
    fails++
  }
}

const roles = parseRoles(FIXTURE, 'storage')
console.log(`parseRoles -> ${roles.length} roles\n`)

check('quantidade de roles', roles.length, 2)

const [a, b] = roles
check('roleId sem <wbr>', a.roleId, 'roles/storage.admin')
check('título', a.title, 'Storage Admin')
check('descrição (2 parágrafos juntos)', a.description,
  'Grants full control of objects and buckets. When applied to an individual bucket, control applies only to that bucket.')
check('lowest-level resources', a.lowestResources, ['Bucket'])
check('wildcards capturados', a.wildcards, ['storage.buckets.*'])
check('permissões concretas (wildcard expandido + soltas, sem duplicar)',
  a.permissions,
  ['firebase.projects.get', 'orgpolicy.policy.get', 'storage.buckets.create', 'storage.buckets.get'])
check('wildcard NÃO entra na lista de permissões', a.permissions.includes('storage.buckets.*'), false)

check('segunda role: classe role-description sem "custom"', b.description, 'Enables Get and List operations.')
check('launch stage', b.stage, 'Beta')
check('sem lowest-resources', b.lowestResources, [])
check('roleId da segunda', b.roleId, 'roles/storage.bucketViewer')

const svcs = discoverServices(FIXTURE)
check('discoverServices', svcs, ['bigquery', 'compute'])

console.log('\nparseBasicRoles:')
const basics = parseBasicRoles(OVERVIEW_FIXTURE)
check('quantidade (ignora tabela não relacionada)', basics.length, 3)
check('ids', basics.map((r) => r.roleId), ['roles/reader', 'roles/admin', 'roles/viewer'])
check('títulos', basics.map((r) => r.title), ['Reader', 'Admin', 'Viewer'])
check('kind basic vs legacy', basics.map((r) => r.kind), ['basic', 'basic', 'legacy-basic'])
check('descrição = só o primeiro <p>', basics[0].description,
  "Permissions for read-only actions that don't affect state.")
check('descrição terminada em ":" puxa o <ul> seguinte', basics[1].description,
  'All Writer permissions, plus permissions for actions like the following: '
  + 'Managing roles and permissions; Setting up billing.')
check('permissões vazias (Google não publica)', basics[0].permissions, [])
check('tem aviso explicando o vazio', /gcloud iam roles describe/.test(basics[0].permissionsNote), true)
check('tabela irrelevante ignorada', basics.some((r) => r.roleId === 'roles/ignoreme'), false)

console.log(fails === 0 ? '\nTodos os testes passaram.' : `\n${fails} teste(s) falharam.`)
if (fails) process.exitCode = 1
