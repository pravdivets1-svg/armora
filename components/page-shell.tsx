// Унифицированный shell для админских страниц.
//
// Зачем: до этого каждая страница руками задавала max-w-(5|6|3xl), py-(10|12),
// space-y-(6|8) — рваный ритм. Все админские страницы теперь должны идти
// через <PageShell>/<PageHeader>, чтобы:
//   - одинаковый горизонтальный контейнер (max-w-6xl)
//   - один вертикальный padding (py-10)
//   - один ритм между секциями (space-y-8)
//   - один формат заголовка: kicker (надпись над H1) + display H1 + sub
//
// Вариант size="narrow" для форм create/edit — max-w-3xl (уже).
// Вариант size="wide" для full-list — max-w-7xl (если когда-то понадобится).

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
    <main className={`${SIZE[size]} mx-auto px-6 py-10 space-y-8 ${className}`}>
      {children}
    </main>
  );
}

export function PageBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900
                 -mt-2 transition-colors"
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
  /** Маленький бейдж/виджет справа от заголовка (StageBadge и т.п.) */
  meta?: ReactNode;
  /** CTA-кнопки справа на той же строке */
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div className="min-w-0 flex-1">
        {kicker && (
          <div className="text-[11px] text-ink-500 uppercase tracking-[0.12em] font-medium mb-2">
            {kicker}
          </div>
        )}
        <div className="flex items-start gap-4 flex-wrap">
          <h1 className="font-display text-[44px] md:text-[56px] leading-[0.95] tracking-tight text-ink-900">
            {title}
          </h1>
          {meta}
        </div>
        {sub && <div className="text-[14px] text-ink-500 mt-3">{sub}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// Тулбар-обёртка над контролами: фильтры, поиск, sort и т.д.
// Sticky под шапкой с back-blur, единый стиль.
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-16 z-20 -mx-6 px-6 py-3
                    bg-canvas/85 backdrop-blur-md border-y border-line">
      <div className="flex flex-col md:flex-row gap-2 items-stretch">
        {children}
      </div>
    </div>
  );
}
