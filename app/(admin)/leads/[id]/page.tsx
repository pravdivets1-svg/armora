import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Phone, MapPin, MessageSquare, ExternalLink, AlertCircle, Tag } from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { LEAD_STAGE_LABEL } from '@/lib/lead-labels';
import { PageHeader, SectionCard, KeyValueRow, LeadPill } from '@/components/uikit';
import LeadActions from './lead-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Заявка — Armora' };

export default async function LeadPage({ params }: { params: { id: string } }) {
  const me = await requireUser();
  if (!isStaff(me.role)) redirect('/orders');

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: { select: { id: true, fullName: true } },
      convertedOrder: { select: { id: true, number: true, stage: true } },
    },
  });
  if (!lead) notFound();

  const [managers, surveyors] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { in: ['director', 'manager'] } },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: 'surveyor' },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  // Сырые «нестандартные» поля payload
  const payloadEntries: Array<[string, unknown]> = [];
  if (lead.payload && typeof lead.payload === 'object' && !Array.isArray(lead.payload)) {
    const known = new Set([
      'clientName', 'clientPhone', 'clientAddress', 'comment',
      'widthMm', 'heightMm', 'estimatedPrice', 'source',
      'utmSource', 'utmMedium', 'utmCampaign',
    ]);
    for (const [k, v] of Object.entries(lead.payload as Record<string, unknown>)) {
      if (known.has(k)) continue;
      if (v === '' || v === null || v === undefined) continue;
      payloadEntries.push([k, v]);
    }
  }

  return (
    <>
      <PageHeader
        title={`Заявка № ${lead.number}`}
        sub={lead.clientName}
        backHref="/leads"
      />

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 space-y-3 pb-[120px] lg:pb-12">

        {/* Pill + meta строкой */}
        <div className="flex flex-wrap items-center gap-2">
          <LeadPill stage={lead.stage} size="md" />
          <span className="text-meta text-text3">
            {fmtDateTime(lead.createdAt)} · источник: <span className="font-mono">{lead.source}</span>
          </span>
        </div>

        {/* Уже создан заказ */}
        {lead.convertedOrder && (
          <Link
            href={`/orders/${lead.convertedOrder.id}`}
            className="flex items-center gap-3 rounded-md bg-ok2-soft border border-ok2/30 px-4 py-3
                       transition-transform duration-fast active:scale-[0.99]"
          >
            <Tag size={16} className="text-ok2 shrink-0" />
            <div className="flex-1 text-[14px] text-text1">
              По этой заявке создан <span className="font-semibold">заказ №{lead.convertedOrder.number}</span>
            </div>
            <ExternalLink size={14} className="text-ok2 shrink-0" />
          </Link>
        )}

        {/* SPAM баннер */}
        {lead.stage === 'spam' && (
          <div className="flex items-start gap-2.5 rounded-md bg-bad2-soft border border-bad2/30 px-4 py-3">
            <AlertCircle size={16} className="text-bad2 mt-0.5 shrink-0" />
            <div className="text-[14px] text-text1">
              Заявка помечена как спам автоматически (заполнено honeypot-поле). Проверьте перед действием.
            </div>
          </div>
        )}

        {/* Контакты */}
        <SectionCard title="Контакты">
          <KeyValueRow
            label="Телефон"
            value={
              <a href={`tel:${lead.clientPhone.replace(/\s+/g, '')}`} className="text-accent tabular-nums hover:underline">
                {lead.clientPhone}
              </a>
            }
            action={<Phone size={14} className="text-text3" />}
          />
          {lead.clientAddress && (
            <KeyValueRow
              label="Адрес"
              value={
                <a
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent(lead.clientAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text1 hover:text-accent"
                >
                  {lead.clientAddress}
                </a>
              }
              action={<MapPin size={14} className="text-text3" />}
            />
          )}
          {lead.assignedTo && (
            <KeyValueRow label="Ведёт" value={lead.assignedTo.fullName} />
          )}
        </SectionCard>

        {/* Параметры двери */}
        <SectionCard title="Параметры двери">
          <KeyValueRow label="Ширина" value={lead.widthMm ? `${lead.widthMm} мм` : '—'} mono />
          <KeyValueRow label="Высота" value={lead.heightMm ? `${lead.heightMm} мм` : '—'} mono />
          <KeyValueRow
            label="Ориентир. цена"
            value={lead.estimatedPrice && Number(lead.estimatedPrice) > 0
              ? fmtMoney(Number(lead.estimatedPrice))
              : '—'}
            mono
          />
        </SectionCard>

        {/* Комментарий */}
        {lead.comment && lead.comment.trim() && (
          <SectionCard title="Комментарий клиента">
            <div className="flex items-start gap-2 text-[14px] text-text1 whitespace-pre-wrap">
              <MessageSquare size={14} className="text-text3 mt-1 shrink-0" />
              <span>{lead.comment}</span>
            </div>
          </SectionCard>
        )}

        {/* Доп параметры калькулятора */}
        {payloadEntries.length > 0 && (
          <SectionCard title="Доп. параметры с калькулятора">
            {payloadEntries.map(([k, v]) => (
              <KeyValueRow key={k} label={k} value={String(v)} />
            ))}
          </SectionCard>
        )}

        {/* UTM */}
        {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
          <SectionCard title="UTM-метки">
            <KeyValueRow label="Source" value={lead.utmSource ?? '—'} mono />
            <KeyValueRow label="Medium" value={lead.utmMedium ?? '—'} mono />
            <KeyValueRow label="Campaign" value={lead.utmCampaign ?? '—'} mono />
          </SectionCard>
        )}

        {/* Действия (статусы, назначение, удаление) */}
        <LeadActions
          leadId={lead.id}
          currentStage={lead.stage}
          estimatedPrice={Number(lead.estimatedPrice ?? 0)}
          clientAddress={lead.clientAddress ?? ''}
          assignedToId={lead.assignedToId}
          managers={managers}
          surveyors={surveyors}
          isDirector={me.role === 'director'}
          convertedOrderId={lead.convertedOrderId}
        />

        <div className="text-meta text-text3 pt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>IP: <span className="font-mono">{lead.ip ?? '—'}</span></span>
          {lead.userAgent && <span className="truncate">UA: <span className="font-mono">{lead.userAgent.slice(0, 60)}</span></span>}
        </div>
      </div>
    </>
  );
}
