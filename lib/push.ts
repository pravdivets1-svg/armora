// Серверная отправка Web Push уведомлений.
// VAPID-ключи берём из env (см. .env): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// При первом импорте конфигурируем web-push один раз.

import webpush from 'web-push';
import type { Stage } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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

// Отправить всем директорам — для уведомления «На закрытие»
export async function sendPushToDirectors(payload: PushPayload): Promise<void> {
  const directors = await prisma.user.findMany({
    where: { role: 'director', isActive: true },
    select: { id: true },
  });
  await sendPushToUsers(directors.map((u) => u.id), payload);
}

// Отправить директорам и менеджерам — для входящих заявок с сайта
export async function sendPushToStaff(payload: PushPayload): Promise<void> {
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
      sendPushToUser(after.surveyorId, {
        title: `Замер · № ${after.number}`,
        body: `${after.clientName} · ${after.clientAddress} · ${fmtWhen(after.surveyAt)}`,
        url,
        tag: `order-${after.id}-survey`,
      }),
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
      sendPushToUser(after.installerId, {
        title: `Установка · № ${after.number}`,
        body: `${after.clientName} · ${after.clientAddress} · ${fmtWhen(after.installAt)}`,
        url,
        tag: `order-${after.id}-install`,
      }),
    );
  }

  // 3) Заказ подан на закрытие — пуш директорам
  const becamePendingClosure =
    before?.stage !== 'pending_closure' && after.stage === 'pending_closure';
  if (becamePendingClosure) {
    tasks.push(
      sendPushToDirectors({
        title: `На закрытие · № ${after.number}`,
        body: `${after.clientName} ожидает подтверждения`,
        url: '/closures',
        tag: `order-${after.id}-closure`,
      }),
    );
  }

  await Promise.allSettled(tasks);
}
