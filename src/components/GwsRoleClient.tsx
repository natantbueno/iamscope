'use client'

import { useState } from 'react'
import { KPI_TONE_VALUE } from '@/lib/kpiTone'
import RoleDetailHeader, { BackToList, roleDetailSub } from './RoleDetailHeader'
import { CLOUD_META } from '@/data/compare/types'
import { useT } from '@/i18n/LanguageProvider'
import Link from 'next/link'
import { ShieldAlert, Hash, Tag, Layers, CheckSquare, Copy, CheckCheck, Code, ChevronDown } from 'lucide-react'
import JsonActions from './JsonActions'
import { GWS_ROLES, GWS_TIER_META } from '@/data/googleWorkspace'
import AppShell from '@/components/AppShell'
import PermissionsTable from '@/components/PermissionsTable'

export default function GwsRoleClient({ slug }: { slug: string }) {
  const t = useT()
  const role = GWS_ROLES.find((r) => r.slug === slug)

  if (!role) {
    return (
      <AppShell headerTitle={t('label.roleNotFound')} headerSub="Google Workspace">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-fg-subtle">{t('label.roleNotFoundDot')}{' '}
            <Link href="/google-workspace/roles" className="text-success-fg underline">{t('action.back')}</Link>
          </p>
        </div>
      </AppShell>
    )
  }

  const meta = GWS_TIER_META[role.tier]

  const [jsonExpanded, setJsonExpanded] = useState(false)


  const roleJson = JSON.stringify({
    roleId: role.slug,
    roleName: role.name,
    roleDescription: role.description,
    rolePrivileges: (role.apiPrivileges || []).map(p => ({
      privilegeName: p,
      serviceId: 'admin.googleapis.com',
    })),
    isSystemRole: true,
  }, null, 2)

  const jsonLines = roleJson.split('\n')
  const visibleJson = jsonExpanded ? roleJson : jsonLines.slice(0, 12).join('\n')

  return (
    <AppShell
      headerTitle={role.name}
      headerSub={roleDetailSub(CLOUD_META.googleWorkspace.label, role.category, meta.label)}
      headerBack={<BackToList href="/google-workspace/roles" />}
      pageHasOwnHeading
    >
      <div className="flex-1 overflow-y-auto bg-app">
      <div className="max-w-5xl px-4 sm:px-6 py-6">

        <RoleDetailHeader

          syncPlatform={'Google Workspace'}
          name={role.name}
          tier={{ label: meta.label, color: meta.textColor, bg: meta.textColor + '18',
                  darkColor: meta.darkText, darkBg: meta.darkBg, description: meta.description }}
          category={role.category}
          isPrivileged={role.isPrivileged}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          <StatCard icon={<Layers size={13} />}      label="Admin Tier"   accent={KPI_TONE_VALUE.neutral}>
            <span className="text-sub font-bold" style={{ color: meta.darkText }}>{meta.short}</span>
          </StatCard>
          <StatCard icon={<Tag size={13} />}         label={t('table.category')}    accent={KPI_TONE_VALUE.neutral}>
            <span className="text-base font-bold text-[#93c5fd]">{role.category}</span>
          </StatCard>
          <StatCard icon={<CheckSquare size={13} />} label={t('label.privileges')}  accent={KPI_TONE_VALUE.accent}>
            <span className="text-stat font-bold text-success-fg">{role.privileges.length}</span>
          </StatCard>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-6">
          <FactCard icon={<Hash size={14} />} label="Slug / ID">
            <code className="font-mono text-3xs text-fg-muted break-all">{role.slug}</code>
          </FactCard>
          <FactCard icon={<Tag size={14} />} label={t('table.category')}>
            <span className="text-body text-fg">{role.category}</span>
          </FactCard>
        </div>

        {/* Tier explainer */}
        <section className="rounded-lg p-4 border mb-6"
          style={{ background: meta.darkBg, borderColor: meta.darkText + '30' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Layers size={15} style={{ color: meta.darkText }} />
            <span className="text-body font-semibold" style={{ color: meta.darkText }}>
              Admin Tier: {meta.label}
            </span>
          </div>
          <p className="text-tiny leading-relaxed" style={{ color: meta.darkText }}>
            {meta.description}
          </p>
        </section>

        {/* Description */}
        <section className="bg-surface border border-line rounded-lg p-5 mb-6">
          <h2 className="text-note font-semibold text-fg mb-2">{t('table.description')}</h2>
          <p className="text-body text-fg-muted leading-relaxed">{role.description}</p>
        </section>

        {/* Privileges */}
        <section className="bg-surface border border-line rounded-lg p-5 mb-6">
          <h2 className="text-note font-semibold text-fg mb-4">
            {t('label.privileges')} <span className="text-tiny font-normal text-fg-muted ml-2">({role.privileges.length})</span>
          </h2>
          <div className="space-y-1.5">
            {role.privileges.map((priv) => (
              <div key={priv} className="flex items-center gap-2.5 px-3 py-2 rounded bg-surface-alt border border-line-strong">
                <CheckSquare size={12} className="text-success-fg shrink-0" />
                <span className="text-tiny text-fg">{priv}</span>
              </div>
            ))}
          </div>
        </section>

        {/*
          API Privileges — lacuna declarada.

          O Google publica os privilegeName de apenas duas roles pré-construídas
          (_SEED_ADMIN_ROLE e _GROUPS_ADMIN_ROLE). Para as outras 12 a lista só
          existe via privileges.list do Admin SDK, que exige OAuth no tenant.
          Mostrar seção vazia sugeriria "esta role não tem privilégio de API",
          o que é falso — por isso o aviso explícito.
        */}
        {(!role.apiPrivileges || role.apiPrivileges.length === 0) && (
          <section className="bg-surface border border-line rounded-lg p-5 mb-6">
            <h2 className="text-note font-semibold text-fg mb-3 flex items-center gap-2">
              <Code size={13} className="text-fg-subtle" />
              API Privileges
            </h2>
            <p className="text-tiny text-fg-muted leading-relaxed">
              O Google não publica os nomes de privilégio da API desta role. Eles só podem ser
              obtidos com <code className="font-mono text-3xs">privileges.list</code> do Admin SDK,
              autenticado no seu próprio tenant. Preferimos declarar a lacuna a preencher com
              suposição.
            </p>
          </section>
        )}

        {role.apiPrivileges && role.apiPrivileges.length > 0 && (
          <section className="bg-surface border border-line rounded-lg p-5 mb-6">
            <h2 className="text-note font-semibold text-fg mb-3">
              <span className="flex items-center gap-2">
                <Code size={13} className="text-success-fg" />
                API Privileges
                <span className="text-tiny font-normal text-fg-muted">({role.apiPrivileges.length})</span>
              </span>
            </h2>
            {role.apiPrivilegesComplete === false && (
              <p className="text-3xs text-amber-600 dark:text-amber-400 mb-3">
                Lista parcial: a documentação do Google mostra esta role truncada. Há mais
                privilégios além dos exibidos.
              </p>
            )}
            <PermissionsTable
              rows={(role.apiPrivileges ?? []).map((priv) => {
                const i = priv.indexOf('_')
                return {
                  permission: priv,
                  area: i === -1 ? priv : priv.substring(0, i),
                  operation: i === -1 ? '' : priv.substring(i + 1).replace(/_/g, ' '),
                }
              })}
              columns={[
                { key: 'permission', label: 'API Privilege' },
                { key: 'area',       label: t('table.area'), badge: true, width: 'w-36' },
                { key: 'operation',  label: t('table.operation'), width: 'w-48' },
              ]}
              filterKey="area"
              filename={`google-workspace-${role.slug}-privileges`}
              noun="noun.privileges"
              searchPlaceholder="ph.filterPrivileges"
            />
          </section>
        )}

        {/* Role Definition (JSON) */}
        <section className="bg-surface border border-line rounded-lg p-5 mb-6">
          <h2 className="text-note font-semibold text-fg mb-3">
            Role Definition (JSON)
          </h2>
          <div className="relative">
            <JsonActions json={roleJson} filename={`google-workspace-role-${role.name}`} variant="floating" />
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
                className="mt-2 flex items-center gap-1 text-3xs text-success-fg hover:underline"
              >
                <ChevronDown size={12} className={jsonExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                {jsonExpanded ? t('action.showLess') : `${t('action.showAllLines')} (${jsonLines.length} ${t('noun.lines')})`}
              </button>
            )}
          </div>
        </section>

        {/* Docs link */}
        <a href="https://developers.google.com/workspace/admin/roles" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-body text-success-fg hover:underline mb-8">
          Ver documentação oficial no Google Workspace Admin SDK
        </a>

      </div>
      </div>
    </AppShell>
  )
}

function FactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 text-fg-muted mb-1.5">
        {icon}
        <span className="text-2xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}

function StatCard({ icon, label, accent, children }: { icon: React.ReactNode; label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: accent }}>
        {icon}
        <span className="text-2xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}
