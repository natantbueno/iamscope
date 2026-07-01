'use client'

import AppShell from '@/components/AppShell'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  return (
    <AppShell
      headerTitle="Microsoft Entra ID"
      headerSub="Referência de roles e permissões"
    >
      <div className="flex-1 overflow-y-auto">
        <Dashboard />
      </div>
    </AppShell>
  )
}
