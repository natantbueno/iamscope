'use client'

// Botão de exportação genérico e reutilizável — padronizado no mesmo modelo do
// ExportMenu.tsx usado nas páginas do Entra ID / Azure RBAC: dropdown com
// Excel (.xls), CSV e JSON, 100% client-side (sem backend, compatível com
// `output: 'export'`), a partir dos dados atualmente visíveis/filtrados na
// página que o utiliza.
import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, FileJson, ChevronDown } from 'lucide-react'
import { exportGenericCSV, exportGenericExcel, exportGenericJSON } from '@/lib/export'

interface ExportButtonProps {
  /** Linhas a exportar — normalmente o array já filtrado/ordenado exibido na tabela. */
  data: Record<string, unknown>[]
  /** Nome do arquivo (sem extensão — cada formato adiciona a sua). */
  filename: string
  /** Texto do botão-gatilho. */
  label?: string
  /** Rótulo da seção dentro do menu — se omitido, é derivado do filename. */
  title?: string
  /**
   * Classe extra aplicada ao wrapper (apenas posicionamento no layout, ex.: "ml-auto").
   * O botão-gatilho em si mantém sempre o mesmo estilo padrão (modelo Entra ID),
   * para consistência visual em todas as páginas do site.
   */
  wrapperClassName?: string
}

const ACRONYMS = new Set(['aws', 'gcp', 'oci', 'ibm', 'gws', 'sod', 'pim', 'api', 'iam', 'scp'])

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.(csv|json|xls)$/i, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

export default function ExportButton({ data, filename, label = 'Exportar', title, wrapperClassName }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const disabled = data.length === 0
  const sectionTitle = title ?? titleFromFilename(filename)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const run = (fn: () => void) => { fn(); setOpen(false) }

  return (
    <div className={`relative${wrapperClassName ? ` ${wrapperClassName}` : ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        title="Exportar dados visíveis"
        className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-[#dde3ec] dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        <Download size={13} />
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-700 rounded-lg shadow-lg z-50 py-1.5">
          <MenuLabel>{sectionTitle}</MenuLabel>
          <MenuItem icon={<FileSpreadsheet size={14} className="text-green-600" />} onClick={() => run(() => exportGenericExcel(filename, data, sectionTitle))}>
            Excel (.xls)
          </MenuItem>
          <MenuItem icon={<FileText size={14} className="text-blue-600" />} onClick={() => run(() => exportGenericCSV(filename, data))}>
            CSV
          </MenuItem>
          <MenuItem icon={<FileJson size={14} className="text-amber-600" />} onClick={() => run(() => exportGenericJSON(filename, data))}>
            JSON
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-1">
      {children}
    </p>
  )
}

function MenuItem({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
    >
      {icon}
      {children}
    </button>
  )
}
