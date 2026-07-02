'use client';

// Баннер-промпт: «Включите уведомления». Показывается тем, у кого
//   - браузер/устройство поддерживают Push,
//   - разрешение ещё не запрашивалось (Notification.permission === 'default'),
//   - пользователь не закрыл баннер вручную (localStorage 'pushPromptDismissedAt'
//     с TTL в 14 дней),
//   - подписки в этом браузере ещё нет.
//
// На iOS push доступен только в режиме PWA (display-mode: standalone), поэтому
// для iOS-клиентов баннер только в установленном приложении (но скрывается
// автоматически — там Notification API недоступен в обычном Safari).

import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { VAPID_PUBLIC_KEY } from '@/lib/push-public';

const DISMISS_KEY = 'armora.pushPromptDismissedAt';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 дней

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return view;
}

type State = 'hidden' | 'visible' | 'busy';

export default function PushPrompt() {
  const [state, setState] = useState<State>('hidden');
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function decide() {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
      if (!VAPID_PUBLIC_KEY) return;
      if (Notification.permission !== 'default') return;

      // Уважаем «скрыть на время»
      try {
        const ts = Number(localStorage.getItem(DISMISS_KEY));
        if (ts && Date.now() - ts < DISMISS_TTL_MS) return;
      } catch { /* private mode — игнорируем */ }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (cancelled) return;
        swReg.current = reg;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // уже подписан — баннер не нужен
        setState('visible');
      } catch {
        // SW не зарегистрировался — без push
      }
    }
    decide();
    return () => { cancelled = true; };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setState('hidden');
  }

  async function enable() {
    if (!swReg.current) return;
    setState('busy');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        // 'denied' — больше не показываем (всё равно условие на 'default'),
        // 'default' — пользователь закрыл диалог; считаем как dismiss.
        dismiss();
        return;
      }

      const sub = await swReg.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('subscribe http ' + res.status);

      // Тестовое уведомление, чтобы пользователь сразу увидел, что работает
      fetch('/api/push/test', { method: 'POST' }).catch(() => {});

      setState('hidden');
    } catch (e) {
      console.warn('[push-prompt] enable failed', e);
      setState('visible');
      // toast вместо блокирующего системного alert (и без ссылки на «колокольчик
      // в шапке» — такого элемента в текущем каркасе нет).
      toast.error('Не удалось включить уведомления. Попробуйте позже в Профиле.');
    }
  }

  if (state === 'hidden') return null;

  // На мобиле баннер поднят над таб-баром (64px + safe-area): с bottom-4 и тем же
  // z-40 таб-бар (позже в DOM) перекрывал ряд кнопок «Включить»/«Не сейчас».
  return (
    <div
      role="dialog"
      aria-label="Включить уведомления"
      className="fixed right-4 left-4 sm:left-auto sm:max-w-sm z-50
                 bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] lg:bottom-4
                 bg-card border border-borderc rounded-xl shadow-soft
                 p-4 flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-full bg-accent text-white inline-flex items-center justify-center shrink-0">
        <Bell size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-text1 text-[14px] leading-tight">
          Включить уведомления
        </div>
        <p className="text-[13px] text-text2 mt-1 leading-snug">
          Чтобы не пропускать новые заявки, замеры и установки — даже когда вкладка закрыта.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={enable}
            disabled={state === 'busy'}
            className="inline-flex items-center min-h-[44px] px-4 rounded-md bg-accent text-white text-[13px] font-medium
                       hover:bg-accent/90 active:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {state === 'busy' ? 'Включаем…' : 'Включить'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={state === 'busy'}
            className="inline-flex items-center min-h-[44px] px-4 rounded-md text-text3 text-[13px] hover:text-text1
                       hover:bg-subtle active:bg-subtle transition-colors"
          >
            Не сейчас
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Закрыть"
        className="w-10 h-10 -mt-2 -mr-2 inline-flex items-center justify-center rounded-md
                   text-text3 hover:text-text2 active:bg-subtle shrink-0 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
