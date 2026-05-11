import Link from 'next/link';
import { MapPin, CalendarClock, AlertTriangle } from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { loadSchedule, type ScheduleEvent } from '@/lib/schedule';
import { fmtTime, mskDayKey, mskDayStart, isSameMskDay, initials } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { PageHeader, Empty } from '@/components/uikit';
import CalendarUserFilter from './user-filter';
import TodayRouteCard from './today-route';
import NextEventCard from './next-event-card';

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

  const byDay = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    const key = mskDayKey(e.at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  const today = mskDayStart(now);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Next upcoming event (для hero-блока)
  const nextEvent = events.find((e) => e.at >= now) ?? events.find((e) => e.isOverdue) ?? null;

  const showRoute = !isStaff(me.role);
  const todayPoints = showRoute
    ? events
        .filter((e) => e.at >= today && e.at < tomorrow)
        .filter((e) => e.clientAddress.trim().length > 0)
        .map((e) => ({
          at: e.at,
          clientAddress: e.clientAddress,
          clientName: e.clientName,
          number: e.number,
          kind: e.kind,
        }))
    : [];

  const summaryParts: string[] = [];
  if (summary.todayCount > 0) {
    summaryParts.push(`${summary.todayCount} ${summary.todayCount === 1 ? 'событие' : summary.todayCount < 5 ? 'события' : 'событий'} сегодня`);
  }
  if (summary.surveysCount > 0) summaryParts.push(`${summary.surveysCount} замеров`);
  if (summary.installsCount > 0) summaryParts.push(`${summary.installsCount} установок`);
  if (isStaff(me.role) && summary.overdueCount > 0) {
    summaryParts.push(`${summary.overdueCount} просрочено`);
  }
  const subline = summaryParts.length > 0 ? summaryParts.join(' · ') : 'Расписание чистое';

  return (
    <>
      <PageHeader title="Расписание" sub={subline} />

      <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-3 space-y-4 pb-12">

        {/* Фильтр сотрудников */}
        {isStaff(me.role) && assignable.length > 0 && (
          <CalendarUserFilter
            users={assignable as { id: string; fullName: string; role: 'surveyor' | 'installer' }[]}
            selected={searchParams.user ?? ''}
          />
        )}

        {/* Hero: следующее событие или просрочка */}
        {nextEvent && (
          <NextEventCard
            orderId={nextEvent.orderId}
            kind={nextEvent.kind}
            clientName={nextEvent.clientName}
            clientAddress={nextEvent.clientAddress}
            number={nextEvent.number}
            workerName={nextEvent.worker?.fullName}
            atIso={nextEvent.at.toISOString()}
            timeLabel={fmtTime(nextEvent.at)}
          />
        )}

        {/* Маршрут на сегодня (только для исполнителей) */}
        {showRoute && todayPoints.length > 0 && (
          <TodayRouteCard points={todayPoints} />
        )}

        {/* Алерт для staff если есть просрочка */}
        {isStaff(me.role) && summary.overdueCount > 0 && (
          <Link
            href="#overdue"
            className="flex items-center gap-3 rounded-md bg-bad2-soft border border-bad2/30
                       px-4 py-3 text-[14px] text-text1 transition-transform duration-fast active:scale-[0.99]"
          >
            <AlertTriangle size={16} className="text-bad2 shrink-0" />
            <span className="flex-1">
              <span className="font-semibold text-bad2">{summary.overdueCount}</span>{' '}
              {summary.overdueCount === 1 ? 'просроченное событие' : 'просроченных событий'}
            </span>
            <span className="text-meta text-bad2/80">К списку →</span>
          </Link>
        )}

        {/* Пусто */}
        {events.length === 0 && (
          <Empty
            icon={CalendarClock}
            title="На горизонте пусто"
            hint="Назначьте замер или установку из карточки заказа"
          />
        )}

        {/* Дни — без timeline-линии, c sticky-заголовком */}
        <div className="space-y-5">
          {[...byDay.entries()].map(([key, dayEvents]) => {
            const date = dayEvents[0].at;
            const isToday = isSameMskDay(date, today);
            const isTomorrow = isSameMskDay(date, tomorrow);
            const isPast = date < today;

            const dayPrefix = isPast ? 'Просрочено' : isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : null;
            const dayFull = new Intl.DateTimeFormat('ru-RU', {
              timeZone: 'Europe/Moscow',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(date);

            return (
              <section
                key={key}
                id={isPast ? 'overdue' : isToday ? 'today' : undefined}
              >
                <div className="sticky top-[56px] lg:top-[64px] z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 bg-app/85 backdrop-blur">
                  <div className="flex items-baseline gap-2">
                    {dayPrefix && (
                      <span className={`text-[15px] font-semibold tracking-tight
                        ${isPast ? 'text-bad2' : isToday ? 'text-accent' : 'text-text1'}`}>
                        {dayPrefix}
                      </span>
                    )}
                    <span className={`capitalize ${dayPrefix ? 'text-meta text-text3' : 'text-[15px] font-semibold text-text1'}`}>
                      {dayFull}
                    </span>
                    <span className="ml-auto text-meta text-text3 tabular-nums">
                      {dayEvents.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  {dayEvents.map((e) => {
                    const kindIsSurvey = e.kind === 'survey';
                    const stripe = e.isOverdue ? 'bg-bad2' : kindIsSurvey ? 'bg-info2' : 'bg-ok2';
                    const kindLabel = kindIsSurvey ? 'замер' : 'установка';

                    return (
                      <Link
                        key={e.id}
                        href={`/orders/${e.orderId}`}
                        className="group relative block bg-card border border-borderc rounded-md
                                   transition-all duration-fast active:scale-[0.99]
                                   hover:bg-subtle/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md ${stripe}`} />
                        <div className="flex items-center gap-4 pl-4 pr-3 py-3">
                          <div className="shrink-0 w-12 text-right">
                            <div className={`text-[18px] font-semibold tabular-nums leading-none
                                            ${e.isOverdue ? 'text-bad2' : 'text-text1'}`}>
                              {fmtTime(e.at)}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-text3 mt-1">
                              {kindLabel}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <p className="text-[14px] font-semibold text-text1 truncate flex-1 min-w-0">
                                {e.clientName}
                              </p>
                              <span className="text-meta text-text3 tabular-nums shrink-0">№ {e.number}</span>
                            </div>
                            {e.clientAddress && (
                              <p className="text-[12.5px] text-text3 truncate mt-0.5">
                                {e.clientAddress}
                              </p>
                            )}
                          </div>

                          {e.worker && (
                            <div className="shrink-0">
                              <div
                                className="w-8 h-8 rounded-md bg-subtle text-text2 text-[11px] font-semibold flex items-center justify-center"
                                title={e.worker.fullName}
                              >
                                {initials(e.worker.fullName)}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
