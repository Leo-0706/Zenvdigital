/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zenv: {
          beige: '#F8F6F0',
          'beige-surface': '#F1EDE4',
          'beige-card': '#FFFFFF',
          border: '#DDD9D0',
          'border-light': '#E9E6DF',
          olive: '#5E734F',
          'olive-light': '#7D956C',
          'olive-soft': '#EDF2E9',
          'olive-dark': '#3D4C33',
          'grey-light': '#F4F3F0',
          'grey-surface': '#E6E4DF',
          'grey-muted': '#666F60',
          charcoal: '#1A2118',
          amber: '#A6732B',
          rose: '#BD4848',
          emerald: '#4E7D59'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(94, 115, 79, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(94, 115, 79, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
