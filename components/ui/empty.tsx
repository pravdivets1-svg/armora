import type { LucideIcon } from 'lucide-react';

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
      <div className="w-12 h-12 rounded-md bg-subtle text-text3 flex items-center justify-center mb-4">
        <Icon size={22} />
      </div>
      <h3 className="text-h2 text-text1 mb-1">{title}</h3>
      {hint && <p className="text-meta text-text3 max-w-sm mb-4">{hint}</p>}
      {action}
    </div>
  );
}
