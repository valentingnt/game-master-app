/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        display: ['Camaufalge', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(59,130,246,0.35)'
      },
      colors: {
        ink: {
          50: '#f7f7f7',
          100: '#eaeaea',
          200: '#cfcfcf',
          300: '#a8a8a8',
          400: '#8a8a8a',
          500: '#6e6e6e',
          600: '#4a4a4a',
          700: '#2f2f2f',
          800: '#1c1c1c',
          900: '#111111',
          950: '#0a0a0a'
        }
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 300ms ease-out both',
        'pulse-soft': 'pulseSoft 2200ms ease-in-out infinite'
      }
    }
  },
  plugins: []
};


