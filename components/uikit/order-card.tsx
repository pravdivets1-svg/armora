import Link from 'next/link';
import type { Stage } from '@prisma/client';
import { Phone, MapPin } from 'lucide-react';
import { StagePill } from './stage-pill';

function fmtRub(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return '';
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

// Цветовая полоса слева + тонкое стеклянное кольцо: стадия читается мгновенно,
// но не «кричит». Liquid Glass: основа стекло, цвет только в индикаторе.
const STAGE_STRIPE: Record<Stage, { stripe: string; ring: string }> = {
  new:              { stripe: 'bg-text3',    ring: 'ring-white/30' },
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
  return (
    <Link
      href={href}
      className={`relative block glass-surface rounded-2xl ring-1 ${tint.ring}
                  pl-5 pr-4 py-3.5
                  transition-transform duration-fast ease-soft
                  active:scale-[0.99]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                  overflow-hidden`}
    >
      {/* Цветовая полоса слева — главный визуальный индикатор стадии */}
      <span
        aria-hidden
        className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${tint.stripe}`}
      />

      <div className="flex items-start justify-between gap-3">
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

          {/* Адрес */}
          {address && (
            <p className="text-meta text-text2 truncate inline-flex items-baseline gap-1.5 w-full mb-0.5">
              <MapPin size={11} className="shrink-0 translate-y-[1px] text-text3" />
              <span className="truncate">{address}</span>
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

        {/* Сумма — крупно, справа, как сумма счёта в банковском приложении */}
        <div className="shrink-0 text-right">
          <div className="text-[16px] font-semibold tabular-nums text-text1 leading-tight">
            {fmtRub(amount)}
          </div>
          <div className="text-meta text-text3 mt-0.5">по договору</div>
        </div>
      </div>
    </Link>
  );
}
