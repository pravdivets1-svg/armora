// Публичный API для приёма заявок с сайта/калькулятора.
//
// POST /api/leads
//   Content-Type: application/json
//   Body: { clientName, clientPhone, ...любые поля... }
//
// Защита:
//   - honeypot: если заполнено поле "website" — молча 200, ставим stage=spam
//   - rate limit: не более 5 заявок/час с одного IP (in-process Map)
//
// CORS: Access-Control-Allow-Origin: * — чтобы можно было POST'ить
// форму с любого домена (внешний лендинг, Тильда и т.п.).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { notifySafe, sendPushToStaff } from '@/lib/push';
import { notifyLeadCreatedTelegram } from '@/lib/telegram';
import { notifyLeadCreatedMax } from '@/lib/max';
import { notifyLeadCreatedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =====================================================================
// Rate limit (in-memory, per IP)
// =====================================================================
// Простой sliding-window. Не персистентен — переживёт ребут с очисткой,
// но для MVP этого достаточно. При масштабировании — Redis/Postgres.

const RL_WINDOW_MS = 60 * 60 * 1000; // 1 час
// 50/час с одного IP — комфортный запас для офисов за NAT, семей на одном
// WiFi и интенсивного тестирования. Анти-спам остаётся (50 руками не сделать).
const RL_MAX = 50;
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

  // Опортунистическая чистка устаревших записей (1 из 50 запросов)
  if (Math.random() < 0.02) {
    for (const [key, ts] of rateMap.entries()) {
      const fresh = ts.filter((t) => now - t < RL_WINDOW_MS);
      if (fresh.length === 0) rateMap.delete(key);
      else rateMap.set(key, fresh);
    }
  }
  return true;
}

function clientIp(req: NextRequest): string {
  // Берём последний адрес из XFF — он от нашего proxy и не подделывается клиентом
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// =====================================================================
// Validation
// =====================================================================

const leadSchema = z.object({
  clientName:    z.string().trim().min(2, 'Введите имя').max(200),
  clientPhone:   z.string().trim().min(5, 'Введите телефон').max(40),
  clientAddress: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  comment:       z.string().trim().max(2000).optional().default(''),
  widthMm:       z.coerce.number().int().min(0).max(5000).optional()
                  .or(z.literal('').transform(() => undefined)),
  heightMm:      z.coerce.number().int().min(0).max(5000).optional()
                  .or(z.literal('').transform(() => undefined)),
  estimatedPrice: z.coerce.number().min(0).max(10_000_000).optional()
                  .or(z.literal('').transform(() => undefined)),
  source:        z.string().trim().max(40).optional().default('calc'),
  // honeypot — должно быть пустым у настоящих людей
  website:       z.string().optional(),
  // UTM-метки (опц.)
  utmSource:     z.string().trim().max(100).optional(),
  utmMedium:     z.string().trim().max(100).optional(),
  utmCampaign:   z.string().trim().max(100).optional(),
  // Door info из каталога armora-catalog (опц.)
  doorId:        z.coerce.number().int().min(0).optional().nullable()
                  .or(z.literal('').transform(() => undefined)),
  doorName:      z.string().trim().max(100).optional().nullable()
                  .or(z.literal('').transform(() => undefined)),
  doorSeries:    z.string().trim().max(50).optional().nullable()
                  .or(z.literal('').transform(() => undefined)),
  doorBasePrice: z.coerce.number().min(0).max(10_000_000).optional().nullable()
                  .or(z.literal('').transform(() => undefined)),
  doorPurpose:   z.string().trim().max(40).optional().nullable()
                  .or(z.literal('').transform(() => undefined)),
  doorFinish:    z.string().trim().max(40).optional().nullable()
                  .or(z.literal('').transform(() => undefined)),
  doorImage:     z.string().url().max(500).optional().nullable()
                  .or(z.literal('').transform(() => undefined)),
  doorTags:      z.array(z.string().max(200)).max(50).optional().nullable(),
}).passthrough(); // не падаем на лишние поля — сложим их в payload

function phoneDigits(s: string): string {
  return (s ?? '').replace(/\D/g, '');
}

// Локальная копия normalizePhone — чтобы не тянуть lib/format.ts (там есть Intl).
import { normalizePhone } from '@/lib/format';

// =====================================================================
// CORS
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// =====================================================================
// POST
// =====================================================================

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const userAgent = req.headers.get('user-agent') ?? null;

  // Rate limit (до парсинга — экономим работу на потоке спама)
  if (!rateLimitOk(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Слишком много заявок. Попробуйте через час.' },
      { status: 429, headers: corsHeaders },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Некорректный JSON' },
      { status: 400, headers: corsHeaders },
    );
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return NextResponse.json(
      { ok: false, error: 'Проверьте поля формы', fieldErrors },
      { status: 400, headers: corsHeaders },
    );
  }
  const d = parsed.data;

  // Honeypot — настоящий пользователь не видит и не трогает поле "website".
  // Если заполнено — молча отвечаем "ok" + помечаем spam, чтобы бот не понял.
  const isSpam = !!(d.website && d.website.trim().length > 0);

  // Сырой payload — кладём всё, что прислали (минус приватные/служебные поля)
  const cleanPayload = { ...(body as Record<string, unknown>) };
  delete (cleanPayload as any).website;
  delete (cleanPayload as any).utmSource;
  delete (cleanPayload as any).utmMedium;
  delete (cleanPayload as any).utmCampaign;

  const lead = await prisma.lead.create({
    data: {
      clientName:        d.clientName,
      clientPhone:       normalizePhone(d.clientPhone),
      clientPhoneDigits: phoneDigits(d.clientPhone),
      clientAddress:     d.clientAddress ?? null,
      widthMm:           d.widthMm ?? null,
      heightMm:          d.heightMm ?? null,
      comment:           d.comment ?? '',
      estimatedPrice:    d.estimatedPrice ?? null,
      source:            d.source ?? 'calc',
      stage:             isSpam ? 'spam' : 'new',
      payload:           cleanPayload as any,
      ip,
      userAgent,
      utmSource:         d.utmSource ?? null,
      utmMedium:         d.utmMedium ?? null,
      utmCampaign:       d.utmCampaign ?? null,
    },
    select: { id: true, number: true, stage: true },
  });

  // Уведомления — только для нормальных заявок (не спам)
  if (!isSpam) {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${req.nextUrl.protocol}//${req.headers.get('host')}`;

    const leadCtx = {
      number:        lead.number,
      clientName:    d.clientName,
      clientPhone:   d.clientPhone,
      clientAddress: d.clientAddress ?? null,
      widthMm:       d.widthMm ?? null,
      heightMm:      d.heightMm ?? null,
      comment:       d.comment ?? '',
      estimatedPrice: d.estimatedPrice ?? null,
      source:        d.source ?? 'calc',
      door: (d.doorName || d.doorImage || d.doorId)
        ? {
            id:        d.doorId        ?? null,
            name:      d.doorName      ?? null,
            series:    d.doorSeries    ?? null,
            basePrice: d.doorBasePrice ?? null,
            purpose:   d.doorPurpose   ?? null,
            finish:    d.doorFinish    ?? null,
            image:     d.doorImage     ?? null,
            tags:      d.doorTags      ?? null,
          }
        : null,
    };

    // ДОЖИДАЕМСЯ доставки уведомлений перед возвратом ответа.
    // Раньше использовали void (fire-and-forget) — на Timeweb воркер мог
    // прибить незавершённые fetch к Resend/Telegram сразу после return,
    // и заявки с сайта оставались без email/TG. Now: даём всем шанс
    // до 6 секунд (Promise.race с таймером), потом отвечаем клиенту.
    const maxUserIds = await prisma.user
      .findMany({
        where: { role: { in: ['director', 'manager'] }, isActive: true, maxUserId: { not: null } },
        select: { maxUserId: true },
      })
      .then((users) => users.map((u) => u.maxUserId!).filter(Boolean))
      .catch(() => [] as string[]);

    const notifications: Promise<unknown>[] = [
      notifySafe(() =>
        sendPushToStaff({
          title: `Новая заявка · №${lead.number}`,
          body: `${d.clientName} · ${d.clientPhone}`,
          url: `/leads/${lead.id}`,
          tag: `lead-${lead.id}`,
        }),
      ),
      notifyLeadCreatedTelegram(leadCtx, baseUrl)
        .catch((e) => console.warn('[telegram] notify failed', e)),
      notifyLeadCreatedEmail(leadCtx, baseUrl)
        .catch((e) => console.warn('[email] notify failed', e)),
    ];
    if (maxUserIds.length > 0) {
      notifications.push(
        notifyLeadCreatedMax(maxUserIds, {
          number:        lead.number,
          clientName:    d.clientName,
          clientPhone:   d.clientPhone,
          clientAddress: d.clientAddress ?? null,
          comment:       d.comment ?? '',
        }, baseUrl).catch((e) => console.warn('[max] lead notify failed', e)),
      );
    }

    await Promise.race([
      Promise.allSettled(notifications),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
  }

  return NextResponse.json(
    { ok: true, leadId: lead.id, number: lead.number },
    { status: 201, headers: corsHeaders },
  );
}
