// Stub de redirect permanente — /reference migrada para /entraid/reference (2026-07).
// Vive no route group (legacy) por limitação do ambiente de edição desta sessão
// (conflito de sincronização com o diretório src/app/reference original);
// a URL pública continua sendo /reference.
import { redirect } from 'next/navigation'

export default function Redirect() {
  redirect('/entraid/reference/')
}
