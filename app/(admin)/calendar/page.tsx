// Расписание (бывший /calendar) — переработано под машину состояний.
//
// Главное правило: один заказ = одна точка.
//   - В «Замеры» попадают только заказы со stage === 'survey_scheduled'
//   - В «Установки» — только со stage === 'ready_to_install'
//   - Завершённые этапы (survey_done, installed, closed) в расписании не показываются.

import Link from 'next/link';
import { Ruler, Hammer, CalendarClock, Factory, AlertTriangle, ChevronRight, MapPin } from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { loadSchedule, type ScheduleEvent } from '@/lib/schedule';
import { fmtDayLong } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import CalendarUserFilter from './user-filter';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Расписание — Armora' };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { user?: string };
}) {
  const me = await requireUser();
  const filter = isStaff(me.role) && searchParams.user ? { workerId: searchParams.user } : undefined;
  const { events, summary, now } = await loadSchedule(me, filter);

  const assignable = isStaff(me.role)
    ? await prisma.user.findMany({
        where: { isActive: true, role: { in: ['surveyor', 'installer'] } },
        select: { id: true, fullName: true, role: true },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      })
    : [];

  // Группировка событий по дням
  const byDay = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    const key = `${e.at.getFullYear()}-${e.at.getMonth()}-${e.at.getDate()}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-display text-ink-900">Расписание</h1>
        <div className="text-[14px] text-ink-500 mt-2">
          Активные замеры и установки на ближайшие 30 дней
        </div>
      </div>

      {/* Виджеты — кликабельные, ведут на список заказов соответствующего этапа */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Ruler size={16} />}        label="Замеры"        value={summary.surveysCount}    tone="blue"   href="/orders?stage=survey_scheduled" />
        <Stat icon={<Hammer size={16} />}       label="Установки"     value={summary.installsCount}   tone="green"  href="/orders?stage=ready_to_install" />
        <Stat icon={<CalendarClock size={16} />} label="Сегодня"       value={summary.todayCount}      tone="indigo" href="#today" />
        {isStaff(me.role) && (
          <Stat icon={<Factory size={16} />}    label="В производстве" value={summary.productionCount} tone="amber"  href="/orders?stage=production" />
        )}
      </div>

      {summary.overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-bad/5 border border-bad/20 px-4 py-3 text-[14px]">
          <AlertTriangle size={16} className="text-bad shrink-0" />
          <div className="text-ink-900">
            <span className="font-semibold text-bad">{summary.overdueCount}</span>{' '}
            {summary.overdueCount === 1 ? 'просроченное событие' : 'просроченных событий'} —
            <span className="text-ink-700"> ниже выделены красным</span>
          </div>
        </div>
      )}

      {isStaff(me.role) && assignable.length > 0 && (
        <CalendarUserFilter
          users={assignable as { id: string; fullName: string; role: 'surveyor' | 'installer' }[]}
          selected={searchParams.user ?? ''}
        />
      )}

      {events.length === 0 && (
        <div className="bg-white border border-line border-dashed rounded-lg p-12 text-center text-ink-400">
          На ближайшие 30 дней активных событий нет
        </div>
      )}

      <div className="space-y-8">
        {[...byDay.entries()].map(([key, dayEvents]) => {
          const date = dayEvents[0].at;
          const isToday = isSameDay(date, today);
          const isTomorrow = isSameDay(date, tomorrow);
          const isPast = date.getTime() < today.getTime();
          const dayName = isPast ? 'Просрочено' : isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : null;

          return (
            <section key={key} id={isToday ? 'today' : undefined}>
              <div className="flex items-baseline gap-3 mb-4">
                {dayName && (
                  <h2 className={`text-[15px] font-semibold ${isPast ? 'text-bad' : 'text-ink-900'}`}>
                    {dayName}
                  </h2>
                )}
                <span className={dayName ? 'text-[13px] text-ink-500' : 'text-[15px] font-semibold text-ink-900'}>
                  {fmtDayLong(date)}
                </span>
                {dayEvents.length > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-ink-900/[0.06] text-ink-700">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="bg-white border border-line rounded-lg overflow-hidden">
                {dayEvents.map((e, idx) => (
                  <Link
                    key={e.id}
                    href={`/orders/${e.orderId}`}
                    className={`flex items-center gap-4 px-5 py-3.5 hover-row group
                                ${idx > 0 ? 'border-t border-line/60' : ''}
                                ${e.isOverdue ? 'bg-bad/[0.02]' : ''}`}
                  >
                    <div className={`w-12 font-semibold text-[15px] tabular-nums ${e.isOverdue ? 'text-bad' : 'text-ink-900'}`}>
                      {String(e.at.getHours()).padStart(2, '0')}:
                      {String(e.at.getMinutes()).padStart(2, '0')}
                    </div>

                    <KindBadge kind={e.kind} overdue={e.isOverdue} />

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-ink-900 text-[14px]">
                        {e.clientName}{' '}
                        <span className="text-ink-500 font-normal">№ {e.number}</span>
                      </div>
                      <div className="text-[12px] text-ink-500 truncate mt-0.5 flex items-center gap-1">
                        <MapPin size={11} className="shrink-0 text-ink-400" />
                        <span className="truncate">{e.clientAddress}</span>
                        {e.worker && <span className="text-ink-400 ml-1">· {e.worker.fullName}</span>}
                      </div>
                    </div>

                    <ChevronRight size={14} className="text-ink-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

// =====================================================================

const STAT_TONE = {
  blue:   { dot: 'bg-blue-500',    text: 'text-blue-700',    soft: 'bg-blue-500/5 border-blue-500/15' },
  green:  { dot: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-500/5 border-emerald-500/15' },
  indigo: { dot: 'bg-indigo-500',  text: 'text-indigo-700',  soft: 'bg-indigo-500/5 border-indigo-500/15' },
  amber:  { dot: 'bg-amber-500',   text: 'text-amber-700',   soft: 'bg-amber-500/5 border-amber-500/15' },
} as const;

function Stat({
  icon, label, value, tone, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: keyof typeof STAT_TONE;
  href?: string;
}) {
  const t = STAT_TONE[tone];
  const inner = (
    <>
      <div className={`flex items-center gap-2 text-[12px] uppercase tracking-wide font-medium ${t.text}`}>
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold tabular-nums text-ink-900 leading-none">
        {value}
      </div>
    </>
  );
  const cls = `rounded-lg border bg-white p-4 ${t.soft} ${href ? 'block hover:bg-ink-900/[0.02] cursor-pointer' : ''}`;
  if (href) {
    return <Link href={href} className={cls}>{inner}</Link>;
  }
  return <div className={cls}>{inner}</div>;
}

function KindBadge({ kind, overdue }: { kind: 'survey' | 'install'; overdue: boolean }) {
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-bad/10 text-bad whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-bad" />
        Просрочено · {kind === 'survey' ? 'замер' : 'установка'}
      </span>
    );
  }
  return (
    <span
      className={
        kind === 'survey'
          ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-blue-500/10 text-blue-700 whitespace-nowrap'
          : 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-emerald-500/10 text-emerald-700 whitespace-nowrap'
      }
    >
      <span className={`w-1.5 h-1.5 rounded-full ${kind === 'survey' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
      {kind === 'survey' ? 'Замер' : 'Установка'}
    </span>
  );
}
