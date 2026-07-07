// Stub de redirect permanente — rota migrada para /entraid/roles em 2026-07.
import { redirect } from 'next/navigation'

export default function Redirect() {
  redirect('/entraid/roles/')
}
