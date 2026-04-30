// Форматтеры для отображения. Все используют ru-RU + Europe/Moscow.
// Принудительный timeZone нужен потому, что прод-сервер Timeweb работает в UTC,
// а бизнес ведётся в МСК — без явного таймзона SSR показал бы UTC-время.

const TZ = 'Europe/Moscow';

export const fmtMoney = (n: number | string) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(n)) + ' ₽';

export const fmtDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));

export const fmtFullDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));

export const fmtDayLong = (d: Date | string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date(d));

export const fmtTime = (d: Date | string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));

// Сокращение ФИО до «И. Иванов»
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}.${parts[1]}`;
}

// Только цифры из телефона — для wa.me и tel:
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Инициалы из ФИО, для аватарок
export function initials(full: string): string {
  const parts = full.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}
