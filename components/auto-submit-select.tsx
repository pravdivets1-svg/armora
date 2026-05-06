'use client';

// Select, который автоматически сабмитит форму при изменении.
// Обёртка над нативным <select>, повторяет стиль ui.tsx.

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export default function AutoSubmitSelect({
  name,
  defaultValue = '',
  children,
  preserve = [] as string[],
  className = '',
  'aria-label': ariaLabel,
}: {
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
  preserve?: string[];
  className?: string;
  'aria-label'?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const sp = new URLSearchParams();
    for (const key of preserve) {
      const existing = searchParams.get(key);
      if (existing) sp.set(key, existing);
    }
    if (v) sp.set(name, v);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  return (
    <select
      defaultValue={defaultValue}
      onChange={handleChange}
      aria-label={ariaLabel}
      className={`field block min-w-0 bg-ink-900/[0.04] border border-transparent text-ink-900 rounded-md
                  shadow-[inset_0_1px_2px_rgba(15,15,15,0.06)]
                  px-3.5 py-2 pr-8 text-[14px] leading-6
                  appearance-none
                  focus:outline-none focus:bg-white focus:border-ink-900/25 focus:ring-4 focus:ring-ink-900/5 focus:shadow-none
                  h-10 ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.7rem center',
      }}
    >
      {children}
    </select>
  );
}
