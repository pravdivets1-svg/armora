// POST /api/push/unsubscribe — удалить подписку по endpoint.
// Вызывается когда юзер сам отключил уведомления в браузере или нажал «Отключить» в шапке.

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  endpoint: z.string().url().min(20).max(2000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  // Удаляем только если подписка принадлежит этому юзеру
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
