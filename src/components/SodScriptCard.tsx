'use client'

import { useState } from 'react'
import { Download, Terminal, ShieldCheck, ChevronDown, Copy, CheckCheck } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'

/**
 * Bloco de download do script de análise SoD.
 *
 * O script roda no tenant do próprio usuário e é somente leitura. Este card
 * precisa deixar isso explícito ANTES do download: pedir para alguém rodar um
 * .ps1 baixado da internet num tenant corporativo exige dizer com clareza o
 * que ele faz, quais permissões pede e o que NÃO faz.
 */

const SCRIPT = '/tools/Invoke-IAMScopeSoDAnalysis.ps1'
const RULES = '/sod-rules.json'

const QUICK_START = `# 1. Módulos (uma vez)
Install-Module Microsoft.Graph.Authentication,Microsoft.Graph.Identity.Governance -Scope CurrentUser
Install-Module Az.Accounts,Az.Resources -Scope CurrentUser   # só para Azure RBAC
Install-Module ImportExcel -Scope CurrentUser                # opcional, gera o .xlsx

# 2. Rodar
.\\Invoke-IAMScopeSoDAnalysis.ps1`

export default function SodScriptCard({ ruleCount }: { ruleCount: number }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(QUICK_START)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Terminal size={18} className="text-csp-gcp-onLight dark:text-csp-gcp-onDark mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-note font-semibold text-gray-800 dark:text-gray-100">
              {t('sods.title')}
            </h2>
            <p className="text-tiny text-fg-muted mt-1 leading-relaxed">
              {t('sods.introA')} {ruleCount} {t('sods.introB')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <a
            href={SCRIPT}
            download
            className="inline-flex items-center gap-2 text-tiny font-medium px-3 py-1.5 rounded-lg
                       bg-csp-gcp text-white hover:bg-[#0c8248] transition-colors"
          >
            <Download size={13} /> {t('sods.download')}
          </a>
          <a
            href={RULES}
            download
            className="inline-flex items-center gap-2 text-tiny px-3 py-1.5 rounded-lg border
                       border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={13} /> {t('sods.rules')}
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1.5 text-tiny px-3 py-1.5 rounded-lg border
                       border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('sods.howTo')}
            <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>

        <div className="flex items-start gap-2 mt-4 rounded-lg border border-emerald-200 dark:border-emerald-900
                        bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-3xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
            <Rich text={t('sods.readOnly')} />
          </p>
        </div>
      </div>

      {open && (
        <div className="border-t border-surface-border dark:border-gray-800 p-5 bg-gray-50/60 dark:bg-gray-950/40 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium">{t('sods.quickStart')}</p>
              <button onClick={copy} className="text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300">
                {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
              </button>
            </div>
            <pre className="bg-black rounded-lg p-3 overflow-x-auto">
              <code className="text-3xs font-mono text-fg-muted whitespace-pre">{QUICK_START}</code>
            </pre>
            <p className="text-3xs text-fg-muted mt-2">
              <Rich text={t('sods.requires')} />
            </p>
          </div>

          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium mb-1.5">{t('sods.produces')}</p>
            <ul className="text-tiny text-fg-muted space-y-1">
              <li><Rich text={t('sods.outExcel')} /></li>
              <li><Rich text={t('sods.outHtml')} /></li>
              <li><Rich text={t('sods.outCsv')} /></li>
            </ul>
          </div>

          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium mb-1.5">{t('sods.options')}</p>
            <ul className="text-tiny text-fg-muted space-y-1 font-mono">
              <li><span className="text-csp-gcp-onLight dark:text-csp-gcp-onDark">-Scope EntraId</span> <span className="font-sans text-fg-subtle">{t('sods.optScope')}</span></li>
              <li><span className="text-csp-gcp-onLight dark:text-csp-gcp-onDark">-ExcludePim</span> <span className="font-sans text-fg-subtle">{t('sods.optPim')}</span></li>
              <li><span className="text-csp-gcp-onLight dark:text-csp-gcp-onDark">-ExcludeGroups</span> <span className="font-sans text-fg-subtle">{t('sods.optGroups')}</span></li>
              <li><span className="text-csp-gcp-onLight dark:text-csp-gcp-onDark">-RulesPath .\sod-rules.json</span> <span className="font-sans text-fg-subtle">{t('sods.optRules')}</span></li>
            </ul>
          </div>

          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium mb-1.5">{t('sods.limits')}</p>
            <p className="text-tiny text-fg-muted leading-relaxed">
              {t('sods.limitsBody')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
