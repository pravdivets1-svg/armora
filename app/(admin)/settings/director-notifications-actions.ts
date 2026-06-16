'use server';

// Server actions для матрицы «роль × событие» — доступ только директору.
// Возвращают краткий { ok }-ответ и инвалидируют кэш матрицы в push-цепочке.

import { revalidatePath } from 'next/cache';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import {
  EVENT_KEYS,
  type EventKey,
  invalidateRolePrefsCache,
} from '@/lib/notification-events';

const ROLES: Role[] = ['director', 'manager', 'surveyor', 'installer'];

function isValidRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as string[]).includes(v);
}

function isValidEvent(v: unknown): v is EventKey {
  return typeof v === 'string' && (EVENT_KEYS as readonly string[]).includes(v);
}

export async function toggleRolePrefAction(
  role: Role,
  event: EventKey,
  next: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireUser();
  if (me.role !== 'director') return { ok: false, error: 'Только директор' };
  if (!isValidRole(role) || !isValidEvent(event)) {
    return { ok: false, error: 'Неизвестный параметр' };
  }

  // Атомарно: читаем prefs, мерджим, пишем
  const row = await prisma.notificationPref.findUnique({ where: { role } });
  const currentPrefs = ((row?.prefs as Record<string, boolean> | null) ?? {});
  const updatedPrefs = { ...currentPrefs, [event]: next };

  await prisma.notificationPref.upsert({
    where: { role },
    create: { role, prefs: updatedPrefs as any },
    update: { prefs: updatedPrefs as any },
  });

  invalidateRolePrefsCache();
  revalidatePath('/settings');
  return { ok: true };
}
