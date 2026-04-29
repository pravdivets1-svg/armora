'use server';

// Server Actions для заказов: create / update / delete / addComment.
// Все проверки доступа делаем тут — клиенту нельзя доверять.

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomBytes } from 'crypto';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { isStaff } from '@/lib/auth-helpers';
import type { Stage } from '@prisma/client';

// =====================================================================
// Валидация форм
// =====================================================================

const STAGES = [
  'new', 'survey_scheduled', 'survey_done', 'production',
  'ready_to_install', 'installed', 'closed',
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
  // 32-символьный hex (~128 бит) — достаточно для непредсказуемой ссылки
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
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// При переходе в closed — выставляем срок действия публичной ссылки (90 дней).
function tokenExpiresFor(stage: Stage, current: Date | null): Date | null {
  if (stage === 'closed') {
    return current ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
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

  // Полевой работник: только если это его заказ, и только этап + комментарий
  const isMine = existing.surveyorId === me.id || existing.installerId === me.id;
  if (!isStaff(me.role) && !isMine) return { ok: false, error: 'Нет доступа' };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const err of parsed.error.issues) fieldErrors[err.path.join('.')] = err.message;
    return { ok: false, error: 'Проверьте поля формы', fieldErrors };
  }
  const d = parsed.data;

  // Полевой работник может менять только этап, остальные данные оставляем как есть
  const data = isStaff(me.role)
    ? {
        clientName:    d.clientName,
        clientPhone:   d.clientPhone,
        clientAddress: d.clientAddress,
        doorComment:   d.doorComment,
        widthMm:       d.widthMm ?? null,
        heightMm:      d.heightMm ?? null,
        totalAmount:   d.totalAmount,
        prepayment:    d.prepayment,
        stage:         d.stage,
        surveyorId:    d.surveyorId,
        installerId:   d.installerId,
        surveyAt:      applyDateOrNull(d.surveyAt),
        installAt:     applyDateOrNull(d.installAt),
        tokenExpiresAt: tokenExpiresFor(d.stage, existing.tokenExpiresAt),
      }
    : {
        stage: d.stage,
        tokenExpiresAt: tokenExpiresFor(d.stage, existing.tokenExpiresAt),
      };

  await prisma.order.update({ where: { id: orderId }, data });

  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// =====================================================================
// DELETE — только директор
// =====================================================================

export async function deleteOrderAction(orderId: string) {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Forbidden');

  // Каскад: order_comments удалятся автоматически (onDelete: Cascade в schema)
  await prisma.order.delete({ where: { id: orderId } });

  revalidatePath('/orders');
  redirect('/orders');
}

// =====================================================================
// COMMENTS — добавить
// =====================================================================

const commentSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export async function addCommentAction(orderId: string, formData: FormData) {
  const me = await requireUser();

  const parsed = commentSchema.safeParse({ text: formData.get('text') });
  if (!parsed.success) return; // тихо игнорируем пустой комментарий

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) throw new Error('Forbidden');

  await prisma.orderComment.create({
    data: { orderId, authorId: me.id, text: parsed.data.text },
  });

  revalidatePath(`/orders/${orderId}`);
}
