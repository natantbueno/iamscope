// Reference do Entra ID — reconstruída em 2026-07 a partir do build estático
// (out/reference/index.html) após corrupção do arquivo durante a migração
// de /reference para /entraid/reference. Mesma estrutura das reference pages
// das demais clouds (Section/Note/CodeBlock/tabelas).
import EntraReferenceClient from './EntraReferenceClient'

// Metadata em inglês: com `output: 'export'` o HTML é gerado uma vez no build
// e a troca de idioma é client-side, então title/description não trocam junto.
export const metadata = { title: 'Entra ID — Reference' }

export default function EntraReferencePage() {
  return <EntraReferenceClient />
}
