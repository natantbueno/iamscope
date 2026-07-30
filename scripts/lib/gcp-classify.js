'use strict'
/**
 * Classificação editorial do IAM Scope para roles do GCP + helpers de geração.
 *
 * ATENÇÃO: tier, categoria e isPrivileged NÃO vêm do Google. O Google não
 * publica nível de risco por role. São derivados de sinais objetivos da própria
 * role (roleId e permissões reais) para serem reprodutíveis, e a UI precisa
 * rotular como classificação nossa — nunca como dado oficial.
 *
 * O que É oficial e vem do Google: roleId, título, descrição, permissões,
 * launch stage e "lowest-level resources".
 *
 * Este módulo é compartilhado por:
 *   - scripts/fetch-gcp-roles.js            (IAM API, exige credencial)
 *   - scripts/fetch-gcp-roles-from-docs.js  (docs públicas, sem credencial)
 * para que as duas rotas produzam exatamente a mesma classificação.
 */

function classifyTier(roleId, perms) {
  const id = String(roleId).toLowerCase()
  if (id === 'roles/owner') return 'ProjectOwner'
  if (id === 'roles/editor') return 'Editor'
  if (id === 'roles/viewer' || id === 'roles/browser') return 'Viewer'
  const hasSetIam = perms.some((p) => p.endsWith('.setIamPolicy'))
  if (hasSetIam) return 'Admin'
  if (id.endsWith('.admin')) return 'Admin'
  if (/\.(viewer|reader)$/.test(id)) return 'Viewer'
  if (/\.(developer|editor|writer|creator)$/.test(id)) return 'Developer'
  if (/\.(operator|user|invoker|runner)$/.test(id)) return 'Operator'
  return 'Specialized'
}

const SERVICE_CATEGORY = {
  iam: 'IAM', resourcemanager: 'IAM', cloudresourcemanager: 'IAM', accesscontextmanager: 'IAM',
  compute: 'Compute', appengine: 'Compute', cloudfunctions: 'Serverless', run: 'Serverless',
  storage: 'Storage', file: 'Storage', bigquery: 'BigQuery', bigtable: 'Database',
  container: 'Kubernetes', gkehub: 'Kubernetes', spanner: 'Database', datastore: 'Database',
  cloudsql: 'Database', redis: 'Database', firestore: 'Database',
  networkmanagement: 'Networking', dns: 'Networking', networkservices: 'Networking',
  securitycenter: 'Security', cloudkms: 'Security', secretmanager: 'Security', binaryauthorization: 'Security',
  cloudbuild: 'DevOps', artifactregistry: 'DevOps', containerregistry: 'DevOps', source: 'DevOps',
  aiplatform: 'AI', ml: 'AI', automl: 'AI', notebooks: 'AI', dialogflow: 'AI',
  dataflow: 'Analytics', dataproc: 'Analytics', pubsub: 'Analytics', composer: 'Analytics',
  monitoring: 'Observability', logging: 'Observability', cloudtrace: 'Observability', errorreporting: 'Observability',
  billing: 'Billing', cloudbilling: 'Billing', commerceoffercatalog: 'Billing',
}

function classifyCategory(roleId) {
  const svc = String(roleId).replace(/^roles\//, '').split('.')[0].toLowerCase()
  return SERVICE_CATEGORY[svc] ?? 'Management'
}

const PRIVILEGED_HINTS = ['.setIamPolicy', 'iam.serviceAccounts.actAs', 'iam.serviceAccountKeys.create']

function isPrivileged(roleId, perms) {
  if (['roles/owner', 'roles/editor'].includes(roleId)) return true
  return perms.some((p) => PRIVILEGED_HINTS.some((h) => p.endsWith(h) || p === h))
}

/**
 * Escopo a partir do "Lowest-level resources where you can grant this role"
 * das docs — isto é dado oficial, ao contrário do tier.
 * Sem essa informação, cai em 'project', que é o escopo padrão de concessão.
 */
function classifyScope(lowestResources) {
  const l = (lowestResources ?? []).map((s) => String(s).toLowerCase())
  if (l.some((s) => s.includes('organization'))) return 'org'
  if (l.some((s) => s.includes('folder'))) return 'folder'
  if (l.some((s) => s === 'project' || s.includes('project'))) return 'project'
  if (l.length > 0) return 'resource'
  return 'project'
}

function slugify(roleId) {
  return String(roleId).replace(/^roles\//, '').replace(/[._]/g, '-').toLowerCase()
}

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ')

module.exports = {
  classifyTier, classifyCategory, classifyScope, isPrivileged,
  slugify, esc, SERVICE_CATEGORY, PRIVILEGED_HINTS,
}
