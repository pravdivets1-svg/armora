import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Phone, MapPin, MessageSquare, ExternalLink, AlertCircle, Tag } from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { LEAD_STAGE_LABEL } from '@/lib/lead-labels';
import { PageHeader, SectionCard, KeyValueRow, LeadPill, InsetGroup, InsetRow } from '@/components/uikit';
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
      // Door fields рендерятся отдельной секцией ниже
      'doorId', 'doorName', 'doorSeries', 'doorBasePrice',
      'doorPurpose', 'doorFinish', 'doorImage', 'doorTags',
    ]);
    for (const [k, v] of Object.entries(lead.payload as Record<string, unknown>)) {
      if (known.has(k)) continue;
      if (v === '' || v === null || v === undefined) continue;
      payloadEntries.push([k, v]);
    }
  }

  // Door info из payload (приходит с сайта-каталога)
  const payload = (lead.payload && typeof lead.payload === 'object' && !Array.isArray(lead.payload))
    ? (lead.payload as Record<string, unknown>)
    : {};
  const door = {
    id:        typeof payload.doorId === 'number' ? payload.doorId : null,
    name:      typeof payload.doorName === 'string' ? payload.doorName : null,
    series:    typeof payload.doorSeries === 'string' ? payload.doorSeries : null,
    basePrice: typeof payload.doorBasePrice === 'number' ? payload.doorBasePrice : null,
    purpose:   typeof payload.doorPurpose === 'string' ? payload.doorPurpose : null,
    finish:    typeof payload.doorFinish === 'string' ? payload.doorFinish : null,
    image:     typeof payload.doorImage === 'string' ? payload.doorImage : null,
    tags:      Array.isArray(payload.doorTags) ? (payload.doorTags as string[]) : null,
  };
  const hasDoor = !!(door.name || door.image);

  return (
    <>
      <PageHeader
        title={`Заявка № ${lead.number}`}
        sub={lead.clientName}
        backHref="/leads"
      />

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-3 space-y-2.5 pb-[120px] lg:pb-12">

        {/* Pill + meta строкой */}
        <div className="flex flex-wrap items-center gap-2">
          <LeadPill stage={lead.stage} size="md" />
          <span className="text-meta text-text3 tabular-nums">
            {fmtDateTime(lead.createdAt)} <span className="text-text3/60">•</span> источник: <span className="font-mono">{lead.source}</span>
          </span>
        </div>

        {/* Уже создан заказ */}
        {lead.convertedOrder && (
          <Link
            href={`/orders/${lead.convertedOrder.id}`}
            className="flex items-center gap-2.5 rounded-md bg-ok2-soft border border-ok2/25 px-3.5 py-2.5
                       transition-colors duration-fast hover:bg-ok2-soft/80"
          >
            <Tag size={14} className="text-ok2 shrink-0" />
            <div className="flex-1 text-[13.5px] text-text1">
              По этой заявке создан <span className="font-semibold tabular-nums">заказ №{lead.convertedOrder.number}</span>
            </div>
            <ExternalLink size={13} className="text-ok2 shrink-0" />
          </Link>
        )}

        {/* SPAM баннер */}
        {lead.stage === 'spam' && (
          <div className="flex items-start gap-2.5 rounded-md bg-bad2-soft border border-bad2/25 px-3.5 py-2.5">
            <AlertCircle size={14} className="text-bad2 mt-0.5 shrink-0" />
            <div className="text-[13.5px] text-text1">
              Заявка помечена как спам автоматически (заполнено honeypot-поле). Проверьте перед действием.
            </div>
          </div>
        )}

        {/* Контакты */}
        <InsetGroup label="Контакты">
          <InsetRow
            icon={<Phone size={15} />}
            label="Телефон"
            value={<span className="tabular-nums">{lead.clientPhone}</span>}
            href={`tel:${lead.clientPhone.replace(/\s+/g, '')}`}
            external
          />
          {lead.clientAddress && (
            <InsetRow
              icon={<MapPin size={15} />}
              label="Адрес"
              value={lead.clientAddress}
              href={`https://yandex.ru/maps/?text=${encodeURIComponent(lead.clientAddress)}`}
              external
            />
          )}
          {lead.assignedTo && (
            <InsetRow label="Ведёт" value={lead.assignedTo.fullName} />
          )}
        </InsetGroup>

        {/* Дверь из каталога — если клиент выбрал конкретную модель на сайте.
            Linear-стиль: ведёт себя как обычная SectionCard, цена нейтральная (без accent),
            картинка скромная без тени. */}
        {hasDoor && (
          <SectionCard title="Выбранная модель">
            <div className="flex flex-col sm:flex-row gap-4">
              {door.image && (
                <a href={door.image} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* Используем <img> а не next/image — это внешний URL без явного allow-host */}
                  <img
                    src={door.image}
                    alt={door.name ?? 'Дверь'}
                    className="w-full sm:w-32 max-h-48 rounded-md border border-borderc bg-subtle object-contain"
                  />
                </a>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-text1 mb-1 truncate">{door.name ?? '—'}</h3>
                {(door.series || door.purpose) && (
                  <p className="text-meta text-text3 mb-2">
                    {door.series && <>Серия: <span className="text-text2">{door.series}</span></>}
                    {door.series && door.purpose && <span className="text-text3/60"> • </span>}
                    {door.purpose && door.purpose}
                  </p>
                )}
                {door.basePrice != null && (
                  <p className="text-[14px] text-text1 tabular-nums mb-2.5">
                    <span className="text-text3">Базовая цена:</span>{' '}
                    <span className="font-semibold">{Number(door.basePrice).toLocaleString('ru-RU')} ₽</span>
                  </p>
                )}
                {door.tags && door.tags.length > 0 && (
                  <ul className="space-y-0.5">
                    {door.tags.slice(0, 10).map((t) => (
                      <li key={t} className="text-[13px] text-text2 flex gap-2">
                        <span className="text-text3 shrink-0">·</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {door.id != null && (
                  <p className="text-meta text-text3 mt-2.5 tabular-nums">ID каталога: {door.id}</p>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Параметры двери (размеры замера + ориентир. цена) */}
        <InsetGroup label="Размер и расчёт">
          <InsetRow label="Ширина" value={<span className="tabular-nums">{lead.widthMm ? `${lead.widthMm} мм` : '—'}</span>} />
          <InsetRow label="Высота" value={<span className="tabular-nums">{lead.heightMm ? `${lead.heightMm} мм` : '—'}</span>} />
          <InsetRow
            label="Ориентир. цена"
            value={<span className="tabular-nums">{lead.estimatedPrice && Number(lead.estimatedPrice) > 0
              ? fmtMoney(Number(lead.estimatedPrice))
              : '—'}</span>}
          />
        </InsetGroup>

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
          <InsetGroup label="Доп. параметры с калькулятора">
            {payloadEntries.map(([k, v]) => (
              <InsetRow key={k} label={k} value={String(v)} />
            ))}
          </InsetGroup>
        )}

        {/* UTM */}
        {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
          <InsetGroup label="UTM-метки">
            <InsetRow label="Source"   value={<span className="tabular-nums">{lead.utmSource ?? '—'}</span>} />
            <InsetRow label="Medium"   value={<span className="tabular-nums">{lead.utmMedium ?? '—'}</span>} />
            <InsetRow label="Campaign" value={<span className="tabular-nums">{lead.utmCampaign ?? '—'}</span>} />
          </InsetGroup>
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
          <span>IP: <span className="font-mono tabular-nums">{lead.ip ?? '—'}</span></span>
          {lead.userAgent && <span className="truncate">UA: <span className="font-mono">{lead.userAgent.slice(0, 60)}</span></span>}
        </div>
      </div>
    </>
  );
}
