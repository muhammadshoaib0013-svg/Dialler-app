/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#141d2e',
          900: '#0F172A',
          950: '#0a0f18', // Very dark navy/slate
        },
        gold: {
          400: '#D4AF37', // Matte gold
          500: '#C5A017',
          600: '#B08D14',
        },
        cyan: {
          400: '#00E8FF', // Neon-cyan
          500: '#00C8DF',
          900: '#003A4D',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Lexend"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
