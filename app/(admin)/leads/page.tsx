import Link from 'next/link';
import { Inbox, Phone } from 'lucide-react';
import type { LeadStage } from '@prisma/client';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER } from '@/lib/lead-labels';
import { PageHeader, PillTabs, Empty, LeadPill, HintCard } from '@/components/uikit';
import LiveSearch from '@/components/live-search';
import LeadsBulkBar from './bulk-bar';
import { FreshLeadsHero } from '@/components/fresh-leads-hero';

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

  // Группируем по времени.
  const groups = new Map<'today' | 'yesterday' | 'week' | 'older', typeof leads>();
  for (const l of leads) {
    const b = timeBucket(l.createdAt);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(l);
  }
  const orderedBuckets: Array<'today' | 'yesterday' | 'week' | 'older'> = ['today', 'yesterday', 'week', 'older'];
  const showFreshHero = !stage && !q;

  return (
    <>
      <PageHeader title="Заявки" sub={`${leads.length} в текущем фильтре`} />

      <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-3 space-y-3 pb-12">

        {showFreshHero && <FreshLeadsHero />}

        <HintCard hintId="leads-intro" title="Откуда заявки">
          С сайта и калькулятора. Свежие сверху с цветом срочности: зелёный — ещё не горит,
          янтарный — пора звонить, красный — клиент остыл. Тап по трубке = звонок в один клик.
        </HintCard>

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
                    <div className="sticky top-[56px] lg:top-[64px] z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-1.5 bg-app/95 backdrop-blur">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-meta uppercase tracking-wide text-text3">{BUCKET_LABEL[b]}</h3>
                        <span className="text-meta text-text3 tabular-nums">{items.length}</span>
                      </div>
                    </div>

                    {/* Одна стеклянная карточка с divide-y вместо набора отдельных строк */}
                    <div className="mt-1.5 glass-surface rounded-2xl divide-y divide-white/30 overflow-hidden">
                      {items.map((lead) => (
                        <div
                          key={lead.id}
                          className="relative transition-colors duration-fast
                                     hover:bg-white/30
                                     has-[input:checked]:bg-accent/[0.08]"
                        >
                          <label
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 cursor-pointer
                                       w-11 h-11 flex items-center justify-center text-text3 hover:text-text1"
                            aria-label={`Выбрать заявку №${lead.number}`}
                          >
                            <input
                              type="checkbox"
                              data-lead-id={lead.id}
                              className="w-[18px] h-[18px] accent-accent cursor-pointer"
                            />
                          </label>

                          <Link
                            href={`/leads/${lead.id}`}
                            className="absolute inset-0 z-0"
                            aria-label={`Открыть заявку №${lead.number} от ${lead.clientName}`}
                          />

                          <div className="relative z-[1] pointer-events-none flex items-center gap-3 pl-11 pr-2 py-2.5">
                            <div
                              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold
                                ${lead.stage === 'new'
                                  ? 'bg-accent-soft text-accent'
                                  : 'bg-subtle text-text2'}`}
                            >
                              {initial(lead.clientName)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-[13.5px] font-medium text-text1 truncate flex-1 min-w-0">
                                  {lead.clientName}
                                </p>
                                <span className="text-meta text-text2 tabular-nums shrink-0">{fmtRelative(lead.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <LeadPill stage={lead.stage} />
                                <span className="text-meta text-text2 tabular-nums truncate min-w-0">
                                  {fmtPhone(lead.clientPhone)}
                                </span>
                              </div>
                            </div>

                            {/* Тап-звонок — поверх Link-оверлея, кликабелен (pointer-events-auto) */}
                            <a
                              href={`tel:+${lead.clientPhone.replace(/\D/g, '')}`}
                              aria-label={`Позвонить ${lead.clientName}`}
                              className="pointer-events-auto shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full
                                         text-text2 hover:text-text1 hover:bg-white/40 transition-colors
                                         focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <Phone size={16} />
                            </a>
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
