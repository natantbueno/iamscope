import { redirect } from 'next/navigation'

export const metadata = { title: 'SoD — Rule Catalogue' }

// Alias: /sod/rules aponta para a aba "Catálogo de Regras" da página principal.
export default function SodRulesIndexPage() {
  redirect('/sod?tab=catalog')
}
