'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items: Array<{ value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string }> = [
    { value: 'light',  icon: Sun,     label: 'Светлая' },
    { value: 'dark',   icon: Moon,    label: 'Тёмная' },
    { value: 'system', icon: Monitor, label: 'Системная' },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
      {items.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            className={[
              'h-7 w-7 inline-flex items-center justify-center rounded-[5px]',
              'transition-colors duration-150 ease-smooth',
              active
                ? 'bg-accent/15 text-accent-fg'
                : 'text-muted hover:text-fg hover:bg-fg/5',
            ].join(' ')}
          >
            <Icon size={14} strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
