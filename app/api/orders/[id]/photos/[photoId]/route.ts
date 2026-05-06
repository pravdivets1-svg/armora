// GET    /api/orders/[id]/photos/[photoId] — отдать бинарь фото.
// DELETE /api/orders/[id]/photos/[photoId] — удалить (автор или staff).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';

export const runtime = 'nodejs';

async function checkAccess(orderId: string) {
  const me = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, surveyorId: true, installerId: true },
  });
  if (!order) return { error: 'not_found' as const };
  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) return { error: 'forbidden' as const };
  return { me, order };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string; photoId: string } },
) {
  const acc = await checkAccess(params.id);
  if ('error' in acc) {
    return NextResponse.json({ error: acc.error }, { status: acc.error === 'not_found' ? 404 : 403 });
  }
  const photo = await prisma.orderPhoto.findFirst({
    where: { id: params.photoId, orderId: params.id },
    select: { mime: true, data: true, size: true },
  });
  if (!photo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const buf = photo.data as unknown as Buffer;
  // Копируем в новый ArrayBuffer, чтобы тип не зависел от SharedArrayBuffer.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  const blob = new Blob([ab], { type: photo.mime });
  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type':   photo.mime,
      'Content-Length': String(photo.size),
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
  if ('error' in acc) {
    return NextResponse.json({ error: acc.error }, { status: acc.error === 'not_found' ? 404 : 403 });
  }
  const photo = await prisma.orderPhoto.findFirst({
    where: { id: params.photoId, orderId: params.id },
    select: { id: true, authorId: true },
  });
  if (!photo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  // Удалять может автор или staff
  if (photo.authorId !== acc.me.id && !isStaff(acc.me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  await prisma.orderPhoto.delete({ where: { id: photo.id } });
  return NextResponse.json({ ok: true });
}
