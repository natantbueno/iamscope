'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import RoleActionsTable from '@/components/RoleActionsTable'
import StatsBar from '@/components/StatsBar'
import ExportMenu from '@/components/ExportMenu'
import { getRoleActions, getUniqueNamespaces, getUniqueVerbs, getUniqueCategories } from '@/lib/roleActions'
import { useT } from '@/i18n/LanguageProvider'

function RoleActionsContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const actions = useMemo(() => getRoleActions(), [])
  const namespaces = useMemo(() => getUniqueNamespaces(), [])
  const verbs = useMemo(() => getUniqueVerbs(), [])
  const categories = useMemo(() => getUniqueCategories(), [])

  const stats = useMemo(() => ({
    total:      actions.length,
    control:    actions.filter((a) => a.tier === 'ControlPlane').length,
    management: actions.filter((a) => a.tier === 'ManagementPlane').length,
    userAccess: actions.filter((a) => a.tier === 'UserAccess').length,
    privileged: actions.filter((a) => a.isUsedByPrivileged).length,
    namespaces: namespaces.length,
  }), [actions, namespaces])

  const subtitle = t('sub.entraRoleActions')

  return (
    <AppShell
      headerTitle="Role Actions"
      headerSub={subtitle}
      headerActions={<ExportMenu mode="roleActions" roleActions={actions} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: t('label.totalUnique'), value: stats.total, color: 'blue' },
          { label: 'Control Plane', value: stats.control, color: 'red' },
          { label: 'Management Plane', value: stats.management, color: 'orange' },
          { label: 'User Access', value: stats.userAccess, color: 'green' },
          { label: t('label.usedByPriv'), value: stats.privileged, color: 'red' },
          { label: t('label.namespaces'), value: stats.namespaces, color: 'gray' },
        ]} />
        <RoleActionsTable
          actions={actions}
          namespaces={namespaces}
          verbs={verbs}
          categories={categories}
          search={q}
        />
      </div>
    </AppShell>
  )
}

export default function RoleActionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <RoleActionsContent />
    </Suspense>
  )
}
