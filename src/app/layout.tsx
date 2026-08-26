import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { SITE_URL } from '@/lib/siteUrl'
import { Analytics } from '@vercel/analytics/next'

const DESCRICAO =
  'IAM roles and permissions across 6 clouds — Microsoft Entra ID, Azure RBAC, AWS, GCP, Google Workspace and IBM Cloud — with risk classified by tier, following the Enterprise Access Model.'

export const metadata: Metadata = {
  // metadataBase resolve os caminhos relativos de openGraph/canonical para URL
  // absoluta. Sem ele o Next avisa no build e as tags saem relativas — que os
  // crawlers de preview (Slack, WhatsApp, LinkedIn) não conseguem seguir.
  metadataBase: new URL(SITE_URL),

  /*
    Canônica por rota.

    O `'./'` é resolvido pelo Next contra o pathname da própria página, então
    uma única linha no layout dá canônica correta às ~7.900 rotas. Escrever
    `SITE_URL` aqui apontaria o site inteiro para a home, que é pior que não ter
    tag nenhuma.

    Nenhuma página declara `alternates` própria (conferido em 25/08/2026); no
    dia em que uma declarar, a dela vence — e é o comportamento certo.
  */
  alternates: { canonical: './' },

  // Padrão único de título de aba para o site inteiro.
  // `default` vale para a home e para qualquer rota sem título próprio;
  // `template` sufixa a marca em todas as demais — cada página declara apenas
  // o próprio nome (ex.: 'AWS IAM Policies' vira 'AWS IAM Policies · IAM Scope').
  title: {
    default: 'IAM Scope — Multi-Cloud IAM Reference',
    template: '%s · IAM Scope',
  },
  description: DESCRICAO,
  applicationName: 'IAM Scope',
  keywords: [
    'IAM', 'Entra ID', 'Azure RBAC', 'AWS IAM', 'GCP IAM', 'Google Workspace',
    'IBM Cloud', 'least privilege', 'Enterprise Access Model', 'Tier 0',
    'segregation of duties', 'privileged access',
  ],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },

  /*
    Open Graph e Twitter Card.

    A imagem é PNG estático em public/og.png, gerada com os números reais do
    catálogo. Poderia ser `opengraph-image.tsx` com ImageResponse, que o Next
    renderiza em build — mas isso acrescenta uma dependência de fonte e um passo
    que pode falhar num build que não dá para reproduzir aqui. Um PNG pronto não
    tem esse risco, e o conteúdo só muda quando os datasets mudam.

    Regenerar: as instruções ficam em DEPLOY.md.
  */
  openGraph: {
    type: 'website',
    siteName: 'IAM Scope',
    title: 'IAM Scope — Multi-Cloud IAM Reference',
    description: DESCRICAO,
    // Mesma resolução relativa da canônica acima. Era `'/'` fixo, o que fazia
    // as ~7.900 páginas anunciarem a home como og:url — o preview do Slack e do
    // LinkedIn apontava para o lugar errado em toda página que não a inicial.
    url: './',
    locale: 'pt_BR',
    alternateLocale: ['en_US'],
    images: [{
      url: '/og.png',
      width: 1200,
      height: 630,
      alt: 'IAM Scope — referência multi-cloud de IAM para 6 plataformas',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IAM Scope — Multi-Cloud IAM Reference',
    description: DESCRICAO,
    images: ['/og.png'],
  },

  // Explícito porque o padrão de alguns crawlers é conservador, e o conteúdo
  // aqui é público de propósito.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

// Decide o tema antes da primeira pintura.
//
// Precisa ser script inline e síncrono no <head>: qualquer coisa que rode depois
// (efeito do React, chunk carregado) já perdeu a corrida com a pintura, e a
// pessoa vê um flash do tema errado. O HTML estático sai sempre com `dark`, e
// este script tira a classe quando o tema resolvido é o claro — ordem escolhida
// para que o flash, se houvesse, atingisse a minoria e não a maioria.
//
// A chave do storage é a mesma de components/ThemeProvider.tsx
// (THEME_STORAGE_KEY). Mudar uma exige mudar a outra.
const themeInitScript = `(function(){try{var s=localStorage.getItem('iam-scope-theme');var dark=s?s!=='light':!window.matchMedia('(prefers-color-scheme: light)').matches;var e=document.documentElement;e.classList.toggle('dark',dark);e.style.colorScheme=dark?'dark':'light';}catch(err){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>

        {/*
          Vercel Web Analytics.

          Fica no fim do <body> de propósito: o script é `defer` e não deve
          competir com a primeira pintura. O componente `/next` já trata a
          navegação client-side — com `trailingSlash: true` cada rota é uma
          pasta, e um script solto contaria só o primeiro pageview da sessão.

          Sem cookie e sem identificador persistente, então não pede banner de
          consentimento. Só coleta quando servido pela Vercel: em `next dev` e
          em qualquer outro host o script não existe e o componente não faz nada.

          Cota do plano Hobby: 50.000 eventos/mês, janela de 1 mês.
        */}
        <Analytics />
      </body>
    </html>
  )
}
