'use client';

// Навигация шапки с анимированной "таблеткой" активного пункта.
// motion.div с layoutId="nav-pill" — Framer Motion плавно переезжает
// между активными ссылками при смене роута.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';

type NavItem = { href: string; label: string; badge?: number };

export default function NavBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <LayoutGroup id="nav">
      <nav className="flex items-center gap-1 relative">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[14px] z-10
                          ${active ? 'text-ink-900 font-semibold' : 'text-ink-500 hover:text-ink-900 font-medium'}`}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-ink-900/[0.06] -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="relative inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5
                                 rounded-full bg-accent text-white text-[11px] font-semibold tabular-nums leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
