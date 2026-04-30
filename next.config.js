/** @type {import('next').NextConfig} */

// Security headers: применяются ко всем маршрутам.
// CSP сделан минимально жёстким: разрешаем self + inline-стили (Tailwind / Next inline)
// и inline-скрипты (Next hydration), data: для favicon/иконок.
// frame-ancestors 'none' — защита от clickjacking (X-Frame-Options тоже выставлен).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  // HSTS: 1 год + preload. У нас HTTPS (Timeweb даёт TLS),
  // включаем чтобы браузер сам форсил https.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy',   value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverActions: { bodySizeLimit: '1mb' },
  },
  async headers() {
    return [
      {
        // На все маршруты, кроме статики/изображений (их Next и так отдаёт с правильными заголовками).
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
