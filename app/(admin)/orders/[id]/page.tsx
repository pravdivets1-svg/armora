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
import { QuickActionsRow } from './quick-actions-row';
import { awaitingStateOf } from '@/lib/awaiting';
import { fmtDateTime } from '@/lib/format';
import { canViewOrder } from '@/lib/orders';
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
    select: { id: true, surveyorId: true, installerId: true, createdById: true, stage: true },
  });
  if (!access) notFound();
  // Единые правила доступа со страницей и API фото — см. canViewOrder в lib/orders.ts
  // (staff, назначенцы, автор заказа, установщик на стадиях production+).
  if (!canViewOrder(me, access)) notFound();

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

  // Директор может закрыть заказ из любой стадии (не только pending_closure).
  // Кнопка отрисуется в HeroStage по-разному: на pending_closure — главная accent CTA;
  // на остальных стадиях — секондари-линк «Закрыть напрямую».
  const canApproveClosure = me.role === 'director' && order.stage !== 'closed';

  // Себестоимость/маржа — только директор и замерщик. Менеджеру/установщику
  // НЕ отдаём costAmount в клиентский payload (иначе виден в исходнике/сети)
  // и прячем события money_cost в истории.
  const canSeeCost = me.role === 'director' || me.role === 'surveyor';

  const stageAction = updateOrderStageAction.bind(null, order.id) as (next: Stage) => Promise<void>;
  const approveAction = canApproveClosure
    ? (approveClosureAction.bind(null, order.id) as () => Promise<void>)
    : undefined;

  // Ближайшее событие по этапу — строкой в Hero, без захода в форму.
  let nextEvent: string | null = null;
  if (order.stage === 'survey_scheduled' && order.surveyAt) {
    nextEvent = `Замер: ${fmtDateTime(order.surveyAt)}${order.surveyor ? ` · ${order.surveyor.fullName}` : ''}`;
  } else if ((order.stage === 'ready_to_install' || order.stage === 'installed') && order.installAt) {
    nextEvent = `Установка: ${fmtDateTime(order.installAt)}${order.installer ? ` · ${order.installer.fullName}` : ''}`;
  }

  // «Ждём клиента»: при просрочке — поднимаем блок решений наверх (срочное действие).
  const awaiting = awaitingStateOf({
    awaitingClient:      order.awaitingClient,
    awaitingClientSince: order.awaitingClientSince,
    awaitingClientUntil: order.awaitingClientUntil,
  });
  const awaitingOverdue = awaiting.kind === 'overdue';
  // Карточку показываем staff и замерщику; установщику — только если просрочено.
  const showAwaiting = isStaff(me.role) || me.role === 'surveyor' || awaitingOverdue;

  const awaitingCard = showAwaiting ? (
    <AwaitingClientCard
      orderId={order.id}
      initial={order.awaitingClient}
      initialNote={order.awaitingClientNote ?? ''}
      since={order.awaitingClientSince}
      until={order.awaitingClientUntil}
      disabled={order.stage === 'closed'}
      canSeeDecisions={true}
      canCloseAsRejection={isStaff(me.role)}
    />
  ) : null;

  const orderForm = (
    <OrderForm
      order={canSeeCost ? order : { ...order, costAmount: 0 }}
      action={updateOrderAction.bind(null, order.id)}
      surveyors={surveyors}
      installers={installers}
      role={me.role}
      mode="edit"
      hideStageStepper
      comments={<CommentsBlock orderId={order.id} comments={order.comments} />}
    />
  );

  return (
    <>
      <PageHeader
        title={`Заказ № ${order.number}`}
        sub={order.clientName}
        backHref="/orders"
      />

      {/* pb на мобиле: таб-бар 64px + плавающий док HeroStage ~68px, иначе низ
          контента (история/ссылка клиенту) навсегда под доком. */}
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-3 space-y-2 pb-[calc(150px+env(safe-area-inset-bottom))] lg:pb-12">
        <HeroStageBlock
          current={order.stage}
          role={me.role}
          enteredAt={order.stageChangedAt.toISOString()}
          nextEvent={nextEvent}
          onStageChange={stageAction}
          onApproveClosure={approveAction}
        />

        {/* Срочное: при просрочке «ждём клиента» решение поднимаем сразу под этап */}
        {awaitingOverdue && awaitingCard}

        <QuickActionsRow
          clientPhone={order.clientPhone}
          clientAddress={order.clientAddress}
        />

        <OrderPhotos
          orderId={order.id}
          initial={photoMetas.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        />

        {orderForm}

        {/* «Ждём клиента» в обычной позиции (не просрочено) */}
        {!awaitingOverdue && awaitingCard}

        {isStaff(me.role) && (
          <EventLog events={canSeeCost ? events : events.filter((e) => e.kind !== 'money_cost')} />
        )}

        {/* Ссылка для клиента — диспетчерская функция, только staff */}
        {isStaff(me.role) && <PublicLinkBlock url={publicUrl} clientPhone={order.clientPhone} />}
      </div>
    </>
  );
}
