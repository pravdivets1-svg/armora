// Список сотрудников. Только для директора.

import Link from 'next/link';
import { Plus, Users as UsersIcon, ChevronRight } from 'lucide-react';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ROLE_LABEL } from '@/lib/labels';
import { Empty, PageHeader, IconButton } from '@/components/uikit';
import RoleAvatar from '@/components/role-avatar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Сотрудники — Armora' };

function loginOf(email: string): string {
  // email = login@armora.local — отрезаем суффикс для отображения
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

function ruCount(n: number): string {
  if (n === 1) return 'учётная запись';
  if (n >= 2 && n <= 4) return 'учётные записи';
  return 'учётных записей';
}

export default async function UsersPage() {
  const me = await requireRole(['director']);

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Сотрудники"
        sub={`${users.length} ${ruCount(users.length)}`}
        actions={
          <Link href="/users/new" aria-label="Новый сотрудник">
            <IconButton size={40} variant="secondary" aria-label="Новый сотрудник">
              <Plus size={16} />
            </IconButton>
          </Link>
        }
      />

      <main className="max-w-4xl mx-auto px-4 lg:px-6 py-4 space-y-2.5 pb-12">
        {users.length === 0 ? (
          <Empty
            icon={UsersIcon}
            title="Нет сотрудников"
            hint="Создайте первую учётную запись"
            action={
              <Link
                href="/users/new"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md
                           bg-text1 text-white hover:bg-text1/90 text-[13px] font-medium"
              >
                <Plus size={14} /> Новый сотрудник
              </Link>
            }
          />
        ) : (
          <ul className="bg-card border border-borderc rounded-lg divide-y divide-borderc/60">
            {users.map((u) => {
              const isSelf = u.id === me.id;
              return (
                <li key={u.id}>
                  <Link
                    href={`/users/${u.id}`}
                    className="group flex items-center gap-3 px-4 lg:px-5 py-2.5
                               hover:bg-subtle/60 transition-colors"
                  >
                    <RoleAvatar role={u.role} name={u.fullName} size="sm" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-text1 truncate">{u.fullName}</span>
                        {isSelf && (
                          <span className="shrink-0 text-meta text-text3">это вы</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 text-meta text-text3 mt-0.5 min-w-0">
                        <span className="tabular-nums">{loginOf(u.email)}</span>
                        <span className="text-borders">·</span>
                        <span className="truncate">{ROLE_LABEL[u.role]}</span>
                        {u.phone && (
                          <>
                            <span className="text-borders">·</span>
                            <span className="tabular-nums truncate">
                              {u.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-meta text-text3"
                      title={u.isActive ? 'Активен' : 'Отключён'}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.isActive ? 'bg-ok2' : 'bg-text3'
                        }`}
                      />
                      <span className={u.isActive ? 'hidden sm:inline' : ''}>
                        {u.isActive ? 'Активен' : 'Отключён'}
                      </span>
                    </span>

                    <ChevronRight
                      size={14}
                      className="shrink-0 text-text3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
