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

// В Liquid Glass карточка — стекло, цвет стадии остаётся подсказкой:
// тонкое кольцо вокруг края + лёгкий цветной gradient overlay поверх стекла.
const STAGE_TINT: Record<Stage, { ring: string; overlay: string }> = {
  new:              { ring: 'ring-white/30',     overlay: '' },
  survey_scheduled: { ring: 'ring-info2/30',     overlay: 'bg-info2/[0.04]' },
  survey_done:      { ring: 'ring-info2/30',     overlay: 'bg-info2/[0.04]' },
  production:       { ring: 'ring-warn2/30',     overlay: 'bg-warn2/[0.04]' },
  ready_to_install: { ring: 'ring-ok2/30',       overlay: 'bg-ok2/[0.04]' },
  installed:        { ring: 'ring-ok2/30',       overlay: 'bg-ok2/[0.04]' },
  pending_closure:  { ring: 'ring-accent/40',    overlay: 'bg-accent/[0.05]' },
  closed:           { ring: 'ring-white/20',     overlay: '' },
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
      className={`block relative glass-surface rounded-2xl px-4 py-3 ring-1 ${tint.ring}
                 transition-transform duration-fast ease-soft
                 active:scale-[0.99]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                 overflow-hidden`}
    >
      {tint.overlay && (
        <span aria-hidden className={`absolute inset-0 pointer-events-none ${tint.overlay}`} />
      )}
      <div className="relative">
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
      </div>
    </Link>
  );
}
