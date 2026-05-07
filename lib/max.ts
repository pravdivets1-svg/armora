// Отправка сообщений через MAX Bot API (platform-api.max.ru).
// Конфигурация через переменные окружения:
//   MAX_BOT_TOKEN — токен бота, полученный при создании бота на dev.max.ru
//
// Если MAX_BOT_TOKEN не задан — все функции тихо пропускаются (silent skip).
//
// Как получить MAX_BOT_TOKEN:
//   1) Зарегистрироваться на business.max.ru как ИП или юрлицо.
//   2) Создать организацию и пройти верификацию.
//   3) Создать чат-бота на платформе MAX → получить токен.
//   4) Прописать токен в переменную MAX_BOT_TOKEN.
//
// Как узнать user_id сотрудника в MAX:
//   Сотрудник пишет боту любое сообщение → в ответе Webhook/Long Polling
//   приходит sender.user_id. Либо вручную через GET /updates после первого
//   сообщения. Этот числовой ID записывается в User.maxUserId.

const TOKEN = process.env.MAX_BOT_TOKEN;
const BASE   = 'https://platform-api.max.ru';

export function isMaxConfigured(): boolean {
  return Boolean(TOKEN);
}

// Эскейп специальных символов для plain-text (MAX не требует HTML-эскейпа
// в режиме markdown — используем plain text по умолчанию).
function esc(s: string): string {
  return s.replace(/[*_`[\]]/g, '\\$&');
}

// Низкоуровневая отправка сообщения конкретному пользователю по его MAX user_id.
export async function sendMaxMessage(
  userId: string,
  text: string,
): Promise<void> {
  if (!TOKEN) return;

  try {
    const res = await fetch(`${BASE}/messages?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: TOKEN,
      },
      body: JSON.stringify({ text, format: 'markdown' }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[max] send failed', res.status, body.slice(0, 200));
    }
  } catch (e) {
    console.warn('[max] send error', e);
  }
}

// =====================================================================
// Шаблоны уведомлений для сотрудников
// =====================================================================

const TZ = 'Europe/Moscow';
function fmtWhen(d: Date | null): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export type OrderNotifyContext = {
  id: string;
  number: number;
  clientName: string;
  clientAddress: string;
  surveyorId: string | null;
  installerId: string | null;
  surveyAt: Date | null;
  installAt: Date | null;
};

// Уведомление замерщику — замер назначен/изменён.
export async function notifySurveyorMax(
  maxUserId: string,
  ctx: Pick<OrderNotifyContext, 'number' | 'clientName' | 'clientAddress' | 'surveyAt'>,
  baseUrl?: string,
): Promise<void> {
  const when = fmtWhen(ctx.surveyAt);
  const link = baseUrl ? `${baseUrl}/orders` : '';
  const lines = [
    `**Замер назначен — заказ №${ctx.number}**`,
    '',
    `Клиент: ${esc(ctx.clientName)}`,
    `Адрес: ${esc(ctx.clientAddress)}`,
    when ? `Время: ${when}` : '',
    link ? `\n[Открыть в Armora](${link})` : '',
  ].filter((l) => l !== '');
  await sendMaxMessage(maxUserId, lines.join('\n'));
}

// Уведомление установщику — установка назначена/изменена.
export async function notifyInstallerMax(
  maxUserId: string,
  ctx: Pick<OrderNotifyContext, 'number' | 'clientName' | 'clientAddress' | 'installAt'>,
  baseUrl?: string,
): Promise<void> {
  const when = fmtWhen(ctx.installAt);
  const link = baseUrl ? `${baseUrl}/orders` : '';
  const lines = [
    `**Установка назначена — заказ №${ctx.number}**`,
    '',
    `Клиент: ${esc(ctx.clientName)}`,
    `Адрес: ${esc(ctx.clientAddress)}`,
    when ? `Время: ${when}` : '',
    link ? `\n[Открыть в Armora](${link})` : '',
  ].filter((l) => l !== '');
  await sendMaxMessage(maxUserId, lines.join('\n'));
}

// Уведомление директорам/менеджерам — заказ подан на закрытие.
export async function notifyClosureMax(
  maxUserIds: string[],
  ctx: Pick<OrderNotifyContext, 'number' | 'clientName'>,
  baseUrl?: string,
): Promise<void> {
  const link = baseUrl ? `${baseUrl}/closures` : '';
  const lines = [
    `**На закрытие — заказ №${ctx.number}**`,
    '',
    `Клиент: ${esc(ctx.clientName)}`,
    `Ожидает подтверждения директора.`,
    link ? `\n[Открыть список](${link})` : '',
  ].filter((l) => l !== '');
  const text = lines.join('\n');
  await Promise.allSettled(maxUserIds.map((id) => sendMaxMessage(id, text)));
}

// Уведомление стаффу — новая заявка с сайта.
export async function notifyLeadCreatedMax(
  maxUserIds: string[],
  lead: {
    number: number;
    clientName: string;
    clientPhone: string;
    clientAddress?: string | null;
    comment?: string;
  },
  baseUrl?: string,
): Promise<void> {
  const link = baseUrl ? `${baseUrl}/leads` : '';
  const lines = [
    `**Новая заявка №${lead.number}**`,
    '',
    `Клиент: ${esc(lead.clientName)}`,
    `Телефон: ${esc(lead.clientPhone)}`,
    lead.clientAddress ? `Адрес: ${esc(lead.clientAddress)}` : '',
    lead.comment?.trim() ? `Комментарий: ${esc(lead.comment.trim())}` : '',
    link ? `\n[Открыть заявки](${link})` : '',
  ].filter((l) => l !== '');
  const text = lines.join('\n');
  await Promise.allSettled(maxUserIds.map((id) => sendMaxMessage(id, text)));
}
