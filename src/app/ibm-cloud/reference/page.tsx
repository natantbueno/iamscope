import IbmReferenceClient from './IbmReferenceClient'

// Metadata em inglês: com `output: 'export'` o HTML é gerado uma vez no build
// e a troca de idioma é client-side, então title/description não trocam junto.
export const metadata = { title: 'IBM Cloud IAM Reference' }

export default function IbmReferencePage() {
  return <IbmReferenceClient />
}
