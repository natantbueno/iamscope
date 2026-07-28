import type { Metadata } from 'next'

// Metadata do segmento /entraid — as páginas deste segmento são client
// components, então title/description vivem aqui no layout (Server Component).
export const metadata: Metadata = {
  title: 'Microsoft Entra ID',
  description:
    'Referência de roles, API permissions e role actions do Microsoft Entra ID, com classificação de risco por tier (Enterprise Access Model) e integração com PIM.',
}

export default function EntraIdLayout({ children }: { children: React.ReactNode }) {
  return children
}
