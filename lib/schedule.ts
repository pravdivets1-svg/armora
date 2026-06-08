// Серверная выборка событий расписания с правильной машиной состояний.
//
// ПРАВИЛО: один заказ = одна точка во времени.
//   - Замер показывается ТОЛЬКО когда stage === 'survey_scheduled'.
//   - Установка показывается ТОЛЬКО когда stage === 'ready_to_install'
//     (на этом этапе дверь готова и выезд назначен).
//   - В виджет «В производстве» попадают: production + ready_to_install
//     (заказ физически у нас в работе, даже если установка уже назначена).
//
// Просрочка:
//   - День назначения — НЕ просрочка (есть весь день, чтобы внести инфу).
//   - С полуночи следующего МСК-дня — просрочка.
//   - daysOverdue: 0 = сегодня/будущее, 1 = вчера, 2+ = старше → плавная цветовая шкала.

import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';
import { isStaff } from '@/lib/auth-helpers';
import { mskDayStart } from '@/lib/format';

export type EventKind = 'survey' | 'install';

export type ScheduleEvent = {
  id: string;
  orderId: string;
  number: number;
  kind: EventKind;
  at: Date;
  isOverdue: boolean;
  /** Сколько целых МСК-дней назад событие. 0 = сегодня/будущее, 1 = вчера, 2 = позавчера, … */
  daysOverdue: number;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  worker: { id: string; fullName: string } | null;
};

export type ScheduleSummary = {
  surveysCount: number;
  installsCount: number;
  todayCount: number;
  overdueCount: number;
  productionCount: number;
};

const PAST_DAYS = 7;
const FUTURE_DAYS = 30;

export async function loadSchedule(
  me: { id: string; role: Role },
  filter?: { workerId?: string },
) {
  const now = new Date();
  const from = new Date(now.getTime() - PAST_DAYS * 24 * 60 * 60 * 1000);
  const to   = new Date(now.getTime() + FUTURE_DAYS * 24 * 60 * 60 * 1000);

  const surveyorWhere =
    !isStaff(me.role) ? { surveyorId: me.id } :
    filter?.workerId  ? { surveyorId: filter.workerId } : {};

  const installerWhere =
    !isStaff(me.role) ? { installerId: me.id } :
    filter?.workerId  ? { installerId: filter.workerId } : {};

  const [surveyOrders, installOrders, productionCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        stage: 'survey_scheduled',
        surveyAt: { not: null, gte: from, lte: to },
        ...surveyorWhere,
      },
      select: {
        id: true, number: true, surveyAt: true,
        clientName: true, clientPhone: true, clientAddress: true,
        surveyor: { select: { id: true, fullName: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        stage: 'ready_to_install',
        installAt: { not: null, gte: from, lte: to },
        ...installerWhere,
      },
      select: {
        id: true, number: true, installAt: true,
        clientName: true, clientPhone: true, clientAddress: true,
        installer: { select: { id: true, fullName: true } },
      },
    }),
    isStaff(me.role)
      ? prisma.order.count({ where: { stage: { in: ['production', 'ready_to_install'] } } })
      : Promise.resolve(0),
  ]);

  const todayStart = mskDayStart(now);
  const DAY_MS = 24 * 60 * 60 * 1000;
  function daysOverdueOf(at: Date): number {
    const diff = todayStart.getTime() - mskDayStart(at).getTime();
    return diff > 0 ? Math.round(diff / DAY_MS) : 0;
  }

  const surveys: ScheduleEvent[] = surveyOrders.map((o) => {
    const d = daysOverdueOf(o.surveyAt!);
    return {
      id: `${o.id}:s`,
      orderId: o.id,
      number: o.number,
      kind: 'survey' as const,
      at: o.surveyAt!,
      isOverdue: d > 0,
      daysOverdue: d,
      clientName: o.clientName,
      clientPhone: o.clientPhone,
      clientAddress: o.clientAddress,
      worker: o.surveyor ? { id: o.surveyor.id, fullName: o.surveyor.fullName } : null,
    };
  });

  const installs: ScheduleEvent[] = installOrders.map((o) => {
    const d = daysOverdueOf(o.installAt!);
    return {
      id: `${o.id}:i`,
      orderId: o.id,
      number: o.number,
      kind: 'install' as const,
      at: o.installAt!,
      isOverdue: d > 0,
      daysOverdue: d,
      clientName: o.clientName,
      clientPhone: o.clientPhone,
      clientAddress: o.clientAddress,
      worker: o.installer ? { id: o.installer.id, fullName: o.installer.fullName } : null,
    };
  });

  const events = [...surveys, ...installs].sort((a, b) => a.at.getTime() - b.at.getTime());

  // Сводка. Границы суток считаем в МСК (сервер в UTC).
  const today = todayStart;
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const summary: ScheduleSummary = {
    surveysCount: surveys.filter((e) => !e.isOverdue).length,
    installsCount: installs.filter((e) => !e.isOverdue).length,
    todayCount: events.filter(
      (e) => e.at.getTime() >= today.getTime() && e.at.getTime() < tomorrow.getTime(),
    ).length,
    overdueCount: events.filter((e) => e.isOverdue).length,
    productionCount: productionCount,
  };

  return { events, summary, now };
}
