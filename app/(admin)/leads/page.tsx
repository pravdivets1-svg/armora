import Link from 'next/link';
import { Inbox } from 'lucide-react';
import type { LeadStage } from '@prisma/client';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER } from '@/lib/lead-labels';
import { PageHeader, PillTabs, Empty, LeadPill } from '@/components/uikit';
import LiveSearch from '@/components/live-search';
import LeadsBulkBar from './bulk-bar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Заявки — Armora' };

type Search = { stage?: string; q?: string };

function fmtRelative(d: Date | string): string {
  const t = typeof d === 'string' ? new Date(d).getTime() : d.getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} д назад`;
  return new Date(t).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function fmtPhone(p: string): string {
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

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

  const [rawLeads, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        number: true,
        clientName: true,
        clientPhone: true,
        clientAddress: true,
        widthMm: true,
        heightMm: true,
        stage: true,
        createdAt: true,
        assignedTo: { select: { fullName: true } },
      },
    }),
    prisma.lead.groupBy({
      by: ['stage'],
      _count: { _all: true },
    }),
  ]);

  const leads = rawLeads.map((l) => ({
    ...l,
    assignedTo: l.assignedTo ? { fullName: l.assignedTo.fullName } : null,
  }));

  const countByStage: Partial<Record<LeadStage, number>> = {};
  for (const c of counts) countByStage[c.stage] = c._count._all;
  const totalCount = leads.length;

  return (
    <>
      <PageHeader title="Заявки" sub={`${totalCount} в текущем фильтре`} />

      <div className="max-w-5xl mx-auto px-4 lg:px-6 pt-4 space-y-4 pb-12">
        <LiveSearch
          defaultValue={q}
          placeholder="Поиск: имя или телефон"
          preserve={['stage']}
        />

        <PillTabs
          paramName="stage"
          preserve={['q']}
          items={[
            { key: '', label: 'Все' },
            ...LEAD_STAGE_ORDER.map((s) => ({
              key: s,
              label: LEAD_STAGE_LABEL[s],
              count: countByStage[s] ?? 0,
            })),
          ]}
        />

        {leads.length === 0 ? (
          <Empty
            icon={Inbox}
            title="Заявок нет"
            hint={q || stage ? 'По текущему фильтру ничего не найдено' : 'Когда придёт первая заявка с сайта — она появится тут'}
          />
        ) : (
          <LeadsBulkBar isDirector={me.role === 'director'}>
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="relative bg-card border border-borderc rounded-md pl-11 pr-4 py-3
                             transition-colors duration-fast ease-soft hover:bg-subtle/60
                             has-[input:checked]:border-accent has-[input:checked]:bg-accent-soft/40"
                >
                  <label
                    className="absolute left-3 top-3.5 z-10 cursor-pointer p-1 text-text3 hover:text-text1"
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
                    className="absolute inset-0 z-0 rounded-md"
                    aria-label={`Открыть заявку №${lead.number} от ${lead.clientName}`}
                  />

                  <div className="relative z-[1] pointer-events-none">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h3 className="text-[14px] font-semibold text-text1 truncate flex-1 min-w-0">
                        {lead.clientName}
                      </h3>
                      <span className="text-meta text-text3 tabular-nums shrink-0">№ {lead.number}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <LeadPill stage={lead.stage} />
                      <span className="text-meta text-text3 tabular-nums shrink-0">{fmtRelative(lead.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-1.5 text-[12.5px] text-text3">
                      <span className="tabular-nums truncate flex-1 min-w-0">
                        {fmtPhone(lead.clientPhone)}
                        {lead.clientAddress && <> · {lead.clientAddress}</>}
                      </span>
                      {lead.assignedTo && (
                        <span className="shrink-0 truncate max-w-[120px]">{lead.assignedTo.fullName}</span>
                      )}
                    </div>

                    {(lead.widthMm || lead.heightMm) && (
                      <div className="text-[12px] text-text3 mt-1 tabular-nums">
                        {lead.widthMm ?? '?'} × {lead.heightMm ?? '?'} мм
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </LeadsBulkBar>
        )}
      </div>
    </>
  );
}
