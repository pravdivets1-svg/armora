'use server';

// Server Actions для управления сотрудниками. Только директор.
// Логика логина: пользователь вводит 6 символов (a-z0-9), сервер
// добавляет суффикс @armora.local перед записью в email.
// Пароль: ровно 5 символов; bcrypt-хеш в БД.

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { normalizePhone } from '@/lib/format';

const ROLES = ['director', 'manager', 'surveyor', 'installer'] as const;

const LOGIN_REGEX = /^[a-z0-9]{6}$/;
const PASSWORD_REGEX = /^.{5}$/;

const baseSchema = z.object({
  login:    z.string().trim().toLowerCase()
              .regex(LOGIN_REGEX, 'Логин: ровно 6 символов (a-z, 0-9)'),
  fullName: z.string().trim().min(2, 'Введите ФИО'),
  phone:    z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  role:     z.enum(ROLES, { errorMap: () => ({ message: 'Выберите роль' }) }),
});

const createSchema = baseSchema.extend({
  password: z.string().regex(PASSWORD_REGEX, 'Пароль: ровно 5 символов'),
});

const updateSchema = baseSchema.extend({
  // Пустой пароль = не менять. Если задан — ровно 5 символов.
  password: z.string().regex(PASSWORD_REGEX, 'Пароль: ровно 5 символов')
              .optional().or(z.literal('').transform(() => undefined)),
});

export type UserActionState =
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | { ok: true }
  | undefined;

function parseFD<S extends z.ZodTypeAny>(schema: S, fd: FormData) {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') obj[k] = v;
  return schema.safeParse(obj);
}

function fieldErrorsFrom(err: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) fieldErrors[issue.path.join('.')] = issue.message;
  return fieldErrors;
}

async function requireDirector() {
  const me = await requireUser();
  if (me.role !== 'director') {
    return { me: null, error: 'Доступ только у директора' as const };
  }
  return { me, error: null };
}

// =====================================================================
// CREATE
// =====================================================================

export async function createUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const auth = await requireDirector();
  if (auth.error) return { ok: false, error: auth.error };

  const parsed = parseFD(createSchema, formData);
  if (!parsed.success) {
    return { ok: false, error: 'Проверьте поля формы', fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;
  const email = `${d.login}@armora.local`;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { ok: false, error: 'Логин уже занят', fieldErrors: { login: 'Этот логин уже используется' } };
  }

  const passwordHash = await bcrypt.hash(d.password, 10);
  const created = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      fullName: d.fullName,
      phone:    d.phone ? normalizePhone(d.phone) : null,
      role:     d.role as Role,
    },
  });

  revalidatePath('/users');
  redirect(`/users/${created.id}?toast=${encodeURIComponent('Сотрудник создан')}&type=ok`);
}

// =====================================================================
// UPDATE
// =====================================================================

export async function updateUserAction(
  userId: string,
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const auth = await requireDirector();
  if (auth.error) return { ok: false, error: auth.error };

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { ok: false, error: 'Сотрудник не найден' };

  const parsed = parseFD(updateSchema, formData);
  if (!parsed.success) {
    return { ok: false, error: 'Проверьте поля формы', fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;
  const newEmail = `${d.login}@armora.local`;

  // Проверка занятости логина (если меняется)
  if (newEmail !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email: newEmail } });
    if (conflict) {
      return { ok: false, error: 'Логин уже занят', fieldErrors: { login: 'Этот логин уже используется' } };
    }
  }

  // Защита: директор не может понизить себе роль (иначе потеряет доступ).
  if (existing.id === auth.me!.id && d.role !== 'director') {
    return {
      ok: false,
      error: 'Нельзя сменить себе роль с директора',
      fieldErrors: { role: 'Запрещено для самого себя' },
    };
  }

  const updateData: any = {
    email:    newEmail,
    fullName: d.fullName,
    phone:    d.phone ? normalizePhone(d.phone) : null,
    role:     d.role as Role,
  };
  if (d.password) {
    updateData.password = await bcrypt.hash(d.password, 10);
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  return { ok: true };
}

// =====================================================================
// DELETE
// =====================================================================

export async function deleteUserAction(userId: string) {
  const auth = await requireDirector();
  if (auth.error) throw new Error(auth.error);

  if (auth.me!.id === userId) {
    redirect(`/users/${userId}?toast=${encodeURIComponent('Нельзя удалить самого себя')}&type=error`);
  }

  // Проверяем связи — нельзя удалить, если на пользователе висят заказы.
  // FK по умолчанию NoAction → Prisma всё равно бросит, но сообщение будет невнятным.
  const [asSurveyor, asInstaller, asCreator] = await Promise.all([
    prisma.order.count({ where: { surveyorId:  userId } }),
    prisma.order.count({ where: { installerId: userId } }),
    prisma.order.count({ where: { createdById: userId } }),
  ]);

  if (asCreator > 0) {
    redirect(`/users/${userId}?toast=${encodeURIComponent(
      `Нельзя удалить: создал ${asCreator} ${asCreator === 1 ? 'заказ' : 'заказов'}. Удаление навредит истории.`,
    )}&type=error`);
  }
  if (asSurveyor + asInstaller > 0) {
    redirect(`/users/${userId}?toast=${encodeURIComponent(
      `Нельзя удалить: назначен на ${asSurveyor + asInstaller} заказ(ов). Сначала переназначьте.`,
    )}&type=error`);
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath('/users');
  redirect(`/users?toast=${encodeURIComponent('Сотрудник удалён')}&type=ok`);
}
