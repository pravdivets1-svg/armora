// Серверные функции для работы с заказами.
// Все запросы выполняются с учётом роли пользователя:
//   - director / manager  → видят все заказы
//   - surveyor / installer → только те, где они назначены

import { prisma } from '@/lib/prisma';
import type { Prisma, Role, Stage } from '@prisma/client';
import { isStaff } from '@/lib/auth-helpers';

export type OrderListFilters = {
  q?: string;        // поиск по ФИО или телефону
  stage?: Stage;
  userId?: string;   // фильтр по назначенному сотруднику
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

  if (f.stage) where.stage = f.stage;

  if (f.userId) {
    // Если уже стоит OR (полевой работник + фильтр) — игнорируем фильтр.
    // Полевой не должен иметь возможности смотреть чужие заказы через query-параметр.
    if (isStaff(me.role)) {
      where.AND = [
        { OR: [{ surveyorId: f.userId }, { installerId: f.userId }] },
      ];
    }
  }

  if (f.q) {
    const q = f.q.trim();
    const search: Prisma.OrderWhereInput = {
      OR: [
        { clientName:  { contains: q, mode: 'insensitive' } },
        { clientPhone: { contains: q } },
      ],
    };
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
