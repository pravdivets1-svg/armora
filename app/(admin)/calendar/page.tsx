import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { loadSchedule, type ScheduleEvent } from '@/lib/schedule';
import { fmtTime, mskDayKey, mskDayStart, isSameMskDay, initials } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { PageHeader, Empty, HintCard } from '@/components/uikit';
import CalendarUserFilter from './user-filter';
import TodayRouteCard from './today-route';
import NextEventCard from './next-event-card';
import { SurveyorDataReminder } from '@/components/surveyor-data-reminder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Расписание — Armora' };

// 21-дневная лента: сегодня и +20 вперёд. Прошлые события показываем
// отдельным блоком сверху, без растягивания ленты в прошлое — иначе она
// перестанет читаться с телефона.
const HORIZON_DAYS = 21;

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

  const today = mskDayStart(now);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Группируем события по МСК-дню.
  const byDay = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    const key = mskDayKey(e.at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  // Просрочка отдельно — над лентой будущего.
  // День назначения = НЕ просрочка (есть весь день для действий).
  // Просрочка начинается со следующего МСК-дня.
  const overdueEvents = events.filter((e) => e.daysOverdue > 0);

  // Лента 21 день от сегодня.
  const horizon: { key: string; date: Date; events: ScheduleEvent[] }[] = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const key = mskDayKey(d);
    horizon.push({ key, date: d, events: byDay.get(key) ?? [] });
  }

  // Next upcoming event для hero-блока (включая сегодня — даже если время прошло).
  const nextEvent =
    events.find((e) => e.daysOverdue === 0 && e.at >= now)
    ?? events.find((e) => e.daysOverdue === 0)
    ?? events.find((e) => e.at >= now)
    ?? null;

  const showRoute = !isStaff(me.role);
  const todayPoints = showRoute
    ? events
        .filter((e) => e.at >= today && e.at < tomorrow)
        .filter((e) => e.clientAddress.trim().length > 0)
        .map((e) => ({
          orderId: e.orderId,
          at: e.at,
          clientAddress: e.clientAddress,
          clientName: e.clientName,
          number: e.number,
          kind: e.kind,
        }))
    : [];

  const subline = `${HORIZON_DAYS} дней · ваше расписание`;

  return (
    <>
      <PageHeader title="Календарь" sub={subline} />

      <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-3 pb-12 space-y-4">

        {/* Напоминание замерщику: внести результаты замера вовремя.
            Сам решает, показываться ли (роль / тумблер директора / есть ли хвосты). */}
        <SurveyorDataReminder me={me} />

        <HintCard hintId="calendar-intro" title="Лента 21 день">
          События идут плотным списком. Сегодня подсвечен полоской слева — серый цвет события
          не значит «опоздал», это можно сделать сегодня. Желтеет только со следующего дня.
        </HintCard>

        {/* Фильтр сотрудников */}
        {isStaff(me.role) && assignable.length > 0 && (
          <CalendarUserFilter
            users={assignable as { id: string; fullName: string; role: 'surveyor' | 'installer' }[]}
            selected={searchParams.user ?? ''}
          />
        )}

        {/* Hero: следующее событие */}
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
            daysOverdue={nextEvent.daysOverdue}
          />
        )}

        {/* Маршрут на сегодня (только для исполнителей) */}
        {showRoute && todayPoints.length > 0 && (
          <TodayRouteCard points={todayPoints} />
        )}

        {/* Просрочка — компактный список над лентой */}
        {overdueEvents.length > 0 && (
          <section
            id="overdue"
            aria-label="Просроченные события"
            className="rounded-md border border-borderc bg-card"
          >
            <header className="flex items-baseline justify-between px-4 pt-3 pb-2 border-b border-borderc/60">
              <h2 className="text-h2 text-bad2">Просрочено</h2>
              <span className="text-meta text-text3 tabular-nums">{overdueEvents.length}</span>
            </header>
            <ul className="divide-y divide-borderc/60">
              {overdueEvents.map((e) => (
                <EventRow key={e.id} event={e} tone="past" />
              ))}
            </ul>
          </section>
        )}

        {/* Пусто — нет событий и не показывать ленту смысла нет */}
        {events.length === 0 && (
          <Empty
            icon={CalendarClock}
            title="На горизонте пусто"
            hint={isStaff(me.role)
              ? 'Назначьте замер или установку из карточки заказа'
              : 'Пока нет назначенных замеров и установок'}
          />
        )}

        {/* 21-дневная лента: hairline-список дней.
            Скрываем целиком, если событий нет — иначе под Empty висят 21 «Свободно». */}
        {events.length > 0 && (
        <section
          aria-label="Лента 21 день"
          className="rounded-md border border-borderc bg-card overflow-hidden"
        >
          {horizon.map((day, idx) => {
            const isToday = isSameMskDay(day.date, today);
            const isTomorrow = isSameMskDay(day.date, tomorrow);
            const hasEvents = day.events.length > 0;

            const weekday = new Intl.DateTimeFormat('ru-RU', {
              timeZone: 'Europe/Moscow', weekday: 'short',
            }).format(day.date);
            const dayMonth = new Intl.DateTimeFormat('ru-RU', {
              timeZone: 'Europe/Moscow', day: 'numeric', month: 'short',
            }).format(day.date);

            const dayPrefix = isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : null;
            const isWeekend = ['сб', 'вс'].includes(weekday.toLowerCase());

            return (
              <div
                key={day.key}
                id={isToday ? 'today' : undefined}
                className={[
                  'relative',
                  idx > 0 ? 'border-t border-borderc' : '',
                  isToday ? 'bg-accent/[0.02]' : '',
                ].join(' ')}
              >
                {isToday && (
                  <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent" />
                )}

                {/* Заголовок дня — sticky на мобильном */}
                <div className={[
                  'sticky top-[56px] lg:top-[64px] z-10',
                  'px-4 py-2 bg-card border-b border-borderc/60',
                  hasEvents ? '' : '',
                ].join(' ')}>
                  <div className="flex items-baseline gap-2">
                    {dayPrefix && (
                      <span className={`text-h2 ${isToday ? 'text-accent' : 'text-text1'}`}>
                        {dayPrefix}
                      </span>
                    )}
                    {!dayPrefix && (
                      <span className={`text-h2 capitalize ${isWeekend ? 'text-text2' : 'text-text1'}`}>
                        {weekday}
                      </span>
                    )}
                    <span className="text-meta tabular-nums text-text3">
                      {dayMonth}
                    </span>
                    {hasEvents && (
                      <span className="ml-auto text-meta tabular-nums text-text3">
                        {day.events.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Контент дня */}
                {hasEvents ? (
                  <ul className="divide-y divide-borderc/60">
                    {day.events.map((e) => (
                      <EventRow
                        key={e.id}
                        event={e}
                        tone={isToday ? 'today' : 'future'}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-meta text-text3">Свободно</p>
                  </div>
                )}
              </div>
            );
          })}
        </section>
        )}
      </div>
    </>
  );
}

// =========================================================================
// Ряд события — плоский, плотный, hairline между рядами.
// =========================================================================

function EventRow({
  event: e,
  tone,
}: {
  event: ScheduleEvent;
  tone: 'past' | 'today' | 'future';
}) {
  const kindIsSurvey = e.kind === 'survey';
  const kindLabel = kindIsSurvey ? 'Замер' : 'Установка';

  // Бейдж типа — пастельный, 16px высотой.
  const kindBadge = kindIsSurvey
    ? 'bg-info2/[0.08] text-info2'
    : 'bg-ok2/[0.08] text-ok2';

  // Плавная цветовая шкала по daysOverdue:
  //   0 (сегодня/будущее) — нейтрал text-text2
  //   1 (вчера)           — warn text-warn2
  //   2+                  — bad text-bad2
  const timeColor =
    e.daysOverdue >= 2 ? 'text-bad2' :
    e.daysOverdue === 1 ? 'text-warn2' :
    'text-text2';
  const rowDim = tone === 'past' ? (e.daysOverdue >= 2 ? 'opacity-60' : 'opacity-80') : '';

  return (
    <li className={rowDim}>
      <Link
        href={`/orders/${e.orderId}`}
        className="flex items-center gap-3 px-4 py-2.5 min-h-[44px]
                   transition-colors duration-fast
                   hover:bg-subtle/60 active:scale-[0.99]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        {/* Время */}
        <span className={`shrink-0 w-12 text-[14px] tabular-nums ${timeColor}`}>
          {fmtTime(e.at)}
        </span>

        {/* Бейдж типа — 16px */}
        <span className={`shrink-0 inline-flex items-center h-[18px] px-1.5 rounded text-[11px]
                          font-semibold uppercase tracking-wide ${kindBadge}`}>
          {kindLabel}
        </span>

        {/* Клиент + адрес — одна строка с truncate */}
        <span className="flex-1 min-w-0 flex items-baseline gap-2">
          <span className="text-[14px] text-text1 truncate">
            {e.clientName}
          </span>
          {e.clientAddress && (
            <span className="hidden sm:inline text-[13px] text-text3 truncate">
              · {e.clientAddress}
            </span>
          )}
        </span>

        {/* № заказа */}
        <span className="shrink-0 text-[12px] tabular-nums text-text3">
          № {e.number}
        </span>

        {/* Аватар-исполнитель */}
        {e.worker && (
          <span
            title={e.worker.fullName}
            className="shrink-0 w-6 h-6 rounded-full bg-subtle text-text2
                       text-[10px] font-semibold flex items-center justify-center"
          >
            {initials(e.worker.fullName)}
          </span>
        )}
      </Link>

      {/* Адрес отдельной строкой на мобильном */}
      {e.clientAddress && (
        <p className="sm:hidden px-4 pb-2 -mt-1 text-[12.5px] text-text3 truncate">
          {e.clientAddress}
        </p>
      )}
    </li>
  );
}
