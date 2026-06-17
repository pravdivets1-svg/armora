// Серверная отправка Web Push уведомлений + MAX Bot API.
// MAX-уведомления отправляются параллельно с Web Push — silent skip если MAX_BOT_TOKEN не задан.
// VAPID-ключи берём из env (см. .env): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// При первом импорте конфигурируем web-push один раз.

import webpush from 'web-push';
import type { Stage } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  notifySurveyorMax,
  notifyInstallerMax,
  notifyClosureMax,
} from '@/lib/max';
import { filterUsersByEventAllowed, isEventAllowed, type EventKey } from '@/lib/notification-events';

const PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT     = process.env.VAPID_SUBJECT ?? 'mailto:dev@armora.local';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    console.warn('[push] VAPID keys not set — push notifications disabled');
    return false;
  }
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;       // куда вести при клике (по умолчанию /orders)
  tag?: string;       // dedupe key — новое сообщение с тем же tag заменит старое
};

// Отправить пуш всем подпискам пользователя. Истёкшие/невалидные эндпоинты удаляем.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      ),
    ),
  );

  // Чистим истёкшие/отозванные подписки (410 Gone, 404)
  const stale: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code === 410 || code === 404) {
        stale.push(subs[i].endpoint);
      } else {
        console.warn('[push] send failed', code, r.reason);
      }
    }
  });
  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
  }
}

// Отправить пуш сразу нескольким пользователям (директора и т.п.)
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}

// Отправить всем у кого включена видимость события (broadcast по матрице).
// Раньше было «sendPushToDirectors» / «sendPushToStaff» с жёстким списком ролей —
// директор не мог расширить рассылку. Теперь любой сотрудник любой роли получит
// push если у него в NotificationPref[role][event] = true.
export async function broadcastPushForEvent(payload: PushPayload, event: EventKey): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, role: true },
  });
  const allowed = await filterUsersByEventAllowed(users, event);
  await sendPushToUsers(allowed.map((u) => u.id), payload);
}

// Алиасы для совместимости с существующими вызовами.
// Семантика теперь определяется в матрице, а не в жёстком списке ролей.
export async function sendPushToDirectors(payload: PushPayload, event?: EventKey): Promise<void> {
  if (event) return broadcastPushForEvent(payload, event);
  // Без указания event — старое поведение (только директора). Не используется в новом коде.
  const directors = await prisma.user.findMany({
    where: { role: 'director', isActive: true },
    select: { id: true },
  });
  await sendPushToUsers(directors.map((u) => u.id), payload);
}

export async function sendPushToStaff(payload: PushPayload, event?: EventKey): Promise<void> {
  if (event) return broadcastPushForEvent(payload, event);
  const staff = await prisma.user.findMany({
    where: { role: { in: ['director', 'manager'] }, isActive: true },
    select: { id: true },
  });
  await sendPushToUsers(staff.map((u) => u.id), payload);
}

// Не оборачивать триггеры в await на критическом пути — глушим ошибки тут.
// Использование: void notifySafe(() => sendPushToUser(id, payload)).
export function notifySafe(fn: () => Promise<void>): Promise<void> {
  return fn().catch((e) => {
    console.warn('[push] notify failed', e);
  });
}

// =====================================================================
// Готовые сообщения для триггеров заказа
// =====================================================================

const TZ = 'Europe/Moscow';
function fmtWhen(d: Date | null): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export type OrderNotifyContext = {
  id: string;
  number: number;
  clientName: string;
  clientAddress: string;
  surveyorId: string | null;
  installerId: string | null;
  surveyAt: Date | null;
  installAt: Date | null;
  stage: Stage;
};

// Решает, кому какой пуш отправить, на основе изменений (before -> after).
// Безопасно вызывать без await — внутри Promise.allSettled через notifySafe.
export async function notifyOrderChanges(
  before: OrderNotifyContext | null,
  after: OrderNotifyContext,
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const url = `/orders/${after.id}`;
  const tasks: Promise<void>[] = [];

  // 1) Замер назначен/переназначен
  const surveyorChanged = before?.surveyorId !== after.surveyorId;
  const surveyAtChanged = (before?.surveyAt?.getTime() ?? 0) !== (after.surveyAt?.getTime() ?? 0);
  if (
    after.stage === 'survey_scheduled' &&
    after.surveyorId &&
    after.surveyAt &&
    (surveyorChanged || surveyAtChanged || !before)
  ) {
    tasks.push(
      (async () => {
        const surveyor = await prisma.user.findUnique({
          where: { id: after.surveyorId! },
          select: { role: true },
        });
        if (!surveyor) return;
        const ok = await isEventAllowed(surveyor.role, 'surveyAssigned');
        if (!ok) return;
        await sendPushToUser(after.surveyorId!, {
          title: `Замер · № ${after.number}`,
          body: `${after.clientName} · ${after.clientAddress} · ${fmtWhen(after.surveyAt!)}`,
          url,
          tag: `order-${after.id}-survey`,
        });
      })(),
    );
    // MAX: берём maxUserId замерщика
    tasks.push(
      prisma.user.findUnique({ where: { id: after.surveyorId }, select: { maxUserId: true } })
        .then((u) => {
          if (u?.maxUserId) {
            return notifySurveyorMax(u.maxUserId, {
              number: after.number,
              clientName: after.clientName,
              clientAddress: after.clientAddress,
              surveyAt: after.surveyAt,
            }, baseUrl);
          }
        })
        .catch((e) => console.warn('[max] surveyor notify error', e)),
    );
  }

  // 2) Установка назначена/переназначена / готова к установке
  const installerChanged = before?.installerId !== after.installerId;
  const installAtChanged = (before?.installAt?.getTime() ?? 0) !== (after.installAt?.getTime() ?? 0);
  const becameReady = before?.stage !== 'ready_to_install' && after.stage === 'ready_to_install';
  if (
    after.stage === 'ready_to_install' &&
    after.installerId &&
    after.installAt &&
    (installerChanged || installAtChanged || becameReady || !before)
  ) {
    tasks.push(
      (async () => {
        const installer = await prisma.user.findUnique({
          where: { id: after.installerId! },
          select: { role: true },
        });
        if (!installer) return;
        const ok = await isEventAllowed(installer.role, 'installAssigned');
        if (!ok) return;
        await sendPushToUser(after.installerId!, {
          title: `Установка · № ${after.number}`,
          body: `${after.clientName} · ${after.clientAddress} · ${fmtWhen(after.installAt!)}`,
          url,
          tag: `order-${after.id}-install`,
        });
      })(),
    );
    // MAX: берём maxUserId установщика
    tasks.push(
      prisma.user.findUnique({ where: { id: after.installerId }, select: { maxUserId: true } })
        .then((u) => {
          if (u?.maxUserId) {
            return notifyInstallerMax(u.maxUserId, {
              number: after.number,
              clientName: after.clientName,
              clientAddress: after.clientAddress,
              installAt: after.installAt,
            }, baseUrl);
          }
        })
        .catch((e) => console.warn('[max] installer notify error', e)),
    );
  }

  // 3) Заказ подан на закрытие — пуш + MAX директорам
  const becamePendingClosure =
    before?.stage !== 'pending_closure' && after.stage === 'pending_closure';
  if (becamePendingClosure) {
    tasks.push(
      sendPushToDirectors({
        title: `На закрытие · № ${after.number}`,
        body: `${after.clientName} ожидает подтверждения`,
        url: '/closures',
        tag: `order-${after.id}-closure`,
      }, 'pendingClosure'),
    );
    // MAX: директоры у которых есть maxUserId
    tasks.push(
      prisma.user.findMany({
        where: { role: 'director', isActive: true, maxUserId: { not: null } },
        select: { maxUserId: true },
      }).then((users) => {
        const ids = users.map((u) => u.maxUserId!);
        if (ids.length > 0) {
          return notifyClosureMax(ids, {
            number: after.number,
            clientName: after.clientName,
          }, baseUrl);
        }
      }).catch((e) => console.warn('[max] closure notify error', e)),
    );
  }

  await Promise.allSettled(tasks);
}
