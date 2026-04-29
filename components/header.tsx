// Шапка: floating-pill стиль — навигация в центре, действия справа.

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { auth } from '@/auth';
import { ROLE_LABEL } from '@/lib/labels';
import { logoutAction } from '@/app/(auth)/actions';
import NavLink from './nav-link';

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="border-b border-line bg-white/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/orders" className="font-semibold tracking-tight text-ink-900 text-[15px]">
            Armora
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/orders"   label="Заказы" />
            <NavLink href="/calendar" label="Календарь" />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2.5 text-[13px]">
              <div className="w-7 h-7 rounded-full bg-ink-900 text-white flex items-center justify-center text-[11px] font-semibold">
                {user.name?.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span className="text-ink-700">{user.name}</span>
              <span className="text-ink-400">·</span>
              <span className="text-ink-500">{ROLE_LABEL[user.role].toLowerCase()}</span>
            </div>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              title="Выйти"
              className="text-ink-500 hover:text-ink-900 hover:bg-ink-900/5 p-2 rounded-md"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
