'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLMotionProps<'div'> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        'rounded-md border border-border bg-surface',
        'shadow-e1',
        interactive && 'hover:border-borderHover transition-colors duration-150 ease-smooth',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Card.displayName = 'Card';

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-4 pb-3 border-b border-border', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-3 border-t border-border', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-[11px] uppercase tracking-wider text-muted font-medium', className)}
      {...props}
    />
  );
}
