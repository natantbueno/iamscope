import { Metadata } from 'next'
import { Suspense } from 'react'
import SodClient from './SodClient'

export const metadata: Metadata = {
  title: 'SoD Analyzer',
  description: 'Segregation of duties for Entra ID and Azure RBAC — rule catalogue, conflict matrix and user evaluation, fully client-side.',
}

export default function SodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <SodClient />
    </Suspense>
  )
}
