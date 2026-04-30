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
import type { Stage, Role } from '@prisma/client';

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
  installAt:     z.string().nullable().or(z.literal('').transform(() => null)),
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

  if (d.stage === 'pending_closure') {
    const fin = validateClosureFinances(d.totalAmount, d.prepayment, d.finalPayment, d.costAmount);
    if (fin) return { ok: false, error: fin.error, fieldErrors: fin.fieldErrors };
  }

  const order = await prisma.order.create({
    data: {
      publicToken:    genToken(),
      clientName:     d.clientName,
      clientPhone:    d.clientPhone,
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
      installAt:      applyDateOrNull(d.installAt),
      tokenExpiresAt: tokenExpiresFor(d.stage, null),
      createdById:    me.id,
    },
  });

  revalidatePath('/orders');
  redirect(`/orders/${order.id}`);
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

  await prisma.order.update({ where: { id: orderId }, data });

  revalidatePath('/orders');
  revalidatePath('/closures');
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// Может ли роль редактировать «остаток» (finalPayment) — все роли
function canEditFinal(role: Role): boolean {
  return role === 'director' || role === 'manager' || role === 'installer' || role === 'surveyor';
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
  existing: { totalAmount: any; prepayment: any; finalPayment: any; costAmount: any; tokenExpiresAt: Date | null; surveyAt: Date | null; installAt: Date | null; surveyorId: string | null; installerId: string | null; clientName: string; clientPhone: string; clientAddress: string; doorComment: string; widthMm: number | null; heightMm: number | null },
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

  // Контактные/доорные данные / даты / назначения — директор, менеджер, замерщик
  if (canEditAll(role)) {
    return {
      ...base,
      clientName:    d.clientName,
      clientPhone:   d.clientPhone,
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
      installAt:     applyDateOrNull(d.installAt),
    };
  }

  // Полевой работник: stage + finalPayment (если разрешено) + ничего больше
  return {
    ...base,
    finalPayment: final,
  };
}

// =====================================================================
// SUBMIT FOR CLOSURE — менеджер/полевой подаёт заказ на закрытие
// (просто перевод в pending_closure, гейт финансов сработает в update)
// =====================================================================

// Реализуется через обычный updateOrderAction со stage = 'pending_closure'.

// =====================================================================
// APPROVE CLOSURE — директор подтверждает закрытие
// =====================================================================

export async function approveClosureAction(orderId: string) {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Forbidden');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Not found');

  if (order.stage !== 'pending_closure') {
    throw new Error('Order is not in pending_closure stage');
  }

  // Контрольная проверка финансов
  const fin = validateClosureFinances(
    Number(order.totalAmount),
    Number(order.prepayment),
    Number(order.finalPayment),
    Number(order.costAmount),
  );
  if (fin) throw new Error(fin.error);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      stage: 'closed',
      tokenExpiresAt: tokenExpiresFor('closed', order.tokenExpiresAt),
    },
  });

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
  redirect('/orders');
}

// =====================================================================
// COMMENTS
// =====================================================================

const commentSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export async function addCommentAction(orderId: string, formData: FormData) {
  const me = await requireUser();

  const parsed = commentSchema.safeParse({ text: formData.get('text') });
  if (!parsed.success) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) throw new Error('Forbidden');

  await prisma.orderComment.create({
    data: { orderId, authorId: me.id, text: parsed.data.text },
  });

  revalidatePath(`/orders/${orderId}`);
}
