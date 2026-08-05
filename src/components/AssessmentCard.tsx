'use client'

import { useState } from 'react'
import { Download, Terminal, ShieldCheck, ChevronDown, Copy, CheckCheck, Gauge } from 'lucide-react'

/**
 * Bloco de download do assessment de tenant.
 *
 * Pedir para alguém rodar um .ps1 baixado da internet contra o tenant
 * corporativo exige dizer, ANTES do download, o que ele faz, o que pede de
 * permissão e o que não faz. Por isso o aviso de somente-leitura fica acima do
 * conteúdo expansível, não escondido dentro dele.
 */

const SCRIPT = '/tools/Invoke-IAMScopeAssessment.ps1'
const CATALOG = '/iamscope-catalog.json'

const QUICK = `# 1. Módulos (uma vez)
Install-Module Microsoft.Graph.Authentication,Microsoft.Graph.Identity.Governance -Scope CurrentUser
Install-Module Az.Accounts,Az.Resources -Scope CurrentUser   # NECESSARIO para a parte de Azure RBAC
Install-Module ImportExcel -Scope CurrentUser                # opcional, gera o .xlsx

# 2. Rodar (pergunta o Tenant ID na execução)
.\\Invoke-IAMScopeAssessment.ps1`

export default function AssessmentCard({ entraRoles, azureRoles, sodRules }: {
  entraRoles: number; azureRoles: number; sodRules: number
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(QUICK)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Gauge size={18} className="text-brand mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-note font-semibold text-gray-800 dark:text-gray-100">
              Assessment do seu tenant
            </h2>
            <p className="text-tiny text-fg-muted mt-1 leading-relaxed">
              Script PowerShell que lê as atribuições reais do seu Entra ID e Azure RBAC, cruza com
              as {entraRoles} roles do Entra, {azureRoles} do Azure e as {sodRules} regras de SoD
              deste catálogo, e devolve um retrato do risco do ambiente com Excel, dashboard HTML
              e CSV.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <a href={SCRIPT} download
            className="inline-flex items-center gap-2 text-tiny font-medium px-3 py-1.5 rounded-lg
                       bg-brand text-white hover:bg-brand-hover transition-colors">
            <Download size={13} /> Baixar o script (.ps1)
          </a>
          <a href={CATALOG} download
            className="inline-flex items-center gap-2 text-tiny px-3 py-1.5 rounded-lg border
                       border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={13} /> Catálogo (.json)
          </a>
          <button onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1.5 text-tiny px-3 py-1.5 rounded-lg border
                       border-surface-border dark:border-gray-700 text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Como usar
            <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>

        <div className="flex items-start gap-2 mt-4 rounded-lg border border-emerald-200 dark:border-emerald-900
                        bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-3xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
            <strong>Somente leitura.</strong> Não cria, altera nem remove nada. Autentica com a sua
            conta usando escopos de leitura (<code className="font-mono">Directory.Read.All</code>,{' '}
            <code className="font-mono">RoleManagement.Read.Directory</code>,{' '}
            <code className="font-mono">Application.Read.All</code>). Nenhum dado sai da sua
            máquina — os relatórios são gravados localmente.
          </p>
        </div>
      </div>

      {open && (
        <div className="border-t border-surface-border dark:border-gray-800 p-5 bg-gray-50/60 dark:bg-gray-950/40 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium">Início rápido</p>
              <button onClick={copy} className="text-fg-subtle hover:text-gray-600 dark:hover:text-gray-300">
                {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
              </button>
            </div>
            <pre className="bg-black rounded-lg p-3 overflow-x-auto">
              <code className="text-3xs font-mono text-fg-muted whitespace-pre">{QUICK}</code>
            </pre>
            <p className="text-3xs text-fg-muted mt-2">
              Requer PowerShell 7+. Deixe o <code className="font-mono">iamscope-catalog.json</code> na
              mesma pasta do script. Sem o módulo <code className="font-mono">ImportExcel</code> o
              relatório continua saindo, em CSV no lugar do .xlsx.
            </p>
            <p className="text-3xs text-fg-muted mt-1.5">
              O dashboard HTML abre com três abas: <strong>Visão geral</strong>, <strong>Entra ID</strong>{' '}
              e <strong>Azure RBAC</strong>. A aba escolhida entra no endereço, então dá para mandar o
              link já aberto na cloud certa.
            </p>
            <p className="text-3xs text-amber-600 dark:text-amber-400 mt-1.5">
              Já <code className="font-mono">Az.Accounts</code> e <code className="font-mono">Az.Resources</code> não
              são opcionais: sem eles o script roda só o Entra ID e o Azure RBAC fica de fora. O
              relatório declara isso na linha <em>Cobertura Azure RBAC</em> — confira antes de tratar
              o score como final.
            </p>
          </div>

          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium mb-1.5">O que ele avalia</p>
            <ul className="text-tiny text-fg-muted space-y-1">
              <li><strong>Inventário</strong> — usuários, service principals, managed identities e grupos com role atribuída.</li>
              <li><strong>Tier</strong> — cada atribuição classificada em Tier 0/1/2 do Enterprise Access Model.</li>
              <li><strong>Achados</strong> — excesso de Global Admins, Tier 0 permanente sem PIM, managed identity privilegiada, credencial de aplicação vencida, conta desabilitada ainda com role.</li>
              <li><strong>Segregação de funções</strong> — as {sodRules} regras aplicadas às atribuições reais.</li>
              <li><strong>Score de risco</strong> — nota de 0 a 100 com o desconto de cada achado visível, para a nota ser auditável.</li>
            </ul>
          </div>

          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium mb-1.5">Opções úteis</p>
            <ul className="text-tiny text-fg-muted space-y-1 font-mono">
              <li><span className="text-brand">-TenantId contoso.onmicrosoft.com</span> <span className="font-sans text-fg-subtle">— evita a pergunta interativa</span></li>
              <li><span className="text-brand">-Scope EntraId</span> <span className="font-sans text-fg-subtle">— pula Azure RBAC, bem mais rápido</span></li>
              <li><span className="text-brand">-ExcludePim</span> <span className="font-sans text-fg-subtle">— ignora elegibilidades (só se o tenant não usa PIM)</span></li>
              <li><span className="text-brand">-StaleCredentialDays 180</span> <span className="font-sans text-fg-subtle">— endurece o critério de credencial antiga</span></li>
            </ul>
          </div>

          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-subtle font-medium mb-1.5">O que ele não faz</p>
            <p className="text-tiny text-fg-muted leading-relaxed">
              Não avalia Conditional Access, políticas de MFA, workflows de aprovação do PIM nem
              administrative units. Não inspeciona custom roles — elas aparecem listadas, mas sem
              classificação de tier. O score e a classificação de tier são <strong>editoriais do
              IAM Scope</strong>, derivados das permissões oficiais de cada role; não são
              classificação da Microsoft, e um achado aponta acúmulo de acesso, não incidente.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
