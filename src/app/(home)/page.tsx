// Home page — porta de entrada do site, renderizada DENTRO do layout padrão
// (AppShell: sidebar + CloudNav + header), como as demais páginas.
// Server Component: só metadata e as contagens de build time (em ./clouds).
// O corpo mora em HomeClient porque a troca de idioma é client-side — mesmo
// split de /info e das páginas reference.
// Vive no route group (home) — mesma URL "/" — para não colidir com o antigo
// src/app/page.tsx movido para /entraid nesta sessão.
import type { Metadata } from 'next'

import HomeClient from './HomeClient'
import { buildClouds } from './clouds'

export const metadata: Metadata = {
  title: 'Multi-Cloud IAM Reference',
  description:
    'Roles, permissions and policies for 6 cloud providers — with EAM classification, SoD analysis and risk evaluation.',
}

export default function HomePage() {
  return <HomeClient clouds={buildClouds()} />
}
