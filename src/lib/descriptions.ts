/**
 * Derivações de descrição legível a partir do nome/estrutura das permissões.
 * Usadas como fallback quando o dataset não tem uma descrição oficial.
 */

// ── Role Actions ─────────────────────────────────────────────

const VERB_TEXT: Record<string, string> = {
  read:          'Read',
  get:           'Get',
  update:        'Update',
  create:        'Create',
  delete:        'Delete',
  enable:        'Enable',
  disable:       'Disable',
  add:           'Add',
  remove:        'Remove',
  set:           'Set',
  reset:         'Reset',
  restore:       'Restore',
  assign:        'Assign',
  unassign:      'Unassign',
  invite:        'Invite',
  reprocess:     'Reprocess',
  synchronize:   'Synchronize',
  allTasks:      'Full access (all tasks) for',
  allProperties: 'Access all properties of',
  post:          'Post to',
  patch:         'Patch',
  hydrateSdp:    'Hydrate SDP for',
  upload:        'Upload',
  download:      'Download',
  register:      'Register',
  unregister:    'Unregister',
  invalidate:    'Invalidate',
  activate:      'Activate',
  deactivate:    'Deactivate',
  override:      'Override',
}

/** camelCase → "camel case" */
function unCamel(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toLowerCase()).trim()
}

/** "users/password" → "user password" */
function resourceToText(resource: string): string {
  return resource
    .split('/')
    .map(unCamel)
    .join(' › ')
}

export function deriveRoleActionDescription(
  namespace: string,
  resource: string,
  verb: string,
): string {
  const verbText = VERB_TEXT[verb] ?? verb
  const nsLabel = namespace.replace('microsoft.', '').replace('.', ' › ')
  const resText = resource ? resourceToText(resource) : 'entity'
  return `${verbText} ${resText} in ${nsLabel}`
}

// ── API Permissions ──────────────────────────────────────────

const ACTION_DESC: Record<string, string> = {
  Read:         'Read',
  ReadBasic:    'Read basic info for',
  ReadAll:      'Read all',
  Write:        'Write',
  ReadWrite:    'Read and write',
  Manage:       'Manage',
  FullControl:  'Full control of',
  Send:         'Send',
  Create:       'Create',
  Delete:       'Delete',
  Export:       'Export',
  Import:       'Import',
  Invoke:       'Invoke',
}

const SCOPE_TEXT: Record<string, string> = {
  All:       'all',
  OwnedBy:   'owned by the signed-in user',
  ManagedBy: 'managed by the signed-in user',
  Selected:  'selected',
  Me:        'for the signed-in user',
  Shared:    'shared with the signed-in user',
}

export function deriveApiPermDescription(
  name: string,
  type: 'Application' | 'Delegated',
): string {
  // casos especiais
  if (name === 'user_impersonation') return `Access the API as the signed-in user (delegated)`
  if (name === 'access_as_user') return `Access the service as the signed-in user`

  const parts = name.split('.')
  if (parts.length < 2) return name

  const scope  = parts[parts.length - 1]
  const action = parts[parts.length - 2]
  const root   = parts.slice(0, -2).join(' ')

  const actionText = ACTION_DESC[action] ?? action
  const scopeText  = SCOPE_TEXT[scope] ?? scope.toLowerCase()
  const rootText   = unCamel(root) || 'resource'
  const ctx        = type === 'Application' ? 'without a signed-in user' : 'on behalf of the signed-in user'

  if (parts.length === 2) {
    // ex: "Mail.Send" → no scope
    return `${actionText} ${rootText} (${ctx})`
  }

  return `${actionText} ${scopeText} ${rootText} (${ctx})`
}
