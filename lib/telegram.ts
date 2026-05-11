// Отправка сообщений в Telegram через Bot API.
// Конфигурация — через переменные окружения:
//   TELEGRAM_BOT_TOKEN  — токен от @BotFather
//   TELEGRAM_CHAT_IDS   — CSV из chat_id (числа), кому слать. Пример: "123456789,987654321"
// Если переменные не заданы — функция тихо ничего не делает (silent skip).
//
// Как получить chat_id:
//   1) Создать бота у @BotFather, получить токен.
//   2) Каждый получатель должен написать боту /start (любое сообщение).
//   3) Открыть https://api.telegram.org/bot<TOKEN>/getUpdates — найти "chat":{"id":...}
//   4) Все нужные id через запятую — в TELEGRAM_CHAT_IDS.

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isTelegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT_IDS.length > 0);
}

// Эскейп для parse_mode=HTML.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegram(text: string): Promise<void> {
  if (!isTelegramConfigured()) return;

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const tasks = CHAT_IDS.map(async (chatId) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        // Telegram + Timeweb egress иногда тормозит до 10+с. Ставим запас.
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[telegram] send failed', res.status, body);
      }
    } catch (e) {
      console.warn('[telegram] send error', e);
    }
  });
  await Promise.allSettled(tasks);
}

// =====================================================================
// Готовое сообщение о новой заявке с сайта
// =====================================================================

export type LeadTelegramDoor = {
  id?: number | null;
  name?: string | null;
  series?: string | null;
  basePrice?: number | null;
  purpose?: string | null;
  finish?: string | null;
  image?: string | null;
  tags?: string[] | null;
};

export type LeadTelegramContext = {
  number: number;
  clientName: string;
  clientPhone: string;
  clientAddress?: string | null;
  widthMm?: number | null;
  heightMm?: number | null;
  comment?: string;
  estimatedPrice?: number | null;
  source: string;
  door?: LeadTelegramDoor | null;
};

// Отправка фото с подписью — sendPhoto API. Caption max 1024 символа.
// Возвращает true если хотя бы одному получателю доставили.
async function sendTelegramPhoto(photoUrl: string, caption: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false;
  const url = `https://api.telegram.org/bot${TOKEN}/sendPhoto`;
  let anyOk = false;
  const tasks = CHAT_IDS.map(async (chatId) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption,
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) anyOk = true;
      else {
        const body = await res.text().catch(() => '');
        console.warn('[telegram] sendPhoto failed', res.status, body);
      }
    } catch (e) {
      console.warn('[telegram] sendPhoto error', e);
    }
  });
  await Promise.allSettled(tasks);
  return anyOk;
}

// =====================================================================
// Сообщение «Замер назначен» — отправляется в общий рабочий чат при
// конверсии заявки в заказ с указанием замерщика и времени.
// =====================================================================

export type SurveyAssignTelegramContext = {
  orderNumber:   number;
  orderId:       string;
  surveyorName:  string;
  clientName:    string;
  clientPhone:   string;
  clientAddress: string;
  surveyAt:      string; // ISO
};

export async function notifyOrderAssignedSurveyTelegram(
  ctx: SurveyAssignTelegramContext,
  baseUrl?: string,
): Promise<void> {
  if (!isTelegramConfigured()) return;

  const at = new Date(ctx.surveyAt);
  const when = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(at);

  const lines: string[] = [];
  lines.push(`<b>Замер назначен · №${ctx.orderNumber}</b>`);
  lines.push('');
  lines.push(`<b>Замерщик:</b> ${escapeHtml(ctx.surveyorName)}`);
  lines.push(`<b>Когда:</b> <code>${escapeHtml(when)}</code> МСК`);
  lines.push(`<b>Клиент:</b> ${escapeHtml(ctx.clientName)} · ${escapeHtml(ctx.clientPhone)}`);
  if (ctx.clientAddress) lines.push(`<b>Адрес:</b> ${escapeHtml(ctx.clientAddress)}`);
  if (baseUrl) {
    lines.push('');
    lines.push(`<a href="${baseUrl}/orders/${ctx.orderId}">Открыть заказ</a>`);
  }

  await sendTelegram(lines.join('\n'));
}

export async function notifyLeadCreatedTelegram(lead: LeadTelegramContext, baseUrl?: string): Promise<void> {
  if (!isTelegramConfigured()) return;

  const door = lead.door ?? null;
  const lines: string[] = [];
  lines.push(`<b>Новая заявка №${lead.number}</b>`);
  lines.push('');
  if (door && door.name) {
    const head = door.series ? `${door.name} · ${door.series}` : door.name;
    lines.push(`<b>Модель:</b> ${escapeHtml(head)}${door.purpose ? ` · ${escapeHtml(door.purpose)}` : ''}`);
    if (door.basePrice) {
      lines.push(`<b>База:</b> <code>${door.basePrice.toLocaleString('ru-RU')} ₽</code>`);
    }
    if (door.tags && door.tags.length) {
      lines.push('<b>Характеристики:</b>');
      for (const t of door.tags.slice(0, 6)) lines.push(`  · ${escapeHtml(t)}`);
    }
    lines.push('');
  }
  lines.push(`<b>Клиент:</b> ${escapeHtml(lead.clientName)}`);
  lines.push(`<b>Телефон:</b> ${escapeHtml(lead.clientPhone)}`);
  if (lead.clientAddress) lines.push(`<b>Адрес:</b> ${escapeHtml(lead.clientAddress)}`);
  if (lead.widthMm || lead.heightMm) {
    lines.push(`<b>Размер:</b> ${lead.widthMm ?? '?'} × ${lead.heightMm ?? '?'} мм`);
  }
  if (lead.estimatedPrice && lead.estimatedPrice > 0) {
    lines.push(`<b>Ориент. цена:</b> ${lead.estimatedPrice.toLocaleString('ru-RU')} ₽`);
  }
  if (lead.comment && lead.comment.trim()) {
    lines.push(`<b>Комментарий:</b> ${escapeHtml(lead.comment.trim())}`);
  }
  lines.push(`<i>Источник: ${escapeHtml(lead.source)}</i>`);

  if (baseUrl) {
    lines.push('');
    lines.push(`<a href="${baseUrl}/leads">Открыть в Armora</a>`);
  }

  const message = lines.join('\n');

  // Если есть URL картинки двери — пробуем sendPhoto (caption ≤ 1024 chars).
  // Telegram покажет превью двери прямо в чате.
  if (door?.image && message.length <= 1024) {
    const ok = await sendTelegramPhoto(door.image, message);
    if (ok) return;
  }
  // Fallback / no image / caption too long: обычный sendMessage.
  await sendTelegram(message);
}
