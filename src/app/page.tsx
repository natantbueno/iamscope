'use client'

import AppShell from '@/components/AppShell'
import Dashboard from '@/components/Dashboard'
import ExportMenu from '@/components/ExportMenu'

export default function Home() {
  return (
    <AppShell
      headerTitle="Dashboard"
      headerSub="Microsoft Entra ID — referência de roles e permissões"
      headerActions={<ExportMenu />}
    >
      <div className="flex-1 overflow-y-auto">
        <Dashboard />
      </div>
    </AppShell>
  )
}
