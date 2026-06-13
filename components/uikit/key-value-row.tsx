export function KeyValueRow({
  label,
  value,
  action,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 min-h-[44px]">
      <span className="text-meta text-text3 shrink-0 self-center">{label}</span>
      <span className={`flex-1 text-right text-text1 truncate self-center ${mono ? 'tabular-nums font-mono' : ''}`}>
        {value}
      </span>
      {action && <span className="shrink-0 self-center">{action}</span>}
    </div>
  );
}
