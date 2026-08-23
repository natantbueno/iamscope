'use client'

import AppShell from '@/components/AppShell'
import Dashboard from '@/components/Dashboard'
import { useT } from '@/i18n/LanguageProvider'

export default function Home() {
  const t = useT()
  return (
    <AppShell
      headerTitle="Microsoft Entra ID"
      headerSub={t('entra.pageSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <Dashboard />
      </div>
    </AppShell>
  )
}
