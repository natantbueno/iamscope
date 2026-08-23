import GcpReferenceClient from './GcpReferenceClient'

// Metadata em inglês: com `output: 'export'` o HTML é gerado uma vez no build
// e a troca de idioma é client-side, então title/description não trocam junto.
export const metadata = { title: 'GCP IAM Reference' }

export default function GcpReferencePage() {
  return <GcpReferenceClient />
}
