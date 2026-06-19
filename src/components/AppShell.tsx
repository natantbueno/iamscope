'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import Sidebar from './Sidebar'
import { ROLES, RoleCategory } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'

export default function AppShell({
  children,
  headerTitle,
  headerSub,
  headerActions,
}: {
  children: React.ReactNode
  headerTitle: string
  headerSub: string
  headerActions?: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')

  const view =
    pathname === '/' ? 'dashboard' :
    pathname.startsWith('/api-permissions') ? 'apiPermissions' :
    'roles'

  const handleViewChange = (v: 'dashboard' | 'roles' | 'apiPermissions') => {
    if (v === 'dashboard') router.push('/')
    else if (v === 'roles') router.push('/roles')
    else router.push('/api-permissions')
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (val) {
      // direciona busca para a página de roles com query
      const target = view === 'apiPermissions' ? '/api-permissions' : '/roles'
      router.push(`${target}?q=${encodeURIComponent(val)}`)
    }
  }

  const handleCategoryFilter = (cat: RoleCategory) => {
    router.push(`/roles?category=${encodeURIComponent(cat)}`)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar
        view={view}
        search={search}
        totalRoles={ROLES.length}
        totalApiPerms={API_PERMISSIONS.length}
        onViewChange={handleViewChange}
        onSearchChange={handleSearchChange}
        onCategoryFilter={handleCategoryFilter}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">{headerTitle}</h1>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">{headerSub}</p>
          </div>
          <div className="flex items-center gap-2">{headerActions}</div>
        </header>
        <main className="flex flex-1 min-h-0">{children}</main>
      </div>
    </div>
  )
}
