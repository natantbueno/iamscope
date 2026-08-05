import { Metadata } from 'next'
import { Suspense } from 'react'
import SearchClient from './SearchClient'

export const metadata: Metadata = {
  title: 'Busca global',
  description:
    'Search every role and policy across Microsoft Entra ID, Azure RBAC, AWS IAM, GCP IAM, Google Workspace and IBM Cloud in one place.',
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <SearchClient />
    </Suspense>
  )
}
