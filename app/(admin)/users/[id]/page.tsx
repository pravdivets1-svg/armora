// Редактирование сотрудника. Только директор.

import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import UserForm from '../user-form';
import { updateUserAction } from '../actions';
import { ROLE_LABEL } from '@/lib/labels';
import { PageHeader, SectionCard } from '@/components/uikit';
import { fmtDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Сотрудник — Armora' };

function loginOf(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const me = await requireRole(['director']);
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) notFound();

  const isSelf = user.id === me.id;
  const login = loginOf(user.email);

  // Аудит входов: последние 15 попыток по этому логину (lowercase для совместимости).
  // login_attempts.login нормализован к lowercase при записи.
  const loginAttempts = await prisma.loginAttempt.findMany({
    where: { login: login.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  return (
    <>
      <PageHeader title={user.fullName} sub={ROLE_LABEL[user.role]} backHref="/users" />
      <main className="max-w-2xl mx-auto px-4 lg:px-6 py-4 pb-12 space-y-2.5">
        <UserForm
          mode="edit"
          action={updateUserAction.bind(null, user.id)}
          user={{
            id:        user.id,
            login,
            fullName:  user.fullName,
            phone:     user.phone,
            maxUserId: user.maxUserId,
            role:      user.role,
            isSelf,
          }}
        />

        <SectionCard title="История входов">
          {loginAttempts.length === 0 ? (
            <p className="text-meta text-text3">Попыток входа ещё не было</p>
          ) : (
            <ul className="divide-y divide-borderc/60 -mx-1">
              {loginAttempts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-1 py-2 min-h-[44px]">
                  {a.ok ? (
                    <CheckCircle2 size={14} className="text-ok2 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-bad2 shrink-0" />
                  )}
                  <span className="text-[13px] text-text1 flex-1 min-w-0">
                    {a.ok ? 'Успех' : (a.reason === 'bad_credentials' ? 'Неверный логин или пароль'
                                     : a.reason === 'inactive'         ? 'Аккаунт отключён'
                                     : a.reason === 'blocked'          ? 'Заблокирован (брутфорс)'
                                     : 'Ошибка входа')}
                  </span>
                  {a.ip && (
                    <span className="text-meta text-text3 tabular-nums shrink-0 hidden sm:inline">
                      {a.ip}
                    </span>
                  )}
                  <span className="text-meta text-text3 tabular-nums shrink-0">
                    {fmtDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </main>
    </>
  );
}
