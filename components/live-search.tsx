'use client';

// Поиск с debounce: автоматически отправляет форму через 600ms после ввода.
// Показывает spinner пока идёт навигация (useTransition).
// Очистка — крестик появляется когда есть текст.

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
  /** Имена других query-параметров, которые нужно сохранить при поиске */
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
      {/* Иконка слева: loader когда грузится, иначе лупа */}
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none z-10">
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
        className={`block w-full min-w-0 pl-10 pr-9 h-10 rounded-md text-[14px]
                    bg-ink-900/[0.04] border border-transparent text-ink-900
                    shadow-[inset_0_1px_2px_rgba(15,15,15,0.06)]
                    placeholder:text-ink-400
                    focus:outline-none focus:bg-white focus:border-ink-900/25 focus:ring-4 focus:ring-ink-900/5 focus:shadow-none
                    ${isPending ? 'opacity-75' : ''}`}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Очистить поиск"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10
                     w-5 h-5 flex items-center justify-center rounded
                     text-ink-400 hover:text-ink-900 hover:bg-ink-900/[0.06]
                     transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
