'use server';

// Server Actions для логина/логаута.
// Использование в форме:  <form action={loginAction}>
//
// Логин-флоу с rate-limit:
//   1) Проверяем, не заблокирован ли логин/IP (5 неудач за 15 мин → блок 1ч)
//   2) Прямо проверяем учётку (bcrypt) — чтобы записать причину в аудит
//   3) При успехе вызываем signIn (он повторит проверку — это ок, быстро)
//   4) Любой исход пишем в login_attempts

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import {
  normalizeLogin,
  getBlockStatus,
  recordAttempt,
  formatBlockMessage,
} from '@/lib/login-rate-limit';

export type LoginState = { error?: string } | undefined;

function clientIp(): string | null {
  const h = headers();
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return h.get('x-real-ip');
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawLogin   = String(formData.get('email') ?? '').trim();
  const password   = String(formData.get('password') ?? '');
  const callbackUrl = String(formData.get('callbackUrl') ?? '/orders');

  if (!rawLogin || !password) {
    return { error: 'Введите логин и пароль' };
  }

  const h = headers();
  const ip = clientIp();
  const userAgent = h.get('user-agent');
  const loginKey = normalizeLogin(rawLogin);

  // 1) Проверка блокировки
  const block = await getBlockStatus(loginKey, ip);
  if (block.blocked) {
    await recordAttempt({ login: loginKey, ip, userAgent, ok: false, reason: 'blocked' });
    return { error: formatBlockMessage(block.retryAfterSec ?? 60 * 60) };
  }

  // 2) Прямая проверка учётки (для аудита и точной причины)
  const email = loginKey.includes('@') ? loginKey : `${loginKey}@armora.local`;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await recordAttempt({ login: loginKey, ip, userAgent, ok: false, reason: 'bad_credentials' });
    return { error: 'Неверный логин или пароль' };
  }
  if (!user.isActive) {
    await recordAttempt({ login: loginKey, ip, userAgent, ok: false, reason: 'inactive' });
    return { error: 'Учётная запись отключена. Обратитесь к директору.' };
  }
  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk) {
    await recordAttempt({ login: loginKey, ip, userAgent, ok: false, reason: 'bad_credentials' });
    return { error: 'Неверный логин или пароль' };
  }

  // 3) Запись успеха ДО signIn (signIn делает throw NEXT_REDIRECT)
  await recordAttempt({ login: loginKey, ip, userAgent, ok: true, reason: 'ok' });

  // 4) NextAuth выставит куку и редиректнет
  try {
    await signIn('credentials', { email, password, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) {
      // Не должно случиться — мы уже проверили выше, но на всякий случай
      return { error: 'Неверный логин или пароль' };
    }
    throw e;
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
  redirect('/login');
}
