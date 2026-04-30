// Универсальный компонент для отображения числовых/денежных метрик.
// Унифицирует stat-карточки, hero-числа в финансах и summary-блоки.
//
// Размеры:
//   sm — 16px, для inline в строках таблиц
//   md — 24px, для карточек заказа (К доплате, Маржа)
//   lg — 36px, для дашбордных stat-карточек (счётчики, суммы)
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
  sm: { value: 'text-[16px]',  label: 'text-[10px]' },
  md: { value: 'text-[24px]',  label: 'text-[11px]' },
  lg: { value: 'text-[34px]',  label: 'text-[11px]' },
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
      <div className={`mt-1 font-semibold tabular-nums leading-none ${s.value} ${TONE_MAP[tone]}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[12px] text-ink-500 leading-snug">{hint}</div>
      )}
    </div>
  );
}

// Карточка-обёртка для stat-блоков на дашбордах. Минимум хрома —
// только тонкая граница и hover на cursor:pointer вариантах.
export function MetricCard({
  href,
  children,
  className = '',
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const cls = `rounded-lg border border-line bg-white p-5 ${
    href ? 'hover:border-ink-900/20 hover:bg-ink-900/[0.01] cursor-pointer block' : ''
  } ${className}`;
  if (href) {
    // Используем обычный <a> чтобы не тащить Link сюда — компонент серверный.
    return <a href={href} className={cls}>{children}</a>;
  }
  return <div className={cls}>{children}</div>;
}
