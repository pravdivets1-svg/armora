'use client';

// Глобальный поиск в шапке — светлая editorial версия.
// Хоткеи: "/" или Cmd/Ctrl+K — фокус, Esc — снять фокус и очистить.
// На мобильных скрыт (поиск делается через фильтр на /orders).

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

export default function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (pathname === '/orders') {
      setValue(sp.get('q') ?? '');
    } else {
      setValue('');
    }
  }, [pathname, sp]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typingInField =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
      const inOurField = target === inputRef.current;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (typingInField && !inOurField) return;
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
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

  // Универсальный shortcut-индикатор: на маках подменим на ⌘K через CSS-trick? Проще — два варианта.
  // Здесь оставляем "/" — он работает на всех платформах одинаково и популярен (Linear/GitHub).

  return (
    <form onSubmit={onSubmit} className="relative hidden md:block">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
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
        className="w-72 lg:w-80 bg-ink-900/[0.04] hover:bg-ink-900/[0.06] focus:bg-white
                   border border-transparent focus:border-ink-900/20
                   rounded-md pl-9 pr-12 py-1.5 text-[13px] text-ink-900
                   placeholder:text-ink-400 focus:outline-none"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-500
                      border border-line bg-white rounded px-1.5 py-0.5 font-mono pointer-events-none leading-none">
        /
      </kbd>
    </form>
  );
}
