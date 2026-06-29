// Хелперы для проверки ролей в server-компонентах и server-actions.
// Использование:
//   const me = await requireUser();
//   const me = await requireRole(['director', 'manager']);

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  // Сверяем роль/активность с БД на каждом защищённом запросе. JWT «вмораживает»
  // их на момент логина (cookie живёт днями), поэтому без этой сверки отключённый
  // или разжалованный сотрудник сохранял бы старый доступ до истечения cookie.
  // Это Node-контекст (server components / actions) — Prisma здесь доступна
  // (в отличие от middleware на edge, куда эту проверку класть нельзя).
  const fresh = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true, fullName: true },
  });
  if (!fresh || !fresh.isActive) redirect('/login');
  return { ...session.user, role: fresh.role, name: fresh.fullName };
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    // 403 в виде редиректа на список заказов — там пользователь точно имеет доступ
    redirect('/orders');
  }
  return user;
}

// Удобный хелпер: «может видеть/редактировать любые заказы» (директор и менеджер)
export function isStaff(role: Role) {
  return role === 'director' || role === 'manager';
}

// Замерщик/установщик видит только свои заказы
export function isFieldWorker(role: Role) {
  return role === 'surveyor' || role === 'installer';
}
