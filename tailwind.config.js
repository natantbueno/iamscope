/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cor de marca (Entra/Azure blue) e seus estados.
        brand: {
          DEFAULT: '#0078d4',
          hover: '#106ebe',
          soft: '#e8f1fb',     // fundo claro (hover/realce)
          mid: '#9dc3e8',      // borda de realce
          onDark: '#85b7eb',   // texto azul sobre superficies escuras
          activeBg: '#0c2a47', // fundo do item de navegacao ativo (dark)
          activeRing: '#185fa5',
          activeText: '#85b7eb',   // texto do item ativo na sidebar (dark)
          activeBorder: '#185fa5', // borda/underline do item ativo
          hoverBg: '#0d1f33',      // fundo do item em hover (dark, mais sutil que activeBg)
        },
        // Tokens de superficie/borda — substituem os hex repetidos (#dde3ec, #eef1f5...).
        surface: {
          border: '#dde3ec',
          muted: '#eef1f5',
          subtle: '#f5f8fc',
        },
        // Cores por Cloud Solution Provider (pontos/icones de plataforma), com
        // variante '-hover' ~10% mais escura para estados de interação.
        // Entra ID reutiliza o mesmo azul do Azure (csp.azure) — é o mesmo
        // token de marca (#0078d4) em ambos os produtos Microsoft, então não
        // há necessidade de uma chave 'entra-id' separada aqui (ver token
        // `entra.blue` já existente mais abaixo para uso específico do Entra).
        csp: {
          azure: '#0078d4',
          'azure-hover': '#106ebe',
          aws: '#ff9900',
          'aws-hover': '#e68a00',
          gcp: '#4285f4',
          'gcp-hover': '#3b78e7',
          gws: '#34a853',
          'gws-hover': '#2d9249',
          ibm: '#0f62fe',
          'ibm-hover': '#0353e9',
        },
        // Mantido para compatibilidade com classes existentes (entra-blue etc.).
        entra: {
          blue: '#0078d4',
          'blue-light': '#e8f1fb',
          'blue-mid': '#9dc3e8',
        },
      },
      // Escala tipografica nomeada — nomes ADITIVOS (nao sobrescrevem xs/sm/base
      // do Tailwind). Substituem os text-[10px]...[24px] ad-hoc.
      fontSize: {
        '2xs': ['10px', '14px'], // metadados, badges
        '3xs': ['11px', '16px'], // legendas
        tiny: ['12px', '18px'],  // texto secundario
        body: ['13px', '20px'],  // corpo padrao do app
        lead: ['15px', '22px'],  // titulos de header
        stat: ['22px', '26px'],  // numeros de StatCard
        title: ['24px', '30px'], // titulo de pagina de detalhe
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        dropdown: '0 10px 24px -6px rgb(0 0 0 / 0.35)',
      },
      borderRadius: {
        card: '0.5rem',
      },
    },
  },
  plugins: [],
}
