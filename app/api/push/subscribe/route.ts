// POST /api/push/subscribe — сохранить подписку на пуши для текущего пользователя.
// Вход: { endpoint, keys: { p256dh, auth } } — то, что вернул pushManager.subscribe().
// Если уже есть запись с этим endpoint — обновим (другой user после повторного логина).

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const subSchema = z.object({
  endpoint: z.string().url().min(20).max(2000),
  keys: z.object({
    p256dh: z.string().min(20).max(500),
    auth:   z.string().min(8).max(200),
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = subSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid subscription' }, { status: 400 });
  }
  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get('user-agent');

  // Upsert по уникальному endpoint
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId:    session.user.id,
      endpoint,
      p256dh:    keys.p256dh,
      auth:      keys.auth,
      userAgent: userAgent ?? null,
    },
    update: {
      userId:    session.user.id,
      p256dh:    keys.p256dh,
      auth:      keys.auth,
      userAgent: userAgent ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
