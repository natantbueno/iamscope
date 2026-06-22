'use client'

import {
  Search, LayoutDashboard, ShieldCheck, Users, AppWindow, Lock,
  FileCheck, Monitor, BookOpen, AlertTriangle, KeyRound, Sun, Moon, Layers, ListTree, HelpCircle, Info,
} from 'lucide-react'
import { RoleCategory } from '@/data/roles'
import { useTheme } from './ThemeProvider'
import EntraScopeIcon from './EntraScopeIcon'
import { useRouter } from 'next/navigation'

export type View = 'dashboard' | 'roles' | 'apiPermissions' | 'roleActions' | 'reference' | 'info'

interface SidebarProps {
  view: View
  search: string
  totalRoles: number
  totalApiPerms: number
  totalRoleActions: number
  onViewChange: (v: View) => void
  onSearchChange: (s: string) => void
  onCategoryFilter: (cat: RoleCategory) => void
}

const categoryItems: { label: string; cat: RoleCategory; icon: React.ReactNode }[] = [
  { label: 'Identity', cat: 'Identity', icon: <Users size={15} /> },
  { label: 'Application', cat: 'Application', icon: <AppWindow size={15} /> },
  { label: 'Security', cat: 'Security', icon: <Lock size={15} /> },
  { label: 'Compliance', cat: 'Compliance', icon: <FileCheck size={15} /> },
  { label: 'Microsoft 365', cat: 'M365', icon: <Monitor size={15} /> },
  { label: 'Device', cat: 'Device', icon: <Monitor size={15} /> },
]

export default function Sidebar({
  view, search, totalRoles, totalApiPerms, totalRoleActions,
  onViewChange, onSearchChange, onCategoryFilter,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  return (
    <aside className="w-60 shrink-0 bg-white dark:bg-gray-900 border-r border-[#dde3ec] dark:border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-[#dde3ec] dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <EntraScopeIcon size={24} />
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
              Entra Scope
            </span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push('/info')}
              className={`p-1.5 rounded-md transition-colors ${
                view === 'info'
                  ? 'text-[#0078d4] dark:text-[#85b7eb] bg-[#e8f1fb] dark:bg-[#0c2a47]'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-label="Sobre"
              title="Sobre o Entra Scope"
            >
              <Info size={15} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Alternar tema"
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-[12px] pl-8 pr-3 py-1.5 border border-[#dde3ec] dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4]"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
            Geral
          </p>
          <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"
            active={view === 'dashboard'} onClick={() => onViewChange('dashboard')} />
          <NavItem icon={<ShieldCheck size={15} />} label="Built-in Roles"
            active={view === 'roles'} badge={String(totalRoles)}
            onClick={() => onViewChange('roles')} />
          <NavItem icon={<ListTree size={15} />} label="Role Actions"
            active={view === 'roleActions'} badge={String(totalRoleActions)}
            onClick={() => onViewChange('roleActions')} />
          <NavItem icon={<KeyRound size={15} />} label="API Permissions"
            active={view === 'apiPermissions'} badge={String(totalApiPerms)}
            onClick={() => onViewChange('apiPermissions')} />
          <NavItem icon={<HelpCircle size={15} />} label="Reference"
            active={view === 'reference'}
            onClick={() => onViewChange('reference')} />
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
            Categorias
          </p>
          {categoryItems.map((item) => (
            <NavItem key={item.cat} icon={item.icon} label={item.label}
              onClick={() => { onViewChange('roles'); onCategoryFilter(item.cat) }} />
          ))}
        </div>

        <div>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
            Referência
          </p>
          <ExtLink icon={<Layers size={15} />} label="Enterprise Access Model"
            href="https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model" />
          <ExtLink icon={<BookOpen size={15} />} label="Microsoft Docs"
            href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference" />
          <ExtLink icon={<AlertTriangle size={15} />} label="Privileged Roles"
            href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions" />
        </div>
      </nav>

      <div className="p-4 border-t border-[#dde3ec] dark:border-gray-800">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
          Tiering: Enterprise Access Model
          <br />
          Fontes: Microsoft Learn, EntraOps
        </p>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active, badge, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left ${
        active
          ? 'bg-[#e8f1fb] dark:bg-[#0c2a47] text-[#0078d4] dark:text-[#85b7eb] font-medium'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
      }`}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 border border-[#dde3ec] dark:border-gray-700 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

function ExtLink({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
      {icon}
      <span className="flex-1">{label}</span>
    </a>
  )
}
