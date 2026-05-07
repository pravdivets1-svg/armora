// Создание нового сотрудника. Только директор.

import { requireRole } from '@/lib/auth-helpers';
import UserForm from '../user-form';
import { createUserAction } from '../actions';
import { PageHeader } from '@/components/page-shell';

export const metadata = { title: 'Новый сотрудник — Armora' };

export default async function NewUserPage() {
  await requireRole(['director']);

  return (
    <main className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      <PageHeader kicker="Создать" title="Новый сотрудник" />
      <UserForm action={createUserAction} mode="create" />
    </main>
  );
}
