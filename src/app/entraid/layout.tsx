import type { Metadata } from 'next'

// Metadata do segmento /entraid — as páginas deste segmento são client
// components, então title/description vivem aqui no layout (Server Component).
export const metadata: Metadata = {
  title: 'Microsoft Entra ID',
  description:
    'Microsoft Entra ID roles, API permissions and role actions, with risk classified by tier (Enterprise Access Model) and PIM guidance.',
}

export default function EntraIdLayout({ children }: { children: React.ReactNode }) {
  return children
}
