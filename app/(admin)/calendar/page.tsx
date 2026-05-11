import Link from 'next/link';
import {
  Ruler, Hammer, CalendarClock, Factory,
  AlertTriangle, MapPin, Clock,
} from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { loadSchedule, type ScheduleEvent } from '@/lib/schedule';
import { fmtTime, mskDayKey, mskDayStart, isSameMskDay, initials } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { PageHeader, Empty } from '@/components/uikit';
import CalendarUserFilter from './user-filter';
import TodayRouteCard from './today-route';

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

  const todayLabel = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today);

  return (
    <>
      <PageHeader title="Расписание" sub={todayLabel} />

      <div className="max-w-5xl mx-auto px-4 lg:px-6 pt-4 space-y-4 pb-12">

        {/* Фильтр сотрудников — для staff */}
        {isStaff(me.role) && assignable.length > 0 && (
          <CalendarUserFilter
            users={assignable as { id: string; fullName: string; role: 'surveyor' | 'installer' }[]}
            selected={searchParams.user ?? ''}
          />
        )}

        {/* Stats-bar — 4 компактных карточки */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <a
            href="#today"
            className="rounded-md border border-text1 bg-text1 text-card px-3 py-3 flex flex-col gap-1
                       transition-opacity duration-fast hover:opacity-90"
          >
            <div className="flex items-center justify-between text-meta opacity-70">
              <span>Сегодня</span>
              <CalendarClock size={14} />
            </div>
            <div className="text-display tabular-nums leading-none">{summary.todayCount}</div>
            <div className="text-meta opacity-70">
              {summary.todayCount === 1 ? 'событие' : 'событий'}
            </div>
          </a>

          <a
            href="/orders?stage=survey_scheduled"
            className="rounded-md border border-borderc bg-card px-3 py-3 flex flex-col gap-1
                       transition-colors duration-fast hover:bg-subtle"
          >
            <div className="flex items-center justify-between text-meta text-info2">
              <span>Замеры</span>
              <Ruler size={14} />
            </div>
            <div className="text-display tabular-nums leading-none text-text1">{summary.surveysCount}</div>
            <div className="text-meta text-text3">активных</div>
          </a>

          <a
            href="/orders?stage=ready_to_install"
            className="rounded-md border border-borderc bg-card px-3 py-3 flex flex-col gap-1
                       transition-colors duration-fast hover:bg-subtle"
          >
            <div className="flex items-center justify-between text-meta text-ok2">
              <span>Установки</span>
              <Hammer size={14} />
            </div>
            <div className="text-display tabular-nums leading-none text-text1">{summary.installsCount}</div>
            <div className="text-meta text-text3">активных</div>
          </a>

          {isStaff(me.role) ? (
            <a
              href="/orders?stage=production"
              className="rounded-md border border-borderc bg-card px-3 py-3 flex flex-col gap-1
                         transition-colors duration-fast hover:bg-subtle"
            >
              <div className="flex items-center justify-between text-meta text-warn2">
                <span>Производство</span>
                <Factory size={14} />
              </div>
              <div className="text-display tabular-nums leading-none text-text1">{summary.productionCount}</div>
              <div className="text-meta text-text3">в работе</div>
            </a>
          ) : (
            <div
              className={`rounded-md px-3 py-3 flex flex-col gap-1 border
                ${summary.overdueCount > 0 ? 'bg-bad2-soft border-bad2/30' : 'bg-card border-borderc'}`}
            >
              <div className={`flex items-center justify-between text-meta
                ${summary.overdueCount > 0 ? 'text-bad2' : 'text-text3'}`}>
                <span>Просрочено</span>
                <AlertTriangle size={14} />
              </div>
              <div className={`text-display tabular-nums leading-none
                ${summary.overdueCount > 0 ? 'text-bad2' : 'text-text1'}`}>
                {summary.overdueCount}
              </div>
              <div className={`text-meta ${summary.overdueCount > 0 ? 'text-bad2/80' : 'text-text3'}`}>
                {summary.overdueCount === 0 ? 'всё в порядке' : 'требует внимания'}
              </div>
            </div>
          )}
        </div>

        {/* Alert просрочки для staff */}
        {isStaff(me.role) && summary.overdueCount > 0 && (
          <div className="flex items-center gap-3 rounded-md bg-bad2-soft border border-bad2/30
                          px-4 py-3 text-[14px] text-text1">
            <AlertTriangle size={16} className="text-bad2 shrink-0" />
            <span>
              <span className="font-semibold text-bad2">{summary.overdueCount}</span>{' '}
              {summary.overdueCount === 1 ? 'просроченное событие' : 'просроченных событий'}
              <span className="text-text3"> — выделены ниже</span>
            </span>
          </div>
        )}

        {/* Маршрут на сегодня (для исполнителей) */}
        {showRoute && todayPoints.length > 0 && (
          <TodayRouteCard points={todayPoints} />
        )}

        {/* Пусто */}
        {events.length === 0 && (
          <Empty
            icon={CalendarClock}
            title="На горизонте пусто"
            hint="Назначьте замер или установку из карточки заказа"
          />
        )}

        {/* Timeline по дням */}
        <div className="space-y-6">
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
              <section key={key} id={isToday ? 'today' : undefined}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`shrink-0 w-2 h-2 rounded-full ${isPast ? 'bg-bad2' : isToday ? 'bg-accent' : 'bg-text3'}`} />
                  <div className="flex items-baseline gap-2 flex-wrap flex-1">
                    {dayPrefix && (
                      <span className={`text-[15px] font-semibold ${isPast ? 'text-bad2' : isToday ? 'text-accent' : 'text-text1'}`}>
                        {dayPrefix}
                      </span>
                    )}
                    <span className={`capitalize ${dayPrefix ? 'text-meta text-text3' : 'text-[15px] font-semibold text-text1'}`}>
                      {dayFull}
                    </span>
                    <span className="ml-auto text-meta text-text3 tabular-nums">
                      {dayEvents.length} {dayEvents.length === 1 ? 'событие' : dayEvents.length < 5 ? 'события' : 'событий'}
                    </span>
                  </div>
                </div>

                <div className="relative ml-[9px]">
                  <div className={`absolute left-0 top-4 bottom-4 w-px ${isPast ? 'bg-bad2/30' : 'bg-borderc'}`} />

                  <div className="space-y-2 pl-6">
                    {dayEvents.map((e) => {
                      const kindIsSurvey = e.kind === 'survey';
                      const pillCls = e.isOverdue
                        ? 'bg-bad2-soft text-bad2'
                        : kindIsSurvey
                          ? 'bg-info2-soft text-info2'
                          : 'bg-ok2-soft text-ok2';
                      const dotCls = e.isOverdue
                        ? 'bg-bad2'
                        : kindIsSurvey ? 'bg-info2' : 'bg-ok2';
                      const kindLabel = kindIsSurvey ? 'Замер' : 'Установка';

                      return (
                        <Link
                          key={e.id}
                          href={`/orders/${e.orderId}`}
                          className={`relative block bg-card border border-borderc rounded-md px-4 py-3
                                      transition-colors duration-fast hover:bg-subtle/60
                                      ${e.isOverdue ? 'bg-bad2-soft/30 border-bad2/30' : ''}`}
                        >
                          <div className={`absolute -left-[27px] top-1/2 -translate-y-1/2
                                            w-[10px] h-[10px] rounded-full border-2 border-card ${dotCls}`}
                          />

                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-14">
                              <div className={`text-[18px] font-semibold tabular-nums leading-none
                                               ${e.isOverdue ? 'text-bad2' : 'text-text1'}`}>
                                {fmtTime(e.at)}
                              </div>
                              <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 h-5 rounded text-[11px] font-medium ${pillCls}`}>
                                {kindLabel}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold text-text1 text-[14px] leading-snug truncate">
                                  {e.clientName}
                                  <span className="ml-1.5 text-text3 font-normal text-meta tabular-nums">№{e.number}</span>
                                </div>
                                {e.isOverdue && (
                                  <span className="shrink-0 text-meta text-bad2 font-semibold flex items-center gap-1">
                                    <Clock size={11} /> просрочено
                                  </span>
                                )}
                              </div>
                              {e.clientAddress && (
                                <div className="mt-1 text-[12.5px] text-text3 flex items-start gap-1.5">
                                  <MapPin size={11} className="mt-0.5 shrink-0" />
                                  <span className="truncate">{e.clientAddress}</span>
                                </div>
                              )}
                              {e.worker && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-md bg-subtle text-text2 text-[10px] font-semibold flex items-center justify-center">
                                    {initials(e.worker.fullName)}
                                  </div>
                                  <span className="text-meta text-text3 truncate">{e.worker.fullName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
