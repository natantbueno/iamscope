'use client'

import { useState } from 'react'
import RoleDetailHeader, { BackToList, roleDetailSub } from './RoleDetailHeader'
import { CLOUD_META } from '@/data/compare/types'
import { useT } from '@/i18n/LanguageProvider'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckSquare, ShieldAlert, ChevronRight, Copy, CheckCheck, Code, ChevronDown } from 'lucide-react'
import JsonActions from './JsonActions'
import AppShell from '@/components/AppShell'
import { IBM_ROLES, IBM_TIER_META } from '@/data/ibmCloud'
import PermissionsTable from '@/components/PermissionsTable'

// Nível 3: a cor por categoria saiu. Eram 9 hex escritos à mão para dizer
// "esta categoria é diferente daquela" — coisa que o nome já diz, e que colidia
// com a escada de tier na mesma página. O ícone e o rótulo ficam.
const CATEGORY_TINT = 'rgb(var(--c-fg-subtle))'

export default function IbmCloudRoleClient({ slug }: { slug: string }) {
  const t = useT()
  const role = IBM_ROLES.find(r => r.slug === slug)
  if (!role) return notFound()

  const [jsonExpanded, setJsonExpanded] = useState(false)

  const tier = IBM_TIER_META[role.tier]
  const catColor = CATEGORY_TINT


  const roleJson = JSON.stringify({
    display_name: role.name,
    description: role.description,
    actions: role.actions || [],
    crn: `crn:v1:bluemix:public:iam::::role:${role.slug}`,
    account_id: '*',
  }, null, 2)

  const jsonLines = roleJson.split('\n')
  const visibleJson = jsonExpanded ? roleJson : jsonLines.slice(0, 12).join('\n')

  return (
    <AppShell
      headerTitle={role.name}
      headerSub={roleDetailSub(CLOUD_META.ibmCloud.label, role.category, tier.label)}
      headerBack={<BackToList href="/ibm-cloud/roles" />}
      pageHasOwnHeading
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-5xl space-y-5">

          <RoleDetailHeader

            syncPlatform={'IBM Cloud'}
            name={role.name}
            tier={{ label: tier.label, color: tier.color, bg: tier.bg, description: tier.description }}
            categoryBadge={
              <span className="inline-flex items-center text-3xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: catColor + '18', color: catColor }}>{role.category}</span>
            }
            isPrivileged={role.isPrivileged}
          />

          {/* Stat card — sobrou só o que é próprio da IBM: platform ou service role. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
              <div className="text-2xs text-fg-subtle uppercase tracking-wider mb-1">{t('table.type')}</div>
              <div className="text-body font-semibold text-gray-700 dark:text-gray-300 capitalize">{role.kind}</div>
            </div>
          </div>

          {/* Privileged warning */}
          {role.isPrivileged && (
            <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <ShieldAlert size={14} className="text-danger mt-0.5 shrink-0" />
              <p className="text-tiny text-danger leading-relaxed">
                Esta é uma role <strong>privilegiada</strong> — concede capacidades de controle elevado. Aplique o princípio do menor privilégio e monitore o uso via Activity Tracker.
              </p>
            </div>
          )}

          {/* Tier explainer */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300">{tier.label}</h2>
            </div>
            <p className="text-tiny text-fg-muted leading-relaxed">{tier.description}</p>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('table.description')}</h2>
            <p className="text-body text-fg-muted leading-relaxed">{role.description}</p>
          </div>

          {/*
            Actions: lacuna declarada.

            A IBM NÃO publica lista de ação por role — cada serviço mapeia as
            próprias ações para essas 7 roles. Mostrar seção vazia sugeriria
            "esta role não faz nada"; o dataset anterior preenchia isso com
            prosa em português escrita por nós, que era pior.
          */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('table.actions')}</h2>
            <p className="text-tiny text-fg-muted leading-relaxed">{t('ibm.noActionsNote')}</p>
          </div>

          {/* Role Definition (JSON) */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Role Definition (JSON)
            </h2>
            <div className="relative">
              <JsonActions json={roleJson} filename={`ibm-cloud-role-${role.name}`} variant="floating" />
              <pre className="bg-black dark:bg-black rounded-lg p-4 border border-line overflow-x-auto">
                <code className="text-3xs font-mono text-fg-muted" dangerouslySetInnerHTML={{ __html: visibleJson
                  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
                  .replace(/: "(.*?)"/g, ': <span class="text-green-400">"$1"</span>')
                  .replace(/: (true|false)/g, ': <span class="text-yellow-400">$1</span>')
                  .replace(/[\{\}\[\]]/g, '<span class="text-fg-subtle">$&</span>')
                }} />
              </pre>
              {jsonLines.length > 12 && (
                <button
                  onClick={() => setJsonExpanded(!jsonExpanded)}
                  className="mt-2 flex items-center gap-1 text-3xs text-csp-ibm-onLight dark:text-csp-ibm-onDark hover:underline"
                >
                  <ChevronDown size={12} className={jsonExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  {jsonExpanded ? t('action.showLess') : `${t('action.showAllLines')} (${jsonLines.length} ${t('noun.lines')})`}
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-end">
            <Link href="/ibm-cloud/reference"
              className="inline-flex items-center gap-1.5 text-tiny text-fg-subtle hover:text-csp-ibm dark:hover:text-csp-ibm-onDark transition-colors">
              Reference <ChevronRight size={13} />
            </Link>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
