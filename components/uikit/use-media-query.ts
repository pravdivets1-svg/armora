'use client';

import { useEffect, useState } from 'react';

export function useIsDesktop(): boolean {
  // На сервере и первом рендере — true (desktop layout по умолчанию),
  // чтобы избежать FOUC и hydration mismatch на десктопе.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return isDesktop;
}
