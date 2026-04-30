// Корневой layout. Подключает шрифт Inter и глобальные стили Arctic Frost.

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
