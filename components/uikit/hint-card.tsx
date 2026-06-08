'use client';

// Подсказка-карточка для разделов. Один раз показывается, после dismiss
// сохраняется в localStorage по `hintId`. Цель — помочь новому пользователю,
// не мешать опытному.

import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

export function HintCard({
  hintId,
  title,
  children,
}: {
  /** Уникальный ключ — храним в localStorage что подсказку закрыли */
  hintId: string;
  title: string;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(true);
  const storageKey = `armora.hint.${hintId}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(storageKey)) {
        setHidden(true);
      } else {
        setHidden(false);
      }
    } catch {
      setHidden(false);
    }
  }, [storageKey]);

  function dismiss() {
    try { localStorage.setItem(storageKey, '1'); } catch {}
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className="relative rounded-md border border-borderc bg-card px-4 py-3 pr-10
                    flex items-start gap-2.5">
      <Lightbulb size={14} className="text-warn2 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-meta text-text3 uppercase tracking-wide font-medium">
          Подсказка · {title}
        </div>
        <div className="text-[13px] text-text1 mt-0.5 leading-snug">
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Скрыть подсказку"
        className="absolute right-2 top-2 w-7 h-7 inline-flex items-center justify-center rounded
                   text-text3 hover:text-text1 hover:bg-subtle transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}
