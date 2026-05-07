// Список сотрудников. Только для директора.

import Link from 'next/link';
import { Plus, UserCog, Users as UsersIcon } from 'lucide-react';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ROLE_LABEL } from '@/lib/labels';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/empty-state';
import RoleAvatar from '@/components/role-avatar';
import { PageHeader } from '@/components/page-shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Сотрудники — Armora' };

function loginOf(email: string): string {
  // email = login@armora.local — отрезаем суффикс для отображения
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

export default async function UsersPage() {
  const me = await requireRole(['director']);

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    select: { id: true, email: true, fullName: true, phone: true, role: true, createdAt: true },
  });

  return (
    <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
      <PageHeader
        title="Сотрудники"
        sub={`${users.length} ${users.length === 1 ? 'учётная запись' : users.length < 5 ? 'учётные записи' : 'учётных записей'}`}
        actions={
          <Link href="/users/new">
            <Button variant="primary">
              <Plus size={14} /> Новый сотрудник
            </Button>
          </Link>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Нет сотрудников"
          description="Создайте первую учётную запись"
        />
      ) : (
        <div className="bg-white border border-line rounded-lg overflow-hidden">
          <table className="w-full text-[14px]">
            <thead className="bg-canvas/50 text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="text-left font-medium px-5 py-3">Сотрудник</th>
                <th className="text-left font-medium px-5 py-3">Логин</th>
                <th className="text-left font-medium px-5 py-3">Роль</th>
                <th className="text-left font-medium px-5 py-3">Телефон</th>
                <th className="text-right font-medium px-5 py-3 w-0"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me.id;
                return (
                  <tr key={u.id} className="border-t border-line/70 hover:bg-canvas/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <RoleAvatar role={u.role} name={u.fullName} size="sm" />
                        <div>
                          <div className="font-medium text-ink-900">
                            {u.fullName}
                            {isSelf && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-500 font-normal">
                                это вы
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-[13px] text-ink-700">{loginOf(u.email)}</td>
                    <td className="px-5 py-3 text-ink-700">{ROLE_LABEL[u.role]}</td>
                    <td className="px-5 py-3 text-ink-700">{u.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/users/${u.id}`}
                        className="inline-flex items-center gap-1 text-ink-700 hover:text-ink-900 text-[13px] font-medium"
                      >
                        <UserCog size={13} /> Изменить
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
