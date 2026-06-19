#!/usr/bin/env python3
"""
Converte Classification_MsGraphAppRoles.json (EntraOps) para
src/data/apiPermissions.ts do projeto.

Uso:
  python3 convert-api-permissions.py <input.json> <output.ts>
"""
import json
import sys

VALID_TIERS = {'ControlPlane', 'ManagementPlane', 'WorkloadPlane', 'UserAccess'}


def esc(s):
    if s is None:
        return ''
    if isinstance(s, list):
        s = ', '.join(str(x) for x in s)
    return str(s).replace('\\', '\\\\').replace("'", "\\'")


def tier(p):
    t = p.get('EAMTierLevelName')
    return t if t in VALID_TIERS else 'Unclassified'


def main():
    if len(sys.argv) < 3:
        print('Uso: python3 convert-api-permissions.py <input.json> <output.ts>')
        sys.exit(1)

    inp, outp = sys.argv[1], sys.argv[2]
    with open(inp, encoding='utf-8') as f:
        data = json.load(f)

    # Application permissions (app roles) - assumimos type Application
    # Ordena por tier (ControlPlane primeiro) e nome
    order = {'ControlPlane': 0, 'ManagementPlane': 1, 'WorkloadPlane': 2, 'UserAccess': 3, 'Unclassified': 4}
    data_sorted = sorted(
        data,
        key=lambda p: (order.get(tier(p), 4), p.get('AppRoleDisplayName', ''))
    )

    items = []
    seen = set()
    for p in data_sorted:
        name = p.get('AppRoleDisplayName', '')
        if not name or name in seen:
            continue
        seen.add(name)
        items.append(f"""  {{
    name: '{esc(name)}',
    id: '{esc(p.get('AppRoleId', ''))}',
    type: 'Application',
    category: '{esc(p.get('Category', ''))}',
    eamTier: '{tier(p)}',
    resource: 'Microsoft Graph',
  }}""")

    header = '''import { EamTier } from './roles'

export type PermissionType = 'Application' | 'Delegated'

export interface ApiPermission {
  name: string
  id: string
  type: PermissionType
  category: string
  eamTier: EamTier
  resource: string
}

// Gerado automaticamente a partir de Classification_MsGraphAppRoles.json
// Fonte: EntraOps / AzurePrivilegedIAM (Thomas Naunheim)
export const API_PERMISSIONS: ApiPermission[] = [
'''

    output = header + ',\n'.join(items) + '\n]\n'
    with open(outp, 'w', encoding='utf-8') as f:
        f.write(output)
    print(f'OK: {len(items)} API permissions escritas em {outp}')


if __name__ == '__main__':
    main()
