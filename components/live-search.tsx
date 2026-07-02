'use client';

// Поиск с debounce: автоматически отправляет форму через 600ms после ввода.

import { useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';

export default function LiveSearch({
  name = 'q',
  defaultValue = '',
  placeholder = 'Поиск',
  preserve = [] as string[],
  className = '',
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  preserve?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(v: string) {
    const sp = new URLSearchParams();
    for (const key of preserve) {
      const existing = searchParams.get(key);
      if (existing) sp.set(key, existing);
    }
    if (v) sp.set(name, v);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(v), 600);
  }

  function clear() {
    setValue('');
    if (timer.current) clearTimeout(timer.current);
    push('');
  }

  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 pointer-events-none z-10">
        {isPending
          ? <Loader2 size={14} className="animate-spin" />
          : <Search size={14} />
        }
      </span>
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className={`block w-full min-w-0 pl-10 pr-10 h-10 rounded-md text-[14px]
                    bg-subtle/70 border border-transparent text-text1
                    placeholder:text-text3
                    focus:outline-none focus:bg-card focus:border-text2/30 focus:ring-1 focus:ring-text2/20
                    transition-colors
                    ${isPending ? 'opacity-75' : ''}`}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Очистить поиск"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10
                     w-9 h-9 flex items-center justify-center rounded
                     text-text3 hover:text-text1 hover:bg-subtle active:bg-subtle
                     transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
