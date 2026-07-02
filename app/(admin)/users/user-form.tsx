'use client';

// Форма сотрудника — общая для create/edit.
// Валидация (зеркальная серверной):
//   логин   — ровно 6 символов, [a-z0-9]
//   пароль  — ровно 5 символов; в edit-режиме можно оставить пустым = не менять
//   ФИО     — минимум 2 символа
//   телефон — необязательно
//   роль    — director | manager | surveyor | installer

import { useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Save, AlertCircle, Wand2, Copy, Check } from 'lucide-react';
import type { Role } from '@prisma/client';
import { Input, Select, FieldLabel } from '@/components/ui';
import { SectionCard, Button } from '@/components/uikit';
import UndoDeleteButton from '@/components/undo-delete-button';
import { ROLE_LABEL } from '@/lib/labels';
import { deleteUserAction, type UserActionState } from './actions';

// Генератор 5-символьного пароля. Без визуально-похожих символов (0,O,1,l,I).
function randomPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = new Uint32Array(5);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(buf);
    for (let i = 0; i < 5; i++) s += alphabet[buf[i] % alphabet.length];
  } else {
    for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
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
              <PasswordInputWithGen mode={mode} />
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
                inputMode="numeric"
                pattern="[0-9]*"
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
                <>
                  {/* disabled-select не попадает в FormData; шлём текущую роль скрытым полем,
                      иначе серверная схема (role required) валит сохранение своего профиля.
                      Серверная защита от смены своей роли остаётся (actions.ts). */}
                  <input type="hidden" name="role" value={user.role} />
                  <div className="text-meta text-text3 mt-1">Свою роль изменить нельзя</div>
                </>
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

// Поле пароля + две кнопки: «Сгенерировать» и «Скопировать в буфер».
function PasswordInputWithGen({ mode }: { mode: 'create' | 'edit' }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [copied, setCopied] = useState(false);

  function gen() {
    const next = randomPassword();
    setValue(next);
    inputRef.current?.focus();
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard может быть недоступен */ }
  }

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        type="text"
        name="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === 'create' ? 'a1b2c' : '·····'}
        maxLength={5}
        minLength={5}
        required={mode === 'create'}
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="flex-1 font-mono tabular-nums"
      />
      <button
        type="button"
        onClick={gen}
        title="Сгенерировать пароль"
        className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md
                   border border-borderc bg-card hover:bg-subtle text-text2 hover:text-text1
                   transition-colors active:scale-[0.98]"
      >
        <Wand2 size={14} />
      </button>
      <button
        type="button"
        onClick={copy}
        disabled={!value}
        title={copied ? 'Скопировано' : 'Скопировать'}
        className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md
                   border border-borderc bg-card hover:bg-subtle text-text2 hover:text-text1
                   transition-colors active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {copied ? <Check size={14} className="text-ok2" /> : <Copy size={14} />}
      </button>
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
