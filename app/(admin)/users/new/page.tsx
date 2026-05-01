// Создание нового сотрудника. Только директор.

import { requireRole } from '@/lib/auth-helpers';
import UserForm from '../user-form';
import { createUserAction } from '../actions';

export const metadata = { title: 'Новый сотрудник — Armora' };

export default async function NewUserPage() {
  await requireRole(['director']);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <div>
        <div className="text-[11px] text-ink-500 uppercase tracking-wide">Создать</div>
        <h1 className="font-display text-[48px] md:text-[56px] leading-[0.95] tracking-tight text-ink-900 mt-1">
          Новый сотрудник
        </h1>
      </div>

      <UserForm action={createUserAction} mode="create" />
    </main>
  );
}
