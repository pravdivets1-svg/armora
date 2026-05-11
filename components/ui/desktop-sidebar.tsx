'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import { LayoutList, Calendar, Inbox, CheckSquare, Users, LogOut } from 'lucide-react';
import { ROLE_LABEL } from '@/lib/labels';
import { logoutAction } from '@/app/(auth)/actions';
import { IconButton } from './button';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: Role[];
};

export function DesktopSidebar({
  role,
  user,
  pendingClosures,
  newLeads,
}: {
  role: Role;
  user: { name: string; email: string };
  pendingClosures: number;
  newLeads: number;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/orders',   label: 'Заказы',     icon: LayoutList },
    { href: '/calendar', label: 'Расписание', icon: Calendar },
    { href: '/leads',    label: 'Заявки',     icon: Inbox,       badge: newLeads,        roles: ['director', 'manager'] },
    { href: '/closures', label: 'На закрытие', icon: CheckSquare, badge: pendingClosures, roles: ['director'] },
    { href: '/users',    label: 'Сотрудники', icon: Users,       roles: ['director'] },
  ].filter((it) => !it.roles || it.roles.includes(role));

  return (
    <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-sidebar
                       bg-card border-r border-borderc z-30">
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-borderc shrink-0">
        <Image src="/icon.svg" alt="Armora" width={28} height={28} priority />
        <span className="text-h2 text-text1 tracking-tight">Armora</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 h-10 px-3 rounded-md text-[13.5px] font-medium
                          transition-colors duration-fast
                          ${active
                            ? 'bg-accent-soft text-accent'
                            : 'text-text2 hover:bg-subtle hover:text-text1'}`}
            >
              <Icon size={18} strokeWidth={1.6} className="shrink-0" />
              <span className="flex-1 truncate">{it.label}</span>
              {!!it.badge && it.badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                                 rounded-md text-[11px] tabular-nums font-semibold leading-none
                                 bg-accent text-card">
                  {it.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-borderc p-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 rounded-md bg-subtle text-text2 flex items-center justify-center text-[13px] font-semibold uppercase">
            {user.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-text1 font-medium truncate">{user.name}</p>
            <p className="text-meta text-text3 truncate">{ROLE_LABEL[role]}</p>
          </div>
          <form action={logoutAction}>
            <IconButton size={36} type="submit" aria-label="Выйти">
              <LogOut size={16} />
            </IconButton>
          </form>
        </div>
      </div>
    </aside>
  );
}
