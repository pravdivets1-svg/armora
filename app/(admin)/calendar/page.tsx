// Расписание — modern editorial 2026.
// Bento-сетка: главное число "Сегодня" 72px serif в hero-карточке (2×2),
// рядом мелкие метрики, маршрут на сегодня — широкая полоса под bento.
// Заголовок страницы — display serif 56px.

import Link from 'next/link';
import { Ruler, Hammer, CalendarClock, Factory, AlertTriangle, MapPin, ArrowUpRight } from 'lucide-react';

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
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Editorial-заголовок страницы */}
      <header className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-ink-500 font-medium">
          Сегодня · {fmtDayLong(today)}
        </div>
        <h1 className="font-display text-[56px] md:text-[64px] leading-[0.95] tracking-tight text-ink-900">
          Расписание
        </h1>
        <p className="text-[15px] text-ink-500 max-w-xl">
          Активные замеры и установки на ближайшие 30 дней. Один заказ — одна точка.
        </p>
      </header>

      {/* BENTO-СЕТКА: 4 колонки на десктопе, асимметричная.
          Layout:
          ┌─────────────┬───────┬───────┐
          │             │ Замер │ Устан │
          │   СЕГОДНЯ   ├───────┴───────┤
          │  (hero 2×2) │   В произв.   │
          └─────────────┴───────────────┘
      */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[minmax(110px,auto)]">
        {/* Hero: Сегодня — 2×2, тёмная карточка с display-числом */}
        <a
          href="#today"
          className="group md:col-span-2 md:row-span-2 rounded-2xl bg-ink-900 text-white p-7 md:p-8
                     shadow-soft-lg hover:shadow-accent-glow transition-shadow
                     flex flex-col justify-between min-h-[240px] md:min-h-[280px]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/60 font-medium">
              <CalendarClock size={13} />
              Сегодня
            </div>
            <ArrowUpRight size={20} className="text-white/40 group-hover:text-white transition-colors" />
          </div>
          <div className="space-y-2">
            <div className="font-display text-[120px] md:text-[140px] leading-[0.85] tracking-tight tabular-nums">
              {summary.todayCount}
            </div>
            <div className="text-[14px] text-white/60">
              {summary.todayCount === 0
                ? 'на сегодня событий нет'
                : summary.todayCount === 1
                  ? 'событие — замер или установка'
                  : 'событий — замеры и установки'}
            </div>
          </div>
        </a>

        {/* Замеры — 1×1 */}
        <MetricCard href="/orders?stage=survey_scheduled">
          <Metric
            label="Замеры"
            value={summary.surveysCount}
            size="xl"
            icon={<Ruler size={12} />}
          />
        </MetricCard>

        {/* Установки — 1×1 */}
        <MetricCard href="/orders?stage=ready_to_install">
          <Metric
            label="Установки"
            value={summary.installsCount}
            size="xl"
            icon={<Hammer size={12} />}
          />
        </MetricCard>

        {/* В производстве — широкая 2×1 */}
        {isStaff(me.role) && (
          <MetricCard href="/orders?stage=production" span={2}>
            <div className="flex items-end justify-between gap-4">
              <Metric
                label="В производстве"
                value={summary.productionCount}
                size="xl"
                icon={<Factory size={12} />}
              />
              <div className="text-[12px] text-ink-500 pb-2">
                заказы у нас в работе
              </div>
            </div>
          </MetricCard>
        )}
      </div>

      {/* Маршрут на сегодня — широкая полоса под bento */}
      {showRoute && todayPoints.length > 0 && (
        <TodayRouteCard points={todayPoints} />
      )}

      {/* Алерт о просрочке — с цветной тенью */}
      {summary.overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-bad/5 border-l-4 border-l-bad
                        border-y border-r border-y-bad/15 border-r-bad/15 px-5 py-4
                        text-[14px] shadow-bad-glow">
          <AlertTriangle size={18} className="text-bad shrink-0" />
          <div className="text-ink-900">
            <span className="font-semibold text-bad tabular-nums">{summary.overdueCount}</span>{' '}
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
        <div className="bg-white border border-line rounded-2xl p-16 text-center shadow-soft">
          <CalendarClock size={28} className="mx-auto text-ink-400 mb-4" strokeWidth={1.5} />
          <div className="font-display text-[24px] text-ink-900">На горизонте пусто</div>
          <div className="text-ink-500 text-[13px] mt-2">Назначьте замер или установку из карточки заказа</div>
        </div>
      )}

      {/* Список событий по дням — timeline editorial */}
      <div className="space-y-8">
        {[...byDay.entries()].map(([key, dayEvents]) => {
          const date = dayEvents[0].at;
          const isToday = isSameDay(date, today);
          const isTomorrow = isSameDay(date, tomorrow);
          const isPast = date.getTime() < today.getTime();
          const dayName = isPast ? 'Просрочено' : isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : null;

          return (
            <section key={key} id={isToday ? 'today' : undefined}>
              {/* Editorial day header */}
              <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-line">
                {dayName && (
                  <h2 className={`font-display text-[28px] tracking-tight leading-none ${isPast ? 'text-bad' : 'text-ink-900'}`}>
                    {dayName}
                  </h2>
                )}
                <span className={dayName ? 'text-[13px] text-ink-500 uppercase tracking-wider' : 'font-display text-[28px] tracking-tight leading-none text-ink-900'}>
                  {fmtDayLong(date)}
                </span>
                {dayEvents.length > 1 && (
                  <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-ink-900/[0.06] text-ink-700 font-medium tabular-nums">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-soft">
                {dayEvents.map((e, idx) => (
                  <Link
                    key={e.id}
                    href={`/orders/${e.orderId}`}
                    className={`group relative flex flex-col md:flex-row md:items-center gap-2 md:gap-5 px-5 md:px-6 py-4 hover-row
                                ${idx > 0 ? 'border-t border-line/60' : ''}`}
                  >
                    {/* Цветная вертикальная полоса слева */}
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                        e.isOverdue ? 'bg-bad' : e.kind === 'survey' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                    />

                    {/* Десктоп: время display serif в фикс колонке */}
                    <div className="hidden md:block w-20 shrink-0">
                      <div className={`font-display text-[28px] tabular-nums leading-none tracking-tight ${e.isOverdue ? 'text-bad' : 'text-ink-900'}`}>
                        {String(e.at.getHours()).padStart(2, '0')}:
                        {String(e.at.getMinutes()).padStart(2, '0')}
                      </div>
                      <div className={`mt-1.5 text-[10px] uppercase tracking-[0.15em] font-medium ${
                        e.isOverdue ? 'text-bad' : e.kind === 'survey' ? 'text-blue-700' : 'text-emerald-700'
                      }`}>
                        {e.kind === 'survey' ? 'Замер' : 'Установка'}
                      </div>
                    </div>

                    {/* Мобайл: время+тип одной строкой сверху */}
                    <div className="md:hidden flex items-center gap-2 text-[13px]">
                      <span className={`font-display text-[18px] tabular-nums tracking-tight ${e.isOverdue ? 'text-bad' : 'text-ink-900'}`}>
                        {String(e.at.getHours()).padStart(2, '0')}:
                        {String(e.at.getMinutes()).padStart(2, '0')}
                      </span>
                      <span className={`uppercase tracking-wider font-medium text-[11px] ${
                        e.isOverdue ? 'text-bad' : e.kind === 'survey' ? 'text-blue-700' : 'text-emerald-700'
                      }`}>
                        · {e.kind === 'survey' ? 'Замер' : 'Установка'}
                      </span>
                      {e.isOverdue && (
                        <span className="ml-auto text-bad font-medium text-[11px]">просрочено</span>
                      )}
                    </div>

                    {/* Клиент + адрес */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink-900 text-[15px]">
                        {e.clientName}{' '}
                        <span className="text-ink-400 font-normal text-[13px]">№ {e.number}</span>
                      </div>
                      <div className="text-[13px] text-ink-500 mt-1 flex items-start gap-1.5">
                        <MapPin size={12} className="mt-0.5 shrink-0 text-ink-400" />
                        <span className="truncate">{e.clientAddress}</span>
                        {e.worker && <span className="text-ink-400 ml-1 hidden md:inline">· {e.worker.fullName}</span>}
                      </div>
                      {e.worker && (
                        <div className="md:hidden text-[12px] text-ink-400 mt-1">{e.worker.fullName}</div>
                      )}
                    </div>

                    <ArrowUpRight size={16} className="hidden md:block text-ink-300 group-hover:text-ink-700 transition-colors shrink-0" />
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
