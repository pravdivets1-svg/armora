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
import { normalizePhone, parseMskDateTimeLocal } from '@/lib/format';
import { snapshotFromOrder } from '@/lib/order-events';
import { notifyOrderAssignedSurveyTelegram } from '@/lib/telegram';
import { notifySafe, sendPushToUser } from '@/lib/push';
import { isEventAllowed } from '@/lib/notification-events';

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

  // updateMany вместо update: (1) не роняет action ошибкой P2025, если лид
  // параллельно удалили; (2) защита от увода лида ИЗ converted — иначе лид
  // с созданным заказом застревал в spam/rejected без пути восстановления
  // (кнопки этапов и «Вернуть в работу» в UI для него скрыты).
  const res = await prisma.lead.updateMany({
    where: { id: leadId, stage: { not: 'converted' } },
    data: { stage },
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  if (res.count === 0) {
    redirect(`/leads/${leadId}?toast=${encodeURIComponent('Заявка уже преобразована или удалена')}&type=error`);
  }
}

// =====================================================================
// Назначить менеджера на лид
// =====================================================================

export async function assignLeadAction(leadId: string, userId: string | null) {
  const me = await requireUser();
  if (!isStaff(me.role)) throw new Error('Forbidden');

  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
    // Ответственным по заявке может быть только staff (как и предлагает UI-дропдаун).
    if (!u || !u.isActive || !isStaff(u.role)) throw new Error('User not found');
  }

  // updateMany: лид могли удалить параллельно — не роняем action по P2025.
  await prisma.lead.updateMany({
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

  // deleteMany: повторное удаление (две вкладки/двойной тап) — тихий noop,
  // а не необработанный P2025 с error boundary.
  await prisma.lead.deleteMany({ where: { id: leadId } });

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
  surveyorId: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  surveyAt:   z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  clientAddress: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
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
    totalAmount:   formData.get('totalAmount'),
    surveyorId:    formData.get('surveyorId'),
    surveyAt:      formData.get('surveyAt'),
    clientAddress: formData.get('clientAddress'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Проверьте поля формы' };
  }
  const d = parsed.data;

  const totalAmount = d.totalAmount > 0
    ? d.totalAmount
    : Number(lead.estimatedPrice ?? 0);

  const phoneDigits = (lead.clientPhone ?? '').replace(/\D/g, '');
  const normalizedPhone = normalizePhone(lead.clientPhone ?? '');

  // Дата замера + замерщик → можно сразу перевести в этап survey_scheduled.
  // parseMskDateTimeLocal: ввод datetime-local трактуем как МСК (naive new Date
  // на UTC-проде сдвигал замер на +3 часа — замерщик приезжал позже).
  const surveyAt: Date | null = d.surveyAt ? parseMskDateTimeLocal(d.surveyAt) : null;
  const surveyorId = d.surveyorId || null;
  let surveyorUser: { id: string; fullName: string; role: string; isActive: boolean } | null = null;
  if (surveyorId) {
    surveyorUser = await prisma.user.findUnique({
      where: { id: surveyorId },
      select: { id: true, fullName: true, role: true, isActive: true },
    });
    if (!surveyorUser || !surveyorUser.isActive || surveyorUser.role !== 'surveyor') {
      return { ok: false, error: 'Замерщик не найден или отключён' };
    }
  }
  const willScheduleSurvey = !!(surveyorUser && surveyAt);
  const finalAddress = (d.clientAddress && d.clientAddress.length > 0)
    ? d.clientAddress
    : (lead.clientAddress ?? '');

  // Транзакция: создаём заказ и помечаем lead как converted (атомарно).
  // Любой сбой БД заворачиваем в graceful-ошибку (а не uncaught-throw, который
  // показывает пользователю «вылетела ошибка»), и логируем реальную причину.
  const result = await prisma.$transaction(async (tx) => {
    // Атомарный «захват» заявки: переводим в converted ТОЛЬКО если она ещё не
    // converted. Защита от гонки (двойной клик / два менеджера / ретрай):
    // конкурентный вызов получит count===0 и не создаст второй заказ.
    const claim = await tx.lead.updateMany({
      // convertedOrderId: null — страховка от двойного заказа, если лид когда-то
      // оказался вне converted при заполненном convertedOrderId (легаси-данные).
      where: { id: leadId, stage: { not: 'converted' }, convertedOrderId: null },
      data: { stage: 'converted' },
    });
    if (claim.count === 0) return { already: true as const };

    const created = await tx.order.create({
      data: {
        publicToken:       randomBytes(16).toString('hex'),
        clientName:        lead.clientName,
        clientPhone:       normalizedPhone,
        clientPhoneDigits: phoneDigits,
        clientAddress:     finalAddress,
        doorComment:       lead.comment ?? '',
        widthMm:           lead.widthMm,
        heightMm:          lead.heightMm,
        totalAmount,
        // Дату замера сохраняем ТОЛЬКО вместе с замерщиком — иначе «дата без
        // исполнителя» на стадии «новый» это неконсистентное состояние.
        stage:             willScheduleSurvey ? 'survey_scheduled' : 'new',
        surveyorId:        surveyorUser ? surveyorUser.id : null,
        surveyAt:          willScheduleSurvey ? surveyAt : null,
        createdById:       me.id,
      },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: { convertedOrderId: created.id },
    });
    // Событие создания в аудит-лог — как в обычном createOrderAction.
    await tx.orderEvent.create({
      data: {
        orderId:  created.id,
        authorId: me.id,
        kind:     'created',
        summary:  `Заказ создан из заявки · ${created.clientName}`,
        after:    snapshotFromOrder(created) as any,
      },
    });
    return { created };
  }).catch((e) => {
    console.error('[convertLeadToOrder] create failed', { leadId, error: e });
    return null;
  });

  if (!result) {
    return { ok: false, error: 'Не удалось создать заказ. Проверьте данные заявки и попробуйте ещё раз.' };
  }
  if ('already' in result) {
    // Заявку уже сконвертировали параллельно — ведём на существующий заказ.
    const fresh = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { convertedOrderId: true },
    });
    if (fresh?.convertedOrderId) redirect(`/orders/${fresh.convertedOrderId}`);
    return { ok: false, error: 'Заявка уже преобразована в заказ' };
  }
  const order = result.created;

  // Уведомления — замерщику в TG (общий чат) и push если подписан.
  // try/catch: сбой уведомления не должен валить уже созданный заказ.
  if (willScheduleSurvey && surveyorUser && surveyAt) {
   try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const surveyAtIso = surveyAt.toISOString();
    void notifyOrderAssignedSurveyTelegram({
      orderNumber:   order.number,
      orderId:       order.id,
      surveyorName:  surveyorUser.fullName,
      clientName:    lead.clientName,
      clientPhone:   lead.clientPhone,
      clientAddress: finalAddress,
      surveyAt:      surveyAtIso,
    }, baseUrl).catch((e) => console.warn('[telegram] survey assign notify failed', e));

    // Тот же гейт, что и в notifyOrderChanges: уважаем матрицу уведомлений
    // (директор мог выключить surveyAssigned для замерщиков).
    void notifySafe(async () => {
      if (!(await isEventAllowed('surveyor', 'surveyAssigned'))) return;
      await sendPushToUser(surveyorUser!.id, {
        title: `Замер: ${lead.clientName}`,
        body:  `${new Date(surveyAtIso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })} · ${finalAddress}`,
        url:   `/orders/${order.id}`,
        tag:   `order-${order.id}-survey`,
      });
    });
   } catch (e) {
    console.warn('[convertLeadToOrder] notify failed', e);
   }
  }

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/orders');
  redirect(`/orders/${order.id}?toast=${encodeURIComponent('Заявка преобразована в заказ')}&type=ok`);
}
