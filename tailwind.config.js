/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Strategy matrix colors
        'partner': '#28a745',
        'assistant': '#ffc107',
        'tool': '#17a2b8',
        'out-of-scope': '#dc3545',
        'automation-bg': '#1a3a2e',
        'cognitive-bg': '#3a2a1a',
        // Dark theme
        dark: {
          bg: '#2D2D2D',
          card: '#3A3A3A',
          hover: '#454545',
          border: '#4A4A4A',
        },
        // Brand "La Cassetta degli AI-trezzi"
        brand: {
          DEFAULT: '#2DD4A8',
          light: '#5EEAD4',
          dark: '#1A5C4F',
          50: '#0d3d32',
        },
      },
    },
  },
  plugins: [],
}
