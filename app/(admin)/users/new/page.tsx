// Создание нового сотрудника. Только директор.

import { requireRole } from '@/lib/auth-helpers';
import UserForm from '../user-form';
import { createUserAction } from '../actions';
import { PageHeader } from '@/components/uikit';

export const metadata = { title: 'Новый сотрудник — Armora' };

export default async function NewUserPage() {
  await requireRole(['director']);

  return (
    <>
      <PageHeader title="Новый сотрудник" sub="Создание учётной записи" backHref="/users" />
      <main className="max-w-2xl mx-auto px-4 lg:px-6 py-4 pb-12">
        <UserForm action={createUserAction} mode="create" />
      </main>
    </>
  );
}
