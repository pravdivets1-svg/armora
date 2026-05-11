import Link from 'next/link';
import type { Stage } from '@prisma/client';
import { ProgressChip } from './progress-chip';

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
  highlight,
}: {
  href: string;
  number: string;
  clientName: string;
  address: string | null;
  stage: Stage;
  daysInStage?: number;
  phone: string | null;
  amount: number | null;
  highlight?: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-card border border-borderc rounded-lg p-4
                 transition-shadow duration-fast ease-soft hover:shadow-soft-lg
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-h2 text-text1 truncate">{clientName}</h3>
        <span className="text-meta text-text3 tabular-nums shrink-0">№ {number}</span>
      </div>
      <p className="text-meta text-text3 truncate mb-3">{address || '—'}</p>
      <div className="mb-3">
        <ProgressChip stage={stage} daysInStage={daysInStage} />
      </div>
      <div className="flex items-center justify-between gap-3 text-meta">
        <span className="text-text2 tabular-nums truncate">{fmtPhone(phone)}</span>
        <span className="text-text1 tabular-nums font-medium shrink-0">{fmtRub(amount)}</span>
      </div>
      {highlight && (
        <p className="mt-2 pt-2 border-t border-borderc text-meta text-accent tabular-nums">
          {highlight}
        </p>
      )}
    </Link>
  );
}
