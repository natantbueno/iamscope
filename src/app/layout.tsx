import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'IAM Scope — Referência Multi-Cloud de IAM',
  description:
    'Referência de roles e permissões de IAM em 7 clouds (Microsoft Entra ID, Azure RBAC, AWS, GCP, Google Workspace, OCI e IBM Cloud), com classificação de risco por tier inspirada no Enterprise Access Model.',
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
