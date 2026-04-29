// Календарь — modern 2026.

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import { fmtDayLong } from '@/lib/format';
import CalendarUserFilter from './user-filter';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Календарь — Armora' };

const DAYS_AHEAD = 21;

type EventKind = 'survey' | 'install';
type CalendarEvent = {
  id: string;
  orderId: string;
  number: number;
  at: Date;
  kind: EventKind;
  clientName: string;
  clientAddress: string;
  worker: string | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { user?: string };
}) {
  const me = await requireUser();

  const now = new Date();
  const horizon = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const baseRange = (field: 'surveyAt' | 'installAt') => ({
    [field]: { gte: now, lte: horizon },
  });

  const surveyorWhere =
    !isStaff(me.role) ? { surveyorId: me.id } : searchParams.user ? { surveyorId: searchParams.user } : {};
  const installerWhere =
    !isStaff(me.role) ? { installerId: me.id } : searchParams.user ? { installerId: searchParams.user } : {};

  const [surveys, installs, assignable] = await Promise.all([
    prisma.order.findMany({
      where: { ...baseRange('surveyAt'), ...surveyorWhere },
      select: {
        id: true, number: true, surveyAt: true,
        clientName: true, clientAddress: true,
        surveyor: { select: { fullName: true } },
      },
    }),
    prisma.order.findMany({
      where: { ...baseRange('installAt'), ...installerWhere },
      select: {
        id: true, number: true, installAt: true,
        clientName: true, clientAddress: true,
        installer: { select: { fullName: true } },
      },
    }),
    isStaff(me.role)
      ? prisma.user.findMany({
          where: { isActive: true, role: { in: ['surveyor', 'installer'] } },
          select: { id: true, fullName: true, role: true },
          orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
        })
      : Promise.resolve([] as { id: string; fullName: string; role: 'surveyor' | 'installer' }[]),
  ]);

  const events: CalendarEvent[] = [
    ...surveys.map<CalendarEvent>((o) => ({
      id: `${o.id}:s`, orderId: o.id, number: o.number, at: o.surveyAt!,
      kind: 'survey', clientName: o.clientName, clientAddress: o.clientAddress,
      worker: o.surveyor?.fullName ?? null,
    })),
    ...installs.map<CalendarEvent>((o) => ({
      id: `${o.id}:i`, orderId: o.id, number: o.number, at: o.installAt!,
      kind: 'install', clientName: o.clientName, clientAddress: o.clientAddress,
      worker: o.installer?.fullName ?? null,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = `${e.at.getFullYear()}-${e.at.getMonth()}-${e.at.getDate()}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-display text-ink-900">Календарь</h1>
        <div className="text-[14px] text-ink-500 mt-2">
          Замеры и установки на ближайшие {DAYS_AHEAD} дней
        </div>
      </div>

      {isStaff(me.role) && assignable.length > 0 && (
        <CalendarUserFilter
          users={assignable as { id: string; fullName: string; role: 'surveyor' | 'installer' }[]}
          selected={searchParams.user ?? ''}
        />
      )}

      {events.length === 0 && (
        <div className="bg-white border border-line border-dashed rounded-lg p-12 text-center text-ink-400">
          На ближайшие {DAYS_AHEAD} дней событий нет
        </div>
      )}

      <div className="space-y-8">
        {[...byDay.entries()].map(([key, dayEvents]) => {
          const date = dayEvents[0].at;
          const isToday = isSameDay(date, today);
          const isTomorrow = isSameDay(date, tomorrow);
          const dayName = isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : null;

          return (
            <section key={key}>
              <div className="flex items-baseline gap-3 mb-4">
                {dayName && (
                  <h2 className="text-[15px] font-semibold text-ink-900">{dayName}</h2>
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
                                ${idx > 0 ? 'border-t border-line/60' : ''}`}
                  >
                    <div className="w-12 font-semibold text-[15px] tabular-nums text-ink-900">
                      {String(e.at.getHours()).padStart(2, '0')}:
                      {String(e.at.getMinutes()).padStart(2, '0')}
                    </div>

                    <span
                      className={
                        e.kind === 'survey'
                          ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-blue-500/10 text-blue-700 whitespace-nowrap'
                          : 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-emerald-500/10 text-emerald-700 whitespace-nowrap'
                      }
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${e.kind === 'survey' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                      {e.kind === 'survey' ? 'Замер' : 'Установка'}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-ink-900 text-[14px]">
                        {e.clientName}{' '}
                        <span className="text-ink-500 font-normal">№ {e.number}</span>
                      </div>
                      <div className="text-[12px] text-ink-500 truncate mt-0.5">
                        {e.clientAddress}
                        {e.worker && <> · {e.worker}</>}
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
