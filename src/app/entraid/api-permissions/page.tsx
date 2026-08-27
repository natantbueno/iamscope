'use client'

import { useT } from '@/i18n/LanguageProvider'
import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import ApiPermissionsTable from '@/components/ApiPermissionsTable'
import StatsBar from '@/components/StatsBar'
import ExportMenu from '@/components/ExportMenu'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import { useInlineQuery } from '@/hooks/useInlineQuery'

const GLOBAL_STATS = {
  total:       API_PERMISSIONS.length,
  application: API_PERMISSIONS.filter((p) => p.type === 'Application').length,
  delegated:   API_PERMISSIONS.filter((p) => p.type === 'Delegated').length,
  control:     API_PERMISSIONS.filter((p) => p.eamTier === 'ControlPlane').length,
  management:  API_PERMISSIONS.filter((p) => p.eamTier === 'ManagementPlane').length,
  userAccess:  API_PERMISSIONS.filter((p) => p.eamTier === 'UserAccess').length,
}

function ApiContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const [q, setQ] = useInlineQuery('/entraid/api-permissions')
  const tier = searchParams.get('tier') ?? 'all'

  return (
    <AppShell
      headerTitle="API Permissions"
      headerSub={t('entra.apiPermsSub')}
      headerActions={<ExportMenu mode="apiPerms" apiPerms={API_PERMISSIONS} />}
    >
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        <StatsBar stats={[
          { label: 'Total', value: GLOBAL_STATS.total, color: 'blue' },
          { label: 'Application', value: GLOBAL_STATS.application, color: 'purple' },
          { label: 'Delegated', value: GLOBAL_STATS.delegated, color: 'blue' },
          { label: 'Control Plane', value: GLOBAL_STATS.control, color: 'red' },
          { label: 'Management Plane', value: GLOBAL_STATS.management, color: 'orange' },
          { label: 'User Access', value: GLOBAL_STATS.userAccess, color: 'green' },
        ]} />
        <ApiPermissionsTable search={q} onSearchChange={setQ} initialTier={tier} />
      </div>
    </AppShell>
  )
}

export default function ApiPermissionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <ApiContent />
    </Suspense>
  )
}
