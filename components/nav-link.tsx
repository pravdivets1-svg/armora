'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-[15px] drop-shadow ${
        active
          ? 'text-white bg-white/15 font-medium'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </Link>
  );
}
