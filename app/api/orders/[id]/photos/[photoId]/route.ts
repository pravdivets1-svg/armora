// GET    /api/orders/[id]/photos/[photoId] — отдать бинарь фото.
// DELETE /api/orders/[id]/photos/[photoId] — удалить (автор или staff).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiUser, isStaff } from '@/lib/auth-helpers';
import { canViewOrder } from '@/lib/orders';

export const runtime = 'nodejs';

// Те же правила доступа, что у страницы заказа и POST/GET списка фото —
// см. canViewOrder (staff, назначенцы, автор заказа, установщик на production+).
// apiUser: протухшая сессия → 401 JSON, а не 307 на HTML-логин.
async function checkAccess(orderId: string) {
  const me = await apiUser();
  if (!me) return { error: 'unauthorized' as const };
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, surveyorId: true, installerId: true, createdById: true, stage: true },
  });
  if (!order) return { error: 'not_found' as const };
  if (!canViewOrder(me, order)) return { error: 'forbidden' as const };
  return { me, order };
}

function accessError(error?: 'unauthorized' | 'not_found' | 'forbidden') {
  const status = error === 'unauthorized' ? 401 : error === 'not_found' ? 404 : 403;
  return NextResponse.json({ error: error ?? 'forbidden' }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string; photoId: string } },
) {
  const acc = await checkAccess(params.id);
  if ('error' in acc) return accessError(acc.error);
  const photo = await prisma.orderPhoto.findFirst({
    where: { id: params.photoId, orderId: params.id },
    select: { mime: true, data: true, size: true },
  });
  if (!photo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const buf = photo.data as unknown as Buffer;
  // Отдаём байты без промежуточных копий (ArrayBuffer+Blob удваивали пик памяти
  // на каждый запрос — заказ с 20 фото давал всплеск в десятки МБ).
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type':   photo.mime,
      'Content-Length': String(photo.size),
      // MIME задан при загрузке клиентом — запрещаем браузеру «переугадывать» тип.
      'X-Content-Type-Options': 'nosniff',
      // Только staff/назначенцы прошли checkAccess. Кэш приватный.
      'Cache-Control':  'private, max-age=86400, immutable',
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; photoId: string } },
) {
  const acc = await checkAccess(params.id);
  if ('error' in acc) return accessError(acc.error);
  // Атомарно: условия «фото существует» и «удалять может автор или staff»
  // в одном deleteMany — без гонки findFirst→delete (двойной тап давал P2025 и 500).
  const res = await prisma.orderPhoto.deleteMany({
    where: {
      id: params.photoId,
      orderId: params.id,
      ...(isStaff(acc.me.role) ? {} : { authorId: acc.me.id }),
    },
  });
  if (res.count === 0) {
    // Либо фото уже удалено, либо нет прав на удаление — для клиента равнозначно.
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
