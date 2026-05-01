// Список заявок с сайта. Для director + manager.

import Link from 'next/link';
import { Inbox, Phone, MapPin, Clock, ChevronRight } from 'lucide-react';
import type { LeadStage } from '@prisma/client';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER, LEAD_STAGE_TONE } from '@/lib/lead-labels';
import { fmtDateTime } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { Metric, MetricCard } from '@/components/metric';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Заявки — Armora' };

type Search = { stage?: string; q?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();
  if (!isStaff(me.role)) redirect('/orders');

  const stage = (LEAD_STAGE_ORDER as string[]).includes(searchParams.stage ?? '')
    ? (searchParams.stage as LeadStage)
    : undefined;

  const q = (searchParams.q ?? '').trim();
  const phoneQ = q.replace(/\D/g, '');

  const where: any = {};
  if (stage) where.stage = stage;
  if (q) {
    where.OR = [
      { clientName: { contains: q, mode: 'insensitive' } },
      ...(phoneQ ? [{ clientPhoneDigits: { contains: phoneQ } }] : []),
    ];
  }

  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { assignedTo: { select: { fullName: true } } },
    }),
    prisma.lead.groupBy({
      by: ['stage'],
      _count: { _all: true },
    }),
  ]);

  const countByStage: Partial<Record<LeadStage, number>> = {};
  for (const c of counts) countByStage[c.stage] = c._count._all;
  const newCount = countByStage.new ?? 0;
  const inWorkCount = (countByStage.contacted ?? 0) + (countByStage.scheduled ?? 0);
  const convertedCount = countByStage.converted ?? 0;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="font-display text-[56px] md:text-[64px] leading-[0.95] tracking-tight text-ink-900">
          Заявки
        </h1>
        <div className="text-[14px] text-ink-500 mt-2">
          Входящие обращения с сайта и калькулятора
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard variant={newCount > 0 ? 'accent' : 'default'}>
          <Metric label="Новые" value={newCount} size="lg" tone={newCount > 0 ? 'accent' : 'default'} />
        </MetricCard>
        <MetricCard>
          <Metric label="В работе" value={inWorkCount} size="lg" tone="default" />
        </MetricCard>
        <MetricCard>
          <Metric label="Конвертировано" value={convertedCount} size="lg" tone="ok" />
        </MetricCard>
      </div>

      {/* Фильтр + поиск */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip href="/leads" active={!stage} label="Все" />
        {LEAD_STAGE_ORDER.map((s) => (
          <FilterChip
            key={s}
            href={`/leads?stage=${s}`}
            active={stage === s}
            label={LEAD_STAGE_LABEL[s]}
            count={countByStage[s] ?? 0}
          />
        ))}
        <form action="/leads" className="ml-auto">
          {stage && <input type="hidden" name="stage" value={stage} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Поиск по имени или телефону"
            className="bg-white border border-line rounded-md px-3 py-1.5 text-[13px] w-72
                       focus:outline-none focus:border-ink-900/25 focus:ring-4 focus:ring-ink-900/5"
          />
        </form>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Заявок нет"
          description={q || stage ? 'По текущему фильтру ничего не найдено' : 'Когда придёт первая заявка с сайта — она появится тут'}
        />
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="block bg-white border border-line rounded-lg px-5 py-4
                         hover:border-ink-900/20 hover:shadow-soft transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px]
                                      uppercase tracking-wider font-semibold ${LEAD_STAGE_TONE[lead.stage]}`}>
                      {LEAD_STAGE_LABEL[lead.stage]}
                    </span>
                    <span className="text-[11px] text-ink-500 uppercase tracking-wider">
                      №{lead.number}
                    </span>
                    <span className="text-[11px] text-ink-400 inline-flex items-center gap-1">
                      <Clock size={11} /> {fmtDateTime(lead.createdAt)}
                    </span>
                  </div>
                  <div className="font-semibold text-ink-900 truncate">{lead.clientName}</div>
                  <div className="text-[13px] text-ink-700 inline-flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Phone size={12} className="text-ink-400" /> {lead.clientPhone}
                    </span>
                    {lead.clientAddress && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin size={12} className="text-ink-400" /> {lead.clientAddress}
                      </span>
                    )}
                  </div>
                  {(lead.widthMm || lead.heightMm) && (
                    <div className="text-[12px] text-ink-500 mt-0.5">
                      Размер: {lead.widthMm ?? '?'} × {lead.heightMm ?? '?'} мм
                    </div>
                  )}
                  {lead.assignedTo && (
                    <div className="text-[12px] text-ink-500 mt-0.5">
                      Ведёт: {lead.assignedTo.fullName}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-ink-400 mt-1 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function FilterChip({
  href, active, label, count,
}: {
  href: string; active: boolean; label: string; count?: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px]
                  ${active
                    ? 'bg-ink-900 text-white font-medium'
                    : 'bg-white border border-line text-ink-700 hover:border-ink-900/20'}`}
    >
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full
                          text-[10px] font-semibold tabular-nums leading-none
                          ${active ? 'bg-white/20 text-white' : 'bg-ink-900/[0.06] text-ink-700'}`}>
          {count}
        </span>
      )}
    </Link>
  );
}
