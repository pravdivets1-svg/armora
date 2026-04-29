// Карточка заказа /orders/[id] — premium redesign.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import { logoutAction } from '@/app/(auth)/actions';
import { StageBadge } from '@/components/stage-badge';
import { Topbar } from '@/components/ds/topbar';
import { PageEnter } from '@/components/ds/motion';
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
    <>
      <Topbar
        title={`Заказ № ${order.number}`}
        subtitle={order.clientName}
        onLogout={logoutAction}
        actions={<StageBadge stage={order.stage} />}
      />

      <PageEnter className="px-6 py-6 max-w-[1400px] w-full mx-auto space-y-5">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg transition-colors duration-150"
        >
          <ArrowLeft size={14} strokeWidth={1.75} /> Все заказы
        </Link>

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
      </PageEnter>
    </>
  );
}
