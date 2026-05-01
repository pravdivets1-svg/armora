// Server Actions для лидов: смена этапа, назначение, конверсия в Order, удаление.
// Все проверки доступа — на сервере.

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomBytes } from 'crypto';
import type { LeadStage } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';

const STAGES: LeadStage[] = ['new', 'contacted', 'scheduled', 'converted', 'rejected', 'spam'];

// =====================================================================
// Смена этапа лида
// =====================================================================

export async function setLeadStageAction(leadId: string, stage: LeadStage) {
  const me = await requireUser();
  if (!isStaff(me.role)) throw new Error('Forbidden');

  if (!STAGES.includes(stage)) throw new Error('Invalid stage');
  // converted ставится только через convertToOrderAction
  if (stage === 'converted') throw new Error('Use convertToOrderAction');

  await prisma.lead.update({
    where: { id: leadId },
    data: { stage },
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
}

// =====================================================================
// Назначить менеджера на лид
// =====================================================================

export async function assignLeadAction(leadId: string, userId: string | null) {
  const me = await requireUser();
  if (!isStaff(me.role)) throw new Error('Forbidden');

  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
    if (!u || !u.isActive) throw new Error('User not found');
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedToId: userId },
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
}

// =====================================================================
// Удалить лид (только директор)
// =====================================================================

export async function deleteLeadAction(leadId: string) {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Forbidden');

  await prisma.lead.delete({ where: { id: leadId } });

  revalidatePath('/leads');
  redirect(`/leads?toast=${encodeURIComponent('Заявка удалена')}&type=ok`);
}

// =====================================================================
// Bulk actions
// =====================================================================

const ALLOWED_BULK_STAGES: LeadStage[] = ['contacted', 'scheduled', 'rejected', 'spam', 'new'];

export async function bulkSetLeadStageAction(formData: FormData) {
  const me = await requireUser();
  if (!isStaff(me.role)) throw new Error('Forbidden');

  const stage = String(formData.get('stage') ?? '') as LeadStage;
  if (!ALLOWED_BULK_STAGES.includes(stage)) throw new Error('Invalid stage');

  const idsRaw = String(formData.get('ids') ?? '');
  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return;
  // Защита от случайной массовой переразметки converted (там convertedOrderId)
  await prisma.lead.updateMany({
    where: { id: { in: ids }, stage: { not: 'converted' } },
    data: { stage },
  });

  revalidatePath('/leads');
  redirect(`/leads?toast=${encodeURIComponent(`Обновлено: ${ids.length}`)}&type=ok`);
}

export async function bulkDeleteLeadsAction(formData: FormData) {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Forbidden');

  const idsRaw = String(formData.get('ids') ?? '');
  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return;

  // Не удаляем converted (с заказом) — иначе ломаем FK convertedOrderId
  await prisma.lead.deleteMany({
    where: { id: { in: ids }, stage: { not: 'converted' } },
  });

  revalidatePath('/leads');
  redirect(`/leads?toast=${encodeURIComponent(`Удалено: ${ids.length}`)}&type=ok`);
}
// Берём данные лида + создаём заказ + связываем lead↔order атомарно.
// Если в форме что-то правится — клиент вызывает createOrderAction обычным
// путём, передав ?fromLead=<id>; здесь же — быстрая «прямая» конверсия
// без захода в форму (для типовой быстрой обработки).

const convertSchema = z.object({
  totalAmount: z.coerce.number().min(0).max(10_000_000).default(0),
});

export type ConvertActionState =
  | { ok: false; error: string }
  | { ok: true; orderId: string }
  | undefined;

export async function convertLeadToOrderAction(
  leadId: string,
  _prev: ConvertActionState,
  formData: FormData,
): Promise<ConvertActionState> {
  const me = await requireUser();
  if (!isStaff(me.role)) return { ok: false, error: 'Недостаточно прав' };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: 'Заявка не найдена' };
  if (lead.stage === 'converted' && lead.convertedOrderId) {
    redirect(`/orders/${lead.convertedOrderId}`);
  }

  const parsed = convertSchema.safeParse({
    totalAmount: formData.get('totalAmount'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Проверьте поля формы' };
  }
  const d = parsed.data;

  const totalAmount = d.totalAmount > 0
    ? d.totalAmount
    : Number(lead.estimatedPrice ?? 0);

  const phoneDigits = (lead.clientPhone ?? '').replace(/\D/g, '');

  // Транзакция: создаём заказ и помечаем lead как converted
  const order = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        publicToken:       randomBytes(16).toString('hex'),
        clientName:        lead.clientName,
        clientPhone:       lead.clientPhone,
        clientPhoneDigits: phoneDigits,
        clientAddress:     lead.clientAddress ?? '',
        doorComment:       lead.comment ?? '',
        widthMm:           lead.widthMm,
        heightMm:          lead.heightMm,
        totalAmount,
        stage:             'new',
        createdById:       me.id,
      },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: { stage: 'converted', convertedOrderId: order.id },
    });
    return order;
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/orders');
  redirect(`/orders/${order.id}?toast=${encodeURIComponent('Заявка преобразована в заказ')}&type=ok`);
}
