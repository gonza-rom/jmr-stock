/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Habilitar modo oscuro con clase
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores de Marroquinería JMR
        jmr: {
          primary: '#16a34a',    // Verde principal
          secondary: '#15803d',  // Verde oscuro
          accent: '#22c55e',     // Verde brillante
          dark: '#14532d',       // Verde muy oscuro
          light: '#dcfce7',      // Verde claro
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
}