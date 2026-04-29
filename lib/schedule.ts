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
//   - Просрочен замер  = stage === 'survey_scheduled'  И surveyAt < сейчас
//   - Просрочена устан = stage === 'ready_to_install'  И installAt < сейчас

import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';
import { isStaff } from '@/lib/auth-helpers';

export type EventKind = 'survey' | 'install';

export type ScheduleEvent = {
  id: string;
  orderId: string;
  number: number;
  kind: EventKind;
  at: Date;
  isOverdue: boolean;
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

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

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

  const surveys: ScheduleEvent[] = surveyOrders.map((o) => ({
    id: `${o.id}:s`,
    orderId: o.id,
    number: o.number,
    kind: 'survey',
    at: o.surveyAt!,
    isOverdue: o.surveyAt!.getTime() < now.getTime(),
    clientName: o.clientName,
    clientPhone: o.clientPhone,
    clientAddress: o.clientAddress,
    worker: o.surveyor ? { id: o.surveyor.id, fullName: o.surveyor.fullName } : null,
  }));

  const installs: ScheduleEvent[] = installOrders.map((o) => ({
    id: `${o.id}:i`,
    orderId: o.id,
    number: o.number,
    kind: 'install',
    at: o.installAt!,
    isOverdue: o.installAt!.getTime() < now.getTime(),
    clientName: o.clientName,
    clientPhone: o.clientPhone,
    clientAddress: o.clientAddress,
    worker: o.installer ? { id: o.installer.id, fullName: o.installer.fullName } : null,
  }));

  const events = [...surveys, ...installs].sort((a, b) => a.at.getTime() - b.at.getTime());

  // Сводка
  const today = dayStart(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
