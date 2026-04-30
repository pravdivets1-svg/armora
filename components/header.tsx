// Шапка: floating-pill стиль — навигация в центре, действия справа.

import Link from 'next/link';
import { Suspense } from 'react';
import { LogOut } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_LABEL } from '@/lib/labels';
import { logoutAction } from '@/app/(auth)/actions';
import NavLink from './nav-link';
import GlobalSearch from './global-search';
import PushToggle from './push-toggle';

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  // Счётчик «На закрытие» — только для директора
  const pendingClosures =
    user?.role === 'director'
      ? await prisma.order.count({ where: { stage: 'pending_closure' } })
      : 0;

  return (
    <header className="border-b border-white/15 bg-black/30 backdrop-blur-xl sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/orders" className="font-semibold tracking-tight text-white text-[16px] drop-shadow">
            Armora
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/orders"   label="Заказы" />
            <NavLink href="/calendar" label="Расписание" />
            {user?.role === 'director' && (
              <NavLink href="/closures" label="На закрытие" badge={pendingClosures} />
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* useSearchParams внутри клиентского GlobalSearch требует Suspense-границы,
              иначе Next ругается на CSR-bailout всей страницы. */}
          <Suspense fallback={null}>
            <GlobalSearch />
          </Suspense>
          {user && (
            <div className="hidden sm:flex items-center gap-2.5 text-[14px]">
              <div className="w-8 h-8 rounded-full bg-white text-ink-900 flex items-center justify-center text-[12px] font-semibold">
                {user.name?.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span className="text-white font-medium drop-shadow">{user.name}</span>
              <span className="text-white/50">·</span>
              <span className="text-white/80">{ROLE_LABEL[user.role].toLowerCase()}</span>
            </div>
          )}
          <PushToggle />
          <form action={logoutAction}>
            <button
              type="submit"
              title="Выйти"
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-md"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
