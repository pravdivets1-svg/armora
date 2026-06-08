import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // === Armora graphite palette ===
        // Базис — холодный графит, премиум-нейтрал. Акцент — сам графит,
        // т.е. главные кнопки/линии сливаются с текстом. Цветные акценты
        // только на статусах (ok/warn/bad/info).
        app:        '#F4F4F6',
        card:       '#FFFFFF',
        subtle:     '#E9EAEC',
        borderc:    '#D6D7DA',
        borders:    '#BCBDC0',
        text1:      '#17181B',
        text2:      '#52535A',
        text3:      '#8A8B92',
        // Status (приглушённые, в тон графиту)
        ok2:        { DEFAULT: '#2E8F62', soft: '#EBF4EE' },
        warn2:      { DEFAULT: '#B27420', soft: '#F8EFE0' },
        bad2:       { DEFAULT: '#C53848', soft: '#FAEAEC' },
        info2:      { DEFAULT: '#345AB3', soft: '#E5EAF5' },
        // === Legacy aliases (старые компоненты могут ещё тянуть) ===
        canvas:    '#E9EAEC',
        page:      '#ffffff',
        line:      '#D6D7DA',
        lineHover: '#BCBDC0',
        sidebar: {
          bg:      '#17181B',
          hover:   '#2D2E32',
          active:  '#2D2E32',
          text:    '#8A8B92',
          textAct: '#ffffff',
        },
        ink: {
          900: '#17181B',
          700: '#3A3B40',
          500: '#52535A',
          400: '#8A8B92',
          300: '#BCBDC0',
        },
        // accent = сам графит. Никакого синего brand-цвета — нейтрал-премиум.
        accent: {
          DEFAULT:  '#2D2E32',
          hover:    '#17181B',
          soft:     '#E9EAEC',
          deep:     '#17181B',
          softText: '#17181B',
        },
        ok:   { DEFAULT: '#2E8F62', soft: '#EBF4EE' },
        warn: { DEFAULT: '#B27420', soft: '#F8EFE0', softText: '#7E5118' },
        bad:  { DEFAULT: '#C53848', soft: '#FAEAEC' },
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
