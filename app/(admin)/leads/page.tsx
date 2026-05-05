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
import { Input } from '@/components/ui';
import { PageHeader } from '@/components/page-shell';
import LeadsBulkBar from './bulk-bar';

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

  let leads: any[] = [];
  let counts: Array<{ stage: LeadStage; _count: { _all: number } }> = [];
  let dbError: { source: string; name?: string; code?: string; message?: string; meta?: any } | null = null;

  try {
    leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { assignedTo: { select: { fullName: true } } },
    });
  } catch (e: any) {
    console.error('[LEADS_FINDMANY_ERROR]', {
      name: e?.name, code: e?.code, message: e?.message, meta: e?.meta,
      stack: e?.stack?.split('\n').slice(0, 6).join('\n'), where,
    });
    dbError = { source: 'findMany', name: e?.name, code: e?.code, message: e?.message, meta: e?.meta };
  }

  if (!dbError) {
    try {
      const grouped = await prisma.lead.groupBy({
        by: ['stage'],
        _count: { _all: true },
      });
      counts = grouped as any;
    } catch (e: any) {
      console.error('[LEADS_GROUPBY_ERROR]', {
        name: e?.name, code: e?.code, message: e?.message, meta: e?.meta,
        stack: e?.stack?.split('\n').slice(0, 6).join('\n'),
      });
      dbError = { source: 'groupBy', name: e?.name, code: e?.code, message: e?.message, meta: e?.meta };
    }
  }

  if (dbError) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        <PageHeader title="Заявки — диагностика" sub="Ошибка загрузки. Сообщи это разработчику." />
        <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-[12px] text-red-900 whitespace-pre-wrap break-words">
{JSON.stringify(dbError, null, 2)}
        </pre>
      </main>
    );
  }

  const countByStage: Partial<Record<LeadStage, number>> = {};
  for (const c of counts) countByStage[c.stage] = c._count._all;
  const newCount = countByStage.new ?? 0;
  const inWorkCount = (countByStage.contacted ?? 0) + (countByStage.scheduled ?? 0);
  const convertedCount = countByStage.converted ?? 0;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <PageHeader
        title="Заявки"
        sub="Входящие обращения с сайта и калькулятора"
      />

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
          <Input
            name="q"
            defaultValue={q}
            placeholder="Поиск по имени или телефону"
            aria-label="Поиск по заявкам"
            className="w-full md:w-72 h-10"
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
        <LeadsBulkBar isDirector={me.role === 'director'}>
          <div className="space-y-2">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="relative bg-white border border-line rounded-lg pl-12 pr-5 py-4
                           hover:border-ink-900/20 hover:shadow-soft transition-all
                           has-[input:checked]:border-accent has-[input:checked]:bg-accent-soft/30"
              >
                {/* Чекбокс — поверх карточки слева */}
                <label
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer p-1
                             text-ink-400 hover:text-ink-900"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Выбрать заявку №${lead.number}`}
                >
                  <input
                    type="checkbox"
                    data-lead-id={lead.id}
                    className="w-4 h-4 accent-accent cursor-pointer"
                  />
                </label>

                <Link
                  href={`/leads/${lead.id}`}
                  className="absolute inset-0 z-0 rounded-lg"
                  aria-label={`Открыть заявку №${lead.number} от ${lead.clientName}`}
                />

                <div className="relative z-[1] flex items-start justify-between gap-4 pointer-events-none">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px]
                                        uppercase tracking-wider font-semibold ${LEAD_STAGE_TONE[lead.stage as LeadStage]}`}>
                        {LEAD_STAGE_LABEL[lead.stage as LeadStage]}
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
              </div>
            ))}
          </div>
        </LeadsBulkBar>
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
