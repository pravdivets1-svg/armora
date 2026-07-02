'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Высота и размер кнопки «Назад» — ЧИСТЫМ CSS (h-14 lg:h-16, w-11 lg:w-9):
// JS-детект давал прыжок 8px на мобильной гидрации.
// Нижняя граница и тень появляются только когда контент реально уезжает
// под шапку (iOS/Linear-паттерн): в покое шапка бесшовна со страницей.
// «Назад» — ссылка со стилями кнопки: <button> внутри <a> невалиден.
export function PageHeader({
  title,
  sub,
  backHref,
  actions,
}: {
  title: string;
  sub?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 glass-strip border-b h-14 lg:h-16
                  transition-[box-shadow,border-color] duration-base ease-soft
                  ${scrolled
                    ? 'border-borderc shadow-[0_8px_24px_-16px_rgba(30,27,75,.25)]'
                    : 'border-transparent'}`}
    >
      <div className="flex items-center gap-2 h-full px-3 sm:px-4">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Назад"
            className="-ml-1 inline-flex items-center justify-center shrink-0
                       w-11 h-11 lg:w-9 lg:h-9 rounded-md text-text2
                       hover:bg-subtle hover:text-text1 active:bg-subtle
                       transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 text-text1 truncate" title={title}>{title}</h1>
          {sub && <p className="text-meta text-text3 truncate -mt-0.5" title={sub}>{sub}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">{actions}</div>
      </div>
    </header>
  );
}
