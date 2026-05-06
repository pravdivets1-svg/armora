// Форматтеры для отображения. Все используют ru-RU + Europe/Moscow.
// Принудительный timeZone нужен потому, что прод-сервер Timeweb работает в UTC,
// а бизнес ведётся в МСК — без явного таймзона SSR показал бы UTC-время.

const TZ = 'Europe/Moscow';

// Возвращает Date, у которого UTC-компоненты равны компонентам исходной даты в МСК.
// Нужно когда мы читаем .getHours()/.getDate()/etc — это локальное время процесса
// (на проде Timeweb это UTC). Чтобы получить МСК-час/день — сдвигаем на +3ч и
// читаем UTC-компоненты через getUTCHours()/getUTCDate().
//
// Используется в местах где надо сравнить «тот же день в МСК» или показать час
// без Intl.DateTimeFormat (например, padStart по часам).
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
export function toMsk(d: Date): Date {
  return new Date(d.getTime() + MSK_OFFSET_MS);
}

// «Начало дня в МСК» — Date, у которого UTC-компоненты:
// год/месяц/день из МСК, час/минута/секунда = 0.
// Возвращает «настоящий» момент времени (UTC), соответствующий 00:00 МСК.
export function mskDayStart(d: Date): Date {
  const m = toMsk(d);
  // Берём UTC-компоненты сдвинутой даты как «МСК-компоненты»
  const y = m.getUTCFullYear();
  const mo = m.getUTCMonth();
  const da = m.getUTCDate();
  // 00:00 МСК = 21:00 UTC предыдущих суток. Используем Date.UTC и вычитаем сдвиг.
  return new Date(Date.UTC(y, mo, da, 0, 0, 0) - MSK_OFFSET_MS);
}

// Ключ дня в МСК для группировки. «2026-05-03».
export function mskDayKey(d: Date): string {
  const m = toMsk(d);
  const y = m.getUTCFullYear();
  const mo = String(m.getUTCMonth() + 1).padStart(2, '0');
  const da = String(m.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

// «Тот же день в МСК?»
export function isSameMskDay(a: Date, b: Date): boolean {
  return mskDayKey(a) === mskDayKey(b);
}

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

// Интервал «дд.мм чч:мм–чч:мм» (если оба в один МСК-день) или «дд.мм чч:мм – дд.мм чч:мм».
// Если end null/undefined — возвращает обычный fmtDateTime(start).
export function fmtInterval(start: Date | string, end?: Date | string | null): string {
  if (!end) return fmtDateTime(start);
  const a = new Date(start);
  const b = new Date(end);
  if (isSameMskDay(a, b)) {
    return `${fmtDateTime(a)}–${fmtTime(b)}`;
  }
  return `${fmtDateTime(a)} – ${fmtDateTime(b)}`;
}

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
