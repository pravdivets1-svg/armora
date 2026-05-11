'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, IconButton } from '@/components/uikit';

export default function FilterSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        size={40}
        onClick={() => setOpen(true)}
        aria-label="Фильтр"
        className="sm:hidden"
      >
        <SlidersHorizontal size={18} />
      </IconButton>
      <Sheet open={open} onClose={() => setOpen(false)} title="Фильтр заказов">
        <div className="space-y-3">{children}</div>
      </Sheet>
    </>
  );
}
