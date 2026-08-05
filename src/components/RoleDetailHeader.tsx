'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from './ThemeProvider'
import ClassificationBadge from './ClassificationBadge'

/**
 * Cabeçalho das páginas de detalhe de role/policy das 6 clouds.
 *
 * POR QUE ISTO EXISTE
 *   Cada cloud tinha crescido com um cabeçalho próprio. As diferenças não eram
 *   escolha de ninguém, eram idade:
 *
 *     - Entra, Azure e GWS mostravam um bloco de título com h1, pílula de
 *       privilegiada, tier e categoria; AWS, GCP e IBM não tinham bloco de
 *       título nenhum e jogavam tier e categoria em stat card.
 *     - O subtítulo era `Cloud · categoria · tier` no Entra, Azure e GWS, o ARN
 *       na AWS, e um texto fixo ("GCP IAM — detalhes da role") no GCP e na IBM.
 *     - O link de voltar era o mesmo bloco de markup copiado seis vezes, com
 *       "Voltar" cravado em português nas seis — passava batido pelo inventário
 *       de i18n porque ninguém procura string dentro de JSX repetido.
 *
 *   Mesmo caminho já percorrido com a tabela de permissões: uma implementação,
 *   seis usos, e o que é específico de cada cloud entra por prop.
 *
 * O QUE CONTINUA SENDO DE CADA CLOUD
 *   O aviso de privilegiada com prosa própria (a AWS fala de menor privilégio,
 *   o GCP de Cloud Audit Logs, a IBM de Activity Tracker) e os stat cards de
 *   contagem. Isso é conteúdo, não cabeçalho — fica na página.
 *
 * TIER EM DOIS FORMATOS
 *   Os TIER_META não têm forma única: GCP, AWS e IBM usam `{ color, bg }` sem
 *   variante escura; Azure, GWS e o EAM_META do Entra usam
 *   `{ textColor, bgColor, darkText, darkBg }`. Em vez de uniformizar cinco
 *   objetos de dados — mudança grande, risco espalhado —, o adaptador é aqui:
 *   `RoleDetailTier` aceita as duas formas e o componente resolve o tema.
 *
 *   Efeito colateral desejado: Azure e GWS renderizavam `darkBg`/`darkText`
 *   incondicionalmente, ou seja, cor de tema escuro também no claro. Agora
 *   seguem o tema como as demais.
 */

export interface RoleDetailTier {
  label: string
  /** Cor do texto no tema claro. */
  color: string
  /** Fundo no tema claro. */
  bg: string
  /** Ausentes = a cloud não define variante escura; usa-se a clara. */
  darkColor?: string
  darkBg?: string
  /** Vira o tooltip da pílula. */
  description?: string
}

/** Monta o subtítulo do AppShell no formato comum: `Cloud · parte · parte`. */
export function roleDetailSub(cloudLabel: string, ...parts: (string | number | null | undefined)[]) {
  return [cloudLabel, ...parts.filter((p) => p !== null && p !== undefined && p !== '')].join(' · ')
}

/**
 * Link de volta para a listagem, para o `headerBack` do AppShell.
 * Era o mesmo markup em seis arquivos — inclusive o "Voltar" não traduzido.
 */
export function BackToList({ href }: { href: string }) {
  const t = useT()
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-tiny font-medium text-fg-muted hover:text-fg bg-surface-alt hover:bg-gray-700 border border-line-strong hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors"
    >
      <ArrowLeft size={15} /> {t('action.back')}
    </Link>
  )
}

export default function RoleDetailHeader({
  name,
  tier,
  tierBadge,
  category,
  categoryBadge,
  isPrivileged = false,
  classificationSource = 'iamscope',
  extra,
}: {
  name: string
  /** Pílula de tier padrão. Ignorado quando `tierBadge` vem preenchido. */
  tier?: RoleDetailTier
  /** Escape hatch: o Entra usa o EamTierBadge, que já resolve o EAM_META. */
  tierBadge?: React.ReactNode
  /** Categoria como texto simples. */
  category?: string
  /** Categoria como componente — o Entra tem CategoryBadge com cor por categoria. */
  categoryBadge?: React.ReactNode
  isPrivileged?: boolean
  /** 'entraops' só no Entra: o tier de lá não é nosso. Ver ClassificationBadge. */
  classificationSource?: 'iamscope' | 'entraops'
  /** Ex.: contagem de permissões. Entra à direita da categoria. */
  extra?: React.ReactNode
}) {
  const t = useT()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const cor = tier ? (isDark ? tier.darkColor ?? tier.color : tier.color) : undefined
  const fundo = tier ? (isDark ? tier.darkBg ?? tier.bg : tier.bg) : undefined

  return (
    <div className="mb-5">
      <div className="flex items-start gap-3 flex-wrap mb-2">
        <h1 className="text-title font-semibold text-fg">{name}</h1>
        {isPrivileged && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 mt-1.5">
            <ShieldAlert size={12} /> {t('label.privilegedAdj')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {tierBadge ?? (tier && (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-3xs font-semibold border whitespace-nowrap"
            style={{ backgroundColor: fundo, color: cor, borderColor: cor + '40' }}
            title={tier.description}
          >
            {tier.label}
          </span>
        ))}

        {/*
          O selo de procedência fica colado no tier de propósito: é ali que o
          leitor decide se aquele "Full Control" é rótulo da Microsoft ou nosso.
        */}
        <ClassificationBadge source={classificationSource} />

        {categoryBadge ?? (category && <span className="text-tiny text-fg-muted">{category}</span>)}
        {extra && (
          <>
            <span className="text-tiny text-fg-muted">·</span>
            <span className="text-tiny text-fg-muted">{extra}</span>
          </>
        )}
      </div>
    </div>
  )
}
