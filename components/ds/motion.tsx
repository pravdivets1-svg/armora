'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

const ease = [0.16, 1, 0.3, 1] as const;

export function PageEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04 } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.24, ease } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
