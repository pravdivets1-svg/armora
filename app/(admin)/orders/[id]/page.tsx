// Карточка заказа: /orders/[id] — modern 2026.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import { StageBadge } from '@/components/stage-badge';
import { PageBack, PageHeader } from '@/components/page-shell';
import KeyboardShortcuts from '@/components/keyboard-shortcuts';
import OrderForm from './order-form';
import OrderPhotos from './order-photos';
import PublicLinkBlock from './public-link-block';
import CommentsBlock from './comments-block';
import EventLog from './event-log';
import { updateOrderAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: { id: string } }) {
  const me = await requireUser();

  // 1) Сначала дешёвая проверка доступа: только id назначенцев — без полных данных.
  //    Чужой пользователь получает 404 и НЕ грузит клиентские данные/комментарии.
  const access = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, surveyorId: true, installerId: true },
  });
  if (!access) notFound();
  const isMine = access.surveyorId === me.id || access.installerId === me.id;
  if (!isStaff(me.role) && !isMine) notFound();

  // 2) Полная выборка + список назначаемых сотрудников ПАРАЛЛЕЛЬНО.
  //    Также один запрос вместо двух за surveyors/installers — фильтруем в JS.
  //    Фото берём только метаданные (без BYTEA), чтобы не тянуть мегабайты в RSC.
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

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <PageBack href="/orders" label="Все заказы" />

      <PageHeader
        kicker="Заказ"
        title={`№ ${order.number}`}
        sub={order.clientName}
        meta={<StageBadge stage={order.stage} size="md" />}
      />

      <PublicLinkBlock url={publicUrl} clientPhone={order.clientPhone} />

      <OrderPhotos
        orderId={order.id}
        initial={photoMetas.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
        }))}
      />

      <OrderForm
        order={order}
        action={updateOrderAction.bind(null, order.id)}
        surveyors={surveyors}
        installers={installers}
        role={me.role}
        mode="edit"
        comments={<CommentsBlock orderId={order.id} comments={order.comments} />}
      />

      {/* Лента событий — только для staff (исполнителям не показываем
          финансовые изменения в истории). */}
      {isStaff(me.role) && (
        <EventLog events={events} />
      )}

      <KeyboardShortcuts />
    </main>
  );
}
