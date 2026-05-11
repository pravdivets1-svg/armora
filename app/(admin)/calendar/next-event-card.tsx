'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';

function formatCountdown(targetMs: number): { primary: string; secondary: string; tone: 'live' | 'soon' | 'far' | 'past' } {
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    const past = Math.abs(diff);
    const m = Math.floor(past / 60_000);
    if (m < 60) return { primary: `${m} мин назад`, secondary: 'просрочено', tone: 'past' };
    const h = Math.floor(m / 60);
    if (h < 24) return { primary: `${h} ч назад`, secondary: 'просрочено', tone: 'past' };
    return { primary: `${Math.floor(h / 24)} д назад`, secondary: 'просрочено', tone: 'past' };
  }
  const m = Math.floor(diff / 60_000);
  if (m < 1) return { primary: 'Сейчас', secondary: 'начинается', tone: 'live' };
  if (m < 60) return { primary: `Через ${m} мин`, secondary: m < 30 ? 'скоро' : 'сегодня', tone: 'soon' };
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return { primary: `Через ${h} ч${mm > 0 ? ` ${mm} мин` : ''}`, secondary: 'сегодня', tone: 'soon' };
  return { primary: `Через ${Math.floor(h / 24)} д`, secondary: 'на горизонте', tone: 'far' };
}

export default function NextEventCard({
  orderId,
  kind,
  clientName,
  clientAddress,
  number,
  workerName,
  atIso,
  timeLabel,
}: {
  orderId: string;
  kind: 'survey' | 'install';
  clientName: string;
  clientAddress: string;
  number: number;
  workerName?: string;
  atIso: string;
  timeLabel: string;
}) {
  const target = new Date(atIso).getTime();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const cd = formatCountdown(target);
  const isSurvey = kind === 'survey';
  const kindLabel = isSurvey ? 'Замер' : 'Установка';

  const accentRing = cd.tone === 'past' ? 'border-bad2/40 bg-bad2-soft/40'
    : cd.tone === 'live' ? 'border-accent bg-accent-soft animate-pulse'
    : cd.tone === 'soon' ? 'border-accent/30 bg-accent-soft/40'
    : 'border-borderc bg-card';

  const kindBadge = cd.tone === 'past'
    ? 'bg-bad2 text-card'
    : isSurvey
      ? 'bg-info2 text-card'
      : 'bg-ok2 text-card';

  return (
    <Link
      href={`/orders/${orderId}`}
      className={`block rounded-lg border ${accentRing} p-4 sm:p-5
                  transition-transform duration-fast active:scale-[0.99]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      <div className="flex items-center gap-2 text-meta uppercase tracking-wide text-text3 mb-1">
        <span className={`inline-flex items-center h-5 px-1.5 rounded text-[10px] font-semibold tracking-wide ${kindBadge}`}>
          {kindLabel}
        </span>
        <span>·</span>
        <span className="tabular-nums">{timeLabel}</span>
        <span>·</span>
        <span className="tabular-nums">№ {number}</span>
      </div>
      <h2 className={`text-display tabular-nums leading-none mb-1
                      ${cd.tone === 'past' ? 'text-bad2' : 'text-text1'}`}>
        {cd.primary}
      </h2>
      <p className="text-meta text-text3 mb-3">{cd.secondary}</p>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-text1 truncate">{clientName}</p>
          {clientAddress && (
            <p className="text-[13px] text-text2 mt-0.5 flex items-start gap-1.5">
              <MapPin size={12} className="mt-0.5 shrink-0 text-text3" />
              <span className="truncate">{clientAddress}</span>
            </p>
          )}
          {workerName && (
            <p className="text-meta text-text3 mt-1.5">{workerName}</p>
          )}
        </div>
        <ChevronRight size={18} className="text-text3 shrink-0 mt-1" />
      </div>
    </Link>
  );
}
