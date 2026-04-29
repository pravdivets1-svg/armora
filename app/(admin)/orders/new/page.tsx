// /orders/new — premium redesign.

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { logoutAction } from '@/app/(auth)/actions';
import { Topbar } from '@/components/ds/topbar';
import { PageEnter } from '@/components/ds/motion';
import OrderForm from '../[id]/order-form';
import { createOrderAction } from '../actions';

export const metadata = { title: 'Новый заказ — Armora' };

export default async function NewOrderPage() {
  await requireRole(['director', 'manager']);

  const [surveyors, installers] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: 'surveyor' },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: 'installer' },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return (
    <>
      <Topbar title="Новый заказ" subtitle="Заполните данные клиента и двери" onLogout={logoutAction} />

      <PageEnter className="px-6 py-6 max-w-[1400px] w-full mx-auto space-y-5">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg transition-colors duration-150"
        >
          <ArrowLeft size={14} strokeWidth={1.75} /> Все заказы
        </Link>

        <OrderForm
          action={createOrderAction}
          surveyors={surveyors}
          installers={installers}
          canEditAll
          canDelete={false}
          mode="create"
        />
      </PageEnter>
    </>
  );
}
