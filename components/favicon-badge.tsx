'use client';

// Favicon badge — рисует красную «таблетку» с числом непрочитанных лидов
// поверх стандартной иконки. Срабатывает при каждом полл-цикле.
//
// Подход: загружаем оригинальный favicon как Image, рисуем на canvas 32×32,
// поверх рисуем circle + число, генерируем dataURL, подменяем <link rel="icon">.
// Старый <link> сохраняем, чтобы вернуть при count=0.
//
// Для точности — поллинг каждые 60 секунд через /api/leads/unread.

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 60_000;

async function fetchUnread(): Promise<number> {
  try {
    const res = await fetch('/api/leads/unread', { cache: 'no-store' });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data.count ?? 0);
  } catch {
    return 0;
  }
}

function findFaviconLink(): HTMLLinkElement | null {
  // Берём первый <link rel="icon" ...>, либо создаём новый
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
  return links[0] ?? null;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function paintFavicon(count: number, originalHref: string) {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Базовая иконка
  try {
    const img = await loadImage(originalHref);
    ctx.drawImage(img, 0, 0, size, size);
  } catch {
    // Если не удалось загрузить — заливаем сплошным цветом как fallback
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, size, size);
  }

  if (count > 0) {
    // Красная таблетка в правом нижнем углу
    const label = count > 9 ? '9+' : String(count);
    const r = label.length > 1 ? 11 : 9;
    const cx = size - r - 1;
    const cy = size - r - 1;

    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${label.length > 1 ? 12 : 14}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 0.5);
  }

  const link = findFaviconLink() ?? document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = canvas.toDataURL('image/png');
  if (!link.parentNode) document.head.appendChild(link);
}

export default function FaviconBadge({ enabled }: { enabled: boolean }) {
  const [count, setCount] = useState(0);
  const originalHref = useRef<string>('');

  // Запоминаем оригинальный href при монтировании
  useEffect(() => {
    if (!enabled) return;
    const link = findFaviconLink();
    originalHref.current = link?.href || '/favicon.ico';
  }, [enabled]);

  // Поллинг
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = async () => {
      const c = await fetchUnread();
      if (!cancelled) setCount(c);
    };
    tick();
    const id = setInterval(tick, POLL_MS);

    // Опрашиваем сразу при возвращении на вкладку
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  // Перерисовываем favicon при изменении count
  useEffect(() => {
    if (!enabled) return;
    if (originalHref.current) void paintFavicon(count, originalHref.current);
  }, [count, enabled]);

  return null;
}
