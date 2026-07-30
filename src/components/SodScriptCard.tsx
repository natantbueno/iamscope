'use client'

import { useState } from 'react'
import { Download, Terminal, ShieldCheck, ChevronDown, Copy, CheckCheck } from 'lucide-react'

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
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(QUICK_START)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Terminal size={18} className="text-[#0f9d58] mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100">
              Rodar a análise no seu tenant
            </h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Script PowerShell que aplica estas {ruleCount} regras às atribuições reais do seu
              ambiente e gera Excel, dashboard HTML e CSV. Considera atribuições ativas,
              elegíveis via PIM e herdadas de grupos, no Entra ID e no Azure RBAC.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <a
            href={SCRIPT}
            download
            className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg
                       bg-[#0f9d58] text-white hover:bg-[#0c8248] transition-colors"
          >
            <Download size={13} /> Baixar o script (.ps1)
          </a>
          <a
            href={RULES}
            download
            className="inline-flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-lg border
                       border-[#dde3ec] dark:border-gray-700 text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={13} /> Catálogo de regras (.json)
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border
                       border-[#dde3ec] dark:border-gray-700 text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Como usar
            <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>

        <div className="flex items-start gap-2 mt-4 rounded-lg border border-emerald-200 dark:border-emerald-900
                        bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
            <strong>Somente leitura.</strong> O script não cria, altera nem remove nada. Autentica com a
            sua própria conta, com escopos de leitura (<code className="font-mono">Directory.Read.All</code>,{' '}
            <code className="font-mono">RoleManagement.Read.Directory</code>). Nenhum dado sai da sua
            máquina — os relatórios são gravados localmente.
          </p>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#dde3ec] dark:border-gray-800 p-5 bg-gray-50/60 dark:bg-gray-950/40 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Início rápido</p>
              <button onClick={copy} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
              </button>
            </div>
            <pre className="bg-black rounded-lg p-3 overflow-x-auto">
              <code className="text-[11px] font-mono text-gray-300 whitespace-pre">{QUICK_START}</code>
            </pre>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
              Requer PowerShell 7 ou superior. Sem o módulo{' '}
              <code className="font-mono">ImportExcel</code> o script segue funcionando e gera CSV no
              lugar do .xlsx.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">O que ele gera</p>
            <ul className="text-[12px] text-gray-600 dark:text-gray-400 space-y-1">
              <li><strong>Excel</strong> — abas de Resumo, Achados, Catálogo de Regras e Atribuições brutas.</li>
              <li><strong>Dashboard HTML</strong> — gráficos, filtro por severidade, busca e tabela expansível. Arquivo único, abre sem internet.</li>
              <li><strong>CSV</strong> — sempre gerado, independe de módulo extra.</li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">Opções úteis</p>
            <ul className="text-[12px] text-gray-600 dark:text-gray-400 space-y-1 font-mono">
              <li><span className="text-[#0f9d58]">-Scope EntraId</span> <span className="font-sans text-gray-400">— pula Azure RBAC, bem mais rápido</span></li>
              <li><span className="text-[#0f9d58]">-ExcludePim</span> <span className="font-sans text-gray-400">— ignora elegibilidades (só se o tenant não usa PIM)</span></li>
              <li><span className="text-[#0f9d58]">-ExcludeGroups</span> <span className="font-sans text-gray-400">— não expande grupos; mais rápido, porém subestima o risco</span></li>
              <li><span className="text-[#0f9d58]">-RulesPath .\sod-rules.json</span> <span className="font-sans text-gray-400">— usa o catálogo local em vez de baixar</span></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">O que ele não faz</p>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Não avalia Conditional Access, PIM approval workflows, escopos administrativos
              (administrative units) nem custom roles fora do catálogo. Um achado aponta acúmulo de
              papéis conflitantes — cabe a você julgar se há mitigação compensatória no ambiente.
              A severidade é classificação editorial do IAM Scope, não da Microsoft.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
