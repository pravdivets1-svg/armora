'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, IconButton, Button } from '@/components/uikit';

// activeCount — сколько фильтров активно (этап/исполнитель): точка-бейдж на
// иконке воронки. Без неё активный фильтр на мобиле был невидим — пользователь
// не понимал, почему список «пустой».
export default function FilterSheet({
  children,
  activeCount = 0,
}: {
  children: React.ReactNode;
  activeCount?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="relative sm:hidden inline-flex">
        <IconButton
          size={40}
          onClick={() => setOpen(true)}
          aria-label={activeCount > 0 ? `Фильтр (активно: ${activeCount})` : 'Фильтр'}
        >
          <SlidersHorizontal size={18} />
        </IconButton>
        {activeCount > 0 && (
          <span aria-hidden className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
        )}
      </span>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Фильтр заказов"
        footer={<Button block onClick={() => setOpen(false)}>Готово</Button>}
      >
        <div className="space-y-3">{children}</div>
      </Sheet>
    </>
  );
}
