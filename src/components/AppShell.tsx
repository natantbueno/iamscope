'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import Sidebar, { Platform, View } from './Sidebar'
import { BetaBadge } from './BetaBadge'
import CloudNav from './CloudNav'
import GlobalSearch from './GlobalSearch'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import type { RoleCategory } from '@/data/roles'
import { useT } from '@/i18n/LanguageProvider'
// Contagens vindas de counts.ts: o AppShell envolve TODAS as páginas, então
// importar os datasets aqui os arrastaria para o chunk compartilhado.
import {
  ENTRA_ROLES_COUNT, ENTRA_API_PERMISSIONS_COUNT, ENTRA_ACTIONS_COUNT,
  AZURE_ROLES_COUNT, IBM_ROLES_COUNT,
} from '@/data/counts'

// Mapa de rotas declarativo: plataforma -> view -> caminho.
// Fonte única de verdade para navegação, busca e troca de plataforma.
const ROUTES: Record<Platform, Partial<Record<View, string>>> = {
  home:            {},
  entraId:         { dashboard: '/entraid',          roles: '/entraid/roles',                  apiPermissions: '/entraid/api-permissions',         roleActions: '/entraid/role-actions', reference: '/entraid/reference', info: '/info', pim: '/entraid/pim' },
  azureRbac:       { dashboard: '/azure-rbac',       roles: '/azure-rbac/roles',       apiPermissions: '/azure-rbac/permissions',                                                                                                  reference: '/azure-rbac/reference' },
  googleWorkspace: { dashboard: '/google-workspace', roles: '/google-workspace/roles',          apiPermissions: '/google-workspace/api-permissions', actions: '/google-workspace/privileges', reference: '/google-workspace/reference' },
  ibmCloud:        { dashboard: '/ibm-cloud',        roles: '/ibm-cloud/roles',       classic: '/ibm-cloud/classic',       reference: '/ibm-cloud/reference', accessGroups: '/ibm-cloud/access-groups' },
  gcp:             { dashboard: '/gcp',              roles: '/gcp/roles',             actions: '/gcp/permissions',         reference: '/gcp/reference' },
  aws:             { dashboard: '/aws',              roles: '/aws/policies',          actions: '/aws/actions',             reference: '/aws/reference', scp: '/aws/scp-vs-identity-policies' },
}

export default function AppShell({
  children,
  headerTitle,
  headerSub,
  headerActions,
  headerBack,
  pageHasOwnHeading = false,
  beta = false,
}: {
  children: React.ReactNode
  headerTitle: string
  headerSub: string
  headerActions?: React.ReactNode
  headerBack?: React.ReactNode
  /**
   * A página já renderiza a própria `<h1>` no corpo?
   *
   * Então o título do header vira `<p>`. Sem isto o documento sai com DUAS
   * `<h1>` — e nas páginas de detalhe as duas com o MESMO texto, porque elas
   * passam `headerTitle={role.name}` e o `RoleDetailHeader` renderiza o mesmo
   * nome logo abaixo. Eram ~7.400 das 7.622 páginas do build.
   *
   * O default é `false` porque a maioria das rotas não tem título próprio no
   * corpo: para elas o título do header É o heading do documento.
   */
  pageHasOwnHeading?: boolean
  /**
   * Marca a rota como ferramenta em Beta — o selo sai ao lado do título.
   *
   * Fica no AppShell, e não em cada página, para o selo aparecer sempre no
   * MESMO lugar nas quatro ferramentas. Antes o Permission Scope tinha um
   * selo solto ao lado da própria `<h1>`, no corpo: duas posições diferentes
   * para a mesma informação.
   */
  beta?: boolean
}) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Fecha o drawer mobile ao navegar para outra rota.
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  const totalRoleActions = ENTRA_ACTIONS_COUNT

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

  /**
   * Qual item da sidebar fica destacado.
   *
   * O `rota` normalizado NÃO é cosmético. Com `trailingSlash: true` no
   * next.config, o pathname real é `/aws/actions/` — com barra no fim. Os
   * testes `endsWith('/actions')` nunca casavam, então `/aws/actions/`,
   * `/gcp/permissions/`, `/ibm-cloud/actions/` e `/google-workspace/privileges/`
   * caíam no `return 'roles'` do fim e acendiam "IAM Policies" / "IAM Roles"
   * enquanto a pessoa estava na página de actions.
   *
   * A pista de que isso já tinha mordido alguém antes: os dashboards testavam
   * as duas formas (`'/aws'` e `'/aws/'`) à mão. Normalizar uma vez resolve a
   * classe inteira em vez de remendar caso a caso.
   */
  const rota = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/'

  const view = (() => {
    if (['/', '/entraid', '/azure-rbac', '/google-workspace', '/ibm-cloud', '/gcp', '/aws'].includes(rota)) {
      return 'dashboard' as const
    }
    if (rota.startsWith('/entraid/api-permissions') || rota.startsWith('/google-workspace/api-permissions') || rota.startsWith('/azure-rbac/permissions')) return 'apiPermissions' as const
    if (rota.startsWith('/entraid/role-actions')) return 'roleActions' as const
    if (rota.startsWith('/entraid/pim')) return 'pim' as const
    if (
      rota.startsWith('/entraid/reference') ||
      rota.startsWith('/azure-rbac/reference') ||
      rota.startsWith('/google-workspace/reference') ||
      rota.startsWith('/ibm-cloud/reference') ||
      rota.startsWith('/gcp/reference') ||
      rota.startsWith('/aws/reference')
    ) return 'reference' as const
    if (rota.startsWith('/info')) return 'info' as const
    if (rota.startsWith('/aws/scp-vs-identity-policies')) return 'scp' as const
    if (rota.startsWith('/ibm-cloud/access-groups')) return 'accessGroups' as const
    if (rota.startsWith('/ibm-cloud/classic')) return 'classic' as const
    if (
      rota.endsWith('/permissions') ||
      rota.endsWith('/actions') ||
      rota.endsWith('/verbs') ||
      rota.endsWith('/privileges')
    ) return 'actions' as const
    return 'roles' as const
  })()

  const handleViewChange = (v: View) => {
    const path = ROUTES[platform][v]
    if (path) router.push(path)
  }

  /**
   * Rota-alvo da busca global. O estado vive na URL (?q=), dentro de
   * GlobalSearch — aqui só se decide PARA ONDE a busca aponta.
   *
   * Três casos:
   *
   * 1. Entra ID — respeita a view atual, porque cada uma tem sua própria lista
   *    (roles, API permissions, role actions).
   * 2. Demais clouds — cai na listagem principal (roles/policies).
   * 3. Páginas SEM lista onde filtrar — home e as ferramentas (SoD, Compare,
   *    Assessment, Permission Scope, Evaluator, Advisor, Tier 0). Antes caíam
   *    em '/', e digitar na busca simplesmente não fazia nada: a pessoa via o
   *    campo aceitar o texto e a tela não reagir. Agora vão para /search, que
   *    procura nas 4.603 roles e policies das seis clouds.
   */
  const SEM_LISTA = ['/sod', '/compare', '/assessment', '/permission-scope',
                     '/evaluate', '/advisor', '/tier-comparison', '/info']
  const paginaSemLista = pathname === '/' || SEM_LISTA.some((r) => pathname.startsWith(r))

  const searchBasePath =
    pathname.startsWith('/search') ? '/search'
    : paginaSemLista ? '/search'
    : platform === 'entraId'
      ? view === 'apiPermissions' ? '/entraid/api-permissions'
        : view === 'roleActions'  ? '/entraid/role-actions'
        : '/entraid/roles'
      : ROUTES[platform].roles ?? ROUTES[platform].dashboard ?? '/search'

  const handleCategoryFilter = (cat: RoleCategory) => {
    router.push(`/entraid/roles?category=${encodeURIComponent(cat)}`)
  }

  const sidebar = (
    <Sidebar
      platform={platform}
      view={view}
      searchBasePath={searchBasePath}
      totalRoles={ENTRA_ROLES_COUNT}
      totalApiPerms={ENTRA_API_PERMISSIONS_COUNT}
      totalRoleActions={totalRoleActions}
      totalAzureRoles={AZURE_ROLES_COUNT}
      totalIbmRoles={IBM_ROLES_COUNT}
      onViewChange={handleViewChange}
      onCategoryFilter={handleCategoryFilter}
    />
  )

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      {/* Skip link: sem ele, quem navega por teclado atravessa os 7 itens de
          cloud + a sidebar inteira antes de chegar ao conteudo, em toda pagina. */}
      <a href="#main-content" className="skip-link text-body font-medium">
        {t('action.skipToContent')}
      </a>
      {/* Sidebar fixa no desktop */}
      <div className="hidden md:flex shrink-0">{sidebar}</div>

      {/* Drawer no mobile */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <CloudNav />
        {/*
          Busca logo abaixo do menu de clouds, alinhada à esquerda sob o "Home".
          Saiu da sidebar porque ali competia com a navegação e sumia com o menu
          recolhido.

          O padding px-6 não é arbitrário: reproduz o recuo do primeiro item do
          CloudNav (px-2 do contêiner + px-4 do link = 24px), para o campo
          começar na mesma vertical do rótulo "Home". Se o espaçamento do
          CloudNav mudar, este precisa mudar junto.
        */}
        <div className="bg-surface border-b border-line px-6 py-2 shrink-0">
          <div className="w-full max-w-md">
            <GlobalSearch basePath={searchBasePath} />
          </div>
        </div>
        <header className="bg-surface border-b border-line px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t('action.openNav')}
            className="md:hidden shrink-0 -ml-1 p-1.5 rounded-md text-fg-muted hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Menu size={18} />
          </button>
          {headerBack && (
            <div className="shrink-0">{headerBack}</div>
             )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {pageHasOwnHeading
                ? <p className="text-lead font-semibold text-fg truncate">{headerTitle}</p>
                : <h1 className="text-lead font-semibold text-fg truncate">{headerTitle}</h1>}
              {beta && <BetaBadge />}
            </div>
            <p className="text-tiny text-fg-muted truncate">{headerSub}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            {/* Canto superior direito, presente em todas as telas: preferencias
                da pessoa (tema e idioma), nao navegacao. */}
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex flex-1 min-h-0">{children}</main>
      </div>
    </div>
  )
}
