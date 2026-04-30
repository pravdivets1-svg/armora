'use client';

// Toast-нотификации через sonner.
// Подключается один раз в (admin)/layout.tsx.
// Триггер: показ ?toast=<msg>&type=ok|error в URL после server action redirect.
// Маленький helper отлавливает параметр и тостит.

import { Toaster, toast } from 'sonner';
import { useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

function ToastFromQuery() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const msg = sp.get('toast');
    if (!msg) return;
    const type = sp.get('type') ?? 'ok';
    if (type === 'error') {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
    // Чистим query без toast/type
    const next = new URLSearchParams(sp.toString());
    next.delete('toast');
    next.delete('type');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [sp, router, pathname]);

  return null;
}

export default function ToastHost() {
  return (
    <>
      <ToastFromQuery />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'rounded-xl border border-line bg-white shadow-soft-lg text-ink-900',
            title: 'text-[14px] font-medium',
            description: 'text-[13px] text-ink-500',
            success: 'border-l-4 border-l-ok',
            error:   'border-l-4 border-l-bad',
          },
        }}
      />
    </>
  );
}
