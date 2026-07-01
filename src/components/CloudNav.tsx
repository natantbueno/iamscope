'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Source of truth for CSP colors — mirrors PLATFORMS in Sidebar.tsx
const CLOUDS = [
  { id: 'entraId',         label: 'Entra ID',      href: '/',                 color: '#0078d4' },
  { id: 'azureRbac',       label: 'Azure RBAC',     href: '/azure-rbac',       color: '#5c2d91' },
  { id: 'aws',             label: 'AWS IAM',         href: '/aws',              color: '#ff9900' },
  { id: 'gcp',             label: 'GCP IAM',         href: '/gcp',              color: '#0f9d58' },
  { id: 'googleWorkspace', label: 'G. Workspace',    href: '/google-workspace', color: '#34a853' },
  { id: 'oci',             label: 'Oracle Cloud',    href: '/oci',              color: '#C74634' },
  { id: 'ibmCloud',        label: 'IBM Cloud',       href: '/ibm-cloud',        color: '#08bdba' },
] as const

type CloudId = (typeof CLOUDS)[number]['id']

/** Derives active platform from pathname — same logic as AppShell.tsx */
function getActivePlatform(pathname: string): CloudId | null {
  if (pathname.startsWith('/azure-rbac'))       return 'azureRbac'
  if (pathname.startsWith('/google-workspace')) return 'googleWorkspace'
  if (pathname.startsWith('/ibm-cloud'))        return 'ibmCloud'
  if (pathname.startsWith('/gcp'))              return 'gcp'
  if (pathname.startsWith('/aws'))              return 'aws'
  if (pathname.startsWith('/oci'))              return 'oci'
  // Cross-platform tools (/compare, /advisor, /info) — no cloud active
  if (
    pathname.startsWith('/compare') ||
    pathname.startsWith('/advisor') ||
    pathname.startsWith('/info')
  ) return null
  return 'entraId'
}

export default function CloudNav() {
  const pathname = usePathname()
  const active = getActivePlatform(pathname)

  return (
    <nav
      aria-label="Cloud providers"
      className="bg-white dark:bg-gray-900 border-b border-[#dde3ec] dark:border-gray-800 overflow-x-auto shrink-0"
    >
      <div className="flex items-stretch px-2 min-w-max">
        {CLOUDS.map((cloud) => {
          const isActive = active === cloud.id
          return (
            <Link
              key={cloud.id}
              href={cloud.href}
              aria-current={isActive ? 'page' : undefined}
              style={{ '--cloud-color': cloud.color } as React.CSSProperties}
              className="cloud-nav-item px-4 py-3 text-[13px] font-semibold uppercase tracking-wider whitespace-nowrap border-b-[3px] border-transparent text-gray-500 dark:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4]"
            >
              {cloud.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
