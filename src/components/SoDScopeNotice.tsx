'use client'

import { Info } from 'lucide-react'
import { useT } from '@/i18n/LanguageProvider'

/**
 * Aviso de escopo do SoD Analyzer.
 *
 * POR QUE EXISTE
 *   Duas coisas se parecem na tela e não são a mesma: "não há conflito entre
 *   estas duas roles" e "não há regra que cubra estas duas roles". Sem dizer o
 *   escopo, a ferramenta responde a segunda e o usuário lê a primeira.
 *
 *   Em 07/08/2026 o aviso servia para dizer que só Microsoft estava coberta.
 *   Com AWS, GCP e Google Workspace no catálogo, o buraco mudou de lugar — mas
 *   não sumiu, e o aviso continua sendo o que separa ausência de achado de
 *   ausência de cobertura:
 *
 *     1. IBM Cloud está fora. O IAM da IBM tem sete roles genéricas e o SoD
 *        real dela vive em 71 permissões da infraestrutura clássica, que não
 *        são roles — o modelo "regra = par de roles" não as representa.
 *     2. Nenhuma regra cruza PROVEDORES. Acumular AdministratorAccess na AWS
 *        e Global Administrator no Entra ID não gera conflito aqui, e isso é
 *        decisão de modelagem, não lacuna: não existe caminho técnico entre os
 *        dois, e as mitigações não se encontram. Cruzamento só dentro do
 *        provedor — Entra ID ↔ Azure RBAC e GCP ↔ Google Workspace.
 *
 * SEM COR DECORATIVA
 *   Não é erro nem alerta: é a delimitação permanente do que a ferramenta faz.
 *   Usa os tokens neutros de superfície, como qualquer texto de apoio do site,
 *   e não a paleta de severidade.
 */
export default function SoDScopeNotice({
  platformCount, crossCloudCount,
}: { platformCount: number; crossCloudCount: number }) {
  const t = useT()
  return (
    <div className="px-4 py-2.5 border-b border-surface-border dark:border-gray-800 bg-surface-faint dark:bg-gray-800/40 shrink-0">
      <div className="flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
        <p className="text-2xs text-fg-muted leading-relaxed">
          <span className="font-semibold text-fg">
            {t('sod.scopeTitle')} {platformCount} {t('sod.scopePlatforms')}
          </span>{' '}
          Entra ID, Azure RBAC, AWS IAM, GCP IAM, Google Workspace.{' '}
          {t('sod.scopeIbm')}{' '}
          <span className="text-fg-subtle">
            {t('sod.scopeCrossA')} {crossCloudCount} {t('sod.scopeCrossB')}
          </span>
        </p>
      </div>
    </div>
  )
}
