#!/usr/bin/env python3
"""
Converte o Classification_EntraIdDirectoryRoles.json (EntraOps / AzurePrivilegedIAM)
para o formato src/data/roles.ts do projeto entra-permissions.

Uso:
  python3 convert-roles.py <caminho_json> <caminho_saida_roles.ts>
"""
import json
import sys
import re

# Mapeia categorias do EntraOps -> categorias do projeto
CATEGORY_MAP = {
    'identity': 'Identity',
    'collaboration': 'M365',
    'securityAndCompliance': 'Security',
    'devices': 'Device',
    'readOnly': 'Identity',
    'global': 'Identity',
    'other': 'Other',
}

# Tiers do EntraOps -> tiers do projeto (mantemos os mesmos nomes)
VALID_TIERS = {'ControlPlane', 'ManagementPlane', 'WorkloadPlane', 'UserAccess'}


def pick_category(categories_str, role_name=''):
    """Escolhe a categoria principal a partir da string composta do EntraOps."""
    name = role_name.lower()
    # Dicas pelo nome da role (mais especifico que a categoria generica)
    if any(k in name for k in ['application', 'app ', 'app registration']):
        return 'Application'
    if any(k in name for k in ['exchange', 'sharepoint', 'teams', 'fabric', 'power bi',
                                'dynamics', 'copilot', 'ai ', 'kaizala', 'viva', 'yammer',
                                'office', 'message center', 'reports', 'usage', 'edge',
                                'windows', 'search', 'insights', 'knowledge']):
        return 'M365'
    if any(k in name for k in ['compliance', 'governance', 'lifecycle', 'attribute']):
        return 'Compliance'
    if any(k in name for k in ['security', 'conditional access', 'authentication',
                                'attack', 'b2c', 'identity provider', 'cloud app']):
        return 'Security'
    if any(k in name for k in ['device', 'intune', 'printer', 'iot', 'desktop']):
        return 'Device'

    if not categories_str or categories_str == 'None':
        return 'Other'
    parts = [c.strip() for c in categories_str.split(',')]
    priority = ['securityAndCompliance', 'devices', 'identity', 'collaboration', 'readOnly', 'global', 'other']
    for p in priority:
        if p in parts:
            return CATEGORY_MAP.get(p, 'Other')
    return CATEGORY_MAP.get(parts[0], 'Other')


def pick_tier(role):
    """Tier no nivel da role, a partir do campo Classification."""
    c = role.get('Classification') or {}
    tier = c.get('EAMTierLevelName')
    if tier in VALID_TIERS:
        return tier
    # Fallback: deriva do maior tier presente nas role actions
    perms = role.get('RolePermissions', [])
    tiers_found = {p.get('EAMTierLevelName') for p in perms}
    for t in ['ControlPlane', 'ManagementPlane', 'WorkloadPlane', 'UserAccess']:
        if t in tiers_found:
            return t
    return 'Unclassified'


def short_description(rich):
    """Extrai uma descricao curta da RichDescription (primeira frase util).
    Mantem o texto original em ingles (fonte oficial Microsoft)."""
    if not rich:
        return 'No description available.'
    lines = [l.strip() for l in rich.split('\n') if l.strip()]
    body = []
    for l in lines:
        low = l.lower()
        if l.endswith(':') and ('following' in low or 'tasks' in low):
            continue
        if low.startswith('assign the') and 'role to users' in low:
            continue
        body.append(l)
    if not body:
        body = lines
    text = body[0]
    text = re.sub(r'^[-*]\s*', '', text)  # remove bullet
    if len(text) > 240:
        text = text[:237] + '...'
    return text


def all_permissions(role):
    """Lista TODAS as role actions com sua categoria e tier."""
    perms = role.get('RolePermissions', [])
    order = {'ControlPlane': 0, 'ManagementPlane': 1, 'WorkloadPlane': 2, 'UserAccess': 3, None: 4}
    perms_sorted = sorted(
        perms,
        key=lambda p: (order.get(p.get('EAMTierLevelName'), 4), p.get('AuthorizedResourceAction', ''))
    )
    result = []
    seen = set()
    for p in perms_sorted:
        a = p.get('AuthorizedResourceAction')
        if a and a not in seen:
            result.append({
                'action': a,
                'category': p.get('Category', ''),
                'tier': p.get('EAMTierLevelName') if p.get('EAMTierLevelName') in VALID_TIERS else 'Unclassified',
            })
            seen.add(a)
    return result


def top_permissions(role, limit=6):
    """Lista as principais role actions, priorizando ControlPlane."""
    perms = role.get('RolePermissions', [])
    order = {'ControlPlane': 0, 'ManagementPlane': 1, 'WorkloadPlane': 2, 'UserAccess': 3, None: 4}
    perms_sorted = sorted(
        perms,
        key=lambda p: order.get(p.get('EAMTierLevelName'), 4)
    )
    actions = []
    seen = set()
    for p in perms_sorted:
        a = p.get('AuthorizedResourceAction')
        if a and a not in seen:
            actions.append(a)
            seen.add(a)
        if len(actions) >= limit:
            break
    return actions


def esc(s):
    """Escapa aspas simples e backslashes para string TS."""
    if s is None:
        return ''
    if isinstance(s, list):
        s = ', '.join(str(x) for x in s)
    return str(s).replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ').replace('\r', '')


def slug(name):
    return name.lower().replace(' ', '-').replace('(', '').replace(')', '').replace('/', '-')


def main():
    if len(sys.argv) < 3:
        print('Uso: python3 convert-roles.py <input.json> <output.ts>')
        sys.exit(1)

    inp, outp = sys.argv[1], sys.argv[2]
    with open(inp, encoding='utf-8') as f:
        data = json.load(f)

    roles_ts = []
    for role in sorted(data, key=lambda r: r.get('RoleName', '')):
        name = role.get('RoleName', '')
        rid = role.get('RoleId', '')
        desc = short_description(role.get('RichDescription'))
        rich = role.get('RichDescription', '') or ''
        cat = pick_category(role.get('Categories'), name)
        priv = bool(role.get('isPrivileged'))
        tier = pick_tier(role)
        all_perms = all_permissions(role)
        role_slug = slug(name)

        # Permissions completas como objetos {action, category, tier}
        perms_lines = []
        for p in all_perms:
            perms_lines.append(
                f"      {{ action: '{esc(p['action'])}', category: '{esc(p['category'])}', tier: '{p['tier']}' }}"
            )
        perms_str = ',\n'.join(perms_lines)
        if perms_str:
            perms_block = f"[\n{perms_str},\n    ]"
        else:
            perms_block = "[]"

        roles_ts.append(f"""  {{
    name: '{esc(name)}',
    slug: '{esc(role_slug)}',
    id: '{esc(rid)}',
    description: '{esc(desc)}',
    richDescription: '{esc(rich)}',
    category: '{cat}',
    isPrivileged: {str(priv).lower()},
    eamTier: '{tier}',
    permissionCount: {len(all_perms)},
    permissions: {perms_block},
    docsSlug: '{esc(role_slug)}',
  }}""")

    header = '''export type RoleCategory =
  | 'Identity'
  | 'Application'
  | 'Security'
  | 'Compliance'
  | 'M365'
  | 'Device'
  | 'Other'

export type EamTier =
  | 'ControlPlane'
  | 'ManagementPlane'
  | 'WorkloadPlane'
  | 'UserAccess'
  | 'Unclassified'

export interface RolePermission {
  action: string
  category: string
  tier: EamTier
}

export interface EntraRole {
  name: string
  slug: string
  id: string
  description: string
  richDescription: string
  category: RoleCategory
  isPrivileged: boolean
  eamTier: EamTier
  permissionCount: number
  permissions: RolePermission[]
  docsSlug?: string
}

// Gerado automaticamente a partir de Classification_EntraIdDirectoryRoles.json
// Fonte: EntraOps / AzurePrivilegedIAM (Thomas Naunheim) - github.com/Cloud-Architekt/AzurePrivilegedIAM
export const ROLES: EntraRole[] = [
'''

    footer_meta = '''
]

export const CATEGORY_META: Record<
  RoleCategory,
  { label: string; textColor: string; bgColor: string; darkText: string; darkBg: string }
> = {
  Identity: { label: 'Identity', textColor: '#0a4f8c', bgColor: '#e8f1fb', darkText: '#85b7eb', darkBg: '#0c2a47' },
  Application: { label: 'Application', textColor: '#1a5c28', bgColor: '#e6f5e8', darkText: '#97c459', darkBg: '#1a2e10' },
  Security: { label: 'Security', textColor: '#9a2020', bgColor: '#fde8e8', darkText: '#f09595', darkBg: '#3a1414' },
  Compliance: { label: 'Compliance', textColor: '#7a4a00', bgColor: '#fef3e2', darkText: '#ef9f27', darkBg: '#3a2a0a' },
  M365: { label: 'Microsoft 365', textColor: '#5a1a8a', bgColor: '#f0e8fb', darkText: '#af9aec', darkBg: '#241a3a' },
  Device: { label: 'Device', textColor: '#004f62', bgColor: '#e0f3f7', darkText: '#5dcaa5', darkBg: '#0a2e2a' },
  Other: { label: 'Other', textColor: '#444441', bgColor: '#f1f0f0', darkText: '#b4b2a9', darkBg: '#2a2a28' },
}

export const EAM_META: Record<
  EamTier,
  { label: string; short: string; description: string; textColor: string; bgColor: string; darkText: string; darkBg: string; order: number }
> = {
  ControlPlane: {
    label: 'Control Plane',
    short: 'Tier 0',
    description: 'Controle total do tenant. Comprometimento leva a takeover completo. Isole de planos inferiores.',
    textColor: '#9a2020', bgColor: '#fde8e8', darkText: '#f09595', darkBg: '#3a1414', order: 0,
  },
  ManagementPlane: {
    label: 'Management Plane',
    short: 'Tier 1',
    description: 'Funcoes de gestao de TI enterprise-wide. Alto impacto, mas sem controle total do tenant.',
    textColor: '#7a4a00', bgColor: '#fef3e2', darkText: '#ef9f27', darkBg: '#3a2a0a', order: 1,
  },
  WorkloadPlane: {
    label: 'Workload Plane',
    short: 'Workload',
    description: 'Gestao por workload especifico (Exchange, SharePoint, Teams). Impacto limitado ao servico.',
    textColor: '#0a4f8c', bgColor: '#e8f1fb', darkText: '#85b7eb', darkBg: '#0c2a47', order: 2,
  },
  UserAccess: {
    label: 'User Access',
    short: 'Tier 2',
    description: 'Acesso de usuario e leitura basica. Menor impacto de seguranca.',
    textColor: '#1a5c28', bgColor: '#e6f5e8', darkText: '#97c459', darkBg: '#1a2e10', order: 3,
  },
  Unclassified: {
    label: 'Nao classificada',
    short: '-',
    description: 'Sem classificacao de tier definida.',
    textColor: '#444441', bgColor: '#f1f0f0', darkText: '#b4b2a9', darkBg: '#2a2a28', order: 4,
  },
}
'''

    output = header + ',\n'.join(roles_ts) + footer_meta
    with open(outp, 'w', encoding='utf-8') as f:
        f.write(output)

    print(f'OK: {len(roles_ts)} roles escritas em {outp}')


if __name__ == '__main__':
    main()
