'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CLOUD_COLORS, type CloudId } from '@/lib/cloudColors'

// A cor de cada cloud vem de src/lib/cloudColors.ts — este arquivo já não
// declara hex nenhum. Antes mantinha uma segunda lista que divergia dos tokens
// `csp-*` do Tailwind (GCP verde aqui, azul no card da home; IBM teal aqui,
// azul no card), e as duas verdes adjacentes — GCP #0f9d58 e G. Workspace
// #34a853 — eram praticamente indistinguíveis no menu.
const CLOUDS: { id: CloudId; label: string; href: string }[] = [
  { id: 'home',            label: 'Home',         href: '/' },
  { id: 'entraId',         label: 'Entra ID',     href: '/entraid' },
  { id: 'azureRbac',       label: 'Azure RBAC',   href: '/azure-rbac' },
  { id: 'aws',             label: 'AWS IAM',      href: '/aws' },
  { id: 'gcp',             label: 'GCP IAM',      href: '/gcp' },
  { id: 'googleWorkspace', label: 'G. Workspace', href: '/google-workspace' },
  { id: 'ibmCloud',        label: 'IBM Cloud',    href: '/ibm-cloud' },
]

/** Derives active platform from pathname — same logic as AppShell.tsx */
function getActivePlatform(pathname: string): CloudId | null {
  if (pathname === '/')                         return 'home'
  if (pathname.startsWith('/azure-rbac'))       return 'azureRbac'
  if (pathname.startsWith('/google-workspace')) return 'googleWorkspace'
  if (pathname.startsWith('/ibm-cloud'))        return 'ibmCloud'
  if (pathname.startsWith('/gcp'))              return 'gcp'
  if (pathname.startsWith('/aws'))              return 'aws'
  // Ferramentas multi-cloud — nenhuma cloud fica ativa no menu superior
  if (
    pathname.startsWith('/compare') ||
    pathname.startsWith('/advisor') ||
    pathname.startsWith('/permission-scope') ||
    pathname.startsWith('/tier-comparison') ||
    pathname.startsWith('/evaluate') ||
    pathname.startsWith('/sod') ||
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
      className="bg-surface border-b border-line overflow-x-auto shrink-0"
    >
      <div className="flex items-stretch px-2 min-w-max">
        {CLOUDS.map((cloud) => {
          const isActive = active === cloud.id
          const color = CLOUD_COLORS[cloud.id]
          return (
            <Link
              key={cloud.id}
              href={cloud.href}
              aria-current={isActive ? 'page' : undefined}
              style={
                {
                  // O texto do item ativo troca de variante conforme o tema: a
                  // cor de marca nunca serve nos dois (Azure RBAC dá 1.89:1 no
                  // escuro, Entra dá 2.1:1 no claro). Quem escolhe entre as duas
                  // é o seletor `.dark` em globals.css.
                  '--cloud-on-light': color.onLight,
                  '--cloud-on-dark': color.onDark,
                  // O sublinhado é decorativo e fica sobre o fundo, não sobre
                  // texto — pode usar a cor de marca cheia nos dois temas.
                  '--cloud-mark': color.mark,
                } as React.CSSProperties
              }
              className="cloud-nav-item px-4 py-3 text-body font-semibold uppercase tracking-wider whitespace-nowrap border-b-[3px] border-transparent text-fg-muted"
            >
              {cloud.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
