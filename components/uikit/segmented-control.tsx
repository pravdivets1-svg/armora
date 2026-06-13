'use client';

// iOS-style Segmented Control. Аналог UISegmentedControl.
// Без активного state хранилища — controlled через value/onChange.
//
// Пример:
//   <SegmentedControl
//     value={tab}
//     onChange={setTab}
//     items={[{ key: 'all', label: 'Все' }, { key: 'mine', label: 'Мои' }]}
//   />

export function SegmentedControl<T extends string>({
  value,
  onChange,
  items,
  size = 'md',
  className = '',
}: {
  value: T;
  onChange: (next: T) => void;
  items: Array<{ key: T; label: string; count?: number }>;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const h = size === 'sm' ? 'h-7' : 'h-9';
  const text = size === 'sm' ? 'text-[12px]' : 'text-[13.5px]';
  return (
    <div
      role="tablist"
      className={`inline-flex items-stretch p-0.5 bg-subtle rounded-md ${className}`}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={`relative inline-flex items-center justify-center gap-1.5 px-3 ${h} ${text}
                        rounded font-medium whitespace-nowrap
                        transition-colors duration-fast
                        ${active
                          ? 'bg-card text-text1 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                          : 'text-text2 hover:text-text1'}`}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className={`tabular-nums text-[11px] ${active ? 'text-text3' : 'text-text3/80'}`}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
