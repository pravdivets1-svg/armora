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
        // Telegram иногда тормозит — короткий таймаут, чтобы не блокировать запрос
        signal: AbortSignal.timeout(5000),
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
};

export async function notifyLeadCreatedTelegram(lead: LeadTelegramContext, baseUrl?: string): Promise<void> {
  if (!isTelegramConfigured()) return;

  const lines: string[] = [];
  lines.push(`<b>Новая заявка №${lead.number}</b>`);
  lines.push('');
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

  await sendTelegram(lines.join('\n'));
}
