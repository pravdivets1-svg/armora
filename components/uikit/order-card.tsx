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
  return (
    <Link
      href={href}
      className="block bg-card border border-borderc rounded-md px-4 py-3
                 transition-colors duration-fast ease-soft hover:bg-subtle/60
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
