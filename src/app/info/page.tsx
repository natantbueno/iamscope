import InfoClient from './InfoClient'

// O metadata fica em inglês de propósito: com `output: 'export'` o HTML é
// gerado uma vez no build e a troca de idioma acontece no cliente, então
// title/description não trocam junto. Inglês é o que o buscador indexa e o que
// aparece na prévia de um link compartilhado.
export const metadata = { title: 'About' }

export default function InfoPage() {
  return <InfoClient />
}
