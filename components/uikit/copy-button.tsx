'use client';

// Компактная кнопка «копировать в буфер». Используется в карточке заказа
// (копирование адреса из общего списка без захода в заказ). Иконка на 1.4с
// меняется на галочку — подтверждение без тостов.

import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

export function CopyButton({
  text,
  label = 'Скопировать',
  className = '',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function handleClick(e: React.MouseEvent) {
    // Внутри карточки-ссылки: не даём всплыть к оверлей-ссылке заказа.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      // Fallback для старых webview / не-secure context: скрытая textarea +
      // execCommand. Молчаливый отказ хуже всего — пользователь уверен,
      // что адрес в буфере, а буфер пуст.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        setState(ok ? 'copied' : 'failed');
      } catch {
        setState('failed');
      }
    }
    setTimeout(() => setState('idle'), 1400);
  }
  const copied = state === 'copied';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? 'Скопировано' : state === 'failed' ? 'Не удалось скопировать' : label}
      title={copied ? 'Скопировано' : state === 'failed' ? 'Не удалось скопировать' : label}
      className={`pointer-events-auto inline-flex items-center justify-center shrink-0
                  transition-transform active:scale-90 ${className}`}
    >
      {copied ? <Check size={13} className="text-ok2" />
        : state === 'failed' ? <X size={13} className="text-bad2" />
        : <Copy size={13} />}
    </button>
  );
}
