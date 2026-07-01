import { Metadata } from 'next'
import { Suspense } from 'react'
import EvaluateClient from './EvaluateClient'

export const metadata: Metadata = {
  title: 'Role Evaluator — entra.permissions',
  description: 'Avalie o risco de qualquer role multi-cloud colando o JSON — 100% client-side, sem chamadas externas.',
}

export default function EvaluatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <EvaluateClient />
    </Suspense>
  )
}
