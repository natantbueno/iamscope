import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  // Padrão único de título de aba para o site inteiro.
  // `default` vale para a home e para qualquer rota sem título próprio;
  // `template` sufixa a marca em todas as demais — cada página declara apenas
  // o próprio nome (ex.: 'AWS IAM Policies' vira 'AWS IAM Policies · IAM Scope').
  title: {
    default: 'IAM Scope — Referência Multi-Cloud de IAM',
    template: '%s · IAM Scope',
  },
  description:
    'Referência de roles e permissões de IAM em 6 clouds (Microsoft Entra ID, Azure RBAC, AWS, GCP, Google Workspace e IBM Cloud), com classificação de risco por tier inspirada no Enterprise Access Model.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
