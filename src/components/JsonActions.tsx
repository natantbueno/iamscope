'use client'

import { useState } from 'react'
import { Copy, CheckCheck, Download } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'
import { downloadJson } from '@/lib/export'

/**
 * Copiar e baixar o JSON que a página está mostrando.
 *
 * POR QUE VIROU COMPONENTE
 *   O bloco "Role Definition (JSON)" existe em seis telas — Entra, Azure RBAC,
 *   AWS, GCP, Google Workspace e IBM Cloud — e cada uma tinha a própria cópia
 *   do mesmo botão: um `useState` de "copiado", um `navigator.clipboard`, um
 *   `setTimeout` de 2s. Seis implementações do mesmo widget é seis lugares para
 *   o botão de download novo entrar torto, e era também onde os rótulos
 *   "Copiar"/"Copiado!" tinham ficado cravados em português, fora do dicionário.
 *
 * POR QUE O DOWNLOAD IMPORTA, E NÃO É SÓ CONVENIÊNCIA
 *   A persona vem buscar esse JSON para colar num ticket, num PR ou no próprio
 *   Role Evaluator. Copiar resolve o caso de colar agora; baixar resolve o de
 *   guardar, anexar e versionar — e evita o truncamento silencioso de quem
 *   seleciona o texto na tela e leva junto só as 12 linhas do preview.
 *
 * DUAS APARÊNCIAS, MESMO COMPORTAMENTO
 *   `header`   — na barra de título do bloco, com rótulo. Entra, Azure e AWS.
 *   `floating` — flutuando sobre o canto do bloco preto, só ícone. GCP,
 *                Workspace e IBM.
 *   As duas existiam antes; unificar a APARÊNCIA seria outra mudança, e não é
 *   esta. O que foi unificado é o comportamento.
 */

/** `Storage Blob Data Contributor` -> `storage-blob-data-contributor`. */
function paraNomeDeArquivo(texto: string): string {
  const limpo = texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return limpo || 'role'
}

export default function JsonActions({
  json, filename, variant = 'header',
}: {
  /** O documento COMPLETO — nunca o recorte do preview. */
  json: string
  /** Base do nome do arquivo, sem extensão. É normalizada aqui. */
  filename: string
  variant?: 'header' | 'floating'
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const copiar = () => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const baixar = () => downloadJson(paraNomeDeArquivo(filename), json)

  if (variant === 'floating') {
    return (
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        <button
          onClick={copiar}
          className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
          title={t('action.copyJson')}
          aria-label={t('action.copyJson')}
        >
          {copied ? <CheckCheck size={13} className="text-fg" /> : <Copy size={13} className="text-fg-subtle" />}
        </button>
        <button
          onClick={baixar}
          className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
          title={t('action.downloadJson')}
          aria-label={t('action.downloadJson')}
        >
          <Download size={13} className="text-fg-subtle" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={copiar}
        className="flex items-center gap-1.5 text-3xs text-fg-subtle hover:text-fg transition-colors"
        title={t('action.copyJson')}
      >
        {copied ? <CheckCheck size={13} className="text-fg" /> : <Copy size={13} />}
        {copied ? t('action.copied') : t('action.copy')}
      </button>
      <button
        onClick={baixar}
        className="flex items-center gap-1.5 text-3xs text-fg-subtle hover:text-fg transition-colors"
        title={t('action.downloadJson')}
      >
        <Download size={13} />
        {t('action.download')}
      </button>
    </div>
  )
}
