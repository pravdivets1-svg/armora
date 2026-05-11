// Отправка email через Resend HTTPS API (https://resend.com/docs/api-reference/emails/send-email).
// Используем fetch напрямую — не тянем npm-пакет.
//
// Env:
//   RESEND_API_KEY    — ключ от Resend (re_...)
//   EMAIL_FROM        — адрес отправителя; без верификации домена обязан быть на @resend.dev,
//                       например "Armora <onboarding@resend.dev>"
//   EMAIL_RECIPIENTS  — CSV из email'ов, кому слать (например "a@x.com,b@y.com")
//
// Если RESEND_API_KEY или EMAIL_RECIPIENTS не заданы — функция тихо ничего не делает.

const API_URL = 'https://api.resend.com/emails';

const API_KEY    = process.env.RESEND_API_KEY;
const FROM       = process.env.EMAIL_FROM ?? 'Armora <onboarding@resend.dev>';
const RECIPIENTS = (process.env.EMAIL_RECIPIENTS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY && RECIPIENTS.length > 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail(subject: string, html: string, text: string): Promise<void> {
  if (!isEmailConfigured()) return;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: RECIPIENTS,
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[email] send failed', res.status, body);
    }
  } catch (e) {
    console.warn('[email] send error', e);
  }
}

// =====================================================================
// Готовое сообщение о новой заявке с сайта
// =====================================================================

export type LeadEmailDoor = {
  id?: number | null;
  name?: string | null;
  series?: string | null;
  basePrice?: number | null;
  purpose?: string | null;
  finish?: string | null;
  image?: string | null;
  tags?: string[] | null;
};

export type LeadEmailContext = {
  number: number;
  clientName: string;
  clientPhone: string;
  clientAddress?: string | null;
  widthMm?: number | null;
  heightMm?: number | null;
  comment?: string;
  estimatedPrice?: number | null;
  source: string;
  door?: LeadEmailDoor | null;
};

export async function notifyLeadCreatedEmail(lead: LeadEmailContext, baseUrl?: string): Promise<void> {
  if (!isEmailConfigured()) return;

  const subject = `Новая заявка №${lead.number} — ${lead.clientName}${lead.door?.name ? ` · ${lead.door.name}` : ''}`;

  const rows: Array<[string, string]> = [
    ['Клиент', lead.clientName],
    ['Телефон', lead.clientPhone],
  ];
  if (lead.clientAddress) rows.push(['Адрес', lead.clientAddress]);
  if (lead.widthMm || lead.heightMm) rows.push(['Размер', `${lead.widthMm ?? '?'} × ${lead.heightMm ?? '?'} мм`]);
  if (lead.estimatedPrice && lead.estimatedPrice > 0) {
    rows.push(['Ориентировочная цена', `${lead.estimatedPrice.toLocaleString('ru-RU')} ₽`]);
  }
  if (lead.comment && lead.comment.trim()) rows.push(['Комментарий', lead.comment.trim()]);
  rows.push(['Источник', lead.source]);

  const openLink = baseUrl ? `${baseUrl}/leads` : null;

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 16px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;width:160px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#0b0d12;font-size:14px;white-space:pre-wrap;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  // Door block — рендерится только если есть door.name или door.image
  const door = lead.door ?? null;
  const hasDoor = !!(door && (door.name || door.image));
  const doorHtml = hasDoor && door
    ? `
      <div style="padding:16px 24px;border-bottom:1px solid #eceef1;background:#f4f5f7;">
        <div style="font-size:11px;color:#8a93a1;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">Выбранная модель</div>
        <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
          <tr>
            ${door.image ? `<td valign="top" style="width:140px;padding-right:16px;">
              <img src="${escapeHtml(door.image)}" alt="${escapeHtml(door.name ?? 'Дверь')}"
                style="width:140px;height:auto;border-radius:10px;display:block;border:1px solid #eceef1;background:#fff;" />
            </td>` : ''}
            <td valign="top" style="font-size:14px;color:#0b0d12;">
              <div style="font-weight:600;font-size:16px;margin-bottom:4px;">${escapeHtml(door.name ?? '—')}</div>
              ${door.series ? `<div style="color:#4b5260;font-size:13px;margin-bottom:6px;">Серия: ${escapeHtml(door.series)}${door.purpose ? ' · ' + escapeHtml(door.purpose) : ''}</div>` : ''}
              ${door.basePrice ? `<div style="font-weight:600;color:#2563eb;font-size:14px;margin-bottom:8px;font-variant-numeric:tabular-nums;">База: ${door.basePrice.toLocaleString('ru-RU')} ₽</div>` : ''}
              ${door.tags && door.tags.length
                ? `<div style="color:#4b5260;font-size:12.5px;line-height:1.5;">${door.tags.slice(0, 8).map(t => `· ${escapeHtml(t)}`).join('<br>')}</div>`
                : ''}
            </td>
          </tr>
        </table>
      </div>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="ru">
  <body style="margin:0;padding:24px;background:#fafafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eceef1;border-radius:14px;overflow:hidden;">
      <div style="padding:24px 24px 16px;border-bottom:1px solid #eceef1;">
        <div style="font-size:12px;color:#8a93a1;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;">Armora · Новая заявка</div>
        <h1 style="margin:0;font-size:22px;color:#0b0d12;font-weight:650;letter-spacing:-0.01em;">№${lead.number} — ${escapeHtml(lead.clientName)}</h1>
      </div>
      ${doorHtml}
      <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;padding:8px 24px;">
        ${htmlRows}
      </table>
      ${openLink
        ? `<div style="padding:16px 24px 24px;">
             <a href="${escapeHtml(openLink)}"
                style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
                Открыть в Armora
             </a>
           </div>`
        : ''}
    </div>
  </body>
</html>`.trim();

  // Plain text — тоже добавим door
  const textLines = [
    `Новая заявка №${lead.number}`,
    '',
  ];
  if (hasDoor && door) {
    textLines.push('— Модель —');
    if (door.name)      textLines.push(`Название: ${door.name}`);
    if (door.series)    textLines.push(`Серия: ${door.series}${door.purpose ? ' · ' + door.purpose : ''}`);
    if (door.basePrice) textLines.push(`Базовая цена: ${door.basePrice.toLocaleString('ru-RU')} ₽`);
    if (door.tags && door.tags.length) textLines.push('Характеристики:\n  ' + door.tags.slice(0, 8).join('\n  '));
    if (door.image)     textLines.push(`Картинка: ${door.image}`);
    textLines.push('');
  }
  textLines.push(...rows.map(([k, v]) => `${k}: ${v}`));
  if (openLink) {
    textLines.push('', `Открыть: ${openLink}`);
  }

  await sendEmail(subject, html, textLines.join('\n'));
}
