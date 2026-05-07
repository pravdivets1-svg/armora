// TopBar — правая часть шапки (поиск, пользователь, push, logout).
// Гамбургер-кнопка живёт в AdminShell (клиентский).
// Этот компонент — серверный, принимает данные пропсами из layout.tsx.

import { Suspense } from 'react';
import { LogOut } from 'lucide-react';
import type { Role } from '@prisma/client';
import { ROLE_LABEL } from '@/lib/labels';
import { logoutAction } from '@/app/(auth)/actions';
import CommandPalette from './command-palette';
import PushToggle from './push-toggle';
import RoleAvatar from './role-avatar';

type HeaderUser = { id: string; email: string; name: string; role: Role } | undefined;

type HeaderProps = {
  user: HeaderUser;
};

export default function Header({ user }: HeaderProps) {
  return (
    <div className="flex items-center gap-1">
      {user && (
        <Suspense fallback={null}>
          <CommandPalette role={user.role} />
        </Suspense>
      )}
      {user && (
        <div className="hidden md:flex items-center gap-2 text-[13px] px-2">
          <RoleAvatar role={user.role} name={user.name} />
          <div className="flex flex-col leading-tight">
            <span className="text-ink-900 font-medium truncate max-w-[140px]">{user.name}</span>
            <span className="text-ink-500 text-[11px]">{ROLE_LABEL[user.role].toLowerCase()}</span>
          </div>
        </div>
      )}
      <PushToggle />
      <form action={logoutAction}>
        <button
          type="submit"
          aria-label="Выйти"
          title="Выйти"
          className="text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.05]
                     w-9 h-9 inline-flex items-center justify-center rounded-md transition-colors"
        >
          <LogOut size={15} />
        </button>
      </form>
    </div>
  );
}
