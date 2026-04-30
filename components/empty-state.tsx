import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** compact — для пустых таблиц/списков; default — для full-page */
  variant?: 'default' | 'compact';
};

/**
 * Единый компонент пустого состояния. Используется везде, где
 * данных нет: пустая таблица, пустая очередь, пустой календарь.
 *
 * compact = inline для tbody/td (без рамки, меньше воздуха).
 * default = карточка с рамкой и иконкой (для основной зоны страницы).
 */
export function EmptyState({ icon: Icon, title, description, action, variant = 'default' }: Props) {
  if (variant === 'compact') {
    return (
      <div className="py-16 text-center">
        {Icon ? <Icon size={22} className="mx-auto text-ink-400 mb-3" strokeWidth={1.5} /> : null}
        <div className="text-ink-700 text-[14px] font-medium">{title}</div>
        {description ? <div className="text-ink-400 text-[13px] mt-1">{description}</div> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    );
  }
  return (
    <div className="bg-white border border-line rounded-lg p-16 text-center">
      {Icon ? <Icon size={28} className="mx-auto text-ink-400 mb-4" strokeWidth={1.5} /> : null}
      <div className="text-ink-900 font-medium">{title}</div>
      {description ? <div className="text-ink-500 text-[13px] mt-1">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
