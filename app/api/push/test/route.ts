// POST /api/push/test — отправить тестовое пуш-уведомление текущему юзеру.
// Удобно для проверки после включения. Без параметров.

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendPushToUser } from '@/lib/push';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  await sendPushToUser(session.user.id, {
    title: 'Armora',
    body: 'Уведомления подключены — проверка прошла успешно',
    url: '/orders',
    tag: 'test',
  });

  return NextResponse.json({ ok: true });
}
