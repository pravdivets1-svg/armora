'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  Factory,
  BarChart3,
  Users,
  Settings,
  ChevronsLeft,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

interface SidebarProps {
  user?: { fullName: string; role: string } | null;
}

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

const PRIMARY: Item[] = [
  { href: '/dashboard',  label: 'Дашборд',     icon: LayoutDashboard, comingSoon: true },
  { href: '/orders',     label: 'Заказы',      icon: Inbox },
  { href: '/calendar',   label: 'Календарь',   icon: CalendarDays },
  { href: '/production', label: 'Производство', icon: Factory,         comingSoon: true },
  { href: '/reports',    label: 'Отчёты',      icon: BarChart3,       comingSoon: true },
];

const SECONDARY: Item[] = [
  { href: '/team',     label: 'Команда',     icon: Users,    comingSoon: true },
  { href: '/settings', label: 'Настройки',   icon: Settings, comingSoon: true },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0 sticky top-0 h-screen border-r border-border bg-surface flex flex-col"
    >
      {/* Brand */}
      <div className="h-14 flex items-center px-3 border-b border-border">
        <Link href="/orders" className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 shrink-0 rounded-md bg-accent-gradient flex items-center justify-center text-white font-mono text-[13px] font-semibold">
            A
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="font-semibold tracking-tight text-[15px] text-fg truncate"
              >
                Armora
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="px-2.5 pt-3">
        <button
          type="button"
          className={cn(
            'group w-full inline-flex items-center gap-2.5 h-9 rounded-md px-2.5',
            'border border-border bg-base hover:bg-fg/5 hover:border-borderHover',
            'text-muted text-[13px]',
            'transition-colors duration-150 ease-smooth',
          )}
        >
          <Search size={14} strokeWidth={1.75} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Поиск</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 h-5 rounded text-[10px] font-mono border border-border bg-surface text-subtle">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 pt-3 pb-3 space-y-6">
        <NavGroup title={collapsed ? '' : 'Работа'} items={PRIMARY} pathname={pathname} collapsed={collapsed} />
        <NavGroup title={collapsed ? '' : 'Прочее'}  items={SECONDARY} pathname={pathname} collapsed={collapsed} />
      </nav>

      {/* User + collapse */}
      <div className="p-2.5 border-t border-border">
        {user && !collapsed && (
          <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-fg/5 cursor-default">
            <div className="w-7 h-7 shrink-0 rounded-full bg-accent-gradient text-white text-[11px] font-semibold flex items-center justify-center">
              {user.fullName.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-fg truncate">{user.fullName}</div>
              <div className="text-[11px] text-muted truncate">{user.role}</div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'mt-1 w-full inline-flex items-center justify-center gap-2 h-8 rounded-md',
            'text-muted hover:text-fg hover:bg-fg/5 text-[12px]',
            'transition-colors duration-150',
          )}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          <ChevronsLeft size={14} className={cn('transition-transform duration-200', collapsed && 'rotate-180')} />
          {!collapsed && <span>Свернуть</span>}
        </button>
      </div>
    </motion.aside>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  collapsed,
}: {
  title?: string;
  items: Item[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div>
      {title && (
        <div className="px-2 mb-1.5 text-[10px] uppercase tracking-wider text-subtle font-medium">
          {title}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon: Icon, comingSoon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <li key={href}>
              {comingSoon ? (
                <div
                  className={cn(
                    'group flex items-center gap-2.5 h-8 px-2 rounded-md',
                    'text-subtle cursor-not-allowed',
                  )}
                  title={`${label} — скоро`}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[13px]">{label}</span>
                      <span className="text-[10px] uppercase tracking-wider opacity-60">Скоро</span>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href={href}
                  className={cn(
                    'group flex items-center gap-2.5 h-8 px-2 rounded-md text-[13px]',
                    'transition-colors duration-150 ease-smooth',
                    active
                      ? 'bg-accent/12 text-accent-fg'
                      : 'text-muted hover:bg-fg/5 hover:text-fg',
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {!collapsed && <span>{label}</span>}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
