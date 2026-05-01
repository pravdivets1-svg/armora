// Редактирование сотрудника. Только директор.

import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import UserForm from '../user-form';
import { updateUserAction } from '../actions';
import { ROLE_LABEL } from '@/lib/labels';

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

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <div>
        <div className="text-[11px] text-ink-500 uppercase tracking-wide">
          {ROLE_LABEL[user.role]}
        </div>
        <h1 className="font-display text-[48px] md:text-[56px] leading-[0.95] tracking-tight text-ink-900 mt-1">
          {user.fullName}
        </h1>
      </div>

      <UserForm
        mode="edit"
        action={updateUserAction.bind(null, user.id)}
        user={{
          id:       user.id,
          login:    loginOf(user.email),
          fullName: user.fullName,
          phone:    user.phone,
          role:     user.role,
          isSelf,
        }}
      />
    </main>
  );
}
