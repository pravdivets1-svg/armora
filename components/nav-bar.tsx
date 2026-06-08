'use client';

// Навигация шапки.
// Десктоп (xl+): inline-таблетки с layoutId-pill анимацией активного пункта.
// Мобильно (<xl): кнопка-гамбургер раскрывает выпадающий список.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

type NavItem = { href: string; label: string; badge?: number };

export default function NavBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const totalBadge = items.reduce((s, i) => s + (i.badge || 0), 0);

  return (
    <>
      {/* Десктоп: inline pills */}
      <LayoutGroup id="nav">
        <nav className="hidden xl:flex items-center gap-1 relative">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] z-10 whitespace-nowrap
                            ${active ? 'text-text1 font-semibold' : 'text-text3 hover:text-text1 font-medium'}`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-text1/[0.06] -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                                   rounded-full bg-accent text-white text-[10px] font-semibold tabular-nums leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>

      {/* Мобильно: гамбургер */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Меню"
        aria-expanded={open}
        className="xl:hidden relative w-10 h-10 inline-flex items-center justify-center rounded-md
                   text-text3 hover:text-text1 hover:bg-subtle transition-colors"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
        {!open && totalBadge > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
        )}
      </button>

      {/* Мобильный drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="xl:hidden fixed inset-0 top-16 bg-text1/20 z-20"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="xl:hidden absolute left-0 right-0 top-full bg-card border-b border-borderc shadow-soft z-30"
            >
              <ul className="max-w-6xl mx-auto px-4 py-2">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between px-3 h-12 rounded-md text-[15px]
                                    ${active ? 'bg-text1/[0.06] text-text1 font-semibold' : 'text-text2 hover:bg-subtle'}`}
                      >
                        <span>{item.label}</span>
                        {!!item.badge && item.badge > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5
                                           rounded-full bg-accent text-white text-[11px] font-semibold tabular-nums leading-none">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
