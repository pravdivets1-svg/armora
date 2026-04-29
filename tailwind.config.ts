import type { Config } from 'tailwindcss';

// Modern 2026: тёплый кремовый фон, графитовый текст, индиго-акцент.
// Без свечений/градиентов в карточках. Только бордюры + один цветной CTA.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
        },
        accent: {
          // Глубокий индиго — спокойный, профессиональный
          DEFAULT: '#4338ca',
          hover:   '#3730a3',
          soft:    '#eef2ff',
          softText:'#4f46e5',
        },
        ok: { DEFAULT: '#15803d', soft: '#f0fdf4' },
        warn:{ DEFAULT: '#a16207', soft: '#fefce8' },
        bad: { DEFAULT: '#b91c1c', soft: '#fef2f2' },
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
      },
      fontSize: {
        // Display sizes для больших заголовков
        display: ['44px', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],
        h1: ['28px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};

export default config;
