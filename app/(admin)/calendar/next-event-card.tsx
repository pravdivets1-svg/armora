'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';

// Тонкая, плоская карточка-«следующее событие» в духе Linear:
// hairline-border, без заливок, акценты только через цвет текста и
// тонкую полосу слева. Никакой пульсации/тяжёлых теней.

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

  // Левая полоса — единственный цветовой акцент.
  const stripe =
    cd.tone === 'past' ? 'bg-bad2' :
    cd.tone === 'live' || cd.tone === 'soon' ? 'bg-accent' :
    isSurvey ? 'bg-info2' : 'bg-ok2';

  const primaryColor =
    cd.tone === 'past' ? 'text-bad2' :
    cd.tone === 'live' || cd.tone === 'soon' ? 'text-accent' :
    'text-text1';

  const kindBadge = isSurvey
    ? 'bg-info2/[0.08] text-info2'
    : 'bg-ok2/[0.08] text-ok2';

  return (
    <Link
      href={`/orders/${orderId}`}
      className="relative block rounded-md border border-borderc bg-card
                 transition-colors duration-fast
                 hover:bg-subtle/60 active:scale-[0.99]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-r ${stripe}`} />

      <div className="px-4 py-3.5 pl-5">
        {/* Мета-строка: тип · время · № */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center h-4 px-1.5 rounded text-[10.5px]
                            font-semibold uppercase tracking-wide ${kindBadge}`}>
            {kindLabel}
          </span>
          <span className="text-meta text-text3 tabular-nums">{timeLabel}</span>
          <span className="text-text3">·</span>
          <span className="text-meta text-text3 tabular-nums">№ {number}</span>
        </div>

        {/* Основной счётчик — крупно, моноширинно */}
        <h2 className={`text-display tabular-nums leading-none mb-0.5 ${primaryColor}`}>
          {cd.primary}
        </h2>
        <p className="text-meta text-text3 mb-3">{cd.secondary}</p>

        {/* Клиент + адрес + исполнитель */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-text1 truncate">{clientName}</p>
            {clientAddress && (
              <p className="text-[13px] text-text2 mt-0.5 flex items-start gap-1.5 min-w-0">
                <MapPin size={12} className="mt-0.5 shrink-0 text-text3" />
                <span className="truncate">{clientAddress}</span>
              </p>
            )}
            {workerName && (
              <p className="text-meta text-text3 mt-1">{workerName}</p>
            )}
          </div>
          <ChevronRight size={18} className="text-text3 shrink-0 mt-0.5" />
        </div>
      </div>
    </Link>
  );
}
