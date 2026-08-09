import type { Config } from 'tailwindcss';

/**
 * Sistema visual JBL SAC — "tablero de almacén".
 * Grafito y acero como base; amarillo de señalización como único acento.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        papel: '#F4F5F6',
        tinta: '#14171A',
        acero: {
          900: '#14171A',
          800: '#23282E',
          700: '#333B43',
          600: '#4A535C',
          500: '#6B747D',
          400: '#8C959E',
          300: '#B4BBC1',
          200: '#D6DBDF',
          100: '#E9ECEE',
          50:  '#F4F5F6',
        },
        senal: {
          DEFAULT: '#FFC400',
          claro: '#FFF4CC',
          medio: '#FFE480',
          oscuro: '#8A6B00',
        },
        ok:      { DEFAULT: '#12775A', claro: '#E1F2EC' },
        alerta:  { DEFAULT: '#8A6B00', claro: '#FFF4CC' },
        critico: { DEFAULT: '#C4302B', claro: '#FBE6E5' },
      },
      fontFamily: {
        display: ['var(--fuente-display)', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['var(--fuente-cuerpo)', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--fuente-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        eyebrow: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.14em' }],
      },
      borderRadius: {
        ficha: '3px',
      },
      boxShadow: {
        ficha: '0 1px 2px rgba(20,23,26,.06), 0 0 0 1px rgba(20,23,26,.07)',
        elevada: '0 8px 28px -12px rgba(20,23,26,.28), 0 0 0 1px rgba(20,23,26,.08)',
        panel: '0 24px 60px -24px rgba(20,23,26,.35)',
      },
      keyframes: {
        surge: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        entra: {
          from: { opacity: '0', transform: 'translateY(12px) scale(.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        barrido: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        surge: 'surge .34s cubic-bezier(.22,.61,.36,1) both',
        entra: 'entra .22s cubic-bezier(.22,.61,.36,1) both',
        barrido: 'barrido .7s cubic-bezier(.22,.61,.36,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
