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
import { apiUser } from '@/lib/auth-helpers';
import { canViewOrder } from '@/lib/orders';
import type { OrderPhotoKind } from '@prisma/client';

const MAX_BYTES = 5 * 1024 * 1024; // 5 МБ
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_KINDS: OrderPhotoKind[] = ['contract', 'survey', 'act', 'other'];

export const runtime = 'nodejs';

// Доступ = те же правила, что у страницы заказа (canViewOrder): staff, назначенцы,
// автор заказа, установщик на стадиях production+. Раньше проверялись только
// surveyorId/installerId — у автора-замерщика и установщика были битые фото и 403.
// apiUser вместо requireUser: при протухшей сессии отвечаем 401 JSON, а не 307 на HTML.
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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const acc = await checkAccess(params.id);
  if ('error' in acc) return accessError(acc.error);
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
  if ('error' in acc) return accessError(acc.error);

  // Лимит размера ДО буферизации тела: req.formData() разбирает весь multipart
  // в память, и проверка file.size после него не спасает от OOM единственного
  // контейнера. Отклоняем и честно объявленные большие тела, и chunked без длины.
  const len = Number(req.headers.get('content-length'));
  if (!len || len > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'too_large', max: MAX_BYTES }, { status: 413 });
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
