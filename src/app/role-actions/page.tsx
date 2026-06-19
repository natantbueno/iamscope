'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import RoleActionsTable from '@/components/RoleActionsTable'
import { getRoleActions, getUniqueNamespaces, getUniqueVerbs, getUniqueCategories } from '@/lib/roleActions'

function RoleActionsContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const actions = useMemo(() => getRoleActions(), [])
  const namespaces = useMemo(() => getUniqueNamespaces(), [])
  const verbs = useMemo(() => getUniqueVerbs(), [])
  const categories = useMemo(() => getUniqueCategories(), [])

  const subtitle = `${actions.length.toLocaleString()} role actions únicas · ${namespaces.length} namespaces`

  return (
    <AppShell
      headerTitle="Role Actions"
      headerSub={subtitle}
    >
      <div className="flex flex-col flex-1 min-h-0">
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
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <RoleActionsContent />
    </Suspense>
  )
}
