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
        entra: {
          blue: '#0078d4',
          'blue-light': '#e8f1fb',
          'blue-mid': '#9dc3e8',
        },
      },
    },
  },
  plugins: [],
}
