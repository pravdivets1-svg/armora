// Утилиты для записи и форматирования событий заказа.
// Используются server-actions: после update сравниваем before/after,
// генерируем массив событий, пишем createMany'ем — атомарно.

import type { Order, OrderEventKind, Stage, Role } from '@prisma/client';
import { STAGE_LABEL } from '@/lib/labels';
import { fmtMoney, fmtDateTime } from '@/lib/format';

export type OrderEventInput = {
  orderId: string;
  authorId: string | null;
  kind: OrderEventKind;
  summary: string;
  before?: unknown;
  after?: unknown;
};

// Сравнение двух snapshot'ов заказа → массив событий.
// snapshot — частичный Order. Не зависит от конкретных полей User —
// если назначения изменились, кладём id'шники + nameMap отдельно.
export type OrderSnapshot = {
  stage: Stage;
  surveyorId: string | null;
  installerId: string | null;
  surveyAt: Date | null;
  installAt: Date | null;
  totalAmount: number;
  prepayment: number;
  finalPayment: number;
  costAmount: number;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  doorComment: string;
  widthMm: number | null;
  heightMm: number | null;
};

export function snapshotFromOrder(o: any): OrderSnapshot {
  return {
    stage:         o.stage,
    surveyorId:    o.surveyorId,
    installerId:   o.installerId,
    surveyAt:      o.surveyAt,
    installAt:     o.installAt,
    totalAmount:   Number(o.totalAmount),
    prepayment:    Number(o.prepayment),
    finalPayment:  Number(o.finalPayment),
    costAmount:    Number(o.costAmount),
    clientName:    o.clientName,
    clientPhone:   o.clientPhone,
    clientAddress: o.clientAddress,
    doorComment:   o.doorComment,
    widthMm:       o.widthMm ?? null,
    heightMm:      o.heightMm ?? null,
  };
}

function timeEq(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? 0) === (b?.getTime() ?? 0);
}

function fmtDateOrDash(d: Date | null): string {
  return d ? fmtDateTime(d) : '—';
}

export function diffOrderEvents({
  orderId,
  authorId,
  before,
  after,
  userNameMap = {},
}: {
  orderId: string;
  authorId: string | null;
  before: OrderSnapshot;
  after: OrderSnapshot;
  /** Карта userId → fullName для красивых summary */
  userNameMap?: Record<string, string>;
}): OrderEventInput[] {
  const events: OrderEventInput[] = [];
  const nameOf = (id: string | null) => (id ? userNameMap[id] ?? '?' : 'не назначен');

  if (before.stage !== after.stage) {
    events.push({
      orderId, authorId, kind: 'stage',
      summary: `${STAGE_LABEL[before.stage]} → ${STAGE_LABEL[after.stage]}`,
      before: before.stage, after: after.stage,
    });
    if (after.stage === 'closed') {
      events.push({
        orderId, authorId, kind: 'closed',
        summary: 'Заказ закрыт',
      });
    }
  }

  if (before.surveyorId !== after.surveyorId) {
    events.push({
      orderId, authorId, kind: 'assign_surveyor',
      summary: `Замерщик: ${nameOf(before.surveyorId)} → ${nameOf(after.surveyorId)}`,
      before: before.surveyorId, after: after.surveyorId,
    });
  }
  if (before.installerId !== after.installerId) {
    events.push({
      orderId, authorId, kind: 'assign_installer',
      summary: `Установщик: ${nameOf(before.installerId)} → ${nameOf(after.installerId)}`,
      before: before.installerId, after: after.installerId,
    });
  }

  if (!timeEq(before.surveyAt, after.surveyAt)) {
    events.push({
      orderId, authorId, kind: 'date_survey',
      summary: `Дата замера: ${fmtDateOrDash(before.surveyAt)} → ${fmtDateOrDash(after.surveyAt)}`,
      before: before.surveyAt?.toISOString() ?? null,
      after:  after.surveyAt?.toISOString() ?? null,
    });
  }
  if (!timeEq(before.installAt, after.installAt)) {
    events.push({
      orderId, authorId, kind: 'date_install',
      summary: `Дата установки: ${fmtDateOrDash(before.installAt)} → ${fmtDateOrDash(after.installAt)}`,
      before: before.installAt?.toISOString() ?? null,
      after:  after.installAt?.toISOString() ?? null,
    });
  }

  // Финансы
  const moneyChanges: Array<[OrderEventKind, string, number, number]> = [
    ['money_total',  'Цена по договору', before.totalAmount,  after.totalAmount],
    ['money_prepay', 'Аванс',            before.prepayment,   after.prepayment],
    ['money_final',  'Остаток получен',  before.finalPayment, after.finalPayment],
    ['money_cost',   'Себестоимость',    before.costAmount,   after.costAmount],
  ];
  for (const [kind, label, b, a] of moneyChanges) {
    if (b !== a) {
      events.push({
        orderId, authorId, kind,
        summary: `${label}: ${fmtMoney(b)} → ${fmtMoney(a)}`,
        before: b, after: a,
      });
    }
  }

  // Клиентские данные — собираем как один общий event, чтобы не плодить шум
  const clientChanged =
    before.clientName    !== after.clientName    ||
    before.clientPhone   !== after.clientPhone   ||
    before.clientAddress !== after.clientAddress ||
    before.doorComment   !== after.doorComment   ||
    before.widthMm       !== after.widthMm       ||
    before.heightMm      !== after.heightMm;
  if (clientChanged) {
    const parts: string[] = [];
    if (before.clientName    !== after.clientName)    parts.push('ФИО');
    if (before.clientPhone   !== after.clientPhone)   parts.push('телефон');
    if (before.clientAddress !== after.clientAddress) parts.push('адрес');
    if (before.doorComment   !== after.doorComment)   parts.push('комментарий');
    if (before.widthMm       !== after.widthMm)       parts.push('ширина');
    if (before.heightMm      !== after.heightMm)      parts.push('высота');
    events.push({
      orderId, authorId, kind: 'client_data',
      summary: `Изменены: ${parts.join(', ')}`,
      before, after,
    });
  }

  return events;
}
