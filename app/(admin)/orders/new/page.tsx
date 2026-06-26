// /orders/new — modern.

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import OrderForm from '../[id]/order-form';
import { createOrderAction } from '../actions';
import { PageBack, PageHeader } from '@/components/page-shell';

export const metadata = { title: 'Новый заказ — Armora' };

export default async function NewOrderPage() {
  const me = await requireRole(['director', 'manager']);

  // Один запрос вместо двух — фильтруем по двум ролям сразу.
  const assignable = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['surveyor', 'installer'] } },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: 'asc' },
  });
  const surveyors  = assignable.filter((u) => u.role === 'surveyor');
  const installers = assignable.filter((u) => u.role === 'installer');

  return (
    <main className="max-w-4xl mx-auto px-4 lg:px-6 py-4 space-y-3 pb-[88px] lg:pb-12">
      <PageBack href="/orders" label="Все заказы" />
      <PageHeader kicker="Создать" title="Новый заказ" />

      <OrderForm
        action={createOrderAction}
        surveyors={surveyors}
        installers={installers}
        role={me.role}
        mode="create"
      />
    </main>
  );
}
