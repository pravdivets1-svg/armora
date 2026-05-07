import Link from 'next/link';
import {
  Ruler, Hammer, CalendarClock, Factory,
  AlertTriangle, MapPin, ArrowUpRight, Clock,
} from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { loadSchedule, type ScheduleEvent } from '@/lib/schedule';
import { fmtDayLong, fmtTime, mskDayKey, mskDayStart, isSameMskDay, initials } from '@/lib/format';
import { prisma } from '@/lib/prisma';
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

  // Форматируем дату заголовка
  const todayLabel = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today);

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">

      {/* ── Шапка ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-medium mb-1">
            Расписание
          </div>
          <h1 className="text-[28px] md:text-[32px] font-bold leading-tight tracking-tight text-ink-900 capitalize">
            {todayLabel}
          </h1>
        </div>
        {isStaff(me.role) && assignable.length > 0 && (
          <CalendarUserFilter
            users={assignable as { id: string; fullName: string; role: 'surveyor' | 'installer' }[]}
            selected={searchParams.user ?? ''}
          />
        )}
      </div>

      {/* ── Stats-bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Сегодня */}
        <a
          href="#today"
          className="group rounded-xl bg-ink-900 text-white px-4 py-4 flex flex-col gap-2
                     hover:bg-accent transition-colors shadow-soft"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-medium">Сегодня</span>
            <CalendarClock size={13} className="text-white/40 group-hover:text-white/70 transition-colors" />
          </div>
          <div className="text-[40px] font-bold tabular-nums leading-none tracking-tight">
            {summary.todayCount}
          </div>
          <div className="text-[12px] text-white/55">
            {summary.todayCount === 0 ? 'событий нет' : summary.todayCount === 1 ? 'событие' : 'событий'}
          </div>
        </a>

        {/* Замеры */}
        <a
          href="/orders?stage=survey_scheduled"
          className="group rounded-xl bg-white border border-line px-4 py-4 flex flex-col gap-2
                     hover:border-blue-300 hover:shadow-soft-lg transition-all shadow-soft"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-blue-600 font-medium">Замеры</span>
            <Ruler size={13} className="text-blue-400" />
          </div>
          <div className="text-[40px] font-bold tabular-nums leading-none tracking-tight text-ink-900">
            {summary.surveysCount}
          </div>
          <div className="text-[12px] text-ink-500">активных</div>
        </a>

        {/* Установки */}
        <a
          href="/orders?stage=ready_to_install"
          className="group rounded-xl bg-white border border-line px-4 py-4 flex flex-col gap-2
                     hover:border-emerald-300 hover:shadow-soft-lg transition-all shadow-soft"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-600 font-medium">Установки</span>
            <Hammer size={13} className="text-emerald-400" />
          </div>
          <div className="text-[40px] font-bold tabular-nums leading-none tracking-tight text-ink-900">
            {summary.installsCount}
          </div>
          <div className="text-[12px] text-ink-500">активных</div>
        </a>

        {/* В производстве (директор/менеджер) или просрочено (исполнитель) */}
        {isStaff(me.role) ? (
          <a
            href="/orders?stage=production"
            className="group rounded-xl bg-white border border-line px-4 py-4 flex flex-col gap-2
                       hover:border-ink-300 hover:shadow-soft-lg transition-all shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-500 font-medium">Производство</span>
              <Factory size={13} className="text-ink-400" />
            </div>
            <div className="text-[40px] font-bold tabular-nums leading-none tracking-tight text-ink-900">
              {summary.productionCount}
            </div>
            <div className="text-[12px] text-ink-500">в работе</div>
          </a>
        ) : (
          <div
            className={`rounded-xl px-4 py-4 flex flex-col gap-2 shadow-soft
              ${summary.overdueCount > 0
                ? 'bg-bad/5 border border-bad/30'
                : 'bg-white border border-line'}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase tracking-[0.18em] font-medium
                ${summary.overdueCount > 0 ? 'text-bad' : 'text-ink-500'}`}>
                Просрочено
              </span>
              <AlertTriangle size={13} className={summary.overdueCount > 0 ? 'text-bad' : 'text-ink-400'} />
            </div>
            <div className={`text-[40px] font-bold tabular-nums leading-none tracking-tight
              ${summary.overdueCount > 0 ? 'text-bad' : 'text-ink-900'}`}>
              {summary.overdueCount}
            </div>
            <div className={`text-[12px] ${summary.overdueCount > 0 ? 'text-bad/70' : 'text-ink-500'}`}>
              {summary.overdueCount === 0 ? 'всё в порядке' : 'требует внимания'}
            </div>
          </div>
        )}
      </div>

      {/* ── Alert просрочки (только для стаффа) ───────────────── */}
      {isStaff(me.role) && summary.overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-bad/5 border border-bad/20
                        border-l-4 border-l-bad px-4 py-3 text-[13.5px] shadow-bad-glow">
          <AlertTriangle size={16} className="text-bad shrink-0" />
          <span className="text-ink-900">
            <span className="font-semibold text-bad">{summary.overdueCount}</span>{' '}
            {summary.overdueCount === 1 ? 'просроченное событие' : 'просроченных событий'}
            <span className="text-ink-500"> — выделены ниже красным</span>
          </span>
        </div>
      )}

      {/* ── Маршрут на сегодня ────────────────────────────────── */}
      {showRoute && todayPoints.length > 0 && (
        <TodayRouteCard points={todayPoints} />
      )}

      {/* ── Пустое состояние ─────────────────────────────────── */}
      {events.length === 0 && (
        <div className="bg-white border border-line rounded-2xl p-16 text-center shadow-soft">
          <CalendarClock size={28} className="mx-auto text-ink-400 mb-4" strokeWidth={1.5} />
          <div className="text-[20px] font-semibold text-ink-900">На горизонте пусто</div>
          <div className="text-ink-500 text-[13px] mt-2">
            Назначьте замер или установку из карточки заказа
          </div>
        </div>
      )}

      {/* ── Timeline по дням ─────────────────────────────────── */}
      <div className="space-y-8">
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
              {/* День-заголовок */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`shrink-0 w-2 h-2 rounded-full ${isPast ? 'bg-bad' : isToday ? 'bg-accent' : 'bg-ink-300'}`} />
                <div className="flex items-baseline gap-2 flex-wrap flex-1">
                  {dayPrefix && (
                    <span className={`text-[15px] font-semibold ${isPast ? 'text-bad' : isToday ? 'text-accent' : 'text-ink-900'}`}>
                      {dayPrefix}
                    </span>
                  )}
                  <span className={`capitalize ${dayPrefix ? 'text-[13px] text-ink-500' : 'text-[15px] font-semibold text-ink-900'}`}>
                    {dayFull}
                  </span>
                  <span className="ml-auto text-[12px] text-ink-400 tabular-nums">
                    {dayEvents.length} {dayEvents.length === 1 ? 'событие' : dayEvents.length < 5 ? 'события' : 'событий'}
                  </span>
                </div>
              </div>

              {/* Карточки событий с вертикальной timeline-линией */}
              <div className="relative ml-[9px]">
                {/* Вертикальная линия */}
                <div className={`absolute left-0 top-4 bottom-4 w-px ${isPast ? 'bg-bad/30' : 'bg-line'}`} />

                <div className="space-y-2 pl-6">
                  {dayEvents.map((e) => {
                    const kindColor = e.isOverdue
                      ? 'bg-bad text-white'
                      : e.kind === 'survey'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700';
                    const kindLabel = e.kind === 'survey' ? 'Замер' : 'Установка';
                    const borderColor = e.isOverdue
                      ? 'border-l-bad'
                      : e.kind === 'survey'
                        ? 'border-l-blue-400'
                        : 'border-l-emerald-400';

                    return (
                      <Link
                        key={e.id}
                        href={`/orders/${e.orderId}`}
                        className={`group relative block bg-white border border-line border-l-[3px] ${borderColor}
                                    rounded-xl px-4 py-3.5 hover-row hover:shadow-soft transition-all
                                    ${e.isOverdue ? 'bg-bad/[0.02]' : ''}`}
                      >
                        {/* Точка на timeline */}
                        <div className={`absolute -left-[27px] top-1/2 -translate-y-1/2
                                          w-[11px] h-[11px] rounded-full border-2 border-white shadow-sm
                                          ${e.isOverdue ? 'bg-bad' : e.kind === 'survey' ? 'bg-blue-400' : 'bg-emerald-400'}`}
                        />

                        <div className="flex items-start gap-3 md:gap-4">
                          {/* Время */}
                          <div className="shrink-0 w-16 md:w-[72px]">
                            <div className={`text-[22px] font-bold tabular-nums leading-none tracking-tight
                                             ${e.isOverdue ? 'text-bad' : 'text-ink-900'}`}>
                              {fmtTime(e.at)}
                            </div>
                            <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${kindColor}`}>
                              {kindLabel}
                            </span>
                          </div>

                          {/* Клиент + адрес */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-ink-900 text-[14.5px] leading-snug">
                                {e.clientName}
                                <span className="ml-1.5 text-ink-400 font-normal text-[12px]">№{e.number}</span>
                              </div>
                              {e.isOverdue && (
                                <span className="shrink-0 text-[11px] text-bad font-semibold flex items-center gap-1">
                                  <Clock size={11} /> просрочено
                                </span>
                              )}
                            </div>
                            {e.clientAddress && (
                              <div className="mt-1 text-[13px] text-ink-500 flex items-start gap-1.5">
                                <MapPin size={11} className="mt-0.5 shrink-0 text-ink-400" />
                                <span className="truncate">{e.clientAddress}</span>
                              </div>
                            )}
                          </div>

                          {/* Работник */}
                          <div className="hidden md:flex shrink-0 items-center gap-2">
                            {e.worker ? (
                              <>
                                <div className="w-7 h-7 rounded-full bg-ink-900 text-white text-[11px]
                                                font-semibold flex items-center justify-center shrink-0">
                                  {initials(e.worker.fullName)}
                                </div>
                                <span className="text-[12.5px] text-ink-600 max-w-[100px] truncate">
                                  {e.worker.fullName.split(' ')[0]}
                                </span>
                              </>
                            ) : (
                              <span className="text-[12px] text-ink-400">не назначен</span>
                            )}
                            <ArrowUpRight size={14} className="text-ink-300 group-hover:text-ink-700 transition-colors ml-1" />
                          </div>
                        </div>

                        {/* Работник — мобайл */}
                        {e.worker && (
                          <div className="md:hidden mt-2 flex items-center gap-1.5 pl-[76px]">
                            <div className="w-5 h-5 rounded-full bg-ink-900 text-white text-[9px]
                                            font-semibold flex items-center justify-center shrink-0">
                              {initials(e.worker.fullName)}
                            </div>
                            <span className="text-[12px] text-ink-500">{e.worker.fullName}</span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
