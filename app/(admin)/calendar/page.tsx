// Расписание — modern editorial.
//
// Главное правило: один заказ = одна точка.
//   - В «Замеры» попадают только заказы со stage === 'survey_scheduled'
//   - В «Установки» — только со stage === 'ready_to_install'
//   - Завершённые этапы (survey_done, installed, closed) не показываются.
//
// Иерархия:
//   1. Маршрут на сегодня (hero для surveyor/installer) — самое важное
//   2. Stat-метрики через единый <Metric>
//   3. Алерт о просрочке
//   4. Фильтр по сотруднику для staff
//   5. Список событий по дням — timeline с цветной полосой слева

import Link from 'next/link';
import { Ruler, Hammer, CalendarClock, Factory, AlertTriangle, MapPin } from 'lucide-react';

import { requireUser, isStaff } from '@/lib/auth-helpers';
import { loadSchedule, type ScheduleEvent } from '@/lib/schedule';
import { fmtDayLong } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { Metric, MetricCard } from '@/components/metric';
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

  const showRoute = !isStaff(me.role);
  const todayPoints = showRoute
    ? events
        .filter((e) => e.at.getTime() >= today.getTime() && e.at.getTime() < tomorrow.getTime())
        .filter((e) => e.clientAddress.trim().length > 0)
        .map((e) => ({
          at: e.at,
          clientAddress: e.clientAddress,
          clientName: e.clientName,
          number: e.number,
          kind: e.kind,
        }))
    : [];

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-display text-ink-900">Расписание</h1>
        <div className="text-[14px] text-ink-500 mt-2">
          Активные замеры и установки на ближайшие 30 дней
        </div>
      </div>

      {/* Маршрут на сегодня — hero для surveyor/installer */}
      {showRoute && todayPoints.length > 0 && (
        <TodayRouteCard points={todayPoints} />
      )}

      {/* Stat-ряд через единый Metric. Без цветных tint-фонов. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard href="/orders?stage=survey_scheduled">
          <Metric
            label="Замеры"
            value={summary.surveysCount}
            size="lg"
            icon={<Ruler size={12} />}
          />
        </MetricCard>
        <MetricCard href="/orders?stage=ready_to_install">
          <Metric
            label="Установки"
            value={summary.installsCount}
            size="lg"
            icon={<Hammer size={12} />}
          />
        </MetricCard>
        <MetricCard href="#today">
          <Metric
            label="Сегодня"
            value={summary.todayCount}
            size="lg"
            tone="accent"
            icon={<CalendarClock size={12} />}
          />
        </MetricCard>
        {isStaff(me.role) && (
          <MetricCard href="/orders?stage=production">
            <Metric
              label="В производстве"
              value={summary.productionCount}
              size="lg"
              icon={<Factory size={12} />}
            />
          </MetricCard>
        )}
      </div>

      {summary.overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-bad/5 border-l-4 border-l-bad border-y border-r border-y-bad/15 border-r-bad/15 px-4 py-3 text-[14px]">
          <AlertTriangle size={16} className="text-bad shrink-0" />
          <div className="text-ink-900">
            <span className="font-semibold text-bad">{summary.overdueCount}</span>{' '}
            {summary.overdueCount === 1 ? 'просроченное событие' : 'просроченных событий'}
            <span className="text-ink-500"> — выделены красным ниже</span>
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
        <div className="bg-white border border-line rounded-lg p-16 text-center">
          <CalendarClock size={28} className="mx-auto text-ink-300 mb-4" />
          <div className="text-ink-900 font-medium">На ближайшие 30 дней событий нет</div>
          <div className="text-ink-500 text-[13px] mt-1">Назначьте замер или установку из карточки заказа</div>
        </div>
      )}

      <div className="space-y-6">
        {[...byDay.entries()].map(([key, dayEvents]) => {
          const date = dayEvents[0].at;
          const isToday = isSameDay(date, today);
          const isTomorrow = isSameDay(date, tomorrow);
          const isPast = date.getTime() < today.getTime();
          const dayName = isPast ? 'Просрочено' : isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : null;

          return (
            <section key={key} id={isToday ? 'today' : undefined}>
              <div className="flex items-baseline gap-3 mb-3">
                {dayName && (
                  <h2 className={`text-[16px] font-semibold ${isPast ? 'text-bad' : 'text-ink-900'}`}>
                    {dayName}
                  </h2>
                )}
                <span className={dayName ? 'text-[13px] text-ink-500' : 'text-[16px] font-semibold text-ink-900'}>
                  {fmtDayLong(date)}
                </span>
                {dayEvents.length > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-ink-900/[0.06] text-ink-700 font-medium tabular-nums">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="bg-white border border-line rounded-lg overflow-hidden">
                {dayEvents.map((e, idx) => (
                  <Link
                    key={e.id}
                    href={`/orders/${e.orderId}`}
                    className={`group relative flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-5 py-3.5 hover-row
                                ${idx > 0 ? 'border-t border-line/60' : ''}`}
                  >
                    {/* Цветная вертикальная полоса слева — единственный цветной акцент строки */}
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                        e.isOverdue ? 'bg-bad' : e.kind === 'survey' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                    />

                    {/* Десктоп: время в фиксированной колонке */}
                    <div className="hidden md:block w-12 shrink-0">
                      <div className={`font-semibold text-[15px] tabular-nums leading-none ${e.isOverdue ? 'text-bad' : 'text-ink-900'}`}>
                        {String(e.at.getHours()).padStart(2, '0')}:
                        {String(e.at.getMinutes()).padStart(2, '0')}
                      </div>
                      <div className={`mt-1 text-[10px] uppercase tracking-wider font-medium ${
                        e.isOverdue ? 'text-bad' : e.kind === 'survey' ? 'text-blue-700' : 'text-emerald-700'
                      }`}>
                        {e.kind === 'survey' ? 'Замер' : 'Установка'}
                      </div>
                    </div>

                    {/* Мобайл: время+тип одной строкой сверху */}
                    <div className="md:hidden flex items-center gap-2 text-[12px]">
                      <span className={`font-semibold tabular-nums ${e.isOverdue ? 'text-bad' : 'text-ink-900'}`}>
                        {String(e.at.getHours()).padStart(2, '0')}:
                        {String(e.at.getMinutes()).padStart(2, '0')}
                      </span>
                      <span className={`uppercase tracking-wider font-medium ${
                        e.isOverdue ? 'text-bad' : e.kind === 'survey' ? 'text-blue-700' : 'text-emerald-700'
                      }`}>
                        · {e.kind === 'survey' ? 'Замер' : 'Установка'}
                      </span>
                      {e.isOverdue && (
                        <span className="ml-auto text-bad font-medium">просрочено</span>
                      )}
                    </div>

                    {/* Клиент + адрес */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink-900 text-[14px]">
                        {e.clientName}{' '}
                        <span className="text-ink-500 font-normal">№ {e.number}</span>
                      </div>
                      <div className="text-[12px] text-ink-500 mt-0.5 flex items-start gap-1">
                        <MapPin size={11} className="mt-0.5 shrink-0 text-ink-400" />
                        <span className="truncate">{e.clientAddress}</span>
                        {e.worker && <span className="text-ink-400 ml-1 hidden md:inline">· {e.worker.fullName}</span>}
                      </div>
                      {e.worker && (
                        <div className="md:hidden text-[11px] text-ink-400 mt-0.5">{e.worker.fullName}</div>
                      )}
                    </div>
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
