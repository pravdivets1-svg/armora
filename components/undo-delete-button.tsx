'use client';

// Undo-кнопка для деструктивных действий (delete order/lead/user/comment).
// Поведение:
//   1) Клик по кнопке — НЕ удаляем сразу. Показываем sonner-toast с кнопкой
//      "Отменить" на 5 секунд. UI остаётся как есть (заказ не пропадает),
//      но сама кнопка переходит в состояние "Удаляется через 5с…".
//   2) Если пользователь нажмёт Отменить — отменяем pending запрос.
//   3) Если время вышло — вызываем server action.
//
// Это современный паттерн (Gmail, Linear, GitHub): без модальных confirm(),
// мгновенный визуальный отклик, обратимость.

import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Trash2, Undo2 } from 'lucide-react';

const UNDO_MS = 5_000;

export default function UndoDeleteButton({
  action,
  label = 'Удалить',
  successMessage = 'Удалено',
  className = '',
  variant = 'danger',
  children,
}: {
  /** Server action или async function, вызывается после истечения окна undo. */
  action: () => Promise<void> | void;
  /** Текст кнопки в обычном состоянии */
  label?: string;
  /** Сообщение в toast перед удалением (с кнопкой Undo) */
  successMessage?: string;
  className?: string;
  variant?: 'danger' | 'ghost';
  /** Свой контент кнопки (icon+label). Если задан — игнорируем label. */
  children?: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const cancelledRef = useRef(false);

  function trigger() {
    if (pending) return;
    setPending(true);
    cancelledRef.current = false;

    const toastId = toast(`${successMessage}. Отменить через 5с`, {
      duration: UNDO_MS,
      action: {
        label: 'Отменить',
        onClick: () => {
          cancelledRef.current = true;
          setPending(false);
          toast.dismiss(toastId);
          toast.success('Действие отменено');
        },
      },
    });

    // Через UNDO_MS — выполняем action, если не отменили
    setTimeout(async () => {
      if (cancelledRef.current) return;
      try {
        await action();
      } catch (e) {
        toast.error('Не удалось удалить');
        setPending(false);
        console.error(e);
      }
    }, UNDO_MS);
  }

  const cls = variant === 'danger'
    ? 'text-bad2 hover:bg-bad2-soft disabled:opacity-50'
    : 'text-text3 hover:text-text1 hover:bg-subtle disabled:opacity-50';

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md
                  text-[13px] font-medium transition-colors ${cls} ${className}`}
    >
      {pending ? (
        <>
          <Undo2 size={13} /> Удаляется через 5с…
        </>
      ) : children ? children : (
        <>
          <Trash2 size={13} /> {label}
        </>
      )}
    </button>
  );
}
