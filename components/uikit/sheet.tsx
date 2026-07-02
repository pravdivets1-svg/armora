'use client';

import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './button';
import { useIsDesktop } from './use-media-query';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Модальность по-честному: фокус внутрь при открытии, Tab заперт в панели,
  // возврат фокуса на триггер при закрытии. aria-modal без этого — декорация:
  // Tab ходил по заблокированной странице под шитом.
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className={isDesktop
              ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass-surface-strong rounded-2xl w-[min(560px,calc(100vw-32px))] max-h-[85dvh] flex flex-col overflow-hidden'
              : 'fixed inset-x-0 bottom-0 z-50 glass-surface-strong rounded-t-[28px] max-h-[92dvh] flex flex-col overflow-hidden'
            }
            initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            ref={panelRef}
            tabIndex={-1}
          >
            {!isDesktop && (
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 bg-borders rounded-full" />
              </div>
            )}
            {title && (
              <header className="flex items-center justify-between px-5 py-3 border-b border-borderc shrink-0">
                <h3 id={titleId} className="text-h2 text-text1">{title}</h3>
                <IconButton size={40} onClick={onClose} aria-label="Закрыть">
                  <X size={18} />
                </IconButton>
              </header>
            )}
            {/* Без footer'а последний контрол упирался в home-индикатор iPhone —
                добавляем safe-area в паддинг тела. */}
            <div className={`flex-1 overflow-y-auto px-5 py-4 ${footer ? '' : 'pb-[calc(16px+env(safe-area-inset-bottom))]'}`}>{children}</div>
            {footer && (
              <footer className="px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] border-t border-borderc shrink-0 bg-card">{footer}</footer>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
