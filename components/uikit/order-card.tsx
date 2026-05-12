import Link from 'next/link';
import type { Stage } from '@prisma/client';
import { StagePill } from './stage-pill';

function fmtRub(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return '';
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

// Лёгкая тонировка фона карточки в зависимости от стадии заказа.
// Полупрозрачные цвета (alpha ≤ 0.08) — чтобы статус считывался сразу,
// но не «кричал» в общем списке.
const STAGE_TINT: Record<Stage, { bg: string; bgHover: string; border: string }> = {
  new:              { bg: 'bg-card',           bgHover: 'hover:bg-subtle/60',    border: 'border-borderc' },
  survey_scheduled: { bg: 'bg-info2/[0.06]',   bgHover: 'hover:bg-info2/[0.10]', border: 'border-info2/20' },
  survey_done:      { bg: 'bg-info2/[0.06]',   bgHover: 'hover:bg-info2/[0.10]', border: 'border-info2/20' },
  production:       { bg: 'bg-warn2/[0.07]',   bgHover: 'hover:bg-warn2/[0.11]', border: 'border-warn2/25' },
  ready_to_install: { bg: 'bg-ok2/[0.07]',     bgHover: 'hover:bg-ok2/[0.11]',   border: 'border-ok2/25' },
  installed:        { bg: 'bg-ok2/[0.07]',     bgHover: 'hover:bg-ok2/[0.11]',   border: 'border-ok2/25' },
  pending_closure:  { bg: 'bg-accent/[0.07]',  bgHover: 'hover:bg-accent/[0.11]',border: 'border-accent/25' },
  closed:           { bg: 'bg-subtle/40',      bgHover: 'hover:bg-subtle/70',    border: 'border-borderc' },
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
  const tint = STAGE_TINT[stage];
  return (
    <Link
      href={href}
      className={`block ${tint.bg} ${tint.bgHover} border ${tint.border} rounded-md px-4 py-3
                 transition-all duration-fast ease-soft
                 active:scale-[0.99]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <h3 className="text-[14px] font-semibold text-text1 truncate flex-1 min-w-0">{clientName}</h3>
        <span className="text-[14px] text-text1 font-semibold tabular-nums shrink-0">{fmtRub(amount)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <StagePill stage={stage} daysInStage={daysInStage} />
        <span className="text-meta text-text3 tabular-nums shrink-0">№ {number}</span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-1.5 text-[12.5px] text-text3">
        <span className="truncate flex-1 min-w-0">{address || '—'}</span>
        <span className="tabular-nums shrink-0">{fmtPhone(phone)}</span>
      </div>
    </Link>
  );
}
