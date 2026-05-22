/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
      },
      colors: {
        lime: {
          400: '#D0FD3E',
          500: '#BDF914',
        },
        dark: {
          bg: '#000000',
          card: '#1C1C1E',
          surface: '#2C2C2E',
          separator: '#38383A',
        },
        light: {
          bg: '#F2F2F7',
          card: '#FFFFFF',
          surface: '#E5E5EA',
          separator: '#C6C6C8',
        }
      },
      animation: {
        'fade-out': 'fadeout 1.5s ease-in-out forwards',
      },
      keyframes: {
        fadeout: {
          '0%': { opacity: '1' },
          '60%': { opacity: '1' },
          '100%': { opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
