import type { Config } from 'tailwindcss';

// Modern 2026: тёплый кремовый фон, графитовый текст, индиго-акцент.
// Без свечений/градиентов в карточках. Только бордюры + один цветной CTA.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        canvas:    '#fafaf7',  // тёплый кремовый фон страниц
        page:      '#ffffff',
        line:      '#ececec',
        lineHover: '#dcdcdc',
        ink: {
          900: '#0f0f0f',  // основной
          700: '#404040',
          500: '#737373',
          400: '#a3a3a3',
          300: '#d4d4d4',  // прочерки/disabled-pagination
        },
        accent: {
          // Глубокий индиго — спокойный, профессиональный
          DEFAULT: '#4338ca',
          hover:   '#3730a3',
          soft:    '#eef2ff',
          softText:'#4f46e5',
        },
        ok: { DEFAULT: '#15803d', soft: '#f0fdf4' },
        warn:{ DEFAULT: '#a16207', soft: '#fefce8', softText: '#92400e' },
        bad: { DEFAULT: '#b91c1c', soft: '#fef2f2' },
        // Brand colors сторонних сервисов
        whatsapp:  { DEFAULT: '#25D366', hover: '#128C7E' },
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
      },
      fontSize: {
        // Display sizes — editorial serif (Playfair Display)
        // Используются с классом font-display
        hero:    ['72px', { lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '500' }],
        display: ['56px', { lineHeight: '1.0',  letterSpacing: '-0.03em',  fontWeight: '500' }],
        h1:      ['40px', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '500' }],
        h2:      ['28px', { lineHeight: '1.15', letterSpacing: '-0.02em',  fontWeight: '500' }],
      },
      boxShadow: {
        // Цветные мягкие тени для bento-карточек
        'soft':       '0 1px 2px rgba(15,15,15,0.04), 0 4px 12px -4px rgba(15,15,15,0.06)',
        'soft-lg':    '0 2px 4px rgba(15,15,15,0.04), 0 12px 32px -8px rgba(15,15,15,0.10)',
        'accent-glow':'0 8px 32px -12px rgba(67,56,202,0.35), 0 2px 6px -2px rgba(67,56,202,0.15)',
        'ok-glow':    '0 8px 32px -12px rgba(21,128,61,0.30)',
        'bad-glow':   '0 8px 32px -12px rgba(185,28,28,0.30)',
      },
    },
  },
  plugins: [],
};

export default config;
