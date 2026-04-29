import type { Config } from 'tailwindcss';

/**
 * Design system Armora — premium B2B, dark-first, light supported.
 * Все цвета через CSS variables в globals.css → одна точка правды.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-inter)',  'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)',   'ui-monospace',  'SFMono-Regular',          'monospace'],
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Surfaces
        base:        'rgb(var(--color-base) / <alpha-value>)',
        surface:     'rgb(var(--color-surface) / <alpha-value>)',
        elevated:    'rgb(var(--color-elevated) / <alpha-value>)',
        border:      'rgb(var(--color-border) / <alpha-value>)',
        borderHover: 'rgb(var(--color-border-hover) / <alpha-value>)',

        // Text
        fg:        'rgb(var(--color-fg) / <alpha-value>)',
        muted:     'rgb(var(--color-muted) / <alpha-value>)',
        subtle:    'rgb(var(--color-subtle) / <alpha-value>)',

        // Accent (steel-blue / indigo)
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover:   'rgb(var(--color-accent-hover) / <alpha-value>)',
          soft:    'rgb(var(--color-accent-soft) / <alpha-value>)',
          fg:      'rgb(var(--color-accent-fg) / <alpha-value>)',
        },

        // Semantic
        ok:   { DEFAULT: 'rgb(var(--color-ok)   / <alpha-value>)', soft: 'rgb(var(--color-ok-soft)   / <alpha-value>)' },
        warn: { DEFAULT: 'rgb(var(--color-warn) / <alpha-value>)', soft: 'rgb(var(--color-warn-soft) / <alpha-value>)' },
        bad:  { DEFAULT: 'rgb(var(--color-bad)  / <alpha-value>)', soft: 'rgb(var(--color-bad-soft)  / <alpha-value>)' },

        // Legacy (постепенно уберём после миграции экранов)
        canvas:    'rgb(var(--color-base) / <alpha-value>)',
        page:      'rgb(var(--color-surface) / <alpha-value>)',
        line:      'rgb(var(--color-border) / <alpha-value>)',
        lineHover: 'rgb(var(--color-border-hover) / <alpha-value>)',
        ink: {
          900: 'rgb(var(--color-fg) / <alpha-value>)',
          700: 'rgb(var(--color-fg) / 0.85)',
          500: 'rgb(var(--color-muted) / <alpha-value>)',
          400: 'rgb(var(--color-subtle) / <alpha-value>)',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
      },
      spacing: {
        18: '4.5rem',
      },
      fontSize: {
        '2xs': ['11px',  { lineHeight: '1.4', letterSpacing: '0.04em' }],
        xs:    ['12px',  { lineHeight: '1.45' }],
        sm:    ['13px',  { lineHeight: '1.5' }],
        base:  ['14px',  { lineHeight: '1.5' }],
        md:    ['15px',  { lineHeight: '1.5' }],
        lg:    ['16px',  { lineHeight: '1.5' }],
        xl:    ['20px',  { lineHeight: '1.4',  letterSpacing: '-0.01em', fontWeight: '600' }],
        '2xl': ['24px',  { lineHeight: '1.3',  letterSpacing: '-0.02em', fontWeight: '600' }],
        '3xl': ['32px',  { lineHeight: '1.2',  letterSpacing: '-0.025em', fontWeight: '600' }],
        display: ['44px',{ lineHeight: '1.05', letterSpacing: '-0.03em',  fontWeight: '600' }],
        h1:    ['28px',  { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      boxShadow: {
        // Мягкие, низкоконтрастные
        e1: '0 1px 2px rgba(0,0,0,0.06)',
        e2: '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
        e3: '0 4px 12px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.16)',
        ring: '0 0 0 4px rgb(var(--color-accent) / 0.18)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--color-accent-2)) 100%)',
        'noise': "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-up':    { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in':   { '0%': { opacity: '0', transform: 'scale(0.96)' },     '100%': { opacity: '1', transform: 'scale(1)' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in':  'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up':  'fade-up 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer':  'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
