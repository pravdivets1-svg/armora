// Middleware: один проход на каждый запрос, дешёвый (читает только JWT-cookie).
//
// Логика доступа:
// - /order/[token]    — публичный, пускаем всех
// - /login            — публичный
// - /api/auth/*       — публичный (NextAuth сам управляет)
// - /closures         — только director
// - всё остальное     — нужна сессия; иначе редирект на /login

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Маршруты, доступные только определённым ролям.
// Точное соответствие или префикс с "/" — чтобы /closures-foo не считался /closures.
const ROLE_GUARDED: Array<{ prefix: string; roles: ReadonlyArray<string> }> = [
  { prefix: '/closures', roles: ['director'] },
  { prefix: '/users',    roles: ['director'] },
  { prefix: '/orders/new', roles: ['director', 'manager'] },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Публичные пути
  const isPublic =
    pathname.startsWith('/order/') ||  // клиентская страница
    pathname === '/login' ||
    pathname.startsWith('/api/auth/');

  if (isPublic) return NextResponse.next();

  // Всё остальное — только для залогиненных
  if (!req.auth) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Роль-чек на edge: дешевле, чем грузить страницу и отбивать в layout.
  // Окончательная защита всё равно в page.tsx (requireRole) — это второй уровень.
  const role = (req.auth.user as { role?: string } | undefined)?.role;
  for (const guard of ROLE_GUARDED) {
    if (pathname === guard.prefix || pathname.startsWith(guard.prefix + '/')) {
      if (!role || !guard.roles.includes(role)) {
        return NextResponse.redirect(new URL('/orders', req.url));
      }
    }
  }

  return NextResponse.next();
});

// Не перехватываем статику и оптимизатор изображений
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
