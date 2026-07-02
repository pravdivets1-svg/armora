import Link from 'next/link';
import type { Stage } from '@prisma/client';
import { Phone, MapPin, Navigation } from 'lucide-react';
import { StagePill } from './stage-pill';
import { CopyButton } from './copy-button';
import { Money } from './money';

function fmtPhone(p: string | null | undefined): string {
  if (!p) return '';
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

// Цветовая полоса слева + тонкое стеклянное кольцо: стадия читается мгновенно,
// но не «кричит». Liquid Glass: основа стекло, цвет только в индикаторе.
const STAGE_STRIPE: Record<Stage, { stripe: string; ring: string }> = {
  new:              { stripe: 'bg-violet',   ring: 'ring-violet/25' },
  survey_scheduled: { stripe: 'bg-info2',    ring: 'ring-info2/25' },
  survey_done:      { stripe: 'bg-info2',    ring: 'ring-info2/25' },
  production:       { stripe: 'bg-warn2',    ring: 'ring-warn2/25' },
  ready_to_install: { stripe: 'bg-ok2',      ring: 'ring-ok2/25' },
  installed:        { stripe: 'bg-ok2',      ring: 'ring-ok2/25' },
  pending_closure:  { stripe: 'bg-accent',   ring: 'ring-accent/35' },
  closed:           { stripe: 'bg-text3/40', ring: 'ring-white/20' },
};

export function OrderCard({
  href,
  number,
  clientName,
  address,
  stage,
  daysInStage,
  phone,
  amount,
}: {
  href: string;
  number: string;
  clientName: string;
  address: string | null;
  stage: Stage;
  daysInStage?: number;
  phone: string | null;
  amount: number | null;
}) {
  const tint = STAGE_STRIPE[stage];
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
  const mapHref = address
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`
    : null;

  return (
    // Паттерн «растянутая ссылка»: сама карточка — article, на весь блок лёг
    // невидимый оверлей-Link (тап по пустому месту → открыть заказ), а кнопки
    // звонка/маршрута перехватывают свой тап поверх него.
    <article
      className={`relative glass-surface rounded-2xl ring-1 ${tint.ring}
                  pl-5 pr-4 py-3.5
                  transition-transform duration-fast ease-soft
                  active:scale-[0.99]
                  overflow-hidden`}
    >
      {/* Цветовая полоса слева — главный визуальный индикатор стадии */}
      <span
        aria-hidden
        className={`absolute left-0 inset-y-0 w-1 ${tint.stripe} pointer-events-none`}
      />

      {/* Оверлей-ссылка: занимает всю карточку, ловит тап «открыть заказ» */}
      <Link
        href={href}
        aria-label={`Открыть заказ № ${number}, ${clientName}`}
        className="card-link absolute inset-0 z-0 rounded-2xl
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {/* Контент поверх оверлея, но прозрачен для тапов (pointer-events-none),
          чтобы тап по тексту проваливался на оверлей. Кнопки возвращают себе тап. */}
      <div className="relative z-10 pointer-events-none flex items-stretch justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Имя клиента + номер */}
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="text-[15px] font-semibold text-text1 truncate flex-1 min-w-0 leading-tight">
              {clientName}
            </h3>
            <span className="text-meta text-text3 tabular-nums shrink-0">№ {number}</span>
          </div>

          {/* Stage pill */}
          <div className="mb-2">
            <StagePill stage={stage} daysInStage={daysInStage} />
          </div>

          {/* Адрес + копирование прямо из списка (без захода в заказ) */}
          {address && (
            <p className="text-meta text-text2 flex items-center gap-1.5 w-full mb-0.5">
              <MapPin size={11} className="shrink-0 translate-y-[1px] text-text3" />
              <span className="truncate flex-1 min-w-0">{address}</span>
              {/* 40×40px хит-зона (иконка прежняя): 24px в перчатках не попасть —
                  промах проваливался в оверлей-ссылку и открывал заказ. */}
              <CopyButton
                text={address}
                label="Скопировать адрес"
                className="w-10 h-10 -my-3 -mr-2 rounded-md text-text3 hover:text-text1 hover:bg-subtle/70"
              />
            </p>
          )}

          {/* Телефон */}
          {phone && (
            <p className="text-meta text-text3 tabular-nums inline-flex items-baseline gap-1.5">
              <Phone size={11} className="shrink-0 translate-y-[1px]" />
              <span>{fmtPhone(phone)}</span>
            </p>
          )}
        </div>

        {/* Правая колонка: сумма сверху, быстрые действия снизу — вписаны в
            высоту левой колонки, карточка не растёт. */}
        <div className="shrink-0 flex flex-col items-end justify-between gap-2">
          {/* Сумма — крупно, число доминирует, валюта приглушена */}
          <div className="text-right">
            <Money value={amount} size="md" className="text-text1 leading-tight" />
            <div className="text-[11px] uppercase tracking-wide text-text3 mt-0.5">
              {amount == null ? 'нет суммы' : 'по договору'}
            </div>
          </div>

          {/* Звонок / маршрут прямо из списка — без захода в заказ */}
          {(telHref || mapHref) && (
            <div className="pointer-events-auto flex items-center gap-2">
              {telHref && (
                <a
                  href={telHref}
                  aria-label="Позвонить клиенту"
                  title="Позвонить"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full
                             bg-ok2/10 text-ok2 active:scale-95
                             transition-transform duration-fast
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-ok2"
                >
                  <Phone size={17} strokeWidth={2} />
                </a>
              )}
              {mapHref && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Маршрут до адреса"
                  title="Маршрут"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full
                             bg-accent/10 text-accent active:scale-95
                             transition-transform duration-fast
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Navigation size={17} strokeWidth={2} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
