'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from './button';
import { useIsDesktop } from './use-media-query';

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
  const isDesktop = useIsDesktop();
  const iconSize: 36 | 44 = isDesktop ? 36 : 44;

  return (
    <header
      className="sticky top-0 z-30 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70
                 border-b border-borderc"
      style={{ height: isDesktop ? 64 : 56 }}
    >
      <div className="flex items-center gap-2 h-full px-3 sm:px-4">
        {backHref && (
          <Link href={backHref} aria-label="Назад" className="-ml-1">
            <IconButton size={iconSize} aria-label="Назад">
              <ArrowLeft size={18} />
            </IconButton>
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
