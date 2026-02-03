/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        jmr: {
          primary: '#16a34a',
          secondary: '#15803d',
          accent: '#22c55e',
          dark: '#14532d',
          light: '#dcfce7',
        },
      },
    },
  },
}