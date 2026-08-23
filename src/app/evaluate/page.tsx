import { Metadata } from 'next'
import { Suspense } from 'react'
import EvaluateClient from './EvaluateClient'

export const metadata: Metadata = {
  title: 'Role Evaluator',
  description: 'Paste the JSON of any multi-cloud role and get a risk analysis — fully client-side, no external calls.',
}

export default function EvaluatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <EvaluateClient />
    </Suspense>
  )
}
