'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface KpiProps {
  label: string;
  value: string | number;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  icon?: React.ReactNode;
  className?: string;
}

export function Kpi({ label, value, delta, icon, className }: KpiProps) {
  const Trend = delta?.direction === 'up' ? TrendingUp : delta?.direction === 'down' ? TrendingDown : Minus;
  const tone =
    delta?.direction === 'up' ? 'text-ok' :
    delta?.direction === 'down' ? 'text-bad' :
    'text-muted';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-md border border-border bg-surface p-5',
        'shadow-e1 hover:border-borderHover transition-colors duration-150',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted font-medium">{label}</div>
        {icon && <div className="text-subtle">{icon}</div>}
      </div>
      <div className="mt-3 font-mono text-[28px] tracking-tight leading-none text-fg tnum">
        {value}
      </div>
      {delta && (
        <div className={cn('mt-2 inline-flex items-center gap-1 text-[12px]', tone)}>
          <Trend size={12} strokeWidth={2} />
          {delta.value}
        </div>
      )}
    </motion.div>
  );
}
