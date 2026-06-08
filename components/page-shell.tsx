// Унифицированный shell для админских страниц. Linear/Vercel tokens.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const SIZE = {
  default: 'max-w-6xl',
  narrow:  'max-w-3xl',
  wide:    'max-w-7xl',
} as const;

type ShellSize = keyof typeof SIZE;

export function PageShell({
  size = 'default',
  className = '',
  children,
}: {
  size?: ShellSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${SIZE[size]} mx-auto px-6 py-6 space-y-5 ${className}`}>
      {children}
    </div>
  );
}

export function PageBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text1
                 -mt-1 transition-colors"
    >
      <ArrowLeft size={14} /> {label}
    </Link>
  );
}

export function PageHeader({
  kicker,
  title,
  sub,
  meta,
  actions,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        {kicker && (
          <div className="text-[11px] text-text3 uppercase tracking-[0.08em] font-medium mb-1">
            {kicker}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[22px] font-semibold text-text1 leading-tight tracking-tight">
            {title}
          </h1>
          {meta}
        </div>
        {sub && <div className="text-[13px] text-text3 mt-1">{sub}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}

// Тулбар над контролами (фильтры, поиск). Sticky под хедером (h-14=56px).
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-14 z-20 -mx-6 px-6 py-2.5
                    bg-card/95 backdrop-blur-sm border-b border-borderc">
      <div className="flex flex-col md:flex-row gap-2 items-stretch">
        {children}
      </div>
    </div>
  );
}
