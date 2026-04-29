// /orders/new — modern.

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
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
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={14} /> Все заказы
      </Link>

      <div>
        <div className="text-[11px] text-ink-500 uppercase tracking-wide">Создать</div>
        <h1 className="text-display text-ink-900 mt-1">Новый заказ</h1>
      </div>

      <OrderForm
        action={createOrderAction}
        surveyors={surveyors}
        installers={installers}
        canEditAll
        canDelete={false}
        mode="create"
      />
    </main>
  );
}
