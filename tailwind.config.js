/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060b18',
          900: '#0a1124',
          850: '#0d1730',
          800: '#111c3a',
          700: '#1a2750',
          600: '#243463',
        },
        electric: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        accent: {
          green: '#34d399',
          amber: '#fbbf24',
          red: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(14, 165, 233, 0.25)',
        'glow-cyan': '0 0 24px rgba(34, 211, 238, 0.18)',
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% 0%, rgba(14,165,233,0.10), transparent 45%), radial-gradient(circle at 80% 100%, rgba(34,211,238,0.08), transparent 45%)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
        slideIn: 'slideIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
