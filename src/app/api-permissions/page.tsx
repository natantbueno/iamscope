'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import ApiPermissionsTable from '@/components/ApiPermissionsTable'
import StatsBar from '@/components/StatsBar'
import { API_PERMISSIONS } from '@/data/apiPermissions'

const GLOBAL_STATS = {
  total:       API_PERMISSIONS.length,
  application: API_PERMISSIONS.filter((p) => p.type === 'Application').length,
  delegated:   API_PERMISSIONS.filter((p) => p.type === 'Delegated').length,
  control:     API_PERMISSIONS.filter((p) => p.eamTier === 'ControlPlane').length,
  management:  API_PERMISSIONS.filter((p) => p.eamTier === 'ManagementPlane').length,
  userAccess:  API_PERMISSIONS.filter((p) => p.eamTier === 'UserAccess').length,
}

function ApiContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const tier = searchParams.get('tier') ?? 'all'

  return (
    <AppShell
      headerTitle="API Permissions"
      headerSub="Microsoft Graph API permissions com classificação EAM"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <StatsBar stats={[
          { label: 'Total', value: GLOBAL_STATS.total, color: 'blue' },
          { label: 'Application', value: GLOBAL_STATS.application, color: 'purple' },
          { label: 'Delegated', value: GLOBAL_STATS.delegated, color: 'blue' },
          { label: 'Control Plane', value: GLOBAL_STATS.control, color: 'red' },
          { label: 'Management Plane', value: GLOBAL_STATS.management, color: 'orange' },
          { label: 'User Access', value: GLOBAL_STATS.userAccess, color: 'green' },
        ]} />
        <ApiPermissionsTable search={q} initialTier={tier} />
      </div>
    </AppShell>
  )
}

export default function ApiPermissionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <ApiContent />
    </Suspense>
  )
}
