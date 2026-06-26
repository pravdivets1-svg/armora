// Серверные функции для работы с заказами.
// Все запросы выполняются с учётом роли пользователя:
//   - director / manager  → видят все заказы
//   - surveyor / installer → только те, где они назначены

import { prisma } from '@/lib/prisma';
import type { Prisma, Role, Stage } from '@prisma/client';
import { isStaff } from '@/lib/auth-helpers';
import { mskDayStart } from '@/lib/format';

export type OrderListFilters = {
  q?: string;        // поиск по ФИО или телефону
  stage?: Stage;
  userId?: string;   // фильтр по назначенному сотруднику
  scope?: 'today' | 'waiting'; // быстрый фильтр: события сегодня / ждём клиента
  page?: number;
};

const PAGE_SIZE = 25;

export function buildOrderWhere(
  me: { id: string; role: Role },
  f: OrderListFilters,
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  // Полевые работники видят только свои заказы
  if (!isStaff(me.role)) {
    where.OR = [{ surveyorId: me.id }, { installerId: me.id }];
  }

  // По дефолту скрываем закрытые: они доступны на отдельной странице /archive.
  // Явный фильтр по stage перебивает это поведение.
  if (f.stage) {
    where.stage = f.stage;
  } else {
    where.stage = { not: 'closed' };
  }

  if (f.userId) {
    // Если уже стоит OR (полевой работник + фильтр) — игнорируем фильтр.
    // Полевой не должен иметь возможности смотреть чужие заказы через query-параметр.
    if (isStaff(me.role)) {
      where.AND = [
        { OR: [{ surveyorId: f.userId }, { installerId: f.userId }] },
      ];
    }
  }

  // Быстрые scope-фильтры из PillTabs (вкладки «Сегодня» / «Ждут»).
  if (f.scope === 'today') {
    // События (замер/установка), назначенные на сегодня по МСК.
    const dayStart = mskDayStart(new Date());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    where.AND = ([] as Prisma.OrderWhereInput[]).concat(where.AND ?? [], [{
      OR: [
        { stage: 'survey_scheduled', surveyAt:  { gte: dayStart, lt: dayEnd } },
        { stage: 'ready_to_install', installAt: { gte: dayStart, lt: dayEnd } },
      ],
    }]);
  } else if (f.scope === 'waiting') {
    // «Ждём клиента» — заказы с активным флагом ожидания (см. lib/awaiting.ts).
    where.awaitingClient = true;
  }

  if (f.q) {
    const q = f.q.trim();
    // Поиск по: номеру заказа (если введено число), ФИО, телефону, адресу.
    // Телефон ищем по нормализованному полю clientPhoneDigits (без пробелов/скобок),
    // в запросе тоже выкидываем всё кроме цифр — формат ввода не важен.
    const ors: Prisma.OrderWhereInput[] = [
      { clientName:    { contains: q, mode: 'insensitive' } },
      { clientAddress: { contains: q, mode: 'insensitive' } },
    ];
    const qDigits = q.replace(/\D/g, '');
    if (qDigits.length >= 3) {
      ors.push({ clientPhoneDigits: { contains: qDigits } });
    }
    const asNumber = Number(q.replace(/^#/, ''));
    if (Number.isInteger(asNumber) && asNumber > 0) {
      ors.push({ number: asNumber });
    }
    const search: Prisma.OrderWhereInput = { OR: ors };
    where.AND = ([] as Prisma.OrderWhereInput[]).concat(where.AND ?? [], [search]);
  }

  return where;
}

export async function listOrders(
  me: { id: string; role: Role },
  f: OrderListFilters,
) {
  const where = buildOrderWhere(me, f);
  const page = Math.max(1, f.page ?? 1);

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { number: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        surveyor:  { select: { id: true, fullName: true } },
        installer: { select: { id: true, fullName: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// Список сотрудников для фильтра «по сотруднику» (только активные, не директор)
export async function listAssignableUsers() {
  return prisma.user.findMany({
    where: { isActive: true, role: { in: ['surveyor', 'installer'] } },
    select: { id: true, fullName: true, role: true },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });
}

// =====================================================================
// Архив — закрытые заказы. Доступен всем кроме установщика.
// =====================================================================
export async function listClosedOrders(
  me: { id: string; role: Role },
  f: Omit<OrderListFilters, 'stage'>,
) {
  const where: Prisma.OrderWhereInput = { stage: 'closed' };

  // Полевые работники видят только свои назначения
  if (!isStaff(me.role)) {
    where.OR = [{ surveyorId: me.id }, { installerId: me.id }];
  }

  if (f.userId && isStaff(me.role)) {
    where.AND = [{ OR: [{ surveyorId: f.userId }, { installerId: f.userId }] }];
  }

  if (f.q) {
    const q = f.q.trim();
    const ors: Prisma.OrderWhereInput[] = [
      { clientName:    { contains: q, mode: 'insensitive' } },
      { clientAddress: { contains: q, mode: 'insensitive' } },
    ];
    const qDigits = q.replace(/\D/g, '');
    if (qDigits.length >= 3) ors.push({ clientPhoneDigits: { contains: qDigits } });
    const asNumber = Number(q.replace(/^#/, ''));
    if (Number.isInteger(asNumber) && asNumber > 0) ors.push({ number: asNumber });
    where.AND = ([] as Prisma.OrderWhereInput[]).concat(where.AND ?? [], [{ OR: ors }]);
  }

  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { updatedAt: 'desc' },  // самые недавно закрытые сверху
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        surveyor:  { select: { id: true, fullName: true } },
        installer: { select: { id: true, fullName: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items, total, page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
