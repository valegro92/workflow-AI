/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'partner': '#28a745',
        'assistant': '#ffc107',
        'tool': '#17a2b8',
        'out-of-scope': '#dc3545',
        'automation-bg': '#e2efda',
        'cognitive-bg': '#fce4d6',
      },
    },
  },
  plugins: [],
}
