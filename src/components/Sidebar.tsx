'use client'

import { useState } from 'react'
import {
  Search, LayoutDashboard, ShieldCheck, Users, AppWindow, Lock,
  FileCheck, Monitor, BookOpen, AlertTriangle, KeyRound, Layers, ListTree, HelpCircle, Info,
  ChevronDown, Shield, ChevronRight,
  Cpu, HardDrive, Network, Database, Eye, Boxes, BrainCircuit, Workflow, Settings2, Globe, Sparkles,
  GitCompare, Timer,
} from 'lucide-react'
import { RoleCategory, EAM_META, EamTier } from '@/data/roles'
import { AZURE_TIER_META, AzureRbacTier, AzureRbacCategory } from '@/data/azureRbac'
import { GWS_TIER_META, GWS_ROLES, GWS_SCOPES, GwsTier } from '@/data/googleWorkspace'
import { IBM_TIER_META, IBM_ROLES, IbmTier } from '@/data/ibmCloud'
import { GCP_TIER_META, GCP_ROLES, GcpTier, GcpCategory } from '@/data/gcp'
import { AWS_TIER_META, AWS_POLICIES, AwsTier, AwsCategory } from '@/data/aws'
import { OCI_TIER_META, OCI_POLICIES, OciTier, OciCategory } from '@/data/oci'
import EntraScopeIcon from './EntraScopeIcon'
import { useRouter } from 'next/navigation'

export type Platform = 'entraId' | 'azureRbac' | 'aws' | 'gcp' | 'googleWorkspace' | 'oci' | 'ibmCloud'
export type View = 'dashboard' | 'roles' | 'apiPermissions' | 'roleActions' | 'reference' | 'info' | 'actions' | 'pim'

interface SidebarProps {
  platform: Platform
  view: View
  search: string
  totalRoles: number
  totalApiPerms: number
  totalRoleActions: number
  totalAzureRoles?: number
  totalIbmRoles?: number
  onViewChange: (v: View) => void
  onSearchChange: (s: string) => void
  onCategoryFilter: (cat: RoleCategory) => void
}

const ENTRA_CATEGORIES: { label: string; cat: RoleCategory; icon: React.ReactNode }[] = [
  { label: 'Identity',      cat: 'Identity',    icon: <Users size={14} /> },
  { label: 'Application',   cat: 'Application', icon: <AppWindow size={14} /> },
  { label: 'Security',      cat: 'Security',    icon: <Lock size={14} /> },
  { label: 'Compliance',    cat: 'Compliance',  icon: <FileCheck size={14} /> },
  { label: 'Microsoft 365', cat: 'M365',        icon: <Monitor size={14} /> },
  { label: 'Device',        cat: 'Device',      icon: <Monitor size={14} /> },
]


const ENTRA_TIERS: EamTier[] = ['ControlPlane', 'ManagementPlane', 'UserAccess']

const AZURE_TIERS: AzureRbacTier[] = ['FullControl','AccessManagement','Contributor','DataPlane','Reader','Specialized']

const AZURE_CATEGORIES: { label: string; cat: AzureRbacCategory; icon: React.ReactNode }[] = [
  { label: 'General',     cat: 'General',     icon: <Globe size={14} /> },
  { label: 'Security',    cat: 'Security',    icon: <Shield size={14} /> },
  { label: 'Compute',     cat: 'Compute',     icon: <Cpu size={14} /> },
  { label: 'Storage',     cat: 'Storage',     icon: <HardDrive size={14} /> },
  { label: 'Networking',  cat: 'Networking',  icon: <Network size={14} /> },
  { label: 'Database',    cat: 'Database',    icon: <Database size={14} /> },
  { label: 'Identity',    cat: 'Identity',    icon: <Users size={14} /> },
  { label: 'Monitoring',  cat: 'Monitoring',  icon: <Eye size={14} /> },
  { label: 'Containers',  cat: 'Containers',  icon: <Boxes size={14} /> },
  { label: 'App Service', cat: 'AppService',  icon: <Settings2 size={14} /> },
  { label: 'Integration', cat: 'Integration', icon: <Workflow size={14} /> },
  { label: 'Management',  cat: 'Management',  icon: <Layers size={14} /> },
  { label: 'AI',          cat: 'AI',          icon: <BrainCircuit size={14} /> },
]

const GWS_TIERS: GwsTier[] = ['SuperAdmin', 'DelegatedAdmin', 'ServiceAdmin', 'SpecializedAdmin', 'ReadOnly']
const GWS_ROLES_COUNT = GWS_ROLES.length
const GWS_SCOPES_COUNT = GWS_SCOPES.length

const IBM_TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']
const IBM_ROLES_COUNT = IBM_ROLES.length

const GCP_TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']
const GCP_CATEGORIES: { label: string; cat: GcpCategory; icon: React.ReactNode }[] = [
  { label: 'IAM',          cat: 'IAM',          icon: <Shield size={14} /> },
  { label: 'Compute',      cat: 'Compute',       icon: <Cpu size={14} /> },
  { label: 'Storage',      cat: 'Storage',       icon: <HardDrive size={14} /> },
  { label: 'BigQuery',     cat: 'BigQuery',      icon: <Database size={14} /> },
  { label: 'Kubernetes',   cat: 'Kubernetes',    icon: <Boxes size={14} /> },
  { label: 'Database',     cat: 'Database',      icon: <Database size={14} /> },
  { label: 'Networking',   cat: 'Networking',    icon: <Network size={14} /> },
  { label: 'Security',     cat: 'Security',      icon: <Lock size={14} /> },
  { label: 'DevOps',       cat: 'DevOps',        icon: <Workflow size={14} /> },
  { label: 'Serverless',   cat: 'Serverless',    icon: <Settings2 size={14} /> },
  { label: 'AI',           cat: 'AI',            icon: <BrainCircuit size={14} /> },
  { label: 'Analytics',    cat: 'Analytics',     icon: <Eye size={14} /> },
  { label: 'Observability',cat: 'Observability', icon: <Eye size={14} /> },
  { label: 'Billing',      cat: 'Billing',       icon: <Layers size={14} /> },
  { label: 'Management',   cat: 'Management',    icon: <Globe size={14} /> },
]
const GCP_ROLES_COUNT = GCP_ROLES.length

const AWS_TIERS: AwsTier[] = ['FullAccess', 'PowerUser', 'ReadOnly', 'Operator', 'Specialized']
const AWS_CATS: { label: string; cat: AwsCategory; icon: React.ReactNode }[] = [
  { label: 'IAM',          cat: 'IAM',         icon: <Shield size={14} /> },
  { label: 'Compute',      cat: 'Compute',      icon: <Cpu size={14} /> },
  { label: 'Storage',      cat: 'Storage',      icon: <HardDrive size={14} /> },
  { label: 'Database',     cat: 'Database',     icon: <Database size={14} /> },
  { label: 'Networking',   cat: 'Networking',   icon: <Network size={14} /> },
  { label: 'Security',     cat: 'Security',     icon: <Lock size={14} /> },
  { label: 'DevOps',       cat: 'DevOps',       icon: <Workflow size={14} /> },
  { label: 'Serverless',   cat: 'Serverless',   icon: <Settings2 size={14} /> },
  { label: 'Containers',   cat: 'Containers',   icon: <Boxes size={14} /> },
  { label: 'AI',           cat: 'AI',           icon: <BrainCircuit size={14} /> },
  { label: 'Analytics',    cat: 'Analytics',    icon: <Eye size={14} /> },
  { label: 'Messaging',    cat: 'Messaging',    icon: <Globe size={14} /> },
  { label: 'Management',   cat: 'Management',   icon: <Layers size={14} /> },
  { label: 'Billing',      cat: 'Billing',      icon: <Layers size={14} /> },
  { label: 'IoT',          cat: 'IoT',          icon: <Globe size={14} /> },
]
const AWS_POLICIES_COUNT = AWS_POLICIES.length

const OCI_TIERS: OciTier[] = ['Manage', 'Use', 'Read', 'Inspect']
const OCI_CATS: { label: string; cat: OciCategory; icon: React.ReactNode }[] = [
  { label: 'Identity',   cat: 'Identity',   icon: <Shield size={14} /> },
  { label: 'Compute',    cat: 'Compute',    icon: <Cpu size={14} /> },
  { label: 'Storage',    cat: 'Storage',    icon: <HardDrive size={14} /> },
  { label: 'Networking', cat: 'Networking', icon: <Network size={14} /> },
  { label: 'Database',   cat: 'Database',   icon: <Database size={14} /> },
  { label: 'Security',   cat: 'Security',   icon: <Lock size={14} /> },
  { label: 'DevOps',     cat: 'DevOps',     icon: <Workflow size={14} /> },
  { label: 'Containers', cat: 'Containers', icon: <Boxes size={14} /> },
  { label: 'Serverless', cat: 'Serverless', icon: <Settings2 size={14} /> },
  { label: 'Messaging',  cat: 'Messaging',  icon: <Globe size={14} /> },
  { label: 'Analytics',  cat: 'Analytics',  icon: <Eye size={14} /> },
  { label: 'Monitoring', cat: 'Monitoring', icon: <Eye size={14} /> },
  { label: 'AI',         cat: 'AI',         icon: <BrainCircuit size={14} /> },
  { label: 'Billing',    cat: 'Billing',    icon: <Layers size={14} /> },
  { label: 'Management', cat: 'Management', icon: <Globe size={14} /> },
]
const OCI_POLICIES_COUNT = OCI_POLICIES.length

export default function Sidebar({
  platform, view, search, totalRoles, totalApiPerms, totalRoleActions, totalAzureRoles = 0, totalIbmRoles = IBM_ROLES_COUNT,
  onViewChange, onSearchChange, onCategoryFilter,
}: SidebarProps) {
  const router = useRouter()
  const [tierOpen, setTierOpen] = useState(true)
  const [eamOpen, setEamOpen] = useState(true)
  const [gwsTierOpen, setGwsTierOpen] = useState(true)
  const [ibmTierOpen, setIbmTierOpen] = useState(true)
  const [gcpTierOpen, setGcpTierOpen] = useState(true)
  const [gcpCatOpen, setGcpCatOpen] = useState(true)
  const [awsTierOpen, setAwsTierOpen] = useState(true)
  const [awsCatOpen, setAwsCatOpen] = useState(true)
  const [ociTierOpen, setOciTierOpen] = useState(true)
  const [ociCatOpen, setOciCatOpen] = useState(true)
  const [catOpen, setCatOpen] = useState(true)

  return (
    <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">

      {/* Logo + Search */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <EntraScopeIcon size={24} />
            <span className="text-[13px] font-semibold text-gray-100">IAM Scope</span>
          </button>
          <button
            onClick={() => router.push('/info')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'info'
                ? 'text-[#85b7eb] bg-[#0c2a47]'
                : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'
            }`}
            title="Sobre o IAM Scope"
          >
            <Info size={15} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text" value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-[12px] pl-8 pr-3 py-1.5 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4]"
          />
        </div>
      </div>

      {/* Global tools — Advisor + Compare */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0 flex flex-col gap-1.5">
        <button
          onClick={() => router.push('/advisor')}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-violet-950/60 hover:bg-violet-900/60 border border-violet-800/50 hover:border-violet-700/70 transition-colors text-left group"
        >
          <Sparkles size={14} className="text-violet-400 shrink-0" />
          <span className="flex-1 text-[12px] font-medium text-violet-300 group-hover:text-violet-200">Role Advisor</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 bg-violet-900/60 px-1.5 py-0.5 rounded">Beta</span>
        </button>
        <button
          onClick={() => router.push('/compare')}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 hover:border-blue-700/70 transition-colors text-left group"
        >
          <GitCompare size={14} className="text-blue-400 shrink-0" />
          <span className="flex-1 text-[12px] font-medium text-blue-300 group-hover:text-blue-200">Multi-Cloud Compare</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 bg-blue-900/60 px-1.5 py-0.5 rounded">Beta</span>
        </button>
        <button
          onClick={() => router.push('/evaluate')}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/50 hover:border-emerald-700/70 transition-colors text-left group"
        >
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span className="flex-1 text-[12px] font-medium text-emerald-300 group-hover:text-emerald-200">Role Evaluator</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-900/60 px-1.5 py-0.5 rounded">Beta</span>
        </button>
        <button
          onClick={() => router.push('/tier-comparison')}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800/50 hover:border-red-700/70 transition-colors text-left group"
        >
          <ShieldCheck size={14} className="text-red-400 shrink-0" />
          <span className="flex-1 text-[12px] font-medium text-red-300 group-hover:text-red-200">Tier 0 Comparison</span>
        </button>
      </div>

      {/* Nav — Entra ID */}
      {platform === 'entraId' && (
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'}      onClick={() => onViewChange('dashboard')} />
            <NavItem icon={<ShieldCheck size={15} />}    label="Built-in Roles"  active={view === 'roles'}          badge={String(totalRoles)}       onClick={() => onViewChange('roles')} />
            <NavItem icon={<ListTree size={15} />}       label="Role Actions"    active={view === 'roleActions'}    badge={String(totalRoleActions)} onClick={() => onViewChange('roleActions')} />
            <NavItem icon={<KeyRound size={15} />}       label="API Permissions" active={view === 'apiPermissions'} badge={String(totalApiPerms)}    onClick={() => onViewChange('apiPermissions')} />
            <NavItem icon={<Timer size={15} />}          label="PIM"             active={view === 'pim'}            onClick={() => onViewChange('pim')} />
            <NavItem icon={<HelpCircle size={15} />}     label="Reference"       active={view === 'reference'}      onClick={() => onViewChange('reference')} />
          </div>
          <div className="mb-4">
            <SectionToggle label="Enterprise Access Model" open={eamOpen} onToggle={() => setEamOpen((o) => !o)} />
            {eamOpen && ENTRA_TIERS.map((tier) => {
              const m = EAM_META[tier]
              return (
                <button key={tier} onClick={() => { onViewChange('roles'); router.push(`/roles?tier=${tier}`) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.textColor }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Categorias</p>
            {ENTRA_CATEGORIES.map((item) => (
              <NavItem key={item.cat} icon={item.icon} label={item.label}
                onClick={() => { onViewChange('roles'); onCategoryFilter(item.cat) }} />
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Referência</p>
            <ExtLink icon={<Layers size={15} />}        label="Enterprise Access Model"
              href="https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model" />
            <ExtLink icon={<BookOpen size={15} />}      label="Microsoft Docs"
              href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference" />
            <ExtLink icon={<AlertTriangle size={15} />} label="Privileged Roles"
              href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions" />
          </div>
        </nav>
      )}

      {/* Nav — Azure RBAC */}
      {platform === 'azureRbac' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/azure-rbac')} />
            <NavItem icon={<Shield size={15} />}          label="Built-in Roles" active={view === 'roles'}     badge={String(totalAzureRoles)} onClick={() => router.push('/azure-rbac/roles')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"      active={view === 'reference'} onClick={() => router.push('/azure-rbac/reference')} />
          </div>

          <div>
            <SectionToggle label="Risk Tier" open={tierOpen} onToggle={() => setTierOpen((o) => !o)} />
            {tierOpen && AZURE_TIERS.map((tier) => {
              const m = AZURE_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/azure-rbac/roles?tier=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.textColor }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <SectionToggle label="Categorias" open={catOpen} onToggle={() => setCatOpen((o) => !o)} />
            {catOpen && AZURE_CATEGORIES.map(({ label, cat, icon }) => (
              <button key={cat} onClick={() => router.push(`/azure-rbac/roles?category=${cat}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                <span className="text-[#85b7eb] shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Referência</p>
            <ExtLink icon={<BookOpen size={15} />} label="Azure RBAC Docs"
              href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles" />
            <ExtLink icon={<Layers size={15} />}   label="Role Definitions"
              href="https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions" />
          </div>
        </nav>
      )}


      {/* Nav — Google Workspace */}
      {platform === 'googleWorkspace' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'}      onClick={() => router.push('/google-workspace')} />
            <NavItem icon={<ShieldCheck size={15} />}    label="Admin Roles"     active={view === 'roles'}          badge={String(GWS_ROLES_COUNT)} onClick={() => router.push('/google-workspace/roles')} />
            <NavItem icon={<KeyRound size={15} />}       label="OAuth Scopes"     active={view === 'apiPermissions'} badge={String(GWS_SCOPES_COUNT)} onClick={() => router.push('/google-workspace/api-permissions')} />
            <NavItem icon={<ListTree size={15} />}       label="Admin Privileges" active={view === 'actions'}        onClick={() => router.push('/google-workspace/privileges')} />
            <NavItem icon={<HelpCircle size={15} />}     label="Reference"        active={view === 'reference'}      onClick={() => router.push('/google-workspace/reference')} />
          </div>

          <div>
            <SectionToggle label="Admin Tier" open={gwsTierOpen} onToggle={() => setGwsTierOpen((o) => !o)} />
            {gwsTierOpen && GWS_TIERS.map((tier) => {
              const m = GWS_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/google-workspace/roles?tier=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.textColor }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Referência</p>
            <ExtLink icon={<BookOpen size={15} />} label="Admin SDK Docs"
              href="https://developers.google.com/workspace/admin/roles" />
            <ExtLink icon={<Layers size={15} />}   label="OAuth 2.0 Scopes"
              href="https://developers.google.com/identity/protocols/oauth2/scopes" />
          </div>
        </nav>
      )}

      {/* Nav — GCP IAM */}
      {platform === 'gcp' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/gcp')} />
            <NavItem icon={<ShieldCheck size={15} />}     label="IAM Roles"       active={view === 'roles'}     badge={String(GCP_ROLES_COUNT)} onClick={() => router.push('/gcp/roles')} />
            <NavItem icon={<ListTree size={15} />}        label="IAM Permissions" active={view === 'actions'}   onClick={() => router.push('/gcp/permissions')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"       active={view === 'reference'} onClick={() => router.push('/gcp/reference')} />
          </div>

          <div>
            <SectionToggle label="Role Tier" open={gcpTierOpen} onToggle={() => setGcpTierOpen((o) => !o)} />
            {gcpTierOpen && GCP_TIERS.map((tier) => {
              const m = GCP_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/gcp/roles?filter=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <SectionToggle label="Categorias" open={gcpCatOpen} onToggle={() => setGcpCatOpen((o) => !o)} />
            {gcpCatOpen && GCP_CATEGORIES.map(({ label, cat, icon }) => (
              <button key={cat} onClick={() => router.push(`/gcp/roles?category=${cat}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                <span className="text-[#4285f4] shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Referência</p>
            <ExtLink icon={<BookOpen size={15} />} label="GCP IAM Docs"
              href="https://cloud.google.com/iam/docs/understanding-roles" />
            <ExtLink icon={<Layers size={15} />}   label="Predefined Roles"
              href="https://cloud.google.com/iam/docs/predefined-roles" />
            <ExtLink icon={<AlertTriangle size={15} />} label="IAM Best Practices"
              href="https://cloud.google.com/iam/docs/using-iam-securely" />
          </div>
        </nav>
      )}


      {/* Nav — AWS IAM */}
      {platform === 'aws' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/aws')} />
            <NavItem icon={<ShieldCheck size={15} />}     label="IAM Policies"   active={view === 'roles'}     badge={String(AWS_POLICIES_COUNT)} onClick={() => router.push('/aws/policies')} />
            <NavItem icon={<ListTree size={15} />}        label="IAM Actions"    active={view === 'actions'}   onClick={() => router.push('/aws/actions')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"      active={view === 'reference'} onClick={() => router.push('/aws/reference')} />
            <NavItem icon={<GitCompare size={15} />}      label="SCP vs Policies" onClick={() => router.push('/aws/scp-vs-identity-policies')} />
          </div>

          <div>
            <SectionToggle label="Access Tier" open={awsTierOpen} onToggle={() => setAwsTierOpen((o) => !o)} />
            {awsTierOpen && AWS_TIERS.map((tier) => {
              const m = AWS_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/aws/policies?filter=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <SectionToggle label="Categorias" open={awsCatOpen} onToggle={() => setAwsCatOpen((o) => !o)} />
            {awsCatOpen && AWS_CATS.map(({ label, cat, icon }) => (
              <button key={cat} onClick={() => router.push(`/aws/policies?category=${cat}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                <span className="text-[#ff9900] shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Referência</p>
            <ExtLink icon={<BookOpen size={15} />}      label="AWS Managed Policies"
              href="https://docs.aws.amazon.com/aws-managed-policy/latest/reference/about-managed-policy-reference.html" />
            <ExtLink icon={<Layers size={15} />}        label="IAM Best Practices"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html" />
            <ExtLink icon={<AlertTriangle size={15} />} label="IAM Access Analyzer"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html" />
          </div>
        </nav>
      )}


      {/* Nav — OCI IAM */}
      {platform === 'oci' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/oci')} />
            <NavItem icon={<ShieldCheck size={15} />}     label="IAM Policies"   active={view === 'roles'}     badge={String(OCI_POLICIES_COUNT)} onClick={() => router.push('/oci/policies')} />
            <NavItem icon={<ListTree size={15} />}        label="Verb Actions"   active={view === 'actions'}   onClick={() => router.push('/oci/verbs')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"      active={view === 'reference'} onClick={() => router.push('/oci/reference')} />
          </div>

          <div>
            <SectionToggle label="Verb Tier" open={ociTierOpen} onToggle={() => setOciTierOpen((o) => !o)} />
            {ociTierOpen && OCI_TIERS.map((tier) => {
              const m = OCI_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/oci/policies?tier=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <SectionToggle label="Categorias" open={ociCatOpen} onToggle={() => setOciCatOpen((o) => !o)} />
            {ociCatOpen && OCI_CATS.map(({ label, cat, icon }) => (
              <button key={cat} onClick={() => router.push(`/oci/policies?category=${cat}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                <span className="text-[#C74634] shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Referência</p>
            <ExtLink icon={<BookOpen size={15} />}      label="OCI IAM Docs"
              href="https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/overview.htm" />
            <ExtLink icon={<Layers size={15} />}        label="Policy Reference"
              href="https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/policyreference.htm" />
            <ExtLink icon={<AlertTriangle size={15} />} label="Common Policies"
              href="https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/commonpolicies.htm" />
          </div>
        </nav>
      )}

      {/* Nav — IBM Cloud */}
      {platform === 'ibmCloud' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/ibm-cloud')} />
            <NavItem icon={<ShieldCheck size={15} />}     label="IAM Roles"      active={view === 'roles'}     badge={String(totalIbmRoles)} onClick={() => router.push('/ibm-cloud/roles')} />
            <NavItem icon={<ListTree size={15} />}        label="IAM Actions"    active={view === 'actions'}   onClick={() => router.push('/ibm-cloud/actions')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"      active={view === 'reference'} onClick={() => router.push('/ibm-cloud/reference')} />
            <NavItem icon={<Users size={15} />}           label="Access Groups & Trusted Profiles" onClick={() => router.push('/ibm-cloud/access-groups')} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Modelos de Acesso</p>
            <button onClick={() => router.push('/ibm-cloud/roles?model=iam')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
              <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
              <span className="flex-1">IAM</span>
            </button>
            <button onClick={() => router.push('/ibm-cloud/roles?model=classic')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
              <span className="w-2 h-2 rounded-full shrink-0 bg-stone-400" />
              <span className="flex-1">Classic Infrastructure</span>
            </button>
            <button onClick={() => router.push('/ibm-cloud/roles?model=cloud-foundry')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
              <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
              <span className="flex-1">Cloud Foundry</span>
            </button>
          </div>

          <div>
            <SectionToggle label="Access Tier" open={ibmTierOpen} onToggle={() => setIbmTierOpen((o) => !o)} />
            {ibmTierOpen && IBM_TIERS.map((tier) => {
              const m = IBM_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/ibm-cloud/roles?filter=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Referência</p>
            <ExtLink icon={<BookOpen size={15} />} label="IBM Cloud IAM Docs"
              href="https://cloud.ibm.com/docs/account?topic=account-userroles" />
            <ExtLink icon={<Layers size={15} />}   label="Account Management"
              href="https://cloud.ibm.com/docs/account?topic=account-account-services" />
            <ExtLink icon={<Database size={15} />} label="Classic Infra Perms"
              href="https://cloud.ibm.com/docs/account?topic=account-mngclassicinfra" />
          </div>
        </nav>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {platform === 'entraId'
            ? <><span>Tiering: Enterprise Access Model</span><br /><span>Fontes: Microsoft Learn, EntraOps</span></>
            : platform === 'googleWorkspace'
            ? <><span>Admin Tier: classificação própria</span><br /><span>Fontes: Google Workspace Admin SDK</span></>
            : platform === 'ibmCloud'
            ? <><span>Access Tier: classificação própria</span><br /><span>Fontes: IBM Cloud Docs</span></>
            : platform === 'gcp'
            ? <><span>Role Tier: classificação própria</span><br /><span>Fontes: Google Cloud IAM Docs</span></>
            : platform === 'aws'
            ? <><span>Access Tier: classificação própria</span><br /><span>Fontes: AWS Documentation</span></>
            : platform === 'oci'
            ? <><span>Verb Tier: inspect · read · use · manage</span><br /><span>Fontes: Oracle Cloud Docs</span></>
            : <><span>Fontes: Microsoft Learn, Azure Docs</span><br /><span>Risk Tier: classificação própria</span></>
          }
        </p>
      </div>
    </aside>
  )
}

function SectionToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-2 mb-1">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      {open ? <ChevronDown size={11} className="text-gray-500" /> : <ChevronRight size={11} className="text-gray-500" />}
    </button>
  )
}

function NavItem({ icon, label, active, badge, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] ${
        active
          ? 'bg-[#0c2a47] text-[#85b7eb] font-medium'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
      }`}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] bg-gray-800 border border-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

function ExtLink({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left text-gray-400 hover:bg-gray-800 hover:text-gray-100">
      {icon}
      <span className="flex-1">{label}</span>
    </a>
  )
}
