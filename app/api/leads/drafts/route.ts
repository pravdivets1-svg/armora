// Публичный API для «черновиков» лидов.
//
// Юзкейс: клиент на сайте вводит телефон в калькуляторе, но не дожимает
// до Submit (отвлёкся, передумал). Мы не теряем контакт — фронт калькулятора
// при blur с поля телефона делает POST /api/leads/drafts с теми данными,
// которые уже есть.
//
// Отличия от /api/leads:
//   - Не шлёт push/telegram (это шум для менеджера, пока клиент думает).
//   - Сохраняет в ту же таблицу leads, но source='draft' и stage='new'.
//   - Если в течение часа с того же IP уже есть draft с тем же телефоном —
//     обновляем (не плодим дубли).
//   - Rate limit отдельный: 30/час/IP — клиент может несколько раз менять поля.
//
// Когда клиент дожмёт submit — обычный POST /api/leads создаст ПОЛНОЦЕННЫЙ
// лид (с пушами/telegram). Связь между draft и финальной заявкой устанавливать
// не пытаемся: проще считать, что draft = «недозаявка», иногда оба останутся.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RL_WINDOW_MS = 60 * 60 * 1000;
const RL_MAX = 30;
const rateMap = new Map<string, number[]>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const arr = (rateMap.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_MAX) {
    rateMap.set(ip, arr);
    return false;
  }
  arr.push(now);
  rateMap.set(ip, arr);
  return true;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

const draftSchema = z.object({
  // Минимальное требование: хотя бы телефон (5+ цифр)
  clientPhone:   z.string().trim().min(5).max(40),
  clientName:    z.string().trim().max(200).optional(),
  clientAddress: z.string().trim().max(500).optional(),
  comment:       z.string().trim().max(2000).optional(),
  widthMm:       z.coerce.number().int().min(0).max(5000).optional(),
  heightMm:      z.coerce.number().int().min(0).max(5000).optional(),
  estimatedPrice:z.coerce.number().min(0).max(10_000_000).optional(),
}).passthrough();

function phoneDigits(s: string): string {
  return (s ?? '').replace(/\D/g, '');
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimitOk(ip)) {
    return NextResponse.json({ ok: false, error: 'rate' }, { status: 429, headers: corsHeaders });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
  }
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
  }
  const d = parsed.data;
  const digits = phoneDigits(d.clientPhone);
  if (digits.length < 5) {
    return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
  }

  const cleanPayload = { ...(body as Record<string, unknown>) };
  delete (cleanPayload as any).website;

  // Ищем недавний draft с тем же телефоном с того же IP за последний час
  const recent = await prisma.lead.findFirst({
    where: {
      source: 'draft',
      clientPhoneDigits: digits,
      ip,
      createdAt: { gte: new Date(Date.now() - RL_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (recent) {
    await prisma.lead.update({
      where: { id: recent.id },
      data: {
        clientName:    d.clientName ?? '(черновик)',
        clientPhone:   d.clientPhone,
        clientPhoneDigits: digits,
        clientAddress: d.clientAddress ?? null,
        widthMm:       d.widthMm ?? null,
        heightMm:      d.heightMm ?? null,
        comment:       d.comment ?? '',
        estimatedPrice: d.estimatedPrice ?? null,
        payload:       cleanPayload as any,
      },
    });
    return NextResponse.json({ ok: true, leadId: recent.id, updated: true }, { headers: corsHeaders });
  }

  const lead = await prisma.lead.create({
    data: {
      clientName:    d.clientName ?? '(черновик)',
      clientPhone:   d.clientPhone,
      clientPhoneDigits: digits,
      clientAddress: d.clientAddress ?? null,
      widthMm:       d.widthMm ?? null,
      heightMm:      d.heightMm ?? null,
      comment:       d.comment ?? '',
      estimatedPrice: d.estimatedPrice ?? null,
      source:        'draft',
      stage:         'new',
      payload:       cleanPayload as any,
      ip,
      userAgent:     req.headers.get('user-agent') ?? null,
    },
    select: { id: true, number: true },
  });

  return NextResponse.json({ ok: true, leadId: lead.id, number: lead.number }, { status: 201, headers: corsHeaders });
}
