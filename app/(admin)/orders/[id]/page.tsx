// Карточка заказа: /orders/[id] — modern 2026.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import { StageBadge } from '@/components/stage-badge';
import OrderForm from './order-form';
import PublicLinkBlock from './public-link-block';
import CommentsBlock from './comments-block';
import { updateOrderAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: { id: string } }) {
  const me = await requireUser();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      surveyor:  { select: { id: true, fullName: true, phone: true } },
      installer: { select: { id: true, fullName: true, phone: true } },
      comments: {
        include: { author: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!order) notFound();

  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) notFound();

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const publicUrl = `${baseUrl}/order/${order.publicToken}`;

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={14} /> Все заказы
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] text-ink-500 uppercase tracking-wide">Заказ</div>
          <h1 className="text-display text-ink-900 mt-1">№ {order.number}</h1>
          <div className="mt-3 text-[15px] text-ink-700">{order.clientName}</div>
        </div>
        <StageBadge stage={order.stage} size="md" />
      </div>

      <PublicLinkBlock url={publicUrl} clientPhone={order.clientPhone} />

      <OrderForm
        order={order}
        action={updateOrderAction.bind(null, order.id)}
        surveyors={surveyors}
        installers={installers}
        canEditAll={isStaff(me.role)}
        canDelete={me.role === 'director'}
        mode="edit"
        comments={<CommentsBlock orderId={order.id} comments={order.comments} />}
      />
    </main>
  );
}
