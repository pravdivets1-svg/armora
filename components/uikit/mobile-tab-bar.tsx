'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Role } from '@prisma/client';
import { LayoutList, Calendar, Inbox, CheckSquare, User } from 'lucide-react';

type TabItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: Role[];
};

export function MobileTabBar({
  role,
  pendingClosures,
  newLeads,
}: {
  role: Role;
  pendingClosures: number;
  newLeads: number;
}) {
  const pathname = usePathname();

  const all: TabItem[] = [
    { href: '/orders',   label: 'Заказы',    icon: LayoutList },
    { href: '/calendar', label: 'Календарь', icon: Calendar },
    { href: '/leads',    label: 'Заявки',    icon: Inbox,       badge: newLeads,        roles: ['director', 'manager'] as Role[] },
    { href: '/closures', label: 'Закрыть',   icon: CheckSquare, badge: pendingClosures, roles: ['director'] as Role[] },
    { href: '/settings', label: 'Профиль',   icon: User },
  ];
  const items = all.filter((it) => !it.roles || it.roles.includes(role));

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 glass-strip border-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Главная навигация"
    >
      <ul className="flex items-stretch h-16">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          const Icon = it.icon;
          return (
            <li key={it.href} className="flex-1 min-w-0">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center justify-center gap-1 h-full px-1
                            text-[11px] font-medium transition-colors duration-fast
                            active:bg-text1/[0.05] [-webkit-tap-highlight-color:transparent]
                            ${active ? 'text-accent' : 'text-text2 hover:text-text1 active:text-text1'}`}
              >
                {/* Пилюля-подложка активного таба: перелетает между вкладками
                    спрингом (layoutId). Читается большим пальцем мгновенно —
                    2px-штрих сверху сливался с border-t самого бара.
                    Центрирование маргином: transform занят layout-анимацией framer. */}
                {active && (
                  <motion.span
                    layoutId="tab-active-pill"
                    aria-hidden
                    className="absolute top-1.5 left-1/2 -ml-7 h-8 w-14 rounded-full bg-accent-soft"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">
                  <Icon size={22} strokeWidth={active ? 2.1 : 1.6} />
                  {!!it.badge && it.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1
                                     rounded-md bg-accent text-card text-[11px] font-semibold
                                     tabular-nums leading-[18px] text-center">
                      {it.badge > 99 ? '99+' : it.badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
