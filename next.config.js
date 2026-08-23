/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera site estático puro (HTML/CSS/JS) na pasta `out/`.
  // Funciona em Vercel, Netlify, Cloudflare Pages, GitHub Pages.
  output: 'export',

  // Necessário para export estático (sem otimização de imagem server-side).
  images: { unoptimized: true },

  // Rotas como pastas (/roles/global-administrator/index.html).
  trailingSlash: true,
}

module.exports = nextConfig
