import type { Metadata } from 'next'

// Título de aba desta rota. A página é Client Component e não pode exportar
// metadata, então o título vive neste layout — mesmo arranjo de
// /aws/actions e /gcp/permissions.
//
// O layout envolve também /azure-rbac/providers/[slug], cuja generateMetadata
// sobrescreve o título com o nome do provider.
export const metadata: Metadata = { title: 'Azure Resource Providers' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
