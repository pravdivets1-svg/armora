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
      className="fixed inset-0 z-50 bg-text1/40 backdrop-blur-sm
                 flex items-center justify-center p-6"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Горячие клавиши"
    >
      <div
        className="bg-card rounded-2xl border border-borderc shadow-soft-lg
                   max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-borderc">
          <div className="inline-flex items-center gap-2 text-[14px] font-medium text-text1">
            <Keyboard size={14} className="text-text3" />
            Горячие клавиши
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
            className="text-text3 hover:text-text1 w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-subtle"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="px-5 py-3 divide-y divide-borderc/60">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-text2">{s.label}</span>
              <span className="inline-flex items-center gap-1">
                {s.keys.split(' ').map((k, i) => (
                  <kbd key={i} className="px-1.5 py-0.5 rounded border border-borderc bg-subtle text-[11px] text-text2 font-mono leading-none">
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
