// Универсальный компонент для отображения числовых/денежных метрик.
// Унифицирует stat-карточки, hero-числа в финансах и summary-блоки.
//
// Размеры:
//   sm — 16px, для inline в строках таблиц
//   md — 24px, для карточек заказа (К доплате, Маржа)
//   lg — 36px, для дашбордных stat-карточек (счётчики, суммы)
//   xl — 56px, editorial display serif для bento hero
//   hero — 72px, editorial display serif для главной метрики страницы
//
// Тон:
//   default — ink-900
//   ok      — emerald-700, для положительной маржи / "всё ок"
//   bad     — bad, для убытка / просрочки
//   accent  — индиго, для выделения "главного"
//   muted   — ink-500, для второстепенных
//
// Пример: <Metric label="Маржа" value={fmtMoney(120000)} tone="ok" size="md" />

import type { ReactNode } from 'react';

const SIZE_MAP = {
  sm:   { value: 'text-[16px] font-semibold',                          label: 'text-[10px]' },
  md:   { value: 'text-[24px] font-semibold',                          label: 'text-[11px]' },
  lg:   { value: 'text-[34px] font-semibold',                          label: 'text-[11px]' },
  xl:   { value: 'text-[56px] font-semibold tracking-tight',label: 'text-[11px]' },
  hero: { value: 'text-[72px] font-bold tracking-tight',  label: 'text-[12px]' },
} as const;

const TONE_MAP = {
  default: 'text-ink-900',
  ok:      'text-ok',
  bad:     'text-bad',
  accent:  'text-accent',
  muted:   'text-ink-500',
} as const;

export type MetricSize = keyof typeof SIZE_MAP;
export type MetricTone = keyof typeof TONE_MAP;

export function Metric({
  label,
  value,
  tone = 'default',
  size = 'md',
  hint,
  icon,
  className = '',
}: {
  label?: ReactNode;
  value: ReactNode;
  tone?: MetricTone;
  size?: MetricSize;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const s = SIZE_MAP[size];
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <div className={`uppercase tracking-wider text-ink-500 font-medium ${s.label}
                         flex items-center gap-1.5`}>
          {icon}
          {label}
        </div>
      )}
      <div className={`mt-1 tabular-nums leading-none ${s.value} ${TONE_MAP[tone]}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[12px] text-ink-500 leading-snug">{hint}</div>
      )}
    </div>
  );
}

// Карточка-обёртка для stat-блоков на дашбордах.
// variant=default — белая с тонкой рамкой и soft shadow
// variant=accent  — тёмная hero для главной метрики страницы
// variant=ghost   — без рамки, только padding (для bento-вложенности)
export function MetricCard({
  href,
  children,
  className = '',
  variant = 'default',
  span = 1,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'ghost';
  /** Сколько колонок занимает в bento-сетке (1, 2, 3) */
  span?: 1 | 2 | 3;
}) {
  const base =
    variant === 'accent'
      ? 'rounded-2xl bg-ink-900 text-white p-6 md:p-7 shadow-soft-lg'
      : variant === 'ghost'
        ? 'rounded-2xl p-5'
        : 'rounded-2xl border border-line bg-white p-5 md:p-6 shadow-soft';
  const interactive = href
    ? variant === 'accent'
      ? 'hover:bg-ink-700 cursor-pointer block transition-colors'
      : 'hover:border-ink-900/20 hover:shadow-soft-lg cursor-pointer block transition-all'
    : '';
  const colSpan = span === 3 ? 'md:col-span-3' : span === 2 ? 'md:col-span-2' : '';
  const cls = `${base} ${interactive} ${colSpan} ${className}`;
  if (href) {
    return <a href={href} className={cls}>{children}</a>;
  }
  return <div className={cls}>{children}</div>;
}
