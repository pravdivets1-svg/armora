import type { Config } from 'tailwindcss';

// OkoCRM-style: холодный серый фон, тёмный сайдбар, синий акцент.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas:    '#f0f2f5',  // холодный светло-серый фон
        page:      '#ffffff',
        line:      '#e5e7eb',
        lineHover: '#d1d5db',
        sidebar: {
          bg:      '#1e2a3a',  // тёмный navy-сайдбар
          hover:   '#28394f',
          active:  '#2563eb',  // синий активный пункт
          text:    '#94a3b8',  // приглушённый текст
          textAct: '#ffffff',  // белый для активного
        },
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
        },
        accent: {
          DEFAULT:  '#2563eb',
          hover:    '#1d4ed8',
          soft:     '#eff6ff',
          softText: '#1d4ed8',
        },
        ok:   { DEFAULT: '#16a34a', soft: '#f0fdf4' },
        warn: { DEFAULT: '#d97706', soft: '#fffbeb', softText: '#92400e' },
        bad:  { DEFAULT: '#dc2626', soft: '#fef2f2' },
        whatsapp: { DEFAULT: '#25D366', hover: '#128C7E' },
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '16px',
        '2xl': '20px',
      },
      fontSize: {
        h1: ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '1.3', letterSpacing: '-0.005em', fontWeight: '600' }],
      },
      boxShadow: {
        'soft':         '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'soft-lg':      '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card':         '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.05)',
        'accent-glow':  '0 4px 20px -6px rgba(37,99,235,0.4)',
        'ok-glow':      '0 4px 20px -6px rgba(22,163,74,0.3)',
        'bad-glow':     '0 4px 20px -6px rgba(220,38,38,0.3)',
      },
      width: {
        sidebar: '220px',
      },
      spacing: {
        sidebar: '220px',
      },
    },
  },
  plugins: [],
};

export default config;
