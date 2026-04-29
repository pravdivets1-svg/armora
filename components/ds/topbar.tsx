'use client';

import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ds/button';

export function Topbar({
  title,
  subtitle,
  actions,
  onLogout,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onLogout?: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 z-20 h-14 border-b border-border bg-base/85 backdrop-blur-xl"
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-fg truncate">{title}</h1>
          {subtitle && <div className="text-[12px] text-muted truncate">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
          {onLogout && (
            <form action={onLogout}>
              <Button variant="ghost" size="icon" type="submit" title="Выйти" aria-label="Выйти">
                <LogOut size={15} strokeWidth={1.75} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </motion.header>
  );
}
