'use client';

// Initial splash — мини-заставка при первом заходе в админку за сессию.
// Кратко (≤700ms), не назойливо. Использует sessionStorage,
// чтобы не показываться при каждой навигации.

import { useEffect, useState } from 'react';

const KEY = 'armora.splash.shown';

export default function InitialSplash() {
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'exit'>('hidden');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, '1');
    } catch {
      // private mode — всё равно показываем один раз за маунт
    }
    setPhase('enter');
    const t1 = setTimeout(() => setPhase('exit'), 400);
    const t2 = setTimeout(() => setPhase('hidden'), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center
                  bg-app backdrop-blur-sm pointer-events-none
                  transition-opacity duration-300 ease-out
                  ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className={`flex flex-col items-center gap-3
                       transition-transform duration-500 ease-out
                       ${phase === 'exit' ? 'scale-95' : 'scale-100'}`}>
        <div className="text-display text-text1 tracking-tight font-semibold">
          Armora
        </div>
        <div className="h-[2px] w-12 bg-accent/20 overflow-hidden rounded-full">
          <div className="h-full w-1/2 bg-accent animate-[splash-pulse_700ms_ease-out]" />
        </div>
      </div>
    </div>
  );
}
