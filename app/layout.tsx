// Корневой layout. Подключает шрифт Inter и глобальные стили Arctic Frost.

import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import '@/lib/sentry-client';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

// Playfair Display — editorial serif с поддержкой кириллицы.
// Используется для display-заголовков страниц и hero-чисел.
// UI-элементы (кнопки, лейблы, body) остаются Inter.
const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Armora',
  description: 'Учёт заказов металлических входных дверей',
  manifest: '/manifest.json',
  applicationName: 'Armora',
  appleWebApp: {
    capable: true,
    title: 'Armora',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
