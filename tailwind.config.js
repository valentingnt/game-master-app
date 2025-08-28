/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
      },
      boxShadow: {
        glow: '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(59,130,246,0.35)'
      }
    }
  },
  plugins: []
};


