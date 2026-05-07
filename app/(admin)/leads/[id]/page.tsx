// Карточка заявки. Показывает все данные с калькулятора, действия по этапам,
// конверсию в Order. Для director + manager.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Phone, MapPin, MessageSquare, Trash2, AlertCircle, Tag, ExternalLink } from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { LEAD_STAGE_LABEL, LEAD_STAGE_TONE } from '@/lib/lead-labels';
import { Card, Button } from '@/components/ui';
import { PageBack, PageHeader } from '@/components/page-shell';
import { setLeadStageAction, deleteLeadAction, assignLeadAction, convertLeadToOrderAction } from '../actions';
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

  const managers = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['director', 'manager'] } },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });

  // Сырой payload — отдельные «нестандартные» поля калькулятора
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
    <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      <PageBack href="/leads" label="Все заявки" />

      <PageHeader
        kicker={
          <span className="inline-flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px]
                              uppercase tracking-wider font-semibold normal-case ${LEAD_STAGE_TONE[lead.stage]}`}>
              {LEAD_STAGE_LABEL[lead.stage]}
            </span>
            Заявка №{lead.number}
          </span>
        }
        title={lead.clientName}
        sub={`Поступила ${fmtDateTime(lead.createdAt)} · источник: ${lead.source}`}
      />

      {/* Уже создан заказ — баннер */}
      {lead.convertedOrder && (
        <div className="bg-white border border-line border-l-4 border-l-ok rounded-lg px-4 py-3
                        flex items-center gap-3">
          <Tag size={16} className="text-ok shrink-0" />
          <div className="flex-1 text-[14px] text-ink-900">
            По этой заявке создан <Link href={`/orders/${lead.convertedOrder.id}`} className="font-semibold underline hover:no-underline">заказ №{lead.convertedOrder.number}</Link>
          </div>
          <Link
            href={`/orders/${lead.convertedOrder.id}`}
            className="inline-flex items-center gap-1 text-[13px] text-ink-700 hover:text-ink-900 font-medium"
          >
            Открыть <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {lead.stage === 'spam' && (
        <div className="bg-white border border-line border-l-4 border-l-bad rounded-lg px-4 py-3
                        flex items-start gap-2.5">
          <AlertCircle size={16} className="text-bad mt-0.5 shrink-0" />
          <div className="text-[14px] text-ink-900">
            Заявка помечена как спам автоматически (заполнено honeypot-поле). Проверьте перед действием.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card title="Контакты">
            <div className="space-y-2.5">
              <Row icon={<Phone size={14} />} label="Телефон">
                <a href={`tel:${lead.clientPhone.replace(/\s+/g, '')}`}
                   className="font-mono text-ink-900 hover:underline">
                  {lead.clientPhone}
                </a>
              </Row>
              {lead.clientAddress && (
                <Row icon={<MapPin size={14} />} label="Адрес">
                  <span className="text-ink-900">{lead.clientAddress}</span>
                </Row>
              )}
            </div>
          </Card>

          <Card title="Параметры двери">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
              <Field label="Ширина" value={lead.widthMm ? `${lead.widthMm} мм` : '—'} />
              <Field label="Высота" value={lead.heightMm ? `${lead.heightMm} мм` : '—'} />
              <Field
                label="Ориентир. цена"
                value={lead.estimatedPrice && Number(lead.estimatedPrice) > 0
                  ? fmtMoney(Number(lead.estimatedPrice))
                  : '—'}
              />
            </div>
            {lead.comment && lead.comment.trim() && (
              <div className="mt-4 pt-4 border-t border-line">
                <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5
                                inline-flex items-center gap-1.5">
                  <MessageSquare size={11} /> Комментарий клиента
                </div>
                <div className="text-[14px] text-ink-900 whitespace-pre-wrap">{lead.comment}</div>
              </div>
            )}
          </Card>

          {payloadEntries.length > 0 && (
            <Card title="Доп. параметры с калькулятора">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                {payloadEntries.map(([k, v]) => (
                  <Field key={k} label={k} value={String(v)} />
                ))}
              </div>
            </Card>
          )}

          {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
            <Card title="UTM-метки">
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-[13px]">
                <Field label="Source"   value={lead.utmSource ?? '—'} />
                <Field label="Medium"   value={lead.utmMedium ?? '—'} />
                <Field label="Campaign" value={lead.utmCampaign ?? '—'} />
              </div>
            </Card>
          )}
        </div>

        {/* Правая колонка: действия */}
        <div className="md:col-span-1">
          <LeadActions
            leadId={lead.id}
            currentStage={lead.stage}
            estimatedPrice={Number(lead.estimatedPrice ?? 0)}
            assignedToId={lead.assignedToId}
            assignedToName={lead.assignedTo?.fullName ?? null}
            managers={managers}
            isDirector={me.role === 'director'}
            convertedOrderId={lead.convertedOrderId}
          />
        </div>
      </div>

      <div className="text-[11px] text-ink-400 pt-4 border-t border-line/50 flex flex-wrap gap-x-4 gap-y-1">
        <span>IP: {lead.ip ?? '—'}</span>
        <span className="truncate">UA: {lead.userAgent ?? '—'}</span>
      </div>
    </main>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[14px]">
      <span className="text-ink-400 shrink-0">{icon}</span>
      <span className="text-[12px] text-ink-500 w-20 shrink-0">{label}</span>
      <span className="flex-1 min-w-0 truncate">{children}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">{label}</div>
      <div className="text-ink-900 font-medium mt-0.5">{value}</div>
    </div>
  );
}
