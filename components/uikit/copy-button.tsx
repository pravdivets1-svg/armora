'use client';

// Компактная кнопка «копировать в буфер». Используется в карточке заказа
// (копирование адреса из общего списка без захода в заказ). Иконка на 1.4с
// меняется на галочку — подтверждение без тостов.

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({
  text,
  label = 'Скопировать',
  className = '',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    // Внутри карточки-ссылки: не даём всплыть к оверлей-ссылке заказа.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Буфер недоступен (старый браузер / не secure context) — тихо игнорируем.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? 'Скопировано' : label}
      title={copied ? 'Скопировано' : label}
      className={`pointer-events-auto inline-flex items-center justify-center shrink-0
                  transition-transform active:scale-90 ${className}`}
    >
      {copied ? <Check size={13} className="text-ok2" /> : <Copy size={13} />}
    </button>
  );
}
