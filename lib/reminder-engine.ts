// Cron-движок напоминаний о ближайших замерах/установках.
//
// Логика:
//   • каждую минуту проверяем заказы с surveyAt/installAt в окне [now+3:55, now+4:05] и [now+23:55, now+24:05]
//   • для каждого такого заказа смотрим: отправляли ли уже это напоминание (OrderReminderSent)
//   • если нет, и роль получателя разрешает событие (NotificationPref) — отправляем push, помечаем как отправленное
//
// Окна 10-минутные потому что cron'у разрешено пропускать запуски (рестарт контейнера и т.п.).
// Уникальность (orderId, kind) в БД гарантирует, что повтор не пройдёт.

import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push';
import { isEventAllowed } from '@/lib/notification-events';

type ReminderKind = 'survey_24h' | 'survey_3h' | 'install_24h' | 'install_3h';

const WINDOW_MIN = 5; // ± от точного интервала, в минутах

function makeWindow(hours: number) {
  const center = Date.now() + hours * 60 * 60 * 1000;
  return {
    from: new Date(center - WINDOW_MIN * 60 * 1000),
    to:   new Date(center + WINDOW_MIN * 60 * 1000),
  };
}

async function processSurveyWindow(hours: 24 | 3) {
  const { from, to } = makeWindow(hours);
  const kind: ReminderKind = hours === 24 ? 'survey_24h' : 'survey_3h';
  const event = hours === 24 ? 'surveyReminder24h' : 'surveyReminder3h';

  const orders = await prisma.order.findMany({
    where: {
      stage: 'survey_scheduled',
      surveyAt: { gte: from, lte: to },
      surveyorId: { not: null },
      remindersSent: { none: { kind } },
    },
    select: {
      id: true, number: true, clientName: true, clientAddress: true,
      surveyAt: true, surveyorId: true,
      surveyor: { select: { id: true, role: true } },
    },
  });

  for (const o of orders) {
    if (!o.surveyorId || !o.surveyor) continue;
    const allowed = await isEventAllowed(o.surveyor.role, event as any);
    if (!allowed) continue;
    try {
      await sendPushToUser(o.surveyorId, {
        title: `Скоро замер · № ${o.number}`,
        body: `${hours === 24 ? 'Завтра' : 'Через 3 часа'} · ${o.clientName} · ${o.clientAddress}`,
        url: `/orders/${o.id}`,
        tag: `order-${o.id}-${kind}`,
      });
      await prisma.orderReminderSent.create({
        data: { orderId: o.id, kind },
      });
    } catch (e) {
      // Уникальный индекс мог отбить дубль — это норм, тихо логируем
      console.warn('[reminder] survey', kind, o.id, e);
    }
  }
}

async function processInstallWindow(hours: 24 | 3) {
  const { from, to } = makeWindow(hours);
  const kind: ReminderKind = hours === 24 ? 'install_24h' : 'install_3h';
  const event = hours === 24 ? 'installReminder24h' : 'installReminder3h';

  const orders = await prisma.order.findMany({
    where: {
      stage: 'ready_to_install',
      installAt: { gte: from, lte: to },
      installerId: { not: null },
      remindersSent: { none: { kind } },
    },
    select: {
      id: true, number: true, clientName: true, clientAddress: true,
      installAt: true, installerId: true,
      installer: { select: { id: true, role: true } },
    },
  });

  for (const o of orders) {
    if (!o.installerId || !o.installer) continue;
    const allowed = await isEventAllowed(o.installer.role, event as any);
    if (!allowed) continue;
    try {
      await sendPushToUser(o.installerId, {
        title: `Скоро установка · № ${o.number}`,
        body: `${hours === 24 ? 'Завтра' : 'Через 3 часа'} · ${o.clientName} · ${o.clientAddress}`,
        url: `/orders/${o.id}`,
        tag: `order-${o.id}-${kind}`,
      });
      await prisma.orderReminderSent.create({
        data: { orderId: o.id, kind },
      });
    } catch (e) {
      console.warn('[reminder] install', kind, o.id, e);
    }
  }
}

export async function runRemindersOnce(): Promise<void> {
  try {
    await Promise.all([
      processSurveyWindow(24),
      processSurveyWindow(3),
      processInstallWindow(24),
      processInstallWindow(3),
    ]);
  } catch (e) {
    console.warn('[reminder] tick failed', e);
  }
}

// =====================================================================
// Долгоживущий setInterval — вызывается из instrumentation.ts при старте
// =====================================================================

let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function startReminderLoop() {
  if (started) return;
  if (process.env.NODE_ENV !== 'production' && process.env.REMINDER_LOOP !== 'on') {
    // В dev режиме не крутим — мешает hot reload и шумит в логах
    return;
  }
  started = true;
  console.log('[reminder] loop started, interval 60s');
  // первый прогон через 30 секунд (даём приложению полностью встать)
  setTimeout(() => { void runRemindersOnce(); }, 30_000);
  timer = setInterval(() => { void runRemindersOnce(); }, 60_000);
}

export function stopReminderLoop() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
