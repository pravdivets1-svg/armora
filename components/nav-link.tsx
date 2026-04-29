'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-[14px] ${
        active
          ? 'text-ink-900 bg-ink-900/[0.06] font-medium'
          : 'text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.04]'
      }`}
    >
      {label}
    </Link>
  );
}
