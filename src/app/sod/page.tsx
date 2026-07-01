import { Metadata } from 'next'
import { Suspense } from 'react'
import SodClient from './SodClient'

export const metadata: Metadata = {
  title: 'SoD Analyzer — IAM Scope',
  description: 'Segregation of Duties para Entra ID e Azure RBAC — catálogo de regras, matriz de conflito e avaliação de usuário, 100% client-side.',
}

export default function SodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <SodClient />
    </Suspense>
  )
}
