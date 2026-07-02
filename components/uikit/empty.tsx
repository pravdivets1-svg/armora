import type { LucideIcon } from 'lucide-react';

// Пустое состояние — тоже поверхность бренда: иконка в accent-круге с
// расходящимися кольцами вместо серого «бутстрап-квадрата».
export function Empty({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative w-16 h-16 mb-5">
        <span aria-hidden className="absolute -inset-6 rounded-full border border-accent/[.06]" />
        <span aria-hidden className="absolute -inset-3 rounded-full border border-accent/[.12]" />
        <span className="relative flex w-full h-full items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon size={26} strokeWidth={1.75} />
        </span>
      </div>
      <h3 className="text-h2 text-text1 mb-1">{title}</h3>
      {hint && <p className="text-meta text-text3 max-w-sm mb-4">{hint}</p>}
      {action}
    </div>
  );
}
