'use client';

// Клик по телефону → копирует номер, кнопка мигает "Скопировано".
// Используется в таблице заказов и карточках лидов.

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.preventDefault(); // не переходить по overlay-ссылке строки
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Скопировано' : 'Копировать номер'}
      className={`group inline-flex items-center gap-1.5 tabular-nums text-[14px]
                  rounded px-0.5 -mx-0.5 transition-colors
                  ${copied
                    ? 'text-ok'
                    : 'text-ink-700 hover:text-ink-900'}`}
    >
      <span>{phone}</span>
      <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${copied ? 'opacity-100' : ''}`}>
        {copied
          ? <Check size={12} className="text-ok" />
          : <Copy size={11} className="text-ink-400" />}
      </span>
    </button>
  );
}
