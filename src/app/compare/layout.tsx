import type { Metadata } from 'next'

// Título de aba desta rota. A página é Client Component e não pode
// exportar metadata, então o título vive neste layout.
export const metadata: Metadata = { title: 'Multi-Cloud Compare' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
