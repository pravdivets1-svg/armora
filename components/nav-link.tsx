'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[15px] drop-shadow ${
        active
          ? 'text-white bg-white/15 font-medium'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
      {!!badge && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-violet-500 text-white text-[11px] font-semibold tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}
