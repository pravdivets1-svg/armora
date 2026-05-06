// API фото к заказу.
//
// POST /api/orders/[id]/photos
//   multipart/form-data: file (image/jpeg|png|webp), kind?, caption?
//   Доступ: staff или назначенный замерщик/установщик. Лимит 5 МБ на файл.
//
// GET /api/orders/[id]/photos
//   JSON со списком фото без бинарных данных (только метаданные).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import type { OrderPhotoKind } from '@prisma/client';

const MAX_BYTES = 5 * 1024 * 1024; // 5 МБ
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_KINDS: OrderPhotoKind[] = ['contract', 'survey', 'act', 'other'];

export const runtime = 'nodejs';

async function checkAccess(orderId: string) {
  const me = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, surveyorId: true, installerId: true, stage: true },
  });
  if (!order) return { error: 'not_found' as const };
  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) return { error: 'forbidden' as const };
  return { me, order };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const acc = await checkAccess(params.id);
  if ('error' in acc) {
    return NextResponse.json({ error: acc.error }, { status: acc.error === 'not_found' ? 404 : 403 });
  }
  const photos = await prisma.orderPhoto.findMany({
    where: { orderId: params.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, kind: true, mime: true, size: true,
      width: true, height: true, caption: true, createdAt: true,
      author: { select: { id: true, fullName: true } },
    },
  });
  return NextResponse.json({ photos });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const acc = await checkAccess(params.id);
  if ('error' in acc) {
    return NextResponse.json({ error: acc.error }, { status: acc.error === 'not_found' ? 404 : 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_mime', mime: file.type }, { status: 415 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large', size: file.size, max: MAX_BYTES }, { status: 413 });
  }

  const kindRaw = String(form.get('kind') ?? 'contract');
  const kind: OrderPhotoKind = (ALLOWED_KINDS as string[]).includes(kindRaw)
    ? (kindRaw as OrderPhotoKind)
    : 'contract';
  const caption = String(form.get('caption') ?? '').slice(0, 500);

  const buf = Buffer.from(await file.arrayBuffer());

  const created = await prisma.orderPhoto.create({
    data: {
      orderId:  params.id,
      authorId: acc.me.id,
      kind,
      mime:     file.type,
      size:     buf.length,
      data:     buf,
      caption,
    },
    select: {
      id: true, kind: true, mime: true, size: true,
      width: true, height: true, caption: true, createdAt: true,
    },
  });

  return NextResponse.json({ photo: created }, { status: 201 });
}
