'use client';

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
    'font-medium tracking-tight',
    'rounded-md border border-transparent',
    'transition-colors duration-150 ease-smooth',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-accent text-white',
          'hover:bg-accent-hover',
          'shadow-e1',
        ],
        secondary: [
          'bg-surface text-fg border-border',
          'hover:bg-fg/5 hover:border-borderHover',
        ],
        ghost: [
          'bg-transparent text-muted',
          'hover:bg-fg/5 hover:text-fg',
        ],
        danger: [
          'bg-bad text-white',
          'hover:bg-bad/90',
        ],
        outline: [
          'bg-transparent text-fg border-border',
          'hover:bg-fg/5 hover:border-borderHover',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-3.5 text-[14px]',
        lg: 'h-10 px-4 text-[14px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof button> {
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -0.5 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        disabled={loading || disabled}
        className={cn(button({ variant, size }), className)}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {children}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';
