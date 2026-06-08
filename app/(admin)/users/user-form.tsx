'use client';

// Форма сотрудника — общая для create/edit.
// Валидация (зеркальная серверной):
//   логин   — ровно 6 символов, [a-z0-9]
//   пароль  — ровно 5 символов; в edit-режиме можно оставить пустым = не менять
//   ФИО     — минимум 2 символа
//   телефон — необязательно
//   роль    — director | manager | surveyor | installer

import { useFormState, useFormStatus } from 'react-dom';
import { Save, AlertCircle } from 'lucide-react';
import type { Role } from '@prisma/client';
import { Input, Select, FieldLabel } from '@/components/ui';
import { SectionCard, Button } from '@/components/uikit';
import UndoDeleteButton from '@/components/undo-delete-button';
import { ROLE_LABEL } from '@/lib/labels';
import { deleteUserAction, type UserActionState } from './actions';

type UserData = {
  id: string;
  login: string;       // часть до @armora.local
  fullName: string;
  phone: string | null;
  maxUserId: string | null;
  role: Role;
  isSelf: boolean;
};

export default function UserForm({
  user,
  action,
  mode,
}: {
  user?: UserData;
  action: (state: UserActionState, fd: FormData) => Promise<UserActionState>;
  mode: 'create' | 'edit';
}) {
  const [state, formAction] = useFormState<UserActionState, FormData>(action, undefined);
  const fe = (k: string) =>
    state && !state.ok && state.fieldErrors ? state.fieldErrors[k] : undefined;

  return (
    <div className="space-y-2.5">
      {state && !state.ok && (
        <div
          className="bg-card border border-borderc rounded-lg px-4 py-3
                     flex items-start gap-2 text-[14px] text-bad2"
          role="alert"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <form action={formAction} className="space-y-2.5">
        <SectionCard title="Учётная запись">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Логин" hint="Ровно 6 символов: латиница и цифры" error={fe('login')}>
              <div className="relative">
                <Input
                  name="login"
                  defaultValue={user?.login ?? ''}
                  placeholder="vovkads"
                  maxLength={6}
                  minLength={6}
                  required
                  pattern="[a-z0-9]{6}"
                  autoComplete="off"
                  className="pr-32 font-mono tabular-nums"
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-meta text-text3 font-mono pointer-events-none"
                >
                  @armora.local
                </span>
              </div>
            </Field>

            <Field
              label={mode === 'create' ? 'Пароль' : 'Новый пароль'}
              hint={mode === 'create' ? 'Ровно 5 символов' : 'Оставьте пустым, чтобы не менять'}
              error={fe('password')}
            >
              <Input
                type="text"
                name="password"
                defaultValue=""
                placeholder={mode === 'create' ? 'a1b2c' : '·····'}
                maxLength={5}
                minLength={mode === 'create' ? 5 : 0}
                required={mode === 'create'}
                autoComplete="new-password"
                className="font-mono tabular-nums"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Личные данные">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="ФИО" error={fe('fullName')}>
              <Input
                name="fullName"
                defaultValue={user?.fullName ?? ''}
                placeholder="Владимир Сергеевич"
                required
                minLength={2}
              />
            </Field>

            <Field label="Телефон" hint="Необязательно" error={fe('phone')}>
              <Input
                type="tel"
                name="phone"
                defaultValue={user?.phone ?? ''}
                placeholder="+7 916 000-00-00"
                className="tabular-nums"
              />
            </Field>

            <Field
              label="MAX ID"
              hint="Числовой user_id в мессенджере MAX — для уведомлений"
              error={fe('maxUserId')}
            >
              <Input
                name="maxUserId"
                defaultValue={user?.maxUserId ?? ''}
                placeholder="123456789"
                className="font-mono tabular-nums"
              />
            </Field>

            <Field label="Роль" error={fe('role')}>
              <Select name="role" defaultValue={user?.role ?? 'manager'} required disabled={user?.isSelf}>
                {(['director', 'manager', 'surveyor', 'installer'] as Role[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </Select>
              {user?.isSelf && (
                <div className="text-meta text-text3 mt-1">Свою роль изменить нельзя</div>
              )}
            </Field>
          </div>
        </SectionCard>

        <div className="flex items-center justify-between gap-3 pt-1">
          {mode === 'edit' && user && !user.isSelf ? (
            <DeleteButton userId={user.id} />
          ) : <span />}
          <SubmitButton mode={mode} />
        </div>
      </form>
    </div>
  );
}

function Field({
  label, hint, error, children,
}: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1">{children}</div>
      {error ? (
        <div className="text-meta text-bad2 mt-1">{error}</div>
      ) : hint ? (
        <div className="text-meta text-text3 mt-1">{hint}</div>
      ) : null}
    </label>
  );
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={pending}
    >
      <Save size={14} />
      {pending ? 'Сохранение…' : mode === 'create' ? 'Создать сотрудника' : 'Сохранить'}
    </Button>
  );
}

function DeleteButton({ userId }: { userId: string }) {
  return (
    <UndoDeleteButton
      action={async () => { await deleteUserAction(userId); }}
      label="Удалить сотрудника"
      successMessage="Сотрудник будет удалён"
    />
  );
}
