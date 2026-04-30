'use client';

// Кнопка управления push-подпиской.
// Состояния:
//   - 'unsupported' — браузер/устройство не поддерживает (например, iOS в Safari без PWA-установки)
//   - 'denied'      — пользователь явно запретил уведомления → советуем разрешить в настройках
//   - 'idle'        — поддерживается, не подписан → кнопка «Включить»
//   - 'subscribed'  — уже подписан → кнопка «Отключить» + индикатор
//   - 'busy'        — идёт операция

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { VAPID_PUBLIC_KEY } from '@/lib/push-public';

type State = 'loading' | 'unsupported' | 'denied' | 'idle' | 'subscribed' | 'busy';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  // ArrayBuffer (не SharedArrayBuffer) — этого хочет PushManager.subscribe
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return view;
}

export default function PushToggle() {
  const [state, setState] = useState<State>('loading');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === 'undefined') return;
      // Минимальная фича-проверка
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
        setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }

      try {
        // Регистрируем SW, если ещё не зарегистрирован
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (cancelled) return;
        swReg.current = reg;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setEndpoint(existing.endpoint);
          setState('subscribed');
        } else {
          setState('idle');
        }
      } catch (e) {
        console.warn('[push] init failed', e);
        setState('unsupported');
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  async function subscribe() {
    if (!swReg.current) return;
    setState('busy');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'idle');
        return;
      }

      const sub = await swReg.current.pushManager.subscribe({
        userVisibleOnly: true,
        // TS строго различает Uint8Array<ArrayBuffer> vs Uint8Array<ArrayBufferLike>;
        // в браузерах типы DOM требуют первое, а наша утилита возвращает второе.
        // Каст безопасен — это всегда обычный ArrayBuffer.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // sub.toJSON() даёт { endpoint, keys: { p256dh, auth } }
      const payload = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('subscribe http ' + res.status);

      // Сразу шлём тестовое — чтобы пользователь видел, что работает
      fetch('/api/push/test', { method: 'POST' }).catch(() => {});

      setEndpoint(sub.endpoint);
      setState('subscribed');
    } catch (e) {
      console.warn('[push] subscribe failed', e);
      setState('idle');
      alert('Не удалось включить уведомления. Попробуйте ещё раз.');
    }
  }

  async function unsubscribe() {
    if (!swReg.current || !endpoint) return;
    setState('busy');
    try {
      const sub = await swReg.current.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      setEndpoint(null);
      setState('idle');
    } catch (e) {
      console.warn('[push] unsubscribe failed', e);
      setState('subscribed');
    }
  }

  if (state === 'loading' || state === 'unsupported') return null;

  if (state === 'denied') {
    return (
      <button
        type="button"
        title="Уведомления заблокированы. Разрешите их в настройках браузера для этого сайта."
        className="text-amber-300/90 hover:text-amber-200 hover:bg-white/10 p-2 rounded-md"
      >
        <BellOff size={16} />
      </button>
    );
  }

  if (state === 'subscribed') {
    return (
      <button
        type="button"
        onClick={unsubscribe}
        title="Уведомления включены. Нажмите, чтобы отключить."
        className="text-emerald-300 hover:text-emerald-200 hover:bg-white/10 p-2 rounded-md"
      >
        <BellRing size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={state === 'busy'}
      title="Включить уведомления о новых задачах"
      className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-md disabled:opacity-50"
    >
      <Bell size={16} />
    </button>
  );
}
