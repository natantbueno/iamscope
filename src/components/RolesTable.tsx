'use client'

import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { EntraRole, RoleCategory, EamTier } from '@/data/roles'
import CategoryBadge from './CategoryBadge'
import EamTierBadge from './EamTierBadge'

export type FilterType = 'all' | 'privileged' | RoleCategory | EamTier

interface RolesTableProps {
  roles: EntraRole[]
  activeFilter: FilterType
  onFilterChange: (f: FilterType) => void
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Control Plane', value: 'ControlPlane' },
  { label: 'Management Plane', value: 'ManagementPlane' },
  { label: 'Workload Plane', value: 'WorkloadPlane' },
  { label: 'User Access', value: 'UserAccess' },
  { label: 'Privilegiadas', value: 'privileged' },
]

export default function RolesTable({ roles, activeFilter, onFilterChange }: RolesTableProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => onFilterChange(f.value)}
            className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
              activeFilter === f.value
                ? 'bg-[#e8f1fb] dark:bg-[#0c2a47] text-[#0078d4] dark:text-[#85b7eb] border-[#9dc3e8] dark:border-[#185fa5] font-medium'
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-gray-400 dark:text-gray-500">{roles.length} roles</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <p className="text-[14px]">Nenhuma role encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <Th className="w-56">Role</Th>
                <Th>Descrição</Th>
                <Th className="w-20">Ações</Th>
                <Th className="w-32">EAM Tier</Th>
                <Th className="w-24">Categoria</Th>
                <Th className="w-16">Priv.</Th>
                <Th className="w-8"></Th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <td className="px-4 py-3 align-top">
                    <Link href={`/roles/${role.slug}`} className="block">
                      <div className="font-medium text-[#0078d4] dark:text-[#85b7eb] text-[13px] group-hover:underline">{role.name}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{role.id.substring(0, 8)}…</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-gray-500 dark:text-gray-400 text-[12px] leading-relaxed max-w-sm line-clamp-2">{role.description}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">{role.permissionCount}</span>
                  </td>
                  <td className="px-4 py-3 align-top"><EamTierBadge tier={role.eamTier} /></td>
                  <td className="px-4 py-3 align-top"><CategoryBadge category={role.category} /></td>
                  <td className="px-4 py-3 align-top">
                    {role.isPrivileged ? (
                      <AlertTriangle size={13} className="text-red-500" />
                    ) : (
                      <span className="text-[12px] text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/roles/${role.slug}`} className="text-gray-300 dark:text-gray-600 group-hover:text-[#0078d4] dark:group-hover:text-[#85b7eb] transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5 ${className}`}>
      {children}
    </th>
  )
}
