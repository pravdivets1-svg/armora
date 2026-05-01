// Шапка: light editorial.
// Раньше была тёмная glass-плёнка (bg-black/30) поверх фотофона. Сейчас фон
// в (admin) светлый, поэтому шапка — тоже светлая, sticky с лёгким back-blur,
// и тонкой нижней линией. Никаких drop-shadow на тексте.

import Link from 'next/link';
import { Suspense } from 'react';
import { LogOut } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_LABEL } from '@/lib/labels';
import { logoutAction } from '@/app/(auth)/actions';
import NavBar from './nav-bar';
import CommandPalette from './command-palette';
import PushToggle from './push-toggle';
import RoleAvatar from './role-avatar';

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  // Счётчик «На закрытие» — только для директора
  const pendingClosures =
    user?.role === 'director'
      ? await prisma.order.count({ where: { stage: 'pending_closure' } })
      : 0;

  // Счётчик новых заявок с сайта — для директора и менеджера
  const newLeads =
    user?.role === 'director' || user?.role === 'manager'
      ? await prisma.lead.count({ where: { stage: 'new' } })
      : 0;

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-line/80">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8 min-w-0">
          <Link
            href="/orders"
            className="font-display tracking-tight text-ink-900 text-[20px]
                       inline-flex items-center gap-2.5"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md
                             bg-ink-900 text-white text-[13px] font-sans font-bold leading-none">
              A
            </span>
            <span className="font-medium">Armora</span>
          </Link>
          <NavBar
            items={[
              { href: '/orders',   label: 'Заказы' },
              { href: '/calendar', label: 'Расписание' },
              ...(user?.role === 'director' || user?.role === 'manager'
                ? [{ href: '/leads', label: 'Заявки', badge: newLeads }]
                : []),
              ...(user?.role === 'director'
                ? [
                    { href: '/closures', label: 'На закрытие', badge: pendingClosures },
                    { href: '/users',    label: 'Сотрудники' },
                  ]
                : []),
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Suspense fallback={null}>
              <CommandPalette role={user.role} />
            </Suspense>
          )}
          {user && (
            <div className="hidden sm:flex items-center gap-2.5 text-[14px] pl-2">
              <RoleAvatar role={user.role} name={user.name} />
              <div className="flex flex-col leading-tight">
                <span className="text-ink-900 font-medium">{user.name}</span>
                <span className="text-ink-500 text-[12px]">{ROLE_LABEL[user.role].toLowerCase()}</span>
              </div>
            </div>
          )}
          <PushToggle />
          <form action={logoutAction}>
            <button
              type="submit"
              title="Выйти"
              className="text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.06] p-2 rounded-md transition-colors"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
