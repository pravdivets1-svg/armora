// Лимит попыток входа + аудит.
// Правило: 5 неудач за 15 минут (по логину ИЛИ по IP) → блок на 1 час.
// Хранение: таблица login_attempts.
//
// Защита от brute-force и обхода:
//   - Атомарность: используем Postgres advisory-lock на хеш логина, чтобы
//     параллельные запросы не проходили мимо лимита.
//   - reason='blocked' пишется, но в подсчёт неудач НЕ попадает (см. фильтр
//     по reason в getBlockStatus) — иначе атакующий продлевает блок жертвы.
//   - При успехе вызываем resetFailedAttempts() — старые ошибки в окне 15 мин
//     не будут блокировать нормального пользователя.
//   - Очистка: TTL ~30 дней (см. cleanupOldAttempts), вызывается оппортунистически.

import { prisma } from '@/lib/prisma';

const WINDOW_MIN = 15;        // окно подсчёта неудач
const MAX_FAILS = 5;          // лимит неудач за окно
const BLOCK_MIN = 60;         // длительность блока
const RETENTION_DAYS = 30;    // сколько хранить записи

export type AttemptReason = 'ok' | 'bad_credentials' | 'inactive' | 'blocked';

export type BlockStatus = {
  blocked: boolean;
  retryAfterSec?: number;
};

// Нормализация логина: lowercase + trim.
export function normalizeLogin(raw: string): string {
  return raw.toLowerCase().trim();
}

// Postgres advisory-lock ключ: 32-битный int от хеша строки.
// pg_advisory_xact_lock(int) автоматически отпускается в конце транзакции.
function lockKeyFor(s: string): number {
  // Простой 32-битный hash (FNV-1a), детерминированный
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // pg_advisory_xact_lock принимает signed int4; приводим к диапазону
  return h | 0;
}

export async function getBlockStatus(login: string, ip: string | null): Promise<BlockStatus> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);

  // ВАЖНО: считаем только реальные провалы аутентификации.
  // reason='blocked' исключаем — иначе бот сам себе бесконечно продлевает блок жертвы.
  const failReasons = ['bad_credentials', 'inactive'];

  const [byLogin, byIp] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: {
        login,
        ok: false,
        reason: { in: failReasons },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_FAILS,
      select: { createdAt: true },
    }),
    ip
      ? prisma.loginAttempt.findMany({
          where: {
            ip,
            ok: false,
            reason: { in: failReasons },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: 'desc' },
          take: MAX_FAILS,
          select: { createdAt: true },
        })
      : Promise.resolve([] as { createdAt: Date }[]),
  ]);

  const tripped = byLogin.length >= MAX_FAILS ? byLogin : byIp.length >= MAX_FAILS ? byIp : null;
  if (!tripped) return { blocked: false };

  const lastFail = tripped[0].createdAt.getTime();
  const unblockAt = lastFail + BLOCK_MIN * 60_000;
  const remaining = Math.ceil((unblockAt - Date.now()) / 1000);
  if (remaining <= 0) return { blocked: false };
  return { blocked: true, retryAfterSec: remaining };
}

export async function recordAttempt(args: {
  login: string;
  ip: string | null;
  userAgent: string | null;
  ok: boolean;
  reason: AttemptReason;
}): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        login:     args.login,
        ip:        args.ip ?? null,
        userAgent: args.userAgent ?? null,
        ok:        args.ok,
        reason:    args.reason,
      },
    });
  } catch {
    // Аудит не должен ломать вход
  }
}

// При успешном логине гасим неудачи в окне — UX и защита от само-блока
// после серии опечаток с правильным финальным входом.
export async function resetFailedAttempts(login: string): Promise<void> {
  try {
    const since = new Date(Date.now() - WINDOW_MIN * 60_000);
    await prisma.loginAttempt.deleteMany({
      where: {
        login,
        ok: false,
        reason: { in: ['bad_credentials', 'inactive'] },
        createdAt: { gte: since },
      },
    });
  } catch {
    // Аудит не должен ломать вход
  }
}

// Атомарная сессия проверки лимита: блокирует параллельные запросы
// по одному и тому же логину на время текущей транзакции (advisory-lock).
// Внутри callback вызывается getBlockStatus + recordAttempt последовательно
// без race condition.
export async function withLoginLock<T>(login: string, fn: () => Promise<T>): Promise<T> {
  const key = lockKeyFor(`login:${login}`);
  return prisma.$transaction(async (tx) => {
    // pg_advisory_xact_lock(int) — отпустится автоматически в конце транзакции
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${key})`);
    return fn();
  });
}

// Оппортунистическая очистка старых записей. Вызывается изредка из loginAction.
export async function cleanupOldAttempts(): Promise<void> {
  try {
    // Запускаем не каждый раз, а с вероятностью 1%, чтобы не нагружать БД
    if (Math.random() > 0.01) return;
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  } catch {
    // Игнорируем
  }
}

// Человекочитаемое сообщение для пользователя при блоке
export function formatBlockMessage(retryAfterSec: number): string {
  if (retryAfterSec < 60) {
    return `Слишком много неудачных попыток. Попробуйте через ${retryAfterSec} сек.`;
  }
  const min = Math.ceil(retryAfterSec / 60);
  return `Слишком много неудачных попыток. Попробуйте через ${min} мин.`;
}
