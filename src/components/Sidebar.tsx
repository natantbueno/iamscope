'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, ShieldCheck, Users, AppWindow, Lock,
  FileCheck, Monitor, BookOpen, AlertTriangle, KeyRound, Layers, ListTree, HelpCircle, Info,
  ChevronDown, Shield, ChevronRight, Cpu, HardDrive, Network, Database, Eye, Boxes, BrainCircuit, Workflow, Settings2, Globe, Compass, FileJson,
  GitCompare, Timer, ShieldAlert, ScanSearch, Gauge, Server, BarChart3, History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RoleCategory, EamTier } from '@/data/roles'
import { CLOUD_MARK } from '@/lib/cloudColors'
// Contagens vêm de counts.ts, não dos datasets: a Sidebar envolve TODAS as
// páginas, então importar os arrays jogaria 2,5 MB no chunk compartilhado.
import {
  GWS_ROLES_COUNT, GWS_SCOPES_COUNT, GWS_PRIVILEGES_COUNT,
  IBM_ROLES_COUNT, IBM_ACCESS_PRIMITIVES_COUNT, IBM_CLASSIC_PERMISSIONS_COUNT,
  GCP_ROLES_COUNT, GCP_PERMISSIONS_COUNT,
  AWS_POLICIES_COUNT, AWS_ACTIONS_COUNT, AZURE_PROVIDERS_COUNT,
} from '@/data/counts'
import type { AzureRbacTier, AzureRbacCategory } from '@/data/azureRbac'
import type { GwsTier } from '@/data/googleWorkspace'
import type { IbmTier } from '@/data/ibmCloud'
import type { GcpTier, GcpCategory } from '@/data/gcp'
import type { AwsTier, AwsCategory } from '@/data/aws'
// TIER_META vem do módulo próprio: importá-los dos arquivos de dados traria
// os datasets inteiros para o chunk compartilhado (ver src/data/tierMeta.ts).
import {
  EAM_META, AZURE_TIER_META, GWS_TIER_META, IBM_TIER_META, GCP_TIER_META, AWS_TIER_META,
} from '@/data/tierMeta'
import EntraScopeIcon from './EntraScopeIcon'
import { usePathname, useRouter } from 'next/navigation'
import { useT } from '@/i18n/LanguageProvider'

export type Platform = 'home' | 'global' | 'entraId' | 'azureRbac' | 'aws' | 'gcp' | 'googleWorkspace' | 'ibmCloud'
// 'scp' e 'accessGroups' existem porque essas páginas tinham item na sidebar
// SEM prop `active`: além de nunca acenderem, deixavam "IAM Policies" / "IAM
// Roles" destacado enquanto a pessoa estava nelas — o mesmo defeito relatado
// em /aws/actions, só que em outro lugar.
export type View = 'dashboard' | 'roles' | 'apiPermissions' | 'roleActions' | 'reference' | 'info' | 'actions' | 'pim' | 'scp' | 'accessGroups' | 'classic' | 'providers'

interface SidebarProps {
  platform: Platform
  view: View
  /** Rota de listagem para onde a busca navega/atualiza ?q= (depende de plataforma+view). */
  searchBasePath: string
  totalRoles: number
  totalApiPerms: number
  totalRoleActions: number
  totalAzureRoles?: number
  totalIbmRoles?: number
  onViewChange: (v: View) => void
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

// Contagem de actions distintas do Azure — vem do índice gerado em build time.
// Fica hardcoded aqui para não puxar o JSON inteiro para dentro do bundle;
// scripts/build-azure-perms-index.js imprime o número ao rodar.
// ATENÇÃO: este número precisa ser atualizado à mão sempre que o índice for
// regerado. Já ficou desatualizado uma vez (marcava 5128 quando o índice tinha
// 2697) — se divergir, a sidebar mostra um número que a página desmente.
const AZURE_ACTIONS_COUNT = 2697

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

const IBM_TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

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


// Links das 6 clouds — mesmas cores do CloudNav.tsx — usados na sidebar da Home.
// Ferramentas globais. Uma lista, um tratamento: a cor não distingue itens
// (todos são a mesma coisa e levam ao mesmo tipo de página) — só o item ativo
// recebe o acento. Ícones alinhados com os cards da home, para que sidebar e
// home não descrevam a mesma ferramenta de dois jeitos.
const TOOLS: { href: string; label: string; icon: LucideIcon }[] = [
  // Permission Scope abre a lista por pedido do Natan (07/08/2026); a ordem
  // dos demais é a de antes.
  { href: '/permission-scope', label: 'Permission Scope',    icon: ScanSearch },
  { href: '/advisor',          label: 'Role Advisor',        icon: Compass },
  { href: '/compare',          label: 'Multi-Cloud Compare', icon: GitCompare },
  { href: '/evaluate',         label: 'Role Evaluator',      icon: FileJson },
  { href: '/sod',              label: 'SoD Analyzer',        icon: ShieldAlert },
  { href: '/assessment',       label: 'Assessment',          icon: Gauge },
  { href: '/tier-comparison',  label: 'Tier 0 Comparison',   icon: ShieldCheck },
  // /stats é panorama, não ferramenta interativa — entra aqui mesmo assim
  // porque este bloco é o único lugar da navegação onde uma rota GLOBAL
  // aparece. Fora dele a página existiria sem porta de entrada.
  { href: '/stats',            label: 'Statistics',          icon: BarChart3 },
  // O Changelog nao e uma ferramenta — e uma secao. Entra nesta lista pelo
  // mesmo motivo que o /stats: este bloco e o unico lugar da navegacao onde
  // uma rota GLOBAL aparece, e e ele que alimenta o GLOBAL_HREFS. Sem estar
  // aqui, /changelog cairia no fallback 'entraId' do AppShell e a sidebar
  // mostraria PIM e Built-in Roles ao lado de uma tela das seis nuvens.
  // O `startsWith` do destaque ja cobre /changelog/gcp de graca.
  { href: '/changelog',        label: 'Changelog',           icon: History },
]

/**
 * As rotas que não pertencem a cloud nenhuma.
 *
 * O AppShell decide a plataforma por prefixo e terminava num `: 'entraId'`.
 * Como nenhuma destas casa com `/entraid`, `/aws` e companhia, todas caíam
 * nesse fallback e a sidebar exibia "Built-in Roles / Role Actions / PIM /
 * Enterprise Access Model" ao lado de uma tela multi-cloud — menu de uma
 * plataforma numa página que não é de plataforma nenhuma.
 *
 * O bloco TOOLS inteiro (as sete ferramentas mais o /stats), o /info (sobre o
 * site) e a busca global. Deriva de TOOLS de propósito: uma rota nova no menu
 * entra aqui sozinha, e não cai no fallback `entraId` por esquecimento.
 *
 * O /reference NÃO entra: é um stub de redirect em (legacy), sem AppShell e
 * sem sidebar.
 */
export const GLOBAL_HREFS: readonly string[] = [
  ...TOOLS.map((tool) => tool.href),
  '/info',
  '/search',
]

/** A lista de clouds da sidebar — mesma marcação na home e nas ferramentas. */
function ListaDeClouds({ titulo, onNavigate }: { titulo: string; onNavigate: (href: string) => void }) {
  return (
    <div>
      <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{titulo}</p>
      {CLOUD_LINKS.map((cloud) => (
        <button key={cloud.href} onClick={() => onNavigate(cloud.href)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-body text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cloud.color }} />
          <span className="flex-1">{cloud.label}</span>
        </button>
      ))}
    </div>
  )
}

const CLOUD_LINKS: { label: string; href: string; color: string }[] = [
  // A cor pinta o FUNDO de um ponto de 8px, nunca texto — por isso
  // `CLOUD_MARK`, a cor de marca cheia, e não os tokens neutros de texto.
  { label: 'Entra ID',        href: '/entraid',          color: CLOUD_MARK.entraId },
  { label: 'Azure RBAC',      href: '/azure-rbac',       color: CLOUD_MARK.azureRbac },
  { label: 'AWS IAM',         href: '/aws',              color: CLOUD_MARK.aws },
  { label: 'GCP IAM',         href: '/gcp',              color: CLOUD_MARK.gcp },
  { label: 'Google Workspace',href: '/google-workspace', color: CLOUD_MARK.googleWorkspace },
  { label: 'IBM Cloud',       href: '/ibm-cloud',        color: CLOUD_MARK.ibmCloud },
]

/**
 * Estado de abrir/fechar de seção da sidebar que sobrevive à troca de página.
 *
 * Cada rota monta o seu próprio AppShell, então a Sidebar é REMONTADA a cada
 * navegação e um `useState(true)` reabre sozinho a seção que a pessoa tinha
 * fechado. O valor mora no localStorage.
 *
 * Por que existe o cache de módulo além do localStorage: o primeiro render
 * precisa bater com o HTML gerado no build (export estático), senão a
 * hidratação acusa divergência — por isso o valor inicial é sempre o padrão e
 * o localStorage só entra no `useEffect`. O cache de módulo sobrevive à
 * navegação no cliente, então da segunda página em diante o estado certo já
 * está no primeiro render e não há piscada.
 */
const SECTION_KEY = 'iamscope.sidebar.sections'
const SECTION_CACHE: Record<string, boolean> = {}
let sectionCacheReady = false

function loadSections() {
  if (sectionCacheReady) return
  sectionCacheReady = true
  try {
    const raw = window.localStorage.getItem(SECTION_KEY)
    if (raw) Object.assign(SECTION_CACHE, JSON.parse(raw) as Record<string, boolean>)
  } catch { /* storage bloqueado ou JSON corrompido: segue com o padrão */ }
}

function useSectionOpen(key: string, fallback = true): [boolean, () => void] {
  const [open, setOpen] = useState(() => SECTION_CACHE[key] ?? fallback)

  useEffect(() => {
    loadSections()
    const saved = SECTION_CACHE[key]
    if (typeof saved === 'boolean') setOpen(saved)
  }, [key])

  const toggle = () => setOpen((o) => {
    const next = !o
    SECTION_CACHE[key] = next
    try { window.localStorage.setItem(SECTION_KEY, JSON.stringify(SECTION_CACHE)) } catch { /* idem */ }
    return next
  })

  return [open, toggle]
}

export default function Sidebar({
  platform, view, searchBasePath, totalRoles, totalApiPerms, totalRoleActions, totalAzureRoles = 0, totalIbmRoles = IBM_ROLES_COUNT,
  onViewChange, onCategoryFilter,
}: SidebarProps) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const [tierOpen, toggleTier]         = useSectionOpen('tier')
  const [eamOpen, toggleEam]           = useSectionOpen('eam')
  const [gwsTierOpen, toggleGwsTier]   = useSectionOpen('gwsTier')
  const [ibmTierOpen, toggleIbmTier]   = useSectionOpen('ibmTier')
  const [gcpTierOpen, toggleGcpTier]   = useSectionOpen('gcpTier')
  const [gcpCatOpen, toggleGcpCat]     = useSectionOpen('gcpCat')
  const [awsTierOpen, toggleAwsTier]   = useSectionOpen('awsTier')
  const [awsCatOpen, toggleAwsCat]     = useSectionOpen('awsCat')
  const [catOpen, toggleCat]           = useSectionOpen('cat')
  // Ferramentas abrem por padrão: são o diferencial do site e ficariam
  // escondidas atrás de um clique se começassem fechadas. Quem fechar,
  // porém, continua fechado ao trocar de página.
  const [toolsOpen, toggleTools]       = useSectionOpen('tools')

  /** Sem a barra do fim — ver o comentário no destaque das ferramentas. */
  const rotaAtual = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/'

  return (
    <aside className="w-60 shrink-0 bg-surface border-r border-line flex flex-col h-screen sticky top-0">

      {/* Logo */}
      <div className="p-4 border-b border-line">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <EntraScopeIcon size={24} />
            <span className="text-body font-semibold text-fg">IAM Scope</span>
          </button>
          <button
            onClick={() => router.push('/info')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'info'
                ? 'text-brand-onDark bg-brand-activeBg'
                : 'text-fg-muted hover:text-fg hover:bg-surface-alt'
            }`}
            title={t('sidebar.about')}
          >
            <Info size={15} />
          </button>
        </div>
      </div>

      {/* Ferramentas globais */}
      <div className="px-3 py-2 border-b border-line shrink-0 flex flex-col gap-1.5">
        <SectionToggle label={t('sidebar.tools')} open={toolsOpen} onToggle={toggleTools} />
        {toolsOpen && (
        <>
        {TOOLS.map(({ href, label, icon: Icon }) => {
          // `rotaAtual`, e não `pathname` cru: com `trailingSlash: true` no
          // next.config o pathname é `/evaluate/` e o href é `/evaluate`, então
          // esta comparação NUNCA era verdadeira — a ferramenta aberta jamais
          // aparecia destacada. É o mesmo defeito que o AppShell já normaliza
          // para os itens de plataforma; aqui tinha escapado.
          //
          // O `startsWith` cobre as sub-rotas: em /sod/rules/... quem está
          // aceso é o SoD Analyzer.
          const active = rotaAtual === href || rotaAtual.startsWith(`${href}/`)
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              title={label}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-md border-l-2 transition-colors ${
                active
                  ? 'border-accent bg-surface-alt text-fg'
                  : 'border-transparent text-fg-subtle hover:bg-surface-alt hover:text-fg'
              } w-full px-2.5 py-2 text-left`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="flex-1 text-tiny font-medium">{label}</span>
            </button>
          )
        })}
        </>
        )}
      </div>

      {/* Nav — Home */}
      {/*
        Nav — páginas globais (ferramentas, /info e busca).

        Nenhuma delas pertence a uma plataforma, então nenhum menu de
        plataforma cabe aqui. O que cabe é a saída — de dentro de uma
        ferramenta ou da busca, o próximo passo costuma ser abrir o catálogo de
        alguma cloud. As ferramentas em si já estão listadas no bloco de cima,
        com a ativa destacada.
      */}
      {platform === 'global' && (
        <nav className="flex-1 overflow-y-auto p-2">
          <ListaDeClouds titulo={t('nav.exploreByCloud')} onNavigate={(href) => router.push(href)} />
        </nav>
      )}

      {platform === 'home' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <ListaDeClouds titulo="Clouds" onNavigate={(href) => router.push(href)} />

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')} — Entra ID</p>
            <ExtLink icon={<Layers size={15} />}        label="Enterprise Access Model"
              href="https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model" />
            <ExtLink icon={<BookOpen size={15} />}      label="Microsoft Docs"
              href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference" />
            <ExtLink icon={<AlertTriangle size={15} />} label="Privileged Roles"
              href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions" />
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')} — Azure RBAC</p>
            <ExtLink icon={<BookOpen size={15} />} label="Azure RBAC Docs"
              href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles" />
            <ExtLink icon={<Layers size={15} />}   label="Role Definitions"
              href="https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions" />
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')} — AWS IAM</p>
            <ExtLink icon={<BookOpen size={15} />}      label="AWS Managed Policies"
              href="https://docs.aws.amazon.com/aws-managed-policy/latest/reference/about-managed-policy-reference.html" />
            <ExtLink icon={<Layers size={15} />}        label="IAM Best Practices"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html" />
            <ExtLink icon={<AlertTriangle size={15} />} label="IAM Access Analyzer"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html" />
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')} — GCP IAM</p>
            <ExtLink icon={<BookOpen size={15} />} label="GCP IAM Docs"
              href="https://cloud.google.com/iam/docs/understanding-roles" />
            <ExtLink icon={<Layers size={15} />}   label="Predefined Roles"
              href="https://cloud.google.com/iam/docs/predefined-roles" />
            <ExtLink icon={<AlertTriangle size={15} />} label="IAM Best Practices"
              href="https://cloud.google.com/iam/docs/using-iam-securely" />
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')} — Google Workspace</p>
            <ExtLink icon={<BookOpen size={15} />} label="Admin SDK Docs"
              href="https://developers.google.com/workspace/admin/roles" />
            <ExtLink icon={<Layers size={15} />}   label="OAuth 2.0 Scopes"
              href="https://developers.google.com/identity/protocols/oauth2/scopes" />
          </div>


          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')} — IBM Cloud</p>
            <ExtLink icon={<BookOpen size={15} />} label="IBM Cloud IAM Docs"
              href="https://cloud.ibm.com/docs/iam?topic=iam-userroles" />
            <ExtLink icon={<Layers size={15} />}   label="Account Management"
              href="https://cloud.ibm.com/docs/account?topic=account-account-services" />
            <ExtLink icon={<Database size={15} />} label="Classic Infra Perms"
              href="https://cloud.ibm.com/docs/iam?topic=iam-mngclassicinfra" />
          </div>
        </nav>
      )}

      {/* Nav — Entra ID */}
      {platform === 'entraId' && (
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'}      onClick={() => onViewChange('dashboard')} />
            <NavItem icon={<ShieldCheck size={15} />}    label="Built-in Roles"  active={view === 'roles'}          badge={String(totalRoles)}       onClick={() => onViewChange('roles')} />
            <NavItem icon={<ListTree size={15} />}       label="Role Actions"    active={view === 'roleActions'}    badge={String(totalRoleActions)} onClick={() => onViewChange('roleActions')} />
            <NavItem icon={<KeyRound size={15} />}       label="API Permissions" active={view === 'apiPermissions'} badge={String(totalApiPerms)}    onClick={() => onViewChange('apiPermissions')} />
            <NavItem icon={<Timer size={15} />}          label="PIM"             active={view === 'pim'}            onClick={() => onViewChange('pim')} />
            <NavItem icon={<HelpCircle size={15} />}     label="Reference"       active={view === 'reference'}      badge="3" onClick={() => onViewChange('reference')} />
          </div>
          <div className="mb-4">
            <SectionToggle label="Enterprise Access Model" open={eamOpen} onToggle={toggleEam} />
            {eamOpen && ENTRA_TIERS.map((tier) => {
              const m = EAM_META[tier]
              return (
                <button key={tier} onClick={() => { onViewChange('roles'); router.push(`/entraid/roles?tier=${tier}`) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.textColor }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>
          <div className="mb-4">
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('sidebar.categories')}</p>
            {ENTRA_CATEGORIES.map((item) => (
              <NavItem key={item.cat} icon={item.icon} label={item.label}
                onClick={() => { onViewChange('roles'); onCategoryFilter(item.cat) }} />
            ))}
          </div>
          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')}</p>
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
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/azure-rbac')} />
            <NavItem icon={<Shield size={15} />}          label="Built-in Roles" active={view === 'roles'}     badge={String(totalAzureRoles)} onClick={() => router.push('/azure-rbac/roles')} />
            <NavItem icon={<KeyRound size={15} />}        label={t('nav.permissions')}     active={view === 'apiPermissions'} badge={String(AZURE_ACTIONS_COUNT)} onClick={() => router.push('/azure-rbac/permissions')} />
            <NavItem icon={<Boxes size={15} />}           label={t('nav.providers')}       active={view === 'providers'}      badge={String(AZURE_PROVIDERS_COUNT)} onClick={() => router.push('/azure-rbac/providers')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"      active={view === 'reference'} badge="2" onClick={() => router.push('/azure-rbac/reference')} />
          </div>

          <div>
            <SectionToggle label="Risk Tier" open={tierOpen} onToggle={toggleTier} />
            {tierOpen && AZURE_TIERS.map((tier) => {
              const m = AZURE_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/azure-rbac/roles?tier=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.textColor }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <SectionToggle label={t('sidebar.categories')} open={catOpen} onToggle={toggleCat} />
            {catOpen && AZURE_CATEGORIES.map(({ label, cat, icon }) => (
              <button key={cat} onClick={() => router.push(`/azure-rbac/roles?category=${cat}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                <span className="text-brand-onDark shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')}</p>
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
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'}      onClick={() => router.push('/google-workspace')} />
            <NavItem icon={<ShieldCheck size={15} />}    label="Admin Roles"     active={view === 'roles'}          badge={String(GWS_ROLES_COUNT)} onClick={() => router.push('/google-workspace/roles')} />
            <NavItem icon={<KeyRound size={15} />}       label="OAuth Scopes"     active={view === 'apiPermissions'} badge={String(GWS_SCOPES_COUNT)} onClick={() => router.push('/google-workspace/api-permissions')} />
            <NavItem icon={<ListTree size={15} />}       label="Admin Privileges" active={view === 'actions'}        badge={String(GWS_PRIVILEGES_COUNT)} onClick={() => router.push('/google-workspace/privileges')} />
            <NavItem icon={<HelpCircle size={15} />}     label="Reference"        active={view === 'reference'}      badge="2" onClick={() => router.push('/google-workspace/reference')} />
          </div>

          <div>
            <SectionToggle label="Admin Tier" open={gwsTierOpen} onToggle={toggleGwsTier} />
            {gwsTierOpen && GWS_TIERS.map((tier) => {
              const m = GWS_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/google-workspace/roles?tier=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.textColor }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')}</p>
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
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/gcp')} />
            <NavItem icon={<ShieldCheck size={15} />}     label="IAM Roles"       active={view === 'roles'}     badge={String(GCP_ROLES_COUNT)} onClick={() => router.push('/gcp/roles')} />
            <NavItem icon={<ListTree size={15} />}        label="IAM Permissions" active={view === 'actions'}   badge={String(GCP_PERMISSIONS_COUNT)} onClick={() => router.push('/gcp/permissions')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"       active={view === 'reference'} badge="3" onClick={() => router.push('/gcp/reference')} />
          </div>

          <div>
            <SectionToggle label="Role Tier" open={gcpTierOpen} onToggle={toggleGcpTier} />
            {gcpTierOpen && GCP_TIERS.map((tier) => {
              const m = GCP_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/gcp/roles?filter=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <SectionToggle label={t('sidebar.categories')} open={gcpCatOpen} onToggle={toggleGcpCat} />
            {gcpCatOpen && GCP_CATEGORIES.map(({ label, cat, icon }) => (
              <button key={cat} onClick={() => router.push(`/gcp/roles?category=${cat}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                <span className="text-csp-gcp-onLight dark:text-csp-gcp-onDark shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')}</p>
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
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/aws')} />
            <NavItem icon={<ShieldCheck size={15} />}     label="IAM Policies"   active={view === 'roles'}     badge={String(AWS_POLICIES_COUNT)} onClick={() => router.push('/aws/policies')} />
            <NavItem icon={<ListTree size={15} />}        label="IAM Actions"    active={view === 'actions'}   badge={String(AWS_ACTIONS_COUNT)} onClick={() => router.push('/aws/actions')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"      active={view === 'reference'} badge="3" onClick={() => router.push('/aws/reference')} />
            <NavItem icon={<GitCompare size={15} />}      label="SCP vs Policies" active={view === 'scp'} onClick={() => router.push('/aws/scp-vs-identity-policies')} />
          </div>

          <div>
            <SectionToggle label="Access Tier" open={awsTierOpen} onToggle={toggleAwsTier} />
            {awsTierOpen && AWS_TIERS.map((tier) => {
              const m = AWS_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/aws/policies?filter=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <SectionToggle label={t('sidebar.categories')} open={awsCatOpen} onToggle={toggleAwsCat} />
            {awsCatOpen && AWS_CATS.map(({ label, cat, icon }) => (
              <button key={cat} onClick={() => router.push(`/aws/policies?category=${cat}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                <span className="text-csp-aws-onLight dark:text-csp-aws-onDark shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')}</p>
            <ExtLink icon={<BookOpen size={15} />}      label="AWS Managed Policies"
              href="https://docs.aws.amazon.com/aws-managed-policy/latest/reference/about-managed-policy-reference.html" />
            <ExtLink icon={<Layers size={15} />}        label="IAM Best Practices"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html" />
            <ExtLink icon={<AlertTriangle size={15} />} label="IAM Access Analyzer"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html" />
          </div>
        </nav>
      )}



      {/* Nav — IBM Cloud */}
      {platform === 'ibmCloud' && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">Geral</p>
            <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"      active={view === 'dashboard'} onClick={() => router.push('/ibm-cloud')} />
            <NavItem icon={<ShieldCheck size={15} />}     label="IAM Roles"      active={view === 'roles'}     badge={String(totalIbmRoles)} onClick={() => router.push('/ibm-cloud/roles')} />
            {/*
              Substituiu "IAM Actions" em 03/08. Aquela página listava 557
              actions que não existiam, e não há como recoletá-las: a IBM não
              publica action por role. O que existe de verdade e não estava em
              lugar nenhum é o modelo da infraestrutura clássica.
            */}
            {/* O badge conta PERMISSÃO, não role: o clássico não tem role. É a
                única entrada do menu cujo número não é de role — e é de propósito. */}
            <NavItem icon={<Server size={15} />}          label="Classic Infrastructure" active={view === 'classic'} badge={String(IBM_CLASSIC_PERMISSIONS_COUNT)} onClick={() => router.push('/ibm-cloud/classic')} />
            <NavItem icon={<HelpCircle size={15} />}      label="Reference"      active={view === 'reference'} badge="3" onClick={() => router.push('/ibm-cloud/reference')} />
            <NavItem icon={<Users size={15} />}           label="Access Groups & Trusted Profiles" active={view === 'accessGroups'} badge={String(IBM_ACCESS_PRIMITIVES_COUNT)} onClick={() => router.push('/ibm-cloud/access-groups')} />
          </div>

          {/*
            O filtro por modelo de acesso saiu em 03/08. Ele oferecia IAM,
            Classic Infrastructure e Cloud Foundry como se as três fossem
            recortes das mesmas roles — mas a IBM só tem roles no IAM. As
            "roles" clássicas e de Cloud Foundry do dataset antigo não existiam,
            e o clássico agora tem página própria, com o modelo correto.
          */}

          <div>
            <SectionToggle label="Access Tier" open={ibmTierOpen} onToggle={toggleIbmTier} />
            {ibmTierOpen && IBM_TIERS.map((tier) => {
              const m = IBM_TIER_META[tier]
              return (
                <button key={tier} onClick={() => router.push(`/ibm-cloud/roles?filter=${tier}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-tiny text-fg-subtle hover:bg-surface-alt hover:text-fg transition-colors text-left">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="flex-1">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider px-2 mb-1">{t('nav.reference')}</p>
            <ExtLink icon={<BookOpen size={15} />} label="IBM Cloud IAM Docs"
              href="https://cloud.ibm.com/docs/iam?topic=iam-userroles" />
            <ExtLink icon={<Layers size={15} />}   label="Account Management"
              href="https://cloud.ibm.com/docs/account?topic=account-account-services" />
            <ExtLink icon={<Database size={15} />} label="Classic Infra Perms"
              href="https://cloud.ibm.com/docs/iam?topic=iam-mngclassicinfra" />
          </div>
        </nav>
      )}

      {/* Footer */}
      {(
      <div className="p-4 border-t border-line">
        <p className="text-3xs text-fg-muted leading-relaxed">
          {platform === 'home' || platform === 'global'
            ? <><span>{t('sidebar.multiCloudRef')}</span><br /><span>{t('sidebar.sixPlatforms')}</span></>
            : platform === 'entraId'
            ? <><span>Tiering: Enterprise Access Model</span><br /><span>Fontes: Microsoft Learn, EntraOps</span></>
            : platform === 'googleWorkspace'
            ? <><span>Admin Tier: {t('sidebar.ownClassification')}</span><br /><span>Fontes: Google Workspace Admin SDK</span></>
            : platform === 'ibmCloud'
            ? <><span>Access Tier: {t('sidebar.ownClassification')}</span><br /><span>Fontes: IBM Cloud Docs</span></>
            : platform === 'gcp'
            ? <><span>Role Tier: {t('sidebar.ownClassification')}</span><br /><span>Fontes: Google Cloud IAM Docs</span></>
            : platform === 'aws'
            ? <><span>Access Tier: {t('sidebar.ownClassification')}</span><br /><span>Fontes: AWS Documentation</span></>
            : <><span>Fontes: Microsoft Learn, Azure Docs</span><br /><span>Risk Tier: {t('sidebar.ownClassification')}</span></>
          }
        </p>
      </div>
      )}
    </aside>
  )
}

function SectionToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    // py-1.5 leva o alvo de 15px para 30px de altura. Um alvo de 15px é um alvo
    // que se erra, mesmo com mouse.
    <button onClick={onToggle} className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-md hover:bg-surface-alt transition-colors">
      <p className="text-2xs font-semibold text-fg-muted uppercase tracking-wider">{label}</p>
      {open ? <ChevronDown size={11} className="text-fg-muted" /> : <ChevronRight size={11} className="text-fg-muted" />}
    </button>
  )
}

function NavItem({ icon, label, active, badge, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-body transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        active
          ? 'bg-brand-activeBg text-brand-onDark font-medium'
          : 'text-fg-subtle hover:bg-surface-alt hover:text-fg'
      }`}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-2xs bg-surface-alt border border-line-strong text-fg-muted px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

function ExtLink({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-body transition-colors text-left text-fg-subtle hover:bg-surface-alt hover:text-fg">
      {icon}
      <span className="flex-1">{label}</span>
    </a>
  )
}
