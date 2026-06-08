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
 * Единый компонент пустого состояния.
 * compact = inline для tbody/td (без рамки).
 * default = карточка с рамкой и иконкой.
 */
export function EmptyState({ icon: Icon, title, description, action, variant = 'default' }: Props) {
  if (variant === 'compact') {
    return (
      <div className="py-16 text-center">
        {Icon ? <Icon size={22} className="mx-auto text-text3 mb-3" strokeWidth={1.5} /> : null}
        <div className="text-text2 text-[14px] font-medium">{title}</div>
        {description ? <div className="text-text3 text-[13px] mt-1">{description}</div> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    );
  }
  return (
    <div className="bg-card border border-borderc rounded-lg p-16 text-center">
      {Icon ? <Icon size={28} className="mx-auto text-text3 mb-4" strokeWidth={1.5} /> : null}
      <div className="text-text1 font-medium">{title}</div>
      {description ? <div className="text-text3 text-[13px] mt-1">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
