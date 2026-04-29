// Middleware: один проход на каждый запрос, дешёвый (читает только JWT-cookie).
//
// Логика доступа:
// - /order/[token]    — публичный, пускаем всех
// - /login            — публичный
// - /api/auth/*       — публичный (NextAuth сам управляет)
// - всё остальное     — нужна сессия; иначе редирект на /login
// - /(role-guarded)   — роль проверяется отдельно в layout/page (ниже)

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

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

  return NextResponse.next();
});

// Не перехватываем статику и оптимизатор изображений
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
