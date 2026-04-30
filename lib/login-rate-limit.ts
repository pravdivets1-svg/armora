// Лимит попыток входа + аудит.
// Правило: 5 неудач за 15 минут (по логину ИЛИ по IP) → блок на 1 час.
// Хранение: таблица login_attempts.

import { prisma } from '@/lib/prisma';

const WINDOW_MIN = 15;        // окно подсчёта неудач
const MAX_FAILS = 5;          // лимит неудач за окно
const BLOCK_MIN = 60;         // длительность блока

export type AttemptReason = 'ok' | 'bad_credentials' | 'inactive' | 'blocked';

export type BlockStatus = {
  blocked: boolean;
  // секунд до разблокировки (если blocked)
  retryAfterSec?: number;
};

// Нормализация логина: lowercase + trim. Для совместимости с auth.ts.
export function normalizeLogin(raw: string): string {
  return raw.toLowerCase().trim();
}

export async function getBlockStatus(login: string, ip: string | null): Promise<BlockStatus> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);

  // Считаем последние неудачи отдельно по логину и по IP
  const [byLogin, byIp] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: { login, ok: false, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: MAX_FAILS,
      select: { createdAt: true },
    }),
    ip
      ? prisma.loginAttempt.findMany({
          where: { ip, ok: false, createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: MAX_FAILS,
          select: { createdAt: true },
        })
      : Promise.resolve([] as { createdAt: Date }[]),
  ]);

  const tripped = byLogin.length >= MAX_FAILS ? byLogin : byIp.length >= MAX_FAILS ? byIp : null;
  if (!tripped) return { blocked: false };

  // Блок длится BLOCK_MIN с момента самой свежей неудачи
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

// Человекочитаемое сообщение для пользователя при блоке
export function formatBlockMessage(retryAfterSec: number): string {
  const min = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Слишком много неудачных попыток. Попробуйте через ${min} мин.`;
}
