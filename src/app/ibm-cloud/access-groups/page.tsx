import IbmAccessGroupsClient from './IbmAccessGroupsClient'

// Metadata em inglês: com `output: 'export'` o HTML é gerado uma vez no build
// e a troca de idioma é client-side, então title/description não trocam junto.
export const metadata = { title: 'Access Groups & Trusted Profiles' }

export default function IbmAccessGroupsPage() {
  return <IbmAccessGroupsClient />
}
