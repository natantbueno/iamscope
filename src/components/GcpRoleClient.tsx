'use client'

import { useState, useEffect } from 'react'
import RoleDetailHeader, { BackToList, roleDetailSub } from './RoleDetailHeader'
import { CLOUD_META } from '@/data/compare/types'
import { useT } from '@/i18n/LanguageProvider'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckSquare, ShieldAlert, ChevronRight, Globe, Copy, CheckCheck, Code, ChevronDown } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { GCP_ROLES, GCP_TIER_META } from '@/data/gcp'
import { getGcpRolePermissions } from '@/lib/gcpPermissions'
import PermissionsTable from '@/components/PermissionsTable'
import { useNumberFormat } from '@/i18n/useNumberFormat'

// Nível 3: a cor por categoria saiu. Eram 14 hex escritos à mão para dizer
// "esta categoria é diferente daquela" — coisa que o nome já diz, e que colidia
// com a escada de tier na mesma página. O ícone e o rótulo ficam.
const CATEGORY_TINT = 'rgb(var(--c-fg-subtle))'

export default function GcpRoleClient({ slug }: { slug: string }) {
  const t = useT()
  const fmt = useNumberFormat()
  const role = GCP_ROLES.find(r => r.slug === slug)
  if (!role) return notFound()

  const tier     = GCP_TIER_META[role.tier]
  const catColor = CATEGORY_TINT

  // Related roles: same category, different slug, up to 5
  const related = GCP_ROLES
    .filter(r => r.category === role.category && r.slug !== role.slug)
    .slice(0, 5)

  const [jsonExpanded, setJsonExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // As permissões vivem em public/gcp-perms/<slug>.json (fora do bundle).
  const [permissions, setPermissions] = useState<string[] | null>(null)
  const [permsError, setPermsError] = useState(false)

  useEffect(() => {
    let alive = true
    if (role.permissionCount === 0) { setPermissions([]); return }
    setPermissions(null)
    setPermsError(false)
    getGcpRolePermissions(role.slug)
      .then((p) => { if (alive) setPermissions(p) })
      .catch(() => { if (alive) setPermsError(true) })
    return () => { alive = false }
  }, [role.slug, role.permissionCount])

  const roleJson = JSON.stringify({
    name: role.roleId,
    title: role.name,
    description: role.description,
    stage: role.stage ?? 'GA',
    includedPermissions: permissions ?? [],
  }, null, 2)

  const jsonLines = roleJson.split('\n')
  const visibleJson = jsonExpanded ? roleJson : jsonLines.slice(0, 12).join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(roleJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell
      headerTitle={role.name}
      headerSub={roleDetailSub(CLOUD_META.gcp.label, role.category, tier.label)}
      headerBack={<BackToList href="/gcp/roles" />}
      pageHasOwnHeading
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl space-y-5">

          <RoleDetailHeader

            syncPlatform={'GCP IAM'}
            name={role.name}
            tier={{ label: tier.label, color: tier.color, bg: tier.bg, description: tier.description }}
            categoryBadge={
              <span className="inline-flex items-center text-3xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: catColor + '18', color: catColor }}>{role.category}</span>
            }
            isPrivileged={role.isPrivileged}
          />

          {/* Stat cards row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
              <div className="text-2xs text-fg-subtle uppercase tracking-wider mb-1.5">{t('table.scope')}</div>
              <div className="text-tiny font-semibold text-gray-700 dark:text-gray-300 capitalize">{role.scope}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-4">
              <div className="text-2xs text-fg-subtle uppercase tracking-wider mb-1.5">{t('table.permissions')}</div>
              <div className="text-tiny font-semibold text-csp-gcp-onLight dark:text-csp-gcp-onDark">
                {role.permissionCount > 0 ? fmt(role.permissionCount) : '—'}
              </div>
            </div>
          </div>

          {/* Role ID */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-3xs text-fg-subtle uppercase tracking-wider">Role ID</span>
            <code className="text-tiny font-mono text-fg-muted bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{role.roleId}</code>
          </div>

          {/* Privileged warning */}
          {role.isPrivileged && (
            <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <ShieldAlert size={14} className="text-danger mt-0.5 shrink-0" />
              <p className="text-tiny text-danger leading-relaxed">
                Esta é uma role <strong>privilegiada</strong> — concede capacidades de controle elevado. Aplique o princípio do menor privilégio e monitore atribuições via Cloud Audit Logs.
              </p>
            </div>
          )}

          {/* Tier description */}
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

          {/* Lowest-level resources — dado oficial do Google */}
          {role.lowestResources && role.lowestResources.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('perm.gcpLowestRes')}
              </h2>
              <p className="text-3xs text-fg-subtle mb-3">Lowest-level resources — {t('perm.docGoogle')}</p>
              <div className="space-y-2">
                {role.lowestResources.map((res, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckSquare size={13} className="mt-0.5 shrink-0" style={{ color: tier.color }} />
                    <span className="text-tiny text-fg-muted">{res}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {role.deprecated && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <ShieldAlert size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-tiny text-amber-700 dark:text-amber-400 leading-relaxed">
                A descrição oficial do Google indica que esta role está{' '}
                <strong>descontinuada</strong>. Veja o texto acima para a alternativa recomendada.
              </p>
            </div>
          )}

          {/* Basic roles: o Google não publica a lista de permissões */}
          {role.permissionsNote && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <ShieldAlert size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="text-tiny text-amber-700 dark:text-amber-400 leading-relaxed">
                <p>{role.permissionsNote}</p>
                <code className="mt-2 inline-block font-mono text-3xs bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                  gcloud iam roles describe {role.roleId}
                </code>
              </div>
            </div>
          )}

          {/* Permissions — carregadas de public/gcp-perms/<slug>.json */}
          {role.permissionCount > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <span className="flex items-center gap-2">
                  <Code size={13} style={{ color: tier.color }} />
                  Permissions
                  <span className="text-3xs font-normal text-fg-subtle">({fmt(role.permissionCount)})</span>
                </span>
              </h2>
              {permsError && (
                <p className="text-tiny text-red-500">
                  {t('perm.roleLoadFailed')}
                </p>
              )}
              {!permsError && permissions === null && (
                <p className="text-tiny text-fg-subtle">{t('state.loadingPerms')}</p>
              )}
              {!permsError && permissions !== null && (
              <PermissionsTable
                rows={permissions.map((perm) => {
                  const parts = perm.split('.')
                  return {
                    permission: perm,
                    service: parts[0] ?? '',
                    resource: parts.length > 2 ? parts.slice(1, -1).join('.') : '',
                    verb: parts.length > 1 ? parts[parts.length - 1] : '',
                  }
                })}
                columns={[
                  { key: 'permission', label: 'Permission' },
                  { key: 'service',    label: t('table.service'),  mono: true, width: 'w-32' },
                  { key: 'resource',   label: t('table.resource'), mono: true, width: 'w-40' },
                  { key: 'verb',       label: t('table.verb'),     badge: true, width: 'w-28' },
                ]}
                filterKey="verb"
                filename={`gcp-${role.slug}-permissions`}
                noun="noun.permissions"
                searchPlaceholder="ph.filterPermissions"
              />
              )}
            </div>
          )}

          {/* Role Definition (JSON) */}
          <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Role Definition (JSON)
            </h2>
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors z-10"
                title={t('action.copyJson')}
              >
                {copied ? <CheckCheck size={13} className="text-fg" /> : <Copy size={13} className="text-fg-subtle" />}
              </button>
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
                  className="mt-2 flex items-center gap-1 text-3xs text-csp-gcp-onLight dark:text-csp-gcp-onDark hover:underline"
                >
                  <ChevronDown size={12} className={jsonExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  {jsonExpanded ? t('action.showLess') : `${t('action.showAllLines')} (${jsonLines.length} ${t('noun.lines')})`}
                </button>
              )}
            </div>
          </div>

          {/* Related roles */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-surface-border dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-body font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Roles relacionadas
                <span className="ml-2 text-3xs font-normal text-fg-subtle">{role.category}</span>
              </h2>
              <div className="space-y-1.5">
                {related.map(r => (
                  <Link key={r.slug} href={`/gcp/roles/${r.slug}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-transparent hover:border-csp-gcp/30 hover:bg-csp-gcp/5 transition-all group">
                    <div>
                      <div className="text-tiny font-medium text-gray-700 dark:text-gray-300 group-hover:text-csp-gcp transition-colors">{r.name}</div>
                      <div className="text-3xs text-fg-subtle truncate max-w-xs">{r.description}</div>
                    </div>
                    <ChevronRight size={14} className="text-fg-muted dark:text-gray-600 group-hover:text-csp-gcp shrink-0 ml-2 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Docs link */}
          <div className="flex items-center justify-end">
            <a
              href={`https://cloud.google.com/iam/docs/understanding-roles#${role.roleId.replace('roles/', '').replace(/\./g, '_')}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-tiny text-fg-subtle hover:text-csp-gcp transition-colors">
              <Globe size={12} /> Docs GCP
            </a>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
