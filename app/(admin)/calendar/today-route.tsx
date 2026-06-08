// Маршрут на сегодня: компактная hairline-секция в Linear/Vercel стиле.
// Только для исполнителей. Hero-цифру «Сегодня» уже даёт NextEventCard —
// здесь мы выкладываем точки по времени и primary CTA на Яндекс.Карты.
//
// Формат URL Яндекс.Карт: https://yandex.ru/maps/?rtext=A~B~C&rtt=auto

import Link from 'next/link';
import { Navigation, ArrowUpRight, MapPin } from 'lucide-react';
import { fmtTime } from '@/lib/format';

type Point = {
  at: Date;
  clientAddress: string;
  clientName: string;
  number: number;
  kind: 'survey' | 'install';
};

export function buildYandexRouteUrl(points: { clientAddress: string }[]): string {
  const parts = points
    .map((p) => p.clientAddress.trim())
    .filter(Boolean)
    .map((addr) => encodeURIComponent(addr));
  if (parts.length === 0) return 'https://yandex.ru/maps/';
  return `https://yandex.ru/maps/?rtext=${parts.join('~')}&rtt=auto`;
}

export default function TodayRouteCard({ points }: { points: Point[] }) {
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => a.at.getTime() - b.at.getTime());
  const url = buildYandexRouteUrl(sorted);
  const firstAt = sorted[0].at;
  const lastAt = sorted[sorted.length - 1].at;
  const countLabel = sorted.length === 1 ? 'точка' : sorted.length < 5 ? 'точки' : 'точек';

  return (
    <section className="rounded-md border border-borderc bg-card overflow-hidden">
      {/* Шапка: компактная, hairline снизу */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-borderc/60">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-meta text-text3">
            <Navigation size={12} />
            <span>Маршрут на сегодня</span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-h2 tabular-nums text-text1">
              {sorted.length} {countLabel}
            </span>
            <span className="text-meta tabular-nums text-text3">
              {fmtTime(firstAt)} – {fmtTime(lastAt)}
            </span>
          </div>
        </div>

        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md
                     bg-text1 text-card text-[13px] font-medium shrink-0
                     transition-colors duration-fast hover:bg-text2
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          В Яндекс.Картах <ArrowUpRight size={14} />
        </Link>
      </header>

      {/* Список точек: hairline между рядами */}
      <ol className="divide-y divide-borderc/60">
        {sorted.map((p, i) => {
          const isSurvey = p.kind === 'survey';
          const kindBadge = isSurvey
            ? 'bg-info2/[0.08] text-info2'
            : 'bg-ok2/[0.08] text-ok2';
          return (
            <li key={`${p.number}-${i}`} className="px-4 py-2.5 min-h-[44px] flex items-center gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-subtle text-text2
                               text-[11px] font-semibold tabular-nums
                               flex items-center justify-center">
                {i + 1}
              </span>
              <span className="shrink-0 w-12 text-[14px] tabular-nums text-text2">
                {fmtTime(p.at)}
              </span>
              <span className={`shrink-0 inline-flex items-center h-4 px-1.5 rounded text-[10.5px]
                                font-semibold uppercase tracking-wide ${kindBadge}`}>
                {isSurvey ? 'Замер' : 'Установка'}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] text-text1 truncate">
                  {p.clientName}
                  <span className="ml-1.5 text-[12px] tabular-nums text-text3">№ {p.number}</span>
                </span>
                <span className="block text-[12.5px] text-text3 truncate flex items-center gap-1">
                  <MapPin size={11} className="shrink-0 text-text3" />
                  {p.clientAddress}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
