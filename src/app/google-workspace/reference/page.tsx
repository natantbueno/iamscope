import GwsReferenceClient from './GwsReferenceClient'

// Metadata em inglês: com `output: 'export'` o HTML é gerado uma vez no build
// e a troca de idioma é client-side, então title/description não trocam junto.
export const metadata = { title: 'Google Workspace — Reference' }

export default function GwsReferencePage() {
  return <GwsReferenceClient />
}
