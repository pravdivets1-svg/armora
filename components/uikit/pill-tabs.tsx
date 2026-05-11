'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export type PillTabItem = {
  key: string;
  label: string;
  count?: number;
};

export function PillTabs({
  items,
  paramName,
  preserve = [],
}: {
  items: PillTabItem[];
  paramName: string;
  preserve?: string[];
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(paramName) ?? '';

  const buildHref = (key: string) => {
    const params = new URLSearchParams();
    if (key) params.set(paramName, key);
    for (const p of preserve) {
      const v = sp.get(p);
      if (v) params.set(p, v);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div
      className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1"
      style={{
        // Намёк на горизонтальный скролл — fade справа
        maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)',
      }}
    >
      {items.map((it) => {
        const active = current === it.key;
        return (
          <Link
            key={it.key}
            href={buildHref(it.key)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-medium
                        transition-colors duration-fast ease-soft
                        ${active
                          ? 'bg-text1 text-card'
                          : 'bg-card border border-borderc text-text2 hover:text-text1'}`}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-[18px] px-1
                                rounded-md text-[11px] tabular-nums leading-none
                                ${active ? 'bg-card/20 text-card' : 'bg-subtle text-text3'}`}>
                {it.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
