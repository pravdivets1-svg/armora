import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // === New Premium Soft tokens ===
        app:        '#FAFAFB',
        card:       '#FFFFFF',
        subtle:     '#F4F5F7',
        borderc:    '#ECEEF1',
        borders:    '#DDE1E6',
        text1:      '#0B0D12',
        text2:      '#4B5260',
        text3:      '#8A93A1',
        // Status (desaturated)
        ok2:        { DEFAULT: '#2A9D6A', soft: '#ECF7F0' },
        warn2:      { DEFAULT: '#B6781A', soft: '#FBF3E2' },
        bad2:       { DEFAULT: '#C9384B', soft: '#FCEBED' },
        info2:      { DEFAULT: '#2462C7', soft: '#E8F0FB' },
        // === Legacy aliases (Stage 2 утилизирует) ===
        canvas:    '#f0f2f5',
        page:      '#ffffff',
        line:      '#e5e7eb',
        lineHover: '#d1d5db',
        sidebar: {
          bg:      '#1e2a3a',
          hover:   '#28394f',
          active:  '#2563eb',
          text:    '#94a3b8',
          textAct: '#ffffff',
        },
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
        },
        accent: {
          DEFAULT:  '#2563EB',
          hover:    '#1D4ED8',
          soft:     '#EFF6FF',
          deep:     '#1D4ED8',
          softText: '#1D4ED8',
        },
        ok:   { DEFAULT: '#16a34a', soft: '#f0fdf4' },
        warn: { DEFAULT: '#d97706', soft: '#fffbeb', softText: '#92400e' },
        bad:  { DEFAULT: '#dc2626', soft: '#fef2f2' },
        whatsapp: { DEFAULT: '#25D366', hover: '#128C7E' },
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '10px',
        lg: '14px',
        xl: '16px',
        '2xl': '20px',
        sheet: '20px',
      },
      fontSize: {
        display: ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '650' }],
        h1: ['20px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        h2: ['16px', { lineHeight: '22px', letterSpacing: '-0.01em',  fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '450' }],
        meta: ['13px', { lineHeight: '18px', fontWeight: '500' }],
        mono: ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
      boxShadow: {
        'soft':         '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'soft-lg':      '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card':         '0 1px 2px rgba(15,23,42,.04), 0 1px 1px rgba(15,23,42,.03)',
        'popover':      '0 12px 32px -8px rgba(15,23,42,.16), 0 2px 6px rgba(15,23,42,.06)',
        'accent-glow':  '0 4px 20px -6px rgba(37,99,235,0.4)',
        'ok-glow':      '0 4px 20px -6px rgba(22,163,74,0.3)',
        'bad-glow':     '0 4px 20px -6px rgba(220,38,38,0.3)',
      },
      width:   { sidebar: '240px' },
      spacing: { sidebar: '240px', topbar: '56px', pageheader: '64px', tabbar: '64px' },
      transitionTimingFunction: {
        soft: 'cubic-bezier(.2,.8,.2,1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '260ms',
      },
    },
  },
  plugins: [],
};

export default config;
