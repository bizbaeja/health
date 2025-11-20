import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['"General Sans"', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#6C63FF',
          foreground: '#0B0A24',
        },
        accent: {
          DEFAULT: '#FFB179',
          foreground: '#1B0A02',
        },
        night: '#05010F',
        nebula: '#120C2B',
      },
      boxShadow: {
        glow: '0 0 40px rgba(108, 99, 255, 0.35)',
      },
      backgroundImage: {
        'aurora-gradient':
          'radial-gradient(circle at 20% 20%, rgba(108, 99, 255, 0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255, 177, 121, 0.3), transparent 45%), radial-gradient(circle at 50% 80%, rgba(94, 234, 212, 0.25), transparent 50%)',
      },
      animation: {
        'pulse-slow': 'pulse-slow 6s ease-in-out infinite',
        'float-slow': 'float-slow 10s ease-in-out infinite',
        'spin-reverse': 'spin-reverse 18s linear infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: 0.55 },
          '50%': { opacity: 0.95 },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -14px, 0)' },
        },
        'spin-reverse': {
          to: { transform: 'rotate(-360deg)' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
