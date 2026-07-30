'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { Menu } from 'lucide-react'
import Sidebar, { Platform, View } from './Sidebar'
import CloudNav from './CloudNav'
import { ROLES, RoleCategory } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { getRoleActions } from '@/lib/roleActions'
import { AZURE_ROLES } from '@/data/azureRbac'
import { IBM_ROLES } from '@/data/ibmCloud'

// Mapa de rotas declarativo: plataforma -> view -> caminho.
// Fonte única de verdade para navegação, busca e troca de plataforma.
const ROUTES: Record<Platform, Partial<Record<View, string>>> = {
  home:            {},
  entraId:         { dashboard: '/entraid',          roles: '/entraid/roles',                  apiPermissions: '/entraid/api-permissions',         roleActions: '/entraid/role-actions', reference: '/entraid/reference', info: '/info', pim: '/entraid/pim' },
  azureRbac:       { dashboard: '/azure-rbac',       roles: '/azure-rbac/roles',       apiPermissions: '/azure-rbac/permissions',                                                                                                  reference: '/azure-rbac/reference' },
  googleWorkspace: { dashboard: '/google-workspace', roles: '/google-workspace/roles',          apiPermissions: '/google-workspace/api-permissions', actions: '/google-workspace/privileges', reference: '/google-workspace/reference' },
  ibmCloud:        { dashboard: '/ibm-cloud',        roles: '/ibm-cloud/roles',       actions: '/ibm-cloud/actions',       reference: '/ibm-cloud/reference' },
  gcp:             { dashboard: '/gcp',              roles: '/gcp/roles',             actions: '/gcp/permissions',         reference: '/gcp/reference' },
  aws:             { dashboard: '/aws',              roles: '/aws/policies',          actions: '/aws/actions',             reference: '/aws/reference' },
}

export default function AppShell({
  children,
  headerTitle,
  headerSub,
  headerActions,
  headerBack,
}: {
  children: React.ReactNode
  headerTitle: string
  headerSub: string
  headerActions?: React.ReactNode
  headerBack?: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Fecha o drawer mobile ao navegar para outra rota.
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  const totalRoleActions = useMemo(() => getRoleActions().length, [])

  // '/entraid/*' e páginas globais (advisor/sod/evaluate/info) caem no
  // fallback 'entraId' — mesma sidebar padrão de antes da migração.
  const isAzureRbac = pathname.startsWith('/azure-rbac')
  const isGws       = pathname.startsWith('/google-workspace')
  const isIbm       = pathname.startsWith('/ibm-cloud')
  const isGcp       = pathname.startsWith('/gcp')
  const isAws       = pathname.startsWith('/aws')
  const isHome      = pathname === '/'

  const platform: Platform = isGws
    ? 'googleWorkspace'
    : isAzureRbac
    ? 'azureRbac'
    : isIbm
    ? 'ibmCloud'
    : isGcp
    ? 'gcp'
    : isAws
    ? 'aws'
    : isHome
    ? 'home'
    : 'entraId'

  const view = (() => {
    if (
      pathname === '/' ||
      pathname === '/entraid' || pathname === '/entraid/' ||
      pathname === '/azure-rbac' || pathname === '/azure-rbac/' ||
      pathname === '/google-workspace' || pathname === '/google-workspace/' ||
      pathname === '/ibm-cloud' || pathname === '/ibm-cloud/' ||
      pathname === '/gcp' || pathname === '/gcp/' ||
      pathname === '/aws' || pathname === '/aws/'
    ) return 'dashboard' as const
    if (pathname.startsWith('/entraid/api-permissions') || pathname.startsWith('/google-workspace/api-permissions') || pathname.startsWith('/azure-rbac/permissions')) return 'apiPermissions' as const
    if (pathname.startsWith('/entraid/role-actions')) return 'roleActions' as const
    if (pathname.startsWith('/entraid/pim')) return 'pim' as const
    if (
      pathname.startsWith('/entraid/reference') ||
      pathname.startsWith('/azure-rbac/reference') ||
      pathname.startsWith('/google-workspace/reference') ||
      pathname.startsWith('/ibm-cloud/reference') ||
      pathname.startsWith('/gcp/reference') ||
      pathname.startsWith('/aws/reference')
    ) return 'reference' as const
    if (pathname.startsWith('/info')) return 'info' as const
    if (
      pathname.endsWith('/permissions') ||
      pathname.endsWith('/actions') ||
      pathname.endsWith('/verbs') ||
      pathname.endsWith('/privileges')
    ) return 'actions' as const
    return 'roles' as const
  })()

  const handleViewChange = (v: View) => {
    const path = ROUTES[platform][v]
    if (path) router.push(path)
  }

  // Rota-alvo da busca da sidebar. O estado da busca vive na URL (?q=), dentro
  // de SidebarSearch — aqui só se decide PARA ONDE a busca aponta.
  // No Entra ID a busca respeita a view atual (roles / API permissions / role
  // actions); nas demais plataformas cai na listagem principal (roles/policies).
  const searchBasePath =
    platform === 'entraId'
      ? view === 'apiPermissions' ? '/entraid/api-permissions'
        : view === 'roleActions'  ? '/entraid/role-actions'
        : '/entraid/roles'
      : ROUTES[platform].roles ?? ROUTES[platform].dashboard ?? '/'

  const handleCategoryFilter = (cat: RoleCategory) => {
    router.push(`/entraid/roles?category=${encodeURIComponent(cat)}`)
  }

  const sidebar = (
    <Sidebar
      platform={platform}
      view={view}
      searchBasePath={searchBasePath}
      totalRoles={ROLES.length}
      totalApiPerms={API_PERMISSIONS.length}
      totalRoleActions={totalRoleActions}
      totalAzureRoles={AZURE_ROLES.length}
      totalIbmRoles={IBM_ROLES.length}
      onViewChange={handleViewChange}
      onCategoryFilter={handleCategoryFilter}
    />
  )

  return (
    <div className="flex h-screen bg-[#eef1f5] dark:bg-gray-950 overflow-hidden">
      {/* Sidebar fixa no desktop */}
      <div className="hidden md:flex shrink-0">{sidebar}</div>

      {/* Drawer no mobile */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <CloudNav />
        <header className="bg-white dark:bg-gray-900 border-b border-[#dde3ec] dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu de navegação"
            className="md:hidden shrink-0 -ml-1 p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]"
          >
            <Menu size={18} />
          </button>
          {headerBack && (
            <div className="shrink-0">{headerBack}</div>
             )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 truncate">{headerTitle}</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-300 truncate">{headerSub}</p>
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </header>
        <main className="flex flex-1 min-h-0">{children}</main>
      </div>
    </div>
  )
}
