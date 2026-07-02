'use client';

// Карточка срочной заявки для блока «Свежие — нужен ответ» (/leads, /orders hero).
// Главное действие — крупная подписанная кнопка «Позвонить» (tel:) во всю ширину.
// Вторичное — «Связались»: дёргает существующий setLeadStageAction(id,'contacted'),
// лид уходит из «свежих» без захода в карточку. Третье — открыть заявку.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Phone, MapPin, Check, ChevronRight } from 'lucide-react';
import { setLeadStageAction } from '@/app/(admin)/leads/actions';

type Color = 'ok2' | 'warn2' | 'bad2';

const STRIPE: Record<Color, string> = { ok2: 'bg-ok2',      warn2: 'bg-warn2',     bad2: 'bg-bad2' };
const TEXT:   Record<Color, string> = { ok2: 'text-ok2-text', warn2: 'text-warn2-text', bad2: 'text-bad2-text' };
const RING:   Record<Color, string> = { ok2: 'ring-ok2/30', warn2: 'ring-warn2/40', bad2: 'ring-bad2/45' };

function fmtPhone(p: string): string {
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

export function UrgentLeadCard({
  id,
  number,
  clientName,
  phone,
  address,
  color,
  ageLabel,
}: {
  id: string;
  number: number;
  clientName: string;
  phone: string;
  address: string | null;
  color: Color;
  ageLabel: string;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const tel = `tel:+${phone.replace(/\D/g, '')}`;

  function markContacted() {
    setDone(true); // оптимистично гасим карточку
    start(async () => {
      try {
        await setLeadStageAction(id, 'contacted');
      } catch {
        setDone(false); // откат при ошибке
      }
    });
  }

  return (
    <article
      className={`relative glass-surface rounded-2xl ring-1 ${RING[color]} overflow-hidden
                  transition-opacity ${done ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Полоса срочности слева — на всю высоту, контрастная */}
      <span aria-hidden className={`absolute left-0 inset-y-0 w-1 ${STRIPE[color]}`} />

      <div className="pl-5 pr-4 py-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[14px] font-semibold ${TEXT[color]}`}>{ageLabel}</span>
          <span className="text-meta text-text2 tabular-nums">№ {number}</span>
        </div>

        <Link
          href={`/leads/${id}`}
          className="block text-[17px] font-semibold text-text1 leading-tight truncate
                     focus:outline-none focus-visible:underline"
        >
          {clientName}
        </Link>

        {/* Телефон и адрес — раздельно: в одной truncate-строке адрес почти
            всегда срезался. Адрес — ссылкой на карту. */}
        <p className="mt-0.5 text-meta text-text2 tabular-nums">{fmtPhone(phone)}</p>
        {address && (
          <a
            href={`https://yandex.ru/maps/?text=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 flex items-center gap-1.5 text-meta text-text2 min-h-[32px] active:text-text1"
          >
            <MapPin size={12} className="shrink-0 text-text3" />
            <span className="truncate">{address}</span>
          </a>
        )}

        {/* Действия: крупная подписанная «Позвонить» + «Связались» + открыть */}
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
          <a
            href={tel}
            className="inline-flex items-center justify-center gap-2 h-12 rounded-xl
                       glass-button-dark text-white text-[15px] font-semibold
                       active:scale-[0.98] transition-transform duration-fast
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2"
          >
            <Phone size={18} /> Позвонить
          </a>

          <button
            type="button"
            onClick={markContacted}
            disabled={pending || done}
            aria-label="Отметить «связались»"
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl
                       border border-borderc bg-card/60 text-text2
                       active:scale-[0.98] transition-transform duration-fast disabled:opacity-50
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Check size={18} />
          </button>

          <Link
            href={`/leads/${id}`}
            aria-label="Открыть заявку"
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl
                       text-text3 hover:text-text1 hover:bg-white/30 transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
