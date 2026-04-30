'use server';

// Server Actions для логина/логаута.
// Использование в форме:  <form action={loginAction}>
//
// Логин-флоу с rate-limit и защитой от тайминга:
//   1) Под advisory-lock'ом по логину (защита от race condition):
//      - проверяем блок (5 неудач за 15 мин → 1ч)
//      - проверяем учётку и bcrypt (всегда выполняем bcrypt — даже если юзера нет,
//        прогоняем по фиктивному хешу → защита от user enumeration по таймингу)
//      - пишем результат в аудит
//      - при успехе чистим старые провалы
//   3) При успехе вызываем signIn (он повторит bcrypt — это плата за чистый
//      контракт NextAuth; компенсируется тем, что неудачи отсекаются ДО signIn).

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
  resetFailedAttempts,
  withLoginLock,
  cleanupOldAttempts,
  formatBlockMessage,
} from '@/lib/login-rate-limit';

export type LoginState = { error?: string } | undefined;

// Заранее посчитанный bcrypt-хеш для несуществующих пользователей.
// Нужен, чтобы время ответа при !user было ~таким же, как при user (bcrypt.compare ~150мс).
// Иначе атакующий по тайму отличает существующие логины от несуществующих.
// Сам пароль в проде никому не известен, его проверка всегда даст false.
const DUMMY_HASH = '$2a$10$uZhq6FwW2N/sBe34yKbLdeyK5c4flCzNO5JMWoKUf3CFQCRQSckyy';

// Берём IP из заголовков. ВАЖНО: на Timeweb перед нами reverse proxy,
// XFF может быть подделан клиентом и иметь вид "fake1, fake2, real_proxy_ip".
// Берём ПОСЛЕДНИЙ адрес в цепочке — это адрес ближайшего к нам прокси,
// которому мы доверяем. Подделать его клиент не может (его подставляет наш прокси).
function clientIp(): string | null {
  const h = headers();
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return h.get('x-real-ip');
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawLogin = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const callbackUrl = String(formData.get('callbackUrl') ?? '/orders');

  if (!rawLogin || !password) {
    return { error: 'Введите логин и пароль' };
  }

  const h = headers();
  const ip = clientIp();
  const userAgent = h.get('user-agent');
  const loginKey = normalizeLogin(rawLogin);

  // Оппортунистическая чистка старых записей (1% запросов)
  await cleanupOldAttempts();

  // Под advisory-lock'ом — атомарная проверка лимита + запись аудита.
  // Параллельные запросы с тем же логином встают в очередь.
  const result = await withLoginLock(loginKey, async (): Promise<
    | { kind: 'blocked'; message: string }
    | { kind: 'fail'; message: string }
    | { kind: 'ok'; email: string }
  > => {
    // 1) Проверка блокировки
    const block = await getBlockStatus(loginKey, ip);
    if (block.blocked) {
      await recordAttempt({ login: loginKey, ip, userAgent, ok: false, reason: 'blocked' });
      return { kind: 'blocked', message: formatBlockMessage(block.retryAfterSec ?? 60 * 60) };
    }

    // 2) Поиск пользователя + проверка пароля. bcrypt прогоняем ВСЕГДА,
    //    даже если user нет — иначе тайминг выдаёт существование логина.
    const email = loginKey.includes('@') ? loginKey : `${loginKey}@armora.local`;
    const user = await prisma.user.findUnique({ where: { email } });

    const hashToCheck = user?.password ?? DUMMY_HASH;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      await recordAttempt({ login: loginKey, ip, userAgent, ok: false, reason: 'bad_credentials' });
      return { kind: 'fail', message: 'Неверный логин или пароль' };
    }
    if (!user.isActive) {
      await recordAttempt({ login: loginKey, ip, userAgent, ok: false, reason: 'inactive' });
      return { kind: 'fail', message: 'Учётная запись отключена. Обратитесь к директору.' };
    }

    // Успех — гасим старые провалы (UX + защита от само-блока)
    await recordAttempt({ login: loginKey, ip, userAgent, ok: true, reason: 'ok' });
    await resetFailedAttempts(loginKey);
    return { kind: 'ok', email };
  });

  if (result.kind === 'blocked' || result.kind === 'fail') {
    return { error: result.message };
  }

  // signIn делает свой bcrypt и кидает NEXT_REDIRECT при успехе.
  // Это второй bcrypt — компромисс ради совместимости с NextAuth контрактом.
  try {
    await signIn('credentials', { email: result.email, password, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) {
      // Не должно случиться — мы уже проверили выше
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
