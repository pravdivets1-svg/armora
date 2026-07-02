// Универсальный компонент для отображения числовых/денежных метрик.
//
// Размеры:
//   sm — 16px, inline в таблицах
//   md — 24px, для карточек заказа (К доплате, Маржа)
//   lg — 34px, для дашбордных stat-карточек
//   xl — 56px, editorial display для bento hero
//   hero — 72px, главная метрика страницы
//
// Тон:
//   default — text1
//   ok      — ok2 (положительная маржа)
//   bad     — bad2 (убыток / просрочка)
//   accent  — синий, для главной метрики
//   muted   — text3

import type { ReactNode } from 'react';

const SIZE_MAP = {
  sm:   { value: 'text-[16px] font-semibold',                          label: 'text-[11px]' },
  md:   { value: 'text-[24px] font-semibold',                          label: 'text-[11px]' },
  lg:   { value: 'text-[34px] font-semibold',                          label: 'text-[11px]' },
  xl:   { value: 'text-[56px] font-semibold tracking-tight',           label: 'text-[11px]' },
  hero: { value: 'text-[72px] font-bold tracking-tight',               label: 'text-[12px]' },
} as const;

const TONE_MAP = {
  default: 'text-text1',
  ok:      'text-ok2-text',
  bad:     'text-bad2-text',
  accent:  'text-accent',
  muted:   'text-text3',
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
        <div className={`uppercase tracking-wider text-text3 font-medium ${s.label}
                         flex items-center gap-1.5`}>
          {icon}
          {label}
        </div>
      )}
      <div className={`mt-1 tabular-nums leading-none ${s.value} ${TONE_MAP[tone]}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[12px] text-text3 leading-snug">{hint}</div>
      )}
    </div>
  );
}

// Карточка-обёртка. Плоская по дефолту (Linear-стиль).
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
  span?: 1 | 2 | 3;
}) {
  const base =
    variant === 'accent'
      ? 'rounded-2xl bg-accent text-white p-6 md:p-7'
      : variant === 'ghost'
        ? 'rounded-2xl p-5'
        : 'rounded-2xl border border-borderc bg-card p-5 md:p-6';
  const interactive = href
    ? variant === 'accent'
      ? 'hover:bg-accent/90 cursor-pointer block transition-colors'
      : 'hover:border-text2/40 cursor-pointer block transition-colors'
    : '';
  const colSpan = span === 3 ? 'md:col-span-3' : span === 2 ? 'md:col-span-2' : '';
  const cls = `${base} ${interactive} ${colSpan} ${className}`;
  if (href) {
    return <a href={href} className={cls}>{children}</a>;
  }
  return <div className={cls}>{children}</div>;
}
