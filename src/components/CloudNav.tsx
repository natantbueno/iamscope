'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Info } from 'lucide-react'
import { type CloudId } from '@/lib/cloudColors'
import { GLOBAL_HREFS } from './Sidebar'
import { useT } from '@/i18n/LanguageProvider'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import CommandPalette from './CommandPalette'

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

/**
 * Qual cloud fica acesa no menu de cima.
 *
 * A LISTA DE ROTAS GLOBAIS VEM DE `GLOBAL_HREFS`, e não de uma cópia local.
 *
 *   Até 24/08/2026 este arquivo mantinha a própria lista de "ferramentas
 *   multi-cloud" e terminava num `return 'entraId'`. Ela nasceu com seis
 *   rotas e nunca acompanhou as que vieram depois: `/assessment`, `/search` e
 *   `/stats` não estavam ali, então as três acendiam **Entra ID** no menu
 *   superior — a mesma falha que o AppShell teve, corrigida em 21/08, e pelo
 *   mesmo motivo (uma segunda lista da mesma coisa, que envelhece sozinha).
 *
 *   Agora as duas derivações leem a mesma fonte. Rota global nova entra no
 *   `TOOLS` da Sidebar e as três telas passam a concordar sem edição aqui.
 *
 * A BARRA DO FIM É NORMALIZADA ANTES DE COMPARAR. Com `trailingSlash: true` no
 * next.config o pathname real é `/stats/`; comparar cru contra `/stats` é o
 * defeito que já custou o destaque da ferramenta ativa na sidebar.
 */
function getActivePlatform(pathname: string): CloudId | null {
  const rota = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/'

  if (rota === '/') return 'home'

  // Antes dos testes de cloud, como no AppShell. É seguro: nenhuma rota de
  // cloud começa com um prefixo global (`/aws/reference` não começa com
  // `/reference`).
  if (GLOBAL_HREFS.some((href) => rota === href || rota.startsWith(`${href}/`))) return null

  if (rota.startsWith('/azure-rbac'))       return 'azureRbac'
  if (rota.startsWith('/google-workspace')) return 'googleWorkspace'
  if (rota.startsWith('/ibm-cloud'))        return 'ibmCloud'
  if (rota.startsWith('/gcp'))              return 'gcp'
  if (rota.startsWith('/aws'))              return 'aws'
  return 'entraId'
}

export default function CloudNav() {
  const pathname = usePathname()
  const t = useT()
  const navRef = useRef<HTMLElement>(null)
  const active = getActivePlatform(pathname)
  const naInfo = pathname.startsWith('/info')

  // O item ativo pode nascer fora da área visível no mobile. Rola só o
  // contêiner, nunca a página — `block: 'nearest'` evita o pulo vertical.
  useEffect(() => {
    const el = navRef.current?.querySelector('[aria-current="page"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    /*
      Duas metades na mesma linha: à esquerda a navegação de clouds, que rola;
      à direita as preferências da pessoa (sobre o site, tema, idioma), que
      ficam paradas.

      Tema e idioma moravam na linha do título. Ali disputavam largura com o
      próprio título — em 390px sobrava "Azure RB…" para a página, e o
      subtítulo saía cortado no meio. Subir os dois devolve a linha do título
      inteira ao título.

      `min-w-0` no <nav> não é decorativo: sem ele o conteúdo `min-w-max` de
      dentro empurraria o flex e os controles sairiam da tela.
    */
    <div className="bg-surface border-b border-line shrink-0 flex items-stretch">
      <nav
        ref={navRef}
        aria-label="Cloud providers"
        /* `cloud-nav-scroll` desenha um esmaecimento na borda direita enquanto
           houver conteúdo fora da tela. Sem ele, em 390px o menu mostrava 4 das 7
           plataformas e as outras três não davam nenhum sinal de existir — num
           produto que se apresenta como "seis clouds num lugar só". */
        className="cloud-nav-scroll flex-1 min-w-0 overflow-x-auto"
      >
        <div className="flex items-stretch px-2 min-w-max">
          {CLOUDS.map((cloud) => {
            const isActive = active === cloud.id
            return (
              <Link
                key={cloud.id}
                href={cloud.href}
                aria-current={isActive ? 'page' : undefined}
                className="cloud-nav-item px-4 py-3 text-body font-semibold uppercase tracking-wider whitespace-nowrap border-b-[3px] border-transparent text-fg-muted"
              >
                {cloud.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="flex items-center gap-1 sm:gap-2 pl-1.5 pr-1.5 sm:pl-2 sm:pr-3 shrink-0 border-l border-line">
        {/* Busca global — sempre cruza as 6 clouds e sempre navega (⌘K de
            qualquer tela). Filtrar a lista que já está na tela é um campo à
            parte, embutido na própria tabela (InlineListFilter). */}
        <CommandPalette />
        <div className="w-px self-stretch bg-line mx-0.5" aria-hidden="true" />
        {/* O mesmo destino do botão ao lado do logo na sidebar. Fica nos dois
            lugares de propósito: a sidebar some no celular, e é justamente
            quem chega pelo celular que mais precisa do "o que é isto". */}
        <Link
          href="/info"
          aria-current={naInfo ? 'page' : undefined}
          aria-label={t('sidebar.about')}
          title={t('sidebar.about')}
          className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors shrink-0 ${
            naInfo
              ? 'text-brand-onDark bg-brand-activeBg'
              : 'text-fg-muted hover:text-fg hover:bg-surface-alt'
          }`}
        >
          <Info size={15} />
        </Link>
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </div>
  )
}
