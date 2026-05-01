'use client';

// Клиентская инициализация Sentry. Импортируется один раз из app/layout.tsx
// через side-effect import. Если SENTRY_DSN не задан в build-time через
// NEXT_PUBLIC_SENTRY_DSN — ничего не делаем (silent skip).

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && typeof window !== 'undefined') {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    environment: process.env.NODE_ENV,
  });
}
