// Карточка «Маршрут на сегодня» — для замерщика и установщика.
// Показывается, если на сегодня запланировано 1+ событие с адресом.
// Кнопка ведёт в Яндекс.Карты с маршрутом по точкам в порядке по времени.
//
// Формат URL Яндекс.Карт: https://yandex.ru/maps/?rtext=A~B~C&rtt=auto
//   - rtext: точки маршрута, разделённые "~" (можно URL-encoded адрес или "lat,lon")
//   - rtt=auto — режим маршрута: авто/такси (по умолчанию)
// Адреса URL-кодируем; пробелы и спец-символы обрабатывает encodeURIComponent.

import Link from 'next/link';
import { Navigation } from 'lucide-react';
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

  // Сортируем по времени (на всякий случай — на входе должно быть уже отсортировано)
  const sorted = [...points].sort((a, b) => a.at.getTime() - b.at.getTime());
  const url = buildYandexRouteUrl(sorted);

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-medium text-indigo-700">
            <Navigation size={14} />
            Маршрут на сегодня
          </div>
          <div className="mt-2 text-[20px] font-semibold tabular-nums text-ink-900 leading-tight">
            {sorted.length} {sorted.length === 1 ? 'точка' : sorted.length < 5 ? 'точки' : 'точек'}
          </div>
        </div>

        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700
                     text-white font-medium text-[14px] shrink-0"
        >
          <Navigation size={14} />
          Открыть в Яндекс.Картах
        </Link>
      </div>

      {/* Список точек — компактный preview, по порядку маршрута */}
      <ol className="mt-4 space-y-2 text-[13px]">
        {sorted.map((p, i) => (
          <li key={`${p.number}-${i}`} className="flex items-start gap-3">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px]
                            font-semibold flex items-center justify-center shrink-0 tabular-nums">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-ink-900">
                <span className="tabular-nums font-medium">{fmtTime(p.at)}</span>
                <span className="text-ink-500"> · {p.kind === 'survey' ? 'Замер' : 'Установка'} · № {p.number}</span>
              </div>
              <div className="text-ink-700 truncate">
                {p.clientName}
                <span className="text-ink-500"> — {p.clientAddress}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
