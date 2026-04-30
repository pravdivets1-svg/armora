// Hero-карточка маршрута на сегодня для замерщика/установщика.
// Цели:
//   - чтобы открыв расписание, исполнитель сразу видел "куда ехать сейчас"
//   - крупная primary CTA "Открыть маршрут"
//   - чёткий список точек по времени с расстояниями
//
// Формат URL Яндекс.Карт: https://yandex.ru/maps/?rtext=A~B~C&rtt=auto

import Link from 'next/link';
import { Navigation, ArrowRight, MapPin } from 'lucide-react';
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
    <section className="rounded-xl border border-line bg-white overflow-hidden">
      {/* Hero-блок */}
      <div className="px-5 md:px-6 py-5 md:py-6 bg-ink-900 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-white/60">
              <Navigation size={13} />
              Маршрут на сегодня
            </div>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className="text-[40px] md:text-[44px] font-semibold tabular-nums leading-none">
                {sorted.length}
              </span>
              <span className="text-[16px] text-white/70">
                {sorted.length === 1 ? 'точка' : sorted.length < 5 ? 'точки' : 'точек'}
              </span>
              <span className="text-[14px] text-white/50 ml-2 tabular-nums">
                · {fmtTime(firstAt)} – {fmtTime(lastAt)}
              </span>
            </div>
          </div>

          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg
                       bg-white text-ink-900 font-semibold text-[14px]
                       hover:bg-canvas shrink-0"
          >
            Открыть в Яндекс.Картах <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Список точек: timeline-стиль */}
      <ol className="divide-y divide-line">
        {sorted.map((p, i) => (
          <li key={`${p.number}-${i}`} className="px-5 md:px-6 py-3 flex items-start gap-4">
            {/* Номер точки */}
            <div className="mt-0.5 w-7 h-7 rounded-full bg-ink-900 text-white text-[12px]
                            font-semibold flex items-center justify-center shrink-0 tabular-nums">
              {i + 1}
            </div>
            {/* Время + тип */}
            <div className="w-20 shrink-0">
              <div className="text-[14px] font-semibold tabular-nums text-ink-900">{fmtTime(p.at)}</div>
              <div className={`text-[11px] uppercase tracking-wider mt-0.5 font-medium ${
                p.kind === 'survey' ? 'text-blue-700' : 'text-emerald-700'
              }`}>
                {p.kind === 'survey' ? 'Замер' : 'Установка'}
              </div>
            </div>
            {/* Клиент + адрес */}
            <div className="min-w-0 flex-1">
              <div className="text-[14px] text-ink-900 font-medium">
                {p.clientName} <span className="text-ink-500 font-normal">№ {p.number}</span>
              </div>
              <div className="text-[13px] text-ink-500 mt-0.5 flex items-start gap-1">
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
