// Маршрут на сегодня: компактная полоса под bento-сеткой.
// Hero-цифра "Сегодня" уже в bento, тут — список точек по времени
// и primary CTA на Яндекс.Карты.
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

  return (
    <section className="rounded-2xl border border-line bg-white overflow-hidden shadow-soft">
      {/* Editorial-шапка */}
      <div className="px-6 md:px-7 py-5 flex items-center justify-between gap-4 border-b border-line bg-canvas">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-500 font-medium">
            <Navigation size={12} />
            Маршрут на сегодня
          </div>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <span className="font-display text-[40px] md:text-[48px] tabular-nums leading-none tracking-tight text-ink-900">
              {sorted.length}
            </span>
            <span className="text-[14px] text-ink-500">
              {sorted.length === 1 ? 'точка' : sorted.length < 5 ? 'точки' : 'точек'}
              <span className="ml-2 tabular-nums">· {fmtTime(firstAt)} – {fmtTime(lastAt)}</span>
            </span>
          </div>
        </div>

        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl
                     bg-ink-900 text-white font-medium text-[14px]
                     hover:bg-accent hover:shadow-accent-glow transition-all shrink-0"
        >
          В Яндекс.Картах <ArrowUpRight size={15} />
        </Link>
      </div>

      {/* Список точек: timeline */}
      <ol>
        {sorted.map((p, i) => (
          <li
            key={`${p.number}-${i}`}
            className={`px-6 md:px-7 py-4 flex items-start gap-5 ${i > 0 ? 'border-t border-line/60' : ''}`}
          >
            {/* Номер точки в кружке */}
            <div className="mt-1 w-8 h-8 rounded-full bg-ink-900 text-white text-[13px]
                            font-semibold flex items-center justify-center shrink-0 tabular-nums">
              {i + 1}
            </div>
            {/* Время display + тип */}
            <div className="w-20 shrink-0">
              <div className="font-display text-[24px] tabular-nums tracking-tight leading-none text-ink-900">
                {fmtTime(p.at)}
              </div>
              <div className={`text-[10px] uppercase tracking-[0.15em] mt-1.5 font-medium ${
                p.kind === 'survey' ? 'text-blue-700' : 'text-emerald-700'
              }`}>
                {p.kind === 'survey' ? 'Замер' : 'Установка'}
              </div>
            </div>
            {/* Клиент + адрес */}
            <div className="min-w-0 flex-1">
              <div className="text-[15px] text-ink-900 font-medium">
                {p.clientName} <span className="text-ink-400 font-normal text-[13px]">№ {p.number}</span>
              </div>
              <div className="text-[13px] text-ink-500 mt-1 flex items-start gap-1.5">
                <MapPin size={12} className="mt-0.5 shrink-0 text-ink-400" />
                <span>{p.clientAddress}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
