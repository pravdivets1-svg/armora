import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import { PageHeader } from '@/components/uikit';
import OrderForm from './order-form';
import OrderPhotos from './order-photos';
import AwaitingClientCard from './order-awaiting-card';
import PublicLinkBlock from './public-link-block';
import CommentsBlock from './comments-block';
import EventLog from './event-log';
import HeroStageBlock from './hero-stage-block';
import {
  updateOrderAction,
  updateOrderStageAction,
  approveClosureAction,
} from '../actions';
import type { Stage } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: { id: string } }) {
  const me = await requireUser();

  const access = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, surveyorId: true, installerId: true },
  });
  if (!access) notFound();
  const isMine = access.surveyorId === me.id || access.installerId === me.id;
  if (!isStaff(me.role) && !isMine) notFound();

  const [order, assignableUsers, events, photoMetas] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: {
        surveyor:  { select: { id: true, fullName: true, phone: true } },
        installer: { select: { id: true, fullName: true, phone: true } },
        comments: {
          include: { author: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ['surveyor', 'installer'] } },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.orderEvent.findMany({
      where: { orderId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: { fullName: true, role: true } } },
    }),
    prisma.orderPhoto.findMany({
      where: { orderId: params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, kind: true, mime: true, size: true,
        width: true, height: true, caption: true, createdAt: true,
        author: { select: { id: true, fullName: true } },
      },
    }),
  ]);
  if (!order) notFound();

  const surveyors  = assignableUsers.filter((u) => u.role === 'surveyor');
  const installers = assignableUsers.filter((u) => u.role === 'installer');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const publicUrl = `${baseUrl}/order/${order.publicToken}`;

  const canApproveClosure =
    me.role === 'director' && order.stage === 'pending_closure';

  const stageAction = updateOrderStageAction.bind(null, order.id) as (next: Stage) => Promise<void>;
  const approveAction = canApproveClosure
    ? (approveClosureAction.bind(null, order.id) as () => Promise<void>)
    : undefined;

  return (
    <>
      <PageHeader
        title={`Заказ № ${order.number}`}
        sub={order.clientName}
        backHref="/orders"
      />

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 space-y-2.5 pb-[88px] lg:pb-12">
        <HeroStageBlock
          current={order.stage}
          role={me.role}
          enteredAt={order.updatedAt.toISOString()}
          onStageChange={stageAction}
          onApproveClosure={approveAction}
        />

        <OrderPhotos
          orderId={order.id}
          initial={photoMetas.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        />

        <OrderForm
          order={order}
          action={updateOrderAction.bind(null, order.id)}
          surveyors={surveyors}
          installers={installers}
          role={me.role}
          mode="edit"
          hideStageStepper
          comments={<CommentsBlock orderId={order.id} comments={order.comments} />}
        />

        <AwaitingClientCard
          orderId={order.id}
          initial={order.awaitingClient}
          initialNote={order.awaitingClientNote ?? ''}
          since={order.awaitingClientSince}
          until={order.awaitingClientUntil}
          disabled={order.stage === 'closed'}
          canSeeDecisions={true}
        />

        {isStaff(me.role) && <EventLog events={events} />}

        <PublicLinkBlock url={publicUrl} clientPhone={order.clientPhone} />
      </div>
    </>
  );
}
