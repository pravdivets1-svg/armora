// iOS-style Grouped Inset list — современный паттерн «Настроек iOS».
//
// Структура:
//   <InsetGroup label="Клиент" footer="Тап по строке — позвонить">
//     <InsetRow label="Имя"     value="Петров И.И." />
//     <InsetRow label="Телефон" value="+7 (495)…" href="tel:..." />
//     <InsetRow label="Адрес"   value={<a>...</a>} />
//   </InsetGroup>
//
// Принципы:
//   - Уппер-кейс капс-лейбл НАД карточкой (вне rounded-корпуса).
//   - Внутри карточки `divide-y` — строки прижаты друг к другу без gap.
//   - Строки 44pt мин-высота (тач-таргет iOS HIG).
//   - Disclosure-chevron справа — если строка интерактивная (href / onClick).

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export function InsetGroup({
  label,
  action,
  footer,
  children,
  className = '',
}: {
  /** Капс-лейбл над карточкой (опционально) */
  label?: string;
  /** Иконка/кнопка справа от label */
  action?: ReactNode;
  /** Мелкий пояснительный текст под карточкой */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${className}`}>
      {(label || action) && (
        <header className="flex items-center justify-between px-4 mb-1.5">
          <h2 className="text-[11px] uppercase tracking-[0.06em] text-text3 font-semibold">
            {label}
          </h2>
          {action}
        </header>
      )}
      <div className="glass-surface rounded-2xl overflow-hidden
                      divide-y divide-white/40">
        {children}
      </div>
      {footer && (
        <p className="px-4 mt-1.5 text-[12px] text-text3 leading-snug">{footer}</p>
      )}
    </section>
  );
}

type InsetRowProps = {
  label?: ReactNode;
  value?: ReactNode;
  /** Если есть — строка кликабельная, появляется chevron */
  href?: string;
  /** Внешняя ссылка, открыть в новой вкладке */
  external?: boolean;
  /** Тап-обработчик (взаимоисключим с href) */
  onClick?: () => void;
  /** Иконка слева (lucide или ReactNode) */
  icon?: ReactNode;
  /** Подзаголовок под label (например, второстепенный текст) */
  sublabel?: ReactNode;
  /** Кастомное содержимое строки — если задано, label/value игнорятся */
  children?: ReactNode;
  /** Растянуть value на отдельную строку под label (для длинных значений) */
  stacked?: boolean;
  className?: string;
};

function InsetRowInner({
  label, value, icon, sublabel, children, stacked, chevron,
}: InsetRowProps & { chevron: boolean }) {
  if (children) return <>{children}</>;
  return (
    <>
      {icon && (
        <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 text-text3">
          {icon}
        </span>
      )}
      <div className={`flex-1 min-w-0 ${stacked ? 'flex flex-col gap-0.5' : 'flex items-baseline justify-between gap-3'}`}>
        <div className={`${stacked ? 'text-[13px] text-text3' : 'text-[14px] text-text2 shrink-0'}`}>
          {label}
        </div>
        <div className={`${stacked ? 'text-[15px] text-text1' : 'text-[14px] text-text1 text-right truncate'}`}>
          {value}
        </div>
        {sublabel && stacked && (
          <div className="text-[12px] text-text3">{sublabel}</div>
        )}
      </div>
      {chevron && (
        <ChevronRight size={16} className="shrink-0 text-text3" strokeWidth={2} />
      )}
    </>
  );
}

export function InsetRow(props: InsetRowProps) {
  const { href, external, onClick, className = '' } = props;
  const interactive = !!(href || onClick);
  const chevron = interactive;

  const base =
    'flex items-center gap-3 px-4 min-h-[44px] py-2 ' +
    'transition-colors duration-fast ' +
    (interactive ? 'active:bg-subtle hover:bg-subtle/60 cursor-pointer ' : '');

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`${base} ${className}`}
        >
          <InsetRowInner {...props} chevron={chevron} />
        </a>
      );
    }
    return (
      <Link href={href} className={`${base} ${className}`}>
        <InsetRowInner {...props} chevron={chevron} />
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} w-full text-left ${className}`}
      >
        <InsetRowInner {...props} chevron={chevron} />
      </button>
    );
  }

  return (
    <div className={`${base} ${className}`}>
      <InsetRowInner {...props} chevron={chevron} />
    </div>
  );
}
