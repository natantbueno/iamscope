/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera site estático puro (HTML/CSS/JS) na pasta `out/`.
  // Funciona em Vercel, Netlify, Cloudflare Pages, GitHub Pages, ou qualquer host estático.
  output: 'export',

  // Necessário para export estático (sem otimização de imagem server-side).
  images: { unoptimized: true },

  // Garante que as rotas funcionem como pastas (/roles/global-administrator/index.html).
  trailingSlash: true,
}

module.exports = nextConfig
