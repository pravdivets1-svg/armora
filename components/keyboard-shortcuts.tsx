'use client';

// Keyboard shortcuts на странице карточки заказа.
// Использование: <KeyboardShortcuts orderId={id} role={role} />
// Биндим только когда не в input/textarea (чтобы не мешать вводу).
//
// Доступные:
//   c       — фокус на поле комментария
//   s       — фокус на поле "Цена по договору"
//   1..6    — переключение этапов через stepper (если разрешено машиной)
//   ?       — показать список горячих клавиш в overlay'е
//   esc     — закрыть overlay
//   g o     — go orders (вернуться к списку)
//   g c     — go calendar
//
// Cmd+K / "/" уже глобально через CommandPalette.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: 'C',     label: 'Фокус на комментарий' },
  { keys: 'S',     label: 'Фокус на цену' },
  { keys: 'G O',   label: 'К списку заказов' },
  { keys: 'G C',   label: 'К расписанию' },
  { keys: 'Cmd K', label: 'Глобальный поиск' },
  { keys: '?',     label: 'Это окно' },
  { keys: 'Esc',   label: 'Закрыть' },
];

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function focusByName(name: string) {
  const el = document.querySelector<HTMLElement>(`[name="${name}"]`);
  el?.focus();
  if (el && 'select' in el && typeof (el as HTMLInputElement).select === 'function') {
    try { (el as HTMLInputElement).select(); } catch {}
  }
}

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let leaderG = false;
    let leaderTimer: ReturnType<typeof setTimeout> | null = null;

    function clearLeader() {
      leaderG = false;
      if (leaderTimer) { clearTimeout(leaderTimer); leaderTimer = null; }
    }

    function onKey(e: KeyboardEvent) {
      // Не перехватываем когда пользователь печатает
      if (isTypingTarget(e.target)) return;
      // Игнорируем модификаторы (кроме '?' который часто Shift+/)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'escape') {
        if (open) { setOpen(false); e.preventDefault(); }
        clearLeader();
        return;
      }
      if (key === '?') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Двойные комбинации g + ?
      if (leaderG) {
        if (key === 'o') { e.preventDefault(); router.push('/orders'); }
        else if (key === 'c') { e.preventDefault(); router.push('/calendar'); }
        clearLeader();
        return;
      }
      if (key === 'g') {
        leaderG = true;
        leaderTimer = setTimeout(clearLeader, 800);
        return;
      }

      // Одиночные
      if (key === 'c') { e.preventDefault(); focusByName('text'); return; }
      if (key === 's') { e.preventDefault(); focusByName('totalAmount'); return; }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearLeader();
    };
  }, [open, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm
                 flex items-center justify-center p-6"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Горячие клавиши"
    >
      <div
        className="bg-white rounded-2xl border border-line shadow-soft-lg
                   max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="inline-flex items-center gap-2 text-[14px] font-medium text-ink-900">
            <Keyboard size={14} className="text-ink-500" />
            Горячие клавиши
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
            className="text-ink-500 hover:text-ink-900 w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-ink-900/[0.06]"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="px-5 py-3 divide-y divide-line/60">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-ink-700">{s.label}</span>
              <span className="inline-flex items-center gap-1">
                {s.keys.split(' ').map((k, i) => (
                  <kbd key={i} className="px-1.5 py-0.5 rounded border border-line bg-canvas text-[11px] text-ink-700 font-mono leading-none">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
