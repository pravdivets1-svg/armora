import Link from 'next/link';
import { Inbox, Phone, ChevronRight } from 'lucide-react';
import type { LeadStage } from '@prisma/client';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER } from '@/lib/lead-labels';
import { PageHeader, PillTabs, Empty, LeadPill, Button } from '@/components/uikit';
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
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} д`;
  return new Date(t).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function fmtPhone(p: string): string {
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

function timeBucket(d: Date): 'today' | 'yesterday' | 'week' | 'older' {
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return 'today';
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (sameDay(d, yesterday)) return 'yesterday';
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 7) return 'week';
  return 'older';
}

const BUCKET_LABEL: Record<'today' | 'yesterday' | 'week' | 'older', string> = {
  today:     'Сегодня',
  yesterday: 'Вчера',
  week:      'На этой неделе',
  older:     'Раньше',
};

function initial(name: string): string {
  return (name.trim().split(/\s+/)[0]?.[0] ?? '?').toUpperCase();
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

  // Hero — самая свежая «новая» заявка (только когда фильтра нет)
  const heroLead = !stage && !q ? leads.find((l) => l.stage === 'new') : undefined;
  const heroId = heroLead?.id;

  // Группируем по времени, исключая heroLead
  const groups = new Map<'today' | 'yesterday' | 'week' | 'older', typeof leads>();
  for (const l of leads) {
    if (l.id === heroId) continue;
    const b = timeBucket(l.createdAt);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(l);
  }
  const orderedBuckets: Array<'today' | 'yesterday' | 'week' | 'older'> = ['today', 'yesterday', 'week', 'older'];

  return (
    <>
      <PageHeader title="Заявки" sub={`${leads.length} в текущем фильтре`} />

      <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-3 space-y-4 pb-12">

        {/* Поиск */}
        <LiveSearch
          defaultValue={q}
          placeholder="Поиск: имя или телефон"
          preserve={['stage']}
        />

        {/* Фильтр-чипы */}
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

        {/* Hero — последняя новая заявка */}
        {heroLead && (
          <Link
            href={`/leads/${heroLead.id}`}
            className="block rounded-lg border border-accent/40 bg-accent-soft p-4 sm:p-5
                       transition-transform duration-fast active:scale-[0.99]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="flex items-center gap-2 text-meta uppercase tracking-wide text-accent mb-1">
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-semibold tracking-wide bg-accent text-card">
                Новая
              </span>
              <span>·</span>
              <span className="tabular-nums">№ {heroLead.number}</span>
              <span>·</span>
              <span className="tabular-nums">{fmtRelative(heroLead.createdAt)} назад</span>
            </div>
            <h2 className="text-h1 text-text1 mb-1 truncate">{heroLead.clientName}</h2>
            <div className="text-[13px] text-text2 flex items-center gap-3 flex-wrap mb-3 tabular-nums">
              <a href={`tel:${heroLead.clientPhone}`} className="inline-flex items-center gap-1.5 hover:text-accent" onClick={(e) => e.stopPropagation()}>
                <Phone size={12} /> {fmtPhone(heroLead.clientPhone)}
              </a>
              {heroLead.clientAddress && <span className="text-text3 truncate max-w-[200px]">{heroLead.clientAddress}</span>}
              {(heroLead.widthMm || heroLead.heightMm) && (
                <span className="text-text3">{heroLead.widthMm ?? '?'} × {heroLead.heightMm ?? '?'} мм</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Button size="sm" className="pointer-events-none">Открыть</Button>
              <span className="text-meta text-text3">→</span>
            </div>
          </Link>
        )}

        {leads.length === 0 ? (
          <Empty
            icon={Inbox}
            title="Заявок нет"
            hint={q || stage ? 'По текущему фильтру ничего не найдено' : 'Когда придёт первая заявка с сайта — она появится тут'}
          />
        ) : (
          <LeadsBulkBar isDirector={me.role === 'director'}>
            <div className="space-y-4">
              {orderedBuckets.map((b) => {
                const items = groups.get(b);
                if (!items || items.length === 0) return null;
                return (
                  <section key={b}>
                    <div className="sticky top-[56px] lg:top-[64px] z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 bg-app/85 backdrop-blur">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-[13px] font-semibold text-text2 tracking-tight">{BUCKET_LABEL[b]}</h3>
                        <span className="text-meta text-text3 tabular-nums">{items.length}</span>
                      </div>
                    </div>

                    <div className="space-y-1 mt-1.5">
                      {items.map((lead) => (
                        <div
                          key={lead.id}
                          className="relative rounded-md transition-all duration-fast
                                     bg-card border border-borderc
                                     hover:bg-subtle/60 active:scale-[0.995]
                                     has-[input:checked]:border-accent has-[input:checked]:bg-accent-soft/40"
                        >
                          <label
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-pointer p-2 text-text3 hover:text-text1"
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

                          <div className="relative z-[1] pointer-events-none flex items-center gap-3 pl-10 pr-3 py-3">
                            <div
                              className={`shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-[13px] font-semibold
                                ${lead.stage === 'new'
                                  ? 'bg-accent text-card'
                                  : 'bg-subtle text-text2'}`}
                            >
                              {initial(lead.clientName)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-[14px] font-semibold text-text1 truncate flex-1 min-w-0">
                                  {lead.clientName}
                                </p>
                                <span className="text-meta text-text3 tabular-nums shrink-0">{fmtRelative(lead.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <LeadPill stage={lead.stage} />
                                <span className="text-meta text-text3 tabular-nums truncate min-w-0">
                                  {fmtPhone(lead.clientPhone)}
                                </span>
                              </div>
                            </div>

                            <ChevronRight size={16} className="text-text3 shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </LeadsBulkBar>
        )}
      </div>
    </>
  );
}
