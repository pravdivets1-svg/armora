// Cron-движок напоминаний о ближайших замерах/установках.
//
// Логика:
//   • каждую минуту проверяем заказы с surveyAt/installAt в окне [now+2:55, now+3:05] и [now+23:55, now+24:05]
//   • для каждого такого заказа смотрим: отправляли ли уже это напоминание (OrderReminderSent)
//   • если нет, и роль получателя разрешает событие (NotificationPref) — отправляем push, помечаем как отправленное
//
// Окна 10-минутные потому что cron'у разрешено пропускать запуски (рестарт контейнера и т.п.).
// Уникальность (orderId, kind) в БД гарантирует, что повтор не пройдёт.
//
// ВАЖНО про prefs-skip:
//   Если у получателя выключен event в NotificationPref — мы НЕ создаём OrderReminderSent
//   и НЕ шлём push. Это значит, что если директор потом ВКЛЮЧИТ event — окно уже закрыто,
//   напоминание никогда не прилетит для этого заказа. Поведение by design: пользователь
//   попросил «не беспокоить», мы и не беспокоим. Альтернатива (catch-up при включении
//   event'а) — сложнее и шумнее, не реализуем без явного запроса.
//
// При переносе даты замера/установки и при закрытии заказа соответствующие записи
// OrderReminderSent чистятся в app/(admin)/orders/actions.ts — иначе новое окно
// напоминаний было бы заблокировано unique-индексом старых записей.

import { prisma } from '@/lib/prisma';
import { sendPushToUser, broadcastPushForEvent } from '@/lib/push';
import { isEventAllowed, type EventKey } from '@/lib/notification-events';

type ReminderKind =
  | 'survey_24h' | 'survey_3h'
  | 'install_24h' | 'install_3h'
  | 'control_production' | 'control_installed' | 'control_pending_closure';

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

// =====================================================================
// Контрольные напоминания: «заказ застрял на стадии N дней»
// =====================================================================
// Cron-аналог: каждую минуту смотрим заказы на «опасных» стадиях с
// updatedAt старше порога — отправляем broadcast push по матрице
// (тем у кого event включён) и помечаем kind='control_*' чтоб не слать
// повторно. Конфиг (вкл/выкл + порог) читается из ControlReminderConfig
// (singleton id='default').

type ControlSpec = {
  stage: 'production' | 'installed' | 'pending_closure';
  kind:  Extract<ReminderKind, 'control_production' | 'control_installed' | 'control_pending_closure'>;
  event: EventKey;
  title: string;
  body:  (clientName: string, days: number) => string;
};

const CONTROL_SPECS: ControlSpec[] = [
  {
    stage: 'production',
    kind:  'control_production',
    event: 'productionStale',
    title: 'Заказ долго в производстве',
    body: (name, days) => `${name} · ${days} дней без движения`,
  },
  {
    stage: 'installed',
    kind:  'control_installed',
    event: 'installedNoClose',
    title: 'Установлен, но не закрыт',
    body: (name, days) => `${name} · ${days} дней после установки`,
  },
  {
    stage: 'pending_closure',
    kind:  'control_pending_closure',
    event: 'pendingClosureStale',
    title: 'Заказ ждёт подтверждения',
    body: (name, days) => `${name} · ${days} дней в очереди на закрытие`,
  },
];

async function processControlReminders(): Promise<void> {
  const cfg = await prisma.controlReminderConfig.findUnique({ where: { id: 'default' } });
  if (!cfg) return;

  const now = Date.now();

  const enabled: Record<typeof CONTROL_SPECS[number]['kind'], { on: boolean; days: number }> = {
    control_production:      { on: cfg.productionStaleEnabled,     days: cfg.productionStaleDays },
    control_installed:       { on: cfg.installedNoCloseEnabled,    days: cfg.installedNoCloseDays },
    control_pending_closure: { on: cfg.pendingClosureStaleEnabled, days: cfg.pendingClosureStaleDays },
  };

  for (const spec of CONTROL_SPECS) {
    const c = enabled[spec.kind];
    if (!c.on || c.days <= 0) continue;
    const cutoff = new Date(now - c.days * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: {
        stage: spec.stage,
        updatedAt: { lt: cutoff },
        remindersSent: { none: { kind: spec.kind } },
      },
      select: { id: true, number: true, clientName: true, updatedAt: true },
    });

    for (const o of orders) {
      const ageDays = Math.floor((now - o.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
      try {
        await broadcastPushForEvent({
          title: `${spec.title} · № ${o.number}`,
          body: spec.body(o.clientName, ageDays),
          url: `/orders/${o.id}`,
          tag: `order-${o.id}-${spec.kind}`,
        }, spec.event);
        await prisma.orderReminderSent.create({
          data: { orderId: o.id, kind: spec.kind },
        });
      } catch (e) {
        // unique-индекс отбил дубль — норм
        console.warn('[reminder] control', spec.kind, o.id, e);
      }
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
      processControlReminders(),
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
