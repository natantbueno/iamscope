'use client'

import { Gauge, ShieldAlert, Users, KeyRound } from 'lucide-react'
import AppShell from '@/components/AppShell'
import AssessmentCard from '@/components/AssessmentCard'
import {
  ENTRA_ROLES_COUNT, AZURE_ROLES_COUNT, SOD_RULES_COUNT,
} from '@/data/counts'

/**
 * Página do assessment de tenant.
 *
 * Server Component (page.tsx) só carrega metadata; o conteúdo fica aqui para
 * poder usar hooks — é o mesmo padrão de /sod.
 */
export default function AssessmentClient() {
  return (
    <AppShell
      headerTitle="Assessment do Tenant"
      headerSub="Avalie o risco de identidade e acesso do seu ambiente Entra ID + Azure RBAC"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl space-y-5">

          <AssessmentCard
            entraRoles={ENTRA_ROLES_COUNT}
            azureRoles={AZURE_ROLES_COUNT}
            sodRules={SOD_RULES_COUNT}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Users size={15} />, titulo: 'Inventário de identidades',
                texto: 'Usuários, service principals, managed identities e grupos com role atribuída — inclusive acesso herdado de grupo aninhado e elegibilidade via PIM.' },
              { icon: <ShieldAlert size={15} />, titulo: 'Achados objetivos',
                texto: 'Cada achado aponta um fato verificável no ambiente, com a recomendação correspondente. Nada de alerta genérico.' },
              { icon: <Gauge size={15} />, titulo: 'Score auditável',
                texto: 'Nota de 0 a 100 com o desconto de cada achado exposto no relatório. Sem caixa-preta.' },
            ].map((c) => (
              <div key={c.titulo}
                className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-brand mb-2">{c.icon}
                  <p className="text-tiny font-semibold text-gray-800 dark:text-gray-100">{c.titulo}</p>
                </div>
                <p className="text-tiny text-fg-muted leading-relaxed">{c.texto}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound size={14} className="text-fg-subtle" />
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300">
                Por que rodar localmente
              </h2>
            </div>
            <p className="text-tiny text-fg-muted leading-relaxed">
              O IAM Scope não coleta nem armazena dado nenhum do seu ambiente. O script roda na sua
              máquina, autentica com a sua própria conta e grava os relatórios localmente. O catálogo
              de roles vai junto como arquivo, então a análise funciona inclusive sem acesso à internet
              depois do download.
            </p>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
