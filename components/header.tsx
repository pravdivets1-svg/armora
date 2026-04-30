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
import GlobalSearch from './global-search';
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

  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-md border-b border-line">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8 min-w-0">
          <Link
            href="/orders"
            className="font-semibold tracking-tight text-ink-900 text-[17px]
                       inline-flex items-center gap-2"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md
                             bg-ink-900 text-white text-[13px] font-bold leading-none">
              A
            </span>
            Armora
          </Link>
          <NavBar
            items={[
              { href: '/orders',   label: 'Заказы' },
              { href: '/calendar', label: 'Расписание' },
              ...(user?.role === 'director'
                ? [{ href: '/closures', label: 'На закрытие', badge: pendingClosures }]
                : []),
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* useSearchParams внутри клиентского GlobalSearch требует Suspense-границы. */}
          <Suspense fallback={null}>
            <GlobalSearch />
          </Suspense>
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
              className="text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.06] p-2 rounded-md"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
