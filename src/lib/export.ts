import { ROLES, EntraRole } from '@/data/roles'
import { RoleActionEntry } from '@/lib/roleActions'
import { API_PERMISSIONS } from '@/data/apiPermissions'

type ApiPermission = typeof API_PERMISSIONS[number]

// Achata uma role para uma linha de export (sem o array de permissions completo)
function roleToRow(role: EntraRole) {
  return {
    name: role.name,
    id: role.id,
    category: role.category,
    eamTier: role.eamTier,
    isPrivileged: role.isPrivileged,
    permissionCount: role.permissionCount,
    description: role.description,
  }
}

function download(filename: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------- JSON ----------
export function exportJSON(roles: EntraRole[] = ROLES) {
  const data = JSON.stringify(roles, null, 2)
  download('entra-roles.json', data, 'application/json')
}

// JSON com todas as permissões expandidas (uma entrada por role action)
export function exportPermissionsJSON(roles: EntraRole[] = ROLES) {
  const flat = roles.flatMap((r) =>
    r.permissions.map((p) => ({
      roleName: r.name,
      roleId: r.id,
      roleTier: r.eamTier,
      action: p.action,
      actionCategory: p.category,
      actionTier: p.tier,
    }))
  )
  download('entra-role-permissions.json', JSON.stringify(flat, null, 2), 'application/json')
}

// ---------- CSV ----------
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escapeCell = (val: unknown) => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ]
  // BOM para Excel reconhecer UTF-8
  return '\uFEFF' + lines.join('\r\n')
}

export function exportCSV(roles: EntraRole[] = ROLES) {
  const rows = roles.map(roleToRow)
  download('entra-roles.csv', toCSV(rows), 'text/csv;charset=utf-8')
}

export function exportPermissionsCSV(roles: EntraRole[] = ROLES) {
  const rows = roles.flatMap((r) =>
    r.permissions.map((p) => ({
      roleName: r.name,
      roleId: r.id,
      action: p.action,
      actionCategory: p.category,
      actionTier: p.tier,
    }))
  )
  download('entra-role-permissions.csv', toCSV(rows), 'text/csv;charset=utf-8')
}

// ---------- Excel (SpreadsheetML / xls compatível) ----------
// Gera um arquivo .xls em formato XML que o Excel abre nativamente,
// sem dependência externa.
export function exportExcel(roles: EntraRole[] = ROLES) {
  const rows = roles.map(roleToRow)
  const headers = Object.keys(rows[0])

  const escapeXml = (s: unknown) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells = headers
        .map((h) => {
          const val = row[h as keyof typeof row]
          const type = typeof val === 'number' || typeof val === 'boolean' ? 'Number' : 'String'
          const out = typeof val === 'boolean' ? (val ? 1 : 0) : val
          return `<Cell><Data ss:Type="${type}">${escapeXml(out)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0078D4" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Entra Roles">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`

  download('entra-roles.xls', xml, 'application/vnd.ms-excel')
}

// ---------- Role Actions ----------
export function exportRoleActionsCSV(actions: RoleActionEntry[]) {
  const rows = actions.map((a) => ({
    action: a.action,
    namespace: a.namespace,
    resource: a.resource,
    verb: a.verb,
    category: a.category,
    tier: a.tier,
    usedByPrivileged: a.isUsedByPrivileged,
    rolesCount: a.usedByRoles.length,
    roles: a.usedByRoles.map((r) => r.name).join(' | '),
  }))
  download('entra-role-actions.csv', toCSV(rows), 'text/csv;charset=utf-8')
}

export function exportRoleActionsJSON(actions: RoleActionEntry[]) {
  const data = actions.map((a) => ({
    action: a.action,
    namespace: a.namespace,
    resource: a.resource,
    verb: a.verb,
    category: a.category,
    tier: a.tier,
    usedByPrivileged: a.isUsedByPrivileged,
    usedByRoles: a.usedByRoles,
  }))
  download('entra-role-actions.json', JSON.stringify(data, null, 2), 'application/json')
}

// ---------- API Permissions ----------
export function exportApiPermissionsCSV(perms: ApiPermission[]) {
  const rows = perms.map((p) => ({
    name: p.name,
    id: p.id,
    type: p.type,
    category: p.category,
    eamTier: p.eamTier,
  }))
  download('entra-api-permissions.csv', toCSV(rows), 'text/csv;charset=utf-8')
}

export function exportApiPermissionsJSON(perms: ApiPermission[]) {
  download('entra-api-permissions.json', JSON.stringify(perms, null, 2), 'application/json')
}

// ---------- Azure RBAC ----------
import { AzureRbacRole } from '@/data/azureRbac'

export function exportAzureRbacCSV(roles: AzureRbacRole[]) {
  const rows = roles.map((r) => ({
    name: r.name,
    id: r.id,
    category: r.category,
    tier: r.tier,
    isPrivileged: r.isPrivileged,
    permissionCount: r.permissionCount,
    description: r.description,
  }))
  download('azure-rbac-roles.csv', toCSV(rows), 'text/csv;charset=utf-8')
}

export function exportAzureRbacJSON(roles: AzureRbacRole[]) {
  download('azure-rbac-roles.json', JSON.stringify(roles, null, 2), 'application/json')
}

// ---------- Genérico (usado pelo ExportButton.tsx nas demais páginas do site) ----------
// Mesmas três saídas (Excel/CSV/JSON) do modelo Entra ID, mas parametrizadas por
// linhas/nome de arquivo arbitrários — evita duplicar a lógica de serialização
// em cada página que só precisa exportar uma lista simples.

export function exportGenericCSV(filename: string, rows: Record<string, unknown>[]) {
  download(filename.endsWith('.csv') ? filename : `${filename}.csv`, toCSV(rows), 'text/csv;charset=utf-8')
}

export function exportGenericJSON(filename: string, data: unknown) {
  download(filename.endsWith('.json') ? filename : `${filename}.json`, JSON.stringify(data, null, 2), 'application/json')
}

export function exportGenericExcel(filename: string, rows: Record<string, unknown>[], sheetName = 'Sheet1') {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])

  const escapeXml = (s: unknown) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells = headers
        .map((h) => {
          const val = row[h]
          const type = typeof val === 'number' || typeof val === 'boolean' ? 'Number' : 'String'
          const out = typeof val === 'boolean' ? (val ? 1 : 0) : val
          return `<Cell><Data ss:Type="${type}">${escapeXml(out)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0078D4" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName.slice(0, 31))}">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`

  download(filename.endsWith('.xls') ? filename : `${filename}.xls`, xml, 'application/vnd.ms-excel')
}
