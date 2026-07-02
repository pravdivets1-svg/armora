// Корневой layout. Подключает шрифт Inter и глобальные стили Arctic Frost.

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/lib/sentry-client';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
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
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  // Токен app (#F6F7FB): чистый белый давал холодную полосу статус-бара PWA
  // над градиентным фоном приложения.
  themeColor: '#F6F7FB',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
