/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(99 102 241)', // indigo-500
          hover: 'rgb(79 70 229)',   // indigo-600
          light: 'rgb(238 242 255)', // indigo-50
          text: 'rgb(55 48 163)',   // indigo-800
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      }
    },
  },
  plugins: [],
}
