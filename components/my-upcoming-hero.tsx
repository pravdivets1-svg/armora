// Hero-блок «Ближайшее у вас» на верху /orders.
//
// Логика:
//   • Замерщик/установщик — события на ближайшие 48 часов где они назначены.
//   • Staff (директор/менеджер) — следующее событие компании в течение 48ч
//     (любой замер/установка любого исполнителя).
// Показываем 1-3 события в виде стеклянной плитки с временем и адресом.
// Если событий нет — блок не рендерится.

import Link from 'next/link';
import type { Role } from '@prisma/client';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { isStaff } from '@/lib/auth-helpers';
import { fmtTime, isSameMskDay, mskDayStart } from '@/lib/format';

type UpcomingEvent = {
  orderId: string;
  number: number;
  kind: 'survey' | 'install';
  at: Date;
  clientName: string;
  clientAddress: string;
};

export async function MyUpcomingHero({ me }: { me: { id: string; role: Role } }) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // У staff показываем все события компании, у нестаффа — только свои.
  const surveyorWhere = isStaff(me.role) ? {} : { surveyorId: me.id };
  const installerWhere = isStaff(me.role) ? {} : { installerId: me.id };

  const [surveys, installs] = await Promise.all([
    prisma.order.findMany({
      where: {
        stage: 'survey_scheduled',
        surveyAt: { gte: now, lte: horizon },
        ...surveyorWhere,
      },
      select: { id: true, number: true, clientName: true, clientAddress: true, surveyAt: true },
    }),
    prisma.order.findMany({
      where: {
        stage: 'ready_to_install',
        installAt: { gte: now, lte: horizon },
        ...installerWhere,
      },
      select: { id: true, number: true, clientName: true, clientAddress: true, installAt: true },
    }),
  ]);

  const events: UpcomingEvent[] = [
    ...surveys.map((o): UpcomingEvent => ({
      orderId: o.id, number: o.number, kind: 'survey',
      at: o.surveyAt!, clientName: o.clientName, clientAddress: o.clientAddress,
    })),
    ...installs.map((o): UpcomingEvent => ({
      orderId: o.id, number: o.number, kind: 'install',
      at: o.installAt!, clientName: o.clientName, clientAddress: o.clientAddress,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 3);

  if (events.length === 0) return null;

  const today = mskDayStart(now);
  const isToday = (d: Date) => isSameMskDay(d, today);

  return (
    <section
      aria-label="Ближайшие события"
      className="glass-surface-strong rounded-2xl overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <h2 className="text-meta uppercase tracking-wide text-text3 font-semibold">
          {isStaff(me.role) ? 'Ближайшее в компании' : 'У вас впереди'}
        </h2>
        <span className="text-meta text-text3 tabular-nums">{events.length} · 48ч</span>
      </header>
      <ul className="divide-y divide-white/30">
        {events.map((e) => {
          const kindLabel = e.kind === 'survey' ? 'Замер' : 'Установка';
          const kindBg = e.kind === 'survey' ? 'bg-info2/[0.08] text-info2' : 'bg-ok2/[0.08] text-ok2';
          const dayLabel = isToday(e.at) ? 'Сегодня' : 'Завтра';
          return (
            <li key={`${e.orderId}-${e.kind}`}>
              <Link
                href={`/orders/${e.orderId}`}
                className="flex items-center gap-3 px-4 py-3 min-h-[56px]
                           transition-colors hover:bg-white/30 active:bg-white/40
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
              >
                <div className="shrink-0 text-center w-14">
                  <div className="text-meta text-text3 uppercase tracking-wide">{dayLabel}</div>
                  <div className="text-h2 tabular-nums text-text1 leading-tight">{fmtTime(e.at)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-flex items-center h-4 px-1.5 rounded text-[10.5px]
                                      font-semibold uppercase tracking-wide ${kindBg}`}>
                      {kindLabel}
                    </span>
                    <span className="text-meta text-text3 tabular-nums">№ {e.number}</span>
                  </div>
                  <p className="text-[14px] text-text1 font-medium truncate">{e.clientName}</p>
                  {e.clientAddress && (
                    <p className="text-meta text-text3 truncate inline-flex items-baseline gap-1">
                      <MapPin size={11} className="shrink-0 translate-y-[1px]" />
                      <span className="truncate">{e.clientAddress}</span>
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="text-text3 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
