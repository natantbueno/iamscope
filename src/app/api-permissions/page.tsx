'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import ApiPermissionsTable from '@/components/ApiPermissionsTable'

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
