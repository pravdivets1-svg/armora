'use server';

// Server Actions для заказов: create / update / delete / addComment / submitForClosure / approveClosure.
// Все проверки доступа делаем тут — клиенту нельзя доверять.

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomBytes } from 'crypto';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { isStaff } from '@/lib/auth-helpers';
import { isStageTransitionAllowed, transitionErrorMessage } from '@/lib/stage-transitions';
import { notifyOrderChanges, notifySafe } from '@/lib/push';
import { diffOrderEvents, snapshotFromOrder } from '@/lib/order-events';
import { awaitingUntilFrom } from '@/lib/awaiting';
import { normalizePhone } from '@/lib/format';
import type { Stage, Role } from '@prisma/client';
import { STAGE_LABEL } from '@/lib/labels';

// =====================================================================
// Валидация форм
// =====================================================================

const STAGES = [
  'new', 'survey_scheduled', 'survey_done', 'production',
  'ready_to_install', 'installed', 'pending_closure', 'closed',
] as const;

const orderInputSchema = z.object({
  clientName:    z.string().trim().min(2, 'Введите ФИО клиента'),
  clientPhone:   z.string().trim().min(5, 'Введите телефон'),
  clientAddress: z.string().trim().min(2, 'Введите адрес'),
  doorComment:   z.string().trim().max(2000).default(''),
  widthMm:       z.coerce.number().int().min(0).max(5000).optional().or(z.literal('').transform(() => undefined)),
  heightMm:      z.coerce.number().int().min(0).max(5000).optional().or(z.literal('').transform(() => undefined)),
  totalAmount:   z.coerce.number().min(0).max(10_000_000).default(0),
  prepayment:    z.coerce.number().min(0).max(10_000_000).default(0),
  finalPayment:  z.coerce.number().min(0).max(10_000_000).default(0),
  costAmount:    z.coerce.number().min(0).max(10_000_000).default(0),
  stage:         z.enum(STAGES).default('new'),
  surveyorId:    z.string().uuid().nullable().or(z.literal('').transform(() => null)),
  installerId:   z.string().uuid().nullable().or(z.literal('').transform(() => null)),
  surveyAt:      z.string().nullable().or(z.literal('').transform(() => null)),
  surveyEndAt:   z.string().nullable().or(z.literal('').transform(() => null)),
  installAt:     z.string().nullable().or(z.literal('').transform(() => null)),
  installEndAt:  z.string().nullable().or(z.literal('').transform(() => null)),
});

export type OrderActionState =
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | { ok: true }
  | undefined;

// =====================================================================
// Хелперы
// =====================================================================

function genToken(): string {
  return randomBytes(16).toString('hex');
}

function parseFormData(formData: FormData) {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string') obj[k] = v;
  }
  return orderInputSchema.safeParse(obj);
}

function applyDateOrNull(s: string | null | undefined): Date | null {
  if (!s) return null;
  // <input type="datetime-local"> отдаёт "YYYY-MM-DDTHH:mm" без таймзоны.
  // Сервер Timeweb работает в UTC, поэтому new Date(s) интерпретирует строку
  // как UTC → 17:00 МСК становится 17:00 UTC = 20:00 МСК. Принудительно
  // трактуем ввод как Europe/Moscow (UTC+3, без DST в России).
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    const [, y, mo, da, h, mi] = m;
    return new Date(Date.UTC(+y, +mo - 1, +da, +h - 3, +mi));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function tokenExpiresFor(stage: Stage, current: Date | null): Date | null {
  if (stage === 'closed') {
    return current ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
  return null;
}

// Только цифры из телефона — для индексированного поиска
// независимо от формата ввода ("+7 (495) 123-45-67" → "74951234567").
function phoneDigits(s: string): string {
  return (s ?? '').replace(/\D/g, '');
}

// Проверка обязательных дат для активных этапов
function validateStageDates(
  stage: Stage,
  surveyAt: string | null | undefined,
  installAt: string | null | undefined,
): { error: string; fieldErrors: Record<string, string> } | null {
  if (stage === 'survey_scheduled' && !surveyAt) {
    return {
      error: 'Для этапа «Замер назначен» нужна дата замера',
      fieldErrors: { surveyAt: 'Укажите дату и время замера' },
    };
  }
  if (stage === 'ready_to_install' && !installAt) {
    return {
      error: 'Для этапа «Готова к установке» нужна дата установки',
      fieldErrors: { installAt: 'Укажите дату и время установки' },
    };
  }
  return null;
}

// Проверка интервалов: если задан end — должен быть и start, и end > start.
function validateIntervals(
  surveyAt: string | null | undefined,
  surveyEndAt: string | null | undefined,
  installAt: string | null | undefined,
  installEndAt: string | null | undefined,
): { error: string; fieldErrors: Record<string, string> } | null {
  const fieldErrors: Record<string, string> = {};
  if (surveyEndAt && !surveyAt) {
    fieldErrors.surveyAt = 'Сначала укажите начало интервала';
  }
  if (surveyAt && surveyEndAt) {
    const a = applyDateOrNull(surveyAt);
    const b = applyDateOrNull(surveyEndAt);
    if (a && b && b.getTime() <= a.getTime()) {
      fieldErrors.surveyEndAt = 'Конец интервала должен быть позже начала';
    }
  }
  if (installEndAt && !installAt) {
    fieldErrors.installAt = 'Сначала укажите начало интервала';
  }
  if (installAt && installEndAt) {
    const a = applyDateOrNull(installAt);
    const b = applyDateOrNull(installEndAt);
    if (a && b && b.getTime() <= a.getTime()) {
      fieldErrors.installEndAt = 'Конец интервала должен быть позже начала';
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Проверьте интервалы дат', fieldErrors };
  }
  return null;
}

// Гейт перевода в pending_closure / closed: проверка финансов
function validateClosureFinances(
  totalAmount: number,
  prepayment: number,
  finalPayment: number,
  costAmount: number,
): { error: string; fieldErrors: Record<string, string> } | null {
  const fieldErrors: Record<string, string> = {};
  if (totalAmount <= 0)   fieldErrors.totalAmount  = 'Укажите цену по договору';
  if (prepayment <= 0)    fieldErrors.prepayment   = 'Укажите аванс';
  if (finalPayment <= 0)  fieldErrors.finalPayment = 'Укажите фактический остаток';
  if (costAmount <= 0)    fieldErrors.costAmount   = 'Укажите себестоимость';
  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: 'Перед закрытием заполните все 4 финансовых поля: цена, аванс, остаток, себестоимость',
      fieldErrors,
    };
  }
  return null;
}

// =====================================================================
// CREATE
// =====================================================================

export async function createOrderAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const me = await requireUser();
  if (!isStaff(me.role)) return { ok: false, error: 'Недостаточно прав' };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const err of parsed.error.issues) {
      fieldErrors[err.path.join('.')] = err.message;
    }
    return { ok: false, error: 'Проверьте поля формы', fieldErrors };
  }
  const d = parsed.data;

  // Запрещаем создавать сразу в pending_closure / closed — только через approveClosure
  if (d.stage === 'closed') {
    return { ok: false, error: 'Закрыть заказ может только директор через панель «На закрытие»' };
  }

  const stageError = validateStageDates(d.stage, d.surveyAt, d.installAt);
  if (stageError) {
    return { ok: false, error: stageError.error, fieldErrors: stageError.fieldErrors };
  }

  const intervalError = validateIntervals(d.surveyAt, d.surveyEndAt, d.installAt, d.installEndAt);
  if (intervalError) {
    return { ok: false, error: intervalError.error, fieldErrors: intervalError.fieldErrors };
  }

  if (d.stage === 'pending_closure') {
    const fin = validateClosureFinances(d.totalAmount, d.prepayment, d.finalPayment, d.costAmount);
    if (fin) return { ok: false, error: fin.error, fieldErrors: fin.fieldErrors };
  }

  const order = await prisma.order.create({
    data: {
      publicToken:    genToken(),
      clientName:     d.clientName,
      clientPhone:    normalizePhone(d.clientPhone),
      clientPhoneDigits: phoneDigits(d.clientPhone),
      clientAddress:  d.clientAddress,
      doorComment:    d.doorComment,
      widthMm:        d.widthMm ?? null,
      heightMm:       d.heightMm ?? null,
      totalAmount:    d.totalAmount,
      prepayment:     d.prepayment,
      finalPayment:   d.finalPayment,
      costAmount:     d.costAmount,
      stage:          d.stage,
      surveyorId:     d.surveyorId,
      installerId:    d.installerId,
      surveyAt:       applyDateOrNull(d.surveyAt),
      surveyEndAt:    applyDateOrNull(d.surveyEndAt),
      installAt:      applyDateOrNull(d.installAt),
      installEndAt:   applyDateOrNull(d.installEndAt),
      tokenExpiresAt: tokenExpiresFor(d.stage, null),
      createdById:    me.id,
    },
  });

  // Audit log: запись о создании
  await prisma.orderEvent.create({
    data: {
      orderId:  order.id,
      authorId: me.id,
      kind:     'created',
      summary:  `Заказ создан · ${order.clientName}`,
      after:    snapshotFromOrder(order) as any,
    },
  });

  // Триггер пушей: для нового заказа before=null
  void notifySafe(() => notifyOrderChanges(null, {
    id: order.id,
    number: order.number,
    clientName: order.clientName,
    clientAddress: order.clientAddress,
    surveyorId: order.surveyorId,
    installerId: order.installerId,
    surveyAt: order.surveyAt,
    installAt: order.installAt,
    stage: order.stage,
  }));

  revalidatePath('/orders');
  redirect(`/orders/${order.id}?toast=${encodeURIComponent('Заказ создан')}&type=ok`);
}

// =====================================================================
// UPDATE
// =====================================================================

export async function updateOrderAction(
  orderId: string,
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const me = await requireUser();

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return { ok: false, error: 'Заказ не найден' };

  const isMine = existing.surveyorId === me.id || existing.installerId === me.id;
  if (!isStaff(me.role) && !isMine) return { ok: false, error: 'Нет доступа' };

  // После closed редактировать может только директор
  if (existing.stage === 'closed' && me.role !== 'director') {
    return { ok: false, error: 'Закрытый заказ может редактировать только директор' };
  }

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const err of parsed.error.issues) fieldErrors[err.path.join('.')] = err.message;
    return { ok: false, error: 'Проверьте поля формы', fieldErrors };
  }
  const d = parsed.data;

  // Запрет: только директор может перевести в closed (через approveClosure / direct edit)
  if (d.stage === 'closed' && existing.stage !== 'closed' && me.role !== 'director') {
    return {
      ok: false,
      error: 'Закрыть заказ может только директор. Используйте этап «Ожидает закрытия».',
      fieldErrors: { stage: 'Доступ только у директора' },
    };
  }

  // Машина состояний: проверяем допустимость перехода from -> to
  if (!isStageTransitionAllowed(me.role, existing.stage, d.stage)) {
    return {
      ok: false,
      error: transitionErrorMessage(me.role, existing.stage, d.stage),
      fieldErrors: { stage: 'Переход недопустим' },
    };
  }

  // Машина состояний: даты для активных этапов
  const surveyAtForCheck  = canEditAll(me.role) ? d.surveyAt  : (existing.surveyAt?.toISOString()  ?? null);
  const installAtForCheck = canEditAll(me.role) ? d.installAt : (existing.installAt?.toISOString() ?? null);
  const stageError = validateStageDates(d.stage, surveyAtForCheck, installAtForCheck);
  if (stageError) {
    return { ok: false, error: stageError.error, fieldErrors: stageError.fieldErrors };
  }

  if (canEditAll(me.role)) {
    const intervalError = validateIntervals(d.surveyAt, d.surveyEndAt, d.installAt, d.installEndAt);
    if (intervalError) {
      return { ok: false, error: intervalError.error, fieldErrors: intervalError.fieldErrors };
    }
  }

  // Гейт финансов при переводе в pending_closure или closed
  if (d.stage === 'pending_closure' || d.stage === 'closed') {
    // Берём финансы из формы для редакторов / из существующего для тех, кто поле не видит
    const totalForCheck  = canEditMainAmounts(me.role) ? d.totalAmount  : Number(existing.totalAmount);
    const prepayForCheck = canEditMainAmounts(me.role) ? d.prepayment   : Number(existing.prepayment);
    const finalForCheck  = canEditFinal(me.role)       ? d.finalPayment : Number(existing.finalPayment);
    const costForCheck   = canEditCost(me.role)        ? d.costAmount   : Number(existing.costAmount);

    const fin = validateClosureFinances(totalForCheck, prepayForCheck, finalForCheck, costForCheck);
    if (fin) return { ok: false, error: fin.error, fieldErrors: fin.fieldErrors };
  }

  // Что разрешено редактировать каждой роли
  const data = buildUpdatePayload(me.role, existing, d);

  const updated = await prisma.order.update({ where: { id: orderId }, data });

  // Audit log: вычисляем дельту и пишем createMany
  try {
    const before = snapshotFromOrder(existing);
    const after  = snapshotFromOrder(updated);
    // Имена пользователей для красивых summary (берём только нужные id)
    const userIds = new Set<string>();
    for (const id of [before.surveyorId, before.installerId, after.surveyorId, after.installerId]) {
      if (id) userIds.add(id);
    }
    let nameMap: Record<string, string> = {};
    if (userIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, fullName: true },
      });
      nameMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));
    }
    const events = diffOrderEvents({
      orderId, authorId: me.id, before, after, userNameMap: nameMap,
    });
    if (events.length > 0) {
      await prisma.orderEvent.createMany({
        data: events.map((e) => ({
          orderId:  e.orderId,
          authorId: e.authorId,
          kind:     e.kind,
          summary:  e.summary,
          before:   (e.before ?? null) as any,
          after:    (e.after ?? null) as any,
        })),
      });
    }
  } catch (e) {
    console.warn('[audit] failed to write order events', e);
  }

  // Триггер пушей: сравниваем before/after
  void notifySafe(() => notifyOrderChanges(
    {
      id: existing.id,
      number: existing.number,
      clientName: existing.clientName,
      clientAddress: existing.clientAddress,
      surveyorId: existing.surveyorId,
      installerId: existing.installerId,
      surveyAt: existing.surveyAt,
      installAt: existing.installAt,
      stage: existing.stage,
    },
    {
      id: updated.id,
      number: updated.number,
      clientName: updated.clientName,
      clientAddress: updated.clientAddress,
      surveyorId: updated.surveyorId,
      installerId: updated.installerId,
      surveyAt: updated.surveyAt,
      installAt: updated.installAt,
      stage: updated.stage,
    },
  ));

  revalidatePath('/orders');
  revalidatePath('/closures');
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// Может ли роль редактировать «остаток» (finalPayment) — все 4 роли.
// (установщик принимает деньги на месте, поэтому ему тоже нужно)
function canEditFinal(_role: Role): boolean {
  return true;
}
// Может ли роль редактировать «себестоимость» (costAmount) — только директор и замерщик
function canEditCost(role: Role): boolean {
  return role === 'director' || role === 'surveyor';
}
// Может ли роль редактировать «договор» / «аванс» — директор, менеджер, замерщик
function canEditMainAmounts(role: Role): boolean {
  return role === 'director' || role === 'manager' || role === 'surveyor';
}
// Может ли роль редактировать клиентские данные / даты / назначения / этап
// (по сути «полный редактор»): директор, менеджер, замерщик. Установщик — нет.
function canEditAll(role: Role): boolean {
  return role === 'director' || role === 'manager' || role === 'surveyor';
}

function buildUpdatePayload(
  role: Role,
  existing: { totalAmount: any; prepayment: any; finalPayment: any; costAmount: any; tokenExpiresAt: Date | null; surveyAt: Date | null; surveyEndAt: Date | null; installAt: Date | null; installEndAt: Date | null; surveyorId: string | null; installerId: string | null; clientName: string; clientPhone: string; clientAddress: string; doorComment: string; widthMm: number | null; heightMm: number | null },
  d: z.infer<typeof orderInputSchema>,
) {
  const base = {
    stage: d.stage,
    tokenExpiresAt: tokenExpiresFor(d.stage, existing.tokenExpiresAt),
  };

  // Финансы — кто что может
  const total  = canEditMainAmounts(role) ? d.totalAmount : Number(existing.totalAmount);
  const prepay = canEditMainAmounts(role) ? d.prepayment  : Number(existing.prepayment);
  const final  = canEditFinal(role)       ? d.finalPayment : Number(existing.finalPayment);
  const cost   = canEditCost(role)        ? d.costAmount  : Number(existing.costAmount);

  // Контактные/дверные данные / даты / назначения — директор, менеджер, замерщик
  if (canEditAll(role)) {
    return {
      ...base,
      clientName:    d.clientName,
      clientPhone:   normalizePhone(d.clientPhone),
      clientPhoneDigits: phoneDigits(d.clientPhone),
      clientAddress: d.clientAddress,
      doorComment:   d.doorComment,
      widthMm:       d.widthMm ?? null,
      heightMm:      d.heightMm ?? null,
      totalAmount:   total,
      prepayment:    prepay,
      finalPayment:  final,
      costAmount:    cost,
      surveyorId:    d.surveyorId,
      installerId:   d.installerId,
      surveyAt:      applyDateOrNull(d.surveyAt),
      surveyEndAt:   applyDateOrNull(d.surveyEndAt),
      installAt:     applyDateOrNull(d.installAt),
      installEndAt:  applyDateOrNull(d.installEndAt),
    };
  }

  // Полевой работник: stage + finalPayment + ничего больше
  return {
    ...base,
    finalPayment: final,
  };
}

// =====================================================================
// AWAITING CLIENT — решения по «ждём клиента» когда срок вышел
// =====================================================================

// Установить флаг «ждём клиента» (true/false) и заметку.
// НЕЗАВИСИМО от формы: не запускает валидацию этапа/дат/финансов.
// Это нужно потому что validateStageDates у некоторых этапов может вернуть
// ошибку и тогда update не пишется ВООБЩЕ — флаг тоже терялся.
export async function setAwaitingAction(
  orderId: string,
  on: boolean,
  note: string,
) {
  const me = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, surveyorId: true, installerId: true, stage: true,
      awaitingClient: true, awaitingClientSince: true, awaitingClientUntil: true,
    },
  });
  if (!order) throw new Error('Not found');
  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) throw new Error('Forbidden');
  // На закрытых заказах флаг не редактируем
  if (order.stage === 'closed') throw new Error('Order closed');

  const trimmed = (note ?? '').slice(0, 500);
  const wasOn = order.awaitingClient;
  const now = new Date();

  let data: any;
  if (on) {
    // Включение или обновление заметки. Если флаг уже был включён —
    // since/until не сбрасываем (продление — отдельным action'ом).
    data = {
      awaitingClient: true,
      awaitingClientNote: trimmed,
      awaitingClientSince: wasOn ? order.awaitingClientSince ?? now : now,
      awaitingClientUntil: wasOn
        ? (order.awaitingClientUntil ?? awaitingUntilFrom(now))
        : awaitingUntilFrom(now),
    };
  } else {
    data = {
      awaitingClient: false,
      awaitingClientNote: '',
      awaitingClientSince: null,
      awaitingClientUntil: null,
    };
  }

  await prisma.order.update({ where: { id: orderId }, data });
  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
}

// Продлить «ждём клиента» ещё на 3 дня от текущего момента.
export async function extendAwaitingAction(orderId: string) {
  const me = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, surveyorId: true, installerId: true, awaitingClient: true },
  });
  if (!order) throw new Error('Not found');
  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) throw new Error('Forbidden');
  if (!order.awaitingClient) throw new Error('Awaiting flag is off');

  const now = new Date();
  await prisma.order.update({
    where: { id: orderId },
    data: { awaitingClientSince: now, awaitingClientUntil: awaitingUntilFrom(now) },
  });
  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
}

// Вернуть в работу — снять флаг «ждём клиента».
export async function resumeFromAwaitingAction(orderId: string) {
  const me = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, surveyorId: true, installerId: true },
  });
  if (!order) throw new Error('Not found');
  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) throw new Error('Forbidden');

  await prisma.order.update({
    where: { id: orderId },
    data: {
      awaitingClient: false,
      awaitingClientNote: '',
      awaitingClientSince: null,
      awaitingClientUntil: null,
    },
  });
  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
}

// Закрыть как отказ клиента — переводим в pending_closure (директор далее
// подтверждает в /closures). Доступно только staff.
export async function closeFromAwaitingAction(orderId: string) {
  const me = await requireUser();
  if (!isStaff(me.role)) throw new Error('Forbidden');
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Not found');

  await prisma.order.update({
    where: { id: orderId },
    data: {
      stage: 'pending_closure',
      awaitingClient: false,
      awaitingClientSince: null,
      awaitingClientUntil: null,
    },
  });
  revalidatePath('/orders');
  revalidatePath('/closures');
  revalidatePath(`/orders/${orderId}`);
}

// =====================================================================
// SUBMIT FOR CLOSURE — менеджер/полевой подаёт заказ на закрытие
// (просто перевод в pending_closure, гейт финансов сработает в update)
// =====================================================================

// Реализуется через обычный updateOrderAction со stage = 'pending_closure'.

// =====================================================================
// APPROVE CLOSURE — директор подтверждает закрытие
// =====================================================================

// Директор закрывает заказ. Раньше:
//   - блок: order.stage должен быть pending_closure (→ 500 если нет)
//   - блок: все 4 финансовых поля обязательны (→ 500 если нет)
// Теперь:
//   - закрыть можно из ЛЮБОЙ незакрытой стадии (директор знает что делает)
//   - финансы — рекомендация, не блокер (можно закрыть мусорный/тестовый заказ)
//   - already-closed → noop, без ошибки
export async function approveClosureAction(orderId: string) {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Forbidden');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Not found');
  if (order.stage === 'closed') return; // already closed — silent noop

  const fromStage = order.stage;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      stage: 'closed',
      tokenExpiresAt: tokenExpiresFor('closed', order.tokenExpiresAt),
    },
  });

  // Audit log: запись о закрытии (+ stage-переход если пришли не из pending_closure)
  try {
    if (fromStage !== 'pending_closure') {
      await prisma.orderEvent.create({
        data: {
          orderId,
          authorId: me.id,
          kind: 'stage',
          summary: `${STAGE_LABEL[fromStage]} → ${STAGE_LABEL['closed']}`,
          before: { stage: fromStage } as any,
          after: { stage: 'closed' } as any,
        },
      });
    }
    await prisma.orderEvent.create({
      data: {
        orderId,
        authorId: me.id,
        kind: 'closed',
        summary: fromStage === 'pending_closure' ? 'Заказ закрыт' : 'Заказ закрыт напрямую директором',
        before: { stage: fromStage } as any,
        after: { stage: 'closed' } as any,
      },
    });
  } catch (e) {
    console.warn('[audit] failed to write closure event', e);
  }

  revalidatePath('/orders');
  revalidatePath('/closures');
  revalidatePath(`/orders/${orderId}`);
}

// REJECT CLOSURE — директор возвращает заказ обратно в installed
export async function rejectClosureAction(orderId: string) {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Forbidden');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.stage !== 'pending_closure') return;

  await prisma.order.update({
    where: { id: orderId },
    data: { stage: 'installed' },
  });

  revalidatePath('/orders');
  revalidatePath('/closures');
  revalidatePath(`/orders/${orderId}`);
}

// =====================================================================
// DELETE — только директор
// =====================================================================

export async function deleteOrderAction(orderId: string) {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Forbidden');

  await prisma.order.delete({ where: { id: orderId } });

  revalidatePath('/orders');
  revalidatePath('/closures');
  redirect(`/orders?toast=${encodeURIComponent('Заказ удалён')}&type=ok`);
}

// =====================================================================
// COMMENTS
// =====================================================================

const commentSchema = z.object({
  text: z.string().trim().min(1, 'Комментарий не может быть пустым').max(2000, 'Слишком длинный комментарий'),
});

export type CommentActionState = { ok: true } | { ok: false; error: string } | undefined;

export async function addCommentAction(
  orderId: string,
  _prev: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const me = await requireUser();

  const parsed = commentSchema.safeParse({ text: formData.get('text') });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Некорректный комментарий' };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, surveyorId: true, installerId: true },
  });
  if (!order) return { ok: false, error: 'Заказ не найден' };

  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) return { ok: false, error: 'Нет доступа' };

  await prisma.orderComment.create({
    data: { orderId, authorId: me.id, text: parsed.data.text },
  });

  // Audit log: комментарий тоже event
  await prisma.orderEvent.create({
    data: {
      orderId,
      authorId: me.id,
      kind: 'comment',
      summary: parsed.data.text.length > 80 ? parsed.data.text.slice(0, 80) + '…' : parsed.data.text,
      after: { text: parsed.data.text } as any,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// =====================================================================
// STAGE TRANSITION — узкий action, только для смены этапа из HeroStage
// =====================================================================

export async function updateOrderStageAction(orderId: string, next: Stage): Promise<void> {
  const me = await requireUser();

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error('Заказ не найден');

  const isMine = existing.surveyorId === me.id || existing.installerId === me.id;
  if (!isStaff(me.role) && !isMine) throw new Error('Нет доступа');

  if (existing.stage === 'closed' && me.role !== 'director') {
    throw new Error('Закрытый заказ может редактировать только директор');
  }

  if (next === 'closed') {
    throw new Error('Закрыть заказ можно только через approveClosureAction');
  }

  if (!isStageTransitionAllowed(me.role, existing.stage, next)) {
    throw new Error(transitionErrorMessage(me.role, existing.stage, next));
  }

  // Гейт финансов при переводе в pending_closure
  if (next === 'pending_closure') {
    const fin = validateClosureFinances(
      Number(existing.totalAmount),
      Number(existing.prepayment),
      Number(existing.finalPayment),
      Number(existing.costAmount),
    );
    if (fin) throw new Error(fin.error);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { stage: next },
  });

  // Audit log
  try {
    await prisma.orderEvent.create({
      data: {
        orderId,
        authorId: me.id,
        kind: 'stage',
        summary: `${STAGE_LABEL[existing.stage]} → ${STAGE_LABEL[next]}`,
        before: { stage: existing.stage } as any,
        after: { stage: next } as any,
      },
    });
  } catch (e) {
    console.warn('[audit] failed to write stage event', e);
  }

  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
}
