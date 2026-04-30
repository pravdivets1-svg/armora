'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Ссылка верхней навигации в светлой шапке.
// active: чёрный текст + лёгкая accent-tint подложка.
// inactive: серый, на hover — затемнение фона.
export default function NavLink({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[14px] ${
        active
          ? 'text-ink-900 bg-ink-900/[0.06] font-semibold'
          : 'text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.04] font-medium'
      }`}
    >
      {label}
      {!!badge && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5
                         rounded-full bg-accent text-white text-[11px] font-semibold tabular-nums leading-none">
          {badge}
        </span>
      )}
    </Link>
  );
}
