'use client';

// Command Palette — Cmd+K / "/" / клик по триггеру в шапке.
// Объединяет глобальный поиск и быстрые действия:
//   - Создать заказ (director+manager)
//   - Перейти: Заказы / Расписание / На закрытие
//   - Прыжок к "Сегодня" в расписании
//   - Свободный поиск → /orders?q=<value>
//
// Без внешних зависимостей: своя реализация фильтра + клавиатурная навигация.
// Для замыкания фокус-trap'а используем простой подход: при открытии — input
// получает focus, при Esc — закрываем; клик по backdrop — закрываем.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, ListChecks, CalendarClock, CheckCircle2, ArrowRight, Users, UserPlus, Inbox, Command as CmdIcon, type LucideIcon } from 'lucide-react';
import type { Role } from '@prisma/client';

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  shortcut?: string;
  onRun: () => void;
  keywords?: string;
  group: 'Действия' | 'Переходы' | 'Поиск';
};

export default function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  }, []);

  const go = useCallback((url: string) => { router.push(url); close(); }, [router, close]);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    if (role === 'director' || role === 'manager') {
      list.push({
        id: 'new-order', group: 'Действия', icon: Plus,
        label: 'Создать заказ', hint: 'Новый клиент',
        keywords: 'new order создать заказ клиент',
        onRun: () => go('/orders/new'),
      });
    }
    list.push(
      { id: 'orders', group: 'Переходы', icon: ListChecks, label: 'Заказы', hint: 'Список всех заказов',
        keywords: 'orders заказы список', onRun: () => go('/orders') },
      { id: 'calendar', group: 'Переходы', icon: CalendarClock, label: 'Расписание', hint: 'Замеры и установки',
        keywords: 'calendar расписание замеры установки', onRun: () => go('/calendar') },
      { id: 'today', group: 'Переходы', icon: CalendarClock, label: 'Сегодня', hint: 'Маршрут на сегодня',
        keywords: 'today сегодня маршрут', onRun: () => go('/calendar#today') },
    );
    if (role === 'director' || role === 'manager') {
      list.push({
        id: 'leads', group: 'Переходы', icon: Inbox, label: 'Заявки',
        hint: 'Входящие с сайта и калькулятора',
        keywords: 'leads заявки входящие сайт калькулятор',
        onRun: () => go('/leads'),
      });
    }
    if (role === 'director') {
      list.push({
        id: 'closures', group: 'Переходы', icon: CheckCircle2, label: 'На закрытие',
        hint: 'Очередь подтверждений',
        keywords: 'closures закрытие подтверждение',
        onRun: () => go('/closures'),
      });
      list.push({
        id: 'users', group: 'Переходы', icon: Users, label: 'Сотрудники',
        hint: 'Учётные записи и доступы',
        keywords: 'users сотрудники пользователи логины пароли',
        onRun: () => go('/users'),
      });
      list.push({
        id: 'user-new', group: 'Действия', icon: UserPlus, label: 'Новый сотрудник',
        hint: 'Создать учётную запись',
        keywords: 'new user создать сотрудника пользователя логин',
        onRun: () => go('/users/new'),
      });
    }
    return list;
  }, [role, go]);

  // Фильтр + динамический "поисковый" пункт
  const filtered = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter((it) => `${it.label} ${it.keywords ?? ''}`.toLowerCase().includes(q))
      : items;
    if (q) {
      return [
        ...base,
        {
          id: 'search-' + q, group: 'Поиск', icon: Search,
          label: `Искать заказы: «${query}»`, hint: '№ / ФИО / телефон / адрес',
          onRun: () => go(`/orders?q=${encodeURIComponent(q)}`),
        },
      ];
    }
    return base;
  }, [items, query, go]);

  // Группировка
  const grouped = useMemo(() => {
    const map = new Map<Item['group'], Item[]>();
    for (const it of filtered) {
      if (!map.has(it.group)) map.set(it.group, []);
      map.get(it.group)!.push(it);
    }
    return [...map.entries()];
  }, [filtered]);

  // Глобальный хоткей открытия
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!open && e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Фокус на input при открытии
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Сброс активного при фильтре
  useEffect(() => { setActiveIdx(0); }, [query]);

  function onPaletteKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const it = filtered[activeIdx];
      if (it) it.onRun();
    }
  }

  return (
    <>
      {/* Триггер в шапке */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:inline-flex items-center gap-2 w-56 xl:w-72
                   bg-ink-900/[0.04] hover:bg-ink-900/[0.06]
                   border border-transparent hover:border-ink-900/10
                   rounded-lg pl-3 pr-2 py-1.5 text-[13px] text-ink-500
                   transition-colors"
        aria-label="Открыть command palette"
      >
        <Search size={14} className="text-ink-400" />
        <span className="flex-1 text-left">Поиск или команда…</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] text-ink-500
                         border border-line bg-white rounded px-1.5 py-0.5 font-mono leading-none">
          <CmdIcon size={9} /> K
        </span>
      </button>

      {/* Мобильный триггер — иконка */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden w-10 h-10 inline-flex items-center justify-center rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.06]"
        aria-label="Поиск"
      >
        <Search size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-[12vh] max-w-xl w-[calc(100%-2rem)]
                         bg-white rounded-2xl border border-line shadow-soft-lg
                         overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onPaletteKey}
              role="dialog"
              aria-label="Command palette"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
                <Search size={18} className="text-ink-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск заказов или команда…"
                  className="flex-1 bg-transparent border-0 outline-none text-[15px]
                             text-ink-900 placeholder:text-ink-400"
                />
                <kbd className="text-[10px] text-ink-500 border border-line bg-canvas rounded px-1.5 py-0.5 font-mono leading-none">
                  Esc
                </kbd>
              </div>
              <div className="max-h-[60vh] overflow-y-auto py-2">
                {filtered.length === 0 && (
                  <div className="px-5 py-10 text-center text-[13px] text-ink-500">Ничего не найдено</div>
                )}
                {grouped.map(([group, list]) => (
                  <div key={group} className="px-2 pb-2">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-400 font-medium">
                      {group}
                    </div>
                    {list.map((it) => {
                      const idx = filtered.indexOf(it);
                      const active = idx === activeIdx;
                      const Icon = it.icon;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => it.onRun()}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                                      ${active ? 'bg-ink-900/[0.05]' : 'hover:bg-ink-900/[0.03]'}`}
                        >
                          <Icon size={16} className={active ? 'text-ink-900' : 'text-ink-500'} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] text-ink-900 font-medium">{it.label}</div>
                            {it.hint && <div className="text-[12px] text-ink-500 mt-0.5 truncate">{it.hint}</div>}
                          </div>
                          {active && <ArrowRight size={14} className="text-ink-400" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="px-5 py-2.5 border-t border-line bg-canvas/50 text-[11px] text-ink-500
                              flex items-center justify-between">
                <span>↑↓ навигация · Enter — выполнить</span>
                <span className="inline-flex items-center gap-1">
                  <CmdIcon size={10} /> K — открыть
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
