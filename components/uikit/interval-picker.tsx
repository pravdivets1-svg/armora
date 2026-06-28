'use client';

// IntervalPicker — удобный выбор даты+интервала для замера/установки.
//
// Структура:
//   ┌─────────────────────────────┐
//   │ Дата:    [YYYY-MM-DD ▼]     │
//   │ Время:   [HH:MM] → [HH:MM]  │
//   │ Пресеты: [9–12] [12–15] …   │
//   └─────────────────────────────┘
//
// Хидден-инпуты `${name}At` и `${name}EndAt` отдают значения в формате
// "YYYY-MM-DDTHH:mm" — серверный applyDateOrNull в actions.ts разбирает
// именно его (трактует как Europe/Moscow).
//
// При пустых полях хидден-инпуты тоже пустые — zod на сервере примет null.

import { useEffect, useId, useMemo, useState } from 'react';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Date → "YYYY-MM-DD" по МСК
function toMskDateInput(d: Date | null | undefined): string {
  if (!d) return '';
  const m = new Date(d.getTime() + MSK_OFFSET_MS);
  return `${m.getUTCFullYear()}-${pad2(m.getUTCMonth() + 1)}-${pad2(m.getUTCDate())}`;
}

// Date → "HH:MM" по МСК
function toMskTimeInput(d: Date | null | undefined): string {
  if (!d) return '';
  const m = new Date(d.getTime() + MSK_OFFSET_MS);
  return `${pad2(m.getUTCHours())}:${pad2(m.getUTCMinutes())}`;
}

function combine(date: string, time: string): string {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

// "HH:MM" + N часов (24-час, в пределах одних суток).
// При выходе за 23:59 — ограничиваем 23:59.
function addHoursToTime(time: string, hours: number): string {
  const m = time.match(/^(\d{2}):(\d{2})$/);
  if (!m) return time;
  const h = +m[1];
  const min = +m[2];
  const total = h * 60 + min + hours * 60;
  const clamped = Math.min(total, 23 * 60 + 59);
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

export type IntervalPickerPreset = {
  label: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

const SURVEY_PRESETS: IntervalPickerPreset[] = [
  { label: '9–11',  start: '09:00', end: '11:00' },
  { label: '11–13', start: '11:00', end: '13:00' },
  { label: '13–15', start: '13:00', end: '15:00' },
  { label: '15–17', start: '15:00', end: '17:00' },
  { label: '17–19', start: '17:00', end: '19:00' },
  { label: 'Весь день', start: '09:00', end: '20:00' },
];

const INSTALL_PRESETS: IntervalPickerPreset[] = [
  { label: '9–13',  start: '09:00', end: '13:00' },
  { label: '13–17', start: '13:00', end: '17:00' },
  { label: '17–21', start: '17:00', end: '21:00' },
  { label: 'Весь день', start: '09:00', end: '20:00' },
];

export const SURVEY_DEFAULT_HOURS = 2;
export const INSTALL_DEFAULT_HOURS = 4;

export function IntervalPicker({
  name,
  defaultStart,
  defaultEnd,
  defaultDurationHours,
  presets,
  disabled,
  onChange,
}: {
  /** Базовое имя — генерирует `${name}At` и `${name}EndAt` */
  name: 'survey' | 'install';
  defaultStart?: Date | null;
  defaultEnd?: Date | null;
  /** Если конец пуст и пользователь только что выбрал начало — авто +X часов */
  defaultDurationHours: number;
  presets?: IntervalPickerPreset[];
  disabled?: boolean;
  /** Колбэк после ЛЮБОГО изменения (включая клик по пресету) — для autosave-формы. */
  onChange?: () => void;
}) {
  const id = useId();
  const [date, setDate]   = useState<string>(toMskDateInput(defaultStart ?? defaultEnd ?? null));
  const [start, setStart] = useState<string>(toMskTimeInput(defaultStart));
  const [end, setEnd]     = useState<string>(toMskTimeInput(defaultEnd));
  // Флаг: пользователь руками тронул endTime → больше не авто-заполняем.
  const [endTouched, setEndTouched] = useState<boolean>(!!defaultEnd);

  // Если приходит новый default (после save) — синхронизируем
  useEffect(() => {
    setDate(toMskDateInput(defaultStart ?? defaultEnd ?? null));
    setStart(toMskTimeInput(defaultStart));
    setEnd(toMskTimeInput(defaultEnd));
    setEndTouched(!!defaultEnd);
  }, [defaultStart?.getTime(), defaultEnd?.getTime()]);

  const list = presets ?? (name === 'survey' ? SURVEY_PRESETS : INSTALL_PRESETS);

  // Сегодня по МСК — для placeholder/today-кнопки
  const todayMsk = useMemo(() => {
    const now = new Date();
    return toMskDateInput(now);
  }, []);

  const tomorrowMsk = useMemo(() => {
    const now = new Date();
    return toMskDateInput(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  }, []);

  const activePreset = useMemo(() => {
    if (!start || !end) return null;
    return list.find((p) => p.start === start && p.end === end)?.label ?? null;
  }, [start, end, list]);

  function applyPreset(p: IntervalPickerPreset) {
    if (disabled) return;
    setStart(p.start);
    setEnd(p.end);
    setEndTouched(true);
    if (!date) setDate(todayMsk);
    onChange?.();
  }

  function handleStartChange(v: string) {
    setStart(v);
    if (v && !endTouched) {
      setEnd(addHoursToTime(v, defaultDurationHours));
    }
    if (v && !date) setDate(todayMsk);
    onChange?.();
  }

  function handleEndChange(v: string) {
    setEnd(v);
    setEndTouched(true);
    onChange?.();
  }

  function clearAll() {
    setDate('');
    setStart('');
    setEnd('');
    setEndTouched(false);
    onChange?.();
  }

  const startValue = combine(date, start);
  const endValue   = combine(date, end);

  return (
    <div className="space-y-2">
      {/* Hidden inputs — то, что уходит в форму */}
      <input type="hidden" name={`${name}At`}    value={startValue} />
      <input type="hidden" name={`${name}EndAt`} value={endValue} />

      {/* Дата */}
      <label htmlFor={`${id}-date`} className="block">
        <span className="text-[11px] text-text3 uppercase tracking-wide font-medium">Дата</span>
        <div className="mt-1 flex gap-2">
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            disabled={disabled}
            onChange={(e) => { setDate(e.target.value); onChange?.(); }}
            className="flex-1 min-w-0 bg-card border border-borderc text-text1 rounded-md
                       px-3 py-2 text-[16px] lg:text-[14px] leading-6 tabular-nums
                       focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/30
                       disabled:bg-subtle disabled:text-text3"
          />
          {(date || start || end) && !disabled && (
            <button
              type="button"
              onClick={clearAll}
              className="px-3 h-10 rounded-md border border-borderc text-text3 hover:text-text1 hover:bg-subtle
                         text-[12px] transition-colors shrink-0"
              title="Очистить"
            >
              Очистить
            </button>
          )}
        </div>
      </label>

      {/* Быстрый выбор частых дат — один тап вместо нативного календаря */}
      {!disabled && (
        <div className="flex gap-1.5">
          {[
            { l: 'Сегодня', v: todayMsk },
            { l: 'Завтра',  v: tomorrowMsk },
          ].map((c) => (
            <button
              key={c.v}
              type="button"
              onClick={() => { setDate(c.v); onChange?.(); }}
              className={`inline-flex items-center h-7 px-3 rounded-md text-[12px] font-medium border transition-colors
                ${date === c.v
                  ? 'bg-accent border-accent text-white'
                  : 'bg-card border-borderc text-text2 hover:bg-subtle/60'}`}
            >
              {c.l}
            </button>
          ))}
        </div>
      )}

      {/* Время начала и конца */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label htmlFor={`${id}-start`} className="block">
          <span className="text-[11px] text-text3 uppercase tracking-wide font-medium">С</span>
          <input
            id={`${id}-start`}
            type="time"
            value={start}
            disabled={disabled}
            onChange={(e) => handleStartChange(e.target.value)}
            step={300}
            className="mt-1 w-full bg-card border border-borderc text-text1 rounded-md
                       px-3 py-2 text-[16px] lg:text-[14px] leading-6 tabular-nums
                       focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/30
                       disabled:bg-subtle disabled:text-text3"
          />
        </label>
        <span aria-hidden className="pb-2.5 text-text3 select-none">→</span>
        <label htmlFor={`${id}-end`} className="block">
          <span className="text-[11px] text-text3 uppercase tracking-wide font-medium">До</span>
          <input
            id={`${id}-end`}
            type="time"
            value={end}
            disabled={disabled}
            onChange={(e) => handleEndChange(e.target.value)}
            step={300}
            className="mt-1 w-full bg-card border border-borderc text-text1 rounded-md
                       px-3 py-2 text-[16px] lg:text-[14px] leading-6 tabular-nums
                       focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/30
                       disabled:bg-subtle disabled:text-text3"
          />
        </label>
      </div>

      {/* Пресеты */}
      <div className="flex gap-1.5 flex-wrap pt-0.5">
        {list.map((p) => {
          const isActive = activePreset === p.label;
          return (
            <button
              key={p.label}
              type="button"
              disabled={disabled}
              onClick={() => applyPreset(p)}
              className={`inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium
                          border transition-colors tabular-nums
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${isActive
                            ? 'bg-accent border-accent text-white'
                            : 'bg-card border-borderc text-text2 hover:border-text2/40 hover:bg-subtle/60'}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
