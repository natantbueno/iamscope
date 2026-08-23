// Stub de redirect permanente — rota migrada para /entraid/role-actions em 2026-07.
// Com output: 'export', redirect() em Server Component gera HTML estático
// com meta refresh (mesmo padrão já usado em roles/[slug] para slugs renomeados).
import { redirect } from 'next/navigation'

export default function Redirect() {
  redirect('/entraid/role-actions/')
}
