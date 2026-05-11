import { notFound } from 'next/navigation';
import { Phone, MapPin, MoreHorizontal } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import {
  PageHeader, SectionCard, KeyValueRow, IconButton,
} from '@/components/uikit';
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

function fmtRub(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return '—';
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

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

  const enteredAt = order.updatedAt;
  const enteredBy = order.surveyor?.fullName ?? order.installer?.fullName ?? undefined;

  const canApproveClosure =
    me.role === 'director' && order.stage === 'pending_closure';

  const total = Number(order.totalAmount);
  const prepay = Number(order.prepayment);
  const finalPmt = Number(order.finalPayment);
  const due = total - prepay - finalPmt;

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
        actions={
          <IconButton size={40} aria-label="Меню">
            <MoreHorizontal size={18} />
          </IconButton>
        }
      />

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 space-y-3 pb-12">
        <HeroStageBlock
          current={order.stage}
          role={me.role}
          enteredAt={enteredAt.toISOString()}
          enteredBy={enteredBy}
          onStageChange={stageAction}
          onApproveClosure={approveAction}
        />

        <SectionCard title="Клиент">
          <KeyValueRow label="ФИО" value={order.clientName} />
          <KeyValueRow
            label="Телефон"
            value={
              order.clientPhone ? (
                <a href={`tel:${order.clientPhone}`} className="text-accent tabular-nums hover:underline">
                  {fmtPhone(order.clientPhone)}
                </a>
              ) : '—'
            }
            action={order.clientPhone ? <Phone size={14} className="text-text3" /> : null}
          />
          <KeyValueRow
            label="Адрес"
            value={
              order.clientAddress ? (
                <a
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent(order.clientAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text1 hover:text-accent"
                >
                  {order.clientAddress}
                </a>
              ) : '—'
            }
            action={order.clientAddress ? <MapPin size={14} className="text-text3" /> : null}
          />
        </SectionCard>

        <SectionCard title="Финансы">
          <KeyValueRow label="Сумма по договору" value={fmtRub(total)} mono />
          <KeyValueRow label="Аванс" value={fmtRub(prepay)} mono />
          <KeyValueRow label="Остаток получен" value={fmtRub(finalPmt)} mono />
          <KeyValueRow label="К доплате" value={fmtRub(Math.max(0, due))} mono />
        </SectionCard>

        <SectionCard title="Замер">
          <KeyValueRow
            label="Замерщик"
            value={order.surveyor?.fullName ?? <span className="text-text3">не назначен</span>}
          />
          <KeyValueRow label="Дата замера" value={fmtDateTime(order.surveyAt)} mono />
        </SectionCard>

        <SectionCard title="Установка">
          <KeyValueRow
            label="Установщик"
            value={order.installer?.fullName ?? <span className="text-text3">не назначен</span>}
          />
          <KeyValueRow label="Дата установки" value={fmtDateTime(order.installAt)} mono />
        </SectionCard>

        <SectionCard title="Публичная ссылка">
          <PublicLinkBlock url={publicUrl} clientPhone={order.clientPhone} />
        </SectionCard>

        <SectionCard title="Фото">
          <OrderPhotos
            orderId={order.id}
            initial={photoMetas.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
          />
        </SectionCard>

        <SectionCard title="Полная форма">
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
        </SectionCard>

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
      </div>
    </>
  );
}
