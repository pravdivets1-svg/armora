// Next.js 14 instrumentation hook — вызывается один раз на старте процесса
// (отдельно для node и edge runtime). Здесь мы условно инициализируем Sentry,
// если задан SENTRY_DSN. Без env — silent skip, ничего не отправляется.
//
// Это проще чем sentry.{server,edge,client}.config.ts + withSentryConfig:
// мы не оборачиваем next.config.js (что ломало бы CSP и требовало бы
// auth-токенов для source-maps upload), а просто включаем error reporting.

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}
