import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // === Armora indigo/violet palette (modern colorful 2026) ===
        // Brand — индиго (accent), акцент-пара — фиолет. Прохладные slate-нейтралы
        // с лёгким индиго-подтоном. Статусы — живые, современные.
        app:        '#F6F7FB',
        card:       '#FFFFFF',
        subtle:     '#EEF1F8',
        borderc:    '#E2E5EF',
        borders:    '#C7CCDC',
        text1:      '#1A1B2E',
        text2:      '#4A4D68',
        text3:      '#6B6F8A',
        // Status. DEFAULT — «живой» цвет для заливок/точек/крупных элементов
        // (на белом даёт ~3:1 — только large text). Для МЕЛКОГО текста (11–14px)
        // использовать .text — тёмные оттенки с AA-контрастом 4.5:1+ и на белом,
        // и на своих soft-подложках.
        ok2:        { DEFAULT: '#0E9F6E', soft: '#E7F8F1', text: '#047857' },
        warn2:      { DEFAULT: '#D97706', soft: '#FCF1DF', text: '#8A5200' },
        bad2:       { DEFAULT: '#E5484D', soft: '#FCEBEC', text: '#B3261E' },
        info2:      { DEFAULT: '#3B82F6', soft: '#E8F0FE', text: '#1D4ED8' },
        // Фиолетовый акцент-партнёр (градиенты, второстепенные акценты)
        violet:     { DEFAULT: '#8B5CF6', soft: '#F1ECFE' },
        // === Legacy aliases ===
        canvas:    '#EEF1F8',
        page:      '#ffffff',
        line:      '#E2E5EF',
        lineHover: '#C7CCDC',
        sidebar: {
          bg:      '#1A1B2E',
          hover:   '#2A2C44',
          active:  '#4F46E5',
          text:    '#A9ADC4',
          textAct: '#ffffff',
        },
        ink: {
          900: '#1A1B2E',
          700: '#34374F',
          500: '#4A4D68',
          400: '#6B6F8A',
          300: '#C7CCDC',
        },
        // accent = ИНДИГО brand. Работает и как яркий фон кнопки, и как читаемый текст.
        accent: {
          DEFAULT:  '#4F46E5',
          hover:    '#4338CA',
          soft:     '#EEF0FF',
          deep:     '#3730A3',
          softText: '#4338CA',
        },
        ok:   { DEFAULT: '#0E9F6E', soft: '#E7F8F1' },
        warn: { DEFAULT: '#D97706', soft: '#FCF1DF', softText: '#8A5200' },
        bad:  { DEFAULT: '#E5484D', soft: '#FCEBEC' },
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
