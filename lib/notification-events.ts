// Список валидных типов событий-уведомлений + удобные хелперы для UI и сервера.
//
// При добавлении нового события:
//   1. добавить ключ в EVENT_KEYS
//   2. описать его в EVENT_META (label + кто получает)
//   3. в push.ts перед отправкой вызвать isAllowed(role, key)
//   4. UI «Настройки уведомлений» автоматически подхватит новый ключ

import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

export const EVENT_KEYS = [
  'newLead',
  'pendingClosure',
  'surveyAssigned',
  'surveyReminder24h',
  'surveyReminder3h',
  'installAssigned',
  'installReminder24h',
  'installReminder3h',
  // Контрольные напоминания (cron по «застрявшим» заказам)
  'productionStale',
  'installedNoClose',
  'pendingClosureStale',
] as const;

export type EventKey = typeof EVENT_KEYS[number];

export const EVENT_META: Record<EventKey, { label: string; group: 'lead' | 'order' | 'reminder' | 'control' }> = {
  newLead:            { label: 'Новая заявка с сайта',              group: 'lead' },
  pendingClosure:     { label: 'Заказ ждёт подтверждения закрытия', group: 'order' },
  surveyAssigned:     { label: 'Назначен замер',                    group: 'order' },
  installAssigned:    { label: 'Назначена установка',               group: 'order' },
  surveyReminder24h:  { label: 'Замер за 24 часа',                  group: 'reminder' },
  surveyReminder3h:   { label: 'Замер за 3 часа',                   group: 'reminder' },
  installReminder24h: { label: 'Установка за 24 часа',              group: 'reminder' },
  installReminder3h:  { label: 'Установка за 3 часа',               group: 'reminder' },
  productionStale:     { label: 'Заказ долго в производстве',        group: 'control' },
  installedNoClose:    { label: 'Установлена, но не закрыта',        group: 'control' },
  pendingClosureStale: { label: 'Ждёт закрытия слишком долго',       group: 'control' },
};

// Какие события релевантны какой роли — лишние просто скрываются в UI и в логике.
// «newLead» добавлен в список замерщика чтобы директор мог включить ему оповещения
// о заявках прямо из базового вида матрицы (по дефолту flag = false).
export const ROLE_RELEVANT: Record<Role, EventKey[]> = {
  director:  ['newLead', 'pendingClosure', 'productionStale', 'installedNoClose', 'pendingClosureStale'],
  manager:   ['newLead', 'productionStale', 'installedNoClose'],
  surveyor:  ['newLead', 'surveyAssigned', 'surveyReminder24h', 'surveyReminder3h'],
  installer: ['installAssigned', 'installReminder24h', 'installReminder3h', 'installedNoClose'],
};

// Defaults используем если в БД ещё нет записи для роли (например после первой
// раскатки миграции ещё не прошёл seed). Стараемся не блокировать критичные пуши.
const ROLE_DEFAULTS: Record<Role, Record<EventKey, boolean>> = {
  director: {
    newLead: true, pendingClosure: true,
    surveyAssigned: false, surveyReminder24h: false, surveyReminder3h: false,
    installAssigned: false, installReminder24h: false, installReminder3h: false,
    productionStale: true, installedNoClose: true, pendingClosureStale: true,
  },
  manager: {
    newLead: true, pendingClosure: false,
    surveyAssigned: false, surveyReminder24h: false, surveyReminder3h: false,
    installAssigned: false, installReminder24h: false, installReminder3h: false,
    productionStale: true, installedNoClose: true, pendingClosureStale: false,
  },
  surveyor: {
    newLead: false, pendingClosure: false,
    surveyAssigned: true, surveyReminder24h: true, surveyReminder3h: true,
    installAssigned: false, installReminder24h: false, installReminder3h: false,
    productionStale: false, installedNoClose: false, pendingClosureStale: false,
  },
  installer: {
    newLead: false, pendingClosure: false,
    surveyAssigned: false, surveyReminder24h: false, surveyReminder3h: false,
    installAssigned: true, installReminder24h: true, installReminder3h: true,
    productionStale: false, installedNoClose: true, pendingClosureStale: false,
  },
};

// Кэш на 60 сек, чтобы каждый push не дёргал БД на чтение.
let cache: { at: number; data: Record<Role, Record<string, boolean>> } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function getRolePrefs(): Promise<Record<Role, Record<string, boolean>>> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;
  const rows = await prisma.notificationPref.findMany();
  const map: Record<Role, Record<string, boolean>> = {
    director: {}, manager: {}, surveyor: {}, installer: {},
  };
  for (const r of rows) {
    map[r.role] = (r.prefs as Record<string, boolean>) ?? {};
  }
  cache = { at: now, data: map };
  return map;
}

export function invalidateRolePrefsCache() {
  cache = null;
}

/** Сервер использует это перед каждой отправкой push. */
export async function isEventAllowed(role: Role, key: EventKey): Promise<boolean> {
  const map = await getRolePrefs();
  const rolePrefs = map[role];
  if (rolePrefs && key in rolePrefs) return !!rolePrefs[key];
  return ROLE_DEFAULTS[role][key];
}

/** Сразу для нескольких ролей (не делает N запросов в БД). */
export async function filterUsersByEventAllowed<T extends { role: Role }>(
  users: T[],
  key: EventKey,
): Promise<T[]> {
  const map = await getRolePrefs();
  return users.filter((u) => {
    const rp = map[u.role];
    if (rp && key in rp) return !!rp[key];
    return ROLE_DEFAULTS[u.role][key];
  });
}
