// Stub de redirect permanente — /roles/[slug] migrado para /entraid/roles/[slug]
// em 2026-07. Mantém TODOS os slugs antigos (incluindo aliases pré-rebranding)
// como páginas estáticas de meta refresh para não quebrar links externos.
import { getAllSlugsIncludingRedirects, SLUG_REDIRECTS } from '@/lib/roles'
import { redirect } from 'next/navigation'

export function generateStaticParams() {
  return getAllSlugsIncludingRedirects().map((slug) => ({ slug }))
}

export default async function Redirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Alias antigo → já resolve direto para o slug atual no novo caminho.
  const target = SLUG_REDIRECTS[slug] ?? slug
  redirect(`/entraid/roles/${target}/`)
}
