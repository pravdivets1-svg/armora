// Редактирование сотрудника. Только директор.

import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import UserForm from '../user-form';
import { updateUserAction } from '../actions';
import { ROLE_LABEL } from '@/lib/labels';
import { PageHeader } from '@/components/uikit';

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
    <>
      <PageHeader title={user.fullName} sub={ROLE_LABEL[user.role]} backHref="/users" />
      <main className="max-w-2xl mx-auto px-4 lg:px-6 py-4 pb-12">
        <UserForm
          mode="edit"
          action={updateUserAction.bind(null, user.id)}
          user={{
            id:        user.id,
            login:     loginOf(user.email),
            fullName:  user.fullName,
            phone:     user.phone,
            maxUserId: user.maxUserId,
            role:      user.role,
            isSelf,
          }}
        />
      </main>
    </>
  );
}
