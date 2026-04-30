'use client';

// Глобальный поиск в шапке.
// - Ищет по № заказа / ФИО / телефону / адресу (логика на сервере в lib/orders.ts).
// - Хоткеи: "/" или Cmd/Ctrl+K — фокус на поле; Esc — снять фокус и очистить.
// - Сабмит: переход на /orders?q=...

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

export default function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  // При попадании на /orders подставляем текущий q в поле, иначе чистим
  useEffect(() => {
    if (pathname === '/orders') {
      setValue(sp.get('q') ?? '');
    } else {
      setValue('');
    }
  }, [pathname, sp]);

  // Глобальные хоткеи
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typingInField =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

      // Cmd/Ctrl+K — всегда
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      // "/" — только если не печатаем в другом поле
      if (e.key === '/' && !typingInField) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    const url = q ? `/orders?q=${encodeURIComponent(q)}` : '/orders';
    router.push(url);
    inputRef.current?.blur();
  }

  return (
    <form onSubmit={onSubmit} className="relative hidden md:block">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setValue('');
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Поиск: № / ФИО / телефон / адрес"
        aria-label="Глобальный поиск"
        className="w-72 lg:w-96 bg-white/10 hover:bg-white/15 focus:bg-white/20
                   border border-white/15 focus:border-white/30
                   rounded-md pl-9 pr-14 py-1.5 text-[13px] text-white
                   placeholder:text-white/50 focus:outline-none transition-colors"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/50
                      border border-white/20 rounded px-1.5 py-0.5 font-mono pointer-events-none">
        /
      </kbd>
    </form>
  );
}
