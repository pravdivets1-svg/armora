'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, BellOff, Share, Plus, Smartphone } from 'lucide-react';
import { SectionCard, Button } from '@/components/uikit';
import { VAPID_PUBLIC_KEY } from '@/lib/push-public';

type Env = 'loading' | 'unsupported' | 'ios-need-pwa' | 'ready';
type Perm = 'default' | 'granted' | 'denied' | 'unknown';
type Sub = 'unknown' | 'no' | 'yes';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return view;
}

function detectIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && 'ontouchend' in document);
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
}

export default function NotificationsBlock() {
  const [env, setEnv] = useState<Env>('loading');
  const [perm, setPerm] = useState<Perm>('unknown');
  const [sub, setSub] = useState<Sub>('unknown');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === 'undefined') return;

      const ios = detectIos();
      const standalone = detectStandalone();
      const hasSw = 'serviceWorker' in navigator;
      const hasPush = 'PushManager' in window;
      const hasNotif = 'Notification' in window;

      if (!hasSw || !VAPID_PUBLIC_KEY) {
        setEnv('unsupported');
        return;
      }

      // iOS Safari (не в PWA) — Push API недоступен пока не установят как приложение
      if (ios && !standalone) {
        setEnv('ios-need-pwa');
        return;
      }

      if (!hasPush || !hasNotif) {
        setEnv('unsupported');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (cancelled) return;
        swReg.current = reg;

        setPerm(Notification.permission as Perm);
        const existing = await reg.pushManager.getSubscription();
        setSub(existing ? 'yes' : 'no');
        setEnv('ready');
      } catch (e) {
        console.warn('[settings/push] init failed', e);
        setEnv('unsupported');
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  async function enable() {
    if (!swReg.current) return;
    setBusy(true);
    setError(null);
    try {
      const p = await Notification.requestPermission();
      setPerm(p as Perm);
      if (p !== 'granted') {
        setBusy(false);
        return;
      }
      const s = await swReg.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s.toJSON()),
      });
      if (!res.ok) throw new Error('subscribe http ' + res.status);
      fetch('/api/push/test', { method: 'POST' }).catch(() => {});
      setSub('yes');
    } catch (e) {
      console.warn('[settings/push] enable failed', e);
      setError('Не удалось включить уведомления. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!swReg.current) return;
    setBusy(true);
    setError(null);
    try {
      const s = await swReg.current.pushManager.getSubscription();
      if (s) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: s.endpoint }),
        });
        await s.unsubscribe();
      }
      setSub('no');
    } catch (e) {
      console.warn('[settings/push] disable failed', e);
      setError('Не удалось отключить. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      if (!res.ok) throw new Error('test http ' + res.status);
    } catch (e) {
      console.warn('[settings/push] test failed', e);
      setError('Не удалось отправить тестовое уведомление.');
    } finally {
      setBusy(false);
    }
  }

  if (env === 'loading') {
    return (
      <SectionCard title="Уведомления">
        <p className="text-meta text-text3">Проверяем поддержку…</p>
      </SectionCard>
    );
  }

  if (env === 'unsupported') {
    return (
      <SectionCard title="Уведомления">
        <p className="text-[14px] text-text2">
          Ваш браузер не поддерживает push-уведомления. Откройте Armora в Chrome, Safari (на iOS 16.4+) или Firefox.
        </p>
      </SectionCard>
    );
  }

  if (env === 'ios-need-pwa') {
    return (
      <SectionCard title="Уведомления на iPhone">
        <p className="text-[14px] text-text1 mb-3">
          Чтобы получать уведомления, установите Armora как приложение:
        </p>
        <ol className="space-y-3 text-[14px] text-text2">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-md bg-accent-soft text-accent text-[12px] font-semibold flex items-center justify-center">1</span>
            <span>В Safari нажмите кнопку <Share size={14} className="inline -mt-0.5" /> «Поделиться» внизу экрана.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-md bg-accent-soft text-accent text-[12px] font-semibold flex items-center justify-center">2</span>
            <span>Выберите <b>«На экран Домой»</b> <Plus size={14} className="inline -mt-0.5" />.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-md bg-accent-soft text-accent text-[12px] font-semibold flex items-center justify-center">3</span>
            <span>Закройте Safari и откройте Armora с иконки на экране Домой <Smartphone size={14} className="inline -mt-0.5" />.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-md bg-accent-soft text-accent text-[12px] font-semibold flex items-center justify-center">4</span>
            <span>Зайдите в «Профиль» — здесь появится кнопка «Включить уведомления».</span>
          </li>
        </ol>
        <p className="text-meta text-text3 mt-4">
          Требуется iOS 16.4 или новее.
        </p>
      </SectionCard>
    );
  }

  // env === 'ready'
  if (perm === 'denied') {
    return (
      <SectionCard title="Уведомления">
        <div className="flex items-start gap-3 text-[14px]">
          <BellOff size={18} className="text-bad2 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-text1 font-medium">Заблокированы</p>
            <p className="text-text3 text-meta mt-1">
              Откройте Настройки устройства → Armora → Уведомления → разрешите уведомления. Затем вернитесь сюда.
            </p>
          </div>
        </div>
      </SectionCard>
    );
  }

  if (sub === 'yes') {
    return (
      <SectionCard title="Уведомления">
        <div className="flex items-start gap-3 text-[14px] mb-3">
          <BellRing size={18} className="text-ok2 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-text1 font-medium">Включены</p>
            <p className="text-text3 text-meta mt-1">
              Вы получите уведомление о новой заявке, изменении этапа и других важных событиях.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={test} disabled={busy}>Отправить тест</Button>
          <Button variant="ghost" onClick={disable} disabled={busy}>Отключить</Button>
        </div>
        {error && <p className="text-meta text-bad2 mt-2">{error}</p>}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Уведомления">
      <div className="flex items-start gap-3 text-[14px] mb-3">
        <Bell size={18} className="text-text3 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-text1 font-medium">Не включены</p>
          <p className="text-text3 text-meta mt-1">
            Включите, чтобы получать уведомления о новых заявках и заказах даже когда приложение закрыто.
          </p>
        </div>
      </div>
      <Button onClick={enable} disabled={busy} block>
        {busy ? 'Включаем…' : 'Включить уведомления'}
      </Button>
      {error && <p className="text-meta text-bad2 mt-2">{error}</p>}
    </SectionCard>
  );
}
