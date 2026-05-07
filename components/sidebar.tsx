'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutList, Calendar, Inbox, CheckSquare, Users, X } from 'lucide-react';
import type { Role } from '@prisma/client';

type SidebarProps = {
  role: Role;
  pendingClosures: number;
  newLeads: number;
  mobileOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { href: '/orders',   label: 'Заказы',       icon: LayoutList },
  { href: '/calendar', label: 'Расписание',   icon: Calendar },
  { href: '/leads',    label: 'Заявки',       icon: Inbox,       roles: ['director', 'manager'] },
  { href: '/closures', label: 'На закрытие',  icon: CheckSquare, roles: ['director'] },
  { href: '/users',    label: 'Сотрудники',   icon: Users,       roles: ['director'] },
];

function SidebarContent({
  role,
  pendingClosures,
  newLeads,
  onClose,
}: Omit<SidebarProps, 'mobileOpen'>) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  }).map((item) => ({
    ...item,
    badge:
      item.href === '/leads'
        ? newLeads
        : item.href === '/closures'
        ? pendingClosures
        : 0,
  }));

  return (
    <div className="flex flex-col h-full bg-sidebar-bg text-sidebar-text select-none">
      {/* Лого */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.08] shrink-0">
        <Link
          href="/orders"
          onClick={onClose}
          className="flex items-center gap-2.5 text-white font-semibold text-[15px] tracking-tight"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md
                           bg-accent text-white text-[13px] font-bold leading-none shrink-0">
            A
          </span>
          Armora
        </Link>
        {/* Кнопка закрытия — только мобильно */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть меню"
          className="lg:hidden text-sidebar-text hover:text-white w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13.5px] font-medium transition-colors
                ${active
                  ? 'bg-sidebar-active text-sidebar-textAct'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                                  rounded-full text-white text-[10px] font-semibold tabular-nums leading-none
                                  ${active ? 'bg-white/25' : 'bg-accent'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { mobileOpen, onClose } = props;

  return (
    <>
      {/* Десктоп сайдбар — фиксированный */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-sidebar z-40">
        <SidebarContent {...props} />
      </aside>

      {/* Мобильный overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Мобильный drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-[240px] z-50 transform transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent {...props} />
      </aside>
    </>
  );
}
