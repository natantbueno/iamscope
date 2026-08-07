'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileJson, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import type { EntraRole } from '@/data/roles'
import type { RoleActionEntry } from '@/lib/roleActions'
import type { ApiPermission } from '@/data/apiPermissions'
import type { AzureRbacRole } from '@/data/azureRbac'
import { useT } from '@/i18n/LanguageProvider'
import {
  exportCSV, exportExcel, exportJSON,
  exportPermissionsCSV, exportPermissionsJSON,
  exportRoleActionsCSV, exportRoleActionsJSON,
  exportApiPermissionsCSV, exportApiPermissionsJSON,
  exportAzureRbacCSV, exportAzureRbacJSON, exportAzureRbacMatchedPermsCSV,
} from '@/lib/export'

type Props =
  | { mode?: 'roles';       roles: EntraRole[];             label?: string }
  | { mode: 'roleActions';  roleActions: RoleActionEntry[]; label?: string }
  | { mode: 'apiPerms';     apiPerms: ApiPermission[];      label?: string }
  | { mode: 'azureRbac';   azureRoles: AzureRbacRole[];    label?: string
      /** slug -> permissões que casaram com a busca por permissão, quando ativa. */
      matchedPerms?: Map<string, string[]> | null }

export default function ExportMenu(props: Props) {
  const t = useT()
  const { label = 'Exportar' } = props
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const run = (fn: () => void) => { fn(); setOpen(false) }

  const mode = props.mode ?? 'roles'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-tiny px-3 py-1.5 rounded-md border border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Download size={13} />
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-60 bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-700 rounded-lg shadow-lg z-50 py-1.5">
          {mode === 'roles' && (() => {
            const roles = (props as { roles: EntraRole[] }).roles
            return (
              <>
                <MenuLabel>{t('exp.rolesList')}</MenuLabel>
                <MenuItem icon={<FileSpreadsheet size={14} className="text-green-600" />} onClick={() => run(() => exportExcel(roles))}>
                  Excel (.xls)
                </MenuItem>
                <MenuItem icon={<FileText size={14} className="text-blue-600" />} onClick={() => run(() => exportCSV(roles))}>
                  CSV
                </MenuItem>
                <MenuItem icon={<FileJson size={14} className="text-fg-subtle" />} onClick={() => run(() => exportJSON(roles))}>
                  JSON
                </MenuItem>
                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                <MenuLabel>{t('exp.expandedPerms')}</MenuLabel>
                <MenuItem icon={<FileText size={14} className="text-blue-600" />} onClick={() => run(() => exportPermissionsCSV(roles))}>
                  CSV (uma linha por ação)
                </MenuItem>
                <MenuItem icon={<FileJson size={14} className="text-fg-subtle" />} onClick={() => run(() => exportPermissionsJSON(roles))}>
                  JSON (uma entrada por ação)
                </MenuItem>
              </>
            )
          })()}

          {mode === 'roleActions' && (() => {
            const actions = (props as { roleActions: RoleActionEntry[] }).roleActions
            return (
              <>
                <MenuLabel>Role Actions</MenuLabel>
                <MenuItem icon={<FileText size={14} className="text-blue-600" />} onClick={() => run(() => exportRoleActionsCSV(actions))}>
                  CSV
                </MenuItem>
                <MenuItem icon={<FileJson size={14} className="text-fg-subtle" />} onClick={() => run(() => exportRoleActionsJSON(actions))}>
                  JSON
                </MenuItem>
              </>
            )
          })()}

          {mode === 'apiPerms' && (() => {
            const perms = (props as { apiPerms: ApiPermission[] }).apiPerms
            return (
              <>
                <MenuLabel>API Permissions</MenuLabel>
                <MenuItem icon={<FileText size={14} className="text-blue-600" />} onClick={() => run(() => exportApiPermissionsCSV(perms))}>
                  CSV
                </MenuItem>
                <MenuItem icon={<FileJson size={14} className="text-fg-subtle" />} onClick={() => run(() => exportApiPermissionsJSON(perms))}>
                  JSON
                </MenuItem>
              </>
            )
          })()}

          {mode === 'azureRbac' && (() => {
            const { azureRoles, matchedPerms } = props as {
              azureRoles: AzureRbacRole[]; matchedPerms?: Map<string, string[]> | null
            }
            return (
              <>
                <MenuLabel>Azure RBAC Roles</MenuLabel>
                <MenuItem icon={<FileText size={14} className="text-blue-600" />} onClick={() => run(() => exportAzureRbacCSV(azureRoles))}>
                  CSV
                </MenuItem>
                <MenuItem icon={<FileJson size={14} className="text-fg-subtle" />} onClick={() => run(() => exportAzureRbacJSON(azureRoles))}>
                  JSON
                </MenuItem>
                {matchedPerms && matchedPerms.size > 0 && (
                  <>
                    <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                    <MenuLabel>{t('exp.permSearch')}</MenuLabel>
                    <MenuItem icon={<FileText size={14} className="text-blue-600" />}
                      onClick={() => run(() => exportAzureRbacMatchedPermsCSV(azureRoles, matchedPerms))}>
                      CSV (uma linha por permissão)
                    </MenuItem>
                  </>
                )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-3 py-1">
      {children}
    </p>
  )
}

function MenuItem({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-body text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
    >
      {icon}
      {children}
    </button>
  )
}
