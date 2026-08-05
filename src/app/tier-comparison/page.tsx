import TierComparisonClient from './TierComparisonClient'

// Metadata em inglês: com `output: 'export'` o HTML é gerado uma vez no build
// e a troca de idioma é client-side, então title/description não trocam junto.
export const metadata = { title: 'Tier 0 Comparison' }

export default function TierComparisonPage() {
  return <TierComparisonClient />
}
